import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PALETTE,
  ChunkyBtn,
  CloudBg,
  DrippyTitle,
  SectionLabel,
} from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useGameSession } from '../context/GameSessionContext';

const COLS = 2;
const GAP = 10;
const PAD = 16;
const tileW = (Dimensions.get('window').width - PAD * 2 - GAP) / COLS;

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function VotingScreen({ route, navigation }) {
  const { role = 'SPECTATOR', playerName } = route.params || {};
  const { dishes, cookingRoasts } = useGameSession();
  const [spectatorVote, setSpectatorVote] = useState(null);
  const [judgeRatings, setJudgeRatings] = useState({});

  const isJudge = role === 'JUDGE';
  const isSpectator = role === 'SPECTATOR';

  const setJudgeScore = (dishId, n) => {
    setJudgeRatings((prev) => ({ ...prev, [dishId]: n }));
  };

  const continueToRoasts = () => {
    if (cookingRoasts.length > 0) {
      navigation.navigate('FunniestRoastVote', { role, playerName });
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DrippyTitle size={32}>Vote Gallery</DrippyTitle>
        <Text style={styles.sub}>All submitted dishes — pick a favorite or score each plate.</Text>

        {dishes.length === 0 ? (
          <Text style={styles.empty}>No dishes submitted yet. Competitors: plate up first!</Text>
        ) : (
          <View style={styles.grid}>
            {dishes.map((d) => (
              <View key={d.id} style={styles.tileWrap}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => (isSpectator ? setSpectatorVote(d.id) : null)}
                  style={[
                    styles.tile,
                    spectatorVote === d.id && isSpectator && styles.tileSelected,
                  ]}
                >
                  {d.photoUri ? (
                    <Image source={{ uri: d.photoUri }} style={styles.photo} />
                  ) : (
                    <View style={styles.ph} />
                  )}
                  <Text style={styles.dishName} numberOfLines={2}>
                    {d.dishName || 'Untitled dish'}
                  </Text>
                  <Text style={styles.chef}>{d.playerName}</Text>
                </TouchableOpacity>

                {isJudge && (
                  <View style={styles.judgeBlock}>
                    <Text style={styles.judgeLabel}>Your score</Text>
                    <View style={styles.scoreRow}>
                      {SCORES.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[
                            styles.miniScore,
                            judgeRatings[d.id] === n && styles.miniScoreOn,
                          ]}
                          onPress={() => setJudgeScore(d.id, n)}
                        >
                          <Text
                            style={[
                              styles.miniScoreText,
                              judgeRatings[d.id] === n && styles.miniScoreTextOn,
                            ]}
                          >
                            {n}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {isSpectator && spectatorVote && (
          <Text style={styles.voted}>You voted for a favorite dish! 🔥</Text>
        )}

        <SectionLabel style={styles.closeLabel}>Voting</SectionLabel>
        <Text style={styles.help}>
          {isJudge
            ? 'Rate every dish 1–10, then continue.'
            : isSpectator
              ? 'Tap a tile to vote for your favorite.'
              : 'Thanks for cooking — browse the gallery.'}
        </Text>

        <ChunkyBtn
          bg={PALETTE.leaf}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          onPress={continueToRoasts}
          style={styles.cta}
        >
          {cookingRoasts.length > 0 ? 'Continue to roast battle →' : 'Finish round →'}
        </ChunkyBtn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  scroll: { paddingTop: 56, paddingHorizontal: PAD, paddingBottom: 40 },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 16,
  },
  empty: {
    fontFamily: 'Fredoka_600SemiBold',
    textAlign: 'center',
    color: PALETTE.espresso,
    marginVertical: 24,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: 16 },
  tileWrap: { width: tileW, marginBottom: 12 },
  tile: {
    backgroundColor: PALETTE.cream,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    overflow: 'hidden',
  },
  tileSelected: { borderColor: PALETTE.leaf, backgroundColor: PALETTE.paper },
  photo: { width: '100%', height: tileW * 0.85 },
  ph: { width: '100%', height: tileW * 0.85, backgroundColor: PALETTE.creamEdge },
  dishName: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  chef: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    color: PALETTE.espresso + '99',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  judgeBlock: { marginTop: 8 },
  judgeLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    marginBottom: 6,
    color: PALETTE.espresso,
  },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniScore: {
    width: 26,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniScoreOn: { backgroundColor: PALETTE.gold },
  miniScoreText: { fontFamily: 'Fredoka_700Bold', fontSize: 11, color: PALETTE.espresso },
  miniScoreTextOn: { color: PALETTE.ink },
  voted: {
    fontFamily: 'Fredoka_700Bold',
    color: PALETTE.leaf,
    textAlign: 'center',
    marginBottom: 12,
  },
  closeLabel: { marginTop: 8 },
  help: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    marginBottom: 16,
    textAlign: 'center',
  },
  cta: { marginTop: 4 },
});
