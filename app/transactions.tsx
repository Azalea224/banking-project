import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import { getMyTransactions, Transaction } from "../api/transactions";
import { getAllUsers, User, getUserById } from "../api/auth";
import { Skeleton, SkeletonCircle } from "../components/Skeleton";
import BottomNav from "../components/BottomNav";
import { AnimatedBackground, BRAND_COLOR_MAIN } from "../components/AnimatedBackground";

// Format numbers with commas and decimals
const formatAmount = (amount: number, decimals: number = 3): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

type TransactionFilter = "deposit" | "withdraw" | "transfer" | null;

export default function TransactionsPage() {
  const { username, isAuthenticated } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<TransactionFilter>(null);
  
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
  } = useQuery<Transaction[]>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
    enabled: isAuthenticated,
  });

  // Extract unique user IDs from transactions that aren't in allUsers
  const missingUserIds = useMemo(() => {
    if (!transactions || !allUsers) return [];

    const allUserIds = new Set(
      allUsers.map((u) => (u._id ?? u.id)?.toString()).filter(Boolean)
    );
    const allUsernames = new Set(allUsers.map((u) => u.username));
    const missingIds: (string | number)[] = [];

    transactions.forEach((transaction) => {
      if (transaction.from) {
        const fromValue = transaction.from.toString();
        if (allUsernames.has(fromValue)) {
          // Already have this username, skip
        } else {
          const isInAllUserIds = allUserIds.has(fromValue);
          if (
            !isInAllUserIds &&
            !missingIds.includes(fromValue) &&
            !missingIds.includes(transaction.from)
          ) {
            missingIds.push(transaction.from);
          }
        }
      }

      if (transaction.to) {
        const toValue = transaction.to.toString();
        if (allUsernames.has(toValue)) {
          // Already have this username, skip
        } else {
          const isInAllUserIds = allUserIds.has(toValue);
          if (
            !isInAllUserIds &&
            !missingIds.includes(toValue) &&
            !missingIds.includes(transaction.to)
          ) {
            missingIds.push(transaction.to);
          }
        }
      }
    });

    return missingIds;
  }, [transactions, allUsers]);

  // Fetch missing users by ID
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
          }
        } catch (error: any) {
          errors.push({ userId, error });
        }
      }

      return users;
    },
    enabled: isAuthenticated && missingUserIds.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Combine allUsers with fetched missing users
  const allUsersWithMissing = useMemo(() => {
    const combined = [...(allUsers || [])];
    if (missingUsersQueries.data && missingUsersQueries.data.length > 0) {
      combined.push(...missingUsersQueries.data);
    }
    return combined;
  }, [allUsers, missingUsersQueries.data]);

  // Format transactions for display (ALL transactions, not just 10)
  const formattedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    // Create a map of user ID to username for quick lookup
    const userIdToUsernameMap = new Map<string | number, string>();
    if (allUsersWithMissing) {
      allUsersWithMissing.forEach((user) => {
        const userId = user._id ?? user.id;
        if (userId !== undefined) {
          userIdToUsernameMap.set(userId, user.username);
          userIdToUsernameMap.set(userId.toString(), user.username);
        }
      });
    }

    return sortedTransactions.map((transaction) => {
      // Helper function to get username from ID or return the value if it's already a username
      const getUsername = (
        value: string | number | undefined
      ): string | undefined => {
        if (!value) return undefined;

        const valueStr = value.toString();
        const directMatch =
          userIdToUsernameMap.get(value) || userIdToUsernameMap.get(valueStr);
        if (directMatch) {
          return directMatch;
        }

        for (const [id, username] of userIdToUsernameMap.entries()) {
          if (username.toLowerCase() === valueStr.toLowerCase()) {
            return username;
          }
        }

        return valueStr;
      };

      const fromUsername = getUsername(transaction.from);
      const toUsername = getUsername(transaction.to);

      // Determine if transaction is income or expense
      let isIncome = false;
      let isExpense = false;

      if (transaction.type === "deposit") {
        isIncome = true;
      } else if (transaction.type === "withdraw") {
        isExpense = true;
      } else if (transaction.type === "transfer") {
        if (
          fromUsername &&
          fromUsername.toLowerCase() !== username?.toLowerCase()
        ) {
          isIncome = true;
        }
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
        transactionType: transaction.type,
        originalTransaction: transaction,
      };
    });
  }, [transactions, username, allUsersWithMissing]);

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

  // Stable quickActions array using useMemo to prevent recreation
  const quickActions = useMemo(
    () => [
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
        label: "Deposit",
        icon: require("../assets/Deposit.png"),
        route: "/deposit",
        isImage: true,
      },
      {
        id: 4,
        label: "Withdraw",
        icon: require("../assets/Withdraw.png"),
        route: "/withdraw",
        isImage: true,
      },
    ],
    []
  );

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AnimatedBackground />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Quick Actions */}
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
                selectedFilter === "withdraw" && styles.filterButtonTextActive,
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
                selectedFilter === "transfer" && styles.filterButtonTextActive,
              ]}
            >
              Transfer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Advanced Filters Section */}
        <View style={styles.advancedFiltersContainer}>
          <TouchableOpacity
            style={styles.advancedFiltersToggle}
            onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Text style={styles.advancedFiltersToggleText}>
              {showAdvancedFilters ? "▼" : "▶"} Advanced Filters
            </Text>
            {hasActiveFilters && (
              <View style={styles.activeFilterBadge}>
                <Text style={styles.activeFilterBadgeText}>Active</Text>
              </View>
            )}
          </TouchableOpacity>

          {showAdvancedFilters && (
            <View style={styles.advancedFiltersContent}>
              {/* Date Range Filters */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Date Range</Text>
                <View style={styles.dateInputRow}>
                  <View
                    style={[styles.dateInputContainer, { marginRight: 6 }]}
                  >
                    <Text style={styles.dateInputLabel}>From</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View
                    style={[styles.dateInputContainer, { marginLeft: 6 }]}
                  >
                    <Text style={styles.dateInputLabel}>To</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Amount Range Filters */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Amount Range (KWD)</Text>
                <View style={styles.amountInputRow}>
                  <View
                    style={[styles.amountInputContainer, { marginRight: 6 }]}
                  >
                    <Text style={styles.amountInputLabel}>Min</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.000"
                      value={minAmount}
                      onChangeText={setMinAmount}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View
                    style={[styles.amountInputContainer, { marginLeft: 6 }]}
                  >
                    <Text style={styles.amountInputLabel}>Max</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.000"
                      value={maxAmount}
                      onChangeText={setMaxAmount}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={clearAllFilters}
                >
                  <Text style={styles.clearFiltersButtonText}>
                    Clear All Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {transactionsLoading ? (
          <View style={styles.transactionsContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
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
              {hasActiveFilters
                ? "No transactions match your filters"
                : "No transactions yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {filteredTransactions.map((transaction, index) => {
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
                      <Image
                        source={
                          transaction.type === "income"
                            ? require("../assets/Income Transaction.png")
                            : require("../assets/Expense Transaction.png")
                        }
                        style={styles.transactionIconImage}
                        resizeMode="contain"
                      />
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
            })}
          </View>
        )}
      </ScrollView>
      <BottomNav />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  quickActionsContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
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
  filterContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
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
    backgroundColor: BRAND_COLOR_MAIN,
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
  transactionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
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
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionIconImage: {
    width: 23,
    height: 23,
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
  advancedFiltersContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  advancedFiltersToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  advancedFiltersToggleText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  activeFilterBadge: {
    backgroundColor: BRAND_COLOR_MAIN,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeFilterBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  advancedFiltersContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
    padding: 10,
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
    padding: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  clearFiltersButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
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
