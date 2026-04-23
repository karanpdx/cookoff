import { useEffect, useRef, useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

/** `cookingStartedAt` / `activeSabotageLite.startedAt`: number ms or Firestore Timestamp. */
export function liteRoomTimestampToMs(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  }
  return null;
}

/** Sabotage types for Lite v1 (`activeSabotageLite.type`). */
export const LITE_SABOTAGE_TYPE = {
  BLACKOUT: 'blackout',
  TIME_PENALTY: 'time_penalty',
  MYSTERY_INGREDIENT: 'mystery_ingredient',
};

export const LITE_SABOTAGE_COST = {
  [LITE_SABOTAGE_TYPE.BLACKOUT]: 40,
  [LITE_SABOTAGE_TYPE.TIME_PENALTY]: 35,
  [LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]: 25,
};

export const LITE_BET_STAKE = 20;
export const LITE_BET_WIN_BONUS = 40;
export const LITE_ROAST_WIN_BONUS = 20;
export const LITE_HANGMAN_WIN_BONUS = 20;

/** True while `startedAt + durationSec` is in the future (UI-only expiry). */
export function isActiveSabotageLite(active, nowMs = Date.now()) {
  if (!active || typeof active.type !== 'string') return false;
  const started = liteRoomTimestampToMs(active.startedAt);
  const durSec = Math.max(1, Math.floor(Number(active.durationSec) || 1));
  if (started == null) return false;
  return nowMs < started + durSec * 1000;
}

/** Lite-only roles on each `room.players[]` entry (`liteRole` string). */
export const LITE_ROLE = {
  COMPETITOR: 'competitor',
  JUDGE: 'judge',
  SPECTATOR: 'spectator',
};

/** Uppercase badge label for UI, or null if unset. */
export function getLiteRoleBadgeLabel(liteRole) {
  if (liteRole === LITE_ROLE.COMPETITOR) return 'COMPETITOR';
  if (liteRole === LITE_ROLE.JUDGE) return 'JUDGE';
  if (liteRole === LITE_ROLE.SPECTATOR) return 'SPECTATOR';
  return null;
}

export function getLiteRoleBadgeVariant(liteRole) {
  if (liteRole === LITE_ROLE.COMPETITOR) return 'host';
  if (liteRole === LITE_ROLE.JUDGE) return 'default';
  if (liteRole === LITE_ROLE.SPECTATOR) return 'score';
  return 'default';
}

/**
 * Deterministic Lite roles: host first, then guests by id.
 * 2 → competitor, judge | 3 → competitor, judge, spectator | 4+ → 1 competitor, 1 judge, rest spectators.
 */
export function playersWithAssignedLiteRoles(players) {
  const list = Array.isArray(players) ? [...players] : [];
  const ranked = [...list].sort((a, b) => {
    if (!!a.isHost !== !!b.isHost) return a.isHost ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
  const roleById = {};
  const n = ranked.length;
  ranked.forEach((p, i) => {
    let liteRole = LITE_ROLE.SPECTATOR;
    if (n < 2) liteRole = LITE_ROLE.COMPETITOR;
    else if (n === 2) liteRole = i === 0 ? LITE_ROLE.COMPETITOR : LITE_ROLE.JUDGE;
    else if (n === 3) {
      liteRole =
        i === 0 ? LITE_ROLE.COMPETITOR : i === 1 ? LITE_ROLE.JUDGE : LITE_ROLE.SPECTATOR;
    } else {
      liteRole =
        i === 0 ? LITE_ROLE.COMPETITOR : i === 1 ? LITE_ROLE.JUDGE : LITE_ROLE.SPECTATOR;
    }
    roleById[p.id] = liteRole;
  });
  return list.map((p) => ({ ...p, liteRole: roleById[p.id] }));
}

function buildLiteRoundPoints(players) {
  const pts = {};
  (Array.isArray(players) ? players : []).forEach((p) => {
    if (!p?.id) return;
    if (!p?.liteRole || p.liteRole === LITE_ROLE.COMPETITOR || p.liteRole === LITE_ROLE.JUDGE || p.liteRole === LITE_ROLE.SPECTATOR) {
      pts[p.id] = 100;
    }
  });
  return pts;
}

function pickFunniestRoast(liteRoasts, liteRoastVotes) {
  const roasts = Array.isArray(liteRoasts) ? liteRoasts : [];
  const votes = liteRoastVotes || {};
  if (roasts.length === 0) return null;
  const voteCountByRoastId = {};
  Object.values(votes).forEach((roastId) => {
    if (!roastId) return;
    voteCountByRoastId[roastId] = (voteCountByRoastId[roastId] || 0) + 1;
  });
  const ranked = [...roasts].sort((a, b) => {
    const av = voteCountByRoastId[a.id] || 0;
    const bv = voteCountByRoastId[b.id] || 0;
    if (bv !== av) return bv - av;
    if ((a.createdAt || 0) !== (b.createdAt || 0)) return (a.createdAt || 0) - (b.createdAt || 0);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  const top = ranked[0];
  if (!top) return null;
  return {
    ...top,
    voteCount: voteCountByRoastId[top.id] || 0,
  };
}

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

  const assignLiteRoles = useCallback(async () => {
    if (!roomRef.current) return;
    console.log('[LITE WRITE]', 'assignLiteRoles');
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const nextPlayers = playersWithAssignedLiteRoles(players);
      tx.update(roomRef.current, { players: nextPlayers });
    });
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
    const cookMinutes =
      Number(recipe?.cookTime) > 0
        ? Number(recipe.cookTime)
        : Number(challenge?.cookTimeTarget) || 20;
    const cookDurationSec = Math.floor(cookMinutes * 60);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      tx.update(roomRef.current, {
        challenge,
        recipeLite: recipe,
        phase: 'cooking',
        cookingStartedAt: Date.now(),
        cookDurationSec,
        liteAiGenerated: false,
        activeSabotageLite: null,
        litePenaltySecByPlayer: {},
        liteScores: {},
        liteBets: {},
        litePoints: buildLiteRoundPoints(players),
        liteRoasts: [],
        liteRoastVotes: {},
        funniestRoastLite: null,
        liteHangmanRewards: {},
      });
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
      const me = players.find((p) => p.id === playerId);
      if (me?.liteRole && me.liteRole !== LITE_ROLE.COMPETITOR) return;
      const nextPlayers = players.map((p) =>
        p.id === playerId
          ? { ...p, dishName: dishName || p.dishName || 'Untitled Dish', photoUri: photoUri || p.photoUri || null }
          : p
      );
      tx.update(roomRef.current, { players: nextPlayers });
    });
  }, []);

  const placeLiteBet = useCallback(async ({ bettorId, targetPlayerId, stake = LITE_BET_STAKE }) => {
    if (!roomRef.current || !bettorId || !targetPlayerId) return;
    const parsedStake = Math.floor(Number(stake));
    if (!Number.isInteger(parsedStake) || parsedStake <= 0) return;
    console.log('[LITE WRITE]', 'placeLiteBet', { bettorId, targetPlayerId, stake: parsedStake });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      if (roomData.phase !== 'cooking') return;
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const bettor = players.find((p) => p.id === bettorId);
      if (!bettor || bettor.liteRole !== LITE_ROLE.SPECTATOR) return;
      const target = players.find((p) => p.id === targetPlayerId);
      if (!target || (target.liteRole && target.liteRole !== LITE_ROLE.COMPETITOR)) return;
      const liteBets = roomData.liteBets || {};
      if (liteBets[bettorId]) return;
      const litePoints = { ...(roomData.litePoints || {}) };
      const hasPointEntry = Object.prototype.hasOwnProperty.call(litePoints, bettorId);
      const cur = hasPointEntry ? Number(litePoints[bettorId]) || 0 : 100;
      if (cur < parsedStake) return;
      litePoints[bettorId] = cur - parsedStake;
      tx.update(roomRef.current, {
        litePoints,
        liteBets: { ...liteBets, [bettorId]: { targetPlayerId, stake: parsedStake } },
      });
    });
  }, []);

  const submitLiteRoast = useCallback(async (playerId, playerName, role, text) => {
    if (!roomRef.current || !playerId) return;
    const roastText = String(text || '').trim();
    if (!roastText) return;
    const clipped = roastText.slice(0, 180);
    console.log('[LITE WRITE]', 'submitLiteRoast', { playerId });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const me = players.find((p) => p.id === playerId);
      if (!me) return;
      if (me.liteRole !== LITE_ROLE.JUDGE && me.liteRole !== LITE_ROLE.SPECTATOR) return;
      const liteRoasts = Array.isArray(roomData.liteRoasts) ? roomData.liteRoasts : [];
      if (liteRoasts.some((r) => r.playerId === playerId)) return;
      const next = {
        id: `roast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        playerId,
        playerName: String(playerName || me.name || 'Player'),
        role: String(role || me.liteRole || 'guest'),
        text: clipped,
        createdAt: Date.now(),
      };
      tx.update(roomRef.current, { liteRoasts: [...liteRoasts, next] });
    });
  }, []);

  const voteLiteRoast = useCallback(async (voterPlayerId, roastId) => {
    if (!roomRef.current || !voterPlayerId || !roastId) return;
    console.log('[LITE WRITE]', 'voteLiteRoast', { voterPlayerId });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const liteRoasts = Array.isArray(roomData.liteRoasts) ? roomData.liteRoasts : [];
      if (!liteRoasts.some((r) => r.id === roastId)) return;
      const liteRoastVotes = roomData.liteRoastVotes || {};
      if (liteRoastVotes[voterPlayerId]) return;
      tx.update(roomRef.current, {
        liteRoastVotes: { ...liteRoastVotes, [voterPlayerId]: roastId },
      });
    });
  }, []);

  const awardLiteHangmanReward = useCallback(async (playerId) => {
    if (!roomRef.current || !playerId) return;
    console.log('[LITE WRITE]', 'awardLiteHangmanReward', { playerId });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      if (roomData.phase !== 'cooking') return;
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const p = players.find((x) => x.id === playerId);
      if (!p || p.liteRole !== LITE_ROLE.SPECTATOR) return;
      const rewards = roomData.liteHangmanRewards || {};
      if (rewards[playerId]) return;
      const litePoints = { ...(roomData.litePoints || {}) };
      litePoints[playerId] = (Number(litePoints[playerId]) || 0) + LITE_HANGMAN_WIN_BONUS;
      tx.update(roomRef.current, {
        litePoints,
        liteHangmanRewards: { ...rewards, [playerId]: true },
      });
    });
  }, []);

  const castVoteLite = useCallback(async (voterId, targetPlayerId) => {
    if (!roomRef.current || !voterId || !targetPlayerId) return;
    console.log('[LITE WRITE]', 'submit vote', { voterId, targetPlayerId });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const voter = players.find((p) => p.id === voterId);
      if (voter?.liteRole && voter.liteRole !== LITE_ROLE.JUDGE) return;
      const votes = roomData.votesLite || {};
      if (votes[voterId]) return;
      tx.update(roomRef.current, { votesLite: { ...votes, [voterId]: targetPlayerId } });
    });
  }, []);

  const submitJudgeScoreLite = useCallback(async (judgeId, targetPlayerId, score) => {
    if (!roomRef.current || !judgeId || !targetPlayerId) return;
    const parsedScore = Math.floor(Number(score));
    if (!Number.isInteger(parsedScore) || parsedScore < 1 || parsedScore > 10) return;
    console.log('[LITE WRITE]', 'submit judge score', { judgeId, targetPlayerId, score: parsedScore });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const judge = players.find((p) => p.id === judgeId);
      if (judge?.liteRole !== LITE_ROLE.JUDGE) return;
      const target = players.find((p) => p.id === targetPlayerId);
      if (!target) return;
      const liteScores = roomData.liteScores || {};
      const targetScores = liteScores[targetPlayerId] || {};
      tx.update(roomRef.current, {
        liteScores: {
          ...liteScores,
          [targetPlayerId]: { ...targetScores, [judgeId]: parsedScore },
        },
      });
    });
  }, []);

  const triggerSabotageLite = useCallback(
    async ({ playerId, type, label, description, durationSec }) => {
      if (!roomRef.current || !playerId || !type) return;
      console.log('[LITE WRITE]', 'triggerSabotageLite', { type: String(type) });
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(roomRef.current);
        if (!snap.exists()) return;
        const roomData = snap.data();
        if (roomData.phase !== 'cooking') return;
        if (isActiveSabotageLite(roomData.activeSabotageLite, Date.now())) return;
        const players = Array.isArray(roomData.players) ? roomData.players : [];
        const tr = players.find((p) => p.id === playerId);
        if (!tr) return;
        if (tr.liteRole !== LITE_ROLE.JUDGE && tr.liteRole !== LITE_ROLE.SPECTATOR) return;
        const sabotageCost = Number(LITE_SABOTAGE_COST[String(type)]) || 0;
        const litePoints = { ...(roomData.litePoints || {}) };
        const hasPointEntry = Object.prototype.hasOwnProperty.call(litePoints, playerId);
        const currentPoints = hasPointEntry ? Number(litePoints[playerId]) || 0 : 100;
        if (currentPoints < sabotageCost) return;
        litePoints[playerId] = currentPoints - sabotageCost;
        const sponsoredByRole = tr.liteRole === LITE_ROLE.JUDGE ? 'judge' : 'spectator';
        const duration = Math.max(5, Math.min(120, Math.floor(Number(durationSec) || 30)));
        const nextPenaltyByPlayer = { ...(roomData.litePenaltySecByPlayer || {}) };
        if (String(type) === LITE_SABOTAGE_TYPE.TIME_PENALTY) {
          const competitor = players.find((p) => !p?.liteRole || p.liteRole === LITE_ROLE.COMPETITOR);
          if (competitor?.id) {
            nextPenaltyByPlayer[competitor.id] = (Number(nextPenaltyByPlayer[competitor.id]) || 0) + 30;
          }
        }
        tx.update(roomRef.current, {
          activeSabotageLite: {
            type: String(type),
            label: String(label || type || 'Sabotage'),
            description: String(description || ''),
            startedAt: Date.now(),
            durationSec: duration,
            sponsoredByPlayerId: playerId,
            sponsoredByRole,
          },
          litePenaltySecByPlayer: nextPenaltyByPlayer,
          litePoints,
        });
      });
    },
    []
  );

  const finalizeResultsLite = useCallback(async () => {
    if (!roomRef.current) return;
    console.log('[LITE WRITE]', 'finalize results');
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef.current);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const players = Array.isArray(roomData.players) ? roomData.players : [];
      const liteScores = roomData.liteScores || {};
      const nextPlayers = players.map((p) => {
        if (p?.liteRole && p.liteRole !== LITE_ROLE.COMPETITOR) {
          return { ...p, scoreLite: 0 };
        }
        const byJudge = liteScores[p.id] || {};
        const nums = Object.values(byJudge)
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n));
        const avg =
          nums.length > 0 ? Math.round((nums.reduce((sum, n) => sum + n, 0) / nums.length) * 10) / 10 : 0;
        return { ...p, scoreLite: avg };
      });
      const winner = [...nextPlayers].sort((a, b) => (b.scoreLite || 0) - (a.scoreLite || 0))[0] || null;
      const liteBets = roomData.liteBets || {};
      const litePoints = { ...(roomData.litePoints || {}) };
      if (winner?.id) {
        Object.entries(liteBets).forEach(([bettorId, bet]) => {
          if (!bet || bet.targetPlayerId !== winner.id) return;
          litePoints[bettorId] = (Number(litePoints[bettorId]) || 0) + LITE_BET_WIN_BONUS;
        });
      }
      const funniestRoast = pickFunniestRoast(roomData.liteRoasts, roomData.liteRoastVotes);
      if (funniestRoast?.playerId) {
        litePoints[funniestRoast.playerId] = (Number(litePoints[funniestRoast.playerId]) || 0) + LITE_ROAST_WIN_BONUS;
      }
      tx.update(roomRef.current, {
        players: nextPlayers,
        winnerLite: winner ? { id: winner.id, name: winner.name, score: winner.scoreLite || 0 } : null,
        litePoints,
        funniestRoastLite: funniestRoast
          ? {
              id: funniestRoast.id,
              playerId: funniestRoast.playerId,
              playerName: funniestRoast.playerName,
              role: funniestRoast.role,
              text: funniestRoast.text,
              voteCount: funniestRoast.voteCount || 0,
            }
          : null,
        phase: 'results',
      });
    });
  }, []);

  return {
    room,
    loading,
    error,
    patchRoom,
    assignLiteRoles,
    setPhase,
    saveChallengeAndRecipe,
    submitDishLite,
    placeLiteBet,
    submitLiteRoast,
    voteLiteRoast,
    awardLiteHangmanReward,
    castVoteLite,
    submitJudgeScoreLite,
    finalizeResultsLite,
    triggerSabotageLite,
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
