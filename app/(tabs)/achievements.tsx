import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { getMyTransactions, Transaction } from "../../api/transactions";
import { getMyProfile, UserProfile } from "../../api/auth";
import { useGamification, Achievement } from "../../hooks/useGamification";

type AchievementFilter = "unlocked" | "locked" | null;

export default function AchievementsPage() {
  const params = useLocalSearchParams<{ filter: string | string[] }>();
  const filterParam = Array.isArray(params.filter)
    ? params.filter[0]
    : params.filter;
  const filter: AchievementFilter =
    filterParam === "unlocked" || filterParam === "locked"
      ? filterParam
      : null;

  const { isAuthenticated } = useAuth();

  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useQuery<Transaction[]>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
  });

  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery<UserProfile>({
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4939b0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Achievements</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === null && styles.filterButtonActive,
            ]}
            onPress={() => router.replace("/achievements")}
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
            onPress={() => router.replace("/achievements?filter=unlocked")}
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
            onPress={() => router.replace("/achievements?filter=locked")}
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
        </View>

        {/* Achievements List */}
        {filteredAchievements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === "unlocked"
                ? "No unlocked achievements yet"
                : filter === "locked"
                ? "No locked achievements"
                : "No achievements found"}
            </Text>
          </View>
        ) : (
          <View style={styles.achievementsList}>
            {filteredAchievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementCardLocked,
                ]}
              >
                <View style={styles.achievementIconContainer}>
                  <Text
                    style={[
                      styles.achievementIcon,
                      !achievement.unlocked && styles.achievementIconLocked,
                    ]}
                  >
                    {achievement.icon}
                  </Text>
                </View>
                <View style={styles.achievementDetails}>
                  <Text
                    style={[
                      styles.achievementName,
                      !achievement.unlocked && styles.achievementNameLocked,
                    ]}
                  >
                    {achievement.name}
                  </Text>
                  <Text
                    style={[
                      styles.achievementDescription,
                      !achievement.unlocked && styles.achievementDescriptionLocked,
                    ]}
                  >
                    {achievement.description}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${
                              (achievement.progress / achievement.maxProgress) *
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
                </View>
                {achievement.unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedBadgeText}>✓</Text>
                  </View>
                )}
              </View>
            ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4939b0",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "700",
  },
  placeholder: {
    width: 60,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonActive: {
    backgroundColor: "#4939b0",
    borderColor: "#4939b0",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  achievementsList: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  achievementCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    elevation: 3,
    alignItems: "center",
  },
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIconContainer: {
    marginRight: 16,
  },
  achievementIcon: {
    fontSize: 48,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 4,
  },
  achievementNameLocked: {
    color: "#6B7280",
  },
  achievementDescription: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
    marginBottom: 8,
  },
  achievementDescriptionLocked: {
    color: "#9CA3AF",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4939b0",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    minWidth: 60,
    textAlign: "right",
  },
  unlockedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unlockedBadgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
});

