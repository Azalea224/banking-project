import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { RegisterRequest, RegisterResponse, registerUser } from "../api/auth";
import { AxiosError } from "axios";

export const useRegister = (): UseMutationResult<
  RegisterResponse,
  AxiosError,
  RegisterRequest
> => {
  return useMutation({
    mutationKey: ["registerUser"],
    mutationFn: registerUser,

    onSuccess: (data, variables) => {
      console.log(`User ${data.username} registered successfully!`);
    },

    onError: (error) => {
      const serverMessage =
        (error.response?.data as { message?: string })?.message ||
        "Unknown registration error.";
      console.error("Registration failed:", serverMessage);
    },
  });
};
