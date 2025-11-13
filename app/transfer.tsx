import React, { useState, useEffect } from "react";
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
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Formik } from "formik";
import * as Yup from "yup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, User } from "../api/auth";
import { transfer, TransferResponse } from "../api/transactions";
import { useAuth } from "../contexts/AuthContext";
import { router, useLocalSearchParams } from "expo-router";
import { useSound } from "../hooks/useSound";
import { AnimatedBackground, BRAND_COLOR_MAIN } from "../components/AnimatedBackground";
import {
  EMPTY_STATE_UNLOCKED_ICON,
  CHECKMARK_ICON,
  SEARCH_ICON,
  CAMERA_ICON,
} from "../constants/imageAssets";
import StableImage from "../components/StableImage";

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
  const params = useLocalSearchParams<{ username: string | string[] }>();
  const usernameParam = Array.isArray(params.username) 
    ? params.username[0] 
    : params.username;
  
  const { username, isAuthenticated, token } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
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

  // Auto-select user if username parameter is provided
  useEffect(() => {
    if (usernameParam && users && users.length > 0) {
      // Check if we need to select a user (either no user selected, or different user selected)
      const shouldSelectUser = !selectedUser || 
        selectedUser.username?.toLowerCase() !== usernameParam.toLowerCase();
      
      if (shouldSelectUser) {
        const userToSelect = users.find(
          (user) => user.username?.toLowerCase() === usernameParam.toLowerCase()
        );
        if (userToSelect) {
          setSelectedUser(userToSelect);
        }
      }
    }
  }, [usernameParam, users]);

  const transferMutation = useMutation<
    TransferResponse,
    Error,
    { username: string; amount: number }
  >({
    mutationFn: ({ username: targetUsername, amount: transferAmount }) =>
      transfer(targetUsername, { amount: transferAmount }),
    onSuccess: async (data, variables) => {
      // Play send sound
      playSound("Send.mp3");
      
      // Immediately invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myTransactions"] }),
        queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
        queryClient.refetchQueries({ queryKey: ["myTransactions"] }),
        queryClient.refetchQueries({ queryKey: ["myProfile"] }),
      ]);
      
      Alert.alert(
        "Success",
        `Transfer of ${variables.amount.toFixed(3)} KWD to ${
          selectedUser?.username || "user"
        } was successful!`,
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

  // Parse QR code data and find user
  const handleQRCodeScanned = (data: string) => {
    // Prevent multiple scans of the same code or processing multiple scans simultaneously
    if (isProcessingScan || lastScannedCode === data) {
      return;
    }

    setIsProcessingScan(true);
    setLastScannedCode(data);
    
    // Close scanner immediately to prevent multiple scans
    setShowScanner(false);

    try {
      // Parse the QR code data which should be in format: /deposit-link?userId={userId}&amount={amount}
      const urlMatch = data.match(/\/deposit-link\?userId=([^&]+)(?:&amount=([^&]+))?/);
      
      if (!urlMatch || !urlMatch[1]) {
        setIsProcessingScan(false);
        Alert.alert("Invalid QR Code", "The scanned QR code is not a valid payment code.");
        return;
      }

      const scannedUserId = decodeURIComponent(urlMatch[1]);
      
      // Find user in the users list
      if (!users || users.length === 0) {
        setIsProcessingScan(false);
        Alert.alert("Error", "Users list not loaded. Please try again.");
        return;
      }

      const foundUser = users.find((user) => {
        const userId = user._id ?? user.id;
        return userId !== undefined && String(userId) === String(scannedUserId);
      });

      if (!foundUser) {
        setIsProcessingScan(false);
        Alert.alert("User Not Found", "The user from the QR code is not available in your contacts.");
        return;
      }

      // Auto-select the user
      setSelectedUser(foundUser);
      setIsProcessingScan(false);
      Alert.alert("Success", `Selected ${foundUser.username} from QR code.`);
    } catch (error) {
      console.error("Error parsing QR code:", error);
      setIsProcessingScan(false);
      Alert.alert("Error", "Failed to parse QR code. Please try again.");
    }
  };

  // Handle camera button press
  const handleCameraPress = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "QR code scanning is not available on web. Please use the mobile app.");
      return;
    }

    if (!permission) {
      // Permission is still loading
      return;
    }

    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera permission to scan QR codes."
        );
        return;
      }
    }

    // Reset scan state when opening scanner
    setIsProcessingScan(false);
    setLastScannedCode(null);
    setShowScanner(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <AnimatedBackground />
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
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.recipientCard}>
                  <Text style={styles.cardTitle}>Select Recipient</Text>
                  {usersLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={BRAND_COLOR_MAIN} />
                      <Text style={styles.loadingText}>Loading users...</Text>
                    </View>
                  ) : usersError ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>Failed to load users</Text>
                    </View>
                  ) : filteredUsers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <StableImage
                        source={EMPTY_STATE_UNLOCKED_ICON}
                        style={styles.emptyIcon}
                        resizeMode="contain"
                      />
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
                                <StableImage
                                  source={CHECKMARK_ICON}
                                  style={styles.checkmark}
                                  resizeMode="contain"
                                />
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
                {/* Camera Scan Button - Prominent */}
                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    onPress={handleCameraPress}
                    style={styles.cameraScanButton}
                  >
                    <StableImage
                      source={CAMERA_ICON}
                      style={styles.cameraScanIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.cameraScanText}>Scan QR Code</Text>
                  </TouchableOpacity>
                )}

                {/* Search Bar */}
                <View style={styles.searchCard}>
                  <View style={styles.searchContainer}>
                    <StableImage
                      source={SEARCH_ICON}
                      style={styles.searchIcon}
                      resizeMode="contain"
                    />
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

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => {
          setShowScanner(false);
          setIsProcessingScan(false);
          setLastScannedCode(null);
        }}
      >
        <SafeAreaView style={styles.scannerContainer} edges={["top", "bottom"]}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity
              onPress={() => {
                setShowScanner(false);
                setIsProcessingScan(false);
                setLastScannedCode(null);
              }}
              style={styles.scannerCloseButton}
            >
              <Text style={styles.scannerCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={(result) => {
                if (result.data) {
                  handleQRCodeScanned(result.data);
                }
              }}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerHint}>
                  Position the QR code within the frame
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.scannerPermissionContainer}>
              <Text style={styles.scannerPermissionText}>
                Camera permission is required to scan QR codes.
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  const result = await requestPermission();
                  if (!result.granted) {
                    Alert.alert(
                      "Permission Required",
                      "Camera permission is needed to scan QR codes."
                    );
                  }
                }}
                style={styles.scannerPermissionButton}
              >
                <Text style={styles.scannerPermissionButtonText}>
                  Grant Permission
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  mainContainer: {
    zIndex: 1,
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
    fontSize: 24,
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
    backgroundColor: BRAND_COLOR_MAIN,
    borderColor: BRAND_COLOR_MAIN,
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
    width: 21,
    height: 21,
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
    borderColor: BRAND_COLOR_MAIN,
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
    borderColor: BRAND_COLOR_MAIN,
  },
  userImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_COLOR_MAIN,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userImagePlaceholderSelected: {
    borderColor: BRAND_COLOR_MAIN,
    backgroundColor: BRAND_COLOR_MAIN,
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
    color: BRAND_COLOR_MAIN,
    fontWeight: "700",
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_COLOR_MAIN,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    boxShadow: "0px 2px 4px 0px rgba(73, 57, 176, 0.4)",
    elevation: 3,
  },
  checkmark: {
    width: 18,
    height: 18,
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
    width: 55,
    height: 55,
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
    backgroundColor: BRAND_COLOR_MAIN,
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
    color: BRAND_COLOR_MAIN,
    fontWeight: "700",
  },
  transferButton: {
    backgroundColor: BRAND_COLOR_MAIN,
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
  cameraScanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_COLOR_MAIN,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    boxShadow: "0px 4px 12px 0px rgba(73, 57, 176, 0.4)",
    elevation: 5,
  },
  cameraScanIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  cameraScanText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#000000",
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scannerCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scannerCloseButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  scannerHint: {
    marginTop: 24,
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  scannerPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#000000",
  },
  scannerPermissionText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
  },
  scannerPermissionButton: {
    backgroundColor: BRAND_COLOR_MAIN,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  scannerPermissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
