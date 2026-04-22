import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const FIREBASE_ENABLED = true;

function stableContentHash(data) {
  if (!data) return '';
  try {
    const copy = JSON.parse(JSON.stringify(data));
    delete copy.updatedAt;
    delete copy.lastModified;
    delete copy.serverTimestamp;
    if (Array.isArray(copy.players)) {
      copy.players = copy.players.map((p) => {
        const { joinedAt, lastSeen, ...rest } = p;
        return rest;
      });
    }
    return JSON.stringify(copy);
  } catch {
    return String(Math.random());
  }
}

export function useRoomSync(gameCode) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(FIREBASE_ENABLED ? Boolean(gameCode) : false);
  const [error, setError] = useState(null);
  const prevDataStr = useRef(null);
  const gameCodeRef = useRef(gameCode);
  const roomDocRef = useRef(null);

  useEffect(() => {
    gameCodeRef.current = gameCode;
    roomDocRef.current = gameCode ? doc(db, 'rooms', String(gameCode)) : null;
    console.log('[EFFECT RUN]', 'useRoomSync', 'subscribe', {
      gameCode: gameCode || '',
      enabled: FIREBASE_ENABLED,
    });
    if (!FIREBASE_ENABLED || !gameCode || !roomDocRef.current) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    prevDataStr.current = null;
    const unsub = onSnapshot(
      roomDocRef.current,
      (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          setRoom(null);
          return;
        }
        const data = snap.data();
        const hash = stableContentHash(data);
        console.log('[useRoomSync] snapshot received for gameCode:', gameCodeRef.current);
        if (prevDataStr.current === hash) return;
        prevDataStr.current = hash;
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
    if (!FIREBASE_ENABLED || !gameCodeRef.current) return;
    const roomRef = roomDocRef.current || doc(db, 'rooms', String(gameCodeRef.current));
    await updateDoc(roomRef, data);
  }, []);

  const addToArray = useCallback(async (field, value) => {
    if (!FIREBASE_ENABLED || !gameCodeRef.current) return;
    const roomRef = roomDocRef.current || doc(db, 'rooms', String(gameCodeRef.current));
    await updateDoc(roomRef, { [field]: arrayUnion(value) });
  }, []);

  const removeFromArray = useCallback(async (field, value) => {
    if (!FIREBASE_ENABLED || !gameCodeRef.current) return;
    const roomRef = roomDocRef.current || doc(db, 'rooms', String(gameCodeRef.current));
    await updateDoc(roomRef, { [field]: arrayRemove(value) });
  }, []);

  return { room, loading, error, updateRoom, addToArray, removeFromArray };
}
