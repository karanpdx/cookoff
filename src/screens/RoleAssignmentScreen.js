import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

const ROLES = [
  {
    name: 'COMPETITOR',
    emoji: '👨‍🍳',
    color: '#ff6b35',
    shadowColor: '#ff6b35',
    description:
      "You're in the kitchen — for real! Cook the challenge dish as fast and as well as you can. Plating, taste, and creativity all count. Give it everything you've got!",
    badge: 'IN THE HEAT',
  },
  {
    name: 'JUDGE',
    emoji: '🧑‍⚖️',
    color: '#ffd700',
    shadowColor: '#ffd700',
    description:
      "You hold the power! Score each competitor on taste, presentation, and creativity. Be fair, be brutal, and settle any disputes. Your word is final.",
    badge: 'POWER ROLE',
  },
  {
    name: 'SPECTATOR',
    emoji: '📣',
    color: '#00d4ff',
    shadowColor: '#00d4ff',
    description:
      "Watch, cheer, heckle — make noise! You're the crowd. Vote for your favorite dish at the end and keep the energy alive. Every great competition needs a great audience.",
    badge: 'HYPE SQUAD',
  },
];

function assignRole() {
  const rand = Math.random();
  if (rand < 0.5) return ROLES[0];       // 50% Competitor
  else if (rand < 0.8) return ROLES[1];  // 30% Judge
  else return ROLES[2];                   // 20% Spectator
}

export default function RoleAssignmentScreen({ route, navigation }) {
  const { playerName, gameCode, isHost } = route.params;
  const [role] = useState(() => assignRole());
  const [revealed, setRevealed] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setRevealed(true));
  }, []);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!revealed) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [revealed]);

  const handleReady = () => {
    navigation.navigate('CookingChallenge', { playerName, gameCode, role: role.name });
  };

  return (
    <View style={styles.container}>
      {/* Game Code Banner */}
      <View style={styles.gameBanner}>
        <Text style={styles.gameBannerLabel}>GAME CODE</Text>
        <Text style={styles.gameBannerCode}>{gameCode}</Text>
        {isHost && <Text style={styles.hostBadge}>HOST</Text>}
      </View>

      {/* Player Greeting */}
      <Animated.View style={[styles.greeting, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.greetingHello}>Hey,</Text>
        <Text style={styles.greetingName}>{playerName}!</Text>
        <Text style={styles.greetingSubtitle}>Your role has been assigned...</Text>
      </Animated.View>

      {/* Role Card */}
      <Animated.View
        style={[
          styles.roleCard,
          { borderColor: role.color, shadowColor: role.shadowColor },
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.roleBadge, { backgroundColor: role.color }]}>
          <Text style={styles.roleBadgeText}>{role.badge}</Text>
        </View>

        <Animated.Text style={[styles.roleEmoji, { transform: [{ scale: pulseAnim }] }]}>
          {role.emoji}
        </Animated.Text>

        <Text style={[styles.roleName, { color: role.color }]}>{role.name}</Text>

        <View style={styles.divider} />

        <Text style={styles.roleDescription}>{role.description}</Text>
      </Animated.View>

      {/* Ready Button */}
      <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
        <TouchableOpacity
          style={[styles.readyButton, { backgroundColor: role.color, shadowColor: role.shadowColor }]}
          onPress={handleReady}
          activeOpacity={0.85}
        >
          <Text style={styles.readyButtonText}>I'M READY! 🚀</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  gameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  gameBannerLabel: {
    color: '#8888aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  gameBannerCode: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  hostBadge: {
    backgroundColor: '#ff6b35',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  greeting: {
    alignItems: 'center',
  },
  greetingHello: {
    fontSize: 20,
    color: '#8888aa',
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 36,
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: 1,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#555577',
    marginTop: 4,
    letterSpacing: 1,
  },
  roleCard: {
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: 28,
    borderWidth: 2,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
  },
  roleBadge: {
    position: 'absolute',
    top: -14,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  roleEmoji: {
    fontSize: 80,
    marginBottom: 16,
    marginTop: 8,
  },
  roleName: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 20,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#2a2a4e',
    marginBottom: 20,
  },
  roleDescription: {
    fontSize: 15,
    color: '#aaaacc',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  readyButton: {
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  readyButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
