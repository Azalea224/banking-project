import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { LoginRequest, LoginResponse, loginUser } from "../api/auth";
import { AxiosError } from "axios";

export const useLogin = (): UseMutationResult<
  LoginResponse,
  AxiosError,
  LoginRequest
> => {
  return useMutation({
    mutationKey: ["loginUser"],
    mutationFn: loginUser,

    onSuccess: (data, variables) => {
      console.log(`User ${data.username} logged in successfully!`);
    },

    onError: (error) => {
      let serverMessage = "Unknown login error.";

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const errorData = error.response.data;

        // Map common HTTP status codes to user-friendly messages
        if (status === 401) {
          serverMessage = "Invalid username or password. Please try again.";
        } else if (status === 400) {
          serverMessage = "Invalid request. Please check your input.";
        } else if (status === 404) {
          serverMessage = "Login endpoint not found. Please contact support.";
        } else if (status >= 500) {
          serverMessage = "Server error. Please try again later.";
        } else if (typeof errorData === "object" && errorData !== null) {
          serverMessage =
            (errorData as { message?: string; error?: string })?.message ||
            (errorData as { message?: string; error?: string })?.error ||
            "Login failed. Please check your credentials.";
        } else if (typeof errorData === "string") {
          serverMessage = errorData;
        } else {
          serverMessage = "Login failed. Please check your credentials.";
        }
      } else if (error.request) {
        // Request was made but no response received
        serverMessage = "Network error. Please check your connection.";
      } else {
        // Something else happened
        serverMessage = error.message || "An unexpected error occurred.";
      }

      // Only log non-user-facing errors to console
      if (error.response?.status !== 401) {
        console.error("Login failed:", serverMessage);
      }
    },
  });
};
