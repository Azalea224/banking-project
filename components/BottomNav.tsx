import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from "react-native";
import { useSegments, useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: any;
  isImage?: boolean;
}

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    route: "/",
    icon: "🏠",
    isImage: false,
  },
  {
    id: "level",
    label: "Level",
    route: "/level",
    icon: "🏆",
    isImage: false,
  },
  {
    id: "transactions",
    label: "Transactions",
    route: "/transactions",
    icon: "📊",
    isImage: false,
  },
  {
    id: "friends",
    label: "Friends",
    route: "/friends",
    icon: "👥",
    isImage: false,
  },
  {
    id: "profile",
    label: "Profile",
    route: "/profile",
    icon: "👤",
    isImage: false,
  },
];

export default function BottomNav() {
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  // Don't show navigation on auth pages or nested routes
  if (!isAuthenticated) {
    return null;
  }
  
  // List of routes where BottomNav should be hidden
  const hiddenRoutes = [
    "/register",
    "/login",
    "/transfer",
    "/deposit",
    "/withdraw",
    "/generate-link",
    "/deposit-link",
    "/transaction-detail",
    "/users",
  ];
  
  // Check if current route should hide BottomNav
  const shouldHide = hiddenRoutes.some(route => pathname.startsWith(route));
  
  if (shouldHide) {
    return null;
  }

  const handleNavigation = (route: string) => {
    // Check if already on this page
    if (pathname === route || (route === "/" && pathname === "/")) {
      return; // Already on this page
    }
    
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {navItems.map((item) => {
        const isActive = pathname === item.route || 
          (item.route === "/" && (pathname === "/" || pathname === ""));
        
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => handleNavigation(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              {item.isImage ? (
                <Image
                  source={item.icon}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={[styles.iconText, isActive && styles.iconTextActive]}>
                  {item.icon}
                </Text>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingHorizontal: 4,
    justifyContent: "space-around",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0px -2px 8px 0px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  navItemActive: {
    // Active state styling
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  iconContainerActive: {
    backgroundColor: "#F3F4F6",
  },
  iconText: {
    fontSize: 20,
  },
  iconTextActive: {
    // Icon stays the same for active state
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  labelActive: {
    color: "#4939b0",
    fontWeight: "600",
  },
});

