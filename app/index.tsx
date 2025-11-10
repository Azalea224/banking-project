import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import { getMyTransactions, Transaction } from "../api/transactions";
import { getAllUsers, User } from "../api/auth";
import { getMyProfile, UserProfile } from "../api/auth";

// Format large numbers with notation (K, M, B, etc.)
const formatAmount = (amount: number, decimals: number = 3): string => {
  const absAmount = Math.abs(amount);

  if (absAmount >= 1000000000000) {
    // Trillions - show full number with commas
    return absAmount.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else if (absAmount >= 1000000000) {
    // Billions
    return (amount / 1000000000).toFixed(decimals) + "B";
  } else if (absAmount >= 1000000) {
    // Millions
    return (amount / 1000000).toFixed(decimals) + "M";
  } else if (absAmount >= 1000) {
    // Thousands
    return (amount / 1000).toFixed(decimals) + "K";
  } else {
    // Less than 1000, show full number with decimals
    return amount.toFixed(decimals);
  }
};

export default function HomePage() {
  const { username, logout, isAuthenticated, isLoading } = useAuth();

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
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

  // Format transactions for display
  const formattedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Create a map of user ID to username for quick lookup
    const userIdToUsernameMap = new Map<string | number, string>();
    if (allUsers) {
      allUsers.forEach((user) => {
        if (user.id !== undefined) {
          userIdToUsernameMap.set(user.id, user.username);
        }
      });
    }

    return transactions.slice(0, 10).map((transaction) => {
      // Helper function to get username from ID or return the value if it's already a username
      const getUsername = (
        value: string | number | undefined
      ): string | undefined => {
        if (!value) return undefined;
        // Check if it's a number (user ID) or numeric string
        const numericValue =
          typeof value === "string" ? parseInt(value, 10) : value;
        if (!isNaN(numericValue) && userIdToUsernameMap.has(numericValue)) {
          return userIdToUsernameMap.get(numericValue);
        }
        // If it's not a number or not in the map, assume it's already a username
        return typeof value === "string" ? value : undefined;
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
        // If I'm receiving money (from is someone else)
        if (fromUsername && fromUsername !== username) {
          isIncome = true;
        }
        // If I'm sending money (to is someone else)
        if (toUsername && toUsername !== username) {
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
        if (fromUsername && fromUsername !== username) {
          title = `Transfer from ${fromUsername}`;
        } else if (toUsername && toUsername !== username) {
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
      const transactionId = transaction.id ?? (transaction as any)._id;

      return {
        id: transactionId,
        title,
        amount: formattedAmount,
        date: dateString,
        type: isIncome ? "income" : "expense",
        originalTransaction: transaction, // Keep reference to original for ID lookup
      };
    });
  }, [transactions, username, allUsers]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      </SafeAreaView>
    );
  }

  // Don't render anything if not authenticated - redirect will happen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      </SafeAreaView>
    );
  }

  // Format balance from profile
  const accountBalance =
    profile?.balance !== undefined ? formatAmount(profile.balance) : "0.000";

  const quickActions = [
    { id: 1, label: "Send", icon: "→", route: "/transfer" },
    { id: 2, label: "Receive", icon: "←" },
    { id: 3, label: "Pay Bills", icon: "💳" },
    { id: 4, label: "Deposit to Account", icon: "➕", route: "/deposit" },
    { id: 5, label: "Withdraw from Account", icon: "➖", route: "/withdraw" },
  ];

  const handleLogout = () => {
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
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton}>
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logoutButton, { marginLeft: 12 }]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          {profileLoading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
              style={{ marginVertical: 8 }}
            />
          ) : (
            <Text style={styles.balanceAmount}>{accountBalance} KWD</Text>
          )}
          <View style={styles.accountInfo}>
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Account Number</Text>
              <Text style={styles.accountValue}>****1234</Text>
            </View>
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Bank</Text>
              <Text style={styles.accountValue}>Banking App</Text>
            </View>
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
                  <Text style={styles.quickActionIconText}>{action.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {transactionsLoading ? (
            <View style={styles.transactionLoadingContainer}>
              <ActivityIndicator size="small" color="#1E40AF" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
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
              // Use the original transaction's ID directly (check both 'id' and '_id' for MongoDB)
              const original = transaction.originalTransaction as any;
              const transactionId =
                original?.id ?? original?._id ?? transaction.id;

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
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationIcon: {
    fontSize: 20,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 12,
  },
  profileIcon: {
    fontSize: 20,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    fontSize: 20,
  },
  balanceCard: {
    backgroundColor: "#1E40AF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#93C5FD",
    fontWeight: "500",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 24,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
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
  seeAllText: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
});
