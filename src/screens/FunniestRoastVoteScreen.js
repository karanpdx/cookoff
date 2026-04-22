import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE, ChunkyBtn, ChunkyCard, CloudBg, DrippyTitle } from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useGameSession } from '../context/GameSessionContext';
import { useRoomSync } from '../hooks/useRoomSync';
import { useFirebaseRoom } from '../hooks/useFirebaseRoom';

export default function FunniestRoastVoteScreen({ route, navigation }) {
  const { playerName, role, gameCode, playerId } = route.params || {};
  const { room } = useRoomSync(gameCode);
  const { getPlayerId, upvoteRoast } = useFirebaseRoom();
  const { cookingRoasts, upvoteCookingRoast } = useGameSession();
  const [selfId, setSelfId] = React.useState(playerId || null);
  const canUpvote = role !== 'COMPETITOR';

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (selfId) return;
      const id = await getPlayerId();
      if (mounted) setSelfId(id);
    })();
    return () => {
      mounted = false;
    };
  }, [selfId, getPlayerId]);
  const handleUpvote = async (roastId) => {
    if (!canUpvote) return;
    if (room && gameCode) {
      try {
        await upvoteRoast(gameCode, roastId, selfId || 'anon');
        return;
      } catch {
        // local fallback below
      }
    }
    upvoteCookingRoast(roastId);
  };


  const roastSource = Array.isArray(room?.roasts) && room.roasts.length ? room.roasts : cookingRoasts;
  const sorted = [...roastSource].sort((a, b) => b.votes - a.votes);
  const top = sorted[0];

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DrippyTitle size={30}>Roast Playoffs</DrippyTitle>
        <ChunkyCard style={styles.subCard}>
          <Text style={styles.sub}>
            Upvote the funniest anonymous roast. Winner earns bonus engagement points!
          </Text>
        </ChunkyCard>

        {sorted.length === 0 ? (
          <ChunkyCard style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔥</Text>
            <Text style={styles.empty}>No roasts yet — judges need to spice it up next round.</Text>
          </ChunkyCard>
        ) : (
          sorted.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.roastText}>{r.text}</Text>
              <View style={styles.row}>
                <Text style={styles.votes}>{r.votes} votes</Text>
                <TouchableOpacity
                  style={[styles.up, !canUpvote && styles.upDisabled]}
                  onPress={() => handleUpvote(r.id)}
                  disabled={!canUpvote}
                  activeOpacity={0.85}
                >
                  <Text style={styles.upText}>{canUpvote ? '▲ Upvote' : 'View only'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {top && (
          <View style={styles.winner}>
            <Text style={styles.winnerLabel}>Leading roast</Text>
            <Text style={styles.winnerText} numberOfLines={3}>
              {top.text}
            </Text>
            <Text style={styles.bonus}>+{50 + top.votes * 10} bonus engagement pts (mock)</Text>
          </View>
        )}

        <ChunkyBtn
          bg={PALETTE.yellow}
          shadowColor={PALETTE.espresso}
          color={PALETTE.espresso}
          onPress={() => navigation.navigate('ResultsScreen', { playerName })}
        >
          See final results →
        </ChunkyBtn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  scroll: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40 },
  subCard: { marginBottom: 16 },
  emptyCard: { alignItems: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 40, marginBottom: 6 },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 0,
  },
  empty: { textAlign: 'center', fontFamily: 'Fredoka_600SemiBold', color: PALETTE.espresso },
  card: {
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  roastText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 15, color: PALETTE.ink, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  votes: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, color: PALETTE.espresso },
  up: {
    backgroundColor: PALETTE.tomato,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
  },
  upText: { fontFamily: 'Fredoka_700Bold', color: '#FFFFFF', fontSize: 13 },
  upDisabled: { backgroundColor: PALETTE.creamEdge },
  winner: {
    backgroundColor: PALETTE.gold + '44',
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  winnerLabel: { fontFamily: 'Fredoka_700Bold', fontSize: 12, marginBottom: 6 },
  winnerText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 15, color: PALETTE.ink },
  bonus: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, marginTop: 8, color: PALETTE.espresso },
});
