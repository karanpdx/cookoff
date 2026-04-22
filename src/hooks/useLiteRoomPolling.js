import { useEffect, useRef, useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useLiteRoomPolling(gameCode, intervalMs = 2000) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(Boolean(gameCode));
  const [error, setError] = useState(null);
  const prevHashRef = useRef('');
  const roomRef = useRef(null);

  useEffect(() => {
    if (!gameCode) {
      setRoom(null);
      setLoading(false);
      return;
    }
    roomRef.current = doc(db, 'rooms', String(gameCode));
    let cancelled = false;

    const poll = async () => {
      if (cancelled || !roomRef.current) return;
      try {
        const snap = await getDoc(roomRef.current);
        if (cancelled) return;
        if (!snap.exists()) {
          console.log('[LITE POLL READ]', 'missing room doc', { gameCode: gameCode || '' });
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        const hash = JSON.stringify(data);
        if (hash !== prevHashRef.current) {
          prevHashRef.current = hash;
          console.log('[LITE POLL READ]', 'room update', { gameCode: gameCode || '', phase: data.phase || '' });
          setRoom(data);
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.log('[LITE POLL READ]', 'error', { gameCode: gameCode || '', message: String(err?.message || err) });
          setError(err);
          setLoading(false);
        }
      }
    };

    poll();
    const timer = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [gameCode, intervalMs]);

  const patchRoom = useCallback(async (patch) => {
    if (!roomRef.current) return;
    console.log('[LITE WRITE]', 'patchRoom', { patchKeys: Object.keys(patch || {}) });
    await updateDoc(roomRef.current, patch);
  }, []);

  const setPhase = useCallback(async (phase) => {
    if (!roomRef.current) return;
    console.log('[LITE WRITE]', 'phase change', { phase });
    await updateDoc(roomRef.current, { phase });
  }, []);

  const saveChallengeAndRecipe = useCallback(async (challenge, recipe) => {
    if (!roomRef.current) return;
    console.log('[LITE WRITE]', 'saveChallengeAndRecipe', {
      cuisineType: challenge?.cuisineType || '',
      budget: challenge?.budget || 0,
      skillLevel: challenge?.skillLevel || '',
      cookTimeTarget: challenge?.cookTimeTarget || 0,
    });
    await updateDoc(roomRef.current, {
      challenge,
      recipeLite: recipe,
      phase: 'cooking',
    });
  }, []);

  const submitDishLite = useCallback(async (playerId, dishName, photoUri = null) => {
    if (!roomRef.current || !playerId) return;
    console.log('[LITE WRITE]', 'submit dish', { playerId, dishName: dishName || '' });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const nextPlayers = players.map((p) =>
        p.id === playerId
          ? { ...p, dishName: dishName || p.dishName || 'Untitled Dish', photoUri: photoUri || p.photoUri || null }
          : p
      );
      tx.update(roomRef.current, { players: nextPlayers });
    });
  }, []);

  const castVoteLite = useCallback(async (voterId, targetPlayerId) => {
    if (!roomRef.current || !voterId || !targetPlayerId) return;
    console.log('[LITE WRITE]', 'submit vote', { voterId, targetPlayerId });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const votes = roomData.votesLite || {};
      if (votes[voterId]) return;
      tx.update(roomRef.current, { votesLite: { ...votes, [voterId]: targetPlayerId } });
    });
  }, []);

  const finalizeResultsLite = useCallback(async () => {
    if (!roomRef.current) return;
    console.log('[LITE WRITE]', 'finalize results');
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const votes = roomData.votesLite || {};
      const scoreMap = {};
      Object.values(votes).forEach((targetId) => {
        scoreMap[targetId] = (scoreMap[targetId] || 0) + 1;
      });
      const nextPlayers = players.map((p) => ({ ...p, scoreLite: scoreMap[p.id] || 0 }));
      const winner = [...nextPlayers].sort((a, b) => (b.scoreLite || 0) - (a.scoreLite || 0))[0] || null;
      tx.update(roomRef.current, {
        players: nextPlayers,
        winnerLite: winner ? { id: winner.id, name: winner.name, score: winner.scoreLite || 0 } : null,
        phase: 'results',
      });
    });
  }, []);

  return {
    room,
    loading,
    error,
    patchRoom,
    setPhase,
    saveChallengeAndRecipe,
    submitDishLite,
    castVoteLite,
    finalizeResultsLite,
  };
}

export function buildSimpleRecipe(challenge) {
  const cuisine = challenge?.cuisineType || 'Chef Special';
  const budget = Number(challenge?.budget) || 20;
  const skill = challenge?.skillLevel || 'Beginner';
  const cookTime = Number(challenge?.cookTimeTarget) || 20;
  return {
    dishName: `${cuisine} Weeknight Plate`,
    cookTime,
    estimatedCost: Math.max(8, Math.min(80, budget)),
    ingredients: [
      '2 tbsp olive oil',
      `1 protein of choice (${skill === 'Hard' ? 'premium cut' : 'accessible cut'})`,
      '2 cups mixed vegetables',
      '1 cup starch (rice, pasta, or potatoes)',
      'Salt, pepper, and finishing herbs',
    ],
    steps: [
      'Prep all ingredients and season the protein.',
      'Sear protein in hot oil until browned.',
      'Cook vegetables until tender-crisp and flavorful.',
      'Finish starch and plate all components together.',
      'Taste, garnish, and serve immediately.',
    ],
  };
}
