/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication-related endpoints.
 */

import { Request, Response } from "express";

import authService from "../authService";
import { AuthError } from "../errors";

type IAuthError = {
  status: number;
  message: string;
};

// ---------------------------------------------------------------------------
// GET /auth/me – Get the current authenticated user's profile
// ---------------------------------------------------------------------------

export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user) {
      const err = AuthError.NO_TOKEN_PROVIDED as IAuthError;
      res.status(err.status).json({ error: err.message });
      return;
    }

    const user = await authService.getUserByUid(req.user.uid);
    res.json({ user });
  } catch {
    const err = AuthError.USER_NOT_FOUND as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /auth/user/:uid – Get a user by UID (admin only)
// ---------------------------------------------------------------------------

export async function getUserByUid(req: Request, res: Response) {
  try {
    const user = await authService.getUserByUid(req.params.uid);
    res.json({ user });
  } catch {
    const err = AuthError.USER_NOT_FOUND as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /auth/user – Create a new user (admin only)
// ---------------------------------------------------------------------------

export async function createUser(req: Request, res: Response) {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await authService.createUser({ email, password, displayName });
    res.status(201).json({ user });
  } catch (error: unknown) {
    const fbError = error as { code?: string };
    if (fbError.code === "auth/email-already-exists") {
      const err = AuthError.USER_ALREADY_EXISTS as IAuthError;
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (fbError.code === "auth/invalid-email") {
      const err = AuthError.INVALID_EMAIL as IAuthError;
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (fbError.code === "auth/weak-password") {
      const err = AuthError.WEAK_PASSWORD as IAuthError;
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to create user" });
  }
}

// ---------------------------------------------------------------------------
// PUT /auth/user/:uid – Update a user (admin only)
// ---------------------------------------------------------------------------

export async function updateUser(req: Request, res: Response) {
  try {
    const { uid } = req.params;
    const { email, password, displayName, photoURL, disabled } = req.body;

    const user = await authService.updateUser(uid, {
      email,
      password,
      displayName,
      photoURL,
      disabled,
    });
    res.json({ user });
  } catch {
    const err = AuthError.USER_NOT_FOUND as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// DELETE /auth/user/:uid – Delete a user (admin only)
// ---------------------------------------------------------------------------

export async function deleteUser(req: Request, res: Response) {
  try {
    await authService.deleteUser(req.params.uid);
    res.json({ message: "User deleted successfully" });
  } catch {
    const err = AuthError.USER_NOT_FOUND as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /auth/users – List users (admin only)
// ---------------------------------------------------------------------------

export async function listUsers(req: Request, res: Response) {
  try {
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 100;
    const pageToken = req.query.pageToken as string | undefined;

    const result = await authService.listUsers({ maxResults, pageToken });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to list users" });
  }
}

// ---------------------------------------------------------------------------
// POST /auth/user/:uid/claims – Set custom claims on a user (admin only)
// ---------------------------------------------------------------------------

export async function setCustomClaims(req: Request, res: Response) {
  try {
    const { uid } = req.params;
    const { claims } = req.body;

    if (!claims || typeof claims !== "object") {
      res.status(400).json({ error: "Claims must be a valid object" });
      return;
    }

    await authService.setCustomClaims(uid, claims as Record<string, unknown>);
    res.json({ message: "Custom claims updated successfully" });
  } catch {
    const err = AuthError.USER_NOT_FOUND as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /auth/session – Create a session cookie
// ---------------------------------------------------------------------------

export async function createSession(req: Request, res: Response) {
  try {
    const { idToken, expiresIn } = req.body;

    if (!idToken) {
      const err = AuthError.NO_TOKEN_PROVIDED;
      res.status(401).json({ error: err.message });
      return;
    }

    // Default to 5 days if not specified
    const duration = typeof expiresIn === "number" ? expiresIn : 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await authService.createSessionCookie(idToken as string, duration);

    res.json({ sessionCookie });
  } catch {
    const err = AuthError.INVALID_TOKEN as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /auth/user/:uid/revoke – Revoke refresh tokens (admin only)
// ---------------------------------------------------------------------------

export async function revokeTokens(req: Request, res: Response) {
  try {
    await authService.revokeRefreshTokens(req.params.uid);
    res.json({ message: "Refresh tokens revoked successfully" });
  } catch {
    const err = AuthError.USER_NOT_FOUND as IAuthError;
    res.status(err.status).json({ error: err.message });
  }
}
