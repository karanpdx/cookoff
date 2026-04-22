import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, ChunkyBtn } from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useRoomSync } from '../hooks/useRoomSync';
import { useFirebaseRoom } from '../hooks/useFirebaseRoom';

const CARDS = [
  {
    id: 'freeze',
    emoji: '❄️',
    title: 'Freeze',
    description: "+2 min to opponent's timer",
    tag: '+2min',
    bg: '#A8DCF2',
  },
  {
    id: 'swap',
    emoji: '🔄',
    title: 'Swap',
    description: 'Force opponent to swap one ingredient',
    tag: 'ingredient',
    bg: PALETTE.yellow,
  },
  {
    id: 'wildcard',
    emoji: '🎲',
    title: 'Wildcard',
    description: 'Surprise constraint added',
    tag: 'random',
    bg: PALETTE.grape,
  },
];

const COUNTDOWN_MS = 1000;

// Generate star particle positions deterministically
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
}));

function SabotageCard({ card, index, onClaimed, externallyClaimed }) {
  const [count, setCount] = useState(3);
  const [revealed, setRevealed] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const revealOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(0.6)).current;
  const claimedOverlayOpacity = useRef(new Animated.Value(0)).current;
  const claimedScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    let cancelled = false;
    const startDelay = index * 350;
    const outer = setTimeout(() => {
      let remaining = 3;
      const tick = () => {
        if (cancelled) return;
        if (remaining === 0) {
          if (!cancelled) {
            setRevealed(true);
            Animated.timing(revealOpacity, {
              toValue: 1,
              duration: 450,
              useNativeDriver: true,
            }).start();
          }
          return;
        }
        setCount(remaining);
        countdownScale.setValue(0.5);
        Animated.spring(countdownScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
        remaining -= 1;
        setTimeout(tick, COUNTDOWN_MS);
      };
      tick();
    }, startDelay);
    return () => {
      cancelled = true;
      clearTimeout(outer);
    };
  }, [index, countdownScale, revealOpacity]);

  useEffect(() => {
    if (!externallyClaimed || claimed) return;
    setClaimed(true);
    claimedOverlayOpacity.setValue(1);
    claimedScale.setValue(1);
  }, [externallyClaimed, claimed, claimedOverlayOpacity, claimedScale]);

  const handlePress = useCallback(() => {
    if (!revealed || claimed) return;
    setClaimed(true);
    onClaimed?.(card);
    claimedOverlayOpacity.setValue(0);
    claimedScale.setValue(0.6);
    Animated.parallel([
      Animated.timing(claimedOverlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(claimedScale, {
        toValue: 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [revealed, claimed, onClaimed, card, claimedOverlayOpacity, claimedScale]);

  return (
    <TouchableOpacity
      style={styles.cardOuter}
      onPress={handlePress}
      activeOpacity={0.92}
      disabled={!revealed || claimed}
    >
      {/* 3D shadow */}
      <View style={[styles.cardShadow, { top: 5 }]} />
      <View style={[styles.card, { backgroundColor: card.bg }]}>
        {!revealed && (
          <View style={styles.countdownWrap}>
            <Animated.Text
              style={[styles.countdownDigit, { transform: [{ scale: countdownScale }] }]}
            >
              {count}
            </Animated.Text>
          </View>
        )}

        <Animated.View style={[styles.cardFace, { opacity: revealOpacity }]}>
          <Text style={styles.cardEmoji}>{card.emoji}</Text>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{card.tag}</Text>
          </View>
        </Animated.View>

        {claimed && (
          <Animated.View
            style={[styles.claimedOverlay, { opacity: claimedOverlayOpacity }]}
            pointerEvents="none"
          >
            <Animated.Text
              style={[styles.claimedText, { transform: [{ scale: claimedScale }] }]}
            >
              CLAIMED! 🔥
            </Animated.Text>
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function mergePowerInventory(existing, claimedList) {
  const inv = Array.isArray(existing) && existing.length === 3 ? [...existing] : [null, null, null];
  for (const card of claimedList) {
    const emptyIdx = inv.findIndex((s) => s == null);
    if (emptyIdx === -1) break;
    inv[emptyIdx] = {
      id: card.id,
      title: card.title,
      emoji: card.emoji,
      tag: card.tag,
    };
  }
  return inv;
}

export default function SabotageScreen({ route, navigation }) {
  const cookingParams = route.params || {};
  const { gameCode, playerId } = cookingParams;
  const { room, updateRoom } = useRoomSync(gameCode);
  const { claimSabotageCard, getPlayerId } = useFirebaseRoom();
  const [selfId, setSelfId] = useState(playerId || null);
  const [claimedCards, setClaimedCards] = useState([]);
  const hasRoom = Boolean(room);
  const sabotageCardsCount = room?.sabotageCards?.length ?? 0;
  const roomCards = Array.isArray(room?.sabotageCards) && room.sabotageCards.length
    ? room.sabotageCards
    : CARDS.map((c) => ({ ...c, claimedBy: null }));

  useEffect(() => {
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

  useEffect(() => {
    if (!hasRoom || sabotageCardsCount > 0) return;
    const seedCards = CARDS.map((c) => ({ ...c, claimedBy: null }));
    updateRoom({ sabotageCards: seedCards }).catch(() => {});
  }, [hasRoom, sabotageCardsCount, updateRoom]);

  const handleCardClaimed = useCallback(
    async (card) => {
      if (!gameCode || !selfId || !hasRoom) {
        setClaimedCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]));
        return;
      }
      try {
        await claimSabotageCard(gameCode, card.id, selfId);
        setClaimedCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]));
      } catch {
        // another player won the claim first
      }
    },
    [claimSabotageCard, gameCode, selfId, hasRoom]
  );

  const handleBackToCooking = () => {
    const merged = mergePowerInventory(cookingParams.powerInventory, claimedCards);
    navigation.navigate('CookingChallenge', {
      ...cookingParams,
      powerInventory: merged,
    });
  };

  return (
    <LinearGradient
      colors={['#2D1845', '#1A0F2E']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <ScreenBackButton navigation={navigation} onPress={handleBackToCooking} />
        {/* Star particles */}
        <View style={styles.starsContainer} pointerEvents="none">
          {STARS.map((s, i) => (
            <View
              key={i}
              style={[
                styles.star,
                { left: `${s.left}%`, top: `${s.top}%` },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.screenTitle}>SABOTAGE 🃏</Text>
          <Text style={styles.screenSubtitle}>FIRST TAP WINS</Text>

          {/* Cards grid */}
          <View style={styles.cardsGrid}>
            {roomCards.map((card, index) => (
              <SabotageCard
                key={card.id}
                card={card}
                index={index}
                onClaimed={handleCardClaimed}
                externallyClaimed={Boolean(card.claimedBy)}
              />
            ))}
          </View>

          {/* Back button */}
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={handleBackToCooking}
            style={styles.backBtn}
          >
            ← Back to Cooking
          </ChunkyBtn>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFE066',
    opacity: 0.5,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  screenTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 40,
    color: PALETTE.gold,
    textAlign: 'center',
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: '#FFE7A0',
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 24,
  },
  cardOuter: {
    width: '47%',
    position: 'relative',
    marginBottom: 5,
  },
  cardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -5,
    height: 120,
    backgroundColor: PALETTE.espresso,
    borderRadius: 18,
  },
  card: {
    height: 120,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  countdownWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownDigit: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 56,
    color: PALETTE.espresso,
  },
  cardFace: {
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 30,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 16,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(59,43,30,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: PALETTE.espresso + '88',
  },
  tagText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  claimedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,12,16,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  claimedText: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: PALETTE.tomato,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 4,
  },
});
