import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/auth";
import { sanitizeInput, limitRequestBodySize } from "./middlewares/validation";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeInput);
app.use(limitRequestBodySize(1024 * 1024)); // 1MB
app.use(authMiddleware);

app.use("/api", router);

// Error handling must be after all routes
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
