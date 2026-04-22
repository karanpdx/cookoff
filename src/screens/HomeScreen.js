import React, { useMemo, useRef, useState } from 'react';
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
import {
  PALETTE,
  ChunkyBtn,
  ChunkyCard,
  DrippyTitle,
  CloudBg,
  SectionLabel,
} from '../components/DesignSystem';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { useGameSession } from '../context/GameSessionContext';
import { useFirebaseRoom } from '../hooks/useFirebaseRoom';
import { useRoomSync } from '../hooks/useRoomSync';

const HERO_IMAGE_HEIGHT = Dimensions.get('window').height * 0.35;

export default function HomeScreen({ route, navigation }) {
  const { avatarUri } = route.params || {};
  const { isMuted, toggleMute, musicAvailable } = useBackgroundMusic();
  const { setAvatarUri } = useGameSession();
  const { createRoom, joinRoom, getPlayerId, findRoomByCode, deleteRoom } = useFirebaseRoom();

  React.useEffect(() => {
    if (avatarUri) setAvatarUri(avatarUri);
  }, [avatarUri, setAvatarUri]);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdGameCode, setCreatedGameCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const hiddenInputRef = useRef(null);
  const { room: liveRoom } = useRoomSync(createdGameCode);

  React.useEffect(() => {
    if (!isCreating || !createdGameCode) return;
    console.log('[HomeScreen] showing code in waiting UI:', createdGameCode);
  }, [isCreating, createdGameCode]);

  const resolvedName = playerName.trim() || 'Player';

  const liveCount = useMemo(() => {
    const players = liveRoom?.players;
    return Array.isArray(players) ? players.length : 1;
  }, [liveRoom?.players]);
  const canStart = liveCount >= 2;

  const handleCreateGame = async () => {
    setBusy(true);
    try {
      const gameCode = await createRoom(resolvedName, avatarUri);
      console.log('[HomeScreen] createRoom returned gameCode:', gameCode);
      setCreatedGameCode(gameCode);
      setIsCreating(true);
    } catch {
      const fallbackCode = Math.floor(1000 + Math.random() * 9000).toString();
      navigation.navigate('Setup', {
        playerName: resolvedName,
        gameCode: fallbackCode,
        isHost: true,
        avatarUri,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleStartGame = async () => {
    const playerId = await getPlayerId();
    console.log('[HomeScreen] START GAME using displayed gameCode:', createdGameCode);
    navigation.navigate('Setup', {
      playerName: resolvedName,
      gameCode: createdGameCode,
      isHost: true,
      avatarUri,
      playerId,
    });
  };

  const handleCancelGame = async () => {
    const code = createdGameCode;
    if (!code) return;
    try {
      await deleteRoom(code);
    } catch {
      // ignore cleanup errors
    } finally {
      setCreatedGameCode('');
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    const code = joinCode.replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) return;
    console.log('[HomeScreen] player typed join gameCode:', code);
    setBusy(true);
    try {
      let room = null;
      try {
        room = await joinRoom(code, resolvedName, avatarUri);
      } catch {
        room = await findRoomByCode(code);
      }
      if (!room) {
        navigation.navigate('Setup', {
          playerName: resolvedName,
          gameCode: code,
          isHost: false,
          avatarUri,
        });
        return;
      }
      const playerId = await getPlayerId();
      console.log('[HomeScreen] joinRoom resolved gameCode:', room.gameCode || code);
      navigation.navigate('RoleAssignment', {
        playerName: resolvedName,
        gameCode: code,
        isHost: false,
        avatarUri,
        playerId,
      });
    } catch {
      Alert.alert('Error', 'Could not look up game. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const joinDigits = joinCode.replace(/\D/g, '');
  const canJoin = joinDigits.length === 4;

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <TouchableOpacity
        style={[styles.muteToggle, !musicAvailable && styles.muteToggleDisabled]}
        onPress={toggleMute}
        activeOpacity={musicAvailable ? 0.85 : 1}
        disabled={!musicAvailable}
      >
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

            {/* ── Hero illustration — natural aspect, sky blends with screen ── */}
            <View style={styles.heroWrapper}>
              <Image
                source={require('../../assets/hero_home.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
              {avatarUri && (
                <View style={styles.heroAvatarCorner}>
                  <Image source={{ uri: avatarUri }} style={styles.heroAvatarImg} />
                </View>
              )}
            </View>

            {/* ── Bottom content ─────────────────────────── */}
            <View style={styles.content}>
              {isCreating ? (
                <ChunkyCard p={12} style={styles.waitCard}>
                  <Text style={styles.waitTitle}>Waiting for players...</Text>
                  <Text style={styles.codeLabel}>YOUR CODE</Text>
                  <Text style={styles.codeBig}>{createdGameCode}</Text>
                  <Text style={styles.waitMeta}>Share this with friends</Text>
                  <Text style={styles.waitMeta}>Players joined: {liveCount}</Text>
                  <ChunkyBtn
                    small
                    bg={PALETTE.yellow}
                    shadowColor={PALETTE.espresso}
                    color={PALETTE.espresso}
                    onPress={handleStartGame}
                    disabled={!canStart}
                    style={styles.btn}
                  >
                    START GAME →
                  </ChunkyBtn>
                  <ChunkyBtn
                    small
                    bg={PALETTE.paper}
                    shadowColor={PALETTE.espresso}
                    color={PALETTE.espresso}
                    onPress={handleCancelGame}
                    style={styles.cancelBtn}
                  >
                    Cancel Game
                  </ChunkyBtn>
                </ChunkyCard>
              ) : (
                <>
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

                  <View style={styles.btnGroup}>
                    <ChunkyBtn
                      small
                      bg={PALETTE.yellow}
                      shadowColor={PALETTE.espresso}
                      color={PALETTE.espresso}
                      onPress={handleCreateGame}
                      disabled={busy}
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
                      disabled={!canJoin || busy}
                      style={styles.btn}
                    >
                      Join Game
                    </ChunkyBtn>
                  </View>
                </>
              )}
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
    zIndex: 2,
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteToggleDisabled: {
    opacity: 0.55,
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

  // ── Hero — fixed height, contain (no crop/mask) ──
  heroWrapper: {
    alignSelf: 'stretch',
    height: HERO_IMAGE_HEIGHT,
    marginBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: HERO_IMAGE_HEIGHT,
  },
  heroAvatarCorner: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    overflow: 'hidden',
    backgroundColor: PALETTE.cream,
  },
  heroAvatarImg: {
    width: '100%',
    height: '100%',
  },

  // ── Bottom content — pulled up to eliminate sky gap ─
  content: {
    marginTop: -20,
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
  waitCard: {
    marginTop: 6,
  },
  waitTitle: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 18,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 6,
  },
  codeLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.espresso,
    letterSpacing: 2,
    textAlign: 'center',
  },
  codeBig: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 48,
    color: PALETTE.red,
    textAlign: 'center',
    lineHeight: 52,
  },
  waitMeta: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 6,
  },
  cancelBtn: {
    marginTop: 2,
  },
  btn: {
    marginBottom: 0,
  },
});
