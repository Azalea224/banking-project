import React from "react";
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
import { Formik } from "formik";
import * as Yup from "yup";
import { useLogin } from "../hooks/useLogin";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

const loginValidationSchema = Yup.object().shape({
  username: Yup.string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),
  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const { login: setAuth } = useAuth();

  const handleLogin = (values: { username: string; password: string }) => {
    login(
      {
        username: values.username.trim().toLowerCase(), // Username should be case-insensitive
        password: values.password,
      },
      {
        onSuccess: (data) => {
          // Use username from response, fallback to form username if not provided
          const userUsername = data.username || values.username.trim();
          if (!data.token) {
            Alert.alert("Error", "Login failed: No token received");
            return;
          }
          if (!userUsername) {
            Alert.alert("Error", "Login failed: No username available");
            return;
          }
          // MongoDB uses _id, but some APIs might use id
          // If userId is not in response, decode JWT token to get _id
          let userId = data._id ?? data.id;

          // If userId is not in response, decode JWT token to get _id
          if (!userId && data.token) {
            try {
              const tokenParts = data.token.split(".");
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                userId = payload._id ?? payload.id;
                console.log("Extracted userId from JWT token:", userId);
              }
            } catch (error) {
              console.error("Error decoding JWT token:", error);
            }
          }

          console.log("Login response data:", data);
          console.log("Extracted userId:", userId);
          setAuth(data.token, userUsername, userId)
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

        <Formik
          initialValues={{ username: "", password: "" }}
          validationSchema={loginValidationSchema}
          onSubmit={handleLogin}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.username && touched.username && styles.inputError,
                  ]}
                  placeholder="Enter your username"
                  placeholderTextColor="#9CA3AF"
                  value={values.username}
                  onChangeText={handleChange("username")}
                  onBlur={handleBlur("username")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                />
                {errors.username && touched.username && (
                  <Text style={styles.errorText}>{errors.username}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.password && touched.password && styles.inputError,
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={values.password}
                  onChangeText={handleChange("password")}
                  onBlur={handleBlur("password")}
                  secureTextEntry
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={Keyboard.dismiss}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.password && touched.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, isPending && styles.buttonDisabled]}
                onPress={() => handleSubmit()}
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
          )}
        </Formik>
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#4939b0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    boxShadow: "0px 4px 8px 0px rgba(30, 64, 175, 0.3)",
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
    color: "#4939b0",
    fontWeight: "600",
  },
});
