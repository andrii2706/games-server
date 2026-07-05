import { igdbWorker } from "../../service/igdb.service.js";
import {
  mapIgDbInfoToGame,
  mapIgDbInfoToGameDetails,
} from "../../mapper/mapper.js";
import { gameDetailsCache } from "../../games-cache/games-cache.js";

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
    const gamesBody = `
      fields id, name, slug, summary, first_release_date, total_rating, rating, rating_count,
      cover.url, genres.name, genres.slug, platforms.name, platforms.abbreviation;
      where rating > 80 & first_release_date > 1500000000;
      sort first_release_date desc;
      limit 500;
    `;
    const games = await igdbWorker("/games", gamesBody, clientId, authToken);

    const gameIds = games.map((g) => g.id);

    const batchSize = 50;
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

    const externalGamesByGame = {};
    externalGames.forEach((ex) => {
      if (!externalGamesByGame[ex.game]) externalGamesByGame[ex.game] = [];
      externalGamesByGame[ex.game].push(ex);
    });

    const mappedGames = games.map((game) => {
      const externalForGame = externalGamesByGame[game.id] || [];
      return mapIgDbInfoToGame(game, externalForGame);
    });

    const gamesInfo = Object.assign({
      results: mappedGames,
      esresponse: {
        total: mappedGames.length,
      },
    });

    res.status(200).json(gamesInfo);
    console.log(`✅ /games API fetched successfully: ${games.length} games`);
  } catch (error) {
    handleIgdbError(error, res);
  }
};

export const getGame = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: "Invalid game id" });
    }

    const cacheKey = `game:${id}`;
    const cached = gameDetailsCache.get(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const gameBody = `
      fields id, name, slug, summary, first_release_date, updated_at,
      rating, aggregated_rating, status,
      cover.url, artworks.url, screenshots.url,
      genres.name, genres.slug,
      platforms.name, platforms.abbreviation,
      involved_companies.developer, involved_companies.company.name,
      involved_companies.company.slug, involved_companies.company.logo.url,
      websites.url, websites.category,
      keywords.name, keywords.slug,
      videos.video_id, videos.name;
      where id = ${id};
    `;
    const games = await igdbWorker("/games", gameBody, clientId, authToken);

    if (!games.length) {
      return res.status(404).json({ message: "Game not found" });
    }
    const game = games[0];

    const externalGamesBody = `
      fields external_game_source, game, name, url, uid;
      where game = ${game.id};
    `;
    const externalGames = await igdbWorker(
      "/external_games",
      externalGamesBody,
      clientId,
      authToken,
    );

    const mappedGame = mapIgDbInfoToGameDetails(game, externalGames);

    gameDetailsCache.set(cacheKey, mappedGame);
    res.set("X-Cache", "MISS");
    res.status(200).json(mappedGame);
  } catch (error) {
    handleIgdbError(error, res);
  }
};
