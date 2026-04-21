import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { PALETTE } from './DesignSystem';

export function ScreenBackButton({ navigation, onPress }) {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress ?? (() => navigation.goBack())}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.arrow}>←</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 22,
    color: PALETTE.espresso,
    lineHeight: 24,
  },
});
