import { useCallback } from 'react';
import { Platform } from 'react-native';

// Sound file mapping - React Native requires static require paths
const soundFiles: Record<string, any> = {
  'Send.mp3': require('../assets/Send.mp3'),
  'Receive.mp3': require('../assets/Receive.mp3'),
  'Deposit.mp3': require('../assets/Deposit.mp3'),
};

// Cache for audio elements (web)
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Lazy load expo-av only when needed (native platforms)
let AudioModule: any = null;
const loadAudioModule = async () => {
  if (Platform.OS === 'web' || AudioModule) return AudioModule;
  
  try {
    // Dynamic import to avoid bundling issues
    const { Audio } = await import('expo-av');
    AudioModule = Audio;
    return Audio;
  } catch (error) {
    console.warn('expo-av not available, sounds will only work on web');
    return null;
  }
};

// Get audio element for web
const getWebAudio = (soundFile: string): HTMLAudioElement | null => {
  if (Platform.OS !== 'web') return null;

  // Check cache first
  if (audioCache.has(soundFile)) {
    const audio = audioCache.get(soundFile)!;
    audio.currentTime = 0; // Reset to beginning
    return audio;
  }

  const soundSource = soundFiles[soundFile];
  if (!soundSource) return null;

  // Create new audio element
  const audio = new Audio();
  
  // For Expo web, the require() returns a path that needs to be resolved
  // Try different ways to get the URL
  if (typeof soundSource === 'string') {
    audio.src = soundSource;
  } else if (soundSource.uri) {
    audio.src = soundSource.uri;
  } else if (soundSource.default) {
    audio.src = soundSource.default;
  } else {
    // Fallback: try to construct path
    // In Expo web, assets are typically accessible via their require path
    audio.src = soundSource;
  }

  audioCache.set(soundFile, audio);
  return audio;
};

// Play sound on native using expo-av
const playNativeSound = async (soundFile: string) => {
  if (Platform.OS === 'web') return;

  try {
    const Audio = await loadAudioModule();
    if (!Audio) {
      console.warn('Audio module not available');
      return;
    }

    const soundSource = soundFiles[soundFile];
    if (!soundSource) {
      console.error(`Sound file not found: ${soundFile}`);
      return;
    }

    // Configure audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(soundSource, {
      shouldPlay: true,
      volume: 1.0,
    });

    // Release when finished
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.error('Error playing native sound:', error);
  }
};

export const useSound = () => {
  const playSound = useCallback(async (soundFile: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use HTML5 Audio for web
        const audio = getWebAudio(soundFile);
        if (audio) {
          await audio.play();
        }
      } else {
        // Use expo-av for native (with dynamic import to avoid bundling issues)
        await playNativeSound(soundFile);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  return { playSound };
};
