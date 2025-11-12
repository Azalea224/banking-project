import React, {
  useMemo,
  useState,
  useRef, // Import useRef
  useEffect, // Import useEffect
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { getMyTransactions, Transaction } from "../../api/transactions";
import { getMyProfile, UserProfile } from "../../api/auth";
import { useGamification, Achievement } from "../../hooks/useGamification";
import BottomNav from "../../components/BottomNav";
import { AnimatedBackground, BRAND_COLOR_MAIN, BRAND_COLOR_SECONDARY, BRAND_COLOR_LIGHT_BG, BRAND_COLOR_DARK_BG } from "../../components/AnimatedBackground";
import {
  TOTAL_POINTS_ICON,
  EXPERIENCE_ICON,
  NEXT_LEVEL_TARGET_ICON,
  MAX_LEVEL_ICON,
  LOCK_ICON,
  UNLOCKED_BADGE_ICON,
  CLOSE_ICON,
  CHECKMARK_ICON,
  EMPTY_STATE_UNLOCKED_ICON,
  EMPTY_STATE_LOCKED_ICON,
} from "../../constants/imageAssets";
import StableImage from "../../components/StableImage";

type AchievementFilter = "unlocked" | "locked" | null;

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";

export default function LevelPage() {
  const params = useLocalSearchParams<{ filter: string | string[] }>();
  const filterParam = Array.isArray(params.filter)
    ? params.filter[0]
    : params.filter;
  const filter: AchievementFilter =
    filterParam === "unlocked" || filterParam === "locked"
      ? filterParam
      : null;

  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { isAuthenticated, username } = useAuth();

  const { data: transactions, isLoading: transactionsLoading } =
    useQuery<Transaction[]>({
      queryKey: ["myTransactions"],
      queryFn: getMyTransactions,
      enabled: isAuthenticated,
    });

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const gamification = useGamification(transactions, profile);

  const filteredAchievements = useMemo(() => {
    if (!gamification.achievements) return [];
    if (filter === "unlocked") {
      return gamification.achievements.filter((a) => a.unlocked);
    } else if (filter === "locked") {
      return gamification.achievements.filter((a) => !a.unlocked);
    }
    return gamification.achievements;
  }, [gamification.achievements, filter]);

  const isLoading = transactionsLoading || profileLoading;

  const getImageUri = (image?: string) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const handleAchievementPress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = getImageUri(profile?.image);
  const xpNeeded = gamification.xpToNextLevel - gamification.xp;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      {/* CREATIVE UPDATE: Added animated background */}
      <AnimatedBackground />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            {/* Decorative background elements - Kept from original, good idea */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />

            {/* Profile Header with Level Badge on Side */}
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImagePlaceholderText}>
                      {username?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.profileInfoContainer}>
                <Text style={styles.profileUsername} numberOfLines={1}>
                  {username || "User"}
                </Text>

                {/* Level and Points Stats Row */}
                <View style={styles.statsRow}>
                  {/* DESIGN FIX: Replaced complex 'shield' with a cleaner 'badge' */}
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeLabel}>LEVEL</Text>
                    <Text style={styles.levelBadgeNumber}>
                      {gamification.level}
                    </Text>
                  </View>

                  {/* Total Points Info */}
                  <View style={styles.totalPointsContainer}>
                    <View style={styles.totalPointsIconContainer}>
                      <StableImage
                        source={TOTAL_POINTS_ICON}
                        style={styles.totalPointsIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.totalPointsTextContainer}>
                      <Text style={styles.totalPointsValue}>
                        {gamification.totalPoints}
                      </Text>
                      <Text style={styles.totalPointsLabel}>Total Points</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* XP Progress Section - More Engaging */}
            <View style={styles.xpContainer}>
              <View style={styles.xpHeader}>
                <View style={styles.xpIconContainer}>
                  <StableImage
                    source={EXPERIENCE_ICON}
                    style={styles.xpIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.xpInfo}>
                  <Text style={styles.xpLabel}>Experience Points</Text>
                  <Text style={styles.xpValue}>{gamification.xp} XP</Text>
                </View>
              </View>

              {/* Animated Progress Bar */}
              <View style={styles.xpProgressBarContainer}>
                <View style={styles.xpProgressBar}>
                  <View
                    style={[
                      styles.xpProgressFill,
                      {
                        width: `${gamification.levelProgress}%`,
                      },
                    ]}
                  >
                    <View style={styles.xpProgressShine} />
                  </View>

                  {/* DESIGN FIX: Progress text is now centered *inside* the bar */}
                  <View style={styles.xpProgressLabels}>
                    <Text style={styles.xpProgressLabelText}>
                      {gamification.xp} / {gamification.xp + xpNeeded}
                    </Text>
                  </View>

                  {/* Progress indicator dot */}
                  {gamification.levelProgress > 5 &&
                    gamification.levelProgress < 98 && (
                      <View
                        style={[
                          styles.xpProgressDot,
                          {
                            left: `${gamification.levelProgress}%`,
                          },
                        ]}
                      >
                        <View style={styles.xpProgressDotInner} />
                      </View>
                    )}
                </View>
              </View>

              {/* Next Level Info */}
              <View style={styles.nextLevelContainer}>
                <View style={styles.nextLevelIcon}>
                  <StableImage
                    source={NEXT_LEVEL_TARGET_ICON}
                    style={styles.nextLevelIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.xpToNext} numberOfLines={2}>
                  {xpNeeded > 0 ? (
                    <>
                      <Text style={styles.xpToNextBold}>{xpNeeded} XP</Text> to
                      reach Level {gamification.level + 1}
                    </>
                  ) : (
                    <View style={styles.maxLevelContainer}>
                      <StableImage
                        source={MAX_LEVEL_ICON}
                        style={styles.maxLevelIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.maxLevelText}>Max Level Achieved!</Text>
                    </View>
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>

          {/* Filter Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === null && styles.filterButtonActive,
              ]}
              onPress={() => router.replace("/level")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === null && styles.filterButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "unlocked" && styles.filterButtonActive,
              ]}
              onPress={() => router.replace("/level?filter=unlocked")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === "unlocked" && styles.filterButtonTextActive,
                ]}
              >
                Unlocked
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "locked" && styles.filterButtonActive,
              ]}
              onPress={() => router.replace("/level?filter=locked")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === "locked" && styles.filterButtonTextActive,
                ]}
              >
                Locked
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Achievements List */}
          {filteredAchievements.length === 0 ? (
            <View style={styles.emptyContainer}>
              {/* DESIGN FIX: Added an icon for a friendlier empty state */}
              <StableImage
                source={
                  filter === "unlocked"
                    ? EMPTY_STATE_UNLOCKED_ICON
                    : EMPTY_STATE_LOCKED_ICON
                }
                style={styles.emptyIcon}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>
                {filter === "unlocked"
                  ? "No unlocked achievements yet.\nKeep playing to earn them!"
                  : filter === "locked"
                  ? "All achievements unlocked!"
                  : "No achievements found"}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.achievementsScrollView}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.achievementsList}>
                {filteredAchievements.map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    !achievement.unlocked && styles.achievementCardLocked,
                  ]}
                  onPress={() => handleAchievementPress(achievement)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.achievementIconContainer,
                      !achievement.unlocked &&
                        styles.achievementIconContainerLocked,
                    ]}
                  >
                    {typeof achievement.icon === "string" ? (
                      <Text style={styles.achievementIcon}>
                        {achievement.icon}
                      </Text>
                    ) : (
                      <StableImage
                        source={achievement.icon}
                        style={styles.achievementIconImage}
                        resizeMode="contain"
                      />
                    )}
                    {!achievement.unlocked && (
                      <View style={styles.lockOverlay}>
                        <StableImage
                          source={LOCK_ICON}
                          style={styles.lockIcon}
                          resizeMode="contain"
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.achievementDetails}>
                    <Text
                      style={[
                        styles.achievementName,
                        !achievement.unlocked && styles.achievementNameLocked,
                      ]}
                      numberOfLines={1}
                    >
                      {achievement.name}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDescription,
                        !achievement.unlocked &&
                          styles.achievementDescriptionLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {achievement.description}
                    </Text>
                    {achievement.unlocked && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${
                                  (achievement.progress /
                                    achievement.maxProgress) *
                                  100
                                }%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {achievement.progress} / {achievement.maxProgress}
                        </Text>
                      </View>
                    )}
                  </View>
                  {achievement.unlocked && (
                    <View style={styles.unlockedBadge}>
                      <StableImage
                        source={UNLOCKED_BADGE_ICON}
                        style={styles.unlockedBadgeImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Achievement Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAchievement && (
              <>
                <View style={styles.modalHeader}>
                  {typeof selectedAchievement.icon === "string" ? (
                    <Text style={styles.modalIcon}>
                      {selectedAchievement.icon}
                    </Text>
                  ) : (
                    <StableImage
                      source={selectedAchievement.icon}
                      style={styles.modalIconImage}
                      resizeMode="contain"
                    />
                  )}
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <StableImage
                      source={CLOSE_ICON}
                      style={styles.modalCloseImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalTitle}>
                  {selectedAchievement.name}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedAchievement.description}
                </Text>
                <View style={styles.modalProgressSection}>
                  <View style={styles.modalProgressBar}>
                    <View
                      style={[
                        styles.modalProgressFill,
                        {
                          width: `${
                            (selectedAchievement.progress /
                              selectedAchievement.maxProgress) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.modalProgressText}>
                    {selectedAchievement.progress} /{" "}
                    {selectedAchievement.maxProgress}
                  </Text>
                </View>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      selectedAchievement.unlocked &&
                        styles.modalStatusBadgeUnlocked,
                    ]}
                >
                  {selectedAchievement.unlocked ? (
                    <View style={styles.modalStatusUnlockedContainer}>
                      <StableImage
                        source={CHECKMARK_ICON}
                        style={styles.modalCheckmark}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.modalStatusText,
                          styles.modalStatusTextUnlocked,
                        ]}
                      >
                        Unlocked
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalStatusLockedContainer}>
                      <StableImage
                        source={LOCK_ICON}
                        style={styles.modalLockIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.modalStatusText}>Locked</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}

// DESIGN FIX: All styles have been reviewed and polished.
// 'boxShadow' replaced with platform-specific shadow props.
// Alignments and 'gamey' elements have been enhanced.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    zIndex: 1, // ScrollView must be on top of the background
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 0, // Adjust for Android
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: BRAND_COLOR_SECONDARY,
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    // DESIGN FIX: Replaced web 'boxShadow' with proper RN shadows
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_SECONDARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
    overflow: "hidden",
    position: "relative",
  },
  // DESIGN FIX: Made decorative circles more subtle
  decorativeCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(91, 99, 232, 0.05)", // Use brand color, very light
    top: -40,
    right: -40,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(91, 99, 232, 0.05)",
    bottom: -20,
    left: -20,
  },
  decorativeCircle3: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(91, 99, 232, 0.05)",
    top: 60,
    left: -10,
  },
  profileHeader: {
    flexDirection: "row",
    // DESIGN FIX: Changed to 'center' for better vertical alignment
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
    zIndex: 1,
  },
  profileImageContainer: {
    marginRight: 16,
    // DESIGN FIX: Added shadow props for the container
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    borderRadius: 45, // Match image border radius
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#FFFFFF", // Changed border to white to pop off shadow
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileImagePlaceholderText: {
    fontSize: 36,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  profileInfoContainer: {
    flex: 1,
    justifyContent: "center", // Center content vertically
  },
  profileUsername: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12, // Reduced margin
    zIndex: 1,
  },
  statsRow: {
    flexDirection: "row",
    // DESIGN FIX: Key alignment fix. Changed from 'flex-end' to 'center'.
    alignItems: "center",
    zIndex: 1,
  },

  // --- DESIGN FIX: Replaced 'LevelShield' with 'LevelBadge' ---
  levelBadge: {
    width: 75, // Slightly reduced to give more space to points
    height: 80,
    borderRadius: 40, // Made it a circle
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10, // Slightly reduced margin
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.5)", // Softer border
    // Added shadow to the badge itself
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  levelBadgeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  levelBadgeNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // --- End of LevelBadge styles ---

  totalPointsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    minHeight: 80, // Kept minHeight to match
    minWidth: 0, // Allow flex to shrink if needed
  },
  totalPointsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND_COLOR_LIGHT_BG, // Use brand color
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  totalPointsIcon: {
    width: 28,
    height: 28,
  },
  totalPointsTextContainer: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0, // Allow flex to work properly
  },
  totalPointsValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF", // White for dark bg
    lineHeight: 24,
  },
  totalPointsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D1D5DB", // Lighter gray for dark bg
    marginTop: 0,
    lineHeight: 16,
  },
  xpContainer: {
    width: "100%",
    zIndex: 1,
  },
  xpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  xpIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_COLOR_LIGHT_BG, // Use brand color
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C7D2FE", // Softer border
    marginRight: 12,
  },
  xpIcon: {
    width: 28,
    height: 28,
  },
  xpInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB", // Lighter gray for dark bg
  },
  xpValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF", // White for dark bg
  },
  xpProgressBarContainer: {
    marginBottom: 12, // Increased margin
  },
  xpProgressBar: {
    height: 20, // Made bar slightly thicker
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "#F3F4F6",
    justifyContent: "center", // Center the absolute positioned text
  },
  xpProgressFill: {
    height: "100%",
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  xpProgressShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Shine effect
  },
  xpProgressDot: {
    position: "absolute",
    top: -4,
    width: 28, // Made dot bigger
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 4, // Thicker border
    borderColor: BRAND_COLOR_MAIN, // Use new brand color
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -14, // Adjust for new width
    // DESIGN FIX: Proper shadow
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_MAIN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 20, // Ensure dot is on top
  },
  xpProgressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
  },
  // DESIGN FIX: Labels moved to be absolute positioned inside the bar
  xpProgressLabels: {
    position: "absolute",
    width: "100%",
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  xpProgressLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    // Added text shadow to make it readable on both colors
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Removed old label styles (xpProgressCurrent, Separator, Next)

  nextLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  nextLevelIcon: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  nextLevelIconImage: {
    width: 23,
    height: 23,
  },
  maxLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  maxLevelIcon: {
    width: 23,
    height: 23,
    marginRight: 6,
  },
  maxLevelText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  xpToNext: {
    fontSize: 13,
    color: "#D1D5DB", // Lighter gray for dark bg
    textAlign: "center",
    fontWeight: "500",
    flex: 1,
  },
  xpToNextBold: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF", // White for dark bg
  },
  achievementsSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 20, // Increased margin
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10, // Increased padding
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    // DESIGN FIX: Added subtle shadow to buttons
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.05)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterButtonActive: {
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    borderColor: BRAND_COLOR_MAIN,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  achievementsScrollView: {
    maxHeight: 400, // Limit height for scrollable area
  },
  achievementsList: {
    // Gap handled by marginBottom in achievementCard
  },
  achievementCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12, // Reduced from 16
    // DESIGN FIX: Proper shadow
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.08)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  achievementCardLocked: {
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.05,
      },
      android: {
        elevation: 2, // Less pop for locked cards
      },
    }),
  },
  achievementIconContainer: {
    width: 56, // Reduced from 64
    height: 56, // Reduced from 64
    borderRadius: 14, // Reduced from 16
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12, // Reduced from 16
    position: "relative",
  },
  achievementIconContainerLocked: {
    backgroundColor: "#F3F4F6",
  },
  achievementIcon: {
    fontSize: 32, // Reduced from 36
  },
  achievementIconImage: {
    width: 37,
    height: 37,
  },
  lockOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(249, 250, 251, 0.7)", // Match locked card bg
    borderRadius: 14, // Match container minus border
    justifyContent: "center",
    alignItems: "center",
  },
  lockIcon: {
    width: 32,
    height: 32,
    opacity: 0.8,
  },
  achievementDetails: {
    flex: 1,
    justifyContent: "center",
  },
  achievementName: {
    fontSize: 15, // Reduced from 16
    color: "#065F46",
    fontWeight: "700",
    marginBottom: 3, // Reduced from 4
  },
  achievementNameLocked: {
    color: "#6B7280",
  },
  achievementDescription: {
    fontSize: 12, // Reduced from 13
    color: "#047857",
    fontWeight: "400",
    marginBottom: 6, // Reduced from 8
    lineHeight: 16, // Reduced from 18
  },
  achievementDescriptionLocked: {
    color: "#9CA3AF",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
    minWidth: 55,
    textAlign: "right",
    marginLeft: 8,
  },
  unlockedBadge: {
    width: 36, // Reduced from 40
    height: 36, // Reduced from 40
    borderRadius: 18, // Reduced from 20
    backgroundColor: "#FFD700", // Gold color
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10, // Reduced from 12
    borderWidth: 2,
    borderColor: "#FFFFFF",
    // DESIGN FIX: Proper shadow
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.1)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  unlockedBadgeText: {
    color: "#FFFFFF",
    fontSize: 18, // Reduced from 20
    fontWeight: "700",
  },
  unlockedBadgeImage: {
    width: 21,
    height: 21,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
  },
  // DESIGN FIX: Added icon style
  emptyIcon: {
    width: 55,
    height: 55,
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    // DESIGN FIX: Proper shadow
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.2)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Align to top
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 64,
    marginRight: 16, // Add space
  },
  modalIconImage: {
    width: 74,
    height: 74,
    marginRight: 16,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 24,
    color: "#6B7280",
    fontWeight: "600",
    lineHeight: 28, // Fix for 'x' alignment
    marginTop: -2, // Pixel-push alignment
  },
  modalCloseImage: {
    width: 23,
    height: 23,
  },
  modalStatusUnlockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCheckmark: {
    width: 18,
    height: 18,
    marginRight: 4,
  },
  modalStatusLockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLockIcon: {
    width: 18,
    height: 18,
    marginRight: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 24,
  },
  modalProgressSection: {
    marginBottom: 20,
  },
  modalProgressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  modalProgressFill: {
    height: "100%",
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    borderRadius: 4,
  },
  modalProgressText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
  },
  modalStatusBadge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalStatusBadgeUnlocked: {
    backgroundColor: "#D1FAE5",
  },
  modalStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalStatusTextUnlocked: {
    color: "#065F46",
  },
});
