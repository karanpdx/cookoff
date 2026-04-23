import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, Image, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  CloudBg,
  LITE_THEME,
  LiteTopBar,
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

function toSharedDataUri(asset) {
  const base64 = String(asset?.base64 || '').trim();
  if (!base64) return null;
  const ext = String(asset?.fileName || '')
    .split('.')
    .pop()
    .toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

function hasLiteSubmittedDish(player) {
  if (!player) return false;
  const dish = String(player?.dishName || '').trim();
  const photo = String(player?.photoUri || player?.photoURL || '').trim();
  return Boolean(dish) || Boolean(photo);
}

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
  const [photoBase64, setPhotoBase64] = useState(null);
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
  const judges = useMemo(() => players.filter((p) => p?.liteRole === 'judge'), [players]);
  const submittedCompetitorDishes = useMemo(
    () => players.filter((p) => (!p?.liteRole || p.liteRole === 'competitor') && hasLiteSubmittedDish(p)),
    [players]
  );
  const submittedCompetitorCount = submittedCompetitorDishes.length;
  const liteScores = room?.liteScores || {};
  const judgingComplete = useMemo(
    () =>
      submittedCompetitorDishes.every((target) =>
        judges.every((judge) => {
          const n = Number(liteScores?.[target.id]?.[judge.id]);
          return Number.isInteger(n) && n >= 1 && n <= 10;
        })
      ),
    [submittedCompetitorDishes, judges, liteScores]
  );

  const canSubmitDish = !selfMeta?.liteRole || selfMeta.liteRole === LITE_ROLE.COMPETITOR;
  const isCompetitorFlow = canSubmitDish;
  const isJudge = selfMeta?.liteRole === LITE_ROLE.JUDGE;
  const isSpectator = selfMeta?.liteRole === LITE_ROLE.SPECTATOR;
  const hasSubmittedOwnDish = isCompetitorFlow && hasLiteSubmittedDish(selfMeta);

  const [pendingJudgeNav, setPendingJudgeNav] = useState(false);
  const [pendingSpectatorNav, setPendingSpectatorNav] = useState(false);
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
  const roastToastMountedAtRef = useRef(Date.now());

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
    if (phase === 'setup') {
      navigation.replace('SetupLite', { gameCode, playerName, playerId, isHost });
    }
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  const recoverByPhase = React.useCallback(() => {
    if (phase === 'cooking') return;
    if (phase === 'setup') {
      navigation.replace('SetupLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  const handleSafeBack = React.useCallback(() => {
    if (selfMeta?.liteRole === LITE_ROLE.JUDGE && phase === 'voting' && !judgingComplete) {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    recoverByPhase();
  }, [selfMeta?.liteRole, phase, judgingComplete, navigation, gameCode, playerName, playerId, isHost, recoverByPhase]);

  React.useEffect(() => {
    const additions = [];
    [...liteRoasts]
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .forEach((r) => {
        if (!r?.id || roastToastSeenRef.current.has(r.id)) return;
        roastToastSeenRef.current.add(r.id);
        if (Number(r.createdAt || 0) >= roastToastMountedAtRef.current) {
          additions.push(r);
        }
      });
    if (additions.length === 0) return;
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
    return () => {
      roastToastQueueRef.current = [];
      roastToastSeenRef.current = new Set();
      setActiveRoastToast(null);
      if (roastToastTimerRef.current) {
        clearTimeout(roastToastTimerRef.current);
      }
    };
  }, []);

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
    if (!playerId || pendingSubmitDish || hasSubmittedOwnDish) return;
    setPendingSubmitDish(true);
    try {
      await submitDishLite(
        playerId,
        dishName.trim() || `${playerName}'s Dish`,
        photoUri,
        photoBase64
      );
    } finally {
      setPendingSubmitDish(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const sharedDataUri = toSharedDataUri(asset);
      setPhotoUri(sharedDataUri || asset.uri || null);
      setPhotoBase64(String(asset.base64 || '').trim() || null);
    }
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const sharedDataUri = toSharedDataUri(asset);
      setPhotoUri(sharedDataUri || asset.uri || null);
      setPhotoBase64(String(asset.base64 || '').trim() || null);
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
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingJudgeNav(false);
    }
  };

  const goToVotingLite = () => {
    if (pendingSpectatorNav) return;
    setPendingSpectatorNav(true);
    try {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingSpectatorNav(false);
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
        {/* Top bar with role badge */}
        <LiteTopBar
          title="Cook Off"
          showBack={Boolean(navigation?.canGoBack?.())}
          onBack={handleSafeBack}
          right={
            <LiteBadge
              label={roleBadgeLabel}
              variant={
                selfMeta?.liteRole ? getLiteRoleBadgeVariant(selfMeta.liteRole) : isHost ? 'host' : 'default'
              }
            />
          }
        />

        {/* Player name row — points shown inline for judge/spectator */}
        <View style={styles.playerNameRow}>
          <Text style={styles.playerNameTag}>{playerName}</Text>
          {(isJudge || isSpectator) ? (
            <View style={styles.myPointsPill}>
              <Text style={styles.myPointsText}>🪙 {myPoints} pts</Text>
            </View>
          ) : null}
        </View>

        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}

        {/* ── Timer hero ── */}
        <View style={styles.heroTimerOuter}>
          <View style={styles.heroTimerShadow} />
          <View style={[styles.heroTimerShell, { borderColor: heroBorderColor }]}>
            <LinearGradient colors={heroGradient} style={styles.heroTimerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.timerEyebrow}>⏱  KITCHEN TIMER</Text>
              <Text style={[styles.timerHero, { color: timerColor }]}>{timerText}</Text>
              {timerHint ? <Text style={[styles.timerHint, { color: timerColor }]}>{timerHint}</Text> : null}
            </LinearGradient>
          </View>
        </View>

        {/* Challenge pills */}
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

        {/* AI challenge title banner */}
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

        {/* Kitchen crew */}
        {players.length > 0 ? (
          <LiteSectionCard title="Kitchen Crew" style={styles.crewCard}>
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

        {/* Sabotage alert (competitor view) */}
        {isCompetitorFlow && sabotageAlive && activeSabotage ? (
          <View style={styles.sabotageBanner} accessibilityRole="alert">
            <Text style={styles.sabotageBannerTitle}>⚡  {activeSabotage.label || 'Sabotage'}</Text>
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

        {/* Recipe card */}
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

        {/* ── COMPETITOR FLOW ── */}
        {isCompetitorFlow ? (
          <>
            {/* Dish photo card */}
            <LiteSectionCard title="📸  Dish Photo" style={styles.dishPhotoCard}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.dishPhotoPreview} />
              ) : (
                <View style={styles.dishPhotoPlaceholder}>
                  <Text style={styles.dishPhotoPlaceholderEmoji}>📷</Text>
                  <Text style={styles.dishPhotoPlaceholderText}>Snap your masterpiece</Text>
                </View>
              )}
              {!hasSubmittedOwnDish && (
                <View style={styles.photoButtonRow}>
                  <View style={styles.photoButtonHalf}>
                    <LitePrimaryButton onPress={takePhoto} disabled={pendingSubmitDish || !canSubmitDish}>
                      Take Photo
                    </LitePrimaryButton>
                  </View>
                  <View style={styles.photoButtonHalf}>
                    <LiteSecondaryButton onPress={chooseFromLibrary} disabled={pendingSubmitDish || !canSubmitDish}>
                      Library
                    </LiteSecondaryButton>
                  </View>
                </View>
              )}
            </LiteSectionCard>

            {/* Dish name + submit */}
            {hasSubmittedOwnDish ? (
              <View style={styles.submittedBlock}>
                <View style={styles.submittedShadow} />
                <View style={styles.submittedCard}>
                  <Text style={styles.submittedEmoji}>✅</Text>
                  <Text style={styles.submittedTitle}>Dish Submitted!</Text>
                  <Text style={styles.submittedHint}>Hanging tight for the judges to roll in.</Text>
                </View>
              </View>
            ) : (
              <LiteSectionCard title="Name Your Masterpiece" style={styles.dishNameCard}>
                <TextInput
                  style={liteInputStyle}
                  value={dishName}
                  onChangeText={setDishName}
                  placeholder="What's this dish called?"
                  placeholderTextColor={LITE_THEME.text + '88'}
                  editable={canSubmitDish && !hasSubmittedOwnDish}
                />
                <View style={styles.submitZone}>
                  <Text style={styles.submitKicker}>Ready for the judges?</Text>
                  <LitePrimaryButton
                    onPress={submitDish}
                    disabled={pendingSubmitDish || loading || !canSubmitDish}
                  >
                    {pendingSubmitDish ? 'Submitting...' : 'SUBMIT DISH'}
                  </LitePrimaryButton>
                </View>
              </LiteSectionCard>
            )}
          </>
        ) : isJudge ? (
          /* ── JUDGE FLOW ── */
          <LiteSectionCard title="⚖️  Judge's Panel" style={styles.rolePanelCard}>
            <LiteCardBody style={styles.rolePanelCopy}>
              Review the challenge, then head to the judging screen when ready.
            </LiteCardBody>

            {/* Sabotage section */}
            <View style={styles.panelSectionDivider}>
              <Text style={styles.panelSectionLabel}>⚡  SABOTAGE</Text>
            </View>
            {sabotageAlive && activeSabotage && sabotageSponsorLine ? (
              <View style={styles.activeSabotageAlert}>
                <Text style={styles.activeSabotageText}>
                  🔴  Active: {activeSabotage.label} — by {sabotageSponsorLine}
                </Text>
              </View>
            ) : (
              <LiteMutedText style={styles.sabotagePanelHint}>Nothing live right now.</LiteMutedText>
            )}
            {[
              LITE_SABOTAGE_TYPE.BLACKOUT,
              LITE_SABOTAGE_TYPE.TIME_PENALTY,
              LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT,
            ].map((key) => {
              const preset = LITE_SABOTAGE_PRESETS[key];
              const cost = LITE_SABOTAGE_COST[key];
              const canAfford = myPoints >= cost;
              const isPending = pendingSabotageKey === key;
              return (
                <View key={key} style={styles.sabotageActionCard}>
                  <View style={styles.sabotageActionHeader}>
                    <Text style={styles.sabotageActionLabel}>{preset.label}</Text>
                    <View style={[styles.sabotageActionCostPill, !canAfford && styles.sabotageActionCostPillDim]}>
                      <Text style={styles.sabotageActionCostText}>-{cost} pts</Text>
                    </View>
                  </View>
                  <Text style={styles.sabotageActionDesc}>{preset.description}</Text>
                  <LiteSecondaryButton
                    onPress={() => onSabotagePress(key)}
                    disabled={sabotageButtonsLocked || !canAfford}
                  >
                    {isPending ? 'Sending...' : 'Trigger'}
                  </LiteSecondaryButton>
                  {!canAfford ? (
                    <LiteMutedText style={styles.needPointsText}>Need {cost} points</LiteMutedText>
                  ) : null}
                </View>
              );
            })}

            {/* CTA to Judge's Table */}
            <View style={styles.judgeNavWrap}>
              {submittedCompetitorCount > 0 ? (
                <LitePrimaryButton onPress={goToJudgesTable} disabled={pendingJudgeNav || loading}>
                  {pendingJudgeNav ? 'Opening...' : "Go to Judge's Table →"}
                </LitePrimaryButton>
              ) : (
                <View style={styles.judgeNavLocked}>
                  <Text style={styles.judgeNavLockedText}>
                    Judge's Table unlocks after a competitor submits.
                  </Text>
                </View>
              )}
            </View>
          </LiteSectionCard>
        ) : isSpectator ? (
          /* ── SPECTATOR FLOW ── */
          <LiteSectionCard title="🎪  In the Stands" style={styles.rolePanelCard}>
            <LiteCardBody style={styles.rolePanelCopy}>
              You're spectating this round — enjoy the show. Voting opens when the host moves forward.
            </LiteCardBody>

            {/* Betting */}
            <View style={styles.panelSectionDivider}>
              <Text style={styles.panelSectionLabel}>🎲  PLACE YOUR BET</Text>
            </View>
            {myBet ? (
              <View style={styles.betLockedCard}>
                <Text style={styles.betLockedText}>
                  ✅  Bet placed on {myBetTarget?.name || 'Competitor'} — {myBet.stake} pts
                </Text>
              </View>
            ) : (
              <>
                <LiteCardBody style={styles.rolePanelCopy}>Stake: {LITE_BET_STAKE} points (one bet per round)</LiteCardBody>
                <View style={styles.betTargetsRow}>
                  {competitors.map((p) => (
                    <TouchableOpacity
                      key={`bet-${p.id}`}
                      style={[
                        styles.betTargetChip,
                        selectedBetTargetId === p.id && styles.betTargetChipSelected,
                      ]}
                      onPress={() => setSelectedBetTargetId(p.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        styles.betTargetChipText,
                        selectedBetTargetId === p.id && styles.betTargetChipTextSelected,
                      ]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
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

            {/* Hangman */}
            <View style={styles.panelSectionDivider}>
              <Text style={styles.panelSectionLabel}>🔤  SPECTATOR HANGMAN</Text>
            </View>
            <LiteCardBody style={styles.hangmanHint}>
              Solve the word for +{LITE_HANGMAN_WIN_BONUS} points. One reward per round.
            </LiteCardBody>
            <View style={styles.hangmanWordWrap}>
              <Text style={styles.hangmanWordText}>{hangmanMasked}</Text>
            </View>
            <View style={styles.hangmanStatsRow}>
              <View style={[styles.hangmanStatPill, hangmanAttemptsLeft <= 1 && styles.hangmanStatPillWarn]}>
                <Text style={styles.hangmanStatText}>{hangmanAttemptsLeft} left</Text>
              </View>
              <Text style={styles.hangmanGuessedText} numberOfLines={1}>
                {hangmanGuessed.length > 0 ? hangmanGuessed.join(' ').toUpperCase() : 'No guesses yet'}
              </Text>
            </View>
            <View style={styles.hangmanLettersGrid}>
              {'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => {
                const used = guessedSet.has(letter);
                const correct = used && hangmanWord.includes(letter);
                const wrong = used && !hangmanWord.includes(letter);
                return (
                  <TouchableOpacity
                    key={`hang-${letter}`}
                    style={[
                      styles.hangmanLetterBtn,
                      correct && styles.hangmanLetterCorrect,
                      wrong && styles.hangmanLetterWrong,
                      !used && hangmanAttemptsLeft > 0 && !hangmanSolved && styles.hangmanLetterActive,
                    ]}
                    onPress={() => guessHangmanLetter(letter)}
                    activeOpacity={0.7}
                    disabled={used || hangmanSolved || hangmanAttemptsLeft <= 0}
                  >
                    <Text style={[
                      styles.hangmanLetterBtnText,
                      correct && styles.hangmanLetterBtnTextCorrect,
                      wrong && styles.hangmanLetterBtnTextWrong,
                    ]}>
                      {letter.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {hangmanSolved ? (
              <View style={styles.hangmanStatusCard}>
                <Text style={styles.hangmanStatusText}>
                  {hangmanRewarded || hangmanSolvedLocal
                    ? `🎉 Solved! +${LITE_HANGMAN_WIN_BONUS} points awarded.`
                    : '🎉 Solved! Awarding points...'}
                </Text>
              </View>
            ) : hangmanAttemptsLeft <= 0 ? (
              <View style={styles.hangmanStatusCard}>
                <Text style={styles.hangmanStatusText}>
                  Out of attempts — word was: {hangmanWord.toUpperCase()}
                </Text>
              </View>
            ) : null}

            {/* Spectator sabotage */}
            <View style={styles.panelSectionDivider}>
              <Text style={styles.panelSectionLabel}>⚡  SPONSOR A SABOTAGE</Text>
            </View>
            {sabotageAlive && activeSabotage && sabotageSponsorLine ? (
              <View style={styles.activeSabotageAlert}>
                <Text style={styles.activeSabotageText}>
                  🔴  Active: {activeSabotage.label} — by {sabotageSponsorLine}
                </Text>
              </View>
            ) : (
              <LiteMutedText style={styles.sabotagePanelHint}>Back the kitchen chaos — one at a time.</LiteMutedText>
            )}
            {[
              LITE_SABOTAGE_TYPE.BLACKOUT,
              LITE_SABOTAGE_TYPE.TIME_PENALTY,
              LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT,
            ].map((key) => {
              const preset = LITE_SABOTAGE_PRESETS[key];
              const cost = LITE_SABOTAGE_COST[key];
              const canAfford = myPoints >= cost;
              const isPending = pendingSabotageKey === key;
              return (
                <View key={key} style={styles.sabotageActionCard}>
                  <View style={styles.sabotageActionHeader}>
                    <Text style={styles.sabotageActionLabel}>{preset.label}</Text>
                    <View style={[styles.sabotageActionCostPill, !canAfford && styles.sabotageActionCostPillDim]}>
                      <Text style={styles.sabotageActionCostText}>-{cost} pts</Text>
                    </View>
                  </View>
                  <Text style={styles.sabotageActionDesc}>{preset.description}</Text>
                  <LiteSecondaryButton
                    onPress={() => onSabotagePress(key)}
                    disabled={sabotageButtonsLocked || !canAfford}
                  >
                    {isPending ? 'Sending...' : 'Trigger'}
                  </LiteSecondaryButton>
                  {!canAfford ? (
                    <LiteMutedText style={styles.needPointsText}>Need {cost} points</LiteMutedText>
                  ) : null}
                </View>
              );
            })}
            {myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.BLACKOUT] ||
            myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.TIME_PENALTY] ||
            myPoints < LITE_SABOTAGE_COST[LITE_SABOTAGE_TYPE.MYSTERY_INGREDIENT] ? (
              <LiteMutedText style={styles.needPointsText}>Need more points for higher-cost sabotages.</LiteMutedText>
            ) : null}
            {submittedCompetitorCount > 0 ? (
              <View style={styles.judgeNavWrap}>
                <LitePrimaryButton onPress={goToVotingLite} disabled={pendingSpectatorNav || loading}>
                  {pendingSpectatorNav ? 'Opening...' : 'Go to Voting →'}
                </LitePrimaryButton>
              </View>
            ) : null}
          </LiteSectionCard>
        ) : null}

        {/* Roast Arena */}
        {(isJudge || isSpectator) ? (
          <LiteSectionCard title="🔥  Roast Arena" style={styles.roastComposerCard}>
            {ownRoast ? (
              <View style={styles.roastLockedCard}>
                <Text style={styles.roastLockedEmoji}>🔒</Text>
                <Text style={styles.roastLockedCopy}>
                  Burn locked in: "{ownRoast.text}"
                </Text>
              </View>
            ) : (
              <>
                <LiteCardBody style={styles.roastHint}>
                  Drop a spicy observation about the kitchen action.
                </LiteCardBody>
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
                  {pendingRoastSubmit ? 'Submitting Roast...' : '🔥 Submit Roast'}
                </LiteSecondaryButton>
              </>
            )}
          </LiteSectionCard>
        ) : null}

        {/* Host start voting */}
        {isHost && (
          <View style={styles.bottomActionArea}>
            <LiteSecondaryButton onPress={hostStartVoting} disabled={pendingStartVoting || loading}>
              {pendingStartVoting ? 'Starting...' : submittedCompetitorCount > 0 ? 'Start Judging' : 'Host: Start Voting'}
            </LiteSecondaryButton>
          </View>
        )}
      </ScrollView>

      {/* Roast toast overlay */}
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

  // ── Player name row ──────────────────────────
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  playerNameTag: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
  },
  myPointsPill: {
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  myPointsText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.ink,
  },

  // ── Timer hero ───────────────────────────────
  heroTimerOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  heroTimerShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: -6,
    backgroundColor: PALETTE.espresso,
    borderRadius: 22,
  },
  heroTimerShell: {
    borderRadius: 22,
    borderWidth: 3,
    overflow: 'hidden',
  },
  heroTimerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timerEyebrow: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    letterSpacing: 2.5,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.75,
  },
  timerHero: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 68,
    lineHeight: 76,
    letterSpacing: 2,
  },
  timerHint: {
    marginTop: 8,
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Challenge pills + banner ─────────────────
  challengePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
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

  // ── Kitchen crew ─────────────────────────────
  crewCard: { marginBottom: 12 },
  crewRow: { marginBottom: 6 },
  crewBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },

  // ── Sabotage alert banner (competitor) ───────
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

  // ── Recipe card ──────────────────────────────
  recipeCard: { marginBottom: 14 },
  recipeInner: { paddingTop: 4, paddingBottom: 6 },
  recipeDishTitle: { marginBottom: 8, fontSize: 20 },
  recipeMeta: { marginBottom: 14, lineHeight: 22 },
  recipeSectionHeading: { marginTop: 4, marginBottom: 8 },
  recipeLine: { marginBottom: 6, lineHeight: 21 },
  recipeStep: { marginBottom: 12, lineHeight: 22 },

  // ── Competitor: dish photo ────────────────────
  dishPhotoCard: { marginBottom: 12 },
  dishPhotoPreview: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    backgroundColor: '#E9D8B6',
    marginBottom: 10,
  },
  dishPhotoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#F0E6CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 6,
  },
  dishPhotoPlaceholderEmoji: {
    fontSize: 40,
  },
  dishPhotoPlaceholderText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: LITE_THEME.text,
    opacity: 0.6,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButtonHalf: {
    flex: 1,
  },

  // ── Competitor: submitted confirmation ────────
  submittedBlock: {
    position: 'relative',
    marginBottom: 16,
  },
  submittedShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: -6,
    backgroundColor: '#3A6B20',
    borderRadius: 18,
  },
  submittedCard: {
    borderWidth: 3,
    borderColor: '#3A6B20',
    borderRadius: 18,
    backgroundColor: '#D4F0C0',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  submittedEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  submittedTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: '#2D5A14',
    marginBottom: 4,
  },
  submittedHint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: '#3A6B20',
    opacity: 0.8,
    textAlign: 'center',
  },

  // ── Competitor: dish name + submit ────────────
  dishNameCard: { marginBottom: 12 },
  submitZone: {
    marginTop: 10,
    marginBottom: 4,
  },
  submitKicker: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.75,
  },

  // ── Role panels (judge / spectator) ──────────
  rolePanelCard: { marginBottom: 12 },
  rolePanelCopy: { marginBottom: 10, lineHeight: 22 },
  panelSectionDivider: {
    borderTopWidth: 2,
    borderTopColor: LITE_THEME.cardBorder,
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  panelSectionLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.text,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.65,
  },

  // ── Active sabotage alert (inside panel) ─────
  activeSabotageAlert: {
    backgroundColor: '#3B1010',
    borderWidth: 2,
    borderColor: PALETTE.red,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  activeSabotageText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: '#FFE8B8',
  },
  sabotagePanelHint: { marginBottom: 10 },
  needPointsText: { marginTop: 4, marginBottom: 8 },

  // ── Sabotage action cards ─────────────────────
  sabotageActionCard: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  sabotageActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sabotageActionLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 15,
    color: LITE_THEME.textInk,
    flex: 1,
    marginRight: 8,
  },
  sabotageActionCostPill: {
    backgroundColor: PALETTE.tomato,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sabotageActionCostPillDim: {
    backgroundColor: LITE_THEME.cardInner,
    borderColor: LITE_THEME.cardBorder,
  },
  sabotageActionCostText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  sabotageActionDesc: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: LITE_THEME.text,
    lineHeight: 18,
    marginBottom: 10,
    opacity: 0.75,
  },

  // ── Judge/spectator nav CTA ───────────────────
  judgeNavWrap: {
    marginTop: 10,
  },
  judgeNavLocked: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  judgeNavLockedText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: LITE_THEME.text,
    textAlign: 'center',
    opacity: 0.7,
  },

  // ── Betting ───────────────────────────────────
  betLockedCard: {
    backgroundColor: '#D4F0C0',
    borderWidth: 2,
    borderColor: '#A8D98A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  betLockedText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: '#2D5A14',
  },
  betTargetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  betTargetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: PALETTE.espresso,
    backgroundColor: LITE_THEME.cardBg,
  },
  betTargetChipSelected: {
    borderColor: PALETTE.espresso,
    backgroundColor: LITE_THEME.primaryAction,
  },
  betTargetChipText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.espresso,
  },
  betTargetChipTextSelected: {
    color: PALETTE.ink,
  },

  // ── Hangman ───────────────────────────────────
  hangmanHint: { marginBottom: 8 },
  hangmanWordWrap: {
    borderWidth: 2.5,
    borderColor: PALETTE.espresso,
    borderRadius: 14,
    backgroundColor: LITE_THEME.cardInner,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  hangmanWordText: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 24,
    letterSpacing: 4,
    color: LITE_THEME.textInk,
    textAlign: 'center',
  },
  hangmanStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  hangmanStatPill: {
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  hangmanStatPillWarn: {
    backgroundColor: PALETTE.tomato,
    borderColor: PALETTE.espresso,
  },
  hangmanStatText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.ink,
  },
  hangmanGuessedText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: LITE_THEME.text,
    flex: 1,
    opacity: 0.7,
  },
  hangmanLettersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  hangmanLetterBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    backgroundColor: '#FFF4DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangmanLetterActive: {
    borderColor: PALETTE.espresso,
    backgroundColor: LITE_THEME.cardBg,
  },
  hangmanLetterCorrect: {
    backgroundColor: '#C8F0A8',
    borderColor: '#3A6B20',
    opacity: 0.6,
  },
  hangmanLetterWrong: {
    backgroundColor: '#F0C8C8',
    borderColor: PALETTE.red,
    opacity: 0.45,
  },
  hangmanLetterBtnText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
  },
  hangmanLetterBtnTextCorrect: {
    color: '#2D5A14',
  },
  hangmanLetterBtnTextWrong: {
    color: PALETTE.red,
  },
  hangmanStatusCard: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  hangmanStatusText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: LITE_THEME.textInk,
    textAlign: 'center',
  },

  // ── Roast Arena ───────────────────────────────
  roastComposerCard: { marginBottom: 12 },
  roastHint: { marginBottom: 8, lineHeight: 20 },
  roastLockedCard: {
    backgroundColor: '#FFF0D6',
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  roastLockedEmoji: {
    fontSize: 18,
  },
  roastLockedCopy: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.textInk,
    lineHeight: 20,
    flex: 1,
  },

  // ── Bottom action ─────────────────────────────
  bottomActionArea: { marginTop: 4, paddingBottom: 10 },

  // ── Roast toast overlay ───────────────────────
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
