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

// ─────────────────────────────────────────────
// Lite game UI — Papa’s-style tokens & primitives
// (multiplayer logic lives in screens; this is presentation only)
// ─────────────────────────────────────────────

export const LITE_THEME = {
  screenBg: PALETTE.sky,
  cardBg: PALETTE.paper,
  cardInner: '#FFF7E5',
  cardBorder: PALETTE.creamEdge,
  borderHeavy: 3,
  radiusLg: 20,
  radiusMd: 16,
  radiusSm: 12,
  primaryAction: '#F9B347',
  secondaryAction: '#F29F38',
  text: PALETTE.espresso,
  textInk: PALETTE.ink,
  titleRed: PALETTE.red,
  contentPadding: 20,
  contentPaddingTop: 80,
  contentPaddingBottom: 44,
};

export const LITE_GAME_STYLES = StyleSheet.create({
  screenTitle: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 34,
    color: LITE_THEME.titleRed,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: LITE_THEME.radiusLg,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 15,
    color: LITE_THEME.titleRed,
    marginBottom: 8,
  },
  playerCard: {
    backgroundColor: LITE_THEME.cardInner,
    borderRadius: LITE_THEME.radiusSm,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroCodeLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.text,
    marginBottom: 2,
  },
  heroCode: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 38,
    color: LITE_THEME.titleRed,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.text,
  },
  photoFallbackLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.text,
  },
  playerName: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 16,
    color: LITE_THEME.textInk,
    flex: 1,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
  },
  pillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: LITE_THEME.text,
  },
  timerWrap: {
    backgroundColor: LITE_THEME.cardInner,
    borderRadius: LITE_THEME.radiusMd,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  timerLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.text,
  },
  timerValue: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 44,
    color: LITE_THEME.titleRed,
  },
  scoreRow: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: LITE_THEME.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreRowName: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 16,
    color: LITE_THEME.textInk,
  },
  scorePill: {
    backgroundColor: LITE_THEME.cardInner,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scorePillText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: LITE_THEME.text,
  },
  bodyMuted: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: LITE_THEME.text,
    marginBottom: 6,
  },
  bodyError: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.titleRed,
    marginBottom: 6,
  },
  cardHeading: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: LITE_THEME.titleRed,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: LITE_THEME.textInk,
  },
  sectionHeading: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: LITE_THEME.text,
    marginTop: 8,
    marginBottom: 4,
  },
  liteInput: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: LITE_THEME.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Fredoka_600SemiBold',
    color: LITE_THEME.textInk,
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: LITE_THEME.text,
    marginBottom: 6,
    marginTop: 8,
  },
  dishVoteCard: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: LITE_THEME.radiusLg,
    padding: 10,
    marginBottom: 12,
  },
  dishVoteCardSelected: {
    borderColor: LITE_THEME.secondaryAction,
    backgroundColor: LITE_THEME.cardInner,
  },
  dishPhoto: {
    width: '100%',
    height: 140,
    borderRadius: LITE_THEME.radiusSm,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    marginBottom: 8,
  },
  photoFallback: {
    width: '100%',
    height: 140,
    borderRadius: LITE_THEME.radiusSm,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LITE_THEME.cardInner,
  },
  voteHint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: LITE_THEME.text,
    marginTop: 4,
  },
  mediaPreview: {
    width: '100%',
    height: 180,
    borderRadius: LITE_THEME.radiusSm,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    marginBottom: 10,
    marginTop: 6,
  },
  podiumCard: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: LITE_THEME.radiusLg,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  podiumLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: LITE_THEME.text,
  },
  podiumName: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 28,
    color: LITE_THEME.titleRed,
    marginTop: 2,
  },
  podiumScore: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 15,
    color: LITE_THEME.text,
    marginBottom: 8,
  },
  podiumBars: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  podiumBar: {
    width: 48,
    borderRadius: 8,
    backgroundColor: LITE_THEME.primaryAction,
  },
});

export function LiteScreenTitle({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.screenTitle, style]}>{children}</Text>;
}

export function LiteTopBar({ title, onBack, showBack = true, right }) {
  return (
    <View style={liteTopBarStyles.wrap}>
      <View style={liteTopBarStyles.row}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={liteTopBarStyles.backBtn} activeOpacity={0.85}>
            <Text style={liteTopBarStyles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={liteTopBarStyles.backBtnGhost} />
        )}
        <Text style={liteTopBarStyles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={liteTopBarStyles.rightSlot}>{right || null}</View>
      </View>
    </View>
  );
}

export function LiteSectionCard({ title, children, style }) {
  return (
    <View style={[LITE_GAME_STYLES.sectionCard, style]}>
      {title ? <Text style={LITE_GAME_STYLES.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function LitePlayerCard({ name, right, style }) {
  return (
    <View style={[LITE_GAME_STYLES.playerCard, style]}>
      <Text style={LITE_GAME_STYLES.playerName} numberOfLines={1}>
        {name}
      </Text>
      {right}
    </View>
  );
}

export function LiteBadge({ label, variant = 'default', style }) {
  const bg =
    variant === 'host'
      ? LITE_THEME.primaryAction
      : variant === 'score'
      ? LITE_THEME.cardInner
      : PALETTE.cream;
  return (
    <View style={[LITE_GAME_STYLES.pill, { backgroundColor: bg }, style]}>
      <Text style={LITE_GAME_STYLES.pillText}>{label}</Text>
    </View>
  );
}

export function LitePrimaryButton(props) {
  return (
    <ChunkyBtn
      bg={LITE_THEME.primaryAction}
      shadowColor={PALETTE.espresso}
      color={PALETTE.espresso}
      {...props}
    />
  );
}

export function LiteSecondaryButton(props) {
  return (
    <ChunkyBtn
      bg={LITE_THEME.secondaryAction}
      shadowColor={PALETTE.espresso}
      color="#FFFFFF"
      {...props}
    />
  );
}

export function LiteTimerDisplay({ label = 'Kitchen Timer', value, style }) {
  return (
    <View style={[LITE_GAME_STYLES.timerWrap, style]}>
      <Text style={LITE_GAME_STYLES.timerLabel}>{label}</Text>
      <Text style={LITE_GAME_STYLES.timerValue}>{value}</Text>
    </View>
  );
}

export function LiteScoreboardRow({ name, scoreText, style }) {
  return (
    <View style={[LITE_GAME_STYLES.scoreRow, style]}>
      <Text style={LITE_GAME_STYLES.scoreRowName} numberOfLines={1}>
        {name}
      </Text>
      <View style={LITE_GAME_STYLES.scorePill}>
        <Text style={LITE_GAME_STYLES.scorePillText}>{scoreText}</Text>
      </View>
    </View>
  );
}

export function LiteMutedText({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.bodyMuted, style]}>{children}</Text>;
}

export function LiteErrorText({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.bodyError, style]}>{children}</Text>;
}

export function LiteCardHeading({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.cardHeading, style]}>{children}</Text>;
}

export function LiteCardBody({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.cardBody, style]}>{children}</Text>;
}

export function LiteSectionHeading({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.sectionHeading, style]}>{children}</Text>;
}

export function LiteFieldLabel({ children, style }) {
  return <Text style={[LITE_GAME_STYLES.fieldLabel, style]}>{children}</Text>;
}

/** TextInput style array for Lite forms */
export const liteInputStyle = LITE_GAME_STYLES.liteInput;

export function LiteDishVoteCard({
  photoUri,
  playerName,
  dishName,
  hint,
  selected,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[LITE_GAME_STYLES.dishVoteCard, selected && LITE_GAME_STYLES.dishVoteCardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={LITE_GAME_STYLES.dishPhoto} />
      ) : (
        <View style={LITE_GAME_STYLES.photoFallback}>
          <Text style={LITE_GAME_STYLES.photoFallbackLabel}>No Photo</Text>
        </View>
      )}
      <Text style={LITE_GAME_STYLES.scoreRowName}>{playerName}</Text>
      <Text style={LITE_GAME_STYLES.cardBody}>{dishName}</Text>
      {hint ? <Text style={LITE_GAME_STYLES.voteHint}>{hint}</Text> : null}
    </TouchableOpacity>
  );
}

export function LiteHeroCode({ label = 'Game Code', code, subtitle }) {
  return (
    <LiteSectionCard>
      <Text style={LITE_GAME_STYLES.heroCodeLabel}>{label}</Text>
      <Text style={LITE_GAME_STYLES.heroCode}>{code}</Text>
      {subtitle ? <Text style={LITE_GAME_STYLES.heroSubtitle}>{subtitle}</Text> : null}
    </LiteSectionCard>
  );
}

export function LitePodiumWinner({ name, scoreText }) {
  return (
    <View style={LITE_GAME_STYLES.podiumCard}>
      <Text style={LITE_GAME_STYLES.podiumLabel}>Champion</Text>
      <Text style={LITE_GAME_STYLES.podiumName}>{name}</Text>
      <Text style={LITE_GAME_STYLES.podiumScore}>{scoreText}</Text>
      <View style={LITE_GAME_STYLES.podiumBars}>
        <View style={[LITE_GAME_STYLES.podiumBar, { height: 44, backgroundColor: '#F2C15F' }]} />
        <View style={[LITE_GAME_STYLES.podiumBar, { height: 62 }]} />
        <View style={[LITE_GAME_STYLES.podiumBar, { height: 34, backgroundColor: LITE_THEME.secondaryAction }]} />
      </View>
    </View>
  );
}

export const liteScreenContentStyle = {
  padding: LITE_THEME.contentPadding,
  paddingTop: LITE_THEME.contentPaddingTop,
  paddingBottom: LITE_THEME.contentPaddingBottom,
};

export const liteScreenScrollContentStyle = liteScreenContentStyle;

const liteTopBarStyles = StyleSheet.create({
  wrap: {
    backgroundColor: LITE_THEME.cardBg,
    borderWidth: LITE_THEME.borderHeavy,
    borderColor: LITE_THEME.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LITE_THEME.cardBorder,
    backgroundColor: LITE_THEME.cardInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnGhost: {
    width: 34,
    height: 34,
  },
  backArrow: {
    fontFamily: 'Fredoka_700Bold',
    color: LITE_THEME.textInk,
    fontSize: 17,
    lineHeight: 18,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'TitanOne_400Regular',
    color: LITE_THEME.titleRed,
    fontSize: 24,
  },
  rightSlot: {
    minWidth: 34,
    alignItems: 'flex-end',
  },
});
