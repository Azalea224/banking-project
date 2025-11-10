import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ActivityIndicator, View } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0] || "";
    const inAuthGroup = currentRoute === "register" || currentRoute === "login";
    const isIndexRoute = !currentRoute || currentRoute === "";

    if (!isAuthenticated) {
      // If not authenticated and not on auth pages, redirect to register
      if (!inAuthGroup && !isIndexRoute) {
        router.replace("/register");
      } else if (isIndexRoute) {
        // If on index route and not authenticated, redirect to register
        router.replace("/register");
      }
    } else if (isAuthenticated && inAuthGroup) {
      // If authenticated but on auth pages, redirect to home
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F5F7FA",
        }}
      >
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
