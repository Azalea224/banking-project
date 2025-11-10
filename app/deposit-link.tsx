import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import * as Yup from "yup";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserById, User } from "../api/auth";
import { transfer, TransferResponse } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";

const depositLinkValidationSchema = Yup.object().shape({
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

export default function DepositLinkPage() {
  const params = useLocalSearchParams<{
    userId: string | string[];
    amount: string | string[];
  }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const amountParam = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  
  const { userId: currentUserId, isAuthenticated, username: currentUsername } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is the owner
  const isOwner = useMemo(() => {
    if (!userId || !currentUserId) return false;
    return String(userId) === String(currentUserId);
  }, [userId, currentUserId]);

  // Fetch owner user info
  const {
    data: ownerUser,
    isLoading: ownerLoading,
    error: ownerError,
  } = useQuery<User>({
    queryKey: ["user", userId],
    queryFn: () => getUserById(userId!),
    enabled: !!userId && isAuthenticated,
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
        `Transfer of ${variables.amount.toFixed(3)} KWD to ${ownerUser?.username || "user"} was successful!`,
        [
          {
            text: "OK",
            onPress: () => {
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
          errorMessage = "Access forbidden. Your session may have expired.";
        } else if (status === 401) {
          errorMessage = "Unauthorized. Please log in again.";
        } else if (status === 400) {
          errorMessage = errorData?.message || "Invalid request. Please check the amount.";
        } else if (status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = errorData?.message || error.response.statusText || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }
      Alert.alert("Transfer Failed", errorMessage);
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated]);

  const handleTransfer = (values: { amount: string }) => {
    if (!ownerUser?.username) {
      Alert.alert("Error", "Unable to get recipient information");
      return;
    }

    const transferAmount = parseFloat(values.amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    Alert.alert(
      "Confirm Transfer",
      `Are you sure you want to transfer ${transferAmount.toFixed(3)} KWD to ${ownerUser.username}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            transferMutation.mutate({
              username: ownerUser.username,
              amount: transferAmount,
            });
          },
        },
      ]
    );
  };

  const copyLink = (amount: string) => {
    const link = `${Platform.OS === "web" ? window.location.origin : ""}/deposit-link?userId=${userId}&amount=${amount}`;
    if (Platform.OS === "web") {
      navigator.clipboard.writeText(link).then(() => {
        window.alert("Link copied to clipboard!");
      });
    } else {
      // For native, you might want to use a clipboard library
      Alert.alert("Link", link);
    }
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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      </SafeAreaView>
    );
  }

  if (ownerLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading deposit link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (ownerError || !ownerUser) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load deposit link</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isOwner ? "Edit Deposit Link" : "Deposit Link"}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <Formik
          initialValues={{ amount: amountParam || "" }}
          validationSchema={depositLinkValidationSchema}
          onSubmit={handleTransfer}
          enableReinitialize
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
            <View style={styles.content}>
              {isOwner ? (
                <>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Your Deposit Link</Text>
                    <Text style={styles.infoDescription}>
                      Edit the amount below and share this link with others to receive deposits.
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Amount (KWD)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.amount && touched.amount && styles.inputError,
                      ]}
                      placeholder="Enter amount"
                      placeholderTextColor="#9CA3AF"
                      value={values.amount}
                      onChangeText={(text) => handleAmountChange(text, setFieldValue)}
                      onBlur={handleBlur("amount")}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {errors.amount && touched.amount && (
                      <Text style={styles.errorText}>{errors.amount}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyLink(values.amount)}
                  >
                    <Text style={styles.copyButtonText}>Copy Link</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Deposit Request</Text>
                    <Text style={styles.infoDescription}>
                      {ownerUser.username} is requesting a deposit of {amountParam || "0"} KWD
                    </Text>
                  </View>

                  <View style={styles.ownerInfo}>
                    <Text style={styles.ownerLabel}>Recipient</Text>
                    <Text style={styles.ownerName}>{ownerUser.username}</Text>
                  </View>

                  <View style={styles.amountInfo}>
                    <Text style={styles.amountLabel}>Amount to Transfer</Text>
                    <Text style={styles.amountValue}>
                      {amountParam || "0"} KWD
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Amount (KWD)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.amount && touched.amount && styles.inputError,
                      ]}
                      placeholder="Enter amount"
                      placeholderTextColor="#9CA3AF"
                      value={values.amount}
                      onChangeText={(text) => handleAmountChange(text, setFieldValue)}
                      onBlur={handleBlur("amount")}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {errors.amount && touched.amount && (
                      <Text style={styles.errorText}>{errors.amount}</Text>
                    )}
                    <Text style={styles.hintText}>
                      You can change the amount if needed
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.transferButton,
                      (!values.amount || transferMutation.isPending) && styles.transferButtonDisabled,
                    ]}
                    onPress={() => handleSubmit()}
                    disabled={!values.amount || transferMutation.isPending}
                  >
                    {transferMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.transferButtonText}>Transfer Money</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </Formik>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
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
    marginBottom: 20,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
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
  content: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  ownerInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  ownerLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
  },
  amountInfo: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#1E40AF",
  },
  amountLabel: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "500",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    color: "#1E40AF",
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 24,
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  copyButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 8px 0px rgba(30, 64, 175, 0.3)",
    elevation: 5,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  transferButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    boxShadow: "0px 4px 8px 0px rgba(30, 64, 175, 0.3)",
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
  backButtonText: {
    color: "#1E40AF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

