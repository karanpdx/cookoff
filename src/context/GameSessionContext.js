import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const GameSessionContext = createContext(null);

export function GameSessionProvider({ children }) {
  const [dishes, setDishes] = useState([]);
  const [cookingRoasts, setCookingRoasts] = useState([]);
  const [liveRoast, setLiveRoast] = useState(null);
  const [liveRoastSeq, setLiveRoastSeq] = useState(0);
  const [kitchenChallenge, setKitchenChallengeState] = useState(null);
  const [kitchenChallengeKey, setKitchenChallengeKey] = useState(null);
  const [sessionRecipe, setSessionRecipe] = useState(null);
  const [spectatorEngagementPoints, setSpectatorEngagementPoints] = useState(170);

  const setKitchenChallenge = useCallback((challenge, key) => {
    setKitchenChallengeState(challenge);
    setKitchenChallengeKey(key ?? null);
  }, []);

  const addSpectatorEngagementPoints = useCallback((delta) => {
    if (!delta || !Number.isFinite(delta)) return;
    setSpectatorEngagementPoints((p) => Math.max(0, p + delta));
  }, []);

  const addDishSubmission = useCallback((dish) => {
    const id = dish.id || `dish-${Date.now()}`;
    setDishes((prev) => [...prev, { ...dish, id }]);
    return id;
  }, []);

  const sendJudgeRoastAnonymous = useCallback((text) => {
    const t = (text || '').trim();
    if (!t) return;
    const id = `roast-${Date.now()}`;
    setCookingRoasts((prev) => [...prev, { id, text: t, votes: 0 }]);
    setLiveRoast({ id, text: t });
    setLiveRoastSeq((s) => s + 1);
  }, []);

  const upvoteCookingRoast = useCallback((roastId) => {
    setCookingRoasts((prev) =>
      prev.map((r) => (r.id === roastId ? { ...r, votes: r.votes + 1 } : r))
    );
  }, []);

  const resetSession = useCallback(() => {
    setDishes([]);
    setCookingRoasts([]);
    setLiveRoast(null);
    setLiveRoastSeq(0);
    setKitchenChallengeState(null);
    setKitchenChallengeKey(null);
    setSessionRecipe(null);
    setSpectatorEngagementPoints(170);
  }, []);

  const value = useMemo(
    () => ({
      dishes,
      cookingRoasts,
      liveRoast,
      liveRoastSeq,
      kitchenChallenge,
      kitchenChallengeKey,
      setKitchenChallenge,
      sessionRecipe,
      setSessionRecipe,
      spectatorEngagementPoints,
      addSpectatorEngagementPoints,
      addDishSubmission,
      sendJudgeRoastAnonymous,
      upvoteCookingRoast,
      resetSession,
    }),
    [
      dishes,
      cookingRoasts,
      liveRoast,
      liveRoastSeq,
      kitchenChallenge,
      kitchenChallengeKey,
      setKitchenChallenge,
      sessionRecipe,
      spectatorEngagementPoints,
      addSpectatorEngagementPoints,
      addDishSubmission,
      sendJudgeRoastAnonymous,
      upvoteCookingRoast,
      resetSession,
    ]
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) {
    throw new Error('useGameSession must be used within GameSessionProvider');
  }
  return ctx;
}
