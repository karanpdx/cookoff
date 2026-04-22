import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE, ChunkyBtn, CloudBg, DrippyTitle } from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';

export default function MiniGameMenuScreen({ route, navigation }) {
  const p = route.params || {};

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <View style={styles.inner}>
        <DrippyTitle size={40}>Mini-Games</DrippyTitle>
        <Text style={styles.sub}>Pick your side quest</Text>

        <ChunkyBtn
          bg={PALETTE.leaf}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          onPress={() => navigation.navigate('Hangman', p)}
          style={styles.btn}
        >
          HANGMAN
        </ChunkyBtn>

        <ChunkyBtn
          bg={PALETTE.grape}
          shadowColor={PALETTE.espresso}
          color="#FFFFFF"
          onPress={() => navigation.navigate('FlappyChef', p)}
          style={styles.btn}
        >
          FLAPPY CHEF
        </ChunkyBtn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.sky },
  inner: { flex: 1, paddingTop: 56, paddingHorizontal: 22, alignItems: 'center' },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    color: PALETTE.espresso,
    marginBottom: 28,
    marginTop: 8,
  },
  btn: { alignSelf: 'stretch', marginBottom: 14 },
});
