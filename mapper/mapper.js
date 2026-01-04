export function mapIgDbInfoToGame(game, refs) {
  return {
    id: game.id,
    slug: game.slug,
    game: game.name,
    name_original: game.name,

    description: game.summary ?? null,

    released: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : null,

    background_image: game.cover?.url
      ? `https:${game.cover.url.replace("t_thumb", "t_1080p")}`
      : null,

    rating: null, // IGDB не дає RAWG rating
    rating_top: 0,
    statusOfGame: "",
    metacritic: null, // інший endpoint

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

    stores: [],
  };
}
