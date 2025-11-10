import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { useRegister } from "../hooks/useRegister";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const { mutate: register, isPending } = useRegister();
  const { login } = useAuth();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll permissions to select an image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        type: "image/jpeg",
        name: "profile.jpg",
      });
    }
  };

  const handleRegister = () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (!image) {
      Alert.alert("Error", "Please select a profile image");
      return;
    }

    register(
      {
        username: username.trim(),
        password,
        image,
      },
      {
        onSuccess: (data) => {
          // Use username from response, fallback to form username if not provided
          const userUsername = data.username || username.trim();
          if (!data.token) {
            Alert.alert("Error", "Registration failed: No token received");
            return;
          }
          if (!userUsername) {
            Alert.alert("Error", "Registration failed: No username available");
            return;
          }
          login(data.token, userUsername)
            .then(() => {
              Alert.alert("Success", "Registration successful!", [
                {
                  text: "OK",
                  onPress: () => {
                    router.replace("/");
                  },
                },
              ]);
            })
            .catch((error) => {
              Alert.alert(
                "Error",
                "Failed to save login information. Please try logging in."
              );
            });
        },
        onError: (error) => {
          const serverMessage =
            (error.response?.data as { message?: string })?.message ||
            "Registration failed. Please try again.";
          Alert.alert("Registration Failed", serverMessage);
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>📷</Text>
                <Text style={styles.imagePlaceholderLabel}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={Keyboard.dismiss}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400",
  },
  form: {
    paddingHorizontal: 20,
  },
  imagePicker: {
    alignSelf: "center",
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#1E40AF",
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePlaceholderLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
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
  button: {
    backgroundColor: "#1E40AF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  linkText: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
  },
});
