import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloudBg,
  PALETTE,
  LITE_THEME,
  LiteTopBar,
  LiteMutedText,
  LiteErrorText,
  LiteSectionCard,
  LiteFieldLabel,
  LitePrimaryButton,
  LiteSecondaryButton,
  LitePlayerCard,
  LiteBadge,
} from '../components/DesignSystem';
import AnimatedClouds from '../components/AnimatedClouds';
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

const SKILL_OPTIONS = ['Beginner', 'Intermediate', 'Expert'];
const TIME_OPTIONS = ['5', '10', '15', '20', '30'];

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
  const selfMeta = useMemo(() => players.find((p) => p.id === playerId) || null, [players, playerId]);
  const judges = useMemo(() => players.filter((p) => p?.liteRole === 'judge'), [players]);
  const submittedCompetitorDishes = useMemo(
    () => players.filter((p) => (!p?.liteRole || p.liteRole === 'competitor') && (p?.dishName || p?.photoUri)),
    [players]
  );
  const liteScores = room?.liteScores || {};
  const judgingComplete = useMemo(
    () =>
      submittedCompetitorDishes.every((target) =>
        judges.every((judge) => {
          const n = Number(liteScores?.[target.id]?.[judge.id]);
          return Number.isInteger(n) && n >= 1 && n <= 10;
        })
      ),
    [submittedCompetitorDishes, judges, liteScores]
  );

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

  const recoverByPhase = React.useCallback(() => {
    if (phase === 'setup') return;
    if (phase === 'cooking') {
      navigation.replace('CookingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  const handleSafeBack = React.useCallback(() => {
    if (selfMeta?.liteRole === 'judge' && phase === 'voting' && !judgingComplete) {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    recoverByPhase();
  }, [selfMeta?.liteRole, phase, judgingComplete, navigation, gameCode, playerName, playerId, isHost, recoverByPhase]);

  React.useEffect(() => {
    if (phase === 'cooking') {
      navigation.replace('CookingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
      return;
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <AnimatedClouds minFrac={0.35} maxFrac={0.92} count={3} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LiteTopBar
            title="Challenge Setup"
            showBack={Boolean(navigation?.canGoBack?.())}
            onBack={handleSafeBack}
          />

          {/* Screen subtitle */}
          <View style={styles.subtitlePill}>
            <Text style={styles.subtitleText}>Build tonight's culinary battle</Text>
          </View>

          {loading && <LiteMutedText style={styles.statusMsg}>Loading room…</LiteMutedText>}
          {!!error && <LiteErrorText style={styles.statusMsg}>Could not load room. Check connection and retry.</LiteErrorText>}
          {!loading && !room && <LiteMutedText style={styles.statusMsg}>Room data missing. Retry in a moment.</LiteMutedText>}

          {/* Kitchen crew */}
          {!loading && room && players.length > 0 ? (
            <View style={styles.crewCard}>
              <Text style={styles.crewTitle}>Kitchen Crew</Text>
              {players.map((p) => {
                const rLabel = getLiteRoleBadgeLabel(p.liteRole);
                const right =
                  rLabel || p.isHost ? (
                    <View style={styles.crewBadges}>
                      {rLabel ? (
                        <LiteBadge label={rLabel} variant={getLiteRoleBadgeVariant(p.liteRole)} />
                      ) : null}
                      {p.isHost ? <LiteBadge label="HOST" variant="host" /> : null}
                    </View>
                  ) : null;
                return <LitePlayerCard key={p.id} name={p.name} right={right} />;
              })}
            </View>
          ) : null}

          {/* ── Joiner path ── */}
          {!isHost ? (
            <>
              <View style={styles.waitCard}>
                <Text style={styles.waitEmoji}>👨‍🍳</Text>
                <Text style={styles.waitLead}>Host is setting up the challenge</Text>
                <Text style={styles.waitSub}>Grab your ingredients while you wait.</Text>
              </View>
              {phase === 'cooking' && (
                <LiteSecondaryButton
                  onPress={continueAsJoinerToCooking}
                  disabled={pendingJoinerContinue || loading}
                >
                  {pendingJoinerContinue ? 'Opening…' : 'Continue to Cooking'}
                </LiteSecondaryButton>
              )}
              {selfMeta?.liteRole === 'judge' && phase === 'voting' && !judgingComplete ? (
                <LitePrimaryButton onPress={() => navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost })}>
                  Return to Judge's Table
                </LitePrimaryButton>
              ) : null}
            </>
          ) : (
            /* ── Host path ── */
            <>
              {/* Settings card */}
              <View style={styles.settingsCard}>
                {/* Cuisine */}
                <Text style={styles.fieldLabel}>Cuisine</Text>
                <TextInput
                  style={styles.textInput}
                  value={cuisineType}
                  onChangeText={setCuisineType}
                  placeholderTextColor={PALETTE.espresso + '55'}
                  returnKeyType="done"
                />

                {/* Budget */}
                <Text style={styles.fieldLabel}>Budget ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="number-pad"
                  placeholderTextColor={PALETTE.espresso + '55'}
                  returnKeyType="done"
                />

                {/* Skill level pills */}
                <Text style={styles.fieldLabel}>Skill Level</Text>
                <View style={styles.pillRow}>
                  {SKILL_OPTIONS.map((opt) => {
                    const active = skillLevel === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setSkillLevel(opt)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cook time chips */}
                <Text style={styles.fieldLabel}>Cook Time</Text>
                <View style={styles.chipRow}>
                  {TIME_OPTIONS.map((t) => {
                    const active = cookTimeTarget === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setCookTimeTarget(t)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {t}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* AI status */}
              {generatingAi && (
                <View style={styles.generatingRow}>
                  <Text style={styles.generatingText}>Generating your challenge…</Text>
                </View>
              )}
              {!!aiError && <LiteErrorText style={styles.aiError}>{aiError}</LiteErrorText>}

              {/* AI preview */}
              {!!aiPreview && !generatingAi && (
                <View style={styles.aiSuccessRow} accessibilityRole="text">
                  <View style={styles.aiSuccessBadge}>
                    <Text style={styles.aiSuccessCheck}>✓</Text>
                  </View>
                  <Text style={styles.aiSuccessTitle}>
                    {aiPreview.challenge?.demoModeLite ? 'Demo Challenge Ready' : 'AI Challenge Ready'}
                  </Text>
                  {aiPreview.challenge?.demoModeLite ? (
                    <LiteBadge label="DEMO" variant="host" />
                  ) : null}
                </View>
              )}
              {!!aiPreview && (
                <View style={styles.previewCard} accessibilityRole="summary">
                  <Text style={styles.previewTitle}>
                    {aiPreview.challenge.challengeTitle || 'Challenge'}
                  </Text>
                  {!!aiPreview.challenge.shortDescription && (
                    <Text style={styles.previewDescription}>
                      {aiPreview.challenge.shortDescription}
                    </Text>
                  )}
                  <View style={styles.previewDivider} />
                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewMetaLabel}>Dish</Text>
                    <Text style={styles.previewMetaValue}>{aiPreview.recipe.dishName || '—'}</Text>
                  </View>
                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewMetaLabel}>Cook time</Text>
                    <Text style={styles.previewMetaValue}>
                      {typeof aiPreview.recipe.cookTime === 'number'
                        ? `${aiPreview.recipe.cookTime} min`
                        : `${aiPreview.recipe.cookTime || '—'}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actionArea}>
                <LitePrimaryButton
                  onPress={generateAiChallenge}
                  disabled={generatingAi || pendingContinue || loading}
                >
                  {generatingAi
                    ? 'Generating…'
                    : aiPreview
                    ? 'Regenerate AI Challenge'
                    : 'Generate AI Challenge'}
                </LitePrimaryButton>
                <LiteSecondaryButton onPress={loadDemoChallenge} disabled={hostBusy}>
                  Load Demo Challenge
                </LiteSecondaryButton>
                <View style={styles.continueRow}>
                  <LiteSecondaryButton onPress={continueToCooking} disabled={hostBusy}>
                    {pendingContinue ? 'Saving…' : 'Continue to Cooking →'}
                  </LiteSecondaryButton>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LITE_THEME.screenBg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 140,
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
    marginTop: 10,
    marginBottom: 16,
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

  statusMsg: {
    marginBottom: 10,
  },

  // ── Kitchen crew card ─────────────────────────────
  crewCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    marginBottom: 12,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  crewTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 16,
    color: LITE_THEME.titleRed,
    marginBottom: 10,
  },
  crewBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },

  // ── Joiner wait card ──────────────────────────────
  waitCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  waitEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  waitLead: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: LITE_THEME.titleRed,
    textAlign: 'center',
    marginBottom: 6,
  },
  waitSub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    opacity: 0.7,
    textAlign: 'center',
  },

  // ── Settings card ─────────────────────────────────
  settingsCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  fieldLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginTop: 14,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    color: PALETTE.espresso,
  },

  // ── Skill pills ───────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: PALETTE.creamEdge,
    backgroundColor: LITE_THEME.cardInner,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: LITE_THEME.primaryAction,
    borderColor: PALETTE.espresso,
  },
  pillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    opacity: 0.6,
  },
  pillTextActive: {
    opacity: 1,
    color: PALETTE.espresso,
  },

  // ── Cook time chips ───────────────────────────────
  chipRow: {
    flexDirection: 'row',
    gap: 7,
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    backgroundColor: LITE_THEME.cardInner,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: LITE_THEME.primaryAction,
    borderColor: PALETTE.espresso,
  },
  chipText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    opacity: 0.6,
  },
  chipTextActive: {
    opacity: 1,
  },

  // ── AI states ─────────────────────────────────────
  generatingRow: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  generatingText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    opacity: 0.7,
  },
  aiError: {
    marginTop: 4,
    marginBottom: 10,
  },
  aiSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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

  // ── AI preview card ───────────────────────────────
  previewCard: {
    backgroundColor: LITE_THEME.cardInner,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    padding: 16,
    marginBottom: 14,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  previewTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: LITE_THEME.titleRed,
    marginBottom: 6,
  },
  previewDescription: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  previewDivider: {
    height: 2,
    backgroundColor: PALETTE.creamEdge,
    borderRadius: 1,
    marginBottom: 10,
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
    width: 88,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  previewMetaValue: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
    flex: 1,
  },

  // ── Action buttons ────────────────────────────────
  actionArea: {
    gap: 10,
  },
  continueRow: {
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: PALETTE.creamEdge,
    paddingTop: 12,
  },
});
