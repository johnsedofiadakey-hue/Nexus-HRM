import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * A hook that syncs local state with a Firestore document for real-time persistence.
 * Useful for long forms (Employee Profile, Onboarding) to prevent data loss on refresh.
 */
export function usePersistentDraft<T>(collectionName: string, id: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Load initial draft from Firestore
  useEffect(() => {
    if (!id) return;

    const docRef = doc(db, collectionName, id);
    
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        setData(snap.data() as T);
      }
      setLoading(false);
    });

    // Optional: Real-time sync if multiple people are editing (unlikely for drafting but good for resilience)
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const remoteData = snap.data() as T;
        // Use a simple guard to prevent overwrite loops if needed
        setData(remoteData);
      }
    });

    return () => unsub();
  }, [collectionName, id]);

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
