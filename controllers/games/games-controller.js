import { igdbWorker } from "../../service/igdb.service.js";
import { mapIgDbInfoToGame } from "../../mapper/mapper.js";

const clientId = process.env.TWITCH_CLIENT_ID || "";
const authToken = process.env.TWITCH_CLIENT_TOKEN || "";

// Уніфікований хендлер помилок
const handleIgdbError = (error, res) => {
  const message = error?.message || "Unknown error";
  const status = error?.response?.status;

  console.error("❌ IGDB Error:", { status, message, stack: error?.stack });

  let clientStatus = 503;
  let clientMessage = "Service Unavailable";

  if (status === 400 || message.includes("400")) {
    clientStatus = 500;
    clientMessage = "Internal Server Error";
  } else if (status === 401 || message.includes("401")) {
    clientStatus = 502;
    clientMessage = "Bad Gateway";
  } else if (status === 404 || message.includes("404")) {
    clientStatus = 503;
    clientMessage = "Service Unavailable";
  } else if (status >= 500) {
    clientStatus = 502;
    clientMessage = "Bad Gateway";
  }

  res.status(clientStatus).json({ message: clientMessage });
};

export const getGames = async (req, res) => {
  try {
    // 1️⃣ Запит ігор
    const gamesBody = `
      fields id, name, slug, summary, first_release_date, total_rating, rating, rating_count,
      cover.url, genres.name, genres.slug, platforms.name, platforms.abbreviation;
      where rating > 80 & first_release_date > 1500000000;
      sort rating desc;
      limit 500;
    `;
    const games = await igdbWorker("/games", gamesBody, clientId, authToken);

    // 2️⃣ Масив ID ігор
    const gameIds = games.map((g) => g.id);

    // 3️⃣ Batch-запит external_games
    const batchSize = 50; // по 50 ігор за раз
    let externalGames = [];

    for (let i = 0; i < gameIds.length; i += batchSize) {
      const batchIds = gameIds.slice(i, i + batchSize).join(",");
      const externalGamesBody = `
        fields external_game_source, game, name, url, uid;
        where game = (${batchIds});
        limit 500;
      `;
      const batchResult = await igdbWorker(
        "/external_games",
        externalGamesBody,
        clientId,
        authToken,
      );
      externalGames.push(...batchResult);
    }

    // 4️⃣ Групування external_games по game.id
    const externalGamesByGame = {};
    externalGames.forEach((ex) => {
      if (!externalGamesByGame[ex.game]) externalGamesByGame[ex.game] = [];
      externalGamesByGame[ex.game].push(ex);
    });

    // 5️⃣ Маппінг ігор
    const mappedGames = games.map((game) => {
      const externalForGame = externalGamesByGame[game.id] || [];
      return mapIgDbInfoToGame(game, externalForGame);
    });

    // 6️⃣ Відповідь фронту
    res.status(200).json(mappedGames);
    console.log(`✅ /games API fetched successfully: ${games.length} games`);
  } catch (error) {
    handleIgdbError(error, res);
  }
};
