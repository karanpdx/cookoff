import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import {
  PALETTE,
  ChunkyBtn,
  ChunkyCard,
  CloudBg,
  CodePill,
  AvatarCircle,
} from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { ChallengeHeaderCompact } from '../components/ChallengeCards';
import { useGameSession } from '../context/GameSessionContext';
import { fetchChallengePrompt } from '../services/kitchenClaude';

const COOKING_PROMPTS = [
  {
    emoji: '🌮',
    title: 'Street Taco Showdown',
    description:
      'Create the ultimate street taco using whatever proteins and toppings you can find. Bonus points for a homemade salsa!',
  },
  {
    emoji: '🍝',
    title: 'Pasta from Scratch',
    description:
      'No store-bought pasta allowed! Make your own dough and serve it with a sauce that tells a story. Any shape goes.',
  },
  {
    emoji: '🥗',
    title: 'Leftover Remix',
    description:
      "Raid the fridge! Transform yesterday's leftovers into a brand-new dish. Creativity and resourcefulness are key.",
  },
  {
    emoji: '🍔',
    title: 'Gourmet Smash Burger',
    description:
      'Build the most jaw-dropping smash burger imaginable. Craft your own special sauce and pick a wild topping combo.',
  },
  {
    emoji: '🍜',
    title: 'Mystery Ramen Bowl',
    description:
      'Design a ramen bowl using at least 5 distinct toppings. Broth flavor, noodle texture, and garnish game all judged.',
  },
  {
    emoji: '🥘',
    title: 'One-Pan Wonder',
    description:
      'Everything must be cooked in a single pan or skillet — no exceptions. Make it hearty, make it beautiful.',
  },
];

const DEFAULT_TOTAL_SECONDS = 20 * 60;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getRoleColor(role) {
  if (role === 'COMPETITOR') return PALETTE.tomato;
  if (role === 'JUDGE') return PALETTE.gold;
  return PALETTE.grape;
}

function normalizePowerInventory(inv) {
  if (!Array.isArray(inv) || inv.length !== 3) return [null, null, null];
  return inv.map((s) => s ?? null);
}

function normalizeCookTime(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return 25;
  return Math.min(60, Math.max(5, Math.round(n)));
}

function parseRecipeFromClaude(text) {
  const trimmed = (text || '').trim();
  const jsonCandidate = trimmed.startsWith('{')
    ? trimmed
    : (trimmed.match(/\{[\s\S]*\}/) || [null])[0];
  if (!jsonCandidate) throw new Error('No JSON');
  const parsed = JSON.parse(jsonCandidate);
  const cookTime = normalizeCookTime(parsed.cookTime);
  const ingredients = parsed.ingredients;
  const steps = parsed.steps;
  if (!Array.isArray(ingredients) || !Array.isArray(steps)) throw new Error('Bad shape');
  const ingStrs = ingredients
    .map((s) => (typeof s === 'string' ? s : s?.text != null ? String(s.text) : String(s)))
    .filter(Boolean);
  const stepStrs = steps
    .map((s) => (typeof s === 'string' ? s : s?.text != null ? String(s.text) : String(s)))
    .filter(Boolean);
  if (stepStrs.length < 5) throw new Error('Too few steps');
  const rawName = parsed.dishName;
  const dishName =
    typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : "Chef's challenge plate";
  return {
    cookTime,
    dishName,
    ingredients: ingStrs,
    steps: stepStrs.slice(0, 7),
  };
}

function fallbackRecipeSteps(title) {
  return [
    `1. Prep your mise en place for "${title}" — knives, boards, pans ready.`,
    '2. Cook proteins or base components first; season as you go.',
    '3. Build layers: sauce, starch, veg — balance textures and color.',
    '4. Taste and adjust salt/acid before plating.',
    '5. Plate with height and a garnish that matches the challenge vibe.',
  ];
}

function fallbackRecipe(title, cuisineType, budget) {
  return {
    cookTime: 25,
    dishName: `${title} — signature plate`,
    ingredients: [
      '2 tbsp neutral oil',
      `Protein or main suitable for ${cuisineType || 'your'} pantry`,
      '1 aromatics bundle (onion/garlic/ginger as fits)',
      '1 cup supporting veg or starch',
      `Acid + herbs to finish (within ~$${budget} shopping mindset)`,
      'Salt, pepper, and one bold spice you love',
    ],
    steps: fallbackRecipeSteps(title),
  };
}

export default function CookingChallengeScreen({ route, navigation }) {
  const { playerName, gameCode, role, cuisineType, modifiers = [], budget, skillLevel, avatarUri } = route.params;
  const {
    liveRoast,
    liveRoastSeq,
    cookingRoasts,
    upvoteCookingRoast,
    kitchenChallenge,
    kitchenChallengeKey,
    setKitchenChallenge,
    setSessionRecipe,
  } = useGameSession();
  const sessionKey = `${cuisineType}|${budget}|${skillLevel}`;
  const isCompetitor = role === 'COMPETITOR';
  const isFocused = useIsFocused();
  const initialTotalSeconds =
    typeof route.params?.totalSeconds === 'number' && !Number.isNaN(route.params?.totalSeconds)
      ? route.params.totalSeconds
      : DEFAULT_TOTAL_SECONDS;
  const [totalSeconds, setTotalSeconds] = useState(initialTotalSeconds);
  const [prompt, setPrompt] = useState(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const s = route.params?.secondsLeft;
    return typeof s === 'number' && !Number.isNaN(s) ? s : initialTotalSeconds;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [powerInventory, setPowerInventory] = useState(() =>
    normalizePowerInventory(route.params?.powerInventory)
  );
  const [recipeDishName, setRecipeDishName] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [recipeSteps, setRecipeSteps] = useState([]);
  const [loadingRecipeSteps, setLoadingRecipeSteps] = useState(false);

  const intervalRef = useRef(null);
  const timerPulse = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(-100)).current;
  const lastRoastSeqRef = useRef(0);
  const [toastText, setToastText] = useState('');

  // Entrance fade
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const getFallbackPrompt = () =>
      COOKING_PROMPTS[Math.floor(Math.random() * COOKING_PROMPTS.length)];

    const loadPrompt = async () => {
      if (kitchenChallenge && kitchenChallengeKey === sessionKey) {
        if (!cancelled) {
          setPrompt(kitchenChallenge);
          setIsLoadingPrompt(false);
        }
        return;
      }
      try {
        const generatedPrompt = await fetchChallengePrompt({ cuisineType, budget, skillLevel });
        if (!cancelled) {
          setPrompt(generatedPrompt);
          setKitchenChallenge(generatedPrompt, sessionKey);
        }
      } catch {
        if (!cancelled) {
          const fb = getFallbackPrompt();
          setPrompt(fb);
          setKitchenChallenge(fb, sessionKey);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPrompt(false);
        }
      }
    };

    loadPrompt();

    return () => {
      cancelled = true;
    };
  }, [cuisineType, budget, skillLevel, kitchenChallenge, kitchenChallengeKey, sessionKey, setKitchenChallenge]);

  useEffect(() => {
    setPowerInventory(normalizePowerInventory(route.params?.powerInventory));
  }, [route.params?.powerInventory]);

  // Competitors: live anonymous roasts as top toast
  useEffect(() => {
    if (role !== 'COMPETITOR') return;
    if (!liveRoastSeq || liveRoastSeq === lastRoastSeqRef.current) return;
    lastRoastSeqRef.current = liveRoastSeq;
    const msg = liveRoast?.text?.trim() || 'Fresh roast incoming!';
    setToastText(msg);
    toastTranslate.setValue(-100);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(toastTranslate, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]),
      Animated.delay(3400),
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(toastTranslate, { toValue: -60, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [liveRoastSeq, role, liveRoast, toastOpacity, toastTranslate]);

  // Claude: personalized recipe + cook time for this challenge
  useEffect(() => {
    if (!prompt?.title) return;
    let cancelled = false;

    const loadRecipe = async () => {
      setLoadingRecipeSteps(true);
      const challengeTitle = prompt.title;
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key':
              'DEa4sHcIC4rKJ_nu9ZE7GGvUFwXaBrP9cVpVCiL44WTtentlC1jsLZ05Epcjhopohsc4SrTixZwzXHx3PKHe-A-auJM1wAA',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1200,
            messages: [
              {
                role: 'user',
                content: `Generate a highly unique recipe for '${cuisineType}' with modifiers: [${modifiers.join(', ')}]. Budget $${budget}. The recipe MUST directly match the challenge title '${challengeTitle}'. The recipe style MUST reflect modifiers — if 'Quick' steps should be 5-10 min total, if 'Soupy' include broth-based steps, if 'Cold' no heat application. Each recipe call MUST differ from previous — vary technique, plating, garnishes. Avoid generic recipes unless explicitly matching. Return JSON: dishName (specific creative name), cookTime (realistic integer minutes, varies dramatically based on dish — guac 10min, steak 25min, braised 90min), ingredients (exact quantities), steps (5-8 dish-specific actionable instructions, NEVER template phrases like 'mix everything' — always specific to dish). No markdown.`,
              },
            ],
          }),
        });

        if (!response.ok) throw new Error('Recipe request failed');
        const data = await response.json();
        const text = data?.content?.[0]?.text;
        const { cookTime, dishName, ingredients, steps } = parseRecipeFromClaude(text);
        if (!cancelled && ingredients.length && steps.length >= 5) {
          const computedSeconds = cookTime * 60;
          setTotalSeconds(computedSeconds);
          if (typeof route.params?.secondsLeft !== 'number') {
            setSecondsLeft(computedSeconds);
          }
          setRecipeDishName(dishName);
          setRecipeIngredients(ingredients);
          setRecipeSteps(steps);
          setSessionRecipe({
            dishName,
            ingredients,
            steps,
            cookTime,
            challengeTitle,
          });
        } else if (!cancelled) {
          const fb = fallbackRecipe(challengeTitle, cuisineType, budget);
          const computedSeconds = fb.cookTime * 60;
          setTotalSeconds(computedSeconds);
          if (typeof route.params?.secondsLeft !== 'number') {
            setSecondsLeft(computedSeconds);
          }
          setRecipeDishName(fb.dishName);
          setRecipeIngredients(fb.ingredients);
          setRecipeSteps(fb.steps);
          setSessionRecipe({
            dishName: fb.dishName,
            ingredients: fb.ingredients,
            steps: fb.steps,
            cookTime: fb.cookTime,
            challengeTitle,
          });
        }
      } catch {
        if (!cancelled) {
          const fb = fallbackRecipe(challengeTitle, cuisineType, budget);
          const computedSeconds = fb.cookTime * 60;
          setTotalSeconds(computedSeconds);
          if (typeof route.params?.secondsLeft !== 'number') {
            setSecondsLeft(computedSeconds);
          }
          setRecipeDishName(fb.dishName);
          setRecipeIngredients(fb.ingredients);
          setRecipeSteps(fb.steps);
          setSessionRecipe({
            dishName: fb.dishName,
            ingredients: fb.ingredients,
            steps: fb.steps,
            cookTime: fb.cookTime,
            challengeTitle,
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingRecipeSteps(false);
          if (isCompetitor) {
            setIsRunning(true);
          }
        }
      }
    };

    loadRecipe();
    return () => {
      cancelled = true;
    };
  }, [prompt?.title, cuisineType, modifiers, budget, isCompetitor, setSessionRecipe]);

  // Restore timer when returning (e.g. from Sabotage) with updated params
  useEffect(() => {
    const s = route.params?.secondsLeft;
    if (typeof s !== 'number' || Number.isNaN(s)) return;
    setSecondsLeft(s);
  }, [route.params?.secondsLeft]);
  useEffect(() => {
    const t = route.params?.totalSeconds;
    if (typeof t !== 'number' || Number.isNaN(t)) return;
    setTotalSeconds(t);
  }, [route.params?.totalSeconds]);

  // Countdown (paused while this screen is not focused so time does not drain on Sabotage)
  useEffect(() => {
    if (!isCompetitor) return undefined;
    if (isFocused && isRunning && !finished) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setFinished(true);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isFocused, isRunning, finished, isCompetitor]);

  // Pulse when under 60 seconds
  useEffect(() => {
    if (secondsLeft <= 60 && !finished) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(timerPulse, { toValue: 1.06, duration: 400, useNativeDriver: true }),
          Animated.timing(timerPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [secondsLeft <= 60, finished]);

  const handleDone = useCallback(() => {
    clearInterval(intervalRef.current);
    if (role === 'JUDGE') {
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
    } else {
      navigation.navigate('PhotoSubmit', {
        playerName,
        gameCode,
        role,
        cuisineType,
        modifiers,
        budget,
        skillLevel,
        avatarUri,
      });
    }
  }, [navigation, playerName, gameCode, role, cuisineType, modifiers, budget, skillLevel, avatarUri]);

  const togglePause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleSabotage = useCallback(() => {
    navigation.navigate('Sabotage', {
      ...route.params,
      secondsLeft,
      totalSeconds,
      powerInventory,
    });
  }, [navigation, route.params, secondsLeft, totalSeconds, powerInventory]);

  const handlePlayPower = useCallback(
    (slotIndex) => {
      const card = powerInventory[slotIndex];
      if (!card || role !== 'COMPETITOR') return;
      Alert.alert(
        'Play power-up',
        `Play “${card.title}” on an opponent?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Play!',
            onPress: () => {
              const next = [...powerInventory];
              next[slotIndex] = null;
              setPowerInventory(next);
              navigation.setParams({
                ...route.params,
                powerInventory: next,
                secondsLeft,
              });
              Alert.alert('Played!', `${card.emoji} ${card.title} — your opponent feels that!`);
            },
          },
        ]
      );
    },
    [powerInventory, role, navigation, route.params, secondsLeft]
  );

  const progressPercent = 1 - secondsLeft / Math.max(1, totalSeconds);
  const isUrgent = secondsLeft <= 60;
  const roleColor = getRoleColor(role);
  const showSabotage = !finished && role === 'COMPETITOR';
  const showPowerUps = role === 'COMPETITOR';
  const powerSlotsEmpty = powerInventory.every((s) => s == null);

  if (isLoadingPrompt || !prompt) {
    return (
      <View style={styles.loadingContainer}>
        <CloudBg />
        <ScreenBackButton navigation={navigation} />
        <ActivityIndicator size="large" color={PALETTE.red} />
        <Text style={styles.loadingText}>Generating your challenge…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      {role === 'COMPETITOR' && !!toastText && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.roastToast,
            { opacity: toastOpacity, transform: [{ translateY: toastTranslate }] },
          ]}
        >
          <Text style={styles.roastToastLabel}>🔥 Anonymous roast</Text>
          <Text style={styles.roastToastBody}>{toastText}</Text>
        </Animated.View>
      )}
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Fixed top header */}
        <View style={styles.header}>
          <CodePill code={gameCode} />
          <View style={styles.roleBadgeWrap}>
            <AvatarCircle size={36} bg={PALETTE.paper} emoji="👨‍🍳" imageUri={avatarUri} />
            <View style={[styles.roleBadgePill, { backgroundColor: roleColor }]}>
              <Text style={styles.roleBadgeText}>{role}</Text>
            </View>
          </View>
        </View>

        {/* Scrollable challenge content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isCompetitor ? (
            <>
              <ChallengeHeaderCompact
                emoji={prompt.emoji}
                title={prompt.title}
                description={prompt.description}
              />
              <View style={styles.metaPillsRow}>
                <View style={styles.setupPill}>
                  <Text style={styles.setupPillText}>{cuisineType || '—'}</Text>
                </View>
                <View style={styles.setupPill}>
                  <Text style={styles.setupPillText}>${budget ?? 0}</Text>
                </View>
                <View style={styles.setupPill}>
                  <Text style={styles.setupPillText}>{skillLevel || 'Beginner'}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <ChunkyCard style={styles.challengeCard}>
                <Text style={styles.challengeLabel}>🏆 YOUR CHALLENGE</Text>
                <View style={styles.pillsRow}>
                  <View style={styles.setupPill}>
                    <Text style={styles.setupPillText}>{cuisineType || 'Any Cuisine'}</Text>
                  </View>
                  <View style={styles.setupPill}>
                    <Text style={styles.setupPillText}>${budget ?? 0}</Text>
                  </View>
                  <View style={styles.setupPill}>
                    <Text style={styles.setupPillText}>{skillLevel || 'Beginner'}</Text>
                  </View>
                </View>
                <Text style={styles.challengeEmoji}>{prompt.emoji}</Text>
                <Text style={styles.challengeTitle}>{prompt.title}</Text>
              </ChunkyCard>
              <Text style={styles.challengeDescription}>{prompt.description}</Text>
            </>
          )}

          {isCompetitor && showPowerUps && (
            <View style={styles.powerSection}>
              <Text style={styles.sectionHeading}>POWER-UPS</Text>
              <View style={styles.powerRow}>
                {[0, 1, 2].map((i) => {
                  const slot = powerInventory[i];
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.powerSlot, slot ? styles.powerSlotFilled : styles.powerSlotEmpty]}
                      onPress={() => handlePlayPower(i)}
                      activeOpacity={slot ? 0.85 : 1}
                      disabled={!slot || finished}
                    >
                      {slot ? (
                        <>
                          <Text style={styles.powerSlotEmoji}>{slot.emoji}</Text>
                          <Text style={styles.powerSlotTitle} numberOfLines={2}>
                            {slot.title}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.powerSlotDash}>—</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {powerSlotsEmpty && <Text style={styles.powerHint}>No cards yet</Text>}
            </View>
          )}

          {!!recipeDishName && (
            <Text style={styles.dishNameHero} numberOfLines={4}>
              {recipeDishName}
            </Text>
          )}

          <View style={styles.recipeSection}>
            <Text style={styles.sectionHeading}>INGREDIENTS</Text>
            {loadingRecipeSteps && (
              <ActivityIndicator style={styles.recipeSpinner} color={PALETTE.espresso} />
            )}
            {recipeIngredients.map((line, idx) => (
              <View key={`ing-${idx}`} style={styles.ingredientRow}>
                <Text style={styles.ingredientBullet}>•</Text>
                <Text style={styles.ingredientText}>{line}</Text>
              </View>
            ))}
          </View>

          <View style={styles.recipeSection}>
            <Text style={styles.sectionHeading}>RECIPE STEPS</Text>
            {recipeSteps.map((stepText, idx) => (
              <View key={idx} style={styles.recipeStepCard}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepBody}>{stepText.replace(/^\d+\.?\s*/, '')}</Text>
              </View>
            ))}
          </View>

          {cookingRoasts.length > 0 && (
            <View style={styles.recipeSection}>
              <Text style={styles.sectionHeading}>LIVE ROAST FEED</Text>
              {cookingRoasts.slice().reverse().map((r) => (
                <View key={r.id} style={styles.roastRow}>
                  <Text style={styles.roastLine} numberOfLines={3}>
                    {r.text}
                  </Text>
                  <TouchableOpacity
                    style={[styles.roastVoteBtn, isCompetitor && styles.roastVoteBtnDisabled]}
                    disabled={isCompetitor}
                    onPress={() => (isCompetitor ? null : upvoteCookingRoast(r.id))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.roastVoteText}>
                      {isCompetitor ? 'VIEW' : `▲ ${r.votes}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {isCompetitor ? (
          <View style={styles.bottomArea}>
            <View style={styles.timerRow}>
              <Animated.Text
                style={[
                  styles.timerDisplay,
                  {
                    color: isUrgent ? PALETTE.red : PALETTE.espresso,
                    transform: [{ scale: timerPulse }],
                  },
                ]}
              >
                {formatTime(secondsLeft)}
              </Animated.Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent * 100}%`,
                      backgroundColor: isUrgent ? PALETTE.red : PALETTE.leaf,
                    },
                  ]}
                />
              </View>
            </View>

            {isUrgent && !finished && (
              <Text style={styles.urgencyText}>LAST MINUTE! FINISH STRONG! 🔥</Text>
            )}

            <View style={styles.buttonRow}>
              {showSabotage && (
                <View style={styles.sabotageWrap}>
                  <ChunkyBtn
                    bg="#9b59b6"
                    shadowColor={PALETTE.espresso}
                    color="#FFFFFF"
                    onPress={handleSabotage}
                    small
                  >
                    🃏 Sabotage
                  </ChunkyBtn>
                </View>
              )}
              <View style={showSabotage && !finished ? styles.doneWrap : styles.doneWrapFull}>
                <ChunkyBtn
                  bg={PALETTE.leaf}
                  shadowColor={PALETTE.espresso}
                  color="#FFFFFF"
                  onPress={handleDone}
                  small
                >
                  {finished ? '🏁 SEE RESULTS' : '✓ Done'}
                </ChunkyBtn>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.observerFooter}>
            {role === 'JUDGE' && (
              <ChunkyBtn
                bg={PALETTE.leaf}
                shadowColor={PALETTE.espresso}
                color="#FFFFFF"
                onPress={handleDone}
              >
                Continue to voting →
              </ChunkyBtn>
            )}
            {role === 'SPECTATOR' && (
              <ChunkyBtn
                bg={PALETTE.paper}
                shadowColor={PALETTE.espresso}
                color={PALETTE.espresso}
                onPress={() => navigation.goBack()}
              >
                ← Back
              </ChunkyBtn>
            )}
          </View>
        )}
      </Animated.View>

      {role === 'JUDGE' && (
        <TouchableOpacity
          style={[styles.roastFab, !isCompetitor && styles.roastFabObserver]}
          onPress={() => navigation.navigate('RoastSendModal')}
          activeOpacity={0.9}
        >
          <Text style={styles.roastFabText}>SEND ROAST 🔥</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: PALETTE.sky,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: PALETTE.espresso,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 8,
    gap: 10,
  },
  roleBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadgePill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
  },
  roleBadgeText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dishNameHero: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: PALETTE.red,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  observerFooter: {
    backgroundColor: PALETTE.sky,
    borderTopWidth: 3,
    borderTopColor: PALETTE.espresso,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 20,
  },
  challengeCard: {
    marginBottom: 14,
  },
  challengeLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.red,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  setupPill: {
    backgroundColor: PALETTE.creamEdge,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  setupPillText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: PALETTE.espresso,
    letterSpacing: 0.5,
  },
  challengeEmoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 10,
  },
  challengeTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 24,
    color: PALETTE.espresso,
    textAlign: 'center',
    textShadowColor: PALETTE.espresso + '44',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  challengeDescription: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    color: PALETTE.espresso,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.red,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  powerSection: {
    marginBottom: 18,
  },
  powerRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  powerSlot: {
    flex: 1,
    minHeight: 86,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerSlotEmpty: {
    backgroundColor: PALETTE.paper,
    borderStyle: 'dashed',
  },
  powerSlotFilled: {
    backgroundColor: PALETTE.cream,
  },
  powerSlotEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  powerSlotTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    color: PALETTE.espresso,
    textAlign: 'center',
  },
  powerSlotDash: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    color: PALETTE.espresso + '44',
  },
  powerHint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  recipeSection: {
    marginBottom: 20,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  ingredientBullet: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 16,
    color: PALETTE.tomato,
    lineHeight: 22,
  },
  ingredientText: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    lineHeight: 22,
  },
  recipeSpinner: {
    marginVertical: 12,
  },
  roastRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  roastLine: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.ink,
  },
  roastVoteBtn: {
    minWidth: 62,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 10,
    backgroundColor: PALETTE.tomato,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roastVoteBtnDisabled: {
    backgroundColor: PALETTE.creamEdge,
  },
  roastVoteText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  roastToast: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 52,
    zIndex: 50,
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 8,
  },
  roastToastLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.red,
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  roastToastBody: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.ink,
    lineHeight: 22,
  },
  roastFab: {
    position: 'absolute',
    right: 16,
    bottom: 168,
    zIndex: 40,
    backgroundColor: PALETTE.tomato,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 10,
  },
  roastFabText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  roastFabObserver: {
    bottom: 100,
  },
  recipeStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE.yellow,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.espresso,
  },
  stepBody: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    lineHeight: 22,
  },
  bottomArea: {
    backgroundColor: PALETTE.sky,
    borderTopWidth: 3,
    borderTopColor: PALETTE.espresso,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 10,
  },
  timerRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timerDisplay: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 60,
    letterSpacing: 4,
    marginBottom: 8,
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: PALETTE.creamEdge,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: PALETTE.espresso,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  urgencyText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.red,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  sabotageWrap: {
    flex: 1,
  },
  doneWrap: {
    flex: 1,
  },
  doneWrapFull: {
    flex: 1,
  },
});
