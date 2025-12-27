import { igdbWorker } from "../../service/igdb.service";

const clientId = process.env.TWITCH_CLIENT_ID || "";
const authToken = process.env.TWITCH_CLIENT_TOKEN || "";

export const getGames = async (req, res) => {
  try {
    const body =
      "fields age_ratings,aggregated_rating,aggregated_rating_count,alternative_names,artworks,bundles,category,checksum,collection,collections,cover,created_at,dlcs,expanded_games,expansions,external_games,first_release_date,follows,forks,franchise,franchises,game_engines,game_localizations,game_modes,game_status,game_type,genres,hypes,involved_companies,keywords,language_supports,multiplayer_modes,name,parent_game,platforms,player_perspectives,ports,rating,rating_count,release_dates,remakes,remasters,screenshots,similar_games,slug,standalone_expansions,status,storyline,summary,tags,themes,total_rating,total_rating_count,updated_at,url,version_parent,version_title,videos,websites;";
    const genresBody = `fields checksum,created_at,name,slug,updated_at,url`;
    const games = await igdbWorker("/games", body, clientId, authToken);

    const genres = await igdbWorker("/genres", genresBody, clientId, authToken);
    res.json(games);
  } catch (error) {
    console.log(error);
    res.json({ message: "Some problems with IGDB" });
  }
};
