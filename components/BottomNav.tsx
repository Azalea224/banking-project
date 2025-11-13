import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSegments, useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { BRAND_COLOR_MAIN } from "./AnimatedBackground";

import {
  HOME_ICON,
  PROGRESS_ICON,
  TRANSACTIONS_ICON,
  FRIENDS_ICON,
  PROFILE_ICON,
} from "../constants/imageAssets";
import StableImage from "./StableImage";
import { Image } from "expo-image";

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: any;
  isImage?: boolean;
}

// Stable nav items array - defined outside component to prevent recreation
const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    route: "/",
    icon: HOME_ICON,
    isImage: true,
  },
  {
    id: "level",
    label: "Play",
    route: "/level",
    icon: PROGRESS_ICON,
    isImage: true,
  },
  {
    id: "transactions",
    label: "Transactions",
    route: "/transactions",
    icon: TRANSACTIONS_ICON,
    isImage: true,
  },
  {
    id: "friends",
    label: "Friends",
    route: "/friends",
    icon: FRIENDS_ICON,
    isImage: true,
  },
  {
    id: "profile",
    label: "Profile",
    route: "/profile",
    icon: PROFILE_ICON,
    isImage: true,
  },
];

function BottomNav() {
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
        const isActive = 
          pathname === item.route || 
          pathname.startsWith(item.route + "/") ||
          (item.route === "/" && (pathname === "/" || pathname === "")) ||
          (item.route === "/profile" && pathname === "/profile");
        
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => handleNavigation(item.route)}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.navItemHighlight} />}
            <View style={styles.navItemContent}>
              <View style={styles.iconContainer}>
                {item.isImage ? (
                  <Image
                    source={item.icon}
                    style={[
                      styles.iconImage,
                      item.id === "friends" && styles.friendsIconImage,
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={[styles.iconText, isActive && styles.iconTextActive]}>
                    {item.icon}
                  </Text>
                )}
              </View>
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

export default React.memo(BottomNav);

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
    position: "relative",
  },
  navItemActive: {
    // Active state styling
  },
  navItemContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    zIndex: 1,
  },
  navItemHighlight: {
    position: "absolute",
    width: "95%",
    height: "150%",
    borderRadius: 20,
    backgroundColor: BRAND_COLOR_MAIN,
    opacity: 0.15,
    zIndex: 0,
    top: -6,
    left: "2.5%",
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  iconText: {
    fontSize: 20,
  },
  iconTextActive: {
    // Icon stays the same for active state
  },
  iconImage: {
    width: 33,
    height: 33,
  },
  friendsIconImage: {
    width: 38,
    height: 38,
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

