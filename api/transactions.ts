import { AxiosError } from "axios";
import api from ".";

// Get your transactions
export interface Transaction {
  id: number;
  type: "deposit" | "withdraw" | "transfer";
  amount: number;
  from?: string;
  to?: string;
  createdAt: string;
  [key: string]: any;
}

export const getMyTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await api.get<Transaction[]>(
      "/mini-project/api/transactions/my"
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Deposit to your account
export interface DepositRequest {
  amount: number;
}

export interface DepositResponse {
  message: string;
  balance?: number;
  transaction?: Transaction;
  [key: string]: any;
}

export const deposit = async (
  data: DepositRequest
): Promise<DepositResponse> => {
  try {
    const response = await api.put<DepositResponse>(
      "/mini-project/api/transactions/deposit",
      data
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Withdraw from your account
export interface WithdrawRequest {
  amount: number;
}

export interface WithdrawResponse {
  message: string;
  balance?: number;
  transaction?: Transaction;
  [key: string]: any;
}

export const withdraw = async (
  data: WithdrawRequest
): Promise<WithdrawResponse> => {
  try {
    const response = await api.put<WithdrawResponse>(
      "/mini-project/api/transactions/withdraw",
      data
    );
    return response.data;
  } catch (error) {
    throw error as AxiosError;
  }
};

// Transfer to another user
export interface TransferRequest {
  amount: number;
  username: string;
}

export interface TransferResponse {
  message: string;
  balance?: number;
  transaction?: Transaction;
  [key: string]: any;
}

export const transfer = async (
  username: string,
  data: { amount: number }
): Promise<TransferResponse> => {
  try {
    const response = await api.put<TransferResponse>(
      `/mini-project/api/transactions/transfer/${username}`,
      { amount: data.amount }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    // Log more details for debugging
    if (axiosError.response) {
      console.error("Transfer API Error:", {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data,
        url: `/mini-project/api/transactions/transfer/${username}`,
      });
    }
    throw axiosError;
  }
};

