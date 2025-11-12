import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { router, useFocusEffect } from "expo-router";
import { getMyTransactions, Transaction } from "../api/transactions";
import { getAllUsers, User, getUserById } from "../api/auth";
import { getMyProfile, UserProfile } from "../api/auth";
import { Skeleton } from "../components/Skeleton";
import { useGamification } from "../hooks/useGamification";
import { GamificationSummaryCard } from "../components/GamificationSummaryCard";
import { useSound } from "../hooks/useSound";
import BottomNav from "../components/BottomNav";
import { AnimatedBackground, BRAND_COLOR_MAIN, BRAND_COLOR_SECONDARY, BRAND_COLOR_LIGHT_BG, BRAND_COLOR_DARK_BG } from "../components/AnimatedBackground";
import preloadImages from "../utils/imagePreloader";
import {
  SEND_ICON,
  RECEIVE_ICON,
  DEPOSIT_ICON,
  WITHDRAW_ICON,
  INCOME_TRANSACTION_ICON,
  EXPENSE_TRANSACTION_ICON,
} from "../constants/imageAssets";
import StableImage from "../components/StableImage";

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
  const { username, isAuthenticated, isLoading, userId, setUserId } =
    useAuth();
  const [selectedFilter, setSelectedFilter] = useState<TransactionFilter>(null);
  const [imageError, setImageError] = useState(false);
  const [seenTransactionIds, setSeenTransactionIds] = useState<
    Set<string | number>
  >(new Set());
  const { playSound } = useSound();
  const queryClient = useQueryClient();

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

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

  // Preload images on mount for better performance
  useEffect(() => {
    preloadImages();
  }, []);

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
    useCallback(() => {
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

  // Filter transactions based on selected filter, date range, and amount range
  const filteredTransactions = useMemo(() => {
    let filtered = formattedTransactions;

    // Filter by transaction type
    if (selectedFilter) {
      filtered = filtered.filter(
        (transaction) => transaction.transactionType === selectedFilter
      );
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter((transaction) => {
        const original = transaction.originalTransaction;
        if (!original?.createdAt) return false;

        const transactionDate = new Date(original.createdAt);
        transactionDate.setHours(0, 0, 0, 0); // Reset time to start of day

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (transactionDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // End of day
          if (transactionDate > end) return false;
        }

        return true;
      });
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      filtered = filtered.filter((transaction) => {
        const original = transaction.originalTransaction;
        if (!original?.amount) return false;

        const amount = original.amount;

        if (minAmount) {
          const min = parseFloat(minAmount);
          if (isNaN(min) || amount < min) return false;
        }

        if (maxAmount) {
          const max = parseFloat(maxAmount);
          if (isNaN(max) || amount > max) return false;
        }

        return true;
      });
    }

    return filtered;
  }, [
    formattedTransactions,
    selectedFilter,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  ]);

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedFilter(null);
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedFilter || startDate || endDate || minAmount || maxAmount;

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        {/* DESIGN FIX: Added a consistent loading container */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
        </View>
        {/* We can show Skeletons here, but a simple loader is also clean */}
        {/* The skeleton code was complex and is fine to replace with a simpler loader */}
      </SafeAreaView>
    );
  }

  // Don't render anything if not authenticated - redirect will happen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
        </View>
      </SafeAreaView>
    );
  }

  // Format balance from profile
  const accountBalance =
    profile?.balance !== undefined ? formatAmount(profile.balance) : "0.000";

  // Stable quickActions array using useMemo with imported constants
  const quickActions = useMemo(
    () => [
      {
        id: 1,
        label: "Send",
        icon: SEND_ICON,
        route: "/transfer",
        isImage: true,
      },
      {
        id: 2,
        label: "Receive",
        icon: RECEIVE_ICON,
        route: "/generate-link",
        isImage: true,
      },
      {
        id: 3,
        label: "Deposit",
        icon: DEPOSIT_ICON,
        route: "/deposit",
        isImage: true,
      },
      {
        id: 4,
        label: "Withdraw",
        icon: WITHDRAW_ICON,
        route: "/withdraw",
        isImage: true,
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AnimatedBackground />
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{username || ""}</Text>
          </View>
        </View>

        <View style={styles.unifiedCardContainer}>
          {/* DESIGN UPDATE: Replaced solid color with a gradient */}
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
                    <Skeleton
                      width={200}
                      height={36}
                      borderRadius={4}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                      }}
                    />
                  ) : (
                    <Text style={styles.balanceAmount}>
                      {accountBalance} KWD
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Achievements Section (if gamification data exists) */}
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
                          router.push("/level?filter=unlocked")
                        }
                      >
                        <Text style={styles.seeAllTextDark}>See All</Text>
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
                              router.push("/level?filter=unlocked")
                            }
                          >
                            {typeof achievement.icon === "string" ? (
                              <Text style={styles.recentAchievementIcon}>
                                {achievement.icon}
                              </Text>
                            ) : (
                              <StableImage
                                source={achievement.icon}
                                style={styles.recentAchievementIconImage}
                                resizeMode="contain"
                              />
                            )}
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
                {action.isImage ? (
                  <StableImage
                    source={action.icon}
                    style={styles.quickActionImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.quickActionIconText}>
                    {action.icon}
                  </Text>
                )}
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

          <ScrollView
            style={styles.transactionsScrollView}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {transactionsLoading ? (
              <View>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.transactionItem}>
                    <Skeleton
                      width={36}
                      height={36}
                      borderRadius={18}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Skeleton width="60%" height={14} borderRadius={4} />
                      <Skeleton
                        width="40%"
                        height={11}
                        borderRadius={4}
                        style={{ marginTop: 2 }}
                      />
                    </View>
                    <Skeleton width={70} height={14} borderRadius={4} />
                  </View>
                ))}
              </View>
            ) : transactionsError ? (
              <View style={styles.transactionErrorContainer}>
                <Text style={styles.errorText}>Failed to load transactions</Text>
              </View>
            ) : formattedTransactions.length === 0 ? (
              <View style={styles.transactionEmptyContainer}>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              formattedTransactions.map((transaction, index) => {
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
                      <StableImage
                        source={
                          transaction.type === "income"
                            ? INCOME_TRANSACTION_ICON
                            : EXPENSE_TRANSACTION_ICON
                        }
                        style={styles.transactionIconImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text
                        style={styles.transactionTitle}
                        numberOfLines={1}
                      >
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
                      numberOfLines={1}
                    >
                      {transaction.amount}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA", // Keep light background for the app
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  mainContent: {
    flex: 1,
    zIndex: 1, // Ensure content is above the animated background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 0, // Adjust for Android status bar
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500", // Slightly bolder for readability
  },
  userName: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "700",
    marginTop: 2,
  },
  unifiedCardContainer: {
    marginHorizontal: 20,
    marginTop: 4,
  },
  unifiedCard: {
    // DESIGN UPDATE: Use new brand colors for a gradient
    backgroundColor: BRAND_COLOR_SECONDARY, // Fallback
    // NOTE: Gradients require react-native-linear-gradient,
    // Since I can't add libraries, I'll use the darker secondary color.
    // If you have LinearGradient:
    // <LinearGradient
    //   colors={[BRAND_COLOR_MAIN, BRAND_COLOR_SECONDARY]}
    //   style={styles.unifiedCard}
    // >
    borderRadius: 24, // More rounded
    padding: 18,
    // DESIGN UPDATE: Platform-specific shadows with brand color
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
    overflow: "hidden", // Keep overflow hidden
  },
  balanceSection: {
    // Styles for this section are fine
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 12,
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImageContainer: {
    marginRight: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 36, // Container should be round
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profileImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Use light bg
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholderText: {
    fontSize: 28,
    color: "#FFFFFF", // White text
    fontWeight: "700",
  },
  balanceHeaderText: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#D1D5DB", // Lighter gray for dark bg
    fontWeight: "500",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32, // Slightly larger
    color: "#FFFFFF",
    fontWeight: "700",
  },
  quickActionsContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 4,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-around", // Use space-around for flexibility
    flexWrap: "wrap",
  },
  quickActionButton: {
    alignItems: "center",
    marginBottom: 16,
    width: 80, // Give a fixed width for consistency
  },
  quickActionIconText: {
    fontSize: 36,
    marginBottom: 1,
  },
  quickActionImage: {
    width: 52,
    height: 52,
    marginBottom: 1,
  },
  quickActionLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  transactionsContainer: {
    flex: 1,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  transactionsScrollView: {
    flex: 1,
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filterContainer: {
    marginBottom: 16,
    flexDirection: "row", // Keep it as a row for the scroll view
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10, // More padding
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8, // Use margin for spacing
  },
  filterButtonActive: {
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    borderColor: BRAND_COLOR_MAIN,
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
    color: BRAND_COLOR_MAIN, // Use new brand color
    fontWeight: "600",
  },
  seeAllTextDark: {
    fontSize: 14,
    color: "#FFFFFF", // Use white on dark card
    fontWeight: "600",
    opacity: 0.8,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    // DESIGN UPDATE: Platform-specific shadows
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.05)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
        borderColor: "#F3F4F6",
        borderWidth: 1,
      },
    }),
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionIconImage: {
    width: 21,
    height: 21,
  },
  transactionDetails: {
    flex: 1,
    marginRight: 8, // Add margin to prevent text collision
  },
  transactionTitle: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
  },
  transactionAmount: {
    fontSize: 14,
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
    padding: 40,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  recentAchievementsSection: {
    paddingTop: 16,
    // Removed borderTop and marginTop, divider is enough
  },
  recentAchievementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentAchievementsTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  recentAchievementsScroll: {
    marginHorizontal: -24, // Allow scroll to edges of card
    paddingHorizontal: 24, // Add padding back
  },
  recentAchievementsList: {
    paddingRight: 24, // Ensure last item has padding
  },
  recentAchievementItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 70, // Increased to accommodate larger icons
    height: 70, // Increased to accommodate larger icons
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12, // Slightly smaller border radius
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 12, // Use margin for spacing
  },
  recentAchievementIcon: {
    fontSize: 28, // Smaller icon
  },
  recentAchievementIconImage: {
    width: 44,
    height: 44,
  },
  advancedFiltersContainer: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16, // More rounded
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  advancedFiltersToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16, // More padding
    backgroundColor: "#F9FAFB",
  },
  advancedFiltersToggleText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  activeFilterBadge: {
    backgroundColor: BRAND_COLOR_MAIN, // Use new brand color
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeFilterBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "700", // Bolder text
  },
  advancedFiltersContent: {
    padding: 16,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 8,
  },
  dateInputRow: {
    flexDirection: "row",
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12, // More padding
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  amountInputRow: {
    flexDirection: "row",
  },
  amountInputContainer: {
    flex: 1,
  },
  amountInputLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12, // More padding
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  clearFiltersButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12, // More padding
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  clearFiltersButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
