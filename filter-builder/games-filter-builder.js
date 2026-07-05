const SORT_FIELD_MAP = {
  released: "first_release_date",
  name: "name",
  rating: "rating",
  created: "first_release_date", // IGDB не має "date added в базу", найближчий аналог
  added: "rating_count", // "популярність" — найближчий відповідник у IGDB
};

// Екранування — IGDB Apicalypse не підтримує параметризовані запити,
// тож будь-який текст, що йде в лапках, треба чистити від лапок/бекслешів
function sanitizeString(value) {
  return String(value).replace(/["\\]/g, "");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildGamesFilter(query) {
  const conditions = [];
  let searchClause = "";
  let sortClause = "sort first_release_date desc;";

  if (isNonEmptyString(query.search)) {
    searchClause = `search "${sanitizeString(query.search)}";`;
    sortClause = "";
  }

  if (isNonEmptyString(query.metacritic)) {
    const [min, max] = query.metacritic.split(",").map(Number);
    if (!isNaN(min)) conditions.push(`rating >= ${min}`);
    if (!isNaN(max)) conditions.push(`rating <= ${max}`);
  }

  if (isNonEmptyString(query.genres)) {
    const slugs = query.genres
      .split(",")
      .map((s) => sanitizeString(s.trim()))
      .filter(Boolean);
    if (slugs.length) {
      const quoted = slugs.map((s) => `"${s}"`).join(",");
      conditions.push(`genres.slug = (${quoted})`);
    }
  }

  if (isNonEmptyString(query.platforms)) {
    const ids = query.platforms
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length) {
      conditions.push(`platforms = (${ids.join(",")})`);
    }
  }

  if (isNonEmptyString(query.developers)) {
    const slugs = query.developers
      .split(",")
      .map((s) => sanitizeString(s.trim()))
      .filter(Boolean);
    if (slugs.length) {
      const quoted = slugs.map((s) => `"${s}"`).join(",");
      conditions.push(`involved_companies.company.slug = (${quoted})`);
    }
  }

  if (isNonEmptyString(query.tags)) {
    const slugs = query.tags
      .split(",")
      .map((s) => sanitizeString(s.trim()))
      .filter(Boolean);
    if (slugs.length) {
      const quoted = slugs.map((s) => `"${s}"`).join(",");
      conditions.push(`keywords.slug = (${quoted})`);
    }
  }

  const fromTs = isNonEmptyString(query.dateFrom)
    ? Math.floor(new Date(query.dateFrom).getTime() / 1000)
    : null;
  const toTs = isNonEmptyString(query.dateTo)
    ? Math.floor(new Date(query.dateTo).getTime() / 1000)
    : null;

  if (fromTs && !isNaN(fromTs))
    conditions.push(`first_release_date >= ${fromTs}`);
  if (toTs && !isNaN(toTs)) conditions.push(`first_release_date <= ${toTs}`);

  if (
    isNonEmptyString(query.ordering) &&
    SORT_FIELD_MAP[query.ordering] &&
    !searchClause
  ) {
    sortClause = `sort ${SORT_FIELD_MAP[query.ordering]} desc;`; // тільки якщо немає search
  }

  const whereClause = conditions.length
    ? `where ${conditions.join(" & ")};`
    : "";

  return { searchClause, whereClause, sortClause };
}
