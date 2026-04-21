import React, { useMemo } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const CLOUD_STROKE = '#2B1810';
const CLOUD_FILL = '#FFFFFF';
const CLOUD_COUNT = 6;

function BumpyCloud({ width }) {
  const height = width * 0.52;
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 240 125" preserveAspectRatio="xMidYMid meet">
        <Path
          d="M38,102 C10,102 4,68 28,56 C22,24 58,6 96,22 C112,-2 154,-4 182,18 C212,6 244,34 232,62 C248,78 238,108 206,108 L52,108 C44,108 38,102 38,102 Z"
          fill={CLOUD_FILL}
          stroke={CLOUD_STROKE}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default function AnimatedClouds({ style }) {
  const screen = Dimensions.get('window');
  const clouds = useMemo(() => {
    return Array.from({ length: CLOUD_COUNT }).map((_, i) => {
      const width = rand(90, 170);
      const top = rand(20, Math.max(24, screen.height - 150));
      const baseX = rand(-screen.width, screen.width);
      const x = new Animated.Value(baseX);
      const duration = rand(40000, 60000);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(x, {
            toValue: -width - 80,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(x, {
            toValue: screen.width + rand(20, 180),
            duration: 20,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return { key: `cloud-${i}`, width, top, x, opacity: rand(0.68, 0.92) };
    });
  }, [screen.height, screen.width]);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {clouds.map((c) => (
        <Animated.View
          key={c.key}
          style={[
            styles.cloudWrap,
            {
              top: c.top,
              opacity: c.opacity,
              transform: [{ translateX: c.x }],
            },
          ]}
        >
          <BumpyCloud width={c.width} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  cloudWrap: {
    position: 'absolute',
  },
});
