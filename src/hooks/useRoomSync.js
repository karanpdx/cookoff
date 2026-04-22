import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useRoomSync(gameCode) {
  const code = (gameCode || '').trim();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) {
      setRoom(null);
      setLoading(false);
      setError(null);
      return undefined;
    }
    const ref = doc(db, 'rooms', code);
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
        } else {
          setRoom({ id: snap.id, ...snap.data() });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [code]);

  const updateRoom = useCallback(
    async (data) => {
      if (!code) throw new Error('Missing gameCode');
      await updateDoc(doc(db, 'rooms', code), data);
    },
    [code]
  );

  const addToArray = useCallback(
    async (field, value) => {
      if (!code) throw new Error('Missing gameCode');
      await updateDoc(doc(db, 'rooms', code), { [field]: arrayUnion(value) });
    },
    [code]
  );

  const removeFromArray = useCallback(
    async (field, value) => {
      if (!code) throw new Error('Missing gameCode');
      await updateDoc(doc(db, 'rooms', code), { [field]: arrayRemove(value) });
    },
    [code]
  );

  return useMemo(
    () => ({
      room,
      loading,
      error,
      updateRoom,
      addToArray,
      removeFromArray,
    }),
    [room, loading, error, updateRoom, addToArray, removeFromArray]
  );
}
