import {setGlobalOptions} from "firebase-functions";
import {
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

if (getApps().length === 0) {
  initializeApp();
}

setGlobalOptions({maxInstances: 10, region: "europe-west1"});

interface AttachmentRecord {
  id?: string;
  storagePath?: string;
}

/**
 * Deletes a list of storage paths from the default Firebase Storage bucket.
 * @param {string[]} paths Storage paths to delete.
 */
async function deleteStoragePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const bucket = getStorage().bucket();
  await Promise.all(
    paths.map(async (storagePath) => {
      if (!storagePath) return;
      try {
        await bucket.file(storagePath).delete({ignoreNotFound: true});
        logger.info("Deleted attachment from Storage", {storagePath});
      } catch (err) {
        logger.warn("Failed to delete attachment from Storage", {
          storagePath,
          err,
        });
      }
    }),
  );
}

/**
 * Triggered when a list entry is deleted: removes all associated attachments
 * from Firebase Storage.
 */
export const onListEntryDeleted = onDocumentDeleted(
  "lists/{listId}/entries/{entryId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const attachments = Array.isArray(data.attachments) ?
      (data.attachments as AttachmentRecord[]) :
      [];
    const paths = attachments
      .map((a) => a.storagePath || "")
      .filter((p): p is string => Boolean(p));

    await deleteStoragePaths(paths);
  },
);

/**
 * Triggered when a list entry is updated: compares old and new attachments
 * and removes any deleted files from Firebase Storage.
 */
export const onListEntryUpdated = onDocumentUpdated(
  "lists/{listId}/entries/{entryId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    const beforeAttachments = Array.isArray(beforeData.attachments) ?
      (beforeData.attachments as AttachmentRecord[]) :
      [];
    const afterAttachments = Array.isArray(afterData.attachments) ?
      (afterData.attachments as AttachmentRecord[]) :
      [];

    const remainingPaths = new Set(
      afterAttachments
        .map((a) => a.storagePath || "")
        .filter((p): p is string => Boolean(p)),
    );

    const removedPaths = beforeAttachments
      .map((a) => a.storagePath || "")
      .filter((p): p is string => Boolean(p) && !remainingPaths.has(p));

    await deleteStoragePaths(removedPaths);
  },
);

/**
 * Triggered when a list is deleted: deletes all subcollection entries and
 * cleans up any associated files in Firebase Storage.
 */
export const onListDeleted = onDocumentDeleted(
  "lists/{listId}",
  async (event) => {
    const {listId} = event.params;
    const db = getFirestore();
    const entriesSnap = await db
      .collection(`lists/${listId}/entries`)
      .get();

    if (entriesSnap.empty) return;

    const pathsToDelete: string[] = [];
    const batch = db.batch();

    for (const docSnap of entriesSnap.docs) {
      const data = docSnap.data();
      const attachments = Array.isArray(data.attachments) ?
        (data.attachments as AttachmentRecord[]) :
        [];
      for (const att of attachments) {
        if (att.storagePath) {
          pathsToDelete.push(att.storagePath);
        }
      }
      batch.delete(docSnap.ref);
    }

    await batch.commit();
    await deleteStoragePaths(pathsToDelete);
  },
);
