import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * A hook that syncs local state with a Firestore document for real-time persistence.
 * Useful for long forms (Employee Profile, Onboarding) to prevent data loss on refresh.
 */
export function usePersistentDraft<T>(collectionName: string, id: string, initialValue: T, sync = false) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Load initial draft from Firestore
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, collectionName, id);
    
    // 🛡️ Fail-safe Timeout: Unblock UI after 3 seconds if Firebase is hanging/offline
    const timeout = setTimeout(() => {
      setLoading(false);
      console.warn(`[Firebase] Timeout fetching draft for ${collectionName}/${id}. Defaulting to initial state.`);
    }, 3000);

    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          setData(snap.data() as T);
        }
      })
      .catch((err) => {
        console.error('[Firebase Load Error]:', err);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    // Real-time sync is now optional and disabled by default to prevent re-render loops in high-frequency forms
    if (sync) {
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as T;
          setData(remoteData);
        }
      }, (err) => {
        console.error('[Firebase Snapshot Error]:', err);
      });
      return () => unsub();
    }
  }, [collectionName, id, sync]);

  // Sync changes back to Firestore
  const updateDraft = async (newData: T) => {
    setData(newData);
    if (!id) return;
    
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { ...newData, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('[Firebase Sync Error]:', err);
    }
  };

  return { data, updateDraft, loading };
}
