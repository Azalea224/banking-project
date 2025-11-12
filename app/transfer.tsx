import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import * as Yup from "yup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, User } from "../api/auth";
import { transfer, TransferResponse } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import { useSound } from "../hooks/useSound";

const transferValidationSchema = Yup.object().shape({
  amount: Yup.string()
    .required("Amount is required")
    .test("is-positive", "Amount must be greater than 0", (value) => {
      if (!value) return false;
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    })
    .test("is-valid-number", "Please enter a valid number", (value) => {
      if (!value) return false;
      return !isNaN(parseFloat(value));
    }),
});

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function TransferPage() {
  const { username, isAuthenticated, token } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { playSound } = useSound();

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
      // Play send sound
      playSound("Send.mp3");
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
        user.username.toLowerCase() !== username?.toLowerCase()
    ) || [];

  const handleTransfer = (values: { amount: string }) => {
    if (!selectedUser || !selectedUser.username) {
      Alert.alert("Error", "Please select a user to transfer to");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You are not authenticated. Please log in again.");
      router.replace("/login");
      return;
    }

    const transferAmount = parseFloat(values.amount);
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

  // Only allow numbers and decimal point
  const handleAmountChange = (
    text: string,
    setFieldValue: (field: string, value: any) => void
  ) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      // If more than one decimal point, keep only the first one
      setFieldValue("amount", parts[0] + "." + parts.slice(1).join(""));
    } else {
      setFieldValue("amount", cleaned);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.mainContainer}>
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

        <Formik
          initialValues={{ amount: "" }}
          validationSchema={transferValidationSchema}
          onSubmit={handleTransfer}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => (
            <>
              {/* Recipient Card - Scrollable Users List */}
              <ScrollView
                style={styles.recipientScrollView}
                contentContainerStyle={styles.recipientScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.recipientCard}>
                  <Text style={styles.cardTitle}>Select Recipient</Text>
                  {usersLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#4939b0" />
                      <Text style={styles.loadingText}>Loading users...</Text>
                    </View>
                  ) : usersError ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>Failed to load users</Text>
                    </View>
                  ) : filteredUsers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyIcon}>👤</Text>
                      <Text style={styles.emptyText}>
                        {searchQuery
                          ? "No users found"
                          : "No users available"}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.usersListContainer}>
                      {filteredUsers.map((item, index) => {
                        // Compare both id and _id, handle string/number conversion
                        const itemId = item._id ?? item.id;
                        const selectedId = selectedUser?._id ?? selectedUser?.id;
                        const isSelected =
                          selectedUser !== null &&
                          itemId !== undefined &&
                          selectedId !== undefined &&
                          String(itemId) === String(selectedId);
                        return (
                          <TouchableOpacity
                            key={itemId?.toString() || item.username || `user-${index}`}
                            style={[
                              styles.userItem,
                              isSelected && styles.userItemSelected,
                            ]}
                            onPress={() => {
                              setSelectedUser(item);
                              Keyboard.dismiss();
                            }}
                            activeOpacity={0.7}
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
                                style={[
                                  styles.userImage,
                                  isSelected && styles.userImageSelected,
                                ]}
                              />
                            ) : (
                              <View style={[
                                styles.userImagePlaceholder,
                                isSelected && styles.userImagePlaceholderSelected,
                              ]}>
                                <Text style={[
                                  styles.userImagePlaceholderText,
                                  isSelected && styles.userImagePlaceholderTextSelected,
                                ]}>
                                  {item.username?.charAt(0).toUpperCase() || "U"}
                                </Text>
                              </View>
                            )}
                          <View style={styles.userInfo}>
                            <Text style={[
                              styles.userName,
                              isSelected && styles.userNameSelected,
                            ]}>
                              {item.username || "Unknown User"}
                            </Text>
                          </View>
                            {isSelected && (
                              <View style={styles.checkmarkContainer}>
                                <Text style={styles.checkmark}>✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Bottom Form Section - Sticky at Bottom */}
              <View style={[styles.bottomFormSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {/* Search Bar */}
                <View style={styles.searchCard}>
                  <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by username"
                      placeholderTextColor="#9CA3AF"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      returnKeyType="search"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                        style={styles.clearButton}
                      >
                        <Text style={styles.clearButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Amount Card */}
                <View style={styles.amountCard}>
                  <Text style={styles.cardTitle}>Amount</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>KWD</Text>
                    <TextInput
                      style={[
                        styles.amountInput,
                        errors.amount && touched.amount && styles.inputError,
                      ]}
                      placeholder="0.000"
                      placeholderTextColor="#9CA3AF"
                      value={values.amount}
                      onChangeText={(text) =>
                        handleAmountChange(text, setFieldValue)
                      }
                      onBlur={handleBlur("amount")}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                  {errors.amount && touched.amount && (
                    <Text style={styles.errorText}>{errors.amount}</Text>
                  )}
                  
                  {/* Quick Amount Buttons */}
                  <View style={styles.quickAmountsContainer}>
                    <Text style={styles.quickAmountsLabel}>Quick select</Text>
                    <View style={styles.quickAmountsRow}>
                      {QUICK_AMOUNTS.map((amount) => (
                        <TouchableOpacity
                          key={amount}
                          style={[
                            styles.quickAmountButton,
                            values.amount === amount.toString() &&
                              styles.quickAmountButtonActive,
                          ]}
                          onPress={() => setFieldValue("amount", amount.toString())}
                        >
                          <Text
                            style={[
                              styles.quickAmountText,
                              values.amount === amount.toString() &&
                                styles.quickAmountTextActive,
                            ]}
                          >
                            {amount}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Summary Card - Show recipient immediately when selected */}
                {selectedUser && (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Sending to</Text>
                      <View style={styles.summaryUserInfo}>
                        {selectedUser.image ? (
                          <Image
                            source={{
                              uri: selectedUser.image.startsWith("http")
                                ? selectedUser.image
                                : `${BASE_URL}${
                                    selectedUser.image.startsWith("/") ? "" : "/"
                                  }${selectedUser.image}`,
                            }}
                            style={styles.summaryUserImage}
                          />
                        ) : (
                          <View style={styles.summaryUserImagePlaceholder}>
                            <Text style={styles.summaryUserImagePlaceholderText}>
                              {selectedUser.username?.charAt(0).toUpperCase() ||
                                "U"}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.summaryUserName}>
                          {selectedUser.username}
                        </Text>
                      </View>
                    </View>
                    {values.amount && (
                      <>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Amount</Text>
                          <Text style={styles.summaryAmount}>
                            {parseFloat(values.amount || "0").toFixed(3)} KWD
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Send Button */}
                <TouchableOpacity
                  style={[
                    styles.transferButton,
                    (!selectedUser ||
                      !values.amount ||
                      transferMutation.isPending) &&
                      styles.transferButtonDisabled,
                  ]}
                  onPress={() => handleSubmit()}
                  disabled={
                    !selectedUser || !values.amount || transferMutation.isPending
                  }
                  activeOpacity={0.8}
                >
                  {transferMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.transferButtonText}>Send Money</Text>
                      {selectedUser && values.amount && (
                        <Text style={styles.transferButtonSubtext}>
                          {parseFloat(values.amount).toFixed(3)} KWD to{" "}
                          {selectedUser.username}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Formik>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  mainContainer: {
    flex: 1,
  },
  recipientScrollView: {
    flex: 1,
  },
  recipientScrollContent: {
    paddingBottom: 300,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  backButtonIcon: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  amountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.08)",
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 6,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 6,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 4,
  },
  quickAmountsContainer: {
    marginTop: 8,
  },
  quickAmountsLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 6,
  },
  quickAmountsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  quickAmountButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickAmountButtonActive: {
    backgroundColor: "#4939b0",
    borderColor: "#4939b0",
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  quickAmountTextActive: {
    color: "#FFFFFF",
  },
  recipientCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    padding: 24,
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.08)",
    elevation: 3,
  },
  usersListContainer: {
    paddingTop: 8,
  },
  bottomFormSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: "#F5F7FA",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    boxShadow: "0px -2px 8px 0px rgba(0, 0, 0, 0.1)",
    elevation: 8,
  },
  searchCard: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    boxShadow: "0px 1px 3px 0px rgba(0, 0, 0, 0.1)",
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 14,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  usersListContainer: {
    marginTop: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userItemSelected: {
    borderColor: "#4939b0",
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    boxShadow: "0px 2px 8px 0px rgba(73, 57, 176, 0.25)",
    elevation: 4,
  },
  userImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userImageSelected: {
    borderColor: "#4939b0",
  },
  userImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4939b0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userImagePlaceholderSelected: {
    borderColor: "#4939b0",
    backgroundColor: "#4939b0",
  },
  userImagePlaceholderText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  userImagePlaceholderTextSelected: {
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  userNameSelected: {
    color: "#4939b0",
    fontWeight: "700",
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4939b0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    boxShadow: "0px 2px 4px 0px rgba(73, 57, 176, 0.4)",
    elevation: 3,
  },
  checkmark: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.08)",
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  summaryUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryUserImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  summaryUserImagePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4939b0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  summaryUserImagePlaceholderText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  summaryUserName: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  summaryAmount: {
    fontSize: 18,
    color: "#4939b0",
    fontWeight: "700",
  },
  transferButton: {
    backgroundColor: "#4939b0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 12px 0px rgba(73, 57, 176, 0.4)",
    elevation: 5,
  },
  transferButtonDisabled: {
    opacity: 0.5,
  },
  transferButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  transferButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    marginTop: 3,
    fontWeight: "400",
  },
});
