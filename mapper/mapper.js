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
    name: game.name,
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

export function mapIgDbInfoToGameDetails(game, externalGamesArray) {
  const stores = (externalGamesArray || []).map((ex) => {
    const store = gameStores.find((s) => s.id === ex.external_game_source);
    return {
      id: ex.external_game_source,
      name: store?.name || "Unknown",
      url: ex.url || null,
    };
  });

  const genres =
    game.genres?.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
    })) ?? [];

  const platforms =
    game.platforms?.map((p) => ({
      platform: { id: p.id, name: p.name },
    })) ?? [];

  // developers — беремо тільки involved_companies з прапорцем developer: true
  const developers =
    game.involved_companies
      ?.filter((c) => c.developer)
      .map((c) => ({
        id: c.company?.id,
        name: c.company?.name ?? "Unknown",
        slug: c.company?.slug ?? "",
        games_count: 0, // IGDB не віддає це поле дешево (потребує окремого запиту), лишаємо 0
        image_background: c.company?.logo?.url
          ? `https:${c.company.logo.url.replace("t_thumb", "t_1080p")}`
          : "",
      })) ?? [];

  // website — категорія 1 = official site, інакше перший доступний
  const officialSite = game.websites?.find((w) => w.category === 1);
  const website = officialSite?.url || game.websites?.[0]?.url || "";

  // metacritic_platforms — IGDB не має цієї концепції як окремої сутності,
  // тож будуємо наближення: один "метаскор" (aggregated_rating) розкладений по платформах гри
  const metacritic_platforms =
    game.aggregated_rating && platforms.length
      ? platforms.map((p) => ({
          metascore: Math.round(game.aggregated_rating),
          url: website,
          platform: { name: p.platform.name },
        }))
      : [];

  // ratings — RAWG рахує розподіл голосів по категоріях (exceptional/recommended/meh/skip),
  // в IGDB такого немає. Повертаємо порожній масив, щоб фронт міг обробити відсутність без падіння.
  const ratings = [];

  // reactions — унікальна фіча RAWG (емодзі-реакції користувачів), в IGDB немає аналога
  const reactions = {};

  // tags — найближчий відповідник IGDB: keywords
  const tags =
    game.keywords?.map((k) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      language: "eng", // IGDB keywords не мають мови, ставимо дефолт
      image_background: "", // немає в IGDB
      games_count: 0, // немає в IGDB без додаткового запиту
    })) ?? [];

  return {
    id: game.id,
    slug: game.slug ?? "",
    name: game.name,
    name_original: game.name,
    description: game.summary ?? "",
    developers,
    metacritic: game.aggregated_rating ? Math.round(game.aggregated_rating) : 0,
    metacritic_platforms,
    released: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split("T")[0]
      : "",
    tba: !game.first_release_date,
    updated: game.updated_at
      ? new Date(game.updated_at * 1000).toISOString()
      : "",
    background_image: game.cover?.url
      ? `https:${game.cover.url.replace("t_thumb", "t_1080p")}`
      : "",
    background_image_additional: game.artworks?.[0]?.url
      ? `https:${game.artworks[0].url.replace("t_thumb", "t_1080p")}`
      : game.screenshots?.[0]?.url
        ? `https:${game.screenshots[0].url.replace("t_thumb", "t_1080p")}`
        : "",
    website,
    rating: game.rating ?? 0,
    rating_top: 5, // RAWG-конвенція — максимум шкали (у вас рейтинг зберігається як 0-100, тут лишаємо стале число для сумісності зі старими шаблонами)
    ratings,
    reactions,
    platforms,
    genres,
    stores,
    tags,
  };
}
