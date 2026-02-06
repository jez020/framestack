/**
 * Authentication Routes
 *
 * POST   /auth/session           – Create a session cookie
 * GET    /auth/me                – Get current user profile (authenticated)
 * GET    /auth/users             – List all users (admin)
 * POST   /auth/user              – Create a new user (admin)
 * GET    /auth/user/:uid         – Get user by UID (admin)
 * PUT    /auth/user/:uid         – Update a user (admin)
 * DELETE /auth/user/:uid         – Delete a user (admin)
 * POST   /auth/user/:uid/claims  – Set custom claims (admin)
 * POST   /auth/user/:uid/revoke  – Revoke refresh tokens (admin)
 */

import { Router } from "express";

import {
  createSession,
  createUser,
  deleteUser,
  getMe,
  getUserByUid,
  listUsers,
  revokeTokens,
  setCustomClaims,
  updateUser,
} from "../controllers/authController";
import { requireAuth, requireRole } from "../middleware/auth";

const authRouter = Router();

// -- Public (requires valid ID token but no special role) --------------------
authRouter.post("/session", createSession);
authRouter.get("/me", requireAuth, getMe);

// -- Admin-only routes -------------------------------------------------------
authRouter.get("/users", requireAuth, requireRole("admin"), listUsers);
authRouter.post("/user", requireAuth, requireRole("admin"), createUser);
authRouter.get("/user/:uid", requireAuth, requireRole("admin"), getUserByUid);
authRouter.put("/user/:uid", requireAuth, requireRole("admin"), updateUser);
authRouter.delete("/user/:uid", requireAuth, requireRole("admin"), deleteUser);
authRouter.post("/user/:uid/claims", requireAuth, requireRole("admin"), setCustomClaims);
authRouter.post("/user/:uid/revoke", requireAuth, requireRole("admin"), revokeTokens);

export default authRouter;
