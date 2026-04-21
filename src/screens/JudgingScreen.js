import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PALETTE,
  ChunkyBtn,
  ChunkyCard,
  DrippyTitle,
  CloudBg,
  SectionLabel,
  AvatarCircle,
} from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { ChallengeHeaderCompact } from '../components/ChallengeCards';
import { useGameSession } from '../context/GameSessionContext';

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function JudgingScreen({ route, navigation }) {
  const {
    playerName = 'Judge',
    competitorName = 'Chef Riley',
    gameCode,
    cuisineType,
    modifiers = [],
    budget,
    skillLevel,
    avatarUri,
  } = route.params || {};
  const { kitchenChallenge, sessionRecipe } = useGameSession();
  const [score, setScore] = useState(7);
  const [roastDraft, setRoastDraft] = useState('');
  const [roasts, setRoasts] = useState([]);

  const handleSendRoast = () => {
    const t = roastDraft.trim();
    if (!t) return;
    setRoasts((prev) => [
      { id: Date.now().toString(), text: t, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev,
    ]);
    setRoastDraft('');
    Keyboard.dismiss();
  };

  const handleSubmitScore = () => {
    navigation.navigate('VotingScreen', {
      playerName,
      gameCode,
      role: 'JUDGE',
      cuisineType,
      modifiers,
      budget,
      skillLevel,
      avatarUri,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Judge badge */}
        <View style={styles.judgeBadgeRow}>
          <View style={styles.judgeBadgePill}>
            <Text style={styles.judgeBadgeText}>⚖️ JUDGE</Text>
          </View>
        </View>

        {kitchenChallenge && (
          <ChallengeHeaderCompact
            emoji={kitchenChallenge.emoji}
            title={kitchenChallenge.title}
            description={kitchenChallenge.description}
            style={styles.challengeBanner}
          />
        )}

        {sessionRecipe?.dishName ? (
          <View style={styles.recipePeek}>
            <Text style={styles.recipePeekLabel}>{"Tonight's target"}</Text>
            <Text style={styles.recipePeekTitle}>{sessionRecipe.dishName}</Text>
          </View>
        ) : null}

        {/* Title */}
        <DrippyTitle size={32} style={styles.titleSpacing}>The Verdict</DrippyTitle>

        {/* Competitor card */}
        <ChunkyCard style={styles.cardSpacing}>
          {/* Photo placeholder area */}
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderEmoji}>🍽️</Text>
          </View>

          {/* Competitor info */}
          <View style={styles.competitorRow}>
            <View style={styles.competitorInfo}>
              <Text style={styles.competitorLabel}>COMPETITOR</Text>
              <Text style={styles.competitorName}>{competitorName}</Text>
            </View>
            <AvatarCircle size={44} bg={PALETTE.leaf} emoji="👩‍🍳" imageUri={avatarUri} />
          </View>
        </ChunkyCard>

        {/* Score display */}
        <SectionLabel style={styles.scoreSectionLabel}>Your Score</SectionLabel>
        <View style={styles.scoreDisplayRow}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={styles.scoreOutOf}>/10</Text>
        </View>

        {/* Score picker */}
        <View style={styles.scorePickerRow}>
          {SCORES.map((n) => {
            const selected = n === score;
            return (
              <View key={n} style={[styles.scoreButtonWrapper, selected && styles.scoreButtonWrapperSelected]}>
                {/* 3D shadow */}
                <View
                  style={[
                    styles.scoreButtonShadow,
                    selected ? styles.scoreButtonShadowSelected : styles.scoreButtonShadowUnselected,
                  ]}
                />
                <TouchableOpacity
                  style={[
                    styles.scoreButton,
                    selected ? styles.scoreButtonSelected : styles.scoreButtonUnselected,
                  ]}
                  onPress={() => setScore(n)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.scoreButtonText,
                      selected ? styles.scoreButtonTextSelected : styles.scoreButtonTextUnselected,
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Anonymous roast */}
        <Text style={styles.roastSectionTitle}>ANONYMOUS ROAST 🔥</Text>
        <View style={styles.roastFeed}>
          {roasts.length === 0 ? (
            <Text style={styles.roastEmpty}>No roasts yet — the kitchen is too quiet.</Text>
          ) : (
            roasts.map((r) => (
              <View key={r.id} style={styles.roastBubble}>
                <Text style={styles.roastMeta}>{r.at}</Text>
                <Text style={styles.roastText}>{r.text}</Text>
              </View>
            ))
          )}
        </View>
        <View style={styles.roastInputRow}>
          <TextInput
            style={styles.roastInput}
            placeholder="Leave a roast…"
            placeholderTextColor={PALETTE.espresso + '55'}
            value={roastDraft}
            onChangeText={setRoastDraft}
            multiline
            maxLength={280}
          />
          <TouchableOpacity style={styles.roastSendBtn} onPress={handleSendRoast} activeOpacity={0.85}>
            <Text style={styles.roastSendText}>SEND</Text>
          </TouchableOpacity>
        </View>

        {/* Submit button */}
        <View style={styles.submitWrap}>
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={handleSubmitScore}
          >
            Lock In Score
          </ChunkyBtn>
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  scrollFlex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  judgeBadgeRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  judgeBadgePill: {
    backgroundColor: PALETTE.gold,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
  },
  judgeBadgeText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.ink,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  titleSpacing: {
    marginBottom: 20,
  },
  challengeBanner: {
    marginBottom: 12,
  },
  recipePeek: {
    alignSelf: 'stretch',
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  recipePeekLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  recipePeekTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 18,
    color: PALETTE.red,
  },
  cardSpacing: {
    marginBottom: 20,
  },
  photoPlaceholder: {
    height: 180,
    backgroundColor: PALETTE.cream,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderStyle: 'dashed',
  },
  photoPlaceholderEmoji: {
    fontSize: 56,
  },
  competitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competitorInfo: {
    flex: 1,
  },
  competitorLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 2,
  },
  competitorName: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 24,
    color: PALETTE.red,
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  scoreSectionLabel: {
    textAlign: 'center',
    marginBottom: 4,
  },
  scoreDisplayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreNumber: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 68,
    color: PALETTE.leafDeep,
    lineHeight: 72,
  },
  scoreOutOf: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: '#999999',
    marginBottom: 8,
    marginLeft: 4,
  },
  scorePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  roastSectionTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.tomato,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10,
  },
  roastFeed: {
    marginBottom: 12,
    gap: 8,
  },
  roastEmpty: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso + '99',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  roastBubble: {
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    padding: 10,
  },
  roastMeta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    color: PALETTE.espresso + '88',
    marginBottom: 4,
  },
  roastText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.ink,
  },
  roastInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  roastInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.ink,
  },
  roastSendBtn: {
    backgroundColor: PALETTE.tomato,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roastSendText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  scoreButtonWrapper: {
    position: 'relative',
    width: 80,
    height: 86,
    marginBottom: 8,
  },
  scoreButtonWrapperSelected: {
    width: 118,
    height: 124,
  },
  scoreButtonShadow: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 78,
    borderRadius: 18,
  },
  scoreButtonShadowSelected: {
    backgroundColor: PALETTE.leafDeep,
    height: 112,
    borderRadius: 24,
  },
  scoreButtonShadowUnselected: {
    backgroundColor: PALETTE.creamEdge,
  },
  scoreButton: {
    width: 80,
    height: 80,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButtonSelected: {
    backgroundColor: PALETTE.leaf,
    width: 118,
    height: 118,
    borderRadius: 24,
    borderWidth: 3,
  },
  scoreButtonUnselected: {
    backgroundColor: PALETTE.paper,
  },
  scoreButtonText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 32,
  },
  scoreButtonTextSelected: {
    color: '#FFFFFF',
  },
  scoreButtonTextUnselected: {
    color: PALETTE.espresso,
  },
  submitWrap: {
    marginTop: 4,
  },
});
