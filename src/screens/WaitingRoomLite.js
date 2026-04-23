import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  LITE_THEME,
  LiteHeroCode,
  LiteMutedText,
  LiteErrorText,
  LitePlayerCard,
  LiteBadge,
  LitePrimaryButton,
  LiteSecondaryButton,
  LiteScreenTitle,
  LiteSectionCard,
} from '../components/DesignSystem';
import {
  useLiteRoomPolling,
  LITE_ROLE,
  getLiteRoleBadgeLabel,
  getLiteRoleBadgeVariant,
} from '../hooks/useLiteRoomPolling';

export default function WaitingRoomLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, setPhase, assignLiteRoles, loading, error } = useLiteRoomPolling(gameCode);
  const [pendingStart, setPendingStart] = React.useState(false);
  const [pendingContinue, setPendingContinue] = React.useState(false);
  const [pendingAssign, setPendingAssign] = React.useState(false);
  const roleLabel = isHost ? 'host-create' : 'joiner-join';

  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);
  const selfMeta = useMemo(() => players.find((p) => p.id === playerId) || null, [players, playerId]);
  const phase = room?.phase || 'waiting';
  React.useEffect(() => {
    console.log('[LITE FLOW]', 'WaitingRoomLite enter', { role: roleLabel, gameCode: gameCode || '' });
  }, [roleLabel, gameCode]);

  const onAssignRoles = async () => {
    if (!isHost || pendingAssign || players.length < 2) return;
    setPendingAssign(true);
    try {
      await assignLiteRoles();
    } finally {
      setPendingAssign(false);
    }
  };

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
      if (selfMeta?.liteRole === LITE_ROLE.JUDGE) {
        if (!isHost) console.log('[LITE NAV] joiner -> VotingLite (judge)');
        navigation.navigate('VotingLite', { gameCode, playerName, playerId, isHost });
      } else {
        if (!isHost) console.log('[LITE NAV] joiner -> CookingLite');
        navigation.navigate('CookingLite', { gameCode, playerName, playerId, isHost });
      }
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
      ? selfMeta?.liteRole === LITE_ROLE.JUDGE
        ? "Go to Judge's Table"
        : selfMeta?.liteRole === LITE_ROLE.SPECTATOR
        ? 'Continue as Spectator'
        : 'Continue to Cooking'
      : phase === 'voting'
      ? 'Continue to Voting'
      : phase === 'results'
      ? 'Continue to Results'
      : '';

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <View style={styles.inner}>
        <LiteScreenTitle>Kitchen Lobby</LiteScreenTitle>
        <LiteHeroCode
          code={gameCode || '----'}
          subtitle={`${isHost ? 'You are Host' : 'Waiting for Host'} • Phase: ${phase.toUpperCase()}`}
        />
        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room not found yet. Retry in a moment.</LiteMutedText>}
        <LiteSectionCard title="Players">
          {players.map((p) => {
            const roleLabel = getLiteRoleBadgeLabel(p.liteRole);
            const right =
              roleLabel || p.isHost ? (
                <View style={styles.playerBadges}>
                  {roleLabel ? (
                    <LiteBadge label={roleLabel} variant={getLiteRoleBadgeVariant(p.liteRole)} />
                  ) : null}
                  {p.isHost ? <LiteBadge label="HOST" variant="host" /> : null}
                </View>
              ) : null;
            return <LitePlayerCard key={p.id} name={p.name} right={right} />;
          })}
        </LiteSectionCard>
        {isHost && phase === 'waiting' && (
          <>
            <LiteSecondaryButton
              onPress={onAssignRoles}
              disabled={pendingAssign || loading || players.length < 2}
            >
              {pendingAssign ? 'Assigning...' : 'Assign Roles'}
            </LiteSecondaryButton>
            {players.length < 2 ? (
              <LiteMutedText style={styles.assignHint}>Need at least 2 players to assign roles.</LiteMutedText>
            ) : null}
            <LitePrimaryButton onPress={startSetup} disabled={pendingStart || loading}>
              {pendingStart ? 'Starting...' : 'Start Setup'}
            </LitePrimaryButton>
          </>
        )}
        {(phase === 'setup' || phase === 'cooking' || phase === 'voting' || phase === 'results') && (
          <LiteSecondaryButton onPress={continueByPhase} disabled={pendingContinue || loading}>
            {pendingContinue ? 'Opening...' : continueLabelByPhase}
          </LiteSecondaryButton>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LITE_THEME.screenBg },
  inner: { flex: 1, padding: LITE_THEME.contentPadding, paddingTop: LITE_THEME.contentPaddingTop },
  playerBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  assignHint: { marginTop: 6, marginBottom: 4 },
});
