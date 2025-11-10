import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, User } from "../api/auth";
import { transfer, TransferResponse } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";

export default function TransferPage() {
  const { username, isAuthenticated, token } = useAuth();
  const [amount, setAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
    enabled: isAuthenticated,
  });

  const transferMutation = useMutation<
    TransferResponse,
    Error,
    { username: string; amount: number }
  >({
    mutationFn: ({ username: targetUsername, amount: transferAmount }) =>
      transfer(targetUsername, { amount: transferAmount }),
    onSuccess: (data, variables) => {
      Alert.alert(
        "Success",
        `Transfer of ${variables.amount.toFixed(3)} KWD to ${
          selectedUser?.username || "user"
        } was successful!`,
        [
          {
            text: "OK",
            onPress: () => {
              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ["myTransactions"] });
              queryClient.invalidateQueries({ queryKey: ["myProfile"] });
              router.back();
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      let errorMessage = "Transfer failed. Please try again.";

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 403) {
          errorMessage =
            "Access forbidden. Your session may have expired. Please try logging in again.";
        } else if (status === 401) {
          errorMessage = "Unauthorized. Please log in again.";
        } else if (status === 400) {
          errorMessage =
            errorData?.message ||
            "Invalid request. Please check the amount and recipient.";
        } else if (status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            errorData?.message || error.response.statusText || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      Alert.alert("Transfer Failed", errorMessage);
    },
  });

  const filteredUsers =
    users?.filter(
      (user) =>
        user.username &&
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        user.username !== username
    ) || [];

  const handleTransfer = () => {
    if (!selectedUser || !selectedUser.username) {
      Alert.alert("Error", "Please select a user to transfer to");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You are not authenticated. Please log in again.");
      router.replace("/login");
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    Alert.alert(
      "Confirm Transfer",
      `Are you sure you want to transfer ${transferAmount.toFixed(3)} KWD to ${
        selectedUser.username || "user"
      }?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            transferMutation.mutate({
              username: selectedUser.username!,
              amount: transferAmount,
            });
          },
        },
      ]
    );
  };

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
        <Text style={styles.title}>Send Money</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#9CA3AF"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Search Users</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by username"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      </View>

      <View style={styles.usersSection}>
        <Text style={styles.sectionTitle}>Select Recipient</Text>
        {usersLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1E40AF" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : usersError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load users</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No users found" : "No users available"}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredUsers}
            keyExtractor={(item, index) =>
              item.id?.toString() || item.username || `user-${index}`
            }
            scrollEnabled={true}
            style={styles.userList}
            contentContainerStyle={styles.userListContent}
            showsVerticalScrollIndicator={true}
            renderItem={({ item }) => {
              const isSelected =
                selectedUser !== null &&
                item.id !== undefined &&
                item.username !== undefined &&
                selectedUser.id === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    isSelected && styles.userItemSelected,
                  ]}
                  onPress={() => setSelectedUser(item)}
                >
                  {item.image ? (
                    <Image
                      source={{
                        uri: item.image.startsWith("http")
                          ? item.image
                          : `${BASE_URL}${
                              item.image.startsWith("/") ? "" : "/"
                            }${item.image}`,
                      }}
                      style={styles.userImage}
                    />
                  ) : (
                    <View style={styles.userImagePlaceholder}>
                      <Text style={styles.userImagePlaceholderText}>
                        {item.username?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.userName}>
                    {item.username || "Unknown User"}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <View style={styles.bottomSection}>
        {selectedUser && (
          <View style={styles.selectedUserInfo}>
            <Text style={styles.selectedUserLabel}>Sending to:</Text>
            <Text style={styles.selectedUserName}>{selectedUser.username}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.transferButton,
            (!selectedUser || !amount || transferMutation.isPending) &&
              styles.transferButtonDisabled,
          ]}
          onPress={handleTransfer}
          disabled={!selectedUser || !amount || transferMutation.isPending}
        >
          {transferMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.transferButtonText}>Send Money</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={scrollToBottom}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonText}>↓</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    flexDirection: "column",
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
  formSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  usersSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    flex: 1,
  },
  userList: {
    maxHeight: 300,
  },
  userListContent: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  userItemSelected: {
    borderWidth: 2,
    borderColor: "#1E40AF",
    backgroundColor: "#EFF6FF",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userImagePlaceholderText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 20,
    color: "#1E40AF",
    fontWeight: "700",
    marginLeft: 8,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  selectedUserInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedUserLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  selectedUserName: {
    fontSize: 18,
    color: "#1E40AF",
    fontWeight: "700",
  },
  transferButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
});
