import type { Response } from "express";
import { StoreError } from "../services/workspace-store";

export function sendRouteError(response: Response, error: unknown) {
  if (error instanceof StoreError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }
  response.status(500).json({ error: "Unexpected server error." });
}