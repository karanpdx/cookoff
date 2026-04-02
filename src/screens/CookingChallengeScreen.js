import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';

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
      'Raid the fridge! Transform yesterday\'s leftovers into a brand-new dish. Creativity and resourcefulness are key.',
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

const TOTAL_SECONDS = 20 * 60; // 20 minutes

function getRandomPrompt() {
  return COOKING_PROMPTS[Math.floor(Math.random() * COOKING_PROMPTS.length)];
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CookingChallengeScreen({ route, navigation }) {
  const { playerName, gameCode, role } = route.params;
  const [prompt] = useState(() => getRandomPrompt());
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [isRunning, setIsRunning] = useState(true);
  const [finished, setFinished] = useState(false);

  const intervalRef = useRef(null);
  const timerPulse = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entrance fade
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // Countdown
  useEffect(() => {
    if (isRunning && !finished) {
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
  }, [isRunning, finished]);

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
    Alert.alert(
      "Time's Up! ⏱️",
      `Great work, ${playerName}! Put down your utensils — judging begins now.`,
      [
        {
          text: 'Back to Home',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  }, [playerName, navigation]);

  const togglePause = () => {
    setIsRunning((prev) => !prev);
  };

  const timerColor = secondsLeft <= 60
    ? '#ff3b30'
    : secondsLeft <= 5 * 60
    ? '#ffd700'
    : '#00d4ff';

  const progressPercent = 1 - secondsLeft / TOTAL_SECONDS;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>GAME CODE</Text>
          <Text style={styles.headerCode}>{gameCode}</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{role}</Text>
        </View>
        <View>
          <Text style={styles.headerLabel}>CHEF</Text>
          <Text style={styles.headerName}>{playerName}</Text>
        </View>
      </View>

      {/* Challenge Card */}
      <View style={styles.challengeCard}>
        <Text style={styles.challengeLabel}>🏆 YOUR CHALLENGE</Text>
        <Text style={styles.challengeEmoji}>{prompt.emoji}</Text>
        <Text style={styles.challengeTitle}>{prompt.title}</Text>
        <View style={styles.challengeDivider} />
        <Text style={styles.challengeDescription}>{prompt.description}</Text>
      </View>

      {/* Timer */}
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>
          {finished ? '⏰ TIME\'S UP!' : isRunning ? 'TIME REMAINING' : '⏸ PAUSED'}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent * 100}%`, backgroundColor: timerColor },
            ]}
          />
        </View>

        <Animated.Text
          style={[
            styles.timerDisplay,
            { color: timerColor, transform: [{ scale: timerPulse }] },
          ]}
        >
          {formatTime(secondsLeft)}
        </Animated.Text>

        {secondsLeft <= 60 && !finished && (
          <Text style={styles.urgencyText}>LAST MINUTE! FINISH STRONG! 🔥</Text>
        )}
        {secondsLeft <= 5 * 60 && secondsLeft > 60 && !finished && (
          <Text style={styles.warningText}>5 minutes left — start plating!</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        {!finished && (
          <TouchableOpacity style={styles.pauseButton} onPress={togglePause} activeOpacity={0.8}>
            <Text style={styles.pauseButtonText}>{isRunning ? '⏸ Pause' : '▶ Resume'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.doneButton, finished && styles.doneButtonFull]}
          onPress={handleDone}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>
            {finished ? "🏁 SEE RESULTS" : "✅ DONE COOKING"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  headerLabel: {
    color: '#555577',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerCode: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
  },
  headerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  rolePill: {
    backgroundColor: '#ff6b35',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rolePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  challengeCard: {
    backgroundColor: '#16213e',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
  },
  challengeLabel: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 16,
  },
  challengeEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
  },
  challengeDivider: {
    width: '70%',
    height: 1,
    backgroundColor: '#2a2a4e',
    marginBottom: 16,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#aaaacc',
    textAlign: 'center',
    lineHeight: 22,
  },
  timerSection: {
    alignItems: 'center',
  },
  timerLabel: {
    color: '#8888aa',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#2a2a4e',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  urgencyText: {
    color: '#ff3b30',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  warningText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 14,
  },
  pauseButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333355',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonText: {
    color: '#aaaacc',
    fontSize: 16,
    fontWeight: '700',
  },
  doneButton: {
    flex: 2,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  doneButtonFull: {
    flex: 1,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
