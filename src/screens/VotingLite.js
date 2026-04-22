import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChunkyBtn, CloudBg, PALETTE } from '../components/DesignSystem';
import { useLiteRoomPolling } from '../hooks/useLiteRoomPolling';

export default function VotingLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, castVoteLite, finalizeResultsLite, loading, error } = useLiteRoomPolling(gameCode);
  const [selected, setSelected] = useState(null);
  const [pendingVote, setPendingVote] = useState(false);
  const [pendingFinalize, setPendingFinalize] = useState(false);

  const phase = room?.phase || 'voting';
  const players = useMemo(
    () => (Array.isArray(room?.players) ? room.players.filter((p) => p.dishName || p.photoUri) : []),
    [room?.players]
  );
  const hasVoted = Boolean((room?.votesLite || {})[playerId]);

  React.useEffect(() => {
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  const submitVote = async () => {
    if (!playerId || !selected || hasVoted || pendingVote) return;
    setPendingVote(true);
    try {
      await castVoteLite(playerId, selected);
    } finally {
      setPendingVote(false);
    }
  };

  const finalize = async () => {
    if (!isHost || pendingFinalize) return;
    setPendingFinalize(true);
    try {
      await finalizeResultsLite();
    } finally {
      setPendingFinalize(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <View style={styles.inner}>
        <Text style={styles.title}>Voting Lite</Text>
        {loading && <Text style={styles.info}>Loading room...</Text>}
        {!!error && <Text style={styles.error}>Could not load room. Check connection and retry.</Text>}
        {!loading && !room && <Text style={styles.info}>Room data missing. Retry in a moment.</Text>}
        {players.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.playerCard, selected === p.id && styles.playerCardSelected]}
            onPress={() => setSelected(p.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.playerName}>{p.name}</Text>
            <Text style={styles.dishName}>{p.dishName || 'Untitled Dish'}</Text>
          </TouchableOpacity>
        ))}
        <ChunkyBtn
          bg={PALETTE.leaf}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          onPress={submitVote}
          disabled={!selected || hasVoted || pendingVote || loading}
        >
          {hasVoted ? 'Vote submitted' : pendingVote ? 'Submitting...' : 'Submit Vote'}
        </ChunkyBtn>
        {isHost && (
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={finalize}
            disabled={pendingFinalize || loading}
          >
            {pendingFinalize ? 'Finalizing...' : 'Host: Finalize Results'}
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
  playerCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  playerCardSelected: { borderColor: PALETTE.leaf },
  playerName: { fontFamily: 'Fredoka_700Bold', fontSize: 16, color: PALETTE.espresso },
  dishName: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, color: PALETTE.ink },
});
