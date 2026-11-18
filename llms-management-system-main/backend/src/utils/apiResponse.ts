import type { Response } from "express";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export function sendOk<T>(res: Response, data: T): Response {
  return res.status(200).json({
    success: true,
    data,
  });
}

export function sendCreated<T>(res: Response, data: T): Response {
  return res.status(201).json({
    success: true,
    data,
  });
}

export function sendPaginated<T>(res: Response, data: T, meta: PaginationMeta): Response {
  return res.status(200).json({
    success: true,
    data,
    meta,
  });
}
