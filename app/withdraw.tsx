import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import * as Yup from "yup";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { withdraw, WithdrawResponse } from "../api/transactions";
import { getMyProfile, UserProfile } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import { AnimatedBackground, BRAND_COLOR_MAIN } from "../components/AnimatedBackground";

const withdrawValidationSchema = Yup.object().shape({
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

export default function WithdrawPage() {
  const { isAuthenticated, token } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const withdrawMutation = useMutation<
    WithdrawResponse,
    Error,
    { amount: number }
  >({
    mutationFn: ({ amount: withdrawAmount }) =>
      withdraw({ amount: withdrawAmount }),
    onSuccess: async (data, variables) => {
      // Immediately invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myTransactions"] }),
        queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
        queryClient.refetchQueries({ queryKey: ["myTransactions"] }),
        queryClient.refetchQueries({ queryKey: ["myProfile"] }),
      ]);
      
      Alert.alert(
        "Success",
        `Withdrawal of ${variables.amount.toFixed(3)} KWD was successful!`,
        [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      let errorMessage = "Withdrawal failed. Please try again.";

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
            "Invalid request. Please check the amount or ensure you have sufficient balance.";
        } else if (status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            errorData?.message || error.response.statusText || errorMessage;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }

      Alert.alert("Withdrawal Failed", errorMessage);
    },
  });

  const handleWithdraw = (values: { amount: string }) => {
    if (!token) {
      Alert.alert("Error", "You are not authenticated. Please log in again.");
      router.replace("/login");
      return;
    }

    const withdrawAmount = parseFloat(values.amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (profile?.balance !== undefined && withdrawAmount > profile.balance) {
      Alert.alert(
        "Error",
        "Insufficient balance. You cannot withdraw more than your current balance."
      );
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Are you sure you want to withdraw ${withdrawAmount.toFixed(
        3
      )} KWD from your account?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            withdrawMutation.mutate({ amount: withdrawAmount });
          },
        },
      ]
    );
  };

  const handleWithdrawAll = () => {
    if (!profile?.balance || profile.balance <= 0) {
      Alert.alert("Error", "You have no balance to withdraw");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You are not authenticated. Please log in again.");
      router.replace("/login");
      return;
    }

    Alert.alert(
      "Confirm Withdraw All",
      `Are you sure you want to withdraw all ${profile.balance.toFixed(
        3
      )} KWD from your account?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            withdrawMutation.mutate({ amount: profile.balance! });
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
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <AnimatedBackground />
      <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Withdraw from Account</Text>
            <View style={styles.placeholder} />
          </View>

        <Formik
          initialValues={{ amount: "" }}
          validationSchema={withdrawValidationSchema}
          onSubmit={handleWithdraw}
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
              <View style={styles.formSection}>
                <View style={styles.balanceInfo}>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  {profileLoading ? (
                    <ActivityIndicator size="small" color={BRAND_COLOR_MAIN} />
                  ) : (
                    <Text style={styles.balanceAmount}>
                      {profile?.balance?.toFixed(3) || "0.000"} KWD
                    </Text>
                  )}
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
                    onChangeText={(text) =>
                      handleAmountChange(text, setFieldValue)
                    }
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
              </View>

              <View style={styles.bottomSection}>
                <TouchableOpacity
                  style={[
                    styles.withdrawButton,
                    (!values.amount || withdrawMutation.isPending) &&
                      styles.withdrawButtonDisabled,
                  ]}
                  onPress={() => handleSubmit()}
                  disabled={!values.amount || withdrawMutation.isPending}
                >
                  {withdrawMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.withdrawButtonText}>
                      Withdraw Money
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.withdrawAllButton,
                    (profileLoading ||
                      !profile?.balance ||
                      profile.balance <= 0 ||
                      withdrawMutation.isPending) &&
                      styles.withdrawAllButtonDisabled,
                  ]}
                  onPress={handleWithdrawAll}
                  disabled={
                    profileLoading ||
                    !profile?.balance ||
                    profile.balance <= 0 ||
                    withdrawMutation.isPending
                  }
                >
                  {withdrawMutation.isPending ? (
                    <ActivityIndicator color={BRAND_COLOR_MAIN} />
                  ) : (
                    <Text style={styles.withdrawAllButtonText}>
                      Withdraw All
                    </Text>
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
  content: {
    zIndex: 1,
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
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
  balanceInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "700",
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: "auto",
  },
  withdrawButton: {
    backgroundColor: BRAND_COLOR_MAIN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    boxShadow: "0px 4px 8px 0px rgba(30, 64, 175, 0.3)",
    elevation: 5,
  },
  withdrawButtonDisabled: {
    opacity: 0.6,
  },
  withdrawButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  withdrawAllButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 2,
    borderColor: BRAND_COLOR_MAIN,
  },
  withdrawAllButtonDisabled: {
    opacity: 0.6,
    borderColor: "#9CA3AF",
  },
  withdrawAllButtonText: {
    color: BRAND_COLOR_MAIN,
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
