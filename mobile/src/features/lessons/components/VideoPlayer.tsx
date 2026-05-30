import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface Props {
  videoUrl?: string | null;
}

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = Math.round(width * (9 / 16));

export function VideoPlayer({ videoUrl }: Props) {
  if (!videoUrl) {
    return <View style={[styles.placeholder, { height: VIDEO_HEIGHT }]} />;
  }

  return (
    <Video
      source={{ uri: videoUrl }}
      style={[styles.video, { height: VIDEO_HEIGHT }]}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
      shouldPlay={false}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    backgroundColor: '#000',
  },
  placeholder: {
    width: '100%',
    backgroundColor: '#000',
  },
});
