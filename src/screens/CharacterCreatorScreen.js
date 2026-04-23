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
import AnimatedClouds from '../components/AnimatedClouds';

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
      <AnimatedClouds minFrac={0.38} maxFrac={0.93} count={3} />
      <View style={styles.inner}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>CREATE YOUR CHEF</Text>
          <Text style={styles.sub}>Snap a selfie to become your cartoon kitchen champion.</Text>
        </View>

        <TouchableOpacity
          style={styles.viewfinderRing}
          onPress={openCamera}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Open camera to take selfie"
        >
          <View style={styles.viewfinderOuterGlow} />
          <View style={styles.viewfinderInner}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.viewfinderImage} resizeMode="cover" />
            ) : (
              <View style={styles.viewfinderPlaceholder}>
                <Text style={styles.cameraGlyph}>📷</Text>
                <View style={styles.tapHintPill}>
                  <Text style={styles.tapHint}>Tap to open camera</Text>
                </View>
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

        <View style={styles.ctaDock}>
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
    paddingTop: 18,
    alignItems: 'center',
  },
  titleWrap: {
    alignSelf: 'stretch',
    backgroundColor: PALETTE.paper,
    borderWidth: 3,
    borderColor: PALETTE.creamEdge,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 18,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontFamily: 'TitanOne_400Regular',
    fontSize: 32,
    color: PALETTE.red,
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    textShadowColor: PALETTE.espresso,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15.5,
    color: PALETTE.espresso,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  viewfinderRing: {
    width: VIEWFINDER + 16,
    height: VIEWFINDER + 16,
    borderRadius: (VIEWFINDER + 16) / 2,
    borderWidth: 5,
    borderColor: PALETTE.espresso,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: PALETTE.espresso,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  viewfinderOuterGlow: {
    position: 'absolute',
    width: VIEWFINDER + 4,
    height: VIEWFINDER + 4,
    borderRadius: (VIEWFINDER + 4) / 2,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
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
    gap: 10,
  },
  cameraGlyph: {
    fontSize: 52,
  },
  tapHintPill: {
    backgroundColor: PALETTE.paper,
    borderColor: PALETTE.creamEdge,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tapHint: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 12.5,
    color: PALETTE.espresso,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
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
    color: PALETTE.espresso,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    lineHeight: 19,
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.creamEdge,
    borderRadius: 12,
    paddingVertical: 8,
    alignSelf: 'stretch',
  },
  ctaDock: {
    alignSelf: 'stretch',
    marginTop: 'auto',
    paddingBottom: 12,
    paddingTop: 8,
  },
  cta: {
    alignSelf: 'stretch',
    marginBottom: 0,
  },
});
