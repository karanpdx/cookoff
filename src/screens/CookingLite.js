import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, Image, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  CloudBg,
  LITE_GAME_STYLES,
  LITE_THEME,
  LiteScreenTitle,
  LiteMutedText,
  LiteErrorText,
  LiteSectionCard,
  LiteCardHeading,
  LiteCardBody,
  LiteSectionHeading,
  LitePrimaryButton,
  LiteSecondaryButton,
  liteInputStyle,
  LiteBadge,
  LitePlayerCard,
  PALETTE,
} from '../components/DesignSystem';
import {
  useLiteRoomPolling,
  LITE_ROLE,
  LITE_SABOTAGE_TYPE,
  LITE_SABOTAGE_COST,
  LITE_BET_STAKE,
  LITE_HANGMAN_WIN_BONUS,
  getLiteRoleBadgeLabel,
  getLiteRoleBadgeVariant,
  isActiveSabotageLite,
} from '../hooks/useLiteRoomPolling';

const WARN_SEC = 5 * 60;
const CRITICAL_SEC = 60;
const FALLBACK_DURATION_SEC = 20 * 60;
/** While `time_penalty` sabotage is active, competitor (and shared timer UI) shows this many fewer seconds — no Firestore writes. */
const TIME_PENALTY_SEC = 30;
const ROAST_TOAST_MS = 5000;
const HANGMAN_MAX_WRONG = 6;
const HANGMAN_FALLBACK_WORD = 'guacamole';

const LITE_SABOTAGE_PRESETS = {
  [LITE_SABOTAGE_TYPE.BLACKOUT]: {
    type: LITE_SABOTAGE_TYPE.BLACKOUT,
    label: 'Lights Out',
    description: 'Recipe card is hidden while this sabotage runs.',
    durationSec: 25,
  },
  [LITE_SABOTAGE_TYPE.TIME_PENALTY]: {
    type: LITE_SABOTAGE_TYPE.TIME_PENALTY,
    label: 'Time Crunch',
    description: `The kitchen timer shows ${TIME_PENALTY_SEC} fewer seconds while this sabotage is active.`,
    durationSec: 22,
  },
  [LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]: {
    type: LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT,
    label: 'Wild Card Ingredient',
    description:
      'Add one surprise ingredient: something pickled or briny (olives, capers, or pickles—chef picks one).',
    durationSec: 28,
  },
};

/** Read host-written `cookingStartedAt` from room (number ms or Firestore Timestamp). */
function liteCookingStartedToMs(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  }
  return null;
}

function normalizedWord(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim();
}

function deriveLiteHangmanWord(challenge, recipe) {
  const dishWords = String(recipe?.dishName || '')
    .split(/\s+/)
    .map(normalizedWord)
    .filter((w) => w.length >= 4);
  const ingredientWords = (Array.isArray(recipe?.ingredients) ? recipe.ingredients : [])
    .flatMap((x) => String(x || '').split(/\s+/))
    .map(normalizedWord)
    .filter((w) => w.length >= 4);
  const cuisineWords = String(challenge?.cuisineType || '')
    .split(/\s+/)
    .map(normalizedWord)
    .filter((w) => w.length >= 4);
  const candidates = [...dishWords, ...ingredientWords, ...cuisineWords];
  const chosen = candidates.find((w) => /^[a-z]+$/.test(w));
  return chosen || HANGMAN_FALLBACK_WORD;
}

export default function CookingLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const {
    room,
    submitDishLite,
    submitLiteRoast,
    awardLiteHangmanReward,
    placeLiteBet,
    setPhase,
    loading,
    error,
    triggerSabotageLite,
  } = useLiteRoomPolling(gameCode);
  const [dishName, setDishName] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(FALLBACK_DURATION_SEC);
  const [pendingSubmitDish, setPendingSubmitDish] = useState(false);
  const [pendingStartVoting, setPendingStartVoting] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const roomRef = useRef(room);

  const phase = room?.phase || 'cooking';
  const challenge = room?.challenge || null;
  const recipe = room?.recipeLite || null;

  const selfMeta = useMemo(() => {
    const list = Array.isArray(room?.players) ? room.players : [];
    return list.find((p) => p.id === playerId) || null;
  }, [room?.players, playerId]);

  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);
  const liteRoasts = useMemo(() => (Array.isArray(room?.liteRoasts) ? room.liteRoasts : []), [room?.liteRoasts]);

  const canSubmitDish = !selfMeta?.liteRole || selfMeta.liteRole === LITE_ROLE.COMPETITOR;
  const isCompetitorFlow = canSubmitDish;
  const isJudge = selfMeta?.liteRole === LITE_ROLE.JUDGE;
  const isSpectator = selfMeta?.liteRole === LITE_ROLE.SPECTATOR;

  const [pendingJudgeNav, setPendingJudgeNav] = useState(false);
  const [pendingSabotageKey, setPendingSabotageKey] = useState(null);
  const [pendingBet, setPendingBet] = useState(false);
  const [selectedBetTargetId, setSelectedBetTargetId] = useState(null);
  const [roastText, setRoastText] = useState('');
  const [pendingRoastSubmit, setPendingRoastSubmit] = useState(false);
  const [hangmanGuessed, setHangmanGuessed] = useState([]);
  const [hangmanSolvedLocal, setHangmanSolvedLocal] = useState(false);
  const [pendingHangmanReward, setPendingHangmanReward] = useState(false);
  const [activeRoastToast, setActiveRoastToast] = useState(null);
  const roastToastQueueRef = useRef([]);
  const roastToastTimerRef = useRef(null);
  const roastToastSeenRef = useRef(new Set());
  const roastToastInitRef = useRef(false);

  const roleBadgeLabel = useMemo(() => {
    const lr = getLiteRoleBadgeLabel(selfMeta?.liteRole);
    if (lr) return lr;
    const r = selfMeta?.role;
    if (r && String(r).trim() && String(r).toLowerCase() !== 'pending') {
      return String(r).toUpperCase();
    }
    return isHost ? 'HEAD CHEF' : 'LINE COOK';
  }, [selfMeta?.liteRole, selfMeta?.role, isHost]);

  const popNextRoastToast = useCallback(() => {
    const next = roastToastQueueRef.current.shift() || null;
    setActiveRoastToast(next);
  }, []);

  const timerMood = useMemo(() => {
    if (secondsLeft <= CRITICAL_SEC) return 'critical';
    if (secondsLeft <= WARN_SEC) return 'warn';
    return 'calm';
  }, [secondsLeft]);

  const timerColor = useMemo(() => {
    if (timerMood === 'critical') return PALETTE.red;
    if (timerMood === 'warn') return '#E85A3E';
    return PALETTE.espresso;
  }, [timerMood]);

  const heroGradient = useMemo(() => {
    if (timerMood === 'critical') return ['#FFD0D0', '#FFF5F5'];
    if (timerMood === 'warn') return ['#FFD4B8', '#FFF7E5'];
    return ['#FFE8B8', '#FFFBF0'];
  }, [timerMood]);

  const heroBorderColor = useMemo(() => {
    if (timerMood === 'critical') return PALETTE.red;
    if (timerMood === 'warn') return '#E85A3E';
    return PALETTE.creamEdge;
  }, [timerMood]);

  React.useEffect(() => {
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  React.useEffect(() => {
    if (!roastToastInitRef.current) {
      roastToastSeenRef.current = new Set(liteRoasts.map((r) => r.id));
      roastToastInitRef.current = true;
      return;
    }
    const additions = liteRoasts
      .filter((r) => r?.id && !roastToastSeenRef.current.has(r.id))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    if (additions.length === 0) return;
    additions.forEach((r) => roastToastSeenRef.current.add(r.id));
    roastToastQueueRef.current.push(...additions);
    if (!activeRoastToast) popNextRoastToast();
  }, [liteRoasts, activeRoastToast, popNextRoastToast]);

  React.useEffect(() => {
    if (!activeRoastToast) return;
    roastToastTimerRef.current = setTimeout(() => {
      setActiveRoastToast(null);
      popNextRoastToast();
    }, ROAST_TOAST_MS);
    return () => {
      if (roastToastTimerRef.current) clearTimeout(roastToastTimerRef.current);
    };
  }, [activeRoastToast, popNextRoastToast]);

  React.useEffect(() => {
    setHangmanGuessed([]);
    setHangmanSolvedLocal(false);
  }, [hangmanWord, room?.phase]);

  React.useEffect(() => {
    if (!isSpectator || !hangmanSolved || hangmanSolvedLocal || hangmanRewarded || pendingHangmanReward) return;
    let cancelled = false;
    setPendingHangmanReward(true);
    awardLiteHangmanReward(playerId)
      .then(() => {
        if (!cancelled) setHangmanSolvedLocal(true);
      })
      .finally(() => {
        if (!cancelled) setPendingHangmanReward(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    isSpectator,
    hangmanSolved,
    hangmanSolvedLocal,
    hangmanRewarded,
    pendingHangmanReward,
    awardLiteHangmanReward,
    playerId,
  ]);

  const computeSharedRemainingSec = React.useCallback(() => {
    const r = roomRef.current;
    const now = Date.now();
    const cookDurationSec =
      Number(r?.cookDurationSec) > 0 ? Math.floor(Number(r.cookDurationSec)) : FALLBACK_DURATION_SEC;
    const startedMs = liteCookingStartedToMs(r?.cookingStartedAt);
    const elapsedSec =
      startedMs != null ? Math.max(0, Math.floor((now - startedMs) / 1000)) : 0;
    return Math.max(0, cookDurationSec - elapsedSec);
  }, []);

  roomRef.current = room;

  const activeSabotage = room?.activeSabotageLite;
  const sabotageAlive = useMemo(
    () => isActiveSabotageLite(activeSabotage, Date.now()),
    [activeSabotage, secondsLeft]
  );

  const sabotageSponsorLine = useMemo(() => {
    if (!activeSabotage || !sabotageAlive) return null;
    const sid = activeSabotage.sponsoredByPlayerId;
    const who = players.find((p) => p.id === sid);
    const name = who?.name || 'Kitchen';
    const roleTag = (activeSabotage.sponsoredByRole || '').toUpperCase() || 'GUEST';
    return `${name} (${roleTag})`;
  }, [activeSabotage, sabotageAlive, players]);

  const myPoints = useMemo(() => {
    const map = room?.litePoints || {};
    const raw = map[playerId];
    if (raw == null && (isJudge || isSpectator)) return 100;
    return Math.max(0, Math.floor(Number(raw) || 0));
  }, [room?.litePoints, playerId, isJudge, isSpectator]);

  const competitors = useMemo(
    () => players.filter((p) => !p?.liteRole || p.liteRole === LITE_ROLE.COMPETITOR),
    [players]
  );
  const ownRoast = useMemo(() => liteRoasts.find((r) => r.playerId === playerId) || null, [liteRoasts, playerId]);
  const myBet = useMemo(() => (room?.liteBets || {})[playerId] || null, [room?.liteBets, playerId]);
  const myBetTarget = useMemo(
    () => competitors.find((p) => p.id === myBet?.targetPlayerId) || null,
    [competitors, myBet?.targetPlayerId]
  );

  const playerPenaltySec = useMemo(() => {
    const map = room?.litePenaltySecByPlayer || {};
    return Math.max(0, Math.floor(Number(map[playerId]) || 0));
  }, [room?.litePenaltySecByPlayer, playerId]);

  const hangmanWord = useMemo(() => deriveLiteHangmanWord(challenge, recipe), [challenge, recipe]);
  const hangmanRewarded = Boolean((room?.liteHangmanRewards || {})[playerId]);
  const guessedSet = useMemo(() => new Set(hangmanGuessed), [hangmanGuessed]);
  const hangmanMasked = useMemo(
    () =>
      hangmanWord
        .split('')
        .map((c) => (guessedSet.has(c) ? c.toUpperCase() : '_'))
        .join(' '),
    [hangmanWord, guessedSet]
  );
  const hangmanWrong = useMemo(
    () => hangmanGuessed.filter((c) => !hangmanWord.includes(c)).length,
    [hangmanGuessed, hangmanWord]
  );
  const hangmanAttemptsLeft = Math.max(0, HANGMAN_MAX_WRONG - hangmanWrong);
  const hangmanSolved = useMemo(
    () => hangmanWord.split('').every((c) => guessedSet.has(c)),
    [hangmanWord, guessedSet]
  );

  React.useEffect(() => {
    const base = computeSharedRemainingSec();
    setSecondsLeft(Math.max(0, base - playerPenaltySec));
  }, [
    room?.cookingStartedAt,
    room?.cookDurationSec,
    room?.activeSabotageLite,
    room?.litePenaltySecByPlayer,
    computeSharedRemainingSec,
    playerPenaltySec,
  ]);

  React.useEffect(() => {
    const id = setInterval(() => {
      const base = computeSharedRemainingSec();
      setSecondsLeft(Math.max(0, base - playerPenaltySec));
    }, 1000);
    return () => clearInterval(id);
  }, [computeSharedRemainingSec, gameCode, playerPenaltySec]);

  const timerText = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const timerHint = useMemo(() => {
    if (!isCompetitorFlow) return null;
    if (secondsLeft <= CRITICAL_SEC) return 'FINISH STRONG — time almost up!';
    if (secondsLeft <= WARN_SEC) return 'Pick up the pace — under 5 min left';
    return null;
  }, [secondsLeft, isCompetitorFlow]);

  const isAiChallenge = Boolean(challenge?.challengeTitle);
  const maxIngredients = isAiChallenge ? 14 : 6;
  const maxSteps = isAiChallenge ? 10 : 5;

  const submitDish = async () => {
    if (!playerId || pendingSubmitDish) return;
    setPendingSubmitDish(true);
    try {
      await submitDishLite(playerId, dishName.trim() || `${playerName}'s Dish`, photoUri);
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingSubmitDish(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const hostStartVoting = async () => {
    if (!isHost || pendingStartVoting) return;
    setPendingStartVoting(true);
    try {
      await setPhase('voting');
    } finally {
      setPendingStartVoting(false);
    }
  };

  const goToJudgesTable = () => {
    if (pendingJudgeNav) return;
    setPendingJudgeNav(true);
    try {
      navigation.navigate('VotingLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingJudgeNav(false);
    }
  };

  const sabotageButtonsLocked = sabotageAlive || loading || Boolean(pendingSabotageKey);

  const onSabotagePress = async (presetKey) => {
    if (!playerId || sabotageButtonsLocked) return;
    const preset = LITE_SABOTAGE_PRESETS[presetKey];
    if (!preset) return;
    setPendingSabotageKey(presetKey);
    try {
      await triggerSabotageLite({
        playerId,
        type: preset.type,
        label: preset.label,
        description: preset.description,
        durationSec: preset.durationSec,
      });
    } finally {
      setPendingSabotageKey(null);
    }
  };

  const placeBet = async () => {
    if (!isSpectator || !selectedBetTargetId || myBet || pendingBet || loading) return;
    setPendingBet(true);
    try {
      await placeLiteBet({ bettorId: playerId, targetPlayerId: selectedBetTargetId, stake: LITE_BET_STAKE });
    } finally {
      setPendingBet(false);
    }
  };

  const submitRoast = async () => {
    if (!(isJudge || isSpectator) || ownRoast || pendingRoastSubmit) return;
    const text = roastText.trim();
    if (!text) return;
    setPendingRoastSubmit(true);
    try {
      await submitLiteRoast(playerId, playerName, selfMeta?.liteRole || 'guest', text);
      setRoastText('');
    } finally {
      setPendingRoastSubmit(false);
    }
  };

  const guessHangmanLetter = (letter) => {
    if (!isSpectator || !letter) return;
    if (hangmanSolved || hangmanAttemptsLeft <= 0) return;
    setHangmanGuessed((prev) => (prev.includes(letter) ? prev : [...prev, letter]));
  };

  const hideRecipeForCompetitorBlackout =
    isCompetitorFlow &&
    sabotageAlive &&
    activeSabotage?.type === LITE_SABOTAGE_TYPE.BLACKOUT;

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <LiteScreenTitle style={styles.heroTitle}>Cook Off 🔥</LiteScreenTitle>
          <View style={styles.roleRow}>
            <LiteBadge
              label={roleBadgeLabel}
              variant={
                selfMeta?.liteRole ? getLiteRoleBadgeVariant(selfMeta.liteRole) : isHost ? 'host' : 'default'
              }
            />
            <Text style={styles.playerTag}>{playerName}</Text>
          </View>
        </View>
        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}

        <View style={[styles.heroTimerShell, { borderColor: heroBorderColor }]}>
          <LinearGradient colors={heroGradient} style={styles.heroTimerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.timerEyebrow}>Kitchen Timer</Text>
            <Text style={[styles.timerHero, { color: timerColor }]}>{timerText}</Text>
            {timerHint ? <Text style={styles.timerHint}>{timerHint}</Text> : null}
          </LinearGradient>
        </View>

        {challenge ? (
          <View style={styles.challengePillRow}>
            <View style={styles.challengePill}>
              <Text style={styles.challengePillText}>{challenge.cuisineType}</Text>
            </View>
            <View style={styles.challengePill}>
              <Text style={styles.challengePillText}>${challenge.budget}</Text>
            </View>
            <View style={styles.challengePill}>
              <Text style={styles.challengePillText}>{challenge.skillLevel}</Text>
            </View>
            <View style={styles.challengePillMuted}>
              <Text style={styles.challengePillMutedText}>{challenge.cookTimeTarget ?? 20} min</Text>
            </View>
          </View>
        ) : null}

        {(challenge?.challengeTitle || challenge?.shortDescription) ? (
          <View style={styles.aiChallengeBanner}>
            {challenge?.demoModeLite ? (
              <View style={styles.demoModeTag}>
                <LiteBadge label="PRESENTATION MODE" variant="host" />
              </View>
            ) : null}
            {challenge.challengeTitle ? (
              <Text style={styles.challengeTitleDisplay}>{challenge.challengeTitle}</Text>
            ) : null}
            {challenge.shortDescription ? (
              <LiteCardBody style={styles.challengeDescription}>{challenge.shortDescription}</LiteCardBody>
            ) : null}
          </View>
        ) : null}

        {players.length > 0 ? (
          <LiteSectionCard title="Kitchen crew" style={styles.crewCard}>
            {players.map((p) => {
              const rl = getLiteRoleBadgeLabel(p.liteRole);
              const right =
                rl || p.isHost ? (
                  <View style={styles.crewBadges}>
                    {rl ? <LiteBadge label={rl} variant={getLiteRoleBadgeVariant(p.liteRole)} /> : null}
                    {p.isHost ? <LiteBadge label="HOST" variant="host" /> : null}
                  </View>
                ) : null;
              return <LitePlayerCard key={p.id} name={p.name} right={right} style={styles.crewRow} />;
            })}
          </LiteSectionCard>
        ) : null}

        {isCompetitorFlow && sabotageAlive && activeSabotage ? (
          <View style={styles.sabotageBanner} accessibilityRole="alert">
            <Text style={styles.sabotageBannerTitle}>{activeSabotage.label || 'Sabotage'}</Text>
            <Text style={styles.sabotageBannerBody}>
              {activeSabotage.type === LITE_SABOTAGE_TYPE.BLACKOUT
                ? 'The recipe card is hidden temporarily — stay sharp from memory!'
                : activeSabotage.type === LITE_SABOTAGE_TYPE.TIME_PENALTY
                ? activeSabotage.description ||
                  `The shared timer shows ${TIME_PENALTY_SEC} fewer seconds while this sabotage is active.`
                : activeSabotage.description || 'A mystery twist is in play for this round.'}
            </Text>
            {sabotageSponsorLine ? (
              <LiteMutedText style={styles.sabotageByLine}>Triggered by {sabotageSponsorLine}</LiteMutedText>
            ) : null}
          </View>
        ) : null}

        {(isJudge || isSpectator) ? (
          <LiteSectionCard title="Points" style={styles.pointsCard}>
            <LiteCardBody style={styles.pointsText}>Current points: {myPoints}</LiteCardBody>
          </LiteSectionCard>
        ) : null}

        {hideRecipeForCompetitorBlackout ? null : (
          <LiteSectionCard style={styles.recipeCard}>
            <View style={styles.recipeInner}>
              {recipe ? (
                <>
                  <LiteCardHeading style={styles.recipeDishTitle}>{recipe.dishName || 'Chef Special'}</LiteCardHeading>
                  <LiteCardBody style={styles.recipeMeta}>
                    Estimated cook time: {recipe.cookTime || challenge?.cookTimeTarget || 20} min
                  </LiteCardBody>
                  <LiteSectionHeading style={styles.recipeSectionHeading}>Ingredients</LiteSectionHeading>
                  {(Array.isArray(recipe.ingredients) ? recipe.ingredients : []).slice(0, maxIngredients).map((item, idx) => (
                    <LiteCardBody key={`${item}-${idx}`} style={styles.recipeLine}>{`\u2022 ${item}`}</LiteCardBody>
                  ))}
                  <LiteSectionHeading style={styles.recipeSectionHeading}>Steps</LiteSectionHeading>
                  {(Array.isArray(recipe.steps) ? recipe.steps : []).slice(0, maxSteps).map((step, idx) => (
                    <LiteCardBody key={`step-${idx}`} style={styles.recipeStep}>{`${idx + 1}. ${step}`}</LiteCardBody>
                  ))}
                </>
              ) : (
                <>
                  <LiteCardHeading style={styles.recipeDishTitle}>Recipe loading...</LiteCardHeading>
                  <LiteCardBody style={styles.recipeLine}>Cuisine: {challenge?.cuisineType || 'Chef Special'}</LiteCardBody>
                  <LiteCardBody style={styles.recipeLine}>Budget: ${challenge?.budget ?? 20}</LiteCardBody>
                  <LiteCardBody style={styles.recipeLine}>Skill: {challenge?.skillLevel || 'Beginner'}</LiteCardBody>
                  <LiteCardBody style={styles.recipeLine}>Target time: {challenge?.cookTimeTarget ?? 20} min</LiteCardBody>
                </>
              )}
            </View>
          </LiteSectionCard>
        )}

        {isCompetitorFlow ? (
          <>
            <LiteSectionCard title="Dish Photo">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={LITE_GAME_STYLES.mediaPreview} />
              ) : (
                <LiteCardBody>No photo selected yet.</LiteCardBody>
              )}
              <LitePrimaryButton onPress={takePhoto} disabled={pendingSubmitDish || !canSubmitDish}>
                Take Photo
              </LitePrimaryButton>
              <LiteSecondaryButton onPress={chooseFromLibrary} disabled={pendingSubmitDish || !canSubmitDish}>
                Choose from Library
              </LiteSecondaryButton>
            </LiteSectionCard>

            <View style={styles.dishNameBlock}>
              <Text style={styles.dishNameLabel}>Name your masterpiece</Text>
              <TextInput
                style={liteInputStyle}
                value={dishName}
                onChangeText={setDishName}
                placeholder="Dish name"
                placeholderTextColor={LITE_THEME.text + '88'}
                editable={canSubmitDish}
              />
            </View>

            <View style={styles.submitZone}>
              <Text style={styles.submitKicker}>Ready for the judges?</Text>
              <LitePrimaryButton
                onPress={submitDish}
                disabled={pendingSubmitDish || loading || !canSubmitDish}
              >
                {pendingSubmitDish ? 'Submitting...' : 'SUBMIT DISH'}
              </LitePrimaryButton>
            </View>
          </>
        ) : isJudge ? (
          <LiteSectionCard title="Judge's Table" style={styles.rolePanelCard}>
            <LiteCardBody style={styles.rolePanelCopy}>
              Review the challenge, then move to the judging screen when ready.
            </LiteCardBody>
            <LiteCardBody style={styles.pointsUsageCopy}>Points: {myPoints}</LiteCardBody>
            <LiteSectionHeading style={styles.sabotagePanelHeading}>Trigger a sabotage</LiteSectionHeading>
            {sabotageAlive && activeSabotage && sabotageSponsorLine ? (
              <LiteMutedText style={styles.activeSabotageLine}>
                Active: {activeSabotage.label} — by {sabotageSponsorLine}
              </LiteMutedText>
            ) : (
              <LiteMutedText style={styles.sabotagePanelHint}>Nothing live right now. Pick one below.</LiteMutedText>
            )}
            <LiteSecondaryButton
              onPress={() => onSabotagePress(LITE_SABOTAGE_TYPE.BLACKOUT)}
              disabled={sabotageButtonsLocked || myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT]}
            >
              {pendingSabotageKey === LITE_SABOTAGE_TYPE.BLACKOUT
                ? 'Sending...'
                : `${LITE_SABOTAGE_PRESETS[LITE_SABOTAGE_TYPE.BLACKOUT].label} (-${LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT]})`}
            </LiteSecondaryButton>
            {myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT] ? (
              <LiteMutedText style={styles.needPointsText}>
                Need {LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT]} points
              </LiteMutedText>
            ) : null}
            <LiteSecondaryButton
              onPress={() => onSabotagePress(LITE_SABOTAGE_TYPE.TIME_PENALTY)}
              disabled={sabotageButtonsLocked || myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY]}
            >
              {pendingSabotageKey === LITE_SABOTAGE_TYPE.TIME_PENALTY
                ? 'Sending...'
                : `${LITE_SABOTAGE_PRESETS[LITE_SABOTAGE_TYPE.TIME_PENALTY].label} (-${LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY]})`}
            </LiteSecondaryButton>
            {myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY] ? (
              <LiteMutedText style={styles.needPointsText}>
                Need {LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY]} points
              </LiteMutedText>
            ) : null}
            <LiteSecondaryButton
              onPress={() => onSabotagePress(LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT)}
              disabled={sabotageButtonsLocked || myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]}
            >
              {pendingSabotageKey === LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT
                ? 'Sending...'
                : `${LITE_SABOTAGE_PRESETS[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT].label} (-${LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]})`}
            </LiteSecondaryButton>
            {myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT] ? (
              <LiteMutedText style={styles.needPointsText}>
                Need {LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]} points
              </LiteMutedText>
            ) : null}
            <LitePrimaryButton onPress={goToJudgesTable} disabled={pendingJudgeNav || loading}>
              {pendingJudgeNav ? 'Opening...' : "Go to Judge's Table"}
            </LitePrimaryButton>
          </LiteSectionCard>
        ) : isSpectator ? (
          <LiteSectionCard title="In the Stands" style={styles.rolePanelCard}>
            <LiteCardBody style={styles.rolePanelCopy}>
              You're spectating this round — enjoy the show from here. Voting opens when the host moves the room
              forward.
            </LiteCardBody>
            <LiteCardBody style={styles.pointsUsageCopy}>Points: {myPoints}</LiteCardBody>
            {myBet ? (
              <LiteMutedText style={styles.betInfo}>
                Bet placed: {myBetTarget?.name || 'Competitor'} ({myBet.stake} pts)
              </LiteMutedText>
            ) : (
              <>
                <LiteSectionHeading style={styles.sabotagePanelHeading}>Place your bet</LiteSectionHeading>
                <LiteCardBody style={styles.rolePanelCopy}>Stake: {LITE_BET_STAKE} points (one bet per round)</LiteCardBody>
                <View style={styles.betTargetsRow}>
                  {competitors.map((p) => (
                    <Text
                      key={`bet-${p.id}`}
                      style={[
                        styles.betTargetChip,
                        selectedBetTargetId === p.id && styles.betTargetChipSelected,
                      ]}
                      onPress={() => setSelectedBetTargetId(p.id)}
                    >
                      {p.name}
                    </Text>
                  ))}
                </View>
                <LiteSecondaryButton
                  onPress={placeBet}
                  disabled={pendingBet || !selectedBetTargetId || myPoints < LITE_BET_STAKE}
                >
                  {pendingBet ? 'Placing...' : `Place Bet (-${LITE_BET_STAKE})`}
                </LiteSecondaryButton>
                {myPoints < LITE_BET_STAKE ? (
                  <LiteMutedText style={styles.needPointsText}>Need {LITE_BET_STAKE} points</LiteMutedText>
                ) : null}
              </>
            )}
            <LiteSectionHeading style={styles.sabotagePanelHeading}>Spectator Hangman</LiteSectionHeading>
            <LiteCardBody style={styles.hangmanHint}>
              Solve the word for +{LITE_HANGMAN_WIN_BONUS} points. One reward per round.
            </LiteCardBody>
            <View style={styles.hangmanWordWrap}>
              <Text style={styles.hangmanWordText}>{hangmanMasked}</Text>
            </View>
            <LiteCardBody style={styles.hangmanMeta}>
              Attempts left: {hangmanAttemptsLeft} • Guessed: {hangmanGuessed.join(', ').toUpperCase() || 'None'}
            </LiteCardBody>
            <View style={styles.hangmanLettersGrid}>
              {'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => {
                const used = guessedSet.has(letter);
                return (
                  <Text
                    key={`hang-${letter}`}
                    style={[
                      styles.hangmanLetterChip,
                      used && styles.hangmanLetterUsed,
                      !used && hangmanAttemptsLeft > 0 && !hangmanSolved && styles.hangmanLetterActive,
                    ]}
                    onPress={() => guessHangmanLetter(letter)}
                  >
                    {letter.toUpperCase()}
                  </Text>
                );
              })}
            </View>
            {hangmanSolved ? (
              <LiteMutedText style={styles.hangmanStatus}>
                {hangmanRewarded || hangmanSolvedLocal
                  ? `Solved! +${LITE_HANGMAN_WIN_BONUS} points awarded.`
                  : 'Solved! Awarding points...'}
              </LiteMutedText>
            ) : hangmanAttemptsLeft <= 0 ? (
              <LiteMutedText style={styles.hangmanStatus}>
                Out of attempts. Word: {hangmanWord.toUpperCase()}
              </LiteMutedText>
            ) : null}
            <LiteSectionHeading style={styles.sabotagePanelHeading}>Sponsor a sabotage</LiteSectionHeading>
            {sabotageAlive && activeSabotage && sabotageSponsorLine ? (
              <LiteMutedText style={styles.activeSabotageLine}>
                Active: {activeSabotage.label} — by {sabotageSponsorLine}
              </LiteMutedText>
            ) : (
              <LiteMutedText style={styles.sabotagePanelHint}>Back the kitchen chaos—one sabotage at a time.</LiteMutedText>
            )}
            <LiteSecondaryButton
              onPress={() => onSabotagePress(LITE_SABOTAGE_TYPE.BLACKOUT)}
              disabled={sabotageButtonsLocked || myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT]}
            >
              {pendingSabotageKey === LITE_SABOTAGE_TYPE.BLACKOUT
                ? 'Sending...'
                : `${LITE_SABOTAGE_PRESETS[LITE_SABOTAGE_TYPE.BLACKOUT].label} (-${LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT]})`}
            </LiteSecondaryButton>
            <LiteSecondaryButton
              onPress={() => onSabotagePress(LITE_SABOTAGE_TYPE.TIME_PENALTY)}
              disabled={sabotageButtonsLocked || myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY]}
            >
              {pendingSabotageKey === LITE_SABOTAGE_TYPE.TIME_PENALTY
                ? 'Sending...'
                : `${LITE_SABOTAGE_PRESETS[LITE_SABOTAGE_TYPE.TIME_PENALTY].label} (-${LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY]})`}
            </LiteSecondaryButton>
            <LiteSecondaryButton
              onPress={() => onSabotagePress(LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT)}
              disabled={sabotageButtonsLocked || myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]}
            >
              {pendingSabotageKey === LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT
                ? 'Sending...'
                : `${LITE_SABOTAGE_PRESETS[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT].label} (-${LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT]})`}
            </LiteSecondaryButton>
            {myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT] ||
            myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY] ||
            myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT] ? (
              <LiteMutedText style={styles.needPointsText}>Need more points for higher-cost sabotages.</LiteMutedText>
            ) : null}
          </LiteSectionCard>
        ) : null}

        {(isJudge || isSpectator) ? (
          <LiteSectionCard title="Roast Arena" style={styles.roastComposerCard}>
            {ownRoast ? (
              <LiteCardBody style={styles.roastLockedCopy}>Your roast is locked in: "{ownRoast.text}"</LiteCardBody>
            ) : (
              <>
                <TextInput
                  style={liteInputStyle}
                  value={roastText}
                  onChangeText={setRoastText}
                  placeholder="Drop a quick burn..."
                  placeholderTextColor={LITE_THEME.text + '88'}
                  maxLength={180}
                />
                <LiteSecondaryButton
                  onPress={submitRoast}
                  disabled={pendingRoastSubmit || roastText.trim().length === 0}
                >
                  {pendingRoastSubmit ? 'Submitting Roast...' : 'Submit Roast'}
                </LiteSecondaryButton>
              </>
            )}
          </LiteSectionCard>
        ) : null}

        {isHost && (
          <LiteSecondaryButton onPress={hostStartVoting} disabled={pendingStartVoting || loading}>
            {pendingStartVoting ? 'Starting...' : 'Host: Start Voting'}
          </LiteSecondaryButton>
        )}
      </ScrollView>
      {activeRoastToast ? (
        <View pointerEvents="none" style={styles.roastToastWrap}>
          <View style={styles.roastToast}>
            <Text style={styles.roastToastKicker}>Roast Drop 🔥</Text>
            <Text style={styles.roastToastText} numberOfLines={3}>
              "{activeRoastToast.text}"
            </Text>
            <Text style={styles.roastToastMeta}>
              {activeRoastToast.playerName} • {String(activeRoastToast.role || '').toUpperCase()}
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LITE_THEME.screenBg },
  scroll: { flex: 1 },
  scrollContent: {
    padding: LITE_THEME.contentPadding,
    paddingTop: LITE_THEME.contentPaddingTop - 8,
    paddingBottom: LITE_THEME.contentPaddingBottom + 12,
  },
  titleBlock: { marginBottom: 8 },
  heroTitle: { marginBottom: 4, textAlign: 'left' },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  playerTag: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
  },
  heroTimerShell: {
    borderRadius: 22,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTimerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timerEyebrow: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timerHero: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: 2,
  },
  timerHint: {
    marginTop: 8,
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    textAlign: 'center',
  },
  challengePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  aiChallengeBanner: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  demoModeTag: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  challengeTitleDisplay: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: PALETTE.red,
    marginBottom: 8,
    lineHeight: 28,
  },
  challengeDescription: {
    lineHeight: 22,
  },
  challengePill: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  challengePillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
  },
  challengePillMuted: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  challengePillMutedText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: PALETTE.ink,
  },
  recipeCard: {
    marginBottom: 14,
  },
  recipeInner: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  recipeDishTitle: {
    marginBottom: 8,
    fontSize: 20,
  },
  recipeMeta: {
    marginBottom: 14,
    lineHeight: 22,
  },
  recipeSectionHeading: {
    marginTop: 4,
    marginBottom: 8,
  },
  recipeLine: {
    marginBottom: 6,
    lineHeight: 21,
  },
  recipeStep: {
    marginBottom: 12,
    lineHeight: 22,
  },
  dishNameBlock: {
    marginBottom: 8,
  },
  dishNameLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.red,
    marginBottom: 6,
  },
  submitZone: {
    marginTop: 6,
    marginBottom: 10,
  },
  submitKicker: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 15,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  crewCard: { marginBottom: 12 },
  crewRow: { marginBottom: 6 },
  crewBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  pointsCard: { marginBottom: 12 },
  pointsText: { fontFamily: 'Fredoka_700Bold' },
  rolePanelCard: { marginBottom: 12 },
  rolePanelCopy: { marginBottom: 12, lineHeight: 22 },
  pointsUsageCopy: { marginBottom: 8, fontFamily: 'Fredoka_700Bold' },
  needPointsText: { marginTop: 6, marginBottom: 8 },
  betInfo: { marginBottom: 10 },
  betTargetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  betTargetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    backgroundColor: LITE_THEME.cardInner,
    fontFamily: 'Fredoka_700Bold',
    color: LITE_THEME.text,
  },
  betTargetChipSelected: {
    borderColor: PALETTE.espresso,
    backgroundColor: LITE_THEME.primaryAction,
  },
  hangmanHint: { marginBottom: 8 },
  hangmanWordWrap: {
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 12,
    backgroundColor: LITE_THEME.cardInner,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  hangmanWordText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 19,
    letterSpacing: 2,
    color: LITE_THEME.textInk,
    textAlign: 'center',
  },
  hangmanMeta: { marginBottom: 8, fontSize: 12 },
  hangmanLettersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  hangmanLetterChip: {
    minWidth: 30,
    textAlign: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    backgroundColor: '#FFF4DA',
    color: LITE_THEME.text,
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
  },
  hangmanLetterActive: {
    borderColor: PALETTE.espresso,
  },
  hangmanLetterUsed: {
    opacity: 0.45,
  },
  hangmanStatus: { marginBottom: 10, fontFamily: 'Fredoka_700Bold' },
  sabotageBanner: {
    backgroundColor: PALETTE.ink,
    borderWidth: 3,
    borderColor: PALETTE.red,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  sabotageBannerTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 17,
    color: '#FFF5E6',
    marginBottom: 6,
  },
  sabotageBannerBody: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: '#FFE8B8',
    lineHeight: 21,
  },
  sabotageByLine: { marginTop: 8, color: '#FFF5E6' },
  sabotagePanelHeading: { marginTop: 4, marginBottom: 6 },
  sabotagePanelHint: { marginBottom: 10 },
  activeSabotageLine: { marginBottom: 10, fontFamily: 'Fredoka_600SemiBold' },
  roastComposerCard: { marginBottom: 12 },
  roastLockedCopy: { marginBottom: 6 },
  roastToastWrap: {
    position: 'absolute',
    top: 86,
    left: 14,
    right: 14,
    zIndex: 30,
    alignItems: 'center',
  },
  roastToast: {
    width: '100%',
    backgroundColor: PALETTE.ink,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: LITE_THEME.primaryAction,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roastToastKicker: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.primaryAction,
    marginBottom: 4,
  },
  roastToastText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: '#FFF5E6',
    marginBottom: 4,
  },
  roastToastMeta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: '#FFDFAF',
  },
});
