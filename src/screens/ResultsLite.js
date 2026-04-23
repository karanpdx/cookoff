import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  LITE_THEME,
  LiteScreenTitle,
  LiteMutedText,
  LiteErrorText,
  LitePodiumWinner,
  LitePrimaryButton,
  LiteBadge,
  LITE_GAME_STYLES,
} from '../components/DesignSystem';
import { useLiteRoomPolling, getLiteRoleBadgeLabel, getLiteRoleBadgeVariant } from '../hooks/useLiteRoomPolling';

export default function ResultsLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, setPhase, patchRoom, loading, error } = useLiteRoomPolling(gameCode);
  const [pendingReset, setPendingReset] = React.useState(false);

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
  const funniestRoast = room?.funniestRoastLite || null;

  const winner = ranked[0] || room?.winnerLite || null;

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

  const winnerScore = winner ? `${winner.finalScore ?? winner.score ?? winner.scoreLite ?? 0} pts` : '';

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <View style={styles.inner}>
        <LiteScreenTitle>Winner Circle</LiteScreenTitle>
        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}
        {winner ? (
          <LitePodiumWinner name={winner.name} scoreText={winnerScore} />
        ) : (
          <Text style={styles.noWinner}>No winner yet</Text>
        )}
        <View style={styles.list}>
          {ranked.map((p) => {
            const rl = getLiteRoleBadgeLabel(p.liteRole);
            const rankLabel = p.id === ranked?.[0]?.id ? '1st Pick' : p.id === ranked?.[1]?.id ? '2nd Pick' : p.id === ranked?.[2]?.id ? '3rd Pick' : '';
            return (
              <View key={p.id} style={LITE_GAME_STYLES.scoreRow}>
                <View style={styles.resultNameBlock}>
                  <Text style={LITE_GAME_STYLES.scoreRowName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {rl ? <LiteBadge label={rl} variant={getLiteRoleBadgeVariant(p.liteRole)} /> : null}
                </View>
                <View style={LITE_GAME_STYLES.scorePill}>
                  <Text style={LITE_GAME_STYLES.scorePillText}>
                    {p.hasScore ? `${p.finalScore} pts` : 'No score yet'}
                  </Text>
                </View>
                {!!rankLabel && (
                  <View style={styles.rankPickPill}>
                    <Text style={styles.rankPickText}>{rankLabel}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.pointsSummaryCard}>
          <Text style={styles.pointsSummaryTitle}>Points Summary</Text>
          {(Array.isArray(room?.players) ? room.players : []).map((p) => (
            <View key={`pts-${p.id}`} style={styles.pointsSummaryRow}>
              <Text style={styles.pointsSummaryName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.pointsSummaryValue}>{`${Math.max(0, Math.floor(Number(litePoints[p.id]) || 0))} pts`}</Text>
            </View>
          ))}
        </View>
        {funniestRoast ? (
          <View style={styles.roastSummaryCard}>
            <Text style={styles.roastSummaryTitle}>Funniest Burn (+20 pts)</Text>
            <Text style={styles.roastSummaryMeta}>
              {funniestRoast.playerName} • {String(funniestRoast.role || '').toUpperCase()}
            </Text>
            <Text style={styles.roastSummaryText}>"{funniestRoast.text}"</Text>
            <Text style={styles.roastSummaryVotes}>{`${funniestRoast.voteCount || 0} votes`}</Text>
          </View>
        ) : null}
        {isHost && (
          <LitePrimaryButton onPress={playAgain} disabled={pendingReset || loading}>
            {pendingReset ? 'Resetting...' : 'Host: Back to Waiting'}
          </LitePrimaryButton>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LITE_THEME.screenBg },
  inner: { flex: 1, padding: LITE_THEME.contentPadding, paddingTop: LITE_THEME.contentPaddingTop },
  noWinner: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: LITE_THEME.text,
    marginBottom: 14,
  },
  list: { marginBottom: 20 },
  resultNameBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  rankPickPill: {
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: LITE_THEME.cardInner,
    marginLeft: 6,
  },
  rankPickText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: LITE_THEME.textInk,
  },
  pointsSummaryCard: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  pointsSummaryTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: LITE_THEME.titleRed,
    marginBottom: 8,
  },
  pointsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pointsSummaryName: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.textInk,
    flex: 1,
    marginRight: 8,
  },
  pointsSummaryValue: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.text,
  },
  roastSummaryCard: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  roastSummaryTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: LITE_THEME.titleRed,
    marginBottom: 6,
  },
  roastSummaryMeta: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.textInk,
    marginBottom: 6,
  },
  roastSummaryText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    marginBottom: 6,
  },
  roastSummaryVotes: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.text,
  },
});
