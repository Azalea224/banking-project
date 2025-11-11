import React, { useMemo, useEffect } from "react";
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
import { getAllUsers, User, getUserById } from "../api/auth";
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

  console.log("Transaction Detail Page - URL Params:", params);
  console.log("Transaction Detail Page - ID:", id);

  const { data: transactions, isLoading: transactionsLoading } = useQuery<
    Transaction[]
  >({
    queryKey: ["myTransactions"],
    queryFn: getMyTransactions,
    enabled: isAuthenticated,
  });

  // Log transactions when they're loaded
  useEffect(() => {
    if (transactions) {
      console.log("All Transactions Loaded:", transactions.length);
      console.log("All Transactions:", JSON.stringify(transactions, null, 2));
    }
  }, [transactions]);

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
    enabled: isAuthenticated,
  });

  // Find the transaction by ID
  // MongoDB uses _id which can be alphanumeric strings, not just numbers
  const transaction = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      console.log("No transactions available");
      return null;
    }

    if (!id) {
      console.log("No ID provided in URL params");
      return null;
    }

    const idStr = id.toString();
    console.log("Looking for transaction with ID:", idStr, "Type:", typeof id);
    console.log(
      "Available transaction IDs:",
      transactions.map((t) => ({
        id: t._id ?? t.id,
        type: typeof (t._id ?? t.id),
      }))
    );

    // Find transaction by comparing both '_id' and 'id' fields (MongoDB uses _id)
    // Handle both numeric IDs and alphanumeric string IDs
    const found = transactions.find((t) => {
      const tId = t._id ?? t.id;
      if (tId === undefined || tId === null) return false;

      // Try direct string comparison first (handles alphanumeric MongoDB _id)
      if (tId.toString() === idStr) {
        return true;
      }

      // Try numeric comparison if both are numbers
      const tIdNum =
        typeof tId === "number"
          ? tId
          : typeof tId === "string" && !isNaN(Number(tId))
          ? Number(tId)
          : null;
      const idNum = !isNaN(Number(idStr)) ? Number(idStr) : null;

      if (tIdNum !== null && idNum !== null && tIdNum === idNum) {
        return true;
      }

      return false;
    });

    if (!found) {
      console.log(
        "Transaction not found. Looking for ID:",
        idStr,
        "Available IDs:",
        transactions.map((t) => t._id ?? t.id)
      );
    } else {
      const foundId = found._id ?? found.id;
      console.log("Transaction found:", foundId);
    }

    return found || null;
  }, [transactions, id]);

  // Extract unique user IDs from transaction that aren't in allUsers
  const missingUserIds = useMemo(() => {
    if (!transaction || !allUsers) return [];

    // MongoDB uses _id, but some APIs might use id
    const allUserIds = new Set(
      allUsers.map((u) => (u._id ?? u.id)?.toString()).filter(Boolean)
    );
    const allUsernames = new Set(
      allUsers.map((u) => u.username?.toLowerCase())
    );
    const missingIds: (string | number)[] = [];

    // Check 'from' field
    if (transaction.from) {
      const fromValue = transaction.from.toString();
      // Skip if it's already a username (exists in usernames)
      if (!allUsernames.has(fromValue.toLowerCase())) {
        // Check if it's already in allUserIds (by string comparison)
        const isInAllUserIds = allUserIds.has(fromValue);
        // If not in allUserIds and not already in missingIds, add it
        if (
          !isInAllUserIds &&
          !missingIds.includes(fromValue) &&
          !missingIds.includes(transaction.from)
        ) {
          missingIds.push(transaction.from);
        }
      }
    }

    // Check 'to' field
    if (transaction.to) {
      const toValue = transaction.to.toString();
      // Skip if it's already a username (exists in usernames)
      if (!allUsernames.has(toValue.toLowerCase())) {
        // Check if it's already in allUserIds (by string comparison)
        const isInAllUserIds = allUserIds.has(toValue);
        // If not in allUserIds and not already in missingIds, add it
        if (
          !isInAllUserIds &&
          !missingIds.includes(toValue) &&
          !missingIds.includes(transaction.to)
        ) {
          missingIds.push(transaction.to);
        }
      }
    }

    if (missingIds.length > 0) {
      console.log("Missing user IDs found in transaction:", missingIds);
    }

    return missingIds;
  }, [transaction, allUsers]);

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
            console.log(
              `Successfully fetched user ${userId}: ${user.username}`
            );
          }
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.message || error?.message || "Unknown error";
          const status = error?.response?.status;
          errors.push({ userId, error });

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
      console.log(
        "Fetched missing users for transaction detail:",
        missingUsersQueries.data
      );
      combined.push(...missingUsersQueries.data);
    }
    return combined;
  }, [allUsers, missingUsersQueries.data]);

  // Create user ID to username map
  // MongoDB uses _id, but some APIs might use id
  // Use allUsersWithMissing which includes both allUsers and fetched missing users
  const userIdToUsernameMap = useMemo(() => {
    const map = new Map<string | number, string>();
    if (allUsersWithMissing) {
      allUsersWithMissing.forEach((user) => {
        const userId = user._id ?? user.id;
        if (userId !== undefined) {
          // Store both the original ID and its string representation for lookup
          map.set(userId, user.username);
          map.set(userId.toString(), user.username);
        }
      });
    }
    return map;
  }, [allUsersWithMissing]);

  // Helper function to get username from ID or return the value if it's already a username
  // Handles both numeric IDs and alphanumeric string IDs (MongoDB _id)
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

  // Format transaction details
  const transactionDetails = useMemo(() => {
    if (!transaction) return null;

    console.log("=== Transaction Details ===");
    console.log(
      "Raw Transaction Object:",
      JSON.stringify(transaction, null, 2)
    );
    console.log("Transaction ID:", transaction._id ?? transaction.id);
    console.log("Transaction Type:", transaction.type);
    console.log("Transaction Amount:", transaction.amount);
    console.log("Transaction From:", transaction.from);
    console.log("Transaction To:", transaction.to);
    console.log("Transaction Created At:", transaction.createdAt);

    const fromUsername = getUsername(transaction.from);
    const toUsername = getUsername(transaction.to);

    console.log("From Username:", fromUsername);
    console.log("To Username:", toUsername);
    console.log("Current Username:", username);

    // Determine if transaction is income or expense
    let isIncome = false;
    let isExpense = false;

    if (transaction.type === "deposit") {
      isIncome = true;
    } else if (transaction.type === "withdraw") {
      isExpense = true;
    } else if (transaction.type === "transfer") {
      // Username comparison should be case-insensitive
      if (
        fromUsername &&
        fromUsername.toLowerCase() !== username?.toLowerCase()
      ) {
        isIncome = true;
      }
      if (toUsername && toUsername.toLowerCase() !== username?.toLowerCase()) {
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

    // MongoDB uses _id, but some APIs might use id
    const transactionId = transaction._id ?? transaction.id;

    const details = {
      id: transactionId,
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

    console.log(
      "Formatted Transaction Details:",
      JSON.stringify(details, null, 2)
    );
    console.log("Is Income:", isIncome);
    console.log("Is Expense:", isExpense);
    console.log("Formatted Date:", formattedDate);
    console.log("Formatted Time:", formattedTime);
    console.log("===========================");

    return details;
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
          <ActivityIndicator size="large" color="#4939b0" />
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
            <Text style={styles.detailValue}>
              #{transaction?._id ?? transaction?.id ?? transactionDetails.id}
            </Text>
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
                transactionDetails.fromUsername.toLowerCase() !==
                  username?.toLowerCase() && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>From</Text>
                    <Text style={styles.detailValue}>
                      {transactionDetails.fromUsername}
                    </Text>
                  </View>
                )}
              {transactionDetails.toUsername &&
                transactionDetails.toUsername.toLowerCase() !==
                  username?.toLowerCase() && (
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
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
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.1)",
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
