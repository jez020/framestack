import { CustomError } from "./errors";

const INVALID_TOKEN = "Invalid or expired authentication token";
const NO_TOKEN_PROVIDED = "No authentication token provided";
const USER_NOT_FOUND = "User not found";
const USER_ALREADY_EXISTS = "A user with this email already exists";
const WEAK_PASSWORD = "Password must be at least 6 characters";
const INVALID_EMAIL = "The email address is invalid";
const USER_DISABLED = "This user account has been disabled";
const UNAUTHORIZED = "You are not authorized to perform this action";

export class AuthError extends CustomError {
  static INVALID_TOKEN = new AuthError(100, 401, INVALID_TOKEN);

  static NO_TOKEN_PROVIDED = new AuthError(101, 401, NO_TOKEN_PROVIDED);

  static USER_NOT_FOUND = new AuthError(102, 404, USER_NOT_FOUND);

  static USER_ALREADY_EXISTS = new AuthError(103, 409, USER_ALREADY_EXISTS);

  static WEAK_PASSWORD = new AuthError(104, 400, WEAK_PASSWORD);

  static INVALID_EMAIL = new AuthError(105, 400, INVALID_EMAIL);

  static USER_DISABLED = new AuthError(106, 403, USER_DISABLED);

  static UNAUTHORIZED = new AuthError(107, 403, UNAUTHORIZED);
}
