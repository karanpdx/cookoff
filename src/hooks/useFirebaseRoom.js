import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const PLAYER_ID_KEY = 'cookoff_player_id';

function mkPlayerId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreatePlayerId() {
  const existing = await AsyncStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;
  const next = mkPlayerId();
  await AsyncStorage.setItem(PLAYER_ID_KEY, next);
  return next;
}

function mkCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useFirebaseRoom() {
  const getPlayerId = useCallback(async () => getOrCreatePlayerId(), []);

  const createRoom = useCallback(async (playerName, avatarUri) => {
    const hostId = await getOrCreatePlayerId();
    let gameCode = '';
    let tries = 0;
    while (!gameCode && tries < 10) {
      tries += 1;
      const candidate = mkCode();
      const exists = await getDoc(doc(db, 'rooms', candidate));
      if (!exists.exists()) {
        gameCode = candidate;
      }
    }
    if (!gameCode) throw new Error('Unable to create room');
    console.log('[createRoom] generated gameCode:', gameCode);
    const hostPlayer = {
      id: hostId,
      name: playerName || 'Host',
      role: null,
      avatarUri: avatarUri || null,
      photoUri: null,
      dishName: null,
      score: null,
      engagementPoints: 170,
      isHost: true,
    };
    await setDoc(doc(db, 'rooms', gameCode), {
      gameCode,
      hostName: hostPlayer.name,
      hostId,
      status: 'waiting',
      players: [hostPlayer],
      challenge: null,
      recipe: null,
      sabotageCards: [],
      roasts: [],
      votes: {},
      bets: {},
      createdAt: Date.now(),
    });
    console.log('[createRoom] wrote room doc id + field gameCode:', gameCode);
    return gameCode;
  }, []);

  const joinRoom = useCallback(async (gameCode, playerName, avatarUri) => {
    const code = String(gameCode || '').trim();
    if (!code) throw new Error('Room not found');
    console.log('[joinRoom] user entered gameCode:', code);
    const playerId = await getOrCreatePlayerId();
    let roomRef = doc(db, 'rooms', code);
    let roomSnap = await getDoc(roomRef);
    console.log('[joinRoom] doc lookup by id exists:', roomSnap.exists(), 'docId:', code);
    const q = query(collection(db, 'rooms'), where('gameCode', '==', code));
    const byField = await getDocs(q);
    console.log('[joinRoom] query by gameCode matches:', byField.size, 'for code:', code);
    if (!roomSnap.exists()) {
      if (byField.empty) throw new Error('Room not found');
      roomRef = byField.docs[0].ref;
      roomSnap = byField.docs[0];
      console.log('[joinRoom] using queried room doc id:', roomRef.id, 'for code:', code);
    }
    const room = roomSnap.data();
    const players = Array.isArray(room.players) ? room.players : [];
    const existing = players.find((p) => p.id === playerId);
    if (!existing) {
      const nextPlayer = {
        id: playerId,
        name: playerName || 'Player',
        role: null,
        avatarUri: avatarUri || null,
        photoUri: null,
        dishName: null,
        score: null,
        engagementPoints: 170,
        isHost: false,
      };
      await updateDoc(roomRef, { players: [...players, nextPlayer] });
      console.log('[joinRoom] added player to gameCode:', room.gameCode || code, 'docId:', roomRef.id);
      return { id: code, ...room, players: [...players, nextPlayer] };
    }
    console.log('[joinRoom] existing player joined gameCode:', room.gameCode || code, 'docId:', roomRef.id);
    return { id: code, ...room };
  }, []);

  const assignRoles = useCallback(async (gameCode) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const players = Array.isArray(room.players) ? room.players : [];
      if (players.length === 0) return;
      const shuffled = shuffle(players);
      let updated;
      if (players.length === 2) {
        updated = shuffled.map((p) => ({ ...p, role: 'COMPETITOR' }));
      } else if (players.length >= 3) {
        updated = shuffled.map((p, idx) => {
          if (idx === 0) return { ...p, role: 'JUDGE' };
          return { ...p, role: idx % 2 === 0 ? 'SPECTATOR' : 'COMPETITOR' };
        });
      } else {
        updated = shuffled.map((p) => ({ ...p, role: 'COMPETITOR' }));
      }
      tx.update(roomRef, { players: updated, status: room.status || 'role_assignment' });
    });
  }, []);

  const updatePlayerPhoto = useCallback(async (gameCode, playerId, photoUri, dishName) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const players = (room.players || []).map((p) =>
        p.id === playerId ? { ...p, photoUri: photoUri || null, dishName: dishName || null } : p
      );
      tx.update(roomRef, { players });
    });
  }, []);

  const submitVote = useCallback(async (gameCode, voterId, targetPlayerId) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const votes = { ...(room.votes || {}), [voterId]: targetPlayerId };
      tx.update(roomRef, { votes });
    });
  }, []);

  const submitJudgeScore = useCallback(async (gameCode, judgeId, targetPlayerId, score) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const players = (room.players || []).map((p) =>
        p.id === targetPlayerId ? { ...p, score: Number(score) || null, scoredBy: judgeId } : p
      );
      tx.update(roomRef, { players });
    });
  }, []);

  const addRoast = useCallback(async (gameCode, roast) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const roasts = Array.isArray(room.roasts) ? room.roasts : [];
      tx.update(roomRef, { roasts: [...roasts, roast] });
    });
  }, []);

  const upvoteRoast = useCallback(async (gameCode, roastId, voterId) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const roasts = Array.isArray(room.roasts) ? room.roasts : [];
      const idx = roasts.findIndex((r) => r.id === roastId);
      if (idx < 0) return;
      const target = roasts[idx] || {};
      const votesBy = { ...(target.votesBy || {}) };
      if (voterId && votesBy[voterId]) return;
      if (voterId) votesBy[voterId] = true;
      const next = [...roasts];
      next[idx] = {
        ...target,
        votes: (Number(target.votes) || 0) + 1,
        votesBy,
      };
      tx.update(roomRef, { roasts: next });
    });
  }, []);

  const awardRoastWinnerPoints = useCallback(async (gameCode, roastId) => {
    const code = String(gameCode || '').trim();
    if (!code || !roastId) return;
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = snap.data();
      const roasts = Array.isArray(room.roasts) ? room.roasts : [];
      const winner = roasts.find((r) => r.id === roastId);
      if (!winner?.by) return;
      if (room.roastWinnerAwardedFor === roastId) return;
      const bonus = 50 + (Number(winner.votes) || 0) * 10;
      const players = Array.isArray(room.players) ? room.players : [];
      const nextPlayers = players.map((p) =>
        p.id === winner.by
          ? { ...p, engagementPoints: Math.max(0, (Number(p.engagementPoints) || 0) + bonus) }
          : p
      );
      tx.update(roomRef, {
        players: nextPlayers,
        roastWinnerAwardedFor: roastId,
      });
    });
  }, []);

  const claimSabotageCard = useCallback(async (gameCode, cardId, playerId) => {
    const code = String(gameCode || '').trim();
    if (!code) throw new Error('Room not found');
    const roomRef = doc(db, 'rooms', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) throw new Error('Room not found');
      const room = snap.data();
      const cards = Array.isArray(room.sabotageCards) ? room.sabotageCards : [];
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx < 0) throw new Error('Card not found');
      if (cards[idx].claimedBy) throw new Error('Card already claimed');
      const next = [...cards];
      next[idx] = { ...next[idx], claimedBy: playerId };
      tx.update(roomRef, { sabotageCards: next });
    });
  }, []);

  const findRoomByCode = useCallback(async (gameCode) => {
    const code = String(gameCode || '').trim();
    if (!code) return null;
    const q = query(collection(db, 'rooms'), where('gameCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }, []);

  const deleteRoom = useCallback(async (gameCode) => {
    const code = String(gameCode || '').trim();
    if (!code) return;
    await deleteDoc(doc(db, 'rooms', code));
  }, []);

  return useMemo(
    () => ({
      getPlayerId,
      createRoom,
      joinRoom,
      assignRoles,
      updatePlayerPhoto,
      submitVote,
      submitJudgeScore,
      addRoast,
      upvoteRoast,
      awardRoastWinnerPoints,
      claimSabotageCard,
      findRoomByCode,
      deleteRoom,
    }),
    [
      getPlayerId,
      createRoom,
      joinRoom,
      assignRoles,
      updatePlayerPhoto,
      submitVote,
      submitJudgeScore,
      addRoast,
      upvoteRoast,
      awardRoastWinnerPoints,
      claimSabotageCard,
      findRoomByCode,
      deleteRoom,
    ]
  );
}
