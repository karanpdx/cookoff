import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  PALETTE,
  ChunkyBtn,
  ChunkyCard,
  DrippyTitle,
  CloudBg,
  SectionLabel,
} from '../components/DesignSystem';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

const HERO_IMAGE_HEIGHT = Dimensions.get('window').height * 0.35;

export default function HomeScreen({ navigation }) {
  const { isMuted, toggleMute } = useBackgroundMusic();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const hiddenInputRef = useRef(null);

  const resolvedName = playerName.trim() || 'Player';

  const handleCreateGame = async () => {
    try {
      const gameCode = Math.floor(1000 + Math.random() * 9000).toString();
      await addDoc(collection(db, 'rooms'), {
        gameCode,
        status: 'waiting',
        players: [],
        createdAt: Date.now(),
      });
      navigation.navigate('Setup', {
        playerName: resolvedName,
        gameCode,
        isHost: true,
      });
    } catch {
      Alert.alert('Error', 'Could not create game. Check your connection and try again.');
    }
  };

  const handleJoinGame = async () => {
    const code = joinCode.replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) return;
    try {
      const q = query(collection(db, 'rooms'), where('gameCode', '==', code));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        Alert.alert('Game not found');
        return;
      }
      navigation.navigate('Setup', {
        playerName: resolvedName,
        gameCode: code,
        isHost: false,
      });
    } catch {
      Alert.alert('Error', 'Could not look up game. Check your connection and try again.');
    }
  };

  const joinDigits = joinCode.replace(/\D/g, '');
  const canJoin = joinDigits.length === 4;

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <TouchableOpacity style={styles.muteToggle} onPress={toggleMute} activeOpacity={0.85}>
        <Text style={styles.muteToggleText}>{isMuted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback
          style={styles.dismissWrap}
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          <ScrollView
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ── Title ─────────────────────────────────── */}
            <View style={styles.titleArea}>
              <DrippyTitle size={78} style={styles.titleText}>
                {'COOK\nOFF'}
              </DrippyTitle>
            </View>

            {/* ── Hero illustration — fixed height (keyboard does not shrink it) ── */}
            <View style={styles.heroWrapper}>
              <View style={styles.heroCropMask}>
                <Image
                  source={require('../../assets/hero_home.png')}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* ── Bottom content ─────────────────────────── */}
            <View style={styles.content}>
              {/* Your Chef card */}
              <ChunkyCard p={12} style={styles.card}>
                <SectionLabel style={styles.sectionLabel}>Your Chef</SectionLabel>
                <View style={styles.inputRow}>
                  <Text style={styles.inputEmoji}>👨‍🍳</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Your chef name…"
                    placeholderTextColor={PALETTE.espresso + '55'}
                    value={playerName}
                    onChangeText={setPlayerName}
                    maxLength={24}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </ChunkyCard>

              {/* Enter Game Code card */}
              <ChunkyCard p={12} style={styles.card}>
                <SectionLabel style={[styles.sectionLabel, styles.centerLabel]}>
                  Enter Game Code
                </SectionLabel>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => hiddenInputRef.current?.focus()}
                  style={styles.digitRow}
                >
                  {[0, 1, 2, 3].map((i) => {
                    const digit = joinDigits[i] || '';
                    return (
                      <View key={i} style={[styles.digitBox, digit ? styles.digitBoxFilled : null]}>
                        <Text style={styles.digitText}>{digit || '·'}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>
                <TextInput
                  ref={hiddenInputRef}
                  style={styles.hiddenInput}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  caretHidden
                />
              </ChunkyCard>

              {/* Buttons */}
              <View style={styles.btnGroup}>
                <ChunkyBtn
                  small
                  bg={PALETTE.yellow}
                  shadowColor={PALETTE.espresso}
                  color={PALETTE.espresso}
                  onPress={handleCreateGame}
                  style={styles.btn}
                >
                  ▶ Create Game
                </ChunkyBtn>
                <ChunkyBtn
                  small
                  bg={PALETTE.tomato}
                  shadowColor={PALETTE.espresso}
                  color="#FFFFFF"
                  onPress={handleJoinGame}
                  disabled={!canJoin}
                  style={styles.btn}
                >
                  Join Game
                </ChunkyBtn>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  muteToggle: {
    position: 'absolute',
    right: 14,
    top: 52,
    zIndex: 5,
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteToggleText: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 20,
  },
  kav: {
    flex: 1,
  },
  dismissWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Title ──────────────────────────────────────
  titleArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
    // No absolute positioning — sits in natural flow at top
  },
  titleText: {
    // Two lines (COOK / OFF) — compact line height so they sit snugly
    lineHeight: 72,
  },

  // ── Hero — fixed height so keyboard does not resize it ──
  heroWrapper: {
    alignSelf: 'stretch',
    height: HERO_IMAGE_HEIGHT,
    marginBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: 20 }],
    zIndex: 2,
  },
  heroCropMask: {
    width: '100%',
    height: HERO_IMAGE_HEIGHT - 14,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: HERO_IMAGE_HEIGHT + 28,
  },

  // ── Bottom content — tight to hero (0–8px gap) ─
  content: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  card: {
    marginBottom: 10,
  },
  sectionLabel: {
    marginBottom: 6,
  },
  centerLabel: {
    textAlign: 'center',
  },

  // Chef name input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 18,
    color: PALETTE.ink,
    paddingVertical: 9,
  },

  // 4-digit code boxes
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  digitBox: {
    width: 52,
    height: 56,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.cream,
  },
  digitText: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 26,
    color: PALETTE.red,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  // Buttons
  btnGroup: {
    gap: 8,
    marginTop: 2,
  },
  btn: {
    marginBottom: 0,
  },
});
