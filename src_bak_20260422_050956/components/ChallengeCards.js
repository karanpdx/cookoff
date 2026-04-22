import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PALETTE, ChunkyCard } from './DesignSystem';

export function ChallengeHeaderCompact({ emoji, title, description, style }) {
  if (!title) return null;
  return (
    <View style={[styles.compactWrap, style]}>
      <Text style={styles.compactEmoji}>{emoji || '🍳'}</Text>
      <View style={styles.compactTextCol}>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.compactDesc} numberOfLines={4}>
          {description || ''}
        </Text>
      </View>
    </View>
  );
}

export function ChallengeHeaderCard({ emoji, title, description, children, style }) {
  return (
    <ChunkyCard style={style}>
      <Text style={styles.bigLabel}>{"Tonight's challenge"}</Text>
      <Text style={styles.bigEmoji}>{emoji || '🍳'}</Text>
      <Text style={styles.bigTitle}>{title}</Text>
      {!!description && <Text style={styles.bigDesc}>{description}</Text>}
      {children}
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  compactWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: PALETTE.cream,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
  },
  compactEmoji: { fontSize: 36, lineHeight: 42 },
  compactTextCol: { flex: 1 },
  compactTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 16,
    color: PALETTE.espresso,
    marginBottom: 4,
  },
  compactDesc: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: PALETTE.espresso,
    lineHeight: 19,
  },
  bigLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.red,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  bigEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  bigTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 8,
  },
  bigDesc: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    lineHeight: 22,
    textAlign: 'center',
  },
});
