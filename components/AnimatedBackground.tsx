import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Dimensions } from "react-native";

// Brand colors
export const BRAND_COLOR_MAIN = "#5b63e8";
export const BRAND_COLOR_SECONDARY = "#263367";
export const BRAND_COLOR_LIGHT_BG = "rgba(91, 99, 232, 0.1)"; // Main color with 10% opacity
export const BRAND_COLOR_DARK_BG = "rgba(38, 51, 103, 0.1)"; // Secondary color with 10% opacity

const { width, height } = Dimensions.get("window");

export const AnimatedBackground = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (anim: Animated.Value) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 15000 + Math.random() * 5000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 15000 + Math.random() * 5000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
    };

    createAnimation(anim1).start();
    createAnimation(anim2).start();
    createAnimation(anim3).start();
  }, [anim1, anim2, anim3]);

  const orb1Style = {
    transform: [
      {
        translateY: anim1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -100],
        }),
      },
      {
        translateX: anim1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 50],
        }),
      },
    ],
    opacity: anim1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1, 0.8],
    }),
  };

  const orb2Style = {
    transform: [
      {
        translateY: anim2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 100],
        }),
      },
      {
        translateX: anim2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50],
        }),
      },
    ],
    opacity: anim2.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.7, 1, 0.7],
    }),
  };

  const orb3Style = {
    transform: [
      {
        translateY: anim3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50],
        }),
      },
      {
        translateX: anim3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 80],
        }),
      },
    ],
    opacity: anim3.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.9, 0.6],
    }),
  };

  return (
    <View style={styles.animatedBgContainer}>
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
      <Animated.View style={[styles.orb, styles.orb3, orb3Style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  animatedBgContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 500,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -100,
    left: -50,
    backgroundColor: BRAND_COLOR_LIGHT_BG,
  },
  orb2: {
    width: 400,
    height: 400,
    top: height * 0.2,
    right: -150,
    backgroundColor: BRAND_COLOR_DARK_BG,
  },
  orb3: {
    width: 250,
    height: 250,
    bottom: -80,
    left: 20,
    backgroundColor: BRAND_COLOR_LIGHT_BG,
  },
});

