import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  PALETTE,
  LITE_THEME,
  LiteMutedText,
  LiteErrorText,
  LitePlayerCard,
  LiteBadge,
  LitePrimaryButton,
  LiteSecondaryButton,
  LiteTopBar,
} from '../components/DesignSystem';
import AnimatedClouds from '../components/AnimatedClouds';
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

  const chefCount = players.length === 1 ? '1 chef in kitchen' : `${players.length} chefs in kitchen`;
  const lobbySubtitle = isHost ? 'Build your cooking crew' : 'Waiting for chefs to join';
  const heroMeta = isHost
    ? `You are Host  ·  ${phase.toUpperCase()}`
    : `Waiting for Host  ·  ${phase.toUpperCase()}`;

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <AnimatedClouds minFrac={0.35} maxFrac={0.92} count={3} />

      <View style={styles.inner}>
        {/* ── Header ── */}
        <LiteTopBar title="Kitchen Lobby" showBack={false} />
        <View style={styles.subtitlePill}>
          <Text style={styles.subtitleText}>{lobbySubtitle}</Text>
        </View>

        {/* ── Scrollable cards ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Game Code card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>GAME CODE</Text>
            <Text style={styles.heroCode}>{gameCode || '----'}</Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroMeta}>{heroMeta}</Text>
          </View>

          {loading && <LiteMutedText style={styles.statusText}>Loading room…</LiteMutedText>}
          {!!error && <LiteErrorText style={styles.statusText}>Could not load room. Check connection and retry.</LiteErrorText>}
          {!loading && !room && <LiteMutedText style={styles.statusText}>Room not found yet. Retry in a moment.</LiteMutedText>}

          {/* Players card */}
          <View style={styles.playersCard}>
            <View style={styles.playersHeader}>
              <Text style={styles.playersTitle}>Players</Text>
              <View style={styles.chefCountPill}>
                <Text style={styles.chefCountText}>{chefCount}</Text>
              </View>
            </View>

            {players.map((p) => {
              const rLabel = getLiteRoleBadgeLabel(p.liteRole);
              const right =
                rLabel || p.isHost ? (
                  <View style={styles.playerBadges}>
                    {rLabel ? (
                      <LiteBadge label={rLabel} variant={getLiteRoleBadgeVariant(p.liteRole)} />
                    ) : null}
                    {p.isHost ? <LiteBadge label="HOST" variant="host" /> : null}
                  </View>
                ) : null;
              return <LitePlayerCard key={p.id} name={p.name} right={right} />;
            })}

            {players.length === 0 && (
              <Text style={styles.emptySlot}>No chefs yet — share the code!</Text>
            )}
          </View>
        </ScrollView>

        {/* ── Pinned action bar ── */}
        <View style={styles.actionBar}>
          {isHost && phase === 'waiting' && (
            <>
              <LiteSecondaryButton
                onPress={onAssignRoles}
                disabled={pendingAssign || loading || players.length < 2}
              >
                {pendingAssign ? 'Assigning…' : 'Assign Roles'}
              </LiteSecondaryButton>
              {players.length < 2 ? (
                <LiteMutedText style={styles.assignHint}>Need at least 2 players to assign roles.</LiteMutedText>
              ) : null}
              <LitePrimaryButton onPress={startSetup} disabled={pendingStart || loading}>
                {pendingStart ? 'Starting…' : 'Start Setup'}
              </LitePrimaryButton>
            </>
          )}
          {(phase === 'setup' || phase === 'cooking' || phase === 'voting' || phase === 'results') && (
            <LiteSecondaryButton onPress={continueByPhase} disabled={pendingContinue || loading}>
              {pendingContinue ? 'Opening…' : continueLabelByPhase}
            </LiteSecondaryButton>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LITE_THEME.screenBg,
  },

  // ── Shell ──────────────────────────────────────────
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Subtitle pill ──────────────────────────────────
  subtitlePill: {
    alignSelf: 'center',
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 8,
    marginBottom: 14,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subtitleText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    opacity: 0.8,
  },

  // ── Scroll region ─────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },

  // ── Hero code card ────────────────────────────────
  heroCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  heroLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: 4,
  },
  heroCode: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 52,
    color: LITE_THEME.titleRed,
    letterSpacing: 6,
    lineHeight: 60,
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  heroDivider: {
    width: 40,
    height: 2,
    backgroundColor: PALETTE.creamEdge,
    borderRadius: 1,
    marginVertical: 10,
  },
  heroMeta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.espresso,
    opacity: 0.65,
    textAlign: 'center',
  },

  // ── Status texts ──────────────────────────────────
  statusText: {
    marginBottom: 8,
  },

  // ── Players card ──────────────────────────────────
  playersCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    marginBottom: 10,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 5,
    elevation: 3,
  },
  playersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playersTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 18,
    color: LITE_THEME.titleRed,
  },
  chefCountPill: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chefCountText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  emptySlot: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // ── Pinned action bar ─────────────────────────────
  actionBar: {
    borderTopWidth: 2,
    borderTopColor: PALETTE.creamEdge,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 0,
  },
  assignHint: {
    marginTop: 4,
    marginBottom: 6,
  },
});
