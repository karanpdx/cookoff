import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PALETTE,
  ChunkyBtn,
  ChunkyCard,
  DrippyTitle,
  CloudBg,
} from '../components/DesignSystem';

// Generate confetti rectangles deterministically
const CONFETTI_COLORS = [
  PALETTE.yellow,
  PALETTE.tomato,
  PALETTE.leaf,
  PALETTE.grape,
  PALETTE.gold,
  PALETTE.red,
  '#FFFFFF',
];

const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 29) % 100,
  top: (i * 41) % 85,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: `${(i * 17) % 360}deg`,
}));

export default function ResultsScreen({ route, navigation }) {
  const { photoUri, playerName = 'Player', score } = route.params || {};

  const handlePlayAgain = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />

      {/* Confetti layer */}
      <View style={styles.confettiLayer} pointerEvents="none">
        {CONFETTI.map((c, i) => (
          <View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left: `${c.left}%`,
                top: `${c.top}%`,
                backgroundColor: c.color,
                transform: [{ rotate: c.rotate }],
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy + title */}
        <View style={styles.trophyRow}>
          <Text style={styles.trophyEmoji}>🏆</Text>
        </View>
        <DrippyTitle size={42} style={styles.titleSpacing}>Winner!</DrippyTitle>

        {/* Leaderboard card */}
        <ChunkyCard style={styles.cardSpacing}>
          {/* Photo or dish emoji */}
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.dishEmojiArea}>
              <Text style={styles.dishEmoji}>🍝</Text>
            </View>
          )}

          {/* 1st place */}
          <View style={styles.placeRow}>
            <View style={styles.placeBadge}>
              <Text style={styles.placeBadgeText}>1ST</Text>
            </View>
            <Text style={styles.placePlayerName}>{playerName}</Text>
            {score != null && (
              <Text style={styles.placeScore}>{score}.0</Text>
            )}
          </View>

          {/* Fake 2nd place */}
          <View style={[styles.placeRow, styles.placeRowMuted]}>
            <View style={[styles.placeBadge, styles.placeBadgeSilver]}>
              <Text style={styles.placeBadgeTextMuted}>2ND</Text>
            </View>
            <Text style={[styles.placePlayerName, styles.placePlayerNameMuted]}>Chef Alex</Text>
            <Text style={[styles.placeScore, styles.placeScoreMuted]}>7.5</Text>
          </View>

          {/* Fake 3rd place */}
          <View style={[styles.placeRow, styles.placeRowMuted]}>
            <View style={[styles.placeBadge, styles.placeBadgeBronze]}>
              <Text style={styles.placeBadgeTextMuted}>3RD</Text>
            </View>
            <Text style={[styles.placePlayerName, styles.placePlayerNameMuted]}>Chef Jordan</Text>
            <Text style={[styles.placeScore, styles.placeScoreMuted]}>6.2</Text>
          </View>
        </ChunkyCard>

        {/* Quote card */}
        <ChunkyCard bg={PALETTE.paper} style={styles.cardSpacing}>
          <Text style={styles.quoteText}>"Chef-level plating!"</Text>
        </ChunkyCard>

        {/* Buttons row */}
        <View style={styles.buttonRow}>
          <View style={styles.shareWrap}>
            <ChunkyBtn
              bg={PALETTE.paper}
              shadowColor={PALETTE.espresso}
              color={PALETTE.espresso}
              onPress={() => {}}
              small
            >
              Share
            </ChunkyBtn>
          </View>
          <View style={styles.playAgainWrap}>
            <ChunkyBtn
              bg={PALETTE.yellow}
              shadowColor={PALETTE.espresso}
              color={PALETTE.espresso}
              onPress={handlePlayAgain}
              small
            >
              Play Again
            </ChunkyBtn>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 14,
    borderRadius: 2,
    opacity: 0.75,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    zIndex: 1,
  },
  trophyRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  trophyEmoji: {
    fontSize: 50,
  },
  titleSpacing: {
    marginBottom: 20,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  photoThumb: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    marginBottom: 14,
  },
  dishEmojiArea: {
    height: 120,
    backgroundColor: PALETTE.cream,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
  },
  dishEmoji: {
    fontSize: 48,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.creamEdge,
    gap: 10,
  },
  placeRowMuted: {
    opacity: 0.45,
  },
  placeBadge: {
    backgroundColor: PALETTE.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    minWidth: 40,
    alignItems: 'center',
  },
  placeBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  placeBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  placeBadgeText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  placeBadgeTextMuted: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  placePlayerName: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: PALETTE.red,
    flex: 1,
  },
  placePlayerNameMuted: {
    color: PALETTE.espresso,
  },
  placeScore: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: PALETTE.leafDeep,
  },
  placeScoreMuted: {
    color: PALETTE.espresso,
  },
  quoteText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: PALETTE.red,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 26,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  shareWrap: {
    flex: 1,
  },
  playAgainWrap: {
    flex: 2,
  },
});
