import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChunkyBtn, CloudBg, PALETTE } from '../components/DesignSystem';
import { useLiteRoomPolling } from '../hooks/useLiteRoomPolling';

export default function CookingLite({ route, navigation }) {
  const { gameCode, playerName = 'Player', playerId, isHost = false } = route.params || {};
  const { room, submitDishLite, setPhase, loading, error } = useLiteRoomPolling(gameCode);
  const [dishName, setDishName] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [pendingSubmitDish, setPendingSubmitDish] = useState(false);
  const [pendingStartVoting, setPendingStartVoting] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const timerInitializedRef = useRef(false);

  const phase = room?.phase || 'cooking';
  const challenge = room?.challenge || null;
  const recipe = room?.recipeLite || null;
  const recipeCookTime = Number(recipe?.cookTime);
  const challengeCookTime = Number(challenge?.cookTimeTarget);

  React.useEffect(() => {
    if (phase === 'voting') {
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    }
    if (phase === 'results') {
      navigation.replace('ResultsLite', { gameCode, playerName, playerId, isHost });
    }
  }, [phase, navigation, gameCode, playerName, playerId, isHost]);

  React.useEffect(() => {
    if (timerInitializedRef.current) return;
    const sourceMinutes = Number.isFinite(recipeCookTime) && recipeCookTime > 0
      ? recipeCookTime
      : Number.isFinite(challengeCookTime) && challengeCookTime > 0
      ? challengeCookTime
      : 20;
    setSecondsLeft(Math.max(1, Math.floor(sourceMinutes * 60)));
    timerInitializedRef.current = true;
  }, [recipeCookTime, challengeCookTime]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timerText = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const submitDish = async () => {
    if (!playerId || pendingSubmitDish) return;
    setPendingSubmitDish(true);
    try {
      await submitDishLite(playerId, dishName.trim() || `${playerName}'s Dish`, photoUri);
      navigation.replace('VotingLite', { gameCode, playerName, playerId, isHost });
    } finally {
      setPendingSubmitDish(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const hostStartVoting = async () => {
    if (!isHost || pendingStartVoting) return;
    setPendingStartVoting(true);
    try {
      await setPhase('voting');
    } finally {
      setPendingStartVoting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScrollView
        style={styles.inner}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Cooking Lite</Text>
        {loading && <Text style={styles.info}>Loading room...</Text>}
        {!!error && <Text style={styles.error}>Could not load room. Check connection and retry.</Text>}
        {!loading && !room && <Text style={styles.info}>Room data missing. Retry in a moment.</Text>}
        <Text style={styles.timer}>{timerText}</Text>
        {challenge && (
          <Text style={styles.challenge}>
            {challenge.cuisineType} · ${challenge.budget} · {challenge.skillLevel}
          </Text>
        )}
        <View style={styles.card}>
          {recipe ? (
            <>
              <Text style={styles.cardTitle}>{recipe.dishName || 'Chef Special'}</Text>
              <Text style={styles.cardText}>Estimated cook time: {recipe.cookTime || challenge?.cookTimeTarget || 20} min</Text>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {(Array.isArray(recipe.ingredients) ? recipe.ingredients : []).slice(0, 6).map((item, idx) => (
                <Text key={`${item}-${idx}`} style={styles.cardText}>{`\u2022 ${item}`}</Text>
              ))}
              <Text style={styles.sectionTitle}>Steps</Text>
              {(Array.isArray(recipe.steps) ? recipe.steps : []).slice(0, 5).map((step, idx) => (
                <Text key={`step-${idx}`} style={styles.cardText}>{`${idx + 1}. ${step}`}</Text>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Recipe loading...</Text>
              <Text style={styles.cardText}>Cuisine: {challenge?.cuisineType || 'Chef Special'}</Text>
              <Text style={styles.cardText}>Budget: ${challenge?.budget ?? 20}</Text>
              <Text style={styles.cardText}>Skill: {challenge?.skillLevel || 'Beginner'}</Text>
              <Text style={styles.cardText}>Target time: {challenge?.cookTimeTarget ?? 20} min</Text>
            </>
          )}
        </View>
        <View style={styles.photoCard}>
          <Text style={styles.cardTitle}>Dish Photo</Text>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : <Text style={styles.cardText}>No photo selected yet.</Text>}
          <ChunkyBtn bg={PALETTE.yellow} shadowColor={PALETTE.espresso} color={PALETTE.espresso} onPress={takePhoto} disabled={pendingSubmitDish}>
            Take Photo
          </ChunkyBtn>
          <ChunkyBtn bg={PALETTE.paper} shadowColor={PALETTE.espresso} color={PALETTE.espresso} onPress={chooseFromLibrary} disabled={pendingSubmitDish}>
            Choose from Library
          </ChunkyBtn>
        </View>
        <TextInput
          style={styles.input}
          value={dishName}
          onChangeText={setDishName}
          placeholder="Dish name"
          placeholderTextColor={PALETTE.espresso + '88'}
        />
        <ChunkyBtn
          bg={PALETTE.leaf}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          onPress={submitDish}
          disabled={pendingSubmitDish || loading}
        >
          {pendingSubmitDish ? 'Submitting...' : 'Submit Dish'}
        </ChunkyBtn>
        {isHost && (
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={hostStartVoting}
            disabled={pendingStartVoting || loading}
          >
            {pendingStartVoting ? 'Starting...' : 'Host: Start Voting'}
          </ChunkyBtn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 80, paddingBottom: 44 },
  title: { fontFamily: 'TitanOne_400Regular', fontSize: 34, color: PALETTE.red, marginBottom: 8 },
  info: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13, color: PALETTE.espresso, marginBottom: 6 },
  error: { fontFamily: 'Fredoka_700Bold', fontSize: 13, color: PALETTE.red, marginBottom: 6 },
  timer: { fontFamily: 'TitanOne_400Regular', fontSize: 42, color: PALETTE.espresso, marginBottom: 10 },
  challenge: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, color: PALETTE.espresso, marginBottom: 12 },
  card: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: PALETTE.red, marginBottom: 4 },
  cardText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, color: PALETTE.ink },
  sectionTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 14, color: PALETTE.espresso, marginTop: 8, marginBottom: 4 },
  photoCard: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    marginBottom: 10,
    marginTop: 6,
  },
  input: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Fredoka_600SemiBold',
    marginBottom: 12,
  },
});
