import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE, CloudBg, ChunkyBtn } from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useGameSession } from '../context/GameSessionContext';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function extractFoodNoun(line) {
  if (!line) return null;
  const cleaned = String(line)
    .replace(/\([^)]*\)/g, '')
    .replace(/^\d+([./]\d+)?\s*[a-zA-Z]+\s*/g, '')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const keep = parts[parts.length - 1] || parts[0];
  if (!keep) return null;
  return keep.toUpperCase();
}

export default function HangmanScreen({ navigation }) {
  const { sessionRecipe } = useGameSession();
  const WORD = useMemo(() => {
    const ingredients = sessionRecipe?.ingredients || [];
    const nouns = ingredients.map(extractFoodNoun).filter((w) => w && w.length >= 3);
    if (!nouns.length) return 'TACOS';
    return nouns[Math.floor(Math.random() * nouns.length)];
  }, [sessionRecipe?.ingredients]);
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);
  const maxWrong = 6;

  const display = useMemo(
    () =>
      WORD.split('')
        .map((ch) => (guessed.has(ch) ? ch : '_'))
        .join(' '),
    [guessed]
  );

  const won = useMemo(() => WORD.split('').every((ch) => guessed.has(ch)), [guessed]);
  const lost = wrong >= maxWrong;

  const pick = useCallback(
    (L) => {
      if (won || lost || guessed.has(L)) return;
      const next = new Set(guessed);
      next.add(L);
      setGuessed(next);
      if (!WORD.includes(L)) setWrong((w) => w + 1);
    },
    [guessed, won, lost, WORD]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <View style={styles.inner}>
        <Text style={styles.title}>Hangman</Text>
        <Text style={styles.word}>{display}</Text>
        <Text style={styles.meta}>
          Wrong: {wrong}/{maxWrong}
        </Text>
        {won && <Text style={styles.win}>You saved the dish! 🎉</Text>}
        {lost && <Text style={styles.lose}>Kitchen disaster! Word was {WORD}</Text>}
        <View style={styles.grid}>
          {LETTERS.map((L) => (
            <TouchableOpacity
              key={L}
              style={[styles.key, guessed.has(L) && styles.keyUsed]}
              onPress={() => pick(L)}
              disabled={guessed.has(L) || won || lost}
            >
              <Text style={styles.keyText}>{L}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ChunkyBtn
          bg={PALETTE.yellow}
          shadowColor={PALETTE.espresso}
          color={PALETTE.espresso}
          onPress={() => {
            setGuessed(new Set());
            setWrong(0);
          }}
        >
          New word (reset)
        </ChunkyBtn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  title: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 28,
    color: PALETTE.red,
    textAlign: 'center',
    marginBottom: 20,
  },
  word: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 28,
    color: PALETTE.espresso,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 12,
  },
  meta: { fontFamily: 'Fredoka_600SemiBold', textAlign: 'center', marginBottom: 8 },
  win: { fontFamily: 'Fredoka_700Bold', color: PALETTE.leaf, textAlign: 'center', marginBottom: 12 },
  lose: { fontFamily: 'Fredoka_700Bold', color: PALETTE.red, textAlign: 'center', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginVertical: 20 },
  key: {
    width: 36,
    height: 40,
    borderRadius: 8,
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyUsed: { opacity: 0.4 },
  keyText: { fontFamily: 'Fredoka_700Bold', fontSize: 16, color: PALETTE.espresso },
});
