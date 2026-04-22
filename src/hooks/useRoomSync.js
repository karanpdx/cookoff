import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useRoomSync(gameCode) {
  const code = useMemo(() => (gameCode || '').trim(), [gameCode]);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [error, setError] = useState(null);
  const activeCodeRef = useRef('');
  const unsubscribeRef = useRef(null);
  const prevDataStr = useRef(null);
  const codeRef = useRef(code);
  const roomDocRef = useRef(null);

  useEffect(() => {
    codeRef.current = code;
    roomDocRef.current = code ? doc(db, 'rooms', code) : null;
  }, [code]);

  useEffect(() => {
    if (activeCodeRef.current === code) return undefined;
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    activeCodeRef.current = code;
    if (!code) {
      setRoom(null);
      setLoading(false);
      setError(null);
      prevDataStr.current = null;
      return undefined;
    }
    const ref = roomDocRef.current || doc(db, 'rooms', code);
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next = !snap.exists() ? null : { id: snap.id, ...snap.data() };
        const dataStr = JSON.stringify(next);
        if (prevDataStr.current === dataStr) {
          setLoading(false);
          setError(null);
          return;
        }
        prevDataStr.current = dataStr;
        setRoom(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    unsubscribeRef.current = unsub;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      activeCodeRef.current = '';
    };
  }, [code]);

  const updateRoom = useCallback(
    async (data) => {
      const roomDoc = roomDocRef.current;
      if (!roomDoc || !codeRef.current) throw new Error('Missing gameCode');
      await updateDoc(roomDoc, data);
    },
    []
  );

  const addToArray = useCallback(
    async (field, value) => {
      const roomDoc = roomDocRef.current;
      if (!roomDoc || !codeRef.current) throw new Error('Missing gameCode');
      await updateDoc(roomDoc, { [field]: arrayUnion(value) });
    },
    []
  );

  const removeFromArray = useCallback(
    async (field, value) => {
      const roomDoc = roomDocRef.current;
      if (!roomDoc || !codeRef.current) throw new Error('Missing gameCode');
      await updateDoc(roomDoc, { [field]: arrayRemove(value) });
    },
    []
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
