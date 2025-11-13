import React, { useEffect, useMemo } from "react";
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
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { Formik } from "formik";
import * as Yup from "yup";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { getMyProfile, UserProfile } from "../api/auth";
import { router } from "expo-router";
import { AnimatedBackground, BRAND_COLOR_MAIN } from "../components/AnimatedBackground";

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
  const queryClient = useQueryClient();

  // Fetch profile (for future use, but userId comes from auth context)
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
    retry: 2,
  });

  // Get _id from auth context (stored during login) or from profile as fallback
  const _id = useMemo(() => {
    // First try userId from auth context (most reliable)
    if (userId) {
      console.log("GenerateLinkPage - Using userId from auth context:", userId);
      return userId;
    }
    // Fallback to profile if available
    if (profile) {
      const profileId = profile._id ?? profile.id;
      console.log("GenerateLinkPage - Profile data:", profile);
      console.log("GenerateLinkPage - Using _id from profile:", profileId);
      return profileId;
    }
    console.log("GenerateLinkPage - No _id available yet");
    return null;
  }, [userId, profile]);

  // Debug logging
  useEffect(() => {
    console.log("GenerateLinkPage - Debug state:", {
      isAuthenticated,
      profileLoading,
      profileError,
      profile,
      _id,
      buttonDisabled: !_id || profileLoading,
    });
  }, [isAuthenticated, profileLoading, profileError, profile, _id]);

  // Generate QR code data based on userId and amount
  const generateQRData = (amount: string) => {
    if (!_id) return null;
    const amountValue = amount && amount.trim() !== "" ? amount : "0";
    return `/deposit-link?userId=${encodeURIComponent(String(_id))}&amount=${encodeURIComponent(amountValue)}`;
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
    let finalValue = cleaned;
    if (parts.length > 2) {
      // If more than one decimal point, keep only the first one
      finalValue = parts[0] + "." + parts.slice(1).join("");
    }

    // Update the field value
    setFieldValue("amount", finalValue);
  };

  const generateAndCopyLink = async (amount: string) => {
    console.log("GenerateLinkPage - generateAndCopyLink called");
    console.log("GenerateLinkPage - _id:", _id);
    console.log("GenerateLinkPage - profile:", profile);
    console.log("GenerateLinkPage - profileLoading:", profileLoading);

    if (!_id) {
      if (profileLoading) {
        Alert.alert("Please wait", "Loading user information...");
        return;
      }
      if (profileError) {
        console.error("GenerateLinkPage - Profile error:", profileError);
        Alert.alert(
          "Error",
          "Failed to load user information. Please try again later."
        );
        return;
      }
      console.error("GenerateLinkPage - No _id available");
      Alert.alert(
        "Error",
        "Unable to generate link. User information not available. Please try again."
      );
      return;
    }

    // Generate the link path (works with expo-router)
    const linkPath = `/deposit-link?userId=${encodeURIComponent(
      String(_id)
    )}&amount=${encodeURIComponent(amount || "0")}`;

    let link = "";
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        const origin = window.location.origin;
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split("/").filter(Boolean);
        pathParts.pop();
        const basePath = pathParts.length > 0 ? "/" + pathParts.join("/") : "";
        link = `${origin}${basePath}${linkPath}`;
      } else {
        link = linkPath;
      }
    } else {
      // For mobile, use the relative path that expo-router can handle
      // When shared, users can open it within the app
      link = linkPath;
    }

    if (Platform.OS === "web") {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(link)
          .then(() => {
            if (typeof window !== "undefined" && window.alert) {
              window.alert("Payment link copied to clipboard!");
            } else {
              Alert.alert("Success", "Payment link copied to clipboard!");
            }
          })
          .catch((err) => {
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
      // Mobile: Show link and offer copy/share options
      try {
        // Try to copy to clipboard first
        await Clipboard.setStringAsync(link);
        console.log("Link copied to clipboard successfully");

        // Show alert with options
        Alert.alert(
          "Payment Link Generated",
          `Link: ${link}\n\nLink has been copied to clipboard.`,
          [
            {
              text: "Share",
              onPress: async () => {
                try {
                  const shareMessage = `Payment Link\n\n${link}\n\nUse this link in the app to send money.`;
                  const result = await Share.share({
                    message: shareMessage,
                  });
                  if (result.action === Share.sharedAction) {
                    console.log("Link shared successfully");
                  }
                } catch (error) {
                  console.error("Error sharing:", error);
                  Alert.alert(
                    "Share Failed",
                    "The link has been copied to clipboard. You can paste it manually."
                  );
                }
              },
            },
            {
              text: "Open Link",
              onPress: () => {
                if (_id) {
                  router.push(
                    `/deposit-link?userId=${encodeURIComponent(
                      String(_id)
                    )}&amount=${encodeURIComponent(amount || "0")}`
                  );
                }
              },
            },
            {
              text: "OK",
              style: "cancel",
            },
          ]
        );
      } catch (clipboardError) {
        console.error("Failed to copy to clipboard:", clipboardError);
        // If clipboard fails, show the link and offer to share
        Alert.alert(
          "Payment Link",
          `Link: ${link}\n\nTap Share to share this link.`,
          [
            {
              text: "Share",
              onPress: async () => {
                try {
                  const shareMessage = `Payment Link\n\n${link}\n\nUse this link in the app to send money.`;
                  await Share.share({
                    message: shareMessage,
                  });
                } catch (shareError) {
                  console.error("Failed to share:", shareError);
                  Alert.alert(
                    "Error",
                    "Unable to share. Please copy the link manually:\n\n" + link
                  );
                }
              },
            },
            {
              text: "Open Link",
              onPress: () => {
                if (_id) {
                  router.push(
                    `/deposit-link?userId=${encodeURIComponent(
                      String(_id)
                    )}&amount=${encodeURIComponent(amount || "0")}`
                  );
                }
              },
            },
            { text: "OK", style: "cancel" },
          ]
        );
      }
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
            }) => {
              const qrData = generateQRData(values.amount);
              return (
                <>
                  {/* QR Code Display */}
                  {_id && qrData && (
                    <View style={styles.qrCodeSection}>
                      <View style={styles.qrCodeCard}>
                        <Text style={styles.qrCodeTitle}>Scan to Send Money</Text>
                        {values.amount && values.amount.trim() !== "" ? (
                          <Text style={styles.qrCodeAmount}>
                            Amount: {parseFloat(values.amount || "0").toFixed(3)} KWD
                          </Text>
                        ) : (
                          <Text style={styles.qrCodeAmountHint}>Any amount</Text>
                        )}
                        <View style={styles.qrCodeWrapper}>
                          <QRCode
                            value={qrData}
                            size={220}
                            color="#000000"
                            backgroundColor="#FFFFFF"
                          />
                        </View>
                        <Text style={styles.qrCodeHint}>
                          Ask the sender to scan this QR code with their app
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.formSection}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Create a Payment Link</Text>
                    <Text style={styles.infoText}>
                      Enter an amount (optional) to generate a payment link. You
                      can share this link with others to receive payments.
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
                      onChangeText={(text) =>
                        handleAmountChange(text, setFieldValue)
                      }
                      onBlur={handleBlur("amount")}
                      keyboardType={
                        Platform.OS === "web" ? "default" : "decimal-pad"
                      }
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
                  {profileError && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.profileErrorText}>
                        Failed to load profile. Please try again.
                      </Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={async () => {
                          // Refetch profile
                          await queryClient.invalidateQueries({
                            queryKey: ["myProfile"],
                          });
                        }}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.generateButton,
                      !_id && styles.generateButtonDisabled,
                    ]}
                    onPress={() => {
                      console.log(
                        "Button pressed - _id:",
                        _id,
                        "userId from context:",
                        userId
                      );
                      handleSubmit();
                    }}
                    disabled={!_id}
                  >
                    {!_id ? (
                      <Text style={styles.generateButtonText}>
                        Loading user info...
                      </Text>
                    ) : (
                      <Text style={styles.generateButtonText}>
                        Generate & Copy Link
                      </Text>
                    )}
                  </TouchableOpacity>
                  {!_id && !profileError && (
                    <Text style={styles.hintText}>
                      Waiting for user information...
                    </Text>
                  )}
                </View>
                </>
              );
            }}
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
    color: BRAND_COLOR_MAIN,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: BRAND_COLOR_MAIN,
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
  generateButtonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  profileErrorText: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  qrCodeSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  qrCodeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    boxShadow: "0px 2px 8px 0px rgba(0, 0, 0, 0.08)",
    elevation: 3,
  },
  qrCodeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  qrCodeAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND_COLOR_MAIN,
    marginBottom: 16,
  },
  qrCodeAmountHint: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 16,
    fontStyle: "italic",
  },
  qrCodeWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrCodeHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});
