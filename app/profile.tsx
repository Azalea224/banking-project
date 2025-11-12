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
import {
  getMyProfile,
  UserProfile,
  updateProfile,
  UpdateProfileRequest,
} from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Skeleton, SkeletonCircle, SkeletonText } from "../components/Skeleton";
import BottomNav from "../components/BottomNav";
import { AnimatedBackground, BRAND_COLOR_MAIN, BRAND_COLOR_SECONDARY } from "../components/AnimatedBackground";
import { CAMERA_ICON } from "../constants/imageAssets";
import StableImage from "../components/StableImage";

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";

// Format numbers with commas and decimals
const formatAmount = (amount: number, decimals: number = 3): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export default function ProfilePage() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    setUserId,
    userId,
    logout,
  } = useAuth();
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

  const handleLogout = () => {
    // Use window.confirm for web, Alert.alert for native
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) {
        logout()
          .then(() => {
            router.replace("/register");
          })
          .catch((error) => {
            console.error("Logout error:", error);
            window.alert("Failed to logout. Please try again.");
          });
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/register");
            } catch (error) {
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]);
    }
  };

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
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || "images",
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
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            <Skeleton
              width={150}
              height={28}
              borderRadius={4}
              style={{ marginTop: 16 }}
            />
            <Skeleton
              width={200}
              height={20}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
            <Skeleton
              width={120}
              height={12}
              borderRadius={4}
              style={{ marginTop: 24, alignSelf: "center" }}
            />
            <Skeleton
              width={180}
              height={16}
              borderRadius={4}
              style={{ marginTop: 4, alignSelf: "center" }}
            />
            <Skeleton
              width={100}
              height={12}
              borderRadius={4}
              style={{ marginTop: 12, alignSelf: "center" }}
            />
            <Skeleton
              width={150}
              height={16}
              borderRadius={4}
              style={{ marginTop: 4, alignSelf: "center" }}
            />
            <Skeleton
              width={250}
              height={12}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AnimatedBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.profileCard}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={updateProfileMutation.isPending}
            style={styles.imageContainer}
          >
            {updateProfileMutation.isPending ? (
              <View style={styles.profileImage}>
                <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
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
                        : `${BASE_URL}${
                            imageValue.startsWith("/") ? "" : "/"
                          }${imageValue}`;
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
              <StableImage
                source={CAMERA_ICON}
                style={styles.editImageIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{profile?.username || "User"}</Text>
          {profile?.balance !== undefined && (
            <Text style={styles.balance}>
              {formatAmount(profile.balance)} KWD
            </Text>
          )}
        </View>

        <View style={styles.detailsCard}>
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
          <Text style={styles.editImageHint}>
            Tap the image above to update your profile picture
          </Text>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav />
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
    zIndex: 1,
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  profileCard: {
    backgroundColor: BRAND_COLOR_SECONDARY,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: BRAND_COLOR_SECONDARY,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 114,
    height: 114,
    borderRadius: 57,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  editImageBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: BRAND_COLOR_MAIN,
    boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.2)",
    elevation: 4,
  },
  editImageIcon: {
    width: 23,
    height: 23,
  },
  editImageHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  profileImagePlaceholder: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    color: BRAND_COLOR_MAIN,
    fontWeight: "700",
  },
  username: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  balance: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  profileDetailItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  profileDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 8,
  },
  profileDetailValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: BRAND_COLOR_MAIN,
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
  logoutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(239, 68, 68, 0.3)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
