import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

/**
 * General API rate limiter: 300 requests per 15 minutes per IP address.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      requestId: req.id,
    });
  },
});

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP and email combination.
 * Defends against brute-force and credential stuffing attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request): string => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    return `${ip}_${email}`;
  },
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts, please try again after 15 minutes",
      requestId: req.id,
    });
  },
});
