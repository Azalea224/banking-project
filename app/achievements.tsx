import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import { getMyTransactions, Transaction } from "../api/transactions";
import { getMyProfile, UserProfile } from "../api/auth";
import { useGamification } from "../hooks/useGamification";

export default function AchievementsPage() {
  const { isAuthenticated } = useAuth();

  const { data: transactions, isLoading: transactionsLoading } = useQuery<
    Transaction[]
  >({
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

  const unlockedAchievements = gamification.achievements.filter(
    (a) => a.unlocked
  );
  const lockedAchievements = gamification.achievements.filter(
    (a) => !a.unlocked
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Level and Stats Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>
                Level {gamification.level}
              </Text>
            </View>
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsLabel}>Total Points</Text>
              <Text style={styles.pointsValue}>
                {gamification.totalPoints.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.xpContainer}>
            <View style={styles.xpHeader}>
              <Text style={styles.xpLabel}>XP Progress</Text>
              <Text style={styles.xpText}>
                {gamification.xp.toLocaleString()} /{" "}
                {gamification.xpToNextLevel.toLocaleString()} XP
              </Text>
            </View>
            <View style={styles.xpProgressBar}>
              <View
                style={[
                  styles.xpProgressFill,
                  {
                    width: `${Math.min(gamification.levelProgress, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {unlockedAchievements.length}
              </Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{lockedAchievements.length}</Text>
              <Text style={styles.statLabel}>Locked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {gamification.totalTransactions}
              </Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
          </View>
        </View>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ✅ Unlocked ({unlockedAchievements.length})
            </Text>
            <View style={styles.achievementsGrid}>
              {unlockedAchievements.map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    styles.achievementCardUnlocked,
                  ]}
                  onPress={() => {
                    if (Platform.OS === "web") {
                      window.alert(
                        `${achievement.icon} ${achievement.name}\n\n${achievement.description}\n\n✅ Unlocked\nCompleted!`
                      );
                    } else {
                      Alert.alert(
                        `${achievement.icon} ${achievement.name}`,
                        `${achievement.description}\n\n✅ Unlocked\nCompleted!`,
                        [{ text: "OK" }]
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={styles.achievementName} numberOfLines={2}>
                    {achievement.name}
                  </Text>
                  <Text style={styles.achievementDescription} numberOfLines={2}>
                    {achievement.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🔒 Locked ({lockedAchievements.length})
            </Text>
            <View style={styles.achievementsGrid}>
              {lockedAchievements.map((achievement) => {
                const progressPercent = Math.min(
                  (achievement.progress / achievement.maxProgress) * 100,
                  100
                );
                return (
                  <TouchableOpacity
                    key={achievement.id}
                    style={[
                      styles.achievementCard,
                      styles.achievementCardLocked,
                    ]}
                    onPress={() => {
                      if (Platform.OS === "web") {
                        window.alert(
                          `${achievement.icon} ${achievement.name}\n\n${
                            achievement.description
                          }\n\n🔒 Locked\nProgress: ${achievement.progress} / ${
                            achievement.maxProgress
                          } (${progressPercent.toFixed(0)}%)`
                        );
                      } else {
                        Alert.alert(
                          `${achievement.icon} ${achievement.name}`,
                          `${achievement.description}\n\n🔒 Locked\nProgress: ${
                            achievement.progress
                          } / ${
                            achievement.maxProgress
                          } (${progressPercent.toFixed(0)}%)`,
                          [{ text: "OK" }]
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.achievementIconLocked}>🔒</Text>
                    <Text
                      style={[
                        styles.achievementName,
                        styles.achievementNameLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {achievement.name}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDescription,
                        styles.achievementDescriptionLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {achievement.description}
                    </Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progressPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {achievement.progress} / {achievement.maxProgress}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {gamification.achievements.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No achievements available yet. Complete transactions to unlock
              achievements! 🎯
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4939b0",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0px 4px 8px 0px rgba(0, 0, 0, 0.1)",
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: "#4939b0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pointsContainer: {
    alignItems: "flex-end",
  },
  pointsLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 24,
    color: "#4939b0",
    fontWeight: "700",
  },
  xpContainer: {
    marginBottom: 16,
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  xpText: {
    fontSize: 12,
    color: "#4939b0",
    fontWeight: "600",
  },
  xpProgressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpProgressFill: {
    height: "100%",
    backgroundColor: "#4939b0",
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  statValue: {
    fontSize: 20,
    color: "#4939b0",
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "47%",
    alignItems: "center",
    borderWidth: 2,
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    elevation: 2,
  },
  achievementCardUnlocked: {
    borderColor: "#4939b0",
    backgroundColor: "#F0EFFF",
  },
  achievementCardLocked: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    opacity: 0.8,
  },
  achievementIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  achievementIconLocked: {
    fontSize: 40,
    marginBottom: 8,
    opacity: 0.5,
  },
  achievementName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementNameLocked: {
    color: "#9CA3AF",
  },
  achievementDescription: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  achievementDescriptionLocked: {
    color: "#9CA3AF",
    opacity: 0.7,
  },
  progressContainer: {
    width: "100%",
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4939b0",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});
