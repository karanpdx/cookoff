import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
} from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useRoomSync } from '../hooks/useRoomSync';
import { useFirebaseRoom } from '../hooks/useFirebaseRoom';

const CUISINE_AND_DISH_OPTIONS = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'French',
  'Korean',
  'Mediterranean',
  'American',
  'Vietnamese',
  'Greek',
  'Spanish',
  'Middle Eastern',
  'BBQ',
  'Risotto',
  'Pasta',
  'Sushi',
  'Tacos',
  'Burger',
  'Pizza',
  'Ramen',
  'Curry',
  'Stir Fry',
  'Paella',
  'Bibimbap',
  'Pho',
  'Guacamole',
  'Steak',
  'Salmon',
  'Dumplings',
  'Pad Thai',
  'Biryani',
  'Carbonara',
  'Tacos al Pastor',
  'Pad See Ew',
  'Butter Chicken',
  'Tikka Masala',
  'Kung Pao',
  'Tom Yum',
  'Bulgogi',
  'Mole',
  'Ceviche',
  'Gnocchi',
  'Tagine',
  'Shakshuka',
  'Banh Mi',
  'Congee',
  'Kimchi Stew',
  'Katsu Curry',
  'Teriyaki Salmon',
  'Miso Ramen',
  'Chow Mein',
  'Fried Rice',
  'Dim Sum',
  'Larb',
  'Massaman Curry',
  'Green Curry',
  'Red Curry',
  'Croque Monsieur',
  'Ratatouille',
  'Coq au Vin',
  'Bouillabaisse',
  'Poke Bowl',
  'Jambalaya',
  'Mac and Cheese',
  'Clam Chowder',
  'Falafel',
  'Hummus Bowl',
  'Gyro',
  'Souvlaki',
  'Empanadas',
  'Arepas',
  'Chilaquiles',
  'Quesabirria',
  'Pozole',
  'Fish and Chips',
  'Shepherds Pie',
  'Moussaka',
  'Bibim Noodles',
  'Yakisoba',
  'Pesto Pasta',
  'Lasagna',
  'Penne Arrabbiata',
  'Margherita Pizza',
  'Calzone',
  'Fajitas',
  'Enchiladas',
  'Tamales',
  'Satay',
  'Laksa',
  'Udon',
  'Okonomiyaki',
  'Sinigang',
  'Adobo',
  'Sushi Bake',
];

const MODIFIER_CHIPS = [
  'Hot',
  'Cold',
  'Soupy',
  'Quick',
  'Fancy',
  'Comfort',
  'Spicy',
  'Sweet',
  'Savory',
];

const COOK_TIME_OPTIONS = [
  { label: 'Quick', minutes: 10 },
  { label: 'Standard', minutes: 20 },
  { label: 'Extended', minutes: 45 },
  { label: 'Marathon', minutes: 60 },
];

const SKILL_LEVELS = [
  { key: 'Beginner', emoji: '🥄' },
  { key: 'Intermediate', emoji: '🍳' },
  { key: 'Hard', emoji: '🔥' },
];

export default function SetupScreen({ route, navigation }) {
  const { playerName = 'Player', gameCode = '', isHost = false, avatarUri, playerId } = route.params || {};
  const { room, updateRoom } = useRoomSync(gameCode);
  const { getPlayerId } = useFirebaseRoom();
  const shouldWaitForHost = !isHost && Boolean(room);
  const redirectedToRoleRef = React.useRef(false);
  const [cuisineType, setCuisineType] = useState('');
  const [cuisineQuery, setCuisineQuery] = useState('');
  const [modifiers, setModifiers] = useState([]);
  const [budget, setBudget] = useState('');
  const [cookTimeTarget, setCookTimeTarget] = useState(20);
  const [skillLevel, setSkillLevel] = useState('Beginner');

  const numericBudget = useMemo(() => {
    const cleaned = budget.replace(/[^\d]/g, '');
    return cleaned ? Number(cleaned) : null;
  }, [budget]);

  const cuisineSuggestions = useMemo(() => {
    const q = cuisineQuery.trim().toLowerCase();
    if (!q) return CUISINE_AND_DISH_OPTIONS;
    return CUISINE_AND_DISH_OPTIONS.filter((c) => c.toLowerCase().includes(q));
  }, [cuisineQuery]);

  const selectCuisine = (c) => {
    setCuisineType(c);
    setCuisineQuery(c);
    Keyboard.dismiss();
  };

  const canSubmit =
    cuisineType.length > 0 && CUISINE_AND_DISH_OPTIONS.includes(cuisineType) && numericBudget !== null;
  const showInlineValidation = cuisineQuery.trim().length > 0 && !CUISINE_AND_DISH_OPTIONS.includes(cuisineQuery);

  const toggleModifier = (m) => {
    setModifiers((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const handleHostContinue = async () => {
    if (!canSubmit) return;
    const me = playerId || (await getPlayerId());
    const challenge = {
      cuisineType,
      modifiers,
      budget: numericBudget,
      cookTimeTarget,
      skillLevel,
      setBy: me,
      createdAt: Date.now(),
    };
    try {
      if (gameCode) {
        await updateRoom({ challenge, status: 'setup' });
      }
    } catch {
      // local fallback path keeps existing behavior
    }
    navigation.navigate('RoleAssignment', {
      playerName,
      gameCode,
      isHost,
      avatarUri,
      playerId: me,
      cuisineType,
      modifiers,
      budget: numericBudget,
      cookTimeTarget,
      skillLevel,
    });
  };

  const roomChallengeKey = useMemo(() => {
    if (!room?.challenge) return '';
    const c = room.challenge;
    return `${c.cuisineType || ''}|${c.budget || ''}|${c.skillLevel || ''}|${c.cookTimeTarget || ''}|${c.createdAt || ''}`;
  }, [room?.challenge]);

  React.useEffect(() => {
    if (isHost) return;
    const challenge = room?.challenge;
    if (!challenge || redirectedToRoleRef.current) return;
    redirectedToRoleRef.current = true;
    (async () => {
      const me = playerId || (await getPlayerId());
      navigation.replace('RoleAssignment', {
        playerName,
        gameCode,
        isHost: false,
        avatarUri,
        playerId: me,
        cuisineType: challenge.cuisineType,
        modifiers: challenge.modifiers || [],
        budget: challenge.budget,
        cookTimeTarget: challenge.cookTimeTarget || 20,
        skillLevel: challenge.skillLevel || 'Beginner',
      });
    })();
  }, [isHost, roomChallengeKey, playerName, gameCode, avatarUri, playerId, getPlayerId, navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      {shouldWaitForHost ? (
        <View style={styles.waitingWrap}>
          <ChunkyCard>
            <SectionLabel>Host is setting up the kitchen...</SectionLabel>
            <Text style={styles.waitingCopy}>Game code: {gameCode || '----'}</Text>
            {(room?.players || []).map((p) => (
              <Text key={p.id} style={styles.waitingPlayer}>• {p.name}{p.isHost ? ' (Host)' : ''}</Text>
            ))}
          </ChunkyCard>
        </View>
      ) : (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback
          style={styles.dismissWrap}
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Header */}
          <View style={styles.header}>
            <DrippyTitle size={44}>Kitchen Setup</DrippyTitle>
            <Text style={styles.subtitle}>Customize tonight's battle</Text>
          </View>

          {/* Cuisine Type — list-only autocomplete */}
          <ChunkyCard style={styles.cardSpacing}>
            <SectionLabel>Cuisine / Dish</SectionLabel>
            <View style={styles.inputRow}>
              <Text style={styles.inputEmoji}>🍝</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Type to search cuisines or dishes…"
                placeholderTextColor={PALETTE.espresso + '55'}
                value={cuisineQuery}
                onChangeText={(t) => {
                  setCuisineQuery(t);
                  if (CUISINE_AND_DISH_OPTIONS.includes(t)) {
                    setCuisineType(t);
                  } else {
                    setCuisineType('');
                  }
                }}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
            {cuisineQuery.trim().length > 0 && cuisineSuggestions.length > 0 && (
              <View style={styles.suggestRow}>
                {cuisineSuggestions.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.suggestPill}
                    onPress={() => selectCuisine(c)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.suggestPillText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {cuisineType ? (
              <Text style={styles.selectedHint}>Selected: {cuisineType}</Text>
            ) : (
              <Text style={styles.selectedHintMuted}>Tap a suggestion to lock a valid option.</Text>
            )}
            {showInlineValidation && (
              <Text style={styles.inlineError}>Please select from the list</Text>
            )}
            <SectionLabel style={styles.modLabel}>Modifiers</SectionLabel>
            <View style={styles.modRow}>
              {MODIFIER_CHIPS.map((m) => {
                const on = modifiers.includes(m);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => toggleModifier(m)}
                    style={[styles.modChip, on && styles.modChipOn]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modChipText, on && styles.modChipTextOn]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ChunkyCard>

          {/* Budget */}
          <ChunkyCard style={styles.cardSpacing}>
            <SectionLabel>Budget</SectionLabel>
            <View style={styles.inputRow}>
              <Text style={styles.dollarPrefix}>$</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 25"
                placeholderTextColor={PALETTE.espresso + '55'}
                value={budget}
                onChangeText={(text) => setBudget(text.replace(/[^\d]/g, ''))}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </ChunkyCard>

          {/* Cook time target */}
          <ChunkyCard style={styles.cardSpacing}>
            <SectionLabel>Cook time</SectionLabel>
            <Text style={styles.cookTimeHint}>How long competitors get in the kitchen</Text>
            <View style={styles.cookTimeGrid}>
              {[0, 2].map((start) => (
                <View key={start} style={styles.cookTimeRow}>
                  {COOK_TIME_OPTIONS.slice(start, start + 2).map(({ label, minutes }) => {
                    const selected = cookTimeTarget === minutes;
                    return (
                      <TouchableOpacity
                        key={minutes}
                        style={[
                          styles.cookTimeTab,
                          selected ? styles.cookTimeTabSelected : styles.cookTimeTabUnselected,
                        ]}
                        onPress={() => setCookTimeTarget(minutes)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.cookTimeLabel,
                            selected ? styles.cookTimeLabelSelected : styles.cookTimeLabelUnselected,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                        <Text
                          style={[
                            styles.cookTimeMins,
                            selected ? styles.cookTimeMinsSelected : styles.cookTimeMinsUnselected,
                          ]}
                        >
                          {minutes} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ChunkyCard>

          {/* Skill Level */}
          <ChunkyCard style={styles.cardSpacing}>
            <SectionLabel>Skill Level</SectionLabel>
            <View style={styles.skillRow}>
              {SKILL_LEVELS.map(({ key, emoji }) => {
                const selected = key === skillLevel;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.skillTab,
                      selected ? styles.skillTabSelected : styles.skillTabUnselected,
                    ]}
                    onPress={() => setSkillLevel(key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.skillEmoji}>{emoji}</Text>
                    <Text
                      style={[
                        styles.skillText,
                        selected ? styles.skillTextSelected : styles.skillTextUnselected,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ChunkyCard>

          {/* Submit Button */}
          <View style={styles.btnWrap}>
            <ChunkyBtn
              bg={PALETTE.yellow}
              shadowColor={PALETTE.espresso}
              color={PALETTE.espresso}
              onPress={handleHostContinue}
              disabled={!canSubmit}
            >
              Continue →
            </ChunkyBtn>
          </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  flex: {
    flex: 1,
  },
  waitingWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 120,
  },
  waitingCopy: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    marginBottom: 10,
  },
  waitingPlayer: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    marginBottom: 6,
  },
  dismissWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  subtitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: PALETTE.espresso,
    marginTop: 8,
    textAlign: 'center',
  },
  cardSpacing: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  dollarPrefix: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: PALETTE.leaf,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: PALETTE.ink,
    paddingVertical: 10,
  },
  cookTimeHint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.espresso + 'AA',
    marginBottom: 10,
  },
  cookTimeGrid: {
    gap: 8,
  },
  cookTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cookTimeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    gap: 2,
  },
  cookTimeTabSelected: {
    backgroundColor: PALETTE.tomato,
  },
  cookTimeTabUnselected: {
    backgroundColor: PALETTE.paper,
  },
  cookTimeLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cookTimeLabelSelected: {
    color: '#FFFFFF',
  },
  cookTimeLabelUnselected: {
    color: PALETTE.espresso,
  },
  cookTimeMins: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
  cookTimeMinsSelected: {
    color: '#FFFFFF',
  },
  cookTimeMinsUnselected: {
    color: PALETTE.espresso,
  },
  skillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skillTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    gap: 4,
  },
  skillTabSelected: {
    backgroundColor: PALETTE.tomato,
  },
  skillTabUnselected: {
    backgroundColor: PALETTE.paper,
  },
  skillEmoji: {
    fontSize: 20,
  },
  skillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skillTextSelected: {
    color: '#FFFFFF',
  },
  skillTextUnselected: {
    color: PALETTE.espresso,
  },
  btnWrap: {
    marginTop: 8,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  suggestPill: {
    backgroundColor: PALETTE.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
  },
  suggestPillText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
  },
  selectedHint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.leaf,
    marginTop: 10,
  },
  selectedHintMuted: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.espresso + '99',
    marginTop: 10,
  },
  inlineError: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.red,
    marginTop: 8,
  },
  modLabel: {
    marginTop: 12,
    marginBottom: 6,
  },
  modRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modChip: {
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.paper,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  modChipOn: {
    backgroundColor: PALETTE.tomato,
  },
  modChipText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.espresso,
  },
  modChipTextOn: {
    color: '#FFFFFF',
  },
});
