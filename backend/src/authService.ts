/**
 * Firebase Authentication Service Wrapper
 *
 * Provides a centralized interface for all Firebase Auth admin operations.
 * Import the default `authService` and use its methods instead of calling auth directly.
 */

import {
  CreateRequest,
  DecodedIdToken,
  ListUsersResult,
  UpdateRequest,
  UserRecord,
} from "firebase-admin/auth";

import { auth } from "./firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Simplified user object returned by the service. */
export type AuthUser = {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  photoURL: string | undefined;
  emailVerified: boolean;
  disabled: boolean;
  customClaims: Record<string, unknown> | undefined;
  createdAt: string | undefined;
  lastSignIn: string | undefined;
};

/** Options for listing users. */
export type ListUsersOptions = {
  /** Maximum number of users to return (max 1000). */
  maxResults?: number;
  /** Page token from a previous call for pagination. */
  pageToken?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Firebase UserRecord to a simplified AuthUser. */
function toAuthUser(user: UserRecord): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    customClaims: user.customClaims as Record<string, unknown> | undefined,
    createdAt: user.metadata.creationTime,
    lastSignIn: user.metadata.lastSignInTime,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const authService = {
  // -------------------------------------------------------------------------
  // Token Verification
  // -------------------------------------------------------------------------

  /**
   * Verify a Firebase ID token and return the decoded claims.
   * Set `checkRevoked` to true to also check if the token has been revoked.
   */
  async verifyIdToken(idToken: string, checkRevoked = false): Promise<DecodedIdToken> {
    return auth.verifyIdToken(idToken, checkRevoked);
  },

  /**
   * Verify a session cookie and return the decoded claims.
   */
  async verifySessionCookie(sessionCookie: string, checkRevoked = false): Promise<DecodedIdToken> {
    return auth.verifySessionCookie(sessionCookie, checkRevoked);
  },

  // -------------------------------------------------------------------------
  // User CRUD
  // -------------------------------------------------------------------------

  /** Get a user by their UID. */
  async getUserByUid(uid: string): Promise<AuthUser> {
    const user = await auth.getUser(uid);
    return toAuthUser(user);
  },

  /** Get a user by their email. */
  async getUserByEmail(email: string): Promise<AuthUser> {
    const user = await auth.getUserByEmail(email);
    return toAuthUser(user);
  },

  /**
   * Create a new user.
   * @param properties – At minimum provide `email` and `password`.
   */
  async createUser(properties: CreateRequest): Promise<AuthUser> {
    const user = await auth.createUser(properties);
    return toAuthUser(user);
  },

  /**
   * Update an existing user.
   * @param uid – The user's UID.
   * @param properties – Fields to update (email, password, displayName, etc.).
   */
  async updateUser(uid: string, properties: UpdateRequest): Promise<AuthUser> {
    const user = await auth.updateUser(uid, properties);
    return toAuthUser(user);
  },

  /** Delete a user by their UID. */
  async deleteUser(uid: string): Promise<void> {
    return auth.deleteUser(uid);
  },

  /** Delete multiple users at once (max 1000). Returns the result summary. */
  async deleteUsers(uids: string[]) {
    return auth.deleteUsers(uids);
  },

  /**
   * List users with pagination support.
   */
  async listUsers(
    options: ListUsersOptions = {},
  ): Promise<{ users: AuthUser[]; pageToken?: string }> {
    const result: ListUsersResult = await auth.listUsers(
      options.maxResults ?? 100,
      options.pageToken,
    );
    return {
      users: result.users.map(toAuthUser),
      pageToken: result.pageToken,
    };
  },

  // -------------------------------------------------------------------------
  // Custom Claims (Role Management)
  // -------------------------------------------------------------------------

  /**
   * Set custom claims on a user (e.g. `{ admin: true }`).
   * This overwrites all existing claims — merge manually if needed.
   */
  async setCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
    return auth.setCustomUserClaims(uid, claims);
  },

  /**
   * Merge new claims with the user's existing custom claims.
   */
  async mergeCustomClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
    const user = await auth.getUser(uid);
    const existing = (user.customClaims as Record<string, unknown>) ?? {};
    return auth.setCustomUserClaims(uid, { ...existing, ...claims });
  },

  /** Remove all custom claims from a user. */
  async clearCustomClaims(uid: string): Promise<void> {
    return auth.setCustomUserClaims(uid, {});
  },

  // -------------------------------------------------------------------------
  // Session Management
  // -------------------------------------------------------------------------

  /**
   * Create a session cookie from an ID token.
   * @param idToken – The client's Firebase ID token.
   * @param expiresIn – Duration in milliseconds (min 5 min, max 14 days).
   */
  async createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
    return auth.createSessionCookie(idToken, { expiresIn });
  },

  /** Revoke all refresh tokens for a user (invalidates sessions). */
  async revokeRefreshTokens(uid: string): Promise<void> {
    return auth.revokeRefreshTokens(uid);
  },

  // -------------------------------------------------------------------------
  // Email Actions
  // -------------------------------------------------------------------------

  /** Generate a password-reset email link. */
  async generatePasswordResetLink(email: string): Promise<string> {
    return auth.generatePasswordResetLink(email);
  },

  /** Generate an email-verification link. */
  async generateEmailVerificationLink(email: string): Promise<string> {
    return auth.generateEmailVerificationLink(email);
  },
};

export default authService;
