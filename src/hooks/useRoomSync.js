import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

export function useRoomSync(gameCode) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevDataStr = useRef(null);
  const gameCodeRef = useRef(gameCode);

  useEffect(() => {
    if (!gameCode) {
      setLoading(false);
      return;
    }
    gameCodeRef.current = gameCode;
    prevDataStr.current = null;
    const roomRef = doc(db, 'rooms', String(gameCode));
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }
        const data = snap.data();
        const str = JSON.stringify(data);
        if (prevDataStr.current === str) return;
        prevDataStr.current = str;
        setRoom(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [gameCode]);

  const updateRoom = useCallback(async (data) => {
    if (!gameCodeRef.current) return;
    const roomRef = doc(db, 'rooms', String(gameCodeRef.current));
    await updateDoc(roomRef, data);
  }, []);

  const addToArray = useCallback(async (field, value) => {
    if (!gameCodeRef.current) return;
    const roomRef = doc(db, 'rooms', String(gameCodeRef.current));
    await updateDoc(roomRef, { [field]: arrayUnion(value) });
  }, []);

  const removeFromArray = useCallback(async (field, value) => {
    if (!gameCodeRef.current) return;
    const roomRef = doc(db, 'rooms', String(gameCodeRef.current));
    await updateDoc(roomRef, { [field]: arrayRemove(value) });
  }, []);

  return { room, loading, error, updateRoom, addToArray, removeFromArray };
}
