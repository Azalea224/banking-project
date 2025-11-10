import { AxiosError } from "axios";
import api from ".";

export interface RegisterRequest {
  username: string;
  image: {
    uri: string;
    type: string;
    name: string;
  };
  password: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  token: string;
  message: string;
}
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  token: string;
  message: string;
}

export const registerUser = async (
  data: RegisterRequest
): Promise<RegisterResponse> => {
  const { username, password, image } = data;

  const formData = new FormData();

  formData.append("username", username);
  formData.append("password", password);

  formData.append("image", {
    uri: image.uri,
    type: image.type,
    name: image.name,
  } as any);

  try {
    const response = await api.post<RegisterResponse>(
      "/mini-project/api/auth/register",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>(
      "/mini-project/api/auth/login",
      data
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Get your profile
export interface UserProfile {
  id: number;
  username: string;
  image?: string;
  balance?: number;
  [key: string]: any;
}

export const getMyProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get<UserProfile>("/mini-project/api/auth/me");
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Get all users
export interface User {
  id: number;
  username: string;
  image?: string;
  [key: string]: any;
}

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get<User[]>("/mini-project/api/auth/users");
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Get user info by userId
export const getUserById = async (userId: number): Promise<User> => {
  try {
    const response = await api.get<User>(
      `/mini-project/api/auth/user/${userId}`
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Update your profile
export interface UpdateProfileRequest {
  image: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface UpdateProfileResponse {
  id: number;
  username: string;
  image?: string;
  message?: string;
  [key: string]: any;
}

export const updateProfile = async (
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const { image } = data;
  const formData = new FormData();

  formData.append("image", {
    uri: image.uri,
    type: image.type,
    name: image.name,
  } as any);

  try {
    const response = await api.put<UpdateProfileResponse>(
      "/mini-project/api/auth/profile",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};
