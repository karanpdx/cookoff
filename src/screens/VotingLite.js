import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  LITE_THEME,
  LiteTopBar,
  LiteMutedText,
  LiteErrorText,
  LitePrimaryButton,
  LiteSecondaryButton,
  LiteBadge,
  LiteSectionCard,
  LiteCardBody,
  PALETTE,
} from '../components/DesignSystem';
import {
  useLiteRoomPolling,
  LITE_ROLE,
  getLiteRoleBadgeLabel,
  getLiteRoleBadgeVariant,
} from '../hooks/useLiteRoomPolling';

const ROAST_TOAST_MS = 5000;

function hasLiteSubmittedDish(player) {
  if (!player) return false;
  const dish = String(player?.dishName || '').trim();
  const photoUri = String(player?.photoUri || player?.photoURL || '').trim();
  const photoBase64 = String(player?.photoBase64 || '').trim();
  return Boolean(dish) || Boolean(photoUri) || Boolean(photoBase64);
}

function getDishPhotoUri(player) {
  const uri = String(player?.photoUri || player?.photoURL || '').trim();
  return uri || null;
}

function getDishImageSource(player) {
  const rawBase64 = String(player?.photoBase64 || '').trim();
  if (rawBase64) {
    return {
      kind: 'base64',
      uri: rawBase64.startsWith('data:image/')
        ? rawBase64
        : `data:image/jpeg;base64,${rawBase64}`,
    };
  }
  const uri = getDishPhotoUri(player);
  if (uri) return { kind: 'uri', uri };
  return { kind: 'none', uri: null };
}

export default function VotingLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, submitJudgeScoreLite, voteLiteRoast, finalizeResultsLite, loading, error } = useLiteRoomPolling(gameCode);
  const [selectedScores, setSelectedScores] = useState({});
  const [pendingScoreTargetId, setPendingScoreTargetId] = useState(null);
  const [pendingRoastVoteId, setPendingRoastVoteId] = useState(null);
  const [pendingFinalize, setPendingFinalize] = useState(false);

  const phase = room?.phase || 'voting';
  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);
  const selfMeta = useMemo(() => {
    return players.find((p) => p.id === playerId) || null;
  }, [players, playerId]);

  const canScore = selfMeta?.liteRole === LITE_ROLE.JUDGE;
  const canFinalize = isHost || selfMeta?.liteRole === LITE_ROLE.JUDGE;
  const liteScores = room?.liteScores || {};
  const liteRoasts = Array.isArray(room?.liteRoasts) ? room.liteRoasts : [];
  const liteRoastVotes = room?.liteRoastVotes || {};
  const hasRoastVoted = Boolean(liteRoastVotes[playerId]);
  const judges = useMemo(() => players.filter((p) => p?.liteRole === LITE_ROLE.JUDGE), [players]);
  const submittedCompetitorDishes = useMemo(
    () => players.filter((p) => (!p?.liteRole || p.liteRole === LITE_ROLE.COMPETITOR) && hasLiteSubmittedDish(p)),
    [players]
  );
  const [stableSubmittedDishes, setStableSubmittedDishes] = useState([]);
  React.useEffect(() => {
    if (submittedCompetitorDishes.length > 0) {
      setStableSubmittedDishes(submittedCompetitorDishes);
    }
  }, [submittedCompetitorDishes]);
  const dishes =
    submittedCompetitorDishes.length > 0 ? submittedCompetitorDishes : stableSubmittedDishes;
  const requiredScoreCount = judges.length * submittedCompetitorDishes.length;
  const submittedScoreCount = useMemo(() => {
    let count = 0;
    submittedCompetitorDishes.forEach((target) => {
      judges.forEach((judge) => {
        const n = Number(liteScores?.[target.id]?.[judge.id]);
        if (Number.isInteger(n) && n >= 1 && n <= 10) count += 1;
      });
    });
    return count;
  }, [submittedCompetitorDishes, judges, liteScores]);
  const judgingComplete = submittedScoreCount >= requiredScoreCount;
  const [activeRoastToast, setActiveRoastToast] = useState(null);
  const roastToastQueueRef = useRef([]);
  const roastToastTimerRef = useRef(null);
  const roastToastSeenRef = useRef(new Set());
  const roastToastMountedAtRef = useRef(Date.now());

  const popNextRoastToast = useCallback(() => {
    const next = roastToastQueueRef.current.shift() || null;
    setActiveRoastToast(next);
  }, []);

  const scoreForTarget = (targetPlayerId) => {
    const byJudge = liteScores[targetPlayerId] || {};
    const existing = byJudge[playerId];
    return Number.isFinite(Number(existing)) ? Number(existing) : null;
  };

  React.useEffect(() => {
    console.log(
      '[VotingLite] submitted competitors:',
      submittedCompetitorDishes.length,
      submittedCompetitorDishes.map((p) => ({
        id: p?.id,
        hasPhotoUri: Boolean(getDishPhotoUri(p)),
      }))
    );
  }, [submittedCompetitorDishes]);

  React.useEffect(() => {
    console.log(
      '[VotingLite] rendered dish cards:',
      dishes.length,
      dishes.map((p) => ({ id: p?.id, imageSource: getDishImageSource(p).kind }))
    );
  }, [dishes]);

  React.useEffect(() => {
    if (phase === 'setup') {
      navigation.replace('SetupLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'cooking') {
      const role = selfMeta?.liteRole;
      const allowEarlyVotingAccess =
        (role === LITE_ROLE.JUDGE || role === LITE_ROLE.SPECTATOR) &&
        submittedCompetitorDishes.length > 0;
      if (allowEarlyVotingAccess) return;
      navigation.replace('CookingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, selfMeta?.liteRole, submittedCompetitorDishes.length, navigation, gameCode, playerName, playerId, isHost]);

  const recoverByPhase = useCallback(() => {
    if (phase === 'voting') return;
    if (phase === 'setup') {
      navigation.replace('SetupLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'cooking') {
      navigation.replace('CookingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  const handleSafeBack = useCallback(() => {
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

  const submitScoreForTarget = async (targetPlayerId) => {
    const selected = Number(selectedScores[targetPlayerId]);
    if (!playerId || !targetPlayerId || !canScore) return;
    if (!Number.isInteger(selected) || selected < 1 || selected > 10) return;
    setPendingScoreTargetId(targetPlayerId);
    try {
      await submitJudgeScoreLite(playerId, targetPlayerId, selected);
    } finally {
      setPendingScoreTargetId(null);
    }
  };

  const finalize = async () => {
    if (!canFinalize || pendingFinalize || !judgingComplete) return;
    setPendingFinalize(true);
    try {
      await finalizeResultsLite();
    } finally {
      setPendingFinalize(false);
    }
  };

  const castRoastVote = async (roastId) => {
    if (!playerId || !roastId || hasRoastVoted || pendingRoastVoteId) return;
    setPendingRoastVoteId(roastId);
    try {
      await voteLiteRoast(playerId, roastId);
    } finally {
      setPendingRoastVoteId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiteTopBar
          title="Judge's Table"
          showBack={Boolean(navigation?.canGoBack?.())}
          onBack={handleSafeBack}
        />

        {/* Hero subtitle */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>⚖️  SCORE THE DISHES</Text>
          <Text style={styles.heroKicker}>The judges have the floor</Text>
        </View>

        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}

        {!canScore && !!selfMeta?.liteRole ? (
          <View style={styles.viewerBanner}>
            <Text style={styles.viewerBannerText}>
              {selfMeta.liteRole === LITE_ROLE.COMPETITOR
                ? '👀  Competitors sit tight — verdict incoming'
                : '👁  Spectators watch — only the judge scores'}
            </Text>
          </View>
        ) : null}

        {/* Dish lineup header row */}
        {dishes.length > 0 && (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>DISH LINEUP</Text>
            <View style={[styles.progressPill, judgingComplete && styles.progressPillDone]}>
              <Text style={[styles.progressPillText, judgingComplete && styles.progressPillTextDone]}>
                {submittedScoreCount}/{requiredScoreCount} SCORED
              </Text>
            </View>
          </View>
        )}

        {/* Dish cards */}
        {dishes.map((p) => {
          const rl = getLiteRoleBadgeLabel(p.liteRole);
          const existingScore = scoreForTarget(p.id);
          const selected = Number(selectedScores[p.id]);
          const hasSelected = Number.isInteger(selected) && selected >= 1 && selected <= 10;
          const dishImage = getDishImageSource(p);
          const isPending = pendingScoreTargetId === p.id;
          return (
            <View key={p.id} style={styles.dishBlock}>
              {/* Chunky card shadow */}
              <View style={styles.dishCardOuter}>
                <View style={styles.cardShadow} />
                <View style={styles.dishCard}>
                  {/* Dish photo — full bleed, top of card */}
                  {dishImage.uri ? (
                    <Image
                      source={{ uri: dishImage.uri }}
                      style={styles.dishPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderEmoji}>🍽️</Text>
                      <Text style={styles.photoPlaceholderText}>No photo submitted</Text>
                    </View>
                  )}
                  {/* Dish name + competitor */}
                  <View style={styles.dishInfoArea}>
                    <Text style={styles.dishNameText} numberOfLines={2}>
                      {p.dishName || 'Untitled Dish'}
                    </Text>
                    <View style={styles.competitorRow}>
                      <Text style={styles.competitorName} numberOfLines={1}>
                        by {p.name}
                      </Text>
                      {rl ? (
                        <LiteBadge label={rl} variant={getLiteRoleBadgeVariant(p.liteRole)} />
                      ) : null}
                    </View>
                  </View>
                  {/* Score locked-in confirmation strip */}
                  {existingScore != null && (
                    <View style={styles.scoreLockedStrip}>
                      <Text style={styles.scoreLockedText}>
                        ✓  Score locked in: {existingScore}/10
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Score pad — outside card to avoid overflow clipping button shadows */}
              {canScore ? (
                <View style={styles.scorePadWrap}>
                  <Text style={styles.scorePadLabel}>
                    {existingScore != null ? 'Change score:' : 'Pick a score:'}
                  </Text>
                  {/* Row 1 — 1 to 5 */}
                  <View style={styles.scoreRow}>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = selected === num;
                      return (
                        <TouchableOpacity
                          key={`tap-${p.id}-${num}`}
                          style={[styles.scoreBtn, isSelected && styles.scoreBtnSelected]}
                          onPress={() =>
                            setSelectedScores((prev) => ({ ...prev, [p.id]: num }))
                          }
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.scoreBtnText,
                              isSelected && styles.scoreBtnTextSelected,
                            ]}
                          >
                            {num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {/* Row 2 — 6 to 10 */}
                  <View style={styles.scoreRow}>
                    {[6, 7, 8, 9, 10].map((num) => {
                      const isSelected = selected === num;
                      return (
                        <TouchableOpacity
                          key={`tap-${p.id}-${num}`}
                          style={[
                            styles.scoreBtn,
                            styles.scoreBtnHigh,
                            isSelected && styles.scoreBtnSelected,
                          ]}
                          onPress={() =>
                            setSelectedScores((prev) => ({ ...prev, [p.id]: num }))
                          }
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.scoreBtnText,
                              isSelected && styles.scoreBtnTextSelected,
                            ]}
                          >
                            {num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.viewOnlyRow}>
                  <Text style={styles.viewOnlyText}>VIEW ONLY</Text>
                </View>
              )}

              <LiteSecondaryButton
                onPress={() => submitScoreForTarget(p.id)}
                disabled={!canScore || !hasSelected || loading || isPending}
              >
                {isPending
                  ? 'Submitting...'
                  : existingScore != null
                  ? 'Update Score'
                  : 'Submit Score'}
              </LiteSecondaryButton>
            </View>
          );
        })}

        {submittedCompetitorDishes.length === 0 && stableSubmittedDishes.length === 0 ? (
          <LiteMutedText>No submitted dishes yet.</LiteMutedText>
        ) : null}

        {/* Judging incomplete hint */}
        {!judgingComplete && dishes.length > 0 ? (
          <View style={styles.progressHintWrap}>
            <Text style={styles.progressHintText}>
              Finalize unlocks when all judges score all dishes.
            </Text>
          </View>
        ) : null}

        {/* Roast voting */}
        <LiteSectionCard title="🔥  Funniest Burn Voting">
          <LiteCardBody style={styles.roastHint}>
            Vote once for the roast that hits hardest.
          </LiteCardBody>
          {liteRoasts.length === 0 ? (
            <LiteMutedText style={styles.roastHint}>No roasts yet.</LiteMutedText>
          ) : (
            <ScrollView
              style={styles.roastListScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {liteRoasts.map((r) => {
                const voteCount = Object.values(liteRoastVotes).filter(
                  (id) => id === r.id
                ).length;
                return (
                  <View key={r.id} style={styles.roastRow}>
                    <Text style={styles.roastMeta}>
                      {r.playerName} ({String(r.role || '').toUpperCase() || 'GUEST'})
                    </Text>
                    <Text style={styles.roastText}>{r.text}</Text>
                    <View style={styles.roastVoteRow}>
                      <LiteBadge label={`${voteCount} VOTES`} variant="score" />
                      <LiteSecondaryButton
                        onPress={() => castRoastVote(r.id)}
                        disabled={hasRoastVoted || pendingRoastVoteId === r.id}
                      >
                        {hasRoastVoted
                          ? 'Vote Locked'
                          : pendingRoastVoteId === r.id
                          ? 'Voting...'
                          : 'Vote Funniest'}
                      </LiteSecondaryButton>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </LiteSectionCard>

        {/* Finalize area */}
        {canFinalize && (
          <View style={styles.bottomActionArea}>
            {judgingComplete && (
              <View style={styles.finalizeReadyBanner}>
                <Text style={styles.finalizeReadyText}>
                  🏁  All scores in — ready to finalize!
                </Text>
              </View>
            )}
            <LitePrimaryButton
              onPress={finalize}
              disabled={pendingFinalize || loading || !judgingComplete}
            >
              {pendingFinalize
                ? 'Finalizing...'
                : isHost
                ? 'Host: Finalize Results'
                : 'Finalize Results'}
            </LitePrimaryButton>
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
              {activeRoastToast.playerName} •{' '}
              {String(activeRoastToast.role || '').toUpperCase()}
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
  content: {
    padding: LITE_THEME.contentPadding,
    paddingTop: LITE_THEME.contentPaddingTop,
    paddingBottom: LITE_THEME.contentPaddingBottom,
  },

  // ── Hero banner ──────────────────────────────
  heroBanner: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 2,
  },
  heroTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: LITE_THEME.titleRed,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroKicker: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: LITE_THEME.text,
    marginTop: 3,
    opacity: 0.7,
  },

  // ── Viewer/spectator banner ──────────────────
  viewerBanner: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  viewerBannerText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    textAlign: 'center',
  },

  // ── Dish lineup section header ───────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.text,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.65,
  },
  progressPill: {
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  progressPillDone: {
    backgroundColor: '#7ED957',
    borderColor: '#3A6B20',
  },
  progressPillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    letterSpacing: 0.5,
  },
  progressPillTextDone: {
    color: '#1E3D0A',
  },

  // ── Dish block ───────────────────────────────
  dishBlock: {
    marginBottom: 22,
  },
  dishCardOuter: {
    position: 'relative',
    marginBottom: 0,
  },
  cardShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: -6,
    backgroundColor: PALETTE.espresso,
    borderRadius: 20,
  },
  dishCard: {
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 20,
    backgroundColor: LITE_THEME.cardInner,
    overflow: 'hidden',
    marginBottom: 10,
  },
  dishPhoto: {
    width: '100%',
    height: 220,
    backgroundColor: '#E9D8B6',
  },
  photoPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0E6CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderEmoji: {
    fontSize: 44,
  },
  photoPlaceholderText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: LITE_THEME.text,
    opacity: 0.55,
  },
  dishInfoArea: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: LITE_THEME.cardBorder,
  },
  dishNameText: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: LITE_THEME.titleRed,
    marginBottom: 5,
    lineHeight: 26,
  },
  competitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  competitorName: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    flex: 1,
  },
  scoreLockedStrip: {
    backgroundColor: '#D4F0C0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#A8D98A',
  },
  scoreLockedText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: '#2D5A14',
  },

  // ── Score pad ────────────────────────────────
  scorePadWrap: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  scorePadLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  scoreBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: PALETTE.espresso,
    backgroundColor: '#FFF7E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnHigh: {
    borderColor: PALETTE.tomato,
    backgroundColor: '#FFF1E6',
  },
  scoreBtnSelected: {
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
  },
  scoreBtnText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 19,
    color: PALETTE.espresso,
  },
  scoreBtnTextSelected: {
    color: PALETTE.ink,
    fontSize: 21,
  },
  viewOnlyRow: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 10,
  },
  viewOnlyText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: LITE_THEME.text,
    opacity: 0.45,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Judging progress hint ────────────────────
  progressHintWrap: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  progressHintText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: LITE_THEME.text,
    textAlign: 'center',
    opacity: 0.75,
  },

  // ── Roast section ────────────────────────────
  roastHint: { marginBottom: 8 },
  roastListScroll: { maxHeight: 320 },
  roastRow: {
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 14,
    backgroundColor: LITE_THEME.cardInner,
    padding: 12,
    marginTop: 8,
  },
  roastMeta: {
    fontFamily: 'Fredoka_700Bold',
    color: LITE_THEME.titleRed,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roastText: {
    fontFamily: 'Fredoka_600SemiBold',
    color: LITE_THEME.textInk,
    fontSize: 15,
    marginBottom: 10,
    lineHeight: 20,
  },
  roastVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  // ── Finalize area ────────────────────────────
  bottomActionArea: { marginTop: 6, paddingBottom: 10 },
  finalizeReadyBanner: {
    backgroundColor: '#D4F0C0',
    borderWidth: 2,
    borderColor: '#A8D98A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  finalizeReadyText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 15,
    color: '#2D5A14',
  },

  // ── Roast toast overlay ──────────────────────
  roastToastWrap: {
    position: 'absolute',
    top: 88,
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
