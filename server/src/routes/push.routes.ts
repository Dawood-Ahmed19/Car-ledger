import { Router } from "express";
import * as push from "../controllers/push.controller.js";

export const pushRouter = Router();

pushRouter.post("/", push.register);
pushRouter.post("/remove", push.remove);
