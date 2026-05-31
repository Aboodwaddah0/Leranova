/**
 * PendulumRope
 * A thin rope + ball that sways back and forth from its hanging point.
 * Pivot trick: the visible rope sits in the BOTTOM half of a container
 * whose height = 2 × ropeLength, so React Native's center-based rotation
 * lands exactly at the rope's top — giving true pendulum physics.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface Props {
  color?:       string;
  ropeLength?:  number;   // visible rope length in px (default 38)
  ballSize?:    number;   // ball diameter (default 9)
  /** swing half-angle in degrees (default 14) */
  angle?:       number;
  /** one half-swing duration in ms (default 1100) */
  period?:      number;
}

export function PendulumRope({
  color      = 'rgba(255,255,255,0.75)',
  ropeLength = 38,
  ballSize   = 9,
  angle      = 14,
  period     = 1100,
}: Props) {
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [sway, period]);

  const rotate = sway.interpolate({
    inputRange:  [-1, 1],
    outputRange: [`-${angle}deg`, `${angle}deg`],
  });

  // Container height = 2× so the pivot sits at the container center,
  // which coincides with the rope's top edge.
  const containerH = ropeLength * 2;
  const lineH      = ropeLength - ballSize - 2;

  return (
    <View style={{ height: containerH, width: 20, alignItems: 'center' }}>
      <Animated.View
        style={[
          S.container,
          { height: containerH, transform: [{ rotate }] },
        ]}
      >
        {/* Rope line */}
        <View style={[S.line, { height: lineH, backgroundColor: color }]} />
        {/* Ball */}
        <View
          style={[
            S.ball,
            {
              width:           ballSize,
              height:          ballSize,
              borderRadius:    ballSize / 2,
              backgroundColor: color,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    width:          20,
    alignItems:     'center',
    justifyContent: 'flex-end',   // push line+ball to lower half = below pivot
  },
  line: {
    width:        2,
    borderRadius: 1,
  },
  ball: {
    marginTop: 2,
    // subtle shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius:  3,
    elevation:     4,
  },
});
