import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLogin } from "../hooks/useLogin";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending } = useLogin();
  const { login: setAuth } = useAuth();

  const handleLogin = () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter your username");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    login(
      {
        username: username.trim(),
        password,
      },
      {
        onSuccess: (data) => {
          // Use username from response, fallback to form username if not provided
          const userUsername = data.username || username.trim();
          if (!data.token) {
            Alert.alert("Error", "Login failed: No token received");
            return;
          }
          if (!userUsername) {
            Alert.alert("Error", "Login failed: No username available");
            return;
          }
          setAuth(data.token, userUsername)
            .then(() => {
              Alert.alert("Success", "Login successful!", [
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
                "Failed to save login information. Please try again."
              );
            });
        },
        onError: (error) => {
          let serverMessage =
            "Login failed. Please check your credentials and try again.";

          if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            // Map common HTTP status codes to user-friendly messages
            if (status === 401) {
              serverMessage = "Invalid username or password. Please try again.";
            } else if (status === 400) {
              serverMessage = "Invalid request. Please check your input.";
            } else if (status === 404) {
              serverMessage =
                "Login endpoint not found. Please contact support.";
            } else if (status >= 500) {
              serverMessage = "Server error. Please try again later.";
            } else if (typeof errorData === "object" && errorData !== null) {
              serverMessage =
                (errorData as { message?: string; error?: string })?.message ||
                (errorData as { message?: string; error?: string })?.error ||
                serverMessage;
            } else if (typeof errorData === "string") {
              serverMessage = errorData;
            }
          } else if (error.request) {
            serverMessage =
              "Network error. Please check your connection and try again.";
          }

          Alert.alert("Login Failed", serverMessage);
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
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
                // Focus password input if available
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
            onPress={handleLogin}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.linkText}>Sign Up</Text>
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
