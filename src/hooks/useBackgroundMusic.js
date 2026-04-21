import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = 'cookoff_bg_muted';

export function useBackgroundMusic() {
  const soundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(MUTE_KEY);
        if (mounted && stored != null) {
          setIsMuted(stored === '1');
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    (async () => {
      if (!soundRef.current) {
        try {
          await Audio.setAudioModeAsync({
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            // Placeholder track path; replace this file with your final music asset.
            require('../../assets/music/bg.mp3'),
            { isLooping: true, volume: 0.5, shouldPlay: !isMuted }
          );
          if (!mounted) {
            await sound.unloadAsync();
            return;
          }
          soundRef.current = sound;
        } catch {
          return;
        }
      } else if (isMuted) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [ready, isMuted]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const toggleMute = useCallback(async () => {
    setIsMuted((m) => {
      const next = !m;
      AsyncStorage.setItem(MUTE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  return { isMuted, toggleMute };
}
