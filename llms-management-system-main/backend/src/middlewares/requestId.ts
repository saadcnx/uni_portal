import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers["x-request-id"];
  const id = (typeof headerId === "string" && headerId.trim() !== "")
    ? headerId.trim()
    : crypto.randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
}
