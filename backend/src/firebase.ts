import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { InternalError } from "./errors";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw InternalError.NO_FIREBASE_CREDENTIALS;
}

const firebaseApp = initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
});

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export { firebaseApp, auth, db };
