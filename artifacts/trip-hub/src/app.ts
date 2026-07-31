import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipts and bundled images
app.use("/api/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use("/api/images", express.static(path.resolve(__dirname, "../public/images")));

app.use("/api", router);

// Catch-all: anything thrown/rejected in a route handler lands here instead
// of Express's default HTML error page. Keeps the API surface consistent
// (always JSON) even for unexpected failures like DB constraint violations.
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    logger.error({ err, url: req.url }, "Unhandled error");
    if (res.headersSent) return;
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
);

export default app;
