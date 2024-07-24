import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, {Request, Response, NextFunction} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import {logger} from "./utils/logger";
import {messageQueue} from "./queues";

Sentry.init({dsn: process.env.SENTRY_DSN});

if (process.env.DEBUG_TRACE == 'false') {
  console.trace = function () {
    return;
  }
}

const app = express();

process.on("uncaughtException", err => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
});

app.set("queues", {
  messageQueue
});

app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": [process.env.FRONTEND_URL],
        "style-src": null,
      },
    },
    originAgentCluster: false,
    xContentTypeOptions: true,
    xPermittedCrossDomainPolicies: false,
    xFrameOptions: { action: "deny" },
    xPoweredBy: false,
    xXssProtection: true,
    crossOriginResourcePolicy: { policy: "same-site" },
  }),
);

app.use(express.json({limit: '50mb'})); // Para JSON
app.use(express.urlencoded({limit: '50mb', extended: true})); // Para formulários

app.use(cookieParser());
app.use(Sentry.Handlers.requestHandler());
app.use("/public", async (req: Request, res: Response, next: NextFunction) => {
  const referer = req.headers.referer;
  const frontendUrl = process.env.FRONTEND_URL;

  if (referer && referer.startsWith(frontendUrl)) {
    return express.static(uploadConfig.directory)(req, res, next);
  }
  return res.status(403).json({error: "Acesso proibido"});
});
app.use(routes);

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({error: err.message});
  }

  logger.error(err);
  return res.status(500).json({error: "Internal server error"});
});

export default app;
