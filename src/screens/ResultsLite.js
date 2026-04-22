import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChunkyBtn, CloudBg, PALETTE } from '../components/DesignSystem';
import { useLiteRoomPolling } from '../hooks/useLiteRoomPolling';

export default function ResultsLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, setPhase, patchRoom, loading, error } = useLiteRoomPolling(gameCode);
  const [pendingReset, setPendingReset] = React.useState(false);

  const ranked = useMemo(() => {
    const players = Array.isArray(room?.players) ? room.players : [];
    return [...players].sort((a, b) => (b.scoreLite || 0) - (a.scoreLite || 0));
  }, [room?.players]);

  const winner = room?.winnerLite || ranked[0] || null;

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
        winnerLite: null,
      });
      await setPhase('waiting');
      navigation.replace('WaitingRoomLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingReset(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <View style={styles.inner}>
        <Text style={styles.title}>Results Lite</Text>
        {loading && <Text style={styles.info}>Loading room...</Text>}
        {!!error && <Text style={styles.error}>Could not load room. Check connection and retry.</Text>}
        {!loading && !room && <Text style={styles.info}>Room data missing. Retry in a moment.</Text>}
        {winner ? (
          <Text style={styles.winner}>
            Winner: {winner.name} ({winner.score ?? winner.scoreLite ?? 0} votes)
          </Text>
        ) : (
          <Text style={styles.winner}>No winner yet</Text>
        )}
        <View style={styles.list}>
          {ranked.map((p) => (
            <Text key={p.id} style={styles.player}>
              {p.name} - {p.scoreLite || 0}
            </Text>
          ))}
        </View>
        {isHost && (
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={playAgain}
            disabled={pendingReset || loading}
          >
            {pendingReset ? 'Resetting...' : 'Host: Back to Waiting'}
          </ChunkyBtn>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, padding: 20, paddingTop: 80 },
  title: { fontFamily: 'TitanOne_400Regular', fontSize: 34, color: PALETTE.red, marginBottom: 12 },
  info: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, color: PALETTE.espresso, marginBottom: 6 },
  error: { fontFamily: 'Fredoka_700Bold', fontSize: 13, color: PALETTE.red, marginBottom: 6 },
  winner: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: PALETTE.espresso, marginBottom: 14 },
  list: { marginBottom: 20 },
  player: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, color: PALETTE.ink, marginBottom: 8 },
});
