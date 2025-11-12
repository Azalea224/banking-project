import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { getAllUsers, User } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";
import { Skeleton, SkeletonCircle, SkeletonText } from "../../components/Skeleton";
import BottomNav from "../../components/BottomNav";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { AnimatedBackground, BRAND_COLOR_MAIN } from "../../components/AnimatedBackground";

const BASE_URL = "https://react-bank-project.eapi.joincoded.com";
const FRIENDS_STORAGE_KEY = "@friends_list";

export default function FriendsPage() {
  const { isAuthenticated, userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  // Load friends from storage on mount
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const storedFriends = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
      if (storedFriends) {
        setFriends(JSON.parse(storedFriends));
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const saveFriends = async (newFriends: User[]) => {
    try {
      await AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(newFriends));
      setFriends(newFriends);
    } catch (error) {
      console.error("Error saving friends:", error);
      Alert.alert("Error", "Failed to save friend");
    }
  };

  const {
    data: allUsers,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
    enabled: isAuthenticated,
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim() || !allUsers) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    return allUsers.filter((user) => {
      // Exclude current user and already added friends
      const userUserId = user._id ?? user.id;
      const currentUserIdStr = userId ? String(userId) : null;
      const userUserIdStr = userUserId ? String(userUserId) : null;
      
      const isCurrentUser = currentUserIdStr && userUserIdStr && currentUserIdStr === userUserIdStr;
      const isFriend = friends.some(
        (f) => {
          const friendId = f._id ?? f.id;
          return friendId && userUserIdStr && String(friendId) === userUserIdStr;
        }
      );

      if (isCurrentUser || isFriend) {
        return false;
      }

      // Search by username
      const username = user.username?.toLowerCase() || "";
      return username.includes(query);
    });
  }, [searchQuery, allUsers, friends, userId]);

  const handleAddFriend = (user: User) => {
    const newFriends = [...friends, user];
    saveFriends(newFriends);
    Alert.alert("Success", `${user.username} added to friends!`);
  };

  const handleRemoveFriend = (user: User) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${user.username} from your friends?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const newFriends = friends.filter(
              (f) => (f._id ?? f.id)?.toString() !== (user._id ?? user.id)?.toString()
            );
            saveFriends(newFriends);
          },
        },
      ]
    );
  };

  const getImageUri = (image?: string) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR_MAIN} />
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by username..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Search Results */}
        {searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {usersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={BRAND_COLOR_MAIN} />
              </View>
            ) : usersError ? (
              <Text style={styles.errorText}>Failed to load users</Text>
            ) : filteredUsers.length === 0 ? (
              <Text style={styles.emptyText}>No users found</Text>
            ) : (
              filteredUsers.map((user, index) => {
                const userId = user._id ?? user.id;
                const imageUri = getImageUri(user.image);

                return (
                  <View key={userId || `user-${index}`} style={styles.userCard}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.userImage} />
                    ) : (
                      <View style={styles.userImagePlaceholder}>
                        <Text style={styles.userImagePlaceholderText}>
                          {user.username?.charAt(0).toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.username || "Unknown"}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleAddFriend(user)}
                    >
                      <Text style={styles.addButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Friends List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            My Friends {friends.length > 0 && `(${friends.length})`}
          </Text>
          {isLoadingFriends ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4939b0" />
            </View>
          ) : friends.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? "No friends yet. Search and add users above!"
                : "No friends yet. Search for users to add them!"}
            </Text>
          ) : (
            friends.map((friend, index) => {
              const friendId = friend._id ?? friend.id;
              const imageUri = getImageUri(friend.image);

              return (
                <View key={friendId || `friend-${index}`} style={styles.friendCard}>
                  <TouchableOpacity
                    style={styles.friendCardContent}
                    onPress={() => {
                      if (friend.username) {
                        router.push(`/transfer?username=${encodeURIComponent(friend.username)}`);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.userImage} />
                    ) : (
                      <View style={styles.userImagePlaceholder}>
                        <Text style={styles.userImagePlaceholderText}>
                          {friend.username?.charAt(0).toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{friend.username || "Unknown"}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFriend(friend)}
                  >
                    <Image
                      source={require("../../assets/Close.png")}
                      style={styles.removeButtonImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  friendCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  userImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_COLOR_MAIN,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userImagePlaceholderText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_COLOR_MAIN,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
    lineHeight: 28,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonImage: {
    width: 23,
    height: 23,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    padding: 20,
  },
});

