import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  InputAccessoryView,
} from 'react-native';
import { PALETTE, ChunkyBtn } from '../components/DesignSystem';
import { useGameSession } from '../context/GameSessionContext';

const TARGETS = ['Alex', 'Sam', 'Jess'];

export default function RoastSendModalScreen({ navigation }) {
  const [text, setText] = useState('');
  const [target, setTarget] = useState(TARGETS[0]);
  const { sendJudgeRoastAnonymous } = useGameSession();
  const accessoryID = 'roastKeyboardDone';

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendJudgeRoastAnonymous(`[→ ${target}] ${t}`);
    setText('');
    Keyboard.dismiss();
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback onPress={() => navigation.goBack()} accessible={false}>
        <View style={styles.flexTap} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Anonymous roast</Text>
          <Text style={styles.hint}>Competitors see this as a live toast — stay spicy, stay fair.</Text>

          <Text style={styles.targetLabel}>Target</Text>
          <View style={styles.targetRow}>
            {TARGETS.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.targetChip, target === name && styles.targetChipOn]}
                onPress={() => setTarget(name)}
                activeOpacity={0.85}
              >
                <Text style={[styles.targetChipText, target === name && styles.targetChipTextOn]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Drop your roast…"
            placeholderTextColor={PALETTE.espresso + '55'}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={240}
            inputAccessoryViewID={Platform.OS === 'ios' ? accessoryID : undefined}
          />
          <ChunkyBtn
            bg={PALETTE.tomato}
            shadowColor={PALETTE.espresso}
            color="#FFFFFF"
            onPress={send}
          >
            SEND ROAST 🔥
          </ChunkyBtn>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryID}>
          <View style={styles.accessoryBar}>
            <TouchableOpacity onPress={Keyboard.dismiss} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  flexTap: { flex: 1 },
  sheet: {
    backgroundColor: PALETTE.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 3,
    borderColor: PALETTE.espresso,
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 22,
    color: PALETTE.red,
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 14,
  },
  input: {
    minHeight: 100,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 14,
    padding: 12,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    color: PALETTE.ink,
    marginBottom: 16,
    backgroundColor: PALETTE.cream,
  },
  targetLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  targetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
  },
  targetChipOn: {
    backgroundColor: PALETTE.tomato,
    borderColor: PALETTE.espresso,
  },
  targetChipText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.espresso,
  },
  targetChipTextOn: {
    color: '#FFFFFF',
  },
  cancel: { marginTop: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Fredoka_600SemiBold', color: PALETTE.espresso, fontSize: 16 },
  accessoryBar: {
    backgroundColor: PALETTE.paper,
    borderTopWidth: 1,
    borderTopColor: PALETTE.creamEdge,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  doneBtn: {
    backgroundColor: PALETTE.cream,
    borderWidth: 1,
    borderColor: PALETTE.creamEdge,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneBtnText: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 14,
    color: PALETTE.espresso,
  },
});
