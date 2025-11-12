import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { router, useFocusEffect } from "expo-router";
import { getMyTransactions, Transaction } from "../api/transactions";
import { getAllUsers, User, getUserById } from "../api/auth";
import { getMyProfile, UserProfile } from "../api/auth";
import { Skeleton, SkeletonText, SkeletonCircle } from "../components/Skeleton";
import { useGamification } from "../hooks/useGamification";
import { GamificationSummaryCard } from "../components/GamificationSummaryCard";
import { useSound } from "../hooks/useSound";

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";

// Format numbers with commas and decimals
const formatAmount = (amount: number, decimals: number = 3): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

type TransactionFilter = "deposit" | "withdraw" | "transfer" | null;

export default function HomePage() {
  const { username, logout, isAuthenticated, isLoading, userId, setUserId } =
    useAuth();
  const [selectedFilter, setSelectedFilter] = useState<TransactionFilter>(null);
  const [imageError, setImageError] = useState(false);
  const [seenTransactionIds, setSeenTransactionIds] = useState<
    Set<string | number>
  >(new Set());
  const { playSound } = useSound();
  const queryClient = useQueryClient();

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery<Transaction[]>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
    enabled: isAuthenticated,
  });

  // Gamification stats (only for level button)
  const gamification = useGamification(transactions, profile);

  // Extract unique user IDs from transactions that aren't in allUsers
  // User IDs can be alphanumeric strings (letters and numbers)
  const missingUserIds = useMemo(() => {
    if (!transactions || !allUsers) return [];

    // MongoDB uses _id, but some APIs might use id
    const allUserIds = new Set(
      allUsers.map((u) => (u._id ?? u.id)?.toString()).filter(Boolean)
    );
    const allUsernames = new Set(allUsers.map((u) => u.username));
    const missingIds: (string | number)[] = [];

    transactions.forEach((transaction) => {
      // Check 'from' field
      if (transaction.from) {
        const fromValue = transaction.from.toString();

        // Skip if it's already a username (exists in usernames)
        if (allUsernames.has(fromValue)) {
          // Already have this username, skip
        } else {
          // Check if it's already in allUserIds (by string comparison)
          const isInAllUserIds = allUserIds.has(fromValue);

          // If not in allUserIds and not already in missingIds, add it
          // This handles both numeric IDs and alphanumeric string IDs
          if (
            !isInAllUserIds &&
            !missingIds.includes(fromValue) &&
            !missingIds.includes(transaction.from)
          ) {
            // Use the original value (could be string or number)
            missingIds.push(transaction.from);
          }
        }
      }

      // Check 'to' field
      if (transaction.to) {
        const toValue = transaction.to.toString();

        // Skip if it's already a username (exists in usernames)
        if (allUsernames.has(toValue)) {
          // Already have this username, skip
        } else {
          // Check if it's already in allUserIds (by string comparison)
          const isInAllUserIds = allUserIds.has(toValue);

          // If not in allUserIds and not already in missingIds, add it
          // This handles both numeric IDs and alphanumeric string IDs
          if (
            !isInAllUserIds &&
            !missingIds.includes(toValue) &&
            !missingIds.includes(transaction.to)
          ) {
            // Use the original value (could be string or number)
            missingIds.push(transaction.to);
          }
        }
      }
    });

    if (missingIds.length > 0) {
      console.log("Missing user IDs found in transactions:", missingIds);
    }

    return missingIds;
  }, [transactions, allUsers]);

  // Fetch missing users by ID with better error handling
  // Handles both numeric and alphanumeric string IDs
  const missingUsersQueries = useQuery({
    queryKey: ["missingUsers", missingUserIds],
    queryFn: async () => {
      const users: User[] = [];
      const errors: { userId: string | number; error: any }[] = [];

      for (const userId of missingUserIds) {
        try {
          const user = await getUserById(userId);
          if (user && user.username) {
            users.push(user);
            console.log(
              `Successfully fetched user ${userId}: ${user.username}`
            );
          }
        } catch (error: any) {
          // Log error but don't fail the entire query
          const errorMessage =
            error?.response?.data?.message || error?.message || "Unknown error";
          const status = error?.response?.status;
          errors.push({ userId, error });

          // Only log as warning if it's not a 500 error (which might be expected for invalid IDs)
          if (status === 500) {
            console.warn(
              `Server error fetching user ${userId} (500): The user may not exist or the API endpoint may have issues`
            );
          } else if (status === 404) {
            console.warn(`User ${userId} not found (404)`);
          } else {
            console.warn(
              `Failed to fetch user ${userId} (${status}):`,
              errorMessage
            );
          }
        }
      }

      if (errors.length > 0 && users.length === 0) {
        console.warn(`Failed to fetch all missing users. Errors:`, errors);
      }

      return users;
    },
    enabled: isAuthenticated && missingUserIds.length > 0,
    retry: false, // Don't retry failed requests to avoid spamming the API
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Combine allUsers with fetched missing users
  const allUsersWithMissing = useMemo(() => {
    const combined = [...(allUsers || [])];
    if (missingUsersQueries.data && missingUsersQueries.data.length > 0) {
      console.log("Fetched missing users:", missingUsersQueries.data);
      combined.push(...missingUsersQueries.data);
    }
    return combined;
  }, [allUsers, missingUsersQueries.data]);

  // Get dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else {
      return "Good Evening";
    }
  };

  const greeting = getGreeting();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/register");
    }
  }, [isAuthenticated, isLoading, router]);

  // Store user ID in context when profile is loaded (fallback if not set during login)
  useEffect(() => {
    if (profile) {
      const profileUserId = profile._id ?? profile.id;
      console.log("HomePage - Profile loaded:", profile);
      console.log("HomePage - Profile _id:", profile._id);
      console.log("HomePage - Profile id:", profile.id);
      console.log("HomePage - Current userId from context:", userId);
      console.log("HomePage - Profile userId:", profileUserId);

      // Only update if we don't have a userId or if the profile has a different/valid userId
      if (profileUserId !== undefined && profileUserId !== null && setUserId) {
        if (userId === null || userId === undefined) {
          console.log(
            "HomePage - Setting userId from profile (was null/undefined)"
          );
          setUserId(profileUserId).catch((error) => {
            console.error("HomePage - Error storing user ID:", error);
          });
        } else if (String(userId) !== String(profileUserId)) {
          console.log(
            "HomePage - Updating userId from profile (different value)"
          );
          setUserId(profileUserId).catch((error) => {
            console.error("HomePage - Error updating user ID:", error);
          });
        }
      }
    }
  }, [profile, userId, setUserId]);

  // Reset image error when profile image changes
  useEffect(() => {
    if (profile?.image) {
      setImageError(false);
    }
  }, [profile?.image]);

  // Refetch transactions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["myTransactions"] });
        refetchTransactions();
      }
    }, [isAuthenticated, queryClient, refetchTransactions])
  );

  // Format transactions for display
  const formattedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    // Create a map of user ID to username for quick lookup
    // Use allUsersWithMissing which includes both allUsers and fetched missing users
    // Handle both numeric and string IDs
    const userIdToUsernameMap = new Map<string | number, string>();
    if (allUsersWithMissing) {
      allUsersWithMissing.forEach((user) => {
        // MongoDB uses _id, but some APIs might use id
        const userId = user._id ?? user.id;
        if (userId !== undefined) {
          // Store both the original ID and its string representation for lookup
          userIdToUsernameMap.set(userId, user.username);
          userIdToUsernameMap.set(userId.toString(), user.username);
        }
      });
    }

    return sortedTransactions.slice(0, 10).map((transaction) => {
      // Helper function to get username from ID or return the value if it's already a username
      // Handles both numeric IDs and alphanumeric string IDs
      const getUsername = (
        value: string | number | undefined
      ): string | undefined => {
        if (!value) return undefined;

        const valueStr = value.toString();

        // First, try to find it directly in the map (handles both string and number keys)
        const directMatch =
          userIdToUsernameMap.get(value) || userIdToUsernameMap.get(valueStr);
        if (directMatch) {
          return directMatch;
        }

        // If not found, check if the value itself is a username (exists in map values)
        // Username comparison should be case-insensitive
        for (const [id, username] of userIdToUsernameMap.entries()) {
          if (username.toLowerCase() === valueStr.toLowerCase()) {
            return username; // Return the actual username from map to preserve casing
          }
        }

        // If it's a string and not found in the map, it might be:
        // 1. An alphanumeric ID that we haven't fetched yet
        // 2. Already a username
        // For now, if it's not in our map, assume it's a username and return it as-is
        // This will display the ID/username until we can fetch the actual username
        return valueStr;
      };

      const fromUsername = getUsername(transaction.from);
      const toUsername = getUsername(transaction.to);

      // Log username resolution for debugging
      if (transaction.from && !fromUsername) {
        console.log(`Could not resolve username for from: ${transaction.from}`);
      }
      if (transaction.to && !toUsername) {
        console.log(`Could not resolve username for to: ${transaction.to}`);
      }

      // Determine if transaction is income or expense
      let isIncome = false;
      let isExpense = false;

      if (transaction.type === "deposit") {
        isIncome = true;
      } else if (transaction.type === "withdraw") {
        isExpense = true;
      } else if (transaction.type === "transfer") {
        // If I'm receiving money (from is someone else)
        // Username comparison should be case-insensitive
        if (
          fromUsername &&
          fromUsername.toLowerCase() !== username?.toLowerCase()
        ) {
          isIncome = true;
        }
        // If I'm sending money (to is someone else)
        if (
          toUsername &&
          toUsername.toLowerCase() !== username?.toLowerCase()
        ) {
          isExpense = true;
        }
      }

      let title = "";
      if (transaction.type === "deposit") {
        title = "Deposit";
      } else if (transaction.type === "withdraw") {
        title = "Withdrawal";
      } else if (transaction.type === "transfer") {
        // If from exists and is not me, I received money
        // Username comparison should be case-insensitive
        if (
          fromUsername &&
          fromUsername.toLowerCase() !== username?.toLowerCase()
        ) {
          title = `Transfer from ${fromUsername}`;
        } else if (
          toUsername &&
          toUsername.toLowerCase() !== username?.toLowerCase()
        ) {
          title = `Transfer to ${toUsername}`;
        } else {
          title = "Transfer";
        }
      }

      const formattedAmount = isIncome
        ? `+${formatAmount(transaction.amount)} KWD`
        : `-${formatAmount(transaction.amount)} KWD`;

      // Format date
      const date = new Date(transaction.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let dateString = "";
      if (diffDays === 0) {
        dateString = "Today";
      } else if (diffDays === 1) {
        dateString = "Yesterday";
      } else if (diffDays < 7) {
        dateString = `${diffDays} days ago`;
      } else {
        dateString = date.toLocaleDateString();
      }

      // Get ID from either 'id' or '_id' field (MongoDB uses _id)
      const transactionId = transaction._id ?? transaction.id;

      return {
        id: transactionId,
        title,
        amount: formattedAmount,
        date: dateString,
        type: isIncome ? "income" : "expense",
        transactionType: transaction.type, // Store original transaction type for filtering
        originalTransaction: transaction, // Keep reference to original for ID lookup
      };
    });
  }, [transactions, username, allUsersWithMissing]);

  // Initialize seen transaction IDs on first load
  useEffect(() => {
    if (
      formattedTransactions &&
      formattedTransactions.length > 0 &&
      seenTransactionIds.size === 0
    ) {
      // Mark all current transactions as seen on initial load
      const initialIds = new Set<string | number>();
      formattedTransactions.forEach((transaction) => {
        if (transaction.id !== undefined && transaction.id !== null) {
          initialIds.add(transaction.id);
        }
      });
      setSeenTransactionIds(initialIds);
    }
  }, [formattedTransactions, seenTransactionIds.size]);

  // Detect new income transactions and play receive sound
  useEffect(() => {
    if (
      !formattedTransactions ||
      formattedTransactions.length === 0 ||
      seenTransactionIds.size === 0
    )
      return;

    // Find new income transactions that haven't been seen before
    const newIncomeTransactions = formattedTransactions.filter(
      (transaction) =>
        transaction.type === "income" &&
        transaction.id !== undefined &&
        transaction.id !== null &&
        !seenTransactionIds.has(transaction.id)
    );

    // Play sound for each new income transaction
    if (newIncomeTransactions.length > 0) {
      playSound("Receive.mp3");

      // Update seen transaction IDs
      const newSeenIds = new Set(seenTransactionIds);
      newIncomeTransactions.forEach((transaction) => {
        if (transaction.id !== undefined && transaction.id !== null) {
          newSeenIds.add(transaction.id);
        }
      });
      setSeenTransactionIds(newSeenIds);
    }
  }, [formattedTransactions, seenTransactionIds, playSound]);

  // Filter transactions based on selected filter
  const filteredTransactions = useMemo(() => {
    if (!selectedFilter) {
      return formattedTransactions;
    }
    return formattedTransactions.filter(
      (transaction) => transaction.transactionType === selectedFilter
    );
  }, [formattedTransactions, selectedFilter]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Skeleton width={120} height={16} borderRadius={4} />
              <Skeleton
                width={150}
                height={24}
                borderRadius={4}
                style={{ marginTop: 8 }}
              />
            </View>
            <View style={styles.headerButtons}>
              <SkeletonCircle size={44} />
              <SkeletonCircle size={44} style={{ marginLeft: 12 }} />
              <SkeletonCircle size={44} style={{ marginLeft: 12 }} />
            </View>
          </View>
          <View style={styles.unifiedCardContainer}>
            <View style={styles.unifiedCard}>
              <View style={styles.balanceHeader}>
                <SkeletonCircle size={72} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Skeleton width={100} height={14} borderRadius={4} />
                  <Skeleton
                    width={200}
                    height={28}
                    borderRadius={4}
                    style={{ marginTop: 4 }}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.quickActionsContainer}>
            <Skeleton width={150} height={20} borderRadius={4} />
            <View style={styles.quickActionsGrid}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.quickActionButton}>
                  <SkeletonCircle size={56} />
                  <Skeleton
                    width={60}
                    height={12}
                    borderRadius={4}
                    style={{ marginTop: 8 }}
                  />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Skeleton width={180} height={20} borderRadius={4} />
              <Skeleton width={60} height={14} borderRadius={4} />
            </View>
            <View style={styles.filterContainer}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width={70} height={32} borderRadius={20} />
              ))}
            </View>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.transactionItem}>
                <SkeletonCircle size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width="60%" height={16} borderRadius={4} />
                  <Skeleton
                    width="40%"
                    height={14}
                    borderRadius={4}
                    style={{ marginTop: 4 }}
                  />
                </View>
                <Skeleton width={80} height={16} borderRadius={4} />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Don't render anything if not authenticated - redirect will happen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4939b0" />
        </View>
      </SafeAreaView>
    );
  }

  // Format balance from profile
  const accountBalance =
    profile?.balance !== undefined ? formatAmount(profile.balance) : "0.000";

  const quickActions = [
    {
      id: 1,
      label: "Send",
      icon: require("../assets/Send.png"),
      route: "/transfer",
      isImage: true,
    },
    {
      id: 2,
      label: "Receive",
      icon: require("../assets/Receive.png"),
      route: "/generate-link",
      isImage: true,
    },
    {
      id: 3,
      label: "Deposit to Account",
      icon: require("../assets/Deposit.png"),
      route: "/deposit",
      isImage: true,
    },
    {
      id: 4,
      label: "Withdraw from Account",
      icon: require("../assets/Withdraw.png"),
      route: "/withdraw",
      isImage: true,
    },
  ];

  const handleLogout = () => {
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) {
        logout()
          .then(() => {
            router.replace("/register");
          })
          .catch((error) => {
            console.error("Logout error:", error);
            window.alert("Failed to logout. Please try again.");
          });
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/register");
            } catch (error) {
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{username || ""}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("/profile")}
            >
              <Image
                source={require("../assets/Profile.png")}
                style={styles.profileIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.levelButton}
              onPress={() => router.push("/achievements")}
            >
              <Text style={styles.levelButtonText}>L{gamification.level}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logoutButton, { marginLeft: 12 }]}
              onPress={handleLogout}
            >
              <Image
                source={require("../assets/LogOut.png")}
                style={styles.logoutIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.unifiedCardContainer}>
          <View style={styles.unifiedCard}>
            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <View style={styles.balanceHeader}>
                <View style={styles.profileImageContainer}>
                  {profile?.image && !imageError ? (
                    <Image
                      source={{
                        uri: (() => {
                          const imageValue = profile.image;
                          if (typeof imageValue === "string") {
                            return imageValue.startsWith("http")
                              ? imageValue
                              : `${BASE_URL}${
                                  imageValue.startsWith("/") ? "" : "/"
                                }${imageValue}`;
                          } else if (
                            imageValue &&
                            typeof imageValue === "object"
                          ) {
                            const imageObj = imageValue as any;
                            return imageObj.uri || String(imageObj) || "";
                          }
                          return "";
                        })(),
                      }}
                      style={styles.profileImage}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Text style={styles.profileImagePlaceholderText}>
                        {profile?.username?.charAt(0).toUpperCase() ||
                          username?.charAt(0).toUpperCase() ||
                          "U"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.balanceHeaderText}>
                  <Text style={styles.balanceLabel}>Total Balance</Text>
                  {profileLoading ? (
                    <Skeleton width={200} height={36} borderRadius={4} />
                  ) : (
                    <Text style={styles.balanceAmount}>
                      {accountBalance} KWD
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Achievements Section */}
            {gamification && (
              <>
                <View style={styles.sectionDivider} />
                <GamificationSummaryCard
                  level={gamification.level}
                  totalPoints={gamification.totalPoints}
                  xp={gamification.xp}
                  xpToNextLevel={gamification.xpToNextLevel}
                  levelProgress={gamification.levelProgress}
                  unlockedCount={
                    gamification.achievements.filter((a) => a.unlocked).length
                  }
                  lockedCount={
                    gamification.achievements.filter((a) => !a.unlocked).length
                  }
                  totalTransactions={gamification.totalTransactions}
                  variant="dark"
                  containerMode={true}
                />
                {gamification.achievements.filter((a) => a.unlocked).length >
                  0 && (
                  <View style={styles.recentAchievementsSection}>
                    <View style={styles.recentAchievementsHeader}>
                      <Text style={styles.recentAchievementsTitle}>
                        Recent Achievements
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          router.push("/achievements?filter=unlocked")
                        }
                      >
                        <Text style={styles.seeAllText}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recentAchievementsScroll}
                      contentContainerStyle={styles.recentAchievementsList}
                    >
                      {gamification.achievements
                        .filter((a) => a.unlocked)
                        .slice(0, 5)
                        .map((achievement) => (
                          <TouchableOpacity
                            key={achievement.id}
                            style={styles.recentAchievementItem}
                            onPress={() =>
                              router.push("/achievements?filter=unlocked")
                            }
                          >
                            <Text style={styles.recentAchievementIcon}>
                              {achievement.icon}
                            </Text>
                            <Text style={styles.recentAchievementName}>
                              {achievement.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionButton}
                onPress={() => {
                  if (action.route) {
                    router.push(action.route as any);
                  }
                }}
              >
                <View style={styles.quickActionIcon}>
                  {action.isImage ? (
                    <Image
                      source={action.icon}
                      style={styles.quickActionImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.quickActionIconText}>
                      {action.icon}
                    </Text>
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push("/transactions")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === null && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(null)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === null && styles.filterButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "deposit" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("deposit")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === "deposit" && styles.filterButtonTextActive,
                ]}
              >
                Deposit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "withdraw" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("withdraw")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === "withdraw" &&
                    styles.filterButtonTextActive,
                ]}
              >
                Withdraw
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "transfer" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("transfer")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === "transfer" &&
                    styles.filterButtonTextActive,
                ]}
              >
                Transfer
              </Text>
            </TouchableOpacity>
          </View>

          {transactionsLoading ? (
            <View>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.transactionItem}>
                  <SkeletonCircle size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Skeleton width="60%" height={16} borderRadius={4} />
                    <Skeleton
                      width="40%"
                      height={14}
                      borderRadius={4}
                      style={{ marginTop: 4 }}
                    />
                  </View>
                  <Skeleton width={80} height={16} borderRadius={4} />
                </View>
              ))}
            </View>
          ) : transactionsError ? (
            <View style={styles.transactionErrorContainer}>
              <Text style={styles.errorText}>Failed to load transactions</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.transactionEmptyContainer}>
              <Text style={styles.emptyText}>
                {selectedFilter
                  ? `No ${selectedFilter} transactions found`
                  : "No transactions yet"}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((transaction, index) => {
              // Use the original transaction's ID directly (check both '_id' and 'id' for MongoDB)
              const original = transaction.originalTransaction;
              const transactionId =
                original?._id ?? original?.id ?? transaction.id;

              return (
                <TouchableOpacity
                  key={transaction.id || `transaction-${index}`}
                  style={styles.transactionItem}
                  onPress={() => {
                    if (transactionId !== undefined && transactionId !== null) {
                      router.push(`/transaction-detail?id=${transactionId}`);
                    } else {
                      console.warn(
                        "Cannot navigate: transaction ID is undefined",
                        transaction
                      );
                    }
                  }}
                >
                  <View style={styles.transactionIcon}>
                    <Text style={styles.transactionIconText}>
                      {transaction.type === "income" ? "💰" : "🛒"}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.title}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {transaction.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === "income"
                        ? styles.incomeAmount
                        : styles.expenseAmount,
                    ]}
                  >
                    {transaction.amount}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
  headerButtons: {
    flexDirection: "row",
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400",
  },
  userName: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "700",
    marginTop: 4,
  },
  levelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4939b0",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 2px 4px 0px rgba(73, 57, 176, 0.3)",
    elevation: 3,
  },
  levelButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    elevation: 3,
    marginRight: 12,
  },
  profileIcon: {
    width: 50,
    height: 50,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  logoutIcon: {
    width: 60,
    height: 60,
  },
  unifiedCardContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  unifiedCard: {
    backgroundColor: "#4939b0",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0px 4px 8px 0px rgba(121, 120, 236, 0.3)",
    elevation: 5,
    overflow: "hidden",
  },
  balanceSection: {
    // Balance section styles are now part of unified card
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 20,
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: "#4939b0",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    boxShadow: "0px 4px 8px 0px rgba(121, 120, 236, 0.3)",
    elevation: 5,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileImagePlaceholderText: {
    fontSize: 28,
    color: "#4939b0",
    fontWeight: "700",
  },
  balanceHeaderText: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#93C5FD",
    fontWeight: "500",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  accountInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    paddingTop: 16,
  },
  accountItem: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 12,
    color: "#93C5FD",
    fontWeight: "400",
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  quickActionsContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  quickActionButton: {
    width: "22%",
    alignItems: "center",
    marginBottom: 16,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    boxShadow: "0px 2px 4px 0px rgba(73, 57, 176, 0.2)",
    elevation: 3,
    borderWidth: 2,
    borderColor: "#F3F4F6",
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionImage: {
    width: 75,
    height: 75,
  },
  quickActionLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  transactionsContainer: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
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
  seeAllText: {
    fontSize: 14,
    color: "#4939b0",
    fontWeight: "600",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  incomeAmount: {
    color: "#10B981",
  },
  expenseAmount: {
    color: "#EF4444",
  },
  transactionLoadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  transactionErrorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  transactionEmptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  recentAchievementsSection: {
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 24,
  },
  recentAchievementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  recentAchievementsTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  recentAchievementsScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    marginTop: 0,
  },
  recentAchievementsList: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 24,
  },
  recentAchievementItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  recentAchievementIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  recentAchievementName: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
});
