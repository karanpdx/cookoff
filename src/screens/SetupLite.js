import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChunkyBtn, CloudBg, PALETTE } from '../components/DesignSystem';
import { buildSimpleRecipe, useLiteRoomPolling } from '../hooks/useLiteRoomPolling';

export default function SetupLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, saveChallengeAndRecipe, loading, error } = useLiteRoomPolling(gameCode);
  const phase = room?.phase || 'setup';
  const [pendingContinue, setPendingContinue] = useState(false);
  const [pendingJoinerContinue, setPendingJoinerContinue] = useState(false);

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

  const continueToCooking = async () => {
    if (!isHost || pendingContinue) return;
    setPendingContinue(true);
    const recipe = buildSimpleRecipe(challenge);
    try {
      await saveChallengeAndRecipe(challenge, recipe);
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
      <View style={styles.inner}>
        <Text style={styles.title}>Setup Lite</Text>
        {loading && <Text style={styles.waitText}>Loading room...</Text>}
        {!!error && <Text style={styles.errorText}>Could not load room. Check connection and retry.</Text>}
        {!loading && !room && <Text style={styles.waitText}>Room data missing. Retry in a moment.</Text>}
        {!isHost ? (
          <>
            <Text style={styles.waitText}>Host is setting up the challenge...</Text>
            {phase === 'cooking' && (
              <ChunkyBtn
                bg={PALETTE.leaf}
                shadowColor={PALETTE.espresso}
                color="#FFFFFF"
                onPress={continueAsJoinerToCooking}
                disabled={pendingJoinerContinue || loading}
              >
                {pendingJoinerContinue ? 'Opening...' : 'Continue to Cooking'}
              </ChunkyBtn>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>Cuisine</Text>
            <TextInput style={styles.input} value={cuisineType} onChangeText={setCuisineType} />
            <Text style={styles.label}>Budget</Text>
            <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
            <Text style={styles.label}>Skill</Text>
            <TextInput style={styles.input} value={skillLevel} onChangeText={setSkillLevel} />
            <Text style={styles.label}>Cook time (minutes)</Text>
            <TextInput
              style={styles.input}
              value={cookTimeTarget}
              onChangeText={setCookTimeTarget}
              keyboardType="number-pad"
            />
            <ChunkyBtn
              bg={PALETTE.yellow}
              shadowColor={PALETTE.espresso}
              color={PALETTE.espresso}
              onPress={continueToCooking}
              disabled={pendingContinue || loading}
            >
              {pendingContinue ? 'Saving...' : 'Continue to Cooking'}
            </ChunkyBtn>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, padding: 20, paddingTop: 80 },
  title: { fontFamily: 'TitanOne_400Regular', fontSize: 34, color: PALETTE.red, marginBottom: 12 },
  waitText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, color: PALETTE.espresso },
  errorText: { fontFamily: 'Fredoka_700Bold', fontSize: 13, color: PALETTE.red, marginBottom: 8 },
  label: { fontFamily: 'Fredoka_700Bold', fontSize: 14, color: PALETTE.espresso, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Fredoka_600SemiBold',
    color: PALETTE.ink,
    marginBottom: 4,
  },
});
