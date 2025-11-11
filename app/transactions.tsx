import React, { useEffect, useMemo, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import { getMyTransactions, Transaction } from "../api/transactions";
import { getAllUsers, User, getUserById } from "../api/auth";
import { Skeleton, SkeletonCircle } from "../components/Skeleton";

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

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
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

    return transactions.map((transaction) => {
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
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4939b0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Transactions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
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
              {selectedFilter
                ? `No ${selectedFilter} transactions found`
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
            })}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonIcon: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
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
});
