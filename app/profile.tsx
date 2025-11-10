import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, UserProfile, updateProfile, UpdateProfileRequest } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Skeleton, SkeletonCircle, SkeletonText } from "../components/Skeleton";

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";

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

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading, setUserId, userId } = useAuth();
  const [imageError, setImageError] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile>({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: () => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      if (Platform.OS === "web") {
        window.alert("Profile image updated successfully!");
      } else {
        Alert.alert("Success", "Profile image updated successfully!");
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update profile image. Please try again.";
      if (Platform.OS === "web") {
        window.alert(errorMessage);
      } else {
        Alert.alert("Error", errorMessage);
      }
    },
  });

  // Store user ID in context when profile is loaded
  // MongoDB uses _id, but some APIs might use id
  useEffect(() => {
    const userId = profile?._id ?? profile?.id;
    console.log("Profile loaded - profile data:", profile);
    console.log("Profile _id:", profile?._id);
    console.log("Profile id:", profile?.id);
    console.log("Extracted userId:", userId);
    if (userId !== undefined && userId !== null && setUserId) {
      console.log("Storing userId from profile:", userId);
      setUserId(userId).catch((error) => {
        console.error("Error storing user ID:", error);
      });
    } else {
      console.warn("userId from profile is undefined or null, cannot store");
    }
  }, [profile?._id, profile?.id, setUserId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/register");
    }
  }, [isAuthenticated, authLoading, router]);

  // Reset image error when profile data changes
  useEffect(() => {
    if (profile) {
      setImageError(false);
    }
  }, [profile]);

  const pickImage = async () => {
    if (Platform.OS === "web") {
      // Web-specific implementation using file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          // Convert file to base64 data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            
            const imageData = {
              uri: base64String, // Use base64 data URL for web
              type: file.type || "image/jpeg",
              name: file.name || "profile.jpg",
            };

            updateProfileMutation.mutate({ image: imageData });
          };
          reader.onerror = () => {
            if (Platform.OS === "web") {
              window.alert("Failed to read the image file. Please try again.");
            }
            document.body.removeChild(input);
          };
          reader.readAsDataURL(file);
        } else {
          document.body.removeChild(input);
        }
      };

      document.body.appendChild(input);
      input.click();
      return;
    }

    // Native platform implementation
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll permissions to select an image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const imageData = {
        uri: asset.uri,
        type: "image/jpeg",
        name: "profile.jpg",
      };

      updateProfileMutation.mutate({ image: imageData });
    }
  };

  if (authLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton width={120} height={24} borderRadius={4} />
            <Skeleton width={40} height={40} borderRadius={20} />
          </View>
          <View style={styles.profileSection}>
            <SkeletonCircle size={120} />
            <Skeleton width={150} height={28} borderRadius={4} style={{ marginTop: 16 }} />
            <Skeleton width={200} height={20} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width={120} height={12} borderRadius={4} style={{ marginTop: 24, alignSelf: "center" }} />
            <Skeleton width={180} height={16} borderRadius={4} style={{ marginTop: 4, alignSelf: "center" }} />
            <Skeleton width={100} height={12} borderRadius={4} style={{ marginTop: 12, alignSelf: "center" }} />
            <Skeleton width={150} height={16} borderRadius={4} style={{ marginTop: 4, alignSelf: "center" }} />
            <Skeleton width={250} height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
          <Text style={styles.title}>My Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={updateProfileMutation.isPending}
            style={styles.imageContainer}
          >
            {updateProfileMutation.isPending ? (
              <View style={styles.profileImage}>
                <ActivityIndicator size="large" color="#1E40AF" />
              </View>
            ) : profile?.image && !imageError ? (
              <Image
                source={{
                  uri: (() => {
                    // Handle both string and object image formats
                    const imageValue = profile.image;
                    if (typeof imageValue === "string") {
                      return imageValue.startsWith("http")
                        ? imageValue
                        : `${BASE_URL}${imageValue.startsWith("/") ? "" : "/"}${
                            imageValue
                          }`;
                    } else if (imageValue && typeof imageValue === "object") {
                      // If image is an object, try to get uri or stringify it
                      const imageObj = imageValue as any;
                      return imageObj.uri || String(imageObj) || "";
                    }
                    return "";
                  })(),
                }}
                style={styles.profileImage}
                onError={() => {
                  console.log("Image failed to load:", profile.image);
                  console.log("Image type:", typeof profile.image);
                  setImageError(true);
                }}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImagePlaceholderText}>
                  {profile?.username?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
            <View style={styles.editImageBadge}>
              <Text style={styles.editImageIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{profile?.username || "User"}</Text>
          {profile?.balance !== undefined && (
            <Text style={styles.balance}>
              Balance: {formatAmount(profile.balance)} KWD
            </Text>
          )}
          <View style={styles.profileDetails}>
            <View style={styles.profileDetailItem}>
              <Text style={styles.profileDetailLabel}>Account Number</Text>
              <Text style={styles.profileDetailValue}>
                {profile?._id !== undefined && profile._id !== null
                  ? String(profile._id)
                  : profile?.id !== undefined && profile.id !== null
                    ? String(profile.id)
                    : userId !== null && userId !== undefined
                      ? String(userId)
                      : "N/A"}
              </Text>
            </View>
            {profile?.username && (
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Username</Text>
                <Text style={styles.profileDetailValue}>{profile.username}</Text>
              </View>
            )}
          </View>
          <Text style={styles.editImageHint}>
            Tap the image to update your profile picture
          </Text>
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
  profileSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
  },
  editImageBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.2)",
    elevation: 4,
  },
  editImageIcon: {
    fontSize: 18,
  },
  editImageHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  username: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  balance: {
    fontSize: 20,
    fontWeight: "600",
    color: "#10B981",
    marginBottom: 24,
  },
  profileDetails: {
    width: "100%",
    marginTop: 8,
  },
  profileDetailItem: {
    marginBottom: 12,
  },
  profileDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "center",
  },
  profileDetailValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  backButtonText: {
    color: "#1E40AF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
