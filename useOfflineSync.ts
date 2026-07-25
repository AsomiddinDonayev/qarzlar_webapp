import { useEffect, useRef } from "react";
import { supabase } from "./db";

const DB_NAME    = "nasiya_offline";
const STORE_NAME = "pending_debts";
const DB_VERSION = 1;

export interface PendingDebt {
  id: string; // local uuid
  business_id: string;
  customer_id: string;
  amount: number;
  note?: string;
  due_date: string;
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function queueDebt(debt: PendingDebt): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(debt);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function flushQueue(): Promise<void> {
  const idb = await openIDB();
  const items: PendingDebt[] = await new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

  for (const item of items) {
    const { error } = await supabase.from("debts").insert({
      business_id: item.business_id,
      customer_id: item.customer_id,
      amount:      item.amount,
      note:        item.note,
      due_date:    item.due_date,
    });

    if (!error) {
      // Remove from queue on success
      const tx = idb.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(item.id);
    }
  }
}

/** Mount this hook once at app root to auto-sync on reconnect */
export function useOfflineSync() {
  const flushing = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (flushing.current || !navigator.onLine) return;
      flushing.current = true;
      try { await flushQueue(); } finally { flushing.current = false; }
    };

    window.addEventListener("online", sync);
    sync(); // attempt on mount too
    return () => window.removeEventListener("online", sync);
  }, []);
}
