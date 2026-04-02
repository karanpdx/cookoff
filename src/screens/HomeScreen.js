import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';

export default function HomeScreen({ navigation }) {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const validateName = () => {
    if (!playerName.trim()) {
      Alert.alert('Hold up! 🍳', 'Enter your name before jumping in the kitchen!');
      return false;
    }
    return true;
  };

  const handleCreateGame = () => {
    if (!validateName()) return;
    const gameCode = Math.floor(1000 + Math.random() * 9000).toString();
    navigation.navigate('RoleAssignment', { playerName: playerName.trim(), gameCode, isHost: true });
  };

  const handleJoinGame = () => {
    if (!validateName()) return;
    setJoinModalVisible(true);
  };

  const handleConfirmJoin = () => {
    if (joinCode.length !== 4) {
      Alert.alert('Invalid Code', 'Game code must be exactly 4 digits.');
      return;
    }
    setJoinModalVisible(false);
    navigation.navigate('RoleAssignment', { playerName: playerName.trim(), gameCode: joinCode, isHost: false });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🔥</Text>
          <Text style={styles.logoTitle}>COOK</Text>
          <Text style={styles.logoAccent}>OFF</Text>
          <Text style={styles.logoTagline}>May the best chef win</Text>
        </View>

        {/* Player Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your chef name..."
            placeholderTextColor="#555577"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
            autoCapitalize="words"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateGame} activeOpacity={0.8}>
            <Text style={styles.primaryButtonIcon}>🍽️</Text>
            <Text style={styles.primaryButtonText}>CREATE GAME</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleJoinGame} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonIcon}>🎯</Text>
            <Text style={styles.secondaryButtonText}>JOIN GAME</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>3–6 players · Real-time cooking battles</Text>
      </ScrollView>

      {/* Join Game Modal */}
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>🎯 JOIN GAME</Text>
            <Text style={styles.modalSubtitle}>Enter the 4-digit game code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="0000"
              placeholderTextColor="#555577"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setJoinModalVisible(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmJoin}>
                <Text style={styles.modalConfirmText}>JOIN!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  logoTitle: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 8,
    lineHeight: 68,
  },
  logoAccent: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ff6b35',
    letterSpacing: 8,
    lineHeight: 68,
  },
  logoTagline: {
    marginTop: 12,
    fontSize: 14,
    color: '#8888aa',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  inputSection: {
    width: '100%',
    marginBottom: 32,
  },
  inputLabel: {
    color: '#ff6b35',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#2a2a4e',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonSection: {
    width: '100%',
    gap: 14,
    marginBottom: 36,
  },
  primaryButton: {
    backgroundColor: '#ff6b35',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonIcon: {
    fontSize: 22,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ff6b35',
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonIcon: {
    fontSize: 22,
  },
  secondaryButtonText: {
    color: '#ff6b35',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    color: '#444466',
    fontSize: 13,
    letterSpacing: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalContainer: {
    backgroundColor: '#16213e',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    borderWidth: 2,
    borderColor: '#2a2a4e',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8888aa',
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#ff6b35',
    borderRadius: 14,
    width: '60%',
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '900',
    color: '#ff6b35',
    letterSpacing: 8,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333355',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#8888aa',
    fontSize: 16,
    fontWeight: '700',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
