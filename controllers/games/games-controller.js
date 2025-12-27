import { igdbWorker } from "../../service/igdb.service.js";

const clientId = process.env.TWITCH_CLIENT_ID || "";
const authToken = process.env.TWITCH_CLIENT_TOKEN || "";

export const getGames = async (req, res) => {
  try {
    const body =
      "fields id, name, slug, summary, first_release_date, total_rating, rating, rating_count,cover.url,genres.name,genres.slug,platforms.name,platforms.abbreviation,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,screenshots.url,videos.video_id,websites.category,websites.url; limit 20;";
    const games = await igdbWorker("/games", body, clientId, authToken);

    res.json(games);
  } catch (error) {
    console.log(error);
    res.json({ message: "Some problems with IGDB" });
  }
};
