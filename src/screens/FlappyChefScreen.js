import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE, CloudBg, ChunkyBtn } from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useGameSession } from '../context/GameSessionContext';

const PIPE_WIDTH = 58;
const GAP_HEIGHT = 160;
const GRAVITY = 0.5;
const FLAP_VELOCITY = -10;
const PIPE_SPEED = 2.7;
const BIRD_SIZE = 34;
const BIRD_X = 86;
const HITBOX_SCALE = 0.7;

function createPipe(id, areaW, areaH) {
  const margin = 36;
  const maxGapTop = Math.max(margin, areaH - GAP_HEIGHT - margin);
  const gapTop = margin + Math.random() * (maxGapTop - margin);
  return { id, x: areaW + PIPE_WIDTH, gapTop, passed: false };
}

function hitTopY(y) {
  return y + (BIRD_SIZE * (1 - HITBOX_SCALE)) / 2;
}

function hitBottomY(y) {
  return y + BIRD_SIZE - (BIRD_SIZE * (1 - HITBOX_SCALE)) / 2;
}

export default function FlappyChefScreen({ navigation, route }) {
  const { addSpectatorEngagementPoints, avatarUri: contextAvatar } = useGameSession();
  const avatarUri = route.params?.avatarUri || contextAvatar;
  const [area, setArea] = useState({ width: 300, height: 460 });
  const [birdY, setBirdY] = useState(200);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [pointsEarnedRound, setPointsEarnedRound] = useState(0);
  const birdYRef = useRef(200);
  const velocityRef = useRef(0);
  const spawnTickRef = useRef(0);
  const pipeIdRef = useRef(1);
  const awardedRef = useRef(false);
  const scoreRef = useRef(0);

  const applyEngagementForScore = useCallback(
    (finalScore) => {
      const pts = Math.floor(finalScore / 5) * 10;
      setPointsEarnedRound(pts);
      if (pts > 0) {
        addSpectatorEngagementPoints(pts);
      }
    },
    [addSpectatorEngagementPoints]
  );

  const triggerGameOver = useCallback(
    (finalScore) => {
      if (awardedRef.current) return;
      awardedRef.current = true;
      setPlaying(false);
      setGameOver(true);
      applyEngagementForScore(finalScore);
    },
    [applyEngagementForScore]
  );

  const startGame = useCallback(() => {
    awardedRef.current = false;
    velocityRef.current = 0;
    spawnTickRef.current = 0;
    pipeIdRef.current = 1;
    scoreRef.current = 0;
    const startY = Math.max(50, area.height * 0.45);
    birdYRef.current = startY;
    setBirdY(startY);
    setPipes([createPipe(pipeIdRef.current++, area.width, area.height)]);
    setScore(0);
    setPointsEarnedRound(0);
    setGameOver(false);
    setPlaying(true);
  }, [area.height, area.width]);

  useEffect(() => {
    if (area.width > 0 && area.height > 0 && pipes.length === 0 && !playing && !gameOver) {
      startGame();
    }
  }, [area.width, area.height, pipes.length, playing, gameOver, startGame]);

  useEffect(() => {
    if (!playing || gameOver) return undefined;

    const interval = setInterval(() => {
      spawnTickRef.current += 1;
      velocityRef.current += GRAVITY;

      setBirdY((prevY) => {
        const nextY = prevY + velocityRef.current;
        birdYRef.current = nextY;
        const top = hitTopY(nextY);
        const bottom = hitBottomY(nextY);
        if (top <= 0 || bottom >= area.height) {
          triggerGameOver(scoreRef.current);
          return Math.max(0, Math.min(nextY, area.height - BIRD_SIZE));
        }
        return nextY;
      });

      setPipes((prevPipes) => {
        let nextScoreCarry = 0;
        let next = prevPipes
          .map((p) => ({ ...p, x: p.x - PIPE_SPEED }))
          .filter((p) => p.x + PIPE_WIDTH > -6);

        if (spawnTickRef.current >= 88) {
          spawnTickRef.current = 0;
          next = [...next, createPipe(pipeIdRef.current++, area.width, area.height)];
        }

        next = next.map((pipe) => {
          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            nextScoreCarry += 1;
            return { ...pipe, passed: true };
          }
          return pipe;
        });

        if (nextScoreCarry > 0) {
          scoreRef.current += nextScoreCarry;
          setScore(scoreRef.current);
        }

        const ht = hitTopY(birdYRef.current);
        const hb = hitBottomY(birdYRef.current);
        const hit = next.some((pipe) => {
          const overlapX = BIRD_X + BIRD_SIZE > pipe.x && BIRD_X < pipe.x + PIPE_WIDTH;
          if (!overlapX) return false;
          const topHit = ht < pipe.gapTop;
          const bottomHit = hb > pipe.gapTop + GAP_HEIGHT;
          return topHit || bottomHit;
        });

        if (hit) {
          triggerGameOver(scoreRef.current);
        }

        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [area.height, gameOver, playing, triggerGameOver]);

  const flap = () => {
    if (gameOver) return;
    if (!playing) setPlaying(true);
    velocityRef.current = FLAP_VELOCITY;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <View style={styles.inner}>
        <Text style={styles.title}>Flappy Chef</Text>
        <Text style={styles.score}>Score: {score}</Text>
        <Pressable
          style={styles.game}
          onPressIn={flap}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setArea({ width, height });
          }}
        >
          {pipes.map((pipe) => (
            <View key={pipe.id}>
              <View
                style={[
                  styles.pipe,
                  styles.pipeTop,
                  { left: pipe.x, width: PIPE_WIDTH, height: Math.max(0, pipe.gapTop - 6) },
                ]}
              >
                <Text style={styles.pipeIcon}>🍴</Text>
              </View>
              <View
                style={[
                  styles.pipe,
                  styles.pipeBottom,
                  {
                    left: pipe.x,
                    width: PIPE_WIDTH,
                    top: pipe.gapTop + GAP_HEIGHT + 6,
                    height: Math.max(0, area.height - (pipe.gapTop + GAP_HEIGHT + 6)),
                  },
                ]}
              >
                <Text style={styles.pipeIcon}>🔪</Text>
              </View>
            </View>
          ))}
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={[styles.chefAvatar, { left: BIRD_X, top: birdY }]}
            />
          ) : (
            <Text style={[styles.chef, { left: BIRD_X, top: birdY }]}>👨‍🍳</Text>
          )}
          {!gameOver && <Text style={styles.hint}>Tap to flap through utensil pipes!</Text>}
          {gameOver && (
            <View style={styles.over}>
              <Text style={styles.overTitle}>Game Over</Text>
              <Text style={styles.overScore}>Score: {score}</Text>
              {pointsEarnedRound > 0 ? (
                <Text style={styles.engagementEarned}>Engagement +{pointsEarnedRound} pts</Text>
              ) : (
                <Text style={styles.engagementEarnedMuted}>Pass 5 pipes for +10 engagement pts</Text>
              )}
              <ChunkyBtn
                bg={PALETTE.leaf}
                shadowColor={PALETTE.espresso}
                color="#FFFFFF"
                onPress={startGame}
                style={styles.overBtn}
              >
                Retry
              </ChunkyBtn>
              <ChunkyBtn
                bg={PALETTE.paper}
                shadowColor={PALETTE.espresso}
                color={PALETTE.espresso}
                onPress={() =>
                  navigation.navigate('Spectator', {
                    ...(route.params || {}),
                  })
                }
                style={styles.overBtn}
              >
                Back to Spectator
              </ChunkyBtn>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, paddingTop: 56, paddingHorizontal: 20, alignItems: 'center' },
  title: { fontFamily: 'TitanOne_400Regular', fontSize: 28, color: PALETTE.red, marginBottom: 8 },
  score: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: PALETTE.espresso, marginBottom: 16 },
  game: {
    width: '100%',
    flex: 1,
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  chef: { position: 'absolute', fontSize: 34, zIndex: 3 },
  chefAvatar: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    zIndex: 3,
  },
  pipe: {
    position: 'absolute',
    backgroundColor: PALETTE.creamEdge,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipeTop: { top: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  pipeBottom: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  pipeIcon: { fontSize: 19, opacity: 0.8 },
  hint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    fontFamily: 'Fredoka_600SemiBold',
    color: PALETTE.espresso,
    fontSize: 13,
  },
  over: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  overTitle: { fontFamily: 'TitanOne_400Regular', fontSize: 34, color: '#FFFFFF' },
  overScore: {
    marginTop: 8,
    marginBottom: 6,
    fontFamily: 'Fredoka_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  engagementEarned: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: PALETTE.yellow,
    marginBottom: 12,
  },
  engagementEarnedMuted: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
    opacity: 0.9,
  },
  overBtn: { width: '100%', marginTop: 2 },
});
