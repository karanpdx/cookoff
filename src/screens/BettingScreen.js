import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE, ChunkyBtn, ChunkyCard, CloudBg, DrippyTitle, SectionLabel } from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';

const MOCK_COMPETITORS = ['Chef Alex', 'Chef Jordan', 'Chef Sam'];

export default function BettingScreen({ route, navigation }) {
  const { playerName } = route.params || {};
  const [points, setPoints] = useState('50');
  const [pick, setPick] = useState(MOCK_COMPETITORS[0]);

  const placeBet = () => {
    const n = Number(points.replace(/\D/g, '')) || 0;
    Alert.alert(
      'Bet placed!',
      `${playerName} wagered ${n} engagement points on ${pick}.`
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <View style={styles.inner}>
        <DrippyTitle size={34}>Betting Booth</DrippyTitle>
        <Text style={styles.sub}>Spend engagement points on who wins the cookoff.</Text>

        <ChunkyCard style={styles.card}>
          <SectionLabel>Pick competitor</SectionLabel>
          {MOCK_COMPETITORS.map((c) => (
            <ChunkyBtn
              key={c}
              small
              bg={pick === c ? PALETTE.leaf : PALETTE.paper}
              shadowColor={PALETTE.espresso}
              color={pick === c ? '#FFFFFF' : PALETTE.espresso}
              onPress={() => setPick(c)}
              style={styles.pickBtn}
            >
              {c}
            </ChunkyBtn>
          ))}
        </ChunkyCard>

        <ChunkyCard style={styles.card}>
          <SectionLabel>Engagement points</SectionLabel>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={points}
            onChangeText={(t) => setPoints(t.replace(/\D/g, ''))}
          />
        </ChunkyCard>

        <ChunkyBtn
          bg={PALETTE.yellow}
          shadowColor={PALETTE.espresso}
          color={PALETTE.espresso}
          onPress={placeBet}
        >
          Lock in bet
        </ChunkyBtn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: { marginBottom: 14 },
  pickBtn: { marginBottom: 8 },
  input: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 22,
    color: PALETTE.espresso,
    backgroundColor: PALETTE.paper,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    padding: 12,
  },
});
