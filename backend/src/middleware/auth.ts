/**
 * Authentication Middleware
 *
 * Verifies Firebase ID tokens from the Authorization header.
 * Attaches the decoded token to `req.user` for downstream handlers.
 */

import { NextFunction, Request, Response } from "express";
import { DecodedIdToken } from "firebase-admin/auth";

import authService from "../authService";
import { AuthError } from "../errors";

// ---------------------------------------------------------------------------
// Extend Express Request to include the decoded user
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/consistent-type-definitions */
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/consistent-type-definitions */

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Require a valid Firebase ID token in the `Authorization: Bearer <token>` header.
 * On success, sets `req.user` to the decoded token claims.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    const { message } = AuthError.NO_TOKEN_PROVIDED as { status: number; message: string };
    res.status(401).json({ error: message });
    return;
  }

  const idToken = header.split("Bearer ")[1];

  try {
    const decoded = await authService.verifyIdToken(idToken, true);
    req.user = decoded;
    next();
  } catch {
    const { status, message } = AuthError.INVALID_TOKEN as { status: number; message: string };
    res.status(status).json({ error: message });
    return;
  }
}

/**
 * Require the authenticated user to have a specific custom claim.
 * Must be used AFTER `requireAuth`.
 *
 * Usage: `router.get("/admin", requireAuth, requireRole("admin"), handler)`
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.[role]) {
      const errorObj = AuthError.UNAUTHORIZED;
      const status = typeof errorObj === 'object' && errorObj !== null && 'status' in errorObj ? (errorObj as { status: number; message: string }).status : 403;
      const message = typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj ? (errorObj as { status: number; message: string }).message : 'Unauthorized';
      res.status(status).json({ error: message });
      return;
    }
    next();
  };
}
