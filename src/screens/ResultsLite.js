import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  LITE_THEME,
  LiteTopBar,
  LiteMutedText,
  LiteErrorText,
  LitePrimaryButton,
  LiteBadge,
  PALETTE,
} from '../components/DesignSystem';
import { useLiteRoomPolling, getLiteRoleBadgeLabel, getLiteRoleBadgeVariant } from '../hooks/useLiteRoomPolling';

function hasLiteSubmittedDish(player) {
  if (!player) return false;
  const dish = String(player?.dishName || '').trim();
  const photo = String(player?.photoUri || '').trim();
  return Boolean(dish) || Boolean(photo);
}

function ordinal(n) {
  if (n === 1) return '1ST';
  if (n === 2) return '2ND';
  if (n === 3) return '3RD';
  return `${n}TH`;
}

const RANK_STYLES = [
  { bg: '#FFE566', border: '#C8A800', rankColor: '#7A5C00', medal: '🥇' },
  { bg: '#E6E6E6', border: '#A0A0A0', rankColor: '#505050', medal: '🥈' },
  { bg: '#F0C882', border: '#B07040', rankColor: '#7A4820', medal: '🥉' },
];
const RANK_DEFAULT = { bg: LITE_THEME.cardInner, border: LITE_THEME.cardBorder, rankColor: LITE_THEME.text, medal: null };

export default function ResultsLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, setPhase, patchRoom, loading, error } = useLiteRoomPolling(gameCode);
  const [pendingReset, setPendingReset] = React.useState(false);
  const phase = room?.phase || 'results';

  const ranked = useMemo(() => {
    const players = Array.isArray(room?.players) ? room.players : [];
    const competitors = players.filter((p) => !p?.liteRole || p.liteRole === 'competitor');
    const liteScores = room?.liteScores || {};
    const withFinal = competitors.map((p) => {
      const byJudge = liteScores[p.id] || {};
      const nums = Object.values(byJudge)
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));
      const finalScore =
        nums.length > 0 ? Math.round((nums.reduce((sum, n) => sum + n, 0) / nums.length) * 10) / 10 : 0;
      return { ...p, finalScore, hasScore: nums.length > 0 };
    });
    return [...withFinal].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  }, [room?.players, room?.liteScores]);
  const litePoints = room?.litePoints || {};
  const funniestRoast =
    room?.funniestRoastLite ||
    room?.funniestRoast ||
    room?.funniestBurnLite ||
    null;
  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);
  const selfMeta = useMemo(() => players.find((p) => p.id === playerId) || null, [players, playerId]);
  const judges = useMemo(() => players.filter((p) => p?.liteRole === 'judge'), [players]);
  const submittedCompetitorDishes = useMemo(
    () => players.filter((p) => (!p?.liteRole || p.liteRole === 'competitor') && hasLiteSubmittedDish(p)),
    [players]
  );
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

  const winner = ranked[0] || room?.winnerLite || null;

  React.useEffect(() => {
    if (selfMeta?.liteRole === 'judge' && phase === 'voting' && !judgingComplete) {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'waiting') {
      navigation.replace('WaitingRoomLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'setup') {
      navigation.replace('SetupLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'cooking') {
      navigation.replace('CookingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    }
  }, [selfMeta?.liteRole, phase, judgingComplete, navigation, gameCode, playerName, playerId, isHost]);

  const recoverByPhase = React.useCallback(() => {
    if (phase === 'results') return;
    if (phase === 'waiting') {
      navigation.replace('WaitingRoomLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'setup') {
      navigation.replace('SetupLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'cooking') {
      navigation.replace('CookingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  const handleSafeBack = React.useCallback(() => {
    if (selfMeta?.liteRole === 'judge' && phase === 'voting' && !judgingComplete) {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    recoverByPhase();
  }, [selfMeta?.liteRole, phase, judgingComplete, navigation, gameCode, playerName, playerId, isHost, recoverByPhase]);

  const playAgain = async () => {
    if (!isHost || pendingReset) return;
    setPendingReset(true);
    const players = Array.isArray(room?.players) ? room.players : [];
    const resetPlayers = players.map((p) => ({
      ...p,
      dishName: null,
      photoUri: null,
      scoreLite: 0,
    }));
    try {
      await patchRoom({
        players: resetPlayers,
        votesLite: {},
        liteScores: {},
        winnerLite: null,
      });
      await setPhase('waiting');
      navigation.replace('WaitingRoomLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingReset(false);
    }
  };

  const winnerScore = winner
    ? `${winner.finalScore ?? winner.score ?? winner.scoreLite ?? 0}`
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LiteTopBar
          title="Winner Circle"
          showBack={Boolean(navigation?.canGoBack?.())}
          onBack={handleSafeBack}
        />

        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}

        {/* ── Winner Hero ─────────────────────────── */}
        {winner ? (
          <View style={styles.winnerBlock}>
            <View style={styles.winnerShadow} />
            <View style={styles.winnerCard}>
              <View style={styles.winnerBadgeRow}>
                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>CHAMPION</Text>
                </View>
              </View>
              <Text style={styles.winnerEmoji}>🏆</Text>
              <Text style={styles.winnerName} numberOfLines={2}>
                {winner.name}
              </Text>
              {winner.dishName ? (
                <Text style={styles.winnerDish} numberOfLines={1}>
                  "{winner.dishName}"
                </Text>
              ) : null}
              <View style={styles.winnerScorePill}>
                <Text style={styles.winnerScoreLabel}>FINAL SCORE</Text>
                <Text style={styles.winnerScoreValue}>{winnerScore}/10</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.noWinner}>No winner yet</Text>
        )}

        {/* ── Rankings ────────────────────────────── */}
        {ranked.length > 0 && (
          <View style={styles.rankingsSection}>
            <Text style={styles.rankingsSectionLabel}>FINAL STANDINGS</Text>
            {ranked.map((p, idx) => {
              const rl = getLiteRoleBadgeLabel(p.liteRole);
              const rankLabel =
                p.id === ranked?.[0]?.id
                  ? '1st Pick'
                  : p.id === ranked?.[1]?.id
                  ? '2nd Pick'
                  : p.id === ranked?.[2]?.id
                  ? '3rd Pick'
                  : '';
              const rs = RANK_STYLES[idx] || RANK_DEFAULT;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.rankRow,
                    { backgroundColor: rs.bg, borderColor: rs.border },
                  ]}
                >
                  {/* Rank number */}
                  <View style={styles.rankNumWrap}>
                    {rs.medal ? (
                      <Text style={styles.rankMedal}>{rs.medal}</Text>
                    ) : (
                      <Text style={[styles.rankNum, { color: rs.rankColor }]}>
                        {ordinal(idx + 1)}
                      </Text>
                    )}
                  </View>
                  {/* Name + badges */}
                  <View style={styles.rankNameBlock}>
                    <Text style={styles.rankName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View style={styles.rankBadgeRow}>
                      {rl ? (
                        <LiteBadge label={rl} variant={getLiteRoleBadgeVariant(p.liteRole)} />
                      ) : null}
                      {!!rankLabel && (
                        <View style={styles.pickPill}>
                          <Text style={styles.pickPillText}>{rankLabel}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Score */}
                  <View style={styles.rankScorePill}>
                    <Text style={styles.rankScoreText}>
                      {p.hasScore ? `${p.finalScore}` : '—'}
                    </Text>
                    {p.hasScore && <Text style={styles.rankScoreUnit}>/10</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Funniest Burn ────────────────────────── */}
        {funniestRoast ? (
          <View style={styles.roastBlock}>
            <View style={styles.roastShadow} />
            <View style={styles.roastCard}>
              <View style={styles.roastHeaderRow}>
                <Text style={styles.roastHeaderTitle}>FUNNIEST BURN</Text>
                <View style={styles.roastPointsPill}>
                  <Text style={styles.roastPointsText}>+20 PTS</Text>
                </View>
              </View>
              <Text style={styles.roastFlame}>🔥</Text>
              <Text style={styles.roastMeta}>
                {funniestRoast.playerName}
                {'  ·  '}
                {String(funniestRoast.role || '').toUpperCase()}
              </Text>
              <Text style={styles.roastQuote}>"{funniestRoast.text}"</Text>
              <View style={styles.roastVotesBadge}>
                <Text style={styles.roastVotesText}>
                  {funniestRoast.voteCount || 0} VOTES
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Points Summary ───────────────────────── */}
        <View style={styles.pointsBlock}>
          <View style={styles.pointsShadow} />
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeaderRow}>
              <Text style={styles.pointsHeaderTitle}>POINTS BANK</Text>
              <Text style={styles.pointsHeaderEmoji}>🪙</Text>
            </View>
            {(Array.isArray(room?.players) ? room.players : []).map((p) => (
              <View key={`pts-${p.id}`} style={styles.pointsRow}>
                <Text style={styles.pointsName} numberOfLines={1}>
                  {p.name}
                </Text>
                <View style={styles.pointsValuePill}>
                  <Text style={styles.pointsValue}>
                    {Math.max(0, Math.floor(Number(litePoints[p.id]) || 0))}
                  </Text>
                  <Text style={styles.pointsUnit}> pts</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Play Again ───────────────────────────── */}
        {isHost && (
          <View style={styles.bottomActionArea}>
            <LitePrimaryButton onPress={playAgain} disabled={pendingReset || loading}>
              {pendingReset ? 'Resetting...' : 'Host: Back to Waiting'}
            </LitePrimaryButton>
          </View>
        )}
      </ScrollView>
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
  noWinner: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: LITE_THEME.text,
    marginBottom: 14,
  },

  // ── Winner hero ──────────────────────────────
  winnerBlock: {
    position: 'relative',
    marginBottom: 22,
  },
  winnerShadow: {
    position: 'absolute',
    top: 7,
    left: 0,
    right: 0,
    bottom: -7,
    backgroundColor: PALETTE.espresso,
    borderRadius: 24,
  },
  winnerCard: {
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 24,
    backgroundColor: '#FFF0B0',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  winnerBadgeRow: {
    marginBottom: 8,
  },
  winnerBadge: {
    backgroundColor: LITE_THEME.titleRed,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 2.5,
    borderColor: PALETTE.espresso,
  },
  winnerBadgeText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  winnerEmoji: {
    fontSize: 54,
    marginBottom: 6,
  },
  winnerName: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 32,
    color: LITE_THEME.titleRed,
    textAlign: 'center',
    marginBottom: 4,
  },
  winnerDish: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    textAlign: 'center',
    marginBottom: 14,
    opacity: 0.75,
  },
  winnerScorePill: {
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 2.5,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  winnerScoreLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  winnerScoreValue: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: PALETTE.ink,
  },

  // ── Rankings ─────────────────────────────────
  rankingsSection: {
    marginBottom: 16,
  },
  rankingsSectionLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.text,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginBottom: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },
  rankNumWrap: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedal: {
    fontSize: 28,
  },
  rankNum: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  rankNameBlock: {
    flex: 1,
    gap: 4,
  },
  rankName: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 16,
    color: LITE_THEME.textInk,
  },
  rankBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pickPill: {
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  pickPillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 10,
    color: LITE_THEME.textInk,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankScorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(59,43,30,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 54,
    justifyContent: 'center',
  },
  rankScoreText: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: PALETTE.ink,
  },
  rankScoreUnit: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.espresso,
    opacity: 0.6,
  },

  // ── Funniest Burn ─────────────────────────────
  roastBlock: {
    position: 'relative',
    marginBottom: 20,
  },
  roastShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: -6,
    backgroundColor: PALETTE.espresso,
    borderRadius: 20,
  },
  roastCard: {
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 20,
    backgroundColor: '#FFF0D6',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  roastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roastHeaderTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 18,
    color: LITE_THEME.titleRed,
    letterSpacing: 0.5,
  },
  roastPointsPill: {
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roastPointsText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    letterSpacing: 1,
  },
  roastFlame: {
    fontSize: 36,
    textAlign: 'center',
    marginVertical: 6,
  },
  roastMeta: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.textInk,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roastQuote: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: LITE_THEME.textInk,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  roastVotesBadge: {
    alignSelf: 'center',
    backgroundColor: PALETTE.tomato,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roastVotesText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Points bank ───────────────────────────────
  pointsBlock: {
    position: 'relative',
    marginBottom: 20,
  },
  pointsShadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: -6,
    backgroundColor: PALETTE.espresso,
    borderRadius: 18,
  },
  pointsCard: {
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 18,
    backgroundColor: LITE_THEME.cardInner,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  pointsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: LITE_THEME.cardBorder,
    paddingBottom: 8,
  },
  pointsHeaderTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 18,
    color: LITE_THEME.titleRed,
    letterSpacing: 0.5,
  },
  pointsHeaderEmoji: {
    fontSize: 22,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: LITE_THEME.cardBorder,
  },
  pointsName: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: LITE_THEME.textInk,
    flex: 1,
    marginRight: 8,
  },
  pointsValuePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: LITE_THEME.primaryAction,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 64,
    justifyContent: 'center',
  },
  pointsValue: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 16,
    color: PALETTE.ink,
  },
  pointsUnit: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    opacity: 0.7,
  },

  // ── Bottom action ─────────────────────────────
  bottomActionArea: { marginTop: 4, paddingBottom: 8 },
});
