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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import * as Yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deposit, DepositResponse } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

const depositValidationSchema = Yup.object().shape({
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

export default function DepositPage() {
  const { isAuthenticated, token, userId } = useAuth();
  const queryClient = useQueryClient();

  const depositMutation = useMutation<DepositResponse, Error, { amount: number }>({
    mutationFn: ({ amount: depositAmount }) =>
      deposit({ amount: depositAmount }),
    onSuccess: (data, variables) => {
      Alert.alert("Success", `Deposit of ${variables.amount.toFixed(3)} KWD was successful!`, [
        {
          text: "OK",
          onPress: () => {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["myTransactions"] });
            queryClient.invalidateQueries({ queryKey: ["myProfile"] });
            router.back();
          },
        },
      ]);
    },
    onError: (error: any) => {
      let errorMessage = "Deposit failed. Please try again.";
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 403) {
          errorMessage = "Access forbidden. Your session may have expired. Please try logging in again.";
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
      
      Alert.alert("Deposit Failed", errorMessage);
    },
  });

  const handleDeposit = (values: { amount: string }) => {
    if (!token) {
      Alert.alert("Error", "You are not authenticated. Please log in again.");
      router.replace("/login");
      return;
    }

    const depositAmount = parseFloat(values.amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    Alert.alert(
      "Confirm Deposit",
      `Are you sure you want to deposit ${depositAmount.toFixed(3)} KWD to your account?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            depositMutation.mutate({ amount: depositAmount });
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
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Deposit to Account</Text>
          <View style={styles.placeholder} />
        </View>

        <Formik
          initialValues={{ amount: "" }}
          validationSchema={depositValidationSchema}
          onSubmit={handleDeposit}
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
              </View>

              <View style={styles.bottomSection}>
                <TouchableOpacity
                  style={[
                    styles.depositButton,
                    (!values.amount || depositMutation.isPending) && styles.depositButtonDisabled,
                  ]}
                  onPress={() => handleSubmit()}
                  disabled={!values.amount || depositMutation.isPending}
                >
                  {depositMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.depositButtonText}>Deposit Money</Text>
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
  depositButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    boxShadow: "0px 4px 8px 0px rgba(30, 64, 175, 0.3)",
    elevation: 5,
  },
  depositButtonDisabled: {
    opacity: 0.6,
  },
  depositButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

