/**
 * Firestore Database Wrapper
 *
 * Provides a type-safe, centralized interface for all Firestore operations.
 * Import the default `firestoreService` and use its methods instead of calling db directly.
 */

import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  FieldValue,
  Filter,
  Query,
  QuerySnapshot,
  WriteBatch,
  WriteResult,
} from "firebase-admin/firestore";

import { db } from "./firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Generic type for documents stored in Firestore. */
export type FirestoreDoc<T = DocumentData> = T & { id: string };

/** Options for paginated list queries. */
export type ListOptions = {
  /** Maximum number of documents to return. */
  limit?: number;
  /** Field to order results by. */
  orderBy?: string;
  /** Order direction. */
  orderDirection?: "asc" | "desc";
  /** Document ID to start after (for cursor-based pagination). */
  startAfterDocId?: string;
};

/** A simple where-clause filter. */
export type WhereFilter = {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a QuerySnapshot into a typed array of documents,
 * injecting the document `id` into each result.
 */
function snapshotToArray<T = DocumentData>(snapshot: QuerySnapshot<T>): FirestoreDoc<T>[] {
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  }));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const firestoreService = {
  // -------------------------------------------------------------------------
  // References
  // -------------------------------------------------------------------------

  /** Get a typed CollectionReference. */
  collection<T = DocumentData>(collectionPath: string): CollectionReference<T> {
    return db.collection(collectionPath) as CollectionReference<T>;
  },

  /** Get a typed DocumentReference. */
  doc<T = DocumentData>(collectionPath: string, docId: string): DocumentReference<T> {
    return db.collection(collectionPath).doc(docId) as DocumentReference<T>;
  },

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  /**
   * Create a new document with an auto-generated ID.
   * Returns the new document's ID.
   */
  async add(collectionPath: string, data: DocumentData): Promise<string> {
    const ref = await db.collection(collectionPath).add(data);
    return ref.id;
  },

  /**
   * Create or overwrite a document with a specific ID.
   * Use `merge: true` to merge into an existing document.
   */
  async set(
    collectionPath: string,
    docId: string,
    data: DocumentData,
    options?: { merge?: boolean },
  ): Promise<WriteResult> {
    return db
      .collection(collectionPath)
      .doc(docId)
      .set(data, options ?? {});
  },

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  /** Get a single document by ID. Returns `null` if it does not exist. */
  async get<T = DocumentData>(
    collectionPath: string,
    docId: string,
  ): Promise<FirestoreDoc<T> | null> {
    const snap = await db.collection(collectionPath).doc(docId).get();
    if (!snap.exists) return null;
    return { ...(snap.data() as T), id: snap.id };
  },

  /** Check whether a document exists. */
  async exists(collectionPath: string, docId: string): Promise<boolean> {
    const snap = await db.collection(collectionPath).doc(docId).get();
    return snap.exists;
  },

  /**
   * List documents in a collection with optional pagination and ordering.
   */
  async list<T = DocumentData>(
    collectionPath: string,
    options: ListOptions = {},
  ): Promise<FirestoreDoc<T>[]> {
    let query: Query<T> = db.collection(collectionPath) as CollectionReference<T>;

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection ?? "asc");
    }

    if (options.startAfterDocId) {
      const cursor = await db.collection(collectionPath).doc(options.startAfterDocId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      } else {
        throw new Error(
          `Invalid pagination cursor: document "${options.startAfterDocId}" does not exist in collection "${collectionPath}".`,
        );
      }
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshotToArray<T>(snapshot);
  },

  /**
   * Query documents with one or more where-clause filters.
   * Supports optional ordering and limiting.
   */
  async query<T = DocumentData>(
    collectionPath: string,
    filters: WhereFilter[],
    options: ListOptions = {},
  ): Promise<FirestoreDoc<T>[]> {
    let query: Query<T> = db.collection(collectionPath) as CollectionReference<T>;

    for (const f of filters) {
      query = query.where(f.field, f.op, f.value);
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection ?? "asc");
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshotToArray<T>(snapshot);
  },

  /**
   * Query using a Firestore composite Filter (AND / OR).
   */
  async queryWithFilter<T = DocumentData>(
    collectionPath: string,
    filter: Filter,
    options: ListOptions = {},
  ): Promise<FirestoreDoc<T>[]> {
    let query: Query<T> = (db.collection(collectionPath) as CollectionReference<T>).where(filter);

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection ?? "asc");
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshotToArray<T>(snapshot);
  },

  /**
   * Count documents matching optional filters without downloading them.
   */
  async count(collectionPath: string, filters: WhereFilter[] = []): Promise<number> {
    let query: Query = db.collection(collectionPath);
    for (const f of filters) {
      query = query.where(f.field, f.op, f.value);
    }
    const snapshot = await query.count().get();
    return snapshot.data().count;
  },

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  /** Update fields on an existing document (fails if doc doesn't exist). */
  async update(
    collectionPath: string,
    docId: string,
    data: Record<string, unknown>,
  ): Promise<WriteResult> {
    return db.collection(collectionPath).doc(docId).update(data);
  },

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  /** Delete a single document by ID. */
  async delete(collectionPath: string, docId: string): Promise<WriteResult> {
    return db.collection(collectionPath).doc(docId).delete();
  },

  // -------------------------------------------------------------------------
  // Batch & Transaction
  // -------------------------------------------------------------------------

  /** Create a new WriteBatch for atomic multi-document writes (max 500 ops). */
  batch(): WriteBatch {
    return db.batch();
  },

  /**
   * Run a Firestore transaction.
   * The callback receives the Transaction object and must return a result.
   */
  async transaction<R>(fn: (transaction: FirebaseFirestore.Transaction) => Promise<R>): Promise<R> {
    return db.runTransaction(fn);
  },

  // -------------------------------------------------------------------------
  // Subcollections
  // -------------------------------------------------------------------------

  /** Get a reference to a subcollection on a specific document. */
  subcollection<T = DocumentData>(
    collectionPath: string,
    docId: string,
    subcollectionName: string,
  ): CollectionReference<T> {
    return db
      .collection(collectionPath)
      .doc(docId)
      .collection(subcollectionName) as CollectionReference<T>;
  },

  /** List all documents in a subcollection. */
  async listSubcollection<T = DocumentData>(
    collectionPath: string,
    docId: string,
    subcollectionName: string,
    options: ListOptions = {},
  ): Promise<FirestoreDoc<T>[]> {
    const subPath = `${collectionPath}/${docId}/${subcollectionName}`;
    return firestoreService.list<T>(subPath, options);
  },

  // -------------------------------------------------------------------------
  // Field Value Helpers
  // -------------------------------------------------------------------------

  /** Sentinel to mark a field for deletion. */
  deleteField(): FieldValue {
    return FieldValue.delete();
  },

  /** Atomically increment a numeric field. */
  increment(n: number): FieldValue {
    return FieldValue.increment(n);
  },

  /** Atomically add elements to an array field. */
  arrayUnion(...elements: unknown[]): FieldValue {
    return FieldValue.arrayUnion(...elements);
  },

  /** Atomically remove elements from an array field. */
  arrayRemove(...elements: unknown[]): FieldValue {
    return FieldValue.arrayRemove(...elements);
  },

  /** Server-generated timestamp. */
  serverTimestamp(): FieldValue {
    return FieldValue.serverTimestamp();
  },
};

export default firestoreService;
