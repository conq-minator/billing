export type QueuedUtterance = {
  id: string;
  billId: string;
  transcript: string;
  lang: "hi" | "bn" | "en";
  clientSeq: number;
  createdAt: number;
};

const DB_NAME = "boli-quote-offline";
const STORE_NAME = "utterances";

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueUtterance(item: QueuedUtterance): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openQueueDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function drainUtteranceQueue(
  handler: (item: QueuedUtterance) => Promise<boolean>
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openQueueDb();
  const items = await new Promise<QueuedUtterance[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as QueuedUtterance[]) ?? []);
    req.onerror = () => reject(req.error);
  });

  items.sort((a, b) => a.clientSeq - b.clientSeq);
  for (const item of items) {
    const ok = await handler(item);
    if (!ok) break;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(item.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
