export function mapIgDbInfoToGame(game, refs) {
  return {
    id: game.id,
    slug: game.slug,
    game: game.name,
    name_original: game.name,
    description: game.description,
    released: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : undefined,

    background_image: refs.cover
      ? img(refs.cover.url, "t_cover_big")
      : undefined,

    rating: game.total_rating
      ? Number((game.total_rating / 20).toFixed(1))
      : undefined,

    rating_top: 0,

    statusOfGame: "",

    metacritic: game.aggregated_rating,

    genres: refs.genres?.map((g) => ({
      id: g.id,
      name: g.name,
      slug: slugify(g.name),
    })),

    platforms: refs.platforms?.map((p) => ({
      id: p.id,
      name: p.name,
    })),

    stores: [],
  };
}
