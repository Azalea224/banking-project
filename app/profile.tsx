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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile, UserProfile } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [imageError, setImageError] = useState(false);

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

  if (authLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
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
          {profile?.image && !imageError ? (
            <Image
              source={{
                uri: profile.image.startsWith("http")
                  ? profile.image
                  : `${BASE_URL}${profile.image.startsWith("/") ? "" : "/"}${
                      profile.image
                    }`,
              }}
              style={styles.profileImage}
              onError={() => {
                console.log("Image failed to load:", profile.image);
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
          <Text style={styles.username}>{profile?.username || "User"}</Text>
          {profile?.balance !== undefined && (
            <Text style={styles.balance}>
              Balance: {formatAmount(profile.balance)} KWD
            </Text>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{profile?.id || "N/A"}</Text>
          </View>
          {profile?.username && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{profile.username}</Text>
            </View>
          )}
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#1E40AF",
    marginBottom: 16,
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
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  infoItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
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
