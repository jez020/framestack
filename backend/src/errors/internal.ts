import { CustomError } from "./errors";

const NO_APP_PORT = "Could not find app port env variable";
const NO_FIREBASE_CREDENTIALS = "Could not find Firebase service account credentials env variable";

export class InternalError extends CustomError {
  static NO_APP_PORT = new InternalError(0, 500, NO_APP_PORT);

  static NO_FIREBASE_CREDENTIALS = new InternalError(1, 500, NO_FIREBASE_CREDENTIALS);
}
