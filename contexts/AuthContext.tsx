import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  login: (token: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "@auth_token";
const USERNAME_KEY = "@auth_username";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const [storedToken, storedUsername] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USERNAME_KEY),
      ]);
      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUsername) {
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error("Error loading auth data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUsername: string) => {
    try {
      // Validate inputs before saving
      if (!newToken || typeof newToken !== "string") {
        throw new Error("Invalid token provided");
      }
      
      if (!newUsername || typeof newUsername !== "string") {
        throw new Error("Invalid username provided");
      }

      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(USERNAME_KEY, newUsername),
      ]);
      setToken(newToken);
      setUsername(newUsername);
    } catch (error) {
      console.error("Error saving auth data:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USERNAME_KEY),
      ]);
      setToken(null);
      setUsername(null);
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
        login,
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

