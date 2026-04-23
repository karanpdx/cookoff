import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  LITE_THEME,
  LiteScreenTitle,
  LiteMutedText,
  LiteErrorText,
  LiteDishVoteCard,
  LitePrimaryButton,
  LiteSecondaryButton,
  LiteBadge,
  LiteSectionCard,
  LiteCardBody,
  LITE_GAME_STYLES,
  PALETTE,
} from '../components/DesignSystem';
import {
  useLiteRoomPolling,
  LITE_ROLE,
  getLiteRoleBadgeLabel,
  getLiteRoleBadgeVariant,
} from '../hooks/useLiteRoomPolling';

const ROAST_TOAST_MS = 5000;

export default function VotingLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, submitJudgeScoreLite, voteLiteRoast, finalizeResultsLite, loading, error } = useLiteRoomPolling(gameCode);
  const [selectedScores, setSelectedScores] = useState({});
  const [pendingScoreTargetId, setPendingScoreTargetId] = useState(null);
  const [pendingRoastVoteId, setPendingRoastVoteId] = useState(null);
  const [pendingFinalize, setPendingFinalize] = useState(false);

  const phase = room?.phase || 'voting';
  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);
  const dishes = useMemo(() => players.filter((p) => p.dishName || p.photoUri), [players]);
  const selfMeta = useMemo(() => {
    return players.find((p) => p.id === playerId) || null;
  }, [players, playerId]);

  const canScore = selfMeta?.liteRole === LITE_ROLE.JUDGE;
  const canFinalize = isHost || selfMeta?.liteRole === LITE_ROLE.JUDGE;
  const liteScores = room?.liteScores || {};
  const liteRoasts = Array.isArray(room?.liteRoasts) ? room.liteRoasts : [];
  const liteRoastVotes = room?.liteRoastVotes || {};
  const hasRoastVoted = Boolean(liteRoastVotes[playerId]);
  const [activeRoastToast, setActiveRoastToast] = useState(null);
  const roastToastQueueRef = useRef([]);
  const roastToastTimerRef = useRef(null);
  const roastToastSeenRef = useRef(new Set());
  const roastToastInitRef = useRef(false);

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
    if (!canFinalize || pendingFinalize) return;
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
        <LiteScreenTitle>Judge's Table</LiteScreenTitle>
        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}
        {!canScore && !!selfMeta?.liteRole ? (
          <LiteMutedText style={styles.voteHint}>
            {selfMeta.liteRole === LITE_ROLE.COMPETITOR
              ? "Competitors don't score — hang tight for the verdict."
              : 'Spectators watch the judging — only the judge submits scores.'}
          </LiteMutedText>
        ) : null}
        {dishes.map((p) => {
          const rl = getLiteRoleBadgeLabel(p.liteRole);
          const existingScore = scoreForTarget(p.id);
          const selected = Number(selectedScores[p.id]);
          const hasSelected = Number.isInteger(selected) && selected >= 1 && selected <= 10;
          return (
            <View key={p.id} style={styles.dishBlock}>
              <View style={styles.dishPlayerRow}>
                <Text style={LITE_GAME_STYLES.scoreRowName} numberOfLines={1}>
                  {p.name}
                </Text>
                {rl ? <LiteBadge label={rl} variant={getLiteRoleBadgeVariant(p.liteRole)} /> : null}
              </View>
              <LiteDishVoteCard
                photoUri={p.photoUri}
                playerName=""
                dishName={p.dishName || 'Untitled Dish'}
                hint={!canScore ? 'View only' : existingScore != null ? `Submitted: ${existingScore}/10` : 'Pick a score from 1 to 10'}
                selected={false}
                onPress={() => {}}
              />
              {canScore ? (
                <View style={styles.tapRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const chipSelected = selected === num;
                    return (
                      <Text
                        key={`tap-${p.id}-${num}`}
                        style={[styles.tapChip, chipSelected && styles.tapChipSelected]}
                        onPress={() =>
                          setSelectedScores((prev) => ({ ...prev, [p.id]: num }))
                        }
                      >
                        {num}
                      </Text>
                    );
                  })}
                </View>
              ) : null}
              <LiteSecondaryButton
                onPress={() => submitScoreForTarget(p.id)}
                disabled={!canScore || !hasSelected || loading || pendingScoreTargetId === p.id}
              >
                {pendingScoreTargetId === p.id
                  ? 'Submitting...'
                  : existingScore != null
                  ? 'Update Score'
                  : 'Submit Score'}
              </LiteSecondaryButton>
            </View>
          );
        })}
        {dishes.length === 0 ? <LiteMutedText>No submitted dishes yet.</LiteMutedText> : null}
        <LiteSectionCard title="Funniest Burn Voting">
          <LiteCardBody style={styles.roastHint}>Vote once for the roast that hits hardest.</LiteCardBody>
          {liteRoasts.length === 0 ? (
            <LiteMutedText style={styles.roastHint}>No roasts yet.</LiteMutedText>
          ) : (
            <ScrollView style={styles.roastListScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {liteRoasts.map((r) => {
                const voteCount = Object.values(liteRoastVotes).filter((id) => id === r.id).length;
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
        {canFinalize && (
          <LitePrimaryButton onPress={finalize} disabled={pendingFinalize || loading}>
            {pendingFinalize ? 'Finalizing...' : isHost ? 'Host: Finalize Results' : 'Finalize Results'}
          </LitePrimaryButton>
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
  content: {
    padding: LITE_THEME.contentPadding,
    paddingTop: LITE_THEME.contentPaddingTop,
    paddingBottom: LITE_THEME.contentPaddingBottom,
  },
  voteHint: { marginBottom: 10, textAlign: 'center' },
  dishBlock: { marginBottom: 8 },
  dishPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  tapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 8 },
  tapChip: {
    minWidth: 34,
    textAlign: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    backgroundColor: LITE_THEME.cardInner,
    color: LITE_THEME.text,
    fontFamily: 'Fredoka_700Bold',
  },
  tapChipSelected: {
    backgroundColor: LITE_THEME.primaryAction,
    color: LITE_THEME.textInk,
  },
  roastHint: { marginBottom: 8 },
  roastListScroll: { maxHeight: 300 },
  roastRow: {
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 12,
    backgroundColor: LITE_THEME.cardInner,
    padding: 10,
    marginTop: 8,
  },
  roastMeta: {
    fontFamily: 'Fredoka_700Bold',
    color: LITE_THEME.titleRed,
    fontSize: 12,
    marginBottom: 4,
  },
  roastText: {
    fontFamily: 'Fredoka_600SemiBold',
    color: LITE_THEME.text,
    fontSize: 14,
    marginBottom: 8,
  },
  roastVoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
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
