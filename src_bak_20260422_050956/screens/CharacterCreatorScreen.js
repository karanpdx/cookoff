import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PALETTE, CloudBg, ChunkyBtn } from '../components/DesignSystem';

const VIEWFINDER = Math.min(280, Dimensions.get('window').width - 48);

export default function CharacterCreatorScreen({ navigation }) {
  const [avatarUri, setAvatarUri] = useState(null);

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take your chef selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: avatarUri ? { avatarUri } : {} }],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <CloudBg />
      <View style={styles.inner}>
        <Text style={styles.title}>CREATE YOUR CHEF</Text>
        <Text style={styles.sub}>Snap a selfie — we will use it as your cartoon chef avatar.</Text>

        <TouchableOpacity
          style={styles.viewfinderRing}
          onPress={openCamera}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Open camera to take selfie"
        >
          <View style={styles.viewfinderInner}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.viewfinderImage} resizeMode="cover" />
            ) : (
              <View style={styles.viewfinderPlaceholder}>
                <Text style={styles.cameraGlyph}>📷</Text>
                <Text style={styles.tapHint}>Tap to open camera</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {avatarUri ? (
          <View style={styles.previewWrap}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.previewBorder}>
              <Image source={{ uri: avatarUri }} style={styles.previewImage} resizeMode="cover" />
            </View>
          </View>
        ) : (
          <Text style={styles.previewEmpty}>Your preview will appear here after you take a photo.</Text>
        )}

        <ChunkyBtn
          bg={PALETTE.yellow}
          shadowColor={PALETTE.espresso}
          color={PALETTE.espresso}
          onPress={goHome}
          disabled={!avatarUri}
          style={styles.cta}
        >
          LOOKS GREAT →
        </ChunkyBtn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.sky,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 28,
    color: PALETTE.red,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  viewfinderRing: {
    width: VIEWFINDER + 16,
    height: VIEWFINDER + 16,
    borderRadius: (VIEWFINDER + 16) / 2,
    borderWidth: 4,
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  viewfinderInner: {
    width: VIEWFINDER,
    height: VIEWFINDER,
    borderRadius: VIEWFINDER / 2,
    overflow: 'hidden',
    backgroundColor: PALETTE.cream,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
  },
  viewfinderImage: {
    width: '100%',
    height: '100%',
  },
  viewfinderPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraGlyph: {
    fontSize: 52,
  },
  tapHint: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 13,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12,
    color: PALETTE.espresso,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  previewBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: PALETTE.paper,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewEmpty: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: PALETTE.espresso + '99',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: 'auto',
    marginBottom: 16,
  },
});
