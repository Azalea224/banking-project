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
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Formik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

const generateLinkValidationSchema = Yup.object().shape({
  amount: Yup.string()
    .test("is-valid-number", "Please enter a valid number", (value) => {
      if (!value || value.trim() === "") return true; // Allow empty
      return !isNaN(parseFloat(value));
    })
    .test("is-positive", "Amount must be greater than 0", (value) => {
      if (!value || value.trim() === "") return true; // Allow empty
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    }),
});

export default function GenerateLinkPage() {
  const { isAuthenticated, userId } = useAuth();

  // Only allow numbers and decimal point
  const handleAmountChange = (
    text: string,
    setFieldValue: (field: string, value: any) => void
  ) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    
    // Ensure only one decimal point
    const parts = cleaned.split(".");
    let finalValue = cleaned;
    if (parts.length > 2) {
      // If more than one decimal point, keep only the first one
      finalValue = parts[0] + "." + parts.slice(1).join("");
    }
    
    // Update the field value
    setFieldValue("amount", finalValue);
  };

  const generateAndCopyLink = (amount: string) => {
    if (!userId) {
      Alert.alert("Error", "Unable to generate link. Please try again.");
      return;
    }

    let link = "";
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        const origin = window.location.origin;
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split("/").filter(Boolean);
        pathParts.pop();
        const basePath = pathParts.length > 0 ? "/" + pathParts.join("/") : "";
        link = `${origin}${basePath}/deposit-link?userId=${encodeURIComponent(String(userId))}&amount=${encodeURIComponent(amount || "0")}`;
      } else {
        link = `/deposit-link?userId=${encodeURIComponent(String(userId))}&amount=${encodeURIComponent(amount || "0")}`;
      }
    } else {
      link = `/deposit-link?userId=${encodeURIComponent(String(userId))}&amount=${encodeURIComponent(amount || "0")}`;
    }

    if (Platform.OS === "web") {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
          if (typeof window !== "undefined" && window.alert) {
            window.alert("Payment link copied to clipboard!");
          } else {
            Alert.alert("Success", "Payment link copied to clipboard!");
          }
        }).catch((err) => {
          console.error("Failed to copy to clipboard:", err);
          if (typeof window !== "undefined" && window.prompt) {
            window.prompt("Copy this link:", link);
          } else {
            Alert.alert("Payment Link", link);
          }
        });
      } else {
        if (typeof window !== "undefined" && window.prompt) {
          window.prompt("Copy this link:", link);
        } else {
          Alert.alert("Payment Link", link);
        }
      }
    } else {
      Alert.alert("Payment Link", link, [
        { text: "Copy", onPress: () => {} },
        { text: "Open", onPress: () => router.push(`/deposit-link?userId=${encodeURIComponent(String(userId))}&amount=${encodeURIComponent(amount || "0")}`) },
      ]);
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Generate Payment Link</Text>
            <View style={styles.placeholder} />
          </View>

          <Formik
            initialValues={{ amount: "" }}
            validationSchema={generateLinkValidationSchema}
            onSubmit={(values) => {
              generateAndCopyLink(values.amount);
            }}
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
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Create a Payment Link</Text>
                    <Text style={styles.infoText}>
                      Enter an amount (optional) to generate a payment link. You can share this link with others to receive payments.
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Amount (KWD) - Optional</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.amount && touched.amount && styles.inputError,
                      ]}
                      placeholder="Enter amount (optional)"
                      placeholderTextColor="#9CA3AF"
                      value={values.amount}
                      onChangeText={(text) => handleAmountChange(text, setFieldValue)}
                      onBlur={handleBlur("amount")}
                      keyboardType={Platform.OS === "web" ? "default" : "decimal-pad"}
                      inputMode={Platform.OS === "web" ? "decimal" : undefined}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {errors.amount && touched.amount && (
                      <Text style={styles.errorText}>{errors.amount}</Text>
                    )}
                    <Text style={styles.hintText}>
                      Leave empty to set the amount later when opening the link
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomSection}>
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={() => handleSubmit()}
                  >
                    <Text style={styles.generateButtonText}>Generate & Copy Link</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Formik>
        </View>
      </TouchableWithoutFeedback>
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
  infoCard: {
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
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
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: "auto",
  },
  generateButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    boxShadow: "0px 4px 8px 0px rgba(16, 185, 129, 0.3)",
    elevation: 5,
  },
  generateButtonText: {
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

