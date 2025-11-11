import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export interface GamificationSummaryCardProps {
  level: number;
  totalPoints: number;
  xp: number;
  xpToNextLevel: number;
  levelProgress: number;
  unlockedCount: number;
  lockedCount: number;
  totalTransactions: number;
  variant?: "light" | "dark";
  containerMode?: boolean;
}

export const GamificationSummaryCard: React.FC<GamificationSummaryCardProps> = ({
  level,
  totalPoints,
  xp,
  xpToNextLevel,
  levelProgress,
  unlockedCount,
  lockedCount,
  totalTransactions,
  variant = "light",
  containerMode = false,
}) => {
  const styles = variant === "light" ? lightStyles : darkStyles;
  const cardStyle = containerMode
    ? [styles.summaryCard, { backgroundColor: "transparent", marginHorizontal: 0, marginTop: 0, borderRadius: 0, boxShadow: "none", elevation: 0 }]
    : styles.summaryCard;

  return (
    <View style={cardStyle}>
      <View style={styles.summaryHeader}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Level {level}</Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsLabel}>Total Points</Text>
          <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.xpContainer}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLabel}>XP Progress</Text>
          <Text style={styles.xpText}>
            {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
          </Text>
        </View>
        <View style={styles.xpProgressBar}>
          <View
            style={[
              styles.xpProgressFill,
              {
                width: `${Math.min(levelProgress, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push("/achievements?filter=unlocked")}
        >
          <Text style={styles.statValue}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push("/achievements?filter=locked")}
        >
          <Text style={styles.statValue}>{lockedCount}</Text>
          <Text style={styles.statLabel}>Locked</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => router.push("/transactions")}
        >
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const commonStyles = {
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  levelBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pointsContainer: {
    alignItems: "flex-end",
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
};

const lightStyles = StyleSheet.create({
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    boxShadow: "0px 4px 8px 0px rgba(0, 0, 0, 0.1)",
    elevation: 5,
  },
  ...commonStyles,
  levelBadge: {
    ...commonStyles.levelBadge,
    backgroundColor: "#4939b0",
    borderWidth: 0,
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
    ...commonStyles.statsRow,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
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
});

const darkStyles = StyleSheet.create({
  summaryCard: {
    backgroundColor: "transparent",
    paddingTop: 24,
  },
  ...commonStyles,
  pointsLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  xpLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  xpText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  xpProgressBar: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  statValue: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
});
