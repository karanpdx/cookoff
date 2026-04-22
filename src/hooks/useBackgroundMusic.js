import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = 'cookoff_bg_muted';

/** Resolved at build time; load/decode failures are caught below (see console.warn). */
const BG_MP3 = require('../../assets/music/bg.mp3');

export function useBackgroundMusic() {
  const soundRef = useRef(null);
  const loadFailedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [musicAvailable, setMusicAvailable] = useState(false);

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
    if (!ready || loadFailedRef.current) return;
    let mounted = true;

    (async () => {
      if (!soundRef.current) {
        try {
          await Audio.setAudioModeAsync({
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
          });
          const { sound } = await Audio.Sound.createAsync(BG_MP3, {
            isLooping: true,
            volume: 0.5,
            shouldPlay: !isMuted,
          });
          if (!mounted) {
            await sound.unloadAsync();
            return;
          }
          soundRef.current = sound;
          setMusicAvailable(true);
        } catch {
          console.warn('bg music file missing — skipping');
          loadFailedRef.current = true;
          if (mounted) setMusicAvailable(false);
        }
      } else if (isMuted) {
        try {
          await soundRef.current.pauseAsync();
        } catch {
          /* ignore */
        }
      } else {
        try {
          await soundRef.current.playAsync();
        } catch {
          /* ignore */
        }
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
    if (loadFailedRef.current || !soundRef.current) return;
    setIsMuted((m) => {
      const next = !m;
      AsyncStorage.setItem(MUTE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  return { isMuted, toggleMute, musicAvailable };
}
