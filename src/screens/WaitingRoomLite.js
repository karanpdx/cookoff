import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChunkyBtn, CloudBg, PALETTE } from '../components/DesignSystem';
import { useLiteRoomPolling } from '../hooks/useLiteRoomPolling';

export default function WaitingRoomLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, setPhase, loading, error } = useLiteRoomPolling(gameCode);
  const [pendingStart, setPendingStart] = React.useState(false);
  const [pendingContinue, setPendingContinue] = React.useState(false);
  const roleLabel = isHost ? 'host-create' : 'joiner-join';

  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);
  const phase = room?.phase || 'waiting';
  React.useEffect(() => {
    console.log('[LITE FLOW]', 'WaitingRoomLite enter', { role: roleLabel, gameCode: gameCode || '' });
  }, [roleLabel, gameCode]);

  const startSetup = async () => {
    if (!isHost || pendingStart) return;
    setPendingStart(true);
    try {
      await setPhase('setup');
      navigation.navigate('SetupLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingStart(false);
    }
  };

  const continueByPhase = () => {
    if (pendingContinue || loading) return;
    setPendingContinue(true);
    if (phase === 'setup') {
      if (!isHost) console.log('[LITE NAV] joiner -> SetupLite');
      navigation.navigate('SetupLite', { gameCode, playerName, playerId, isHost });
      setPendingContinue(false);
      return;
    }
    if (phase === 'cooking') {
      if (!isHost) console.log('[LITE NAV] joiner -> CookingLite');
      navigation.navigate('CookingLite', { gameCode, playerName, playerId, isHost });
      setPendingContinue(false);
      return;
    }
    if (phase === 'voting') {
      if (!isHost) console.log('[LITE NAV] joiner -> VotingLite');
      navigation.navigate('VotingLite', { gameCode, playerName, playerId, isHost });
      setPendingContinue(false);
      return;
    }
    if (phase === 'results') {
      if (!isHost) console.log('[LITE NAV] joiner -> ResultsLite');
      navigation.navigate('ResultsLite', { gameCode, playerName, playerId, isHost });
      setPendingContinue(false);
      return;
    }
    setPendingContinue(false);
  };

  const continueLabelByPhase =
    phase === 'setup'
      ? 'Continue to Setup'
      : phase === 'cooking'
      ? 'Continue to Cooking'
      : phase === 'voting'
      ? 'Continue to Voting'
      : phase === 'results'
      ? 'Continue to Results'
      : '';

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <View style={styles.inner}>
        <Text style={styles.title}>Waiting Room Lite</Text>
        <Text style={styles.code}>Code: {gameCode || '----'}</Text>
        <Text style={styles.subtitle}>
          {isHost ? 'You are Host' : 'Waiting for Host'} • Phase: {phase.toUpperCase()}
        </Text>
        {loading && <Text style={styles.info}>Loading room...</Text>}
        {!!error && <Text style={styles.error}>Could not load room. Check connection and retry.</Text>}
        {!loading && !room && <Text style={styles.info}>Room not found yet. Retry in a moment.</Text>}
        <View style={styles.list}>
          {players.map((p) => (
            <Text key={p.id} style={styles.player}>{`\u2022 ${p.name}${p.isHost ? ' (Host)' : ''}`}</Text>
          ))}
        </View>
        {isHost && phase === 'waiting' && (
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={startSetup}
            disabled={pendingStart || loading}
          >
            {pendingStart ? 'Starting...' : 'Start Setup'}
          </ChunkyBtn>
        )}
        {(phase === 'setup' || phase === 'cooking' || phase === 'voting' || phase === 'results') && (
          <ChunkyBtn
            bg={PALETTE.leaf}
            shadowColor={PALETTE.espresso}
            color="#FFFFFF"
            onPress={continueByPhase}
            disabled={pendingContinue || loading}
          >
            {pendingContinue ? 'Opening...' : continueLabelByPhase}
          </ChunkyBtn>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, padding: 20, paddingTop: 80 },
  title: { fontFamily: 'TitanOne_400Regular', fontSize: 34, color: PALETTE.red, marginBottom: 10 },
  code: { fontFamily: 'Fredoka_700Bold', fontSize: 22, color: PALETTE.espresso, marginBottom: 8 },
  subtitle: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, color: PALETTE.espresso, marginBottom: 14 },
  info: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, color: PALETTE.espresso, marginBottom: 8 },
  error: { fontFamily: 'Fredoka_700Bold', fontSize: 13, color: PALETTE.red, marginBottom: 8 },
  list: { marginBottom: 20 },
  player: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, color: PALETTE.ink, marginBottom: 8 },
});
