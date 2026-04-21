import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AnimatedClouds from './AnimatedClouds';

// ─────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────
export const PALETTE = {
  sky: '#87CEEB',
  red: '#C23829',
  redDeep: '#8F2418',
  yellow: '#FFC93C',
  yellowDeep: '#E0A820',
  cream: '#FFF4D6',
  creamEdge: '#F2DFA8',
  espresso: '#3B2B1E',
  tomato: '#E85A3E',
  tomatoDeep: '#B83C26',
  leaf: '#7FB862',
  leafDeep: '#588A44',
  grape: '#8A5CC2',
  grapeDeep: '#5C3A8A',
  paper: '#FFFBF0',
  gold: '#F4C430',
  ink: '#2C1E14',
};

export function CloudBg() {
  return <AnimatedClouds />;
}

// ─────────────────────────────────────────────
// DrippyTitle
// ─────────────────────────────────────────────
export function DrippyTitle({ children, size = 56, style }) {
  return (
    <Text
      style={[
        drippyStyles.title,
        { fontSize: size },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const drippyStyles = StyleSheet.create({
  title: {
    fontFamily: 'TitanOne_400Regular',
    color: PALETTE.red,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
});

// ─────────────────────────────────────────────
// ChunkyBtn
// ─────────────────────────────────────────────
export function ChunkyBtn({
  children,
  bg = PALETTE.yellow,
  shadowColor = PALETTE.espresso,
  color = PALETTE.espresso,
  onPress,
  disabled = false,
  small = false,
  style,
}) {
  const faceHeight = small ? 52 : 68;

  return (
    <View style={[btnStyles.wrapper, { marginBottom: 5 }, style, disabled && btnStyles.disabled]}>
      {/* Shadow layer */}
      <View
        style={[
          btnStyles.shadow,
          {
            backgroundColor: shadowColor,
            height: faceHeight,
            top: 5,
            borderRadius: 20,
          },
        ]}
      />
      {/* Face layer */}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[
          btnStyles.face,
          {
            backgroundColor: disabled ? PALETTE.creamEdge : bg,
            height: faceHeight,
          },
        ]}
      >
        <Text
          style={[
            btnStyles.label,
            { color: disabled ? PALETTE.espresso + '88' : color },
            small && btnStyles.labelSmall,
          ]}
        >
          {children}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const btnStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 20,
  },
  face: {
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 15,
  },
  disabled: {
    opacity: 0.55,
  },
});

// ─────────────────────────────────────────────
// ChunkyCard
// ─────────────────────────────────────────────
export function ChunkyCard({ children, bg = PALETTE.cream, p = 18, style }) {
  return (
    <View style={[cardStyles.wrapper, style]}>
      {/* Shadow */}
      <View style={cardStyles.shadow} />
      {/* Content */}
      <View style={[cardStyles.content, { backgroundColor: bg, padding: p }]}>
        {children}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  shadow: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    bottom: -6,
    backgroundColor: PALETTE.espresso,
    borderRadius: 24,
  },
  content: {
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 24,
    overflow: 'hidden',
  },
});

// ─────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <Text style={[sectionLabelStyles.label, style]}>{children}</Text>
  );
}

const sectionLabelStyles = StyleSheet.create({
  label: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: PALETTE.espresso,
    marginBottom: 8,
  },
});

// ─────────────────────────────────────────────
// AvatarCircle
// ─────────────────────────────────────────────
export function AvatarCircle({ size = 60, bg = PALETTE.yellow, emoji = '👨‍🍳', imageUri, style }) {
  return (
    <View
      style={[
        avatarStyles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {/* Stripe overlay */}
      <View style={[avatarStyles.stripes, { borderRadius: size / 2 }]} pointerEvents="none" />
      {imageUri ? (
        <View
          style={{
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2,
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} />
        </View>
      ) : (
        <Text style={{ fontSize: size * 0.45, fontFamily: 'TitanOne_400Regular' }}>{emoji}</Text>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    overflow: 'hidden',
  },
  stripes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
});

// ─────────────────────────────────────────────
// CodePill
// ─────────────────────────────────────────────
export function CodePill({ code, isHost = false, style }) {
  return (
    <View style={[codePillStyles.wrapper, style]}>
      <Text style={codePillStyles.label}>CODE</Text>
      <Text style={codePillStyles.code}>{code}</Text>
      {isHost && (
        <View style={codePillStyles.hostBadge}>
          <Text style={codePillStyles.hostText}>HOST</Text>
        </View>
      )}
    </View>
  );
}

const codePillStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.cream,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignSelf: 'center',
  },
  label: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    color: PALETTE.espresso,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
    color: PALETTE.red,
    letterSpacing: 4,
  },
  hostBadge: {
    backgroundColor: PALETTE.tomato,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 4,
  },
  hostText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
