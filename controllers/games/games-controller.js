import { igdbWorker } from "../../service/igdb.service.js";
import {
  mapIgDbInfoToGame,
  mapIgDbInfoToGameDetails,
} from "../../mapper/mapper.js";
import { gameDetailsCache, gamesCache } from "../../games-cache/games-cache.js";
import { buildGamesFilter } from "../../filter-builder/games-filter-builder.js";

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
// парсить дату в правильний вигляд для фільтрації
function parseDatesRange(dates) {
  if (!dates || typeof dates !== "string") return { fromTs: null, toTs: null };

  const [from, to] = dates.split(",");
  const fromTs = from ? Math.floor(new Date(from).getTime() / 1000) : null;
  const toTs = to ? Math.floor(new Date(to).getTime() / 1000) : null;

  return {
    fromTs: isNaN(fromTs) ? null : fromTs,
    toTs: isNaN(toTs) ? null : toTs,
  };
}

export const getGames = async (req, res) => {
  try {
    const { searchClause, whereClause, sortClause } = buildGamesFilter(
      req.query,
    );

    const gamesBody = `
      fields id, name, slug, summary, first_release_date, total_rating, rating, rating_count,
      cover.url, genres.name, genres.slug, platforms.name, platforms.abbreviation;
      ${searchClause}
      ${whereClause}
      ${sortClause}
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

export const getLastReleasedGames = async (req, res) => {
  try {
    const { dates } = req.query; // очікуємо "YYYY-MM-DD,YYYY-MM-DD", як шле фронт зараз
    const { fromTs, toTs } = parseDatesRange(dates);

    const cacheKey = `last-released:${dates || "default"}`;
    const cached = gamesCache.get(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const now = Math.floor(Date.now() / 1000);
    const upperBound = toTs ? Math.min(toTs, now) : now; // не показуємо ще не вийшлі ігри

    const dateFilter = fromTs
      ? `first_release_date >= ${fromTs} & first_release_date <= ${upperBound}`
      : `first_release_date <= ${upperBound}`;

    const gamesBody = `
      fields id, name, slug, summary, first_release_date, total_rating, rating, rating_count,
      cover.url, genres.name, genres.slug, platforms.name, platforms.abbreviation;
      where ${dateFilter};
      sort first_release_date desc;
      limit 500;
    `;
    const games = await igdbWorker("/games", gamesBody, clientId, authToken);

    if (!games.length) {
      const empty = { results: [], esresponse: { total: 0 } };
      gamesCache.set(cacheKey, empty);
      return res.status(200).json(empty);
    }

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

    const mappedGames = games.map((game) =>
      mapIgDbInfoToGame(game, externalGamesByGame[game.id] || []),
    );

    const gamesInfo = {
      results: mappedGames,
      esresponse: { total: mappedGames.length },
    };

    gamesCache.set(cacheKey, gamesInfo);
    res.set("X-Cache", "MISS");
    res.status(200).json(gamesInfo);
  } catch (error) {
    handleIgdbError(error, res);
  }
};
