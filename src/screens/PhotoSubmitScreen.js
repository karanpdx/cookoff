import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  PALETTE,
  ChunkyBtn,
  ChunkyCard,
  DrippyTitle,
  CloudBg,
  SectionLabel,
} from '../components/DesignSystem';
import { ScreenBackButton } from '../components/ScreenBackButton';
import { useGameSession } from '../context/GameSessionContext';

export default function PhotoSubmitScreen({ route, navigation }) {
  const {
    playerName = 'Player',
    gameCode,
    role = 'COMPETITOR',
    cuisineType,
    modifiers = [],
    budget,
    skillLevel,
    avatarUri,
  } = route.params || {};
  const { addDishSubmission } = useGameSession();
  const [photoUri, setPhotoUri] = useState(null);
  const [dishName, setDishName] = useState('');

  const ensurePermission = async (permissionType) => {
    const permissionResponse =
      permissionType === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResponse.granted) {
      Alert.alert(
        'Permission needed',
        permissionType === 'camera'
          ? 'Camera access is required to take a photo.'
          : 'Library access is required to choose a photo.'
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const granted = await ensurePermission('camera');
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    const granted = await ensurePermission('library');
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!photoUri) {
      Alert.alert('No photo selected', 'Please take or choose a dish photo first.');
      return;
    }
    const name = dishName.trim();
    if (!name) {
      Alert.alert('Name your dish', 'Add a dish name so voters know what they are judging.');
      return;
    }

    addDishSubmission({ playerName, dishName: name, photoUri });
    navigation.navigate('VotingScreen', {
      playerName,
      gameCode,
      role,
      cuisineType,
      modifiers,
      budget,
      skillLevel,
      avatarUri,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <ScreenBackButton navigation={navigation} />
      <TouchableWithoutFeedback
        style={styles.dismissWrap}
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View style={styles.header}>
          <DrippyTitle size={38}>Plate It Up!</DrippyTitle>
          <Text style={styles.subtitle}>Snap your masterpiece 📸</Text>
        </View>

        {/* Dish Name Card */}
        <ChunkyCard style={styles.cardSpacing}>
          <SectionLabel>🍽️ Name Your Dish</SectionLabel>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.dishNameInput}
              placeholder="e.g. Grandma's Secret Pasta…"
              placeholderTextColor={PALETTE.espresso + '55'}
              value={dishName}
              onChangeText={setDishName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </ChunkyCard>

        {/* Photo Area Card */}
        <ChunkyCard bg={PALETTE.paper} style={styles.cardSpacing} p={0}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.placeholderCameraEmoji}>📷</Text>
              <Text style={styles.placeholderText}>[ your dish goes here ]</Text>
            </View>
          )}
        </ChunkyCard>

        {/* Photo buttons row */}
        <View style={styles.photoButtonRow}>
          <View style={styles.photoButtonWrap}>
            <ChunkyBtn
              bg={PALETTE.tomato}
              shadowColor={PALETTE.espresso}
              color="#FFFFFF"
              onPress={handleTakePhoto}
              small
            >
              📷 Take Photo
            </ChunkyBtn>
          </View>
          <View style={styles.photoButtonWrap}>
            <ChunkyBtn
              bg={PALETTE.paper}
              shadowColor={PALETTE.espresso}
              color={PALETTE.espresso}
              onPress={handleChooseFromLibrary}
              small
            >
              🖼 Library
            </ChunkyBtn>
          </View>
        </View>

        {/* Submit button */}
        <View style={styles.submitWrap}>
          <ChunkyBtn
            bg={PALETTE.leaf}
            shadowColor={PALETTE.espresso}
            color="#FFFFFF"
            onPress={handleSubmit}
            disabled={!photoUri}
          >
            Submit & go to voting →
          </ChunkyBtn>
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  dismissWrap: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 17,
    color: PALETTE.espresso,
    marginTop: 8,
    textAlign: 'center',
  },
  cardSpacing: {
    marginBottom: 16,
  },
  inputRow: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dishNameInput: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 20,
    color: PALETTE.red,
    paddingVertical: 10,
  },
  previewImage: {
    width: '100%',
    height: 230,
    borderRadius: 21,
  },
  photoPlaceholder: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.cream,
    borderRadius: 21,
  },
  placeholderCameraEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  placeholderText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    color: PALETTE.espresso + '88',
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoButtonWrap: {
    flex: 1,
  },
  submitWrap: {
    marginTop: 4,
  },
});
