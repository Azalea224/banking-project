import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  userId: string | number | null;
  login: (token: string, username: string, userId?: string | number) => Promise<void>;
  setUserId: (userId: string | number) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "@auth_token";
const USERNAME_KEY = "@auth_username";
const USER_ID_KEY = "@auth_user_id";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const [storedToken, storedUsername, storedUserId] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USERNAME_KEY),
        AsyncStorage.getItem(USER_ID_KEY),
      ]);
      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUsername) {
        setUsername(storedUsername);
      }
      if (storedUserId) {
        // Try to parse as number, otherwise keep as string
        const parsed = isNaN(Number(storedUserId)) ? storedUserId : Number(storedUserId);
        setUserId(parsed);
      }
    } catch (error) {
      console.error("Error loading auth data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUsername: string, newUserId?: string | number) => {
    try {
      // Validate inputs before saving
      if (!newToken || typeof newToken !== "string") {
        throw new Error("Invalid token provided");
      }
      
      if (!newUsername || typeof newUsername !== "string") {
        throw new Error("Invalid username provided");
      }

      console.log("AuthContext.login called with userId:", newUserId);

      const storagePromises: Promise<void>[] = [
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(USERNAME_KEY, newUsername),
      ];

      if (newUserId !== undefined && newUserId !== null) {
        console.log("Storing userId in AsyncStorage:", newUserId);
        storagePromises.push(
          AsyncStorage.setItem(USER_ID_KEY, newUserId.toString())
        );
      } else {
        console.warn("userId is undefined or null, not storing in AsyncStorage");
      }

      await Promise.all(storagePromises);
      setToken(newToken);
      setUsername(newUsername);
      if (newUserId !== undefined && newUserId !== null) {
        setUserId(newUserId);
        console.log("userId set in state:", newUserId);
      } else {
        console.warn("userId not set in state because it's undefined or null");
      }
    } catch (error) {
      console.error("Error saving auth data:", error);
      throw error;
    }
  };

  const setUserIdInStorage = async (newUserId: string | number) => {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, newUserId.toString());
      setUserId(newUserId);
    } catch (error) {
      console.error("Error saving user ID:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USERNAME_KEY),
        AsyncStorage.removeItem(USER_ID_KEY),
      ]);
      setToken(null);
      setUsername(null);
      setUserId(null);
    } catch (error) {
      console.error("Error removing auth data:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        username,
        userId,
        login,
        setUserId: setUserIdInStorage,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

