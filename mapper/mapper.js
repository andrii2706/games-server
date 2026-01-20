import { gameStatus, gameStores } from "../constants/games.constant.js";

export function mapIgDbInfoToGame(game, externalGamesArray) {
  const stores = (externalGamesArray || []).map((ex) => {
    const store = gameStores.find((s) => s.id === ex.external_game_source);
    return {
      id: ex.external_game_source,
      name: store?.name || "Unknown",
      url: ex.url || null,
    };
  });

  return {
    id: game.id,
    uid: externalGamesArray?.[0]?.uid || null,
    slug: game.slug,
    game: game.name,
    name_original: game.name,
    url: externalGamesArray?.[0]?.url || null,
    description: game.summary ?? null,
    released: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : null,
    background_image: game.cover?.url
      ? `https:${game.cover.url.replace("t_thumb", "t_1080p")}`
      : null,
    rating: game.rating,
    status_of_game:
      gameStatus.find((s) => s.id === game.status)?.name || "Unknown",
    metacritic: game.rating,
    genres:
      game.genres?.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
      })) ?? [],
    platforms:
      game.platforms?.map((p) => ({
        platform: {
          id: p.id,
          name: p.name,
        },
      })) ?? [],
    stores,
  };
}
