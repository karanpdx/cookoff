import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const ROLES = [
  {
    name: 'COMPETITOR',
    emoji: '👨‍🍳',
    avatarBg: PALETTE.tomato,
    description:
      "You're in the kitchen — for real! Cook the challenge dish as fast and as well as you can. Plating, taste, and creativity all count. Give it everything you've got!",
    badge: 'IN THE HEAT',
  },
  {
    name: 'JUDGE',
    emoji: '🧑‍⚖️',
    avatarBg: PALETTE.gold,
    description:
      "You hold the power! Score each competitor on taste, presentation, and creativity. Be fair, be brutal, and settle any disputes. Your word is final.",
    badge: 'POWER ROLE',
  },
  {
    name: 'SPECTATOR',
    emoji: '📣',
    avatarBg: PALETTE.grape,
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
  const { playerName, gameCode, isHost, cuisineType, modifiers = [], budget, skillLevel, avatarUri } = route.params;
  const { kitchenChallenge, kitchenChallengeKey, setKitchenChallenge } = useGameSession();
  const [role] = useState(() => assignRole());
  const [revealed, setRevealed] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const sessionKey = `${cuisineType}|${budget}|${skillLevel}`;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    let cancelled = false;
    if (kitchenChallenge && kitchenChallengeKey === sessionKey) {
      setChallengeLoading(false);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      setChallengeLoading(true);
      try {
        const c = await fetchChallengePrompt({ cuisineType, budget, skillLevel });
        if (!cancelled) setKitchenChallenge(c, sessionKey);
      } catch {
        if (!cancelled) {
          setKitchenChallenge(
            {
              emoji: '🍳',
              title: 'Kitchen Gauntlet',
              description:
                'Create a standout dish that shows technique, flavor, and creativity while staying on budget.',
            },
            sessionKey
          );
        }
      } finally {
        if (!cancelled) setChallengeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cuisineType, budget, skillLevel, sessionKey, kitchenChallenge, kitchenChallengeKey, setKitchenChallenge]);

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
    const base = {
      playerName,
      gameCode,
      role: role.name,
      cuisineType,
      modifiers,
      budget,
      skillLevel,
      avatarUri,
    };
    if (role.name === 'SPECTATOR') {
      navigation.navigate('Spectator', {
        playerName,
        gameCode,
        isHost,
        cuisineType,
        modifiers,
        budget,
        skillLevel,
        avatarUri,
      });
    } else {
      navigation.navigate('CookingChallenge', base);
    }
  };

  const otherRoles = ROLES.filter((r) => r.name !== role.name);

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Code pill */}
        <CodePill code={gameCode} isHost={isHost} style={styles.codePill} />

        {challengeLoading ? (
          <Text style={styles.challengeLoading}>Loading tonight&apos;s challenge…</Text>
        ) : (
          kitchenChallenge && (
            <ChallengeHeaderCompact
              emoji={kitchenChallenge.emoji}
              title={kitchenChallenge.title}
              description={kitchenChallenge.description}
              style={styles.challengeBanner}
            />
          )
        )}

        {/* Greeting */}
        <Animated.View
          style={[
            styles.greeting,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.greetingHey}>Hey chef,</Text>
          <Text style={styles.greetingName}>{playerName}</Text>
        </Animated.View>

        {/* Role Card */}
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ChunkyCard p={24}>
            {/* Badge pill */}
            <View style={styles.badgePillRow}>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{role.badge}</Text>
              </View>
            </View>

            {/* Avatar */}
            <View style={styles.avatarRow}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <AvatarCircle size={120} bg={role.avatarBg} emoji={role.emoji} imageUri={avatarUri} />
              </Animated.View>
            </View>

            {/* Role Name */}
            <Text style={styles.roleName}>{role.name}</Text>

            {/* Dashed divider */}
            <View style={styles.dashedDivider} />

            {/* Description */}
            <Text style={styles.roleDescription}>{role.description}</Text>

            {/* Other roles as dimmed pills */}
            <View style={styles.otherRolesRow}>
              {otherRoles.map((r) => (
                <View key={r.name} style={styles.otherRolePill}>
                  <AvatarCircle
                    size={22}
                    bg={PALETTE.paper}
                    emoji={r.emoji}
                    imageUri={avatarUri}
                  />
                  <Text style={styles.otherRoleText}>{r.name}</Text>
                </View>
              ))}
            </View>
          </ChunkyCard>
        </Animated.View>

        {/* Ready Button */}
        <Animated.View style={[styles.btnWrap, { opacity: fadeAnim }]}>
          <ChunkyBtn
            bg={PALETTE.yellow}
            shadowColor={PALETTE.espresso}
            color={PALETTE.espresso}
            onPress={handleReady}
          >
            I'm Ready! 🚀
          </ChunkyBtn>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  codePill: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  challengeLoading: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 12,
  },
  challengeBanner: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  greeting: {
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingHey: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    color: PALETTE.espresso,
  },
  greetingName: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 36,
    color: PALETTE.red,
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  cardWrap: {
    marginBottom: 20,
  },
  badgePillRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgePill: {
    backgroundColor: PALETTE.gold,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
  },
  badgePillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: PALETTE.ink,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  roleName: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 40,
    color: PALETTE.red,
    textAlign: 'center',
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  dashedDivider: {
    width: '80%',
    height: 2,
    borderWidth: 1,
    borderColor: PALETTE.creamEdge,
    borderStyle: 'dashed',
    alignSelf: 'center',
    marginBottom: 16,
  },
  roleDescription: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  otherRolesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otherRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.creamEdge,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    opacity: 0.5,
  },
  otherRoleEmoji: {
    fontSize: 14,
  },
  otherRoleText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnWrap: {
    marginTop: 4,
  },
});
