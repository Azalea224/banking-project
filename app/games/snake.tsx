import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { BRAND_COLOR_MAIN, BRAND_COLOR_SECONDARY } from "../../components/AnimatedBackground";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GRID_SIZE = 20;
const CELL_SIZE = Dimensions.get("window").width / GRID_SIZE;
const INITIAL_SPEED = 150;
const HIGH_SCORE_KEY = "snake_high_score";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [foodEaten, setFoodEaten] = useState(false);
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<Direction>("RIGHT");
  const scoreScale = useRef(new Animated.Value(1)).current;
  const foodPulse = useRef(new Animated.Value(1)).current;
  const joystickX = useRef(new Animated.Value(0)).current;
  const joystickY = useRef(new Animated.Value(0)).current;

  // Load high score on mount
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const saved = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (saved) {
          setHighScore(parseInt(saved, 10));
        }
      } catch (error) {
        console.error("Error loading high score:", error);
      }
    };
    loadHighScore();
  }, []);

  // Animate food pulsing
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(foodPulse, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(foodPulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  const generateFood = useCallback((): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y)
    );
    return newFood;
  }, [snake]);

  const checkCollision = (head: Position, body: Position[]): boolean => {
    // Check wall collision
    if (
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE
    ) {
      return true;
    }
    // Check self collision
    return body.some(
      (segment, index) =>
        index > 0 && segment.x === head.x && segment.y === head.y
    );
  };

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake((prevSnake) => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      const currentDirection = directionRef.current;

      // Move head based on direction
      switch (currentDirection) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      // Check collision
      if (checkCollision(head, newSnake)) {
        setGameOver(true);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check if food eaten
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => {
          const newScore = prev + 10;
          // Save high score
          if (newScore > highScore) {
            setHighScore(newScore);
            AsyncStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
          }
          return newScore;
        });
        setFoodEaten(true);
        setTimeout(() => setFoodEaten(false), 200);
        setFood(generateFood());
        // Animate score
        Animated.sequence([
          Animated.timing(scoreScale, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scoreScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, gameOver, isPaused, generateFood, highScore, scoreScale]);

  useEffect(() => {
    if (!gameOver && !isPaused) {
      gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [moveSnake, gameOver, isPaused]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const handleDirectionChange = useCallback((newDirection: Direction) => {
    // Prevent reversing into itself
    const currentDir = directionRef.current;
    if (
      (currentDir === "UP" && newDirection === "DOWN") ||
      (currentDir === "DOWN" && newDirection === "UP") ||
      (currentDir === "LEFT" && newDirection === "RIGHT") ||
      (currentDir === "RIGHT" && newDirection === "LEFT")
    ) {
      return;
    }
    // Only update if direction actually changed
    if (currentDir !== newDirection) {
      setDirection(newDirection);
    }
  }, []);

  // Joystick PanResponder
  const joystickPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsJoystickActive(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const maxDistance = 60; // Maximum joystick movement distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate limited position for animation
        let limitedDx = dx;
        let limitedDy = dy;
        if (distance > maxDistance) {
          const angle = Math.atan2(dy, dx);
          limitedDx = Math.cos(angle) * maxDistance;
          limitedDy = Math.sin(angle) * maxDistance;
        }
        
        // Animate joystick handle
        Animated.parallel([
          Animated.timing(joystickX, {
            toValue: limitedDx,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(joystickY, {
            toValue: limitedDy,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start();

        // Determine direction based on ORIGINAL joystick position (not limited)
        // This ensures direction detection works even when constrained
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const threshold = 15; // Minimum movement to trigger direction change

        if (absDx < threshold && absDy < threshold) return;

        // Use original dx/dy for direction detection, not limited values
        if (absDx > absDy) {
          // Horizontal movement
          if (dx > threshold) {
            handleDirectionChange("RIGHT");
          } else if (dx < -threshold) {
            handleDirectionChange("LEFT");
          }
        } else {
          // Vertical movement
          if (dy > threshold) {
            handleDirectionChange("DOWN");
          } else if (dy < -threshold) {
            handleDirectionChange("UP");
          }
        }
      },
      onPanResponderRelease: () => {
        setIsJoystickActive(false);
        Animated.parallel([
          Animated.spring(joystickX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.spring(joystickY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]).start();
      },
    })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const threshold = 30; // Minimum swipe distance

        if (absDx < threshold && absDy < threshold) return;

        if (absDx > absDy) {
          // Horizontal swipe
          if (dx > 0) {
            handleDirectionChange("RIGHT");
          } else {
            handleDirectionChange("LEFT");
          }
        } else {
          // Vertical swipe
          if (dy > 0) {
            handleDirectionChange("DOWN");
          } else {
            handleDirectionChange("UP");
          }
        }
      },
    })
  ).current;

  const restartGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setFoodEaten(false);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>🐍 SNAKE</Text>
        </View>
        <TouchableOpacity
          style={styles.pauseHeaderButton}
          onPress={togglePause}
          activeOpacity={0.7}
        >
          <Text style={styles.pauseHeaderButtonText}>
            {isPaused ? "▶" : "⏸"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Score Display */}
      <View style={styles.scoreSection}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Animated.Text
            style={[
              styles.scoreValue,
              { transform: [{ scale: scoreScale }] },
            ]}
          >
            {score}
          </Animated.Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>BEST</Text>
          <Text style={styles.highScoreValue}>{highScore}</Text>
        </View>
      </View>

      {/* Game Board */}
      <View style={styles.gameContainer} {...panResponder.panHandlers}>
        <View style={styles.gameBoard}>
          {/* Grid pattern background */}
          <View style={styles.gridPattern} />
          
          {/* Render food */}
          <Animated.View
            style={[
              styles.cell,
              styles.food,
              foodEaten && styles.foodEaten,
              {
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                transform: [{ scale: foodPulse }],
              },
            ]}
          >
            <View style={styles.foodInner} />
          </Animated.View>

          {/* Render snake */}
          {snake.map((segment, index) => (
            <View
              key={index}
              style={[
                styles.cell,
                styles.snake,
                index === 0 && styles.snakeHead,
                {
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                },
              ]}
            >
              {index === 0 && <View style={styles.snakeEye} />}
            </View>
          ))}
        </View>

        {gameOver && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverEmoji}>💀</Text>
              <Text style={styles.gameOverTitle}>GAME OVER</Text>
              <Text style={styles.gameOverScore}>Score: {score}</Text>
              {score === highScore && score > 0 && (
                <Text style={styles.newRecordText}>🏆 NEW RECORD!</Text>
              )}
              <TouchableOpacity
                style={styles.restartButton}
                onPress={restartGame}
                activeOpacity={0.8}
              >
                <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isPaused && !gameOver && (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pauseEmoji}>⏸</Text>
            <Text style={styles.pauseText}>PAUSED</Text>
          </View>
        )}
      </View>

      {/* Joystick Control */}
      <View style={styles.controls}>
        <View style={styles.joystickContainer} {...joystickPanResponder.panHandlers}>
          {/* Joystick Base */}
          <View style={styles.joystickBase}>
            {/* Direction indicators */}
            <View style={styles.directionIndicator}>
              <View style={[styles.directionDot, styles.directionDotUp]} />
              <View style={[styles.directionDot, styles.directionDotRight]} />
              <View style={[styles.directionDot, styles.directionDotDown]} />
              <View style={[styles.directionDot, styles.directionDotLeft]} />
            </View>
          </View>
          {/* Joystick Handle */}
          <Animated.View
            style={[
              styles.joystickHandle,
              {
                transform: [
                  { translateX: joystickX },
                  { translateY: joystickY },
                ],
              },
            ]}
          >
            <View style={styles.joystickHandleInner} />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E27",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#0F1429",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  pauseHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_COLOR_MAIN,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseHeaderButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: "#1A1F3A",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: BRAND_COLOR_MAIN,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND_COLOR_MAIN,
  },
  highScoreValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FBBF24",
  },
  gameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  gameBoard: {
    width: GRID_SIZE * CELL_SIZE,
    height: GRID_SIZE * CELL_SIZE,
    backgroundColor: "#1A1F3A",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: BRAND_COLOR_MAIN,
    position: "relative",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  gridPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1A1F3A",
    opacity: 0.3,
  },
  cell: {
    position: "absolute",
  },
  snake: {
    backgroundColor: BRAND_COLOR_MAIN,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: BRAND_COLOR_SECONDARY,
  },
  snakeHead: {
    backgroundColor: BRAND_COLOR_SECONDARY,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_SECONDARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  snakeEye: {
    position: "absolute",
    top: "25%",
    left: "25%",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  food: {
    justifyContent: "center",
    alignItems: "center",
  },
  foodInner: {
    width: "70%",
    height: "70%",
    backgroundColor: "#EF4444",
    borderRadius: CELL_SIZE / 2,
    borderWidth: 2,
    borderColor: "#FCA5A5",
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  foodEaten: {
    opacity: 0.5,
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  gameOverCard: {
    backgroundColor: "#1A1F3A",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
    borderWidth: 3,
    borderColor: BRAND_COLOR_MAIN,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  gameOverEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 12,
    letterSpacing: 2,
  },
  gameOverScore: {
    fontSize: 24,
    fontWeight: "700",
    color: BRAND_COLOR_MAIN,
    marginBottom: 8,
  },
  newRecordText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FBBF24",
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: BRAND_COLOR_MAIN,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  restartButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  pauseEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  pauseText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  controls: {
    padding: 20,
    paddingBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  joystickContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  joystickBase: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#1A1F3A",
    borderWidth: 4,
    borderColor: BRAND_COLOR_MAIN,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  directionIndicator: {
    width: 120,
    height: 120,
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  directionDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLOR_SECONDARY,
    opacity: 0.6,
  },
  directionDotUp: {
    top: 0,
    left: "50%",
    marginLeft: -4,
  },
  directionDotRight: {
    right: 0,
    top: "50%",
    marginTop: -4,
  },
  directionDotDown: {
    bottom: 0,
    left: "50%",
    marginLeft: -4,
  },
  directionDotLeft: {
    left: 0,
    top: "50%",
    marginTop: -4,
  },
  joystickHandle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: BRAND_COLOR_SECONDARY,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_SECONDARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  joystickHandleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_COLOR_MAIN,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
