import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  LITE_THEME,
  LiteScreenTitle,
  LiteMutedText,
  LiteErrorText,
  LiteSectionCard,
  LiteFieldLabel,
  liteInputStyle,
  LitePrimaryButton,
  LiteSecondaryButton,
  LiteCardBody,
  LitePlayerCard,
  LiteBadge,
} from '../components/DesignSystem';
import {
  buildSimpleRecipe,
  useLiteRoomPolling,
  getLiteRoleBadgeLabel,
  getLiteRoleBadgeVariant,
} from '../hooks/useLiteRoomPolling';
import { generateLiteChallengeRecipe } from '../services/kitchenClaude';

const DEMO_CHALLENGE = {
  challengeTitle: 'Guacamole Showdown',
  shortDescription: 'A fast, fresh guacamole round using simple ingredients and clean prep.',
  cuisineType: 'Mexican',
  skillLevel: 'Beginner',
  budget: 15,
  cookTimeTarget: 6,
  demoModeLite: true,
};

const DEMO_RECIPE = {
  dishName: 'Fresh Guacamole',
  cookTime: 6,
  estimatedCost: 15,
  ingredients: ['3 avocados', '1 lime', '1/4 onion', '1 tomato', 'salt', 'optional cilantro'],
  steps: [
    'Scoop avocados into bowl',
    'Dice onion and tomato',
    'Add lime juice and salt',
    'Mash and mix',
    'Taste and plate',
  ],
};

export default function SetupLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, saveChallengeAndRecipe, patchRoom, loading, error } = useLiteRoomPolling(gameCode);

  React.useEffect(() => {
    if (!__DEV__) return;
    const v = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    console.log(
      '[SetupLite] EXPO_PUBLIC_OPENAI_API_KEY typeof:',
      typeof v,
      'defined:',
      v != null && String(v).trim() !== ''
    );
  }, []);
  const phase = room?.phase || 'setup';
  const [pendingContinue, setPendingContinue] = useState(false);
  const [pendingJoinerContinue, setPendingJoinerContinue] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const generatingAiRef = useRef(false);
  const [aiError, setAiError] = useState(null);
  const [aiDraft, setAiDraft] = useState(null);

  const [cuisineType, setCuisineType] = useState('French');
  const [budget, setBudget] = useState('25');
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [cookTimeTarget, setCookTimeTarget] = useState('20');

  const challenge = useMemo(
    () => ({
      cuisineType: cuisineType.trim() || 'Chef Special',
      budget: Number(budget) || 20,
      skillLevel: skillLevel.trim() || 'Beginner',
      cookTimeTarget: Number(cookTimeTarget) || 20,
      createdAt: Date.now(),
    }),
    [cuisineType, budget, skillLevel, cookTimeTarget]
  );

  /** Local draft or room-synced AI result — for preview + Regenerate label only. */
  const aiPreview = useMemo(() => {
    if (aiDraft?.challenge && aiDraft?.recipe) return aiDraft;
    if (room?.liteAiGenerated && room?.challenge && room?.recipeLite) {
      return { challenge: room.challenge, recipe: room.recipeLite };
    }
    return null;
  }, [aiDraft, room?.liteAiGenerated, room?.challenge, room?.recipeLite]);

  const players = useMemo(() => (Array.isArray(room?.players) ? room.players : []), [room?.players]);

  const hostBusy = pendingContinue || generatingAi || loading;

  const generateAiChallenge = async () => {
    if (generatingAi) return;
    if (generatingAiRef.current) return;
    if (!isHost || pendingContinue) return;
    generatingAiRef.current = true;
    setGeneratingAi(true);
    setAiError(null);
    try {
      const parsed = await generateLiteChallengeRecipe({
        cuisineType: challenge.cuisineType,
        budget: challenge.budget,
        skillLevel: challenge.skillLevel,
        cookTimeTarget: challenge.cookTimeTarget,
      });
      const mergedChallenge = {
        ...challenge,
        challengeTitle: parsed.challengeTitle,
        shortDescription: parsed.shortDescription,
      };
      const recipeLite = {
        dishName: parsed.dishName,
        cookTime: parsed.cookTime,
        estimatedCost: Math.max(8, Math.min(80, Number(budget) || 20)),
        ingredients: parsed.ingredients,
        steps: parsed.steps,
      };
      setAiDraft({ challenge: mergedChallenge, recipe: recipeLite });
      await patchRoom({
        challenge: mergedChallenge,
        recipeLite,
        liteAiGenerated: true,
      });
    } catch (e) {
      setAiError(String(e?.message || 'Could not generate. Try again or continue with the simple recipe.'));
      setAiDraft(null);
    } finally {
      generatingAiRef.current = false;
      setGeneratingAi(false);
    }
  };

  const loadDemoChallenge = async () => {
    if (!isHost || pendingContinue || generatingAi || loading) return;
    setAiError(null);
    setCuisineType(DEMO_CHALLENGE.cuisineType);
    setBudget(String(DEMO_CHALLENGE.budget));
    setSkillLevel(DEMO_CHALLENGE.skillLevel);
    setCookTimeTarget(String(DEMO_CHALLENGE.cookTimeTarget));
    const mergedChallenge = {
      ...challenge,
      ...DEMO_CHALLENGE,
      createdAt: Date.now(),
    };
    const recipeLite = { ...DEMO_RECIPE };
    setAiDraft({ challenge: mergedChallenge, recipe: recipeLite });
    await patchRoom({
      challenge: mergedChallenge,
      recipeLite,
      liteAiGenerated: true,
    });
  };

  const continueToCooking = async () => {
    if (!isHost || pendingContinue) return;
    setPendingContinue(true);
    const recipe =
      aiDraft?.recipe ??
      (room?.liteAiGenerated && room?.recipeLite ? room.recipeLite : buildSimpleRecipe(challenge));
    const challengePayload =
      aiDraft?.challenge ??
      (room?.liteAiGenerated && room?.challenge ? room.challenge : challenge);
    try {
      await saveChallengeAndRecipe(challengePayload, recipe);
      console.log('[LITE NAV] host -> CookingLite');
      navigation.navigate('CookingLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingContinue(false);
    }
  };

  const continueAsJoinerToCooking = () => {
    if (pendingJoinerContinue || phase !== 'cooking') return;
    setPendingJoinerContinue(true);
    navigation.navigate('CookingLite', { gameCode, playerName, playerId, isHost });
    setPendingJoinerContinue(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
        <LiteScreenTitle>Challenge Setup</LiteScreenTitle>
        {loading && <LiteMutedText>Loading room...</LiteMutedText>}
        {!!error && <LiteErrorText>Could not load room. Check connection and retry.</LiteErrorText>}
        {!loading && !room && <LiteMutedText>Room data missing. Retry in a moment.</LiteMutedText>}
        {!loading && room && players.length > 0 ? (
          <LiteSectionCard title="Kitchen crew">
            {players.map((p) => {
              const roleLabel = getLiteRoleBadgeLabel(p.liteRole);
              const right =
                roleLabel || p.isHost ? (
                  <View style={styles.crewBadges}>
                    {roleLabel ? (
                      <LiteBadge label={roleLabel} variant={getLiteRoleBadgeVariant(p.liteRole)} />
                    ) : null}
                    {p.isHost ? <LiteBadge label="HOST" variant="host" /> : null}
                  </View>
                ) : null;
              return <LitePlayerCard key={p.id} name={p.name} right={right} />;
            })}
          </LiteSectionCard>
        ) : null}
        {!isHost ? (
          <>
            <LiteSectionCard>
              <Text style={styles.waitLead}>Host is setting up the challenge...</Text>
              <LiteCardBody>Grab your ingredients while you wait.</LiteCardBody>
            </LiteSectionCard>
            {phase === 'cooking' && (
              <LiteSecondaryButton
                onPress={continueAsJoinerToCooking}
                disabled={pendingJoinerContinue || loading}
              >
                {pendingJoinerContinue ? 'Opening...' : 'Continue to Cooking'}
              </LiteSecondaryButton>
            )}
          </>
        ) : (
          <LiteSectionCard>
            <LiteFieldLabel>Cuisine</LiteFieldLabel>
            <TextInput style={liteInputStyle} value={cuisineType} onChangeText={setCuisineType} />
            <LiteFieldLabel>Budget</LiteFieldLabel>
            <TextInput style={liteInputStyle} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
            <LiteFieldLabel>Skill</LiteFieldLabel>
            <TextInput style={liteInputStyle} value={skillLevel} onChangeText={setSkillLevel} />
            <LiteFieldLabel>Cook time (minutes)</LiteFieldLabel>
            <TextInput
              style={liteInputStyle}
              value={cookTimeTarget}
              onChangeText={setCookTimeTarget}
              keyboardType="number-pad"
            />
            {generatingAi && <LiteMutedText>Generating your challenge...</LiteMutedText>}
            {!!aiError && <LiteErrorText style={styles.aiError}>{aiError}</LiteErrorText>}
            {!!aiPreview && !generatingAi && (
              <View style={styles.aiSuccessRow} accessibilityRole="text">
                <View style={styles.aiSuccessBadge} accessibilityLabel="Success">
                  <Text style={styles.aiSuccessCheck}>✓</Text>
                </View>
                <Text style={styles.aiSuccessTitle}>AI Challenge Ready</Text>
              </View>
            )}
            {!!aiPreview && (
              <View style={styles.previewCard} accessibilityRole="summary">
                {aiPreview.challenge?.demoModeLite ? (
                  <View style={styles.demoModeTagWrap}>
                    <LiteBadge label="PRESENTATION MODE" variant="host" />
                  </View>
                ) : null}
                <Text style={styles.previewTitle}>{aiPreview.challenge.challengeTitle || 'Challenge'}</Text>
                {!!aiPreview.challenge.shortDescription && (
                  <Text style={styles.previewDescription}>{aiPreview.challenge.shortDescription}</Text>
                )}
                <View style={styles.previewMetaRow}>
                  <Text style={styles.previewMetaLabel}>Dish</Text>
                  <Text style={styles.previewMetaValue}>{aiPreview.recipe.dishName || '—'}</Text>
                </View>
                <View style={styles.previewMetaRow}>
                  <Text style={styles.previewMetaLabel}>Est. cook time</Text>
                  <Text style={styles.previewMetaValue}>
                    {typeof aiPreview.recipe.cookTime === 'number'
                      ? `${aiPreview.recipe.cookTime} min`
                      : `${aiPreview.recipe.cookTime || '—'}`}
                  </Text>
                </View>
              </View>
            )}
            <LiteSecondaryButton
              onPress={generateAiChallenge}
              disabled={generatingAi || pendingContinue || loading}
            >
              {generatingAi ? 'Generating...' : aiPreview ? 'Regenerate AI Challenge' : 'Generate AI Challenge'}
            </LiteSecondaryButton>
            <LiteSecondaryButton onPress={loadDemoChallenge} disabled={hostBusy}>
              Load Demo Challenge
            </LiteSecondaryButton>
            <LitePrimaryButton onPress={continueToCooking} disabled={hostBusy}>
              {pendingContinue ? 'Saving...' : 'Continue to Cooking'}
            </LitePrimaryButton>
          </LiteSectionCard>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: LITE_THEME.screenBg },
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: LITE_THEME.contentPadding,
    paddingTop: LITE_THEME.contentPaddingTop,
    paddingBottom: 128,
  },
  waitLead: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 17,
    color: LITE_THEME.text,
    marginBottom: 4,
  },
  aiError: { marginTop: 6, marginBottom: 4 },
  aiSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
    gap: 10,
  },
  aiSuccessBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSuccessCheck: {
    color: '#fff',
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    lineHeight: 16,
  },
  aiSuccessTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 16,
    color: LITE_THEME.textInk,
    flex: 1,
  },
  previewCard: {
    backgroundColor: LITE_THEME.cardInner,
    borderRadius: LITE_THEME.radiusMd,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  previewTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 17,
    color: LITE_THEME.titleRed,
    marginBottom: 6,
  },
  previewDescription: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  previewMetaLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.textInk,
    width: 108,
  },
  previewMetaValue: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    flex: 1,
  },
  demoModeTagWrap: { marginBottom: 8 },
  crewBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
});
