import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AvatarCircle,
  PALETTE,
  CloudBg,
  CodePill,
  DrippyTitle,
  ChunkyBtn,
  SectionLabel,
} from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { ChallengeHeaderCompact } from '../components/ChallengeCards';
import { useGameSession } from '../context/GameSessionContext';
import { useRoomSync } from '../hooks/useRoomSync';
import { useFirebaseRoom } from '../hooks/useFirebaseRoom';

const SABOTAGE_COST = 50;
const DOUBLE_SABOTAGE_UNLOCK = 250;
const STEP_LABELS = ['Prep', 'Sear', 'Build sauce', 'Plate'];
const SABOTAGE_CARDS = [
  '🎲 Swap one ingredient',
  '⏱️ Freeze for 30 sec',
  '🧂 Add mystery spice',
  '🍋 Extra acid challenge',
  '🔪 One-hand chopping',
];

export default function SpectatorScreen({ route, navigation }) {
  const { playerName, gameCode, isHost, cuisineType, budget, skillLevel, avatarUri, playerId } = route.params || {};
  const { room } = useRoomSync(gameCode);
  const { getPlayerId } = useFirebaseRoom();
  const {
    dishes,
    kitchenChallenge,
    sessionRecipe,
    spectatorEngagementPoints,
    addSpectatorEngagementPoints,
  } = useGameSession();
  const [selfId, setSelfId] = useState(playerId || null);
  const [sponsoredThisRound, setSponsoredThisRound] = useState({});

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

  const competitors = useMemo(
    () => [
      { id: 'c1', name: 'Chef Aria', avatar: '👩‍🍳', step: STEP_LABELS[dishes.length > 0 ? 3 : 1] },
      { id: 'c2', name: 'Chef Leo', avatar: '🧑‍🍳', step: STEP_LABELS[dishes.length > 0 ? 3 : 2] },
      { id: 'c3', name: 'Chef Nia', avatar: '👨‍🍳', step: STEP_LABELS[dishes.length > 0 ? 3 : 0] },
    ],
    [dishes.length]
  );
  const isCookingDone = dishes.length > 0;
  const syncedPoints =
    (room?.players || []).find((p) => p.id === selfId)?.engagementPoints ?? spectatorEngagementPoints;
  const unlockProgress = Math.min(1, syncedPoints / DOUBLE_SABOTAGE_UNLOCK);

  const handleSponsorSabotage = (chef) => {
    if (sponsoredThisRound[chef.id]) return;
    if (syncedPoints < SABOTAGE_COST) {
      Alert.alert('Not enough points', `You need ${SABOTAGE_COST} engagement points to sponsor sabotage.`);
      return;
    }
    const randomCard = SABOTAGE_CARDS[Math.floor(Math.random() * SABOTAGE_CARDS.length)];
    setSponsoredThisRound((prev) => ({ ...prev, [chef.id]: true }));
    addSpectatorEngagementPoints(-SABOTAGE_COST);
    Alert.alert('Sabotage sponsored', `${chef.name} receives: ${randomCard}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <CodePill code={gameCode} isHost={isHost} style={styles.pill} />
        <AvatarCircle size={52} bg={PALETTE.paper} emoji="👨‍🍳" imageUri={avatarUri} style={styles.userAvatar} />
        {kitchenChallenge && (
          <ChallengeHeaderCompact
            emoji={kitchenChallenge.emoji}
            title={kitchenChallenge.title}
            description={kitchenChallenge.description}
            style={styles.challengeCompact}
          />
        )}
        <DrippyTitle size={34} style={styles.title}>
          Hype Squad
        </DrippyTitle>
        <Text style={styles.name}>Hey {playerName}!</Text>
        <Text style={styles.sub}>Farm points, sponsor chaos, and steer the leaderboard.</Text>

        <View style={styles.pointsCard}>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Engagement points</Text>
            <Text style={styles.pointsValue}>{syncedPoints}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${unlockProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {syncedPoints >= DOUBLE_SABOTAGE_UNLOCK
              ? 'Double Sabotage unlocked! 🃏🃏'
              : `${Math.max(0, DOUBLE_SABOTAGE_UNLOCK - syncedPoints)} pts to Double Sabotage unlock`}
          </Text>
        </View>

        {sessionRecipe?.dishName ? (
          <View style={styles.recipePeek}>
            <SectionLabel>Chef target dish</SectionLabel>
            <Text style={styles.recipePeekTitle}>{sessionRecipe.dishName}</Text>
            <Text style={styles.recipePeekHint} numberOfLines={3}>
              {(sessionRecipe.ingredients || []).slice(0, 4).join(' · ')}
            </Text>
          </View>
        ) : null}

        <Text style={styles.feedTitle}>LIVE FEED</Text>
        {competitors.map((chef) => {
          const sponsored = !!sponsoredThisRound[chef.id];
          return (
            <View key={chef.id} style={styles.feedCard}>
              <View style={styles.feedLeft}>
                <AvatarCircle size={50} emoji={chef.avatar} bg={PALETTE.yellow} />
                <View style={styles.feedMeta}>
                  <Text style={styles.chefName}>{chef.name}</Text>
                  <Text style={styles.chefStep}>Current step: {chef.step}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.sponsorBtn, sponsored && styles.sponsorBtnDisabled]}
                disabled={sponsored}
                onPress={() => handleSponsorSabotage(chef)}
                activeOpacity={0.85}
              >
                <Text style={styles.sponsorBtnText}>
                  {sponsored ? 'SPONSORED ✅' : 'SPONSOR SABOTAGE 🃏'}
                </Text>
                {!sponsored && <Text style={styles.sponsorCost}>-50 pts</Text>}
              </TouchableOpacity>
            </View>
          );
        })}

        <ChunkyBtn
          bg={PALETTE.yellow}
          shadowColor={PALETTE.espresso}
          color={PALETTE.espresso}
          onPress={() => navigation.navigate('MiniGameMenu', route.params)}
          style={styles.btn}
        >
          🎮 PLAY MINI-GAME
        </ChunkyBtn>

        <ChunkyBtn
          bg={PALETTE.tomato}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          onPress={() => navigation.navigate('Betting', route.params)}
          style={styles.btn}
        >
          💰 BET ON WINNER
        </ChunkyBtn>

        <ChunkyBtn
          bg={PALETTE.leaf}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          disabled={!isCookingDone}
          onPress={() =>
            navigation.navigate('VotingScreen', {
              ...route.params,
              role: 'SPECTATOR',
            })
          }
          style={styles.btn}
        >
          🗳️ VOTE ON DISHES
        </ChunkyBtn>

        <ChunkyBtn
          bg={PALETTE.paper}
          shadowColor={PALETTE.espresso}
          color={PALETTE.espresso}
          disabled={isCookingDone}
          onPress={() => navigation.navigate('RoastSendModal', route.params)}
          style={styles.btn}
        >
          🔥 SEND ROAST
        </ChunkyBtn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 120, alignItems: 'center' },
  pill: { marginBottom: 16 },
  userAvatar: { marginBottom: 10 },
  challengeCompact: { alignSelf: 'stretch', marginBottom: 10 },
  recipePeek: {
    alignSelf: 'stretch',
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  recipePeekTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 17,
    color: PALETTE.red,
    marginBottom: 6,
  },
  recipePeekHint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.espresso,
    lineHeight: 18,
  },
  title: { marginBottom: 6 },
  name: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 20,
    color: PALETTE.espresso,
    marginBottom: 4,
  },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  pointsCard: {
    alignSelf: 'stretch',
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
  },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsLabel: { fontFamily: 'Fredoka_700Bold', color: PALETTE.espresso, fontSize: 14 },
  pointsValue: { fontFamily: 'TitanOne_400Regular', color: PALETTE.red, fontSize: 30 },
  progressTrack: {
    marginTop: 8,
    height: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.creamEdge,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: PALETTE.leaf },
  progressHint: {
    marginTop: 8,
    fontFamily: 'Fredoka_600SemiBold',
    color: PALETTE.espresso,
    fontSize: 12,
  },
  feedTitle: {
    fontFamily: 'Fredoka_700Bold',
    letterSpacing: 2,
    color: PALETTE.tomato,
    marginBottom: 8,
  },
  feedCard: {
    alignSelf: 'stretch',
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  feedMeta: { flex: 1 },
  chefName: { fontFamily: 'Fredoka_700Bold', fontSize: 15, color: PALETTE.ink },
  chefStep: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, color: PALETTE.espresso },
  sponsorBtn: {
    minWidth: 122,
    backgroundColor: PALETTE.grape,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorBtnDisabled: { backgroundColor: PALETTE.leafDeep },
  sponsorBtnText: { fontFamily: 'Fredoka_700Bold', fontSize: 11, color: '#FFFFFF', textAlign: 'center' },
  sponsorCost: { fontFamily: 'Fredoka_600SemiBold', fontSize: 10, color: '#FFFFFF' },
  btn: { alignSelf: 'stretch', marginTop: 2, marginBottom: 10 },
});
