/**
 * useSoundEffect — lazy-load audio on demand.
 *
 * Instead of preloading on mount (which fails silently when the network is slow
 * or the sound isn't cached), we load + play every time play() is called.
 * The OS audio cache handles repeated calls efficiently.
 *
 * Usage:
 *   const play = useSoundEffect({ uri: 'https://...' });
 *   // or: useSoundEffect(require('../assets/sounds/page-flip.mp3'));
 */
import { useCallback } from 'react';
import { Audio } from 'expo-av';
import type { AVPlaybackSource } from 'expo-av';

export function useSoundEffect(source: AVPlaybackSource) {
  const play = useCallback(async () => {
    let sound: Audio.Sound | null = null;
    try {
      // Configure audio mode — play even when device is in silent mode (iOS)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:      false,
        playsInSilentModeIOS:    true,   // important for short UI sounds on iOS
        staysActiveInBackground: false,
        shouldDuckAndroid:       false,
      });

      // Load + play in one call; the OS cache makes repeat calls instant
      const result = await Audio.Sound.createAsync(source, {
        shouldPlay: true,   // start immediately after load
        volume:     1.0,
      });
      sound = result.sound;

      // Unload automatically when playback finishes (no memory leak)
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound?.unloadAsync().catch(() => {});
        }
      });
    } catch {
      // A sound effect must never crash the UI
      if (sound) sound.unloadAsync().catch(() => {});
    }
  }, [source]);

  return play;
}
