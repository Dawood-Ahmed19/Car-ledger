import { Router } from "express";
import * as settings from "../controllers/settings.controller.js";

export const settingsRouter = Router();

settingsRouter.get("/", settings.show);
settingsRouter.post("/", settings.update);
