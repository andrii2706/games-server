import express from "express";

import {
  getGames,
  getGame,
  getLastReleasedGames,
} from "../controllers/games/games-controller.js";

const router = express.Router();

router.get("/games", getGames);

router.get("/games/last-released", getLastReleasedGames);

router.get("/games/:id", getGame);

export default router;
