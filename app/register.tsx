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
import { Formik } from "formik";
import * as Yup from "yup";
import * as ImagePicker from "expo-image-picker";
import { useRegister } from "../hooks/useRegister";
import { useAuth } from "../contexts/AuthContext";
import { router } from "expo-router";

const registerValidationSchema = Yup.object().shape({
  username: Yup.string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),
  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  image: Yup.mixed()
    .required("Profile image is required")
    .test("is-image", "Please select a profile image", (value) => {
      return value !== null && value !== undefined;
    }),
});

export default function RegisterPage() {
  const { mutate: register, isPending } = useRegister();
  const { login } = useAuth();

  const pickImage = async (
    setFieldValue: (field: string, value: any) => void
  ) => {
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
      setFieldValue("image", imageData);
    }
  };

  const handleRegister = (values: {
    username: string;
    password: string;
    image: { uri: string; type: string; name: string } | null;
  }) => {
    if (!values.image) {
      Alert.alert("Error", "Please select a profile image");
      return;
    }

    register(
      {
        username: values.username.trim().toLowerCase(), // Username should be case-insensitive
        password: values.password,
        image: values.image,
      },
      {
        onSuccess: (data) => {
          // Use username from response, fallback to form username if not provided
          const userUsername = data.username || values.username.trim();
          if (!data.token) {
            Alert.alert("Error", "Registration failed: No token received");
            return;
          }
          if (!userUsername) {
            Alert.alert("Error", "Registration failed: No username available");
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

          console.log("Register response data:", data);
          console.log("Extracted userId:", userId);
          login(data.token, userUsername, userId)
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

        <Formik
          initialValues={{
            username: "",
            password: "",
            image: null as { uri: string; type: string; name: string } | null,
          }}
          validationSchema={registerValidationSchema}
          onSubmit={handleRegister}
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
            <View style={styles.form}>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={() => pickImage(setFieldValue)}
              >
                {values.image ? (
                  <Image
                    source={{ uri: values.image.uri }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Image
                      source={require("../assets/Camera.png")}
                      style={styles.imagePlaceholderIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.imagePlaceholderLabel}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors.image && touched.image && (
                <Text style={styles.errorText}>{errors.image}</Text>
              )}

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
  imagePicker: {
    alignSelf: "center",
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#4939b0",
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
  imagePlaceholderIcon: {
    width: 46,
    height: 46,
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    textAlign: "center",
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
