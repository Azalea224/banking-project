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
import { getMyTransactions, Transaction } from "../api/transactions";
import { getAllUsers, User } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

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

export default function TransactionDetailPage() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { username, isAuthenticated } = useAuth();

  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useQuery<Transaction[]>({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
  });

  const {
    data: allUsers,
  } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
    enabled: isAuthenticated,
  });

  // Find the transaction by ID
  const transaction = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      console.log('No transactions available');
      return null;
    }
    
    if (!id) {
      console.log('No ID provided in URL params');
      return null;
    }
    
    // Handle ID as string or number
    const transactionId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(transactionId as number)) {
      console.log('Invalid transaction ID format:', id, typeof id);
      return null;
    }
    
    console.log('Looking for transaction with ID:', transactionId, 'Type:', typeof transactionId);
    console.log('Available transaction IDs:', transactions.map(t => ({ id: t.id, type: typeof t.id })));
    
    // Find transaction by comparing both as numbers and strings
    // Check both 'id' and '_id' fields (MongoDB uses _id)
    const found = transactions.find((t) => {
      const tId = t.id ?? (t as any)._id;
      if (tId === undefined || tId === null) return false;
      
      // Try numeric comparison first
      if (typeof tId === 'number' && typeof transactionId === 'number') {
        return tId === transactionId;
      }
      // Fall back to string comparison
      const matches = tId.toString() === id.toString() || tId.toString() === transactionId.toString();
      if (matches) {
        console.log('Found transaction match:', tId, '===', transactionId);
      }
      return matches;
    });
    
    if (!found) {
      console.log('Transaction not found. Looking for ID:', transactionId, 'Available IDs:', transactions.map(t => t.id ?? (t as any)._id));
    } else {
      const foundId = found.id ?? (found as any)._id;
      console.log('Transaction found:', foundId);
    }
    
    return found || null;
  }, [transactions, id]);

  // Create user ID to username map
  const userIdToUsernameMap = useMemo(() => {
    const map = new Map<string | number, string>();
    if (allUsers) {
      allUsers.forEach((user) => {
        if (user.id !== undefined) {
          map.set(user.id, user.username);
        }
      });
    }
    return map;
  }, [allUsers]);

  // Helper function to get username from ID or return the value if it's already a username
  const getUsername = (
    value: string | number | undefined
  ): string | undefined => {
    if (!value) return undefined;
    const numericValue =
      typeof value === "string" ? parseInt(value, 10) : value;
    if (!isNaN(numericValue) && userIdToUsernameMap.has(numericValue)) {
      return userIdToUsernameMap.get(numericValue);
    }
    return typeof value === "string" ? value : undefined;
  };

  // Format transaction details
  const transactionDetails = useMemo(() => {
    if (!transaction) return null;

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
      if (fromUsername && fromUsername !== username) {
        isIncome = true;
      }
      if (toUsername && toUsername !== username) {
        isExpense = true;
      }
    }

    const date = new Date(transaction.createdAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    let transactionType = "";
    if (transaction.type === "deposit") {
      transactionType = "Deposit";
    } else if (transaction.type === "withdraw") {
      transactionType = "Withdrawal";
    } else {
      transactionType = "Transfer";
    }

    return {
      id: transaction.id,
      type: transactionType,
      amount: transaction.amount,
      formattedAmount: isIncome
        ? `+${formatAmount(transaction.amount)} KWD`
        : `-${formatAmount(transaction.amount)} KWD`,
      isIncome,
      isExpense,
      fromUsername,
      toUsername,
      date: formattedDate,
      time: formattedTime,
      fullDate: transaction.createdAt,
    };
  }, [transaction, username, userIdToUsernameMap]);

  if (transactionsLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Transaction Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transactionDetails || !transaction) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Transaction Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Transaction not found</Text>
          {id && <Text style={styles.errorSubtext}>Looking for ID: {id}</Text>}
          {transactions && transactions.length > 0 && (
            <Text style={styles.errorSubtext}>
              Available transactions: {transactions.length}
            </Text>
          )}
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
        <Text style={styles.title}>Transaction Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text
              style={[
                styles.amountValue,
                transactionDetails.isIncome
                  ? styles.incomeAmount
                  : styles.expenseAmount,
              ]}
            >
              {transactionDetails.formattedAmount}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Transaction Type</Text>
            <Text style={styles.detailValue}>{transactionDetails.type}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>#{transaction?.id ?? (transaction as any)?._id ?? transactionDetails.id}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{transactionDetails.date}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{transactionDetails.time}</Text>
          </View>

          {transactionDetails.type === "Transfer" && (
            <>
              {transactionDetails.fromUsername &&
                transactionDetails.fromUsername !== username && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>From</Text>
                    <Text style={styles.detailValue}>
                      {transactionDetails.fromUsername}
                    </Text>
                  </View>
                )}
              {transactionDetails.toUsername &&
                transactionDetails.toUsername !== username && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>To</Text>
                    <Text style={styles.detailValue}>
                      {transactionDetails.toUsername}
                    </Text>
                  </View>
                )}
            </>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          </View>
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
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "700",
  },
  incomeAmount: {
    color: "#10B981",
  },
  expenseAmount: {
    color: "#EF4444",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 24,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  statusBadge: {
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "600",
  },
});

