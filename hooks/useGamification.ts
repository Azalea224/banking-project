import { useMemo } from "react";
import { Transaction } from "../api/transactions";
import { UserProfile } from "../api/auth";
import {
  GETTING_STARTED_ICON,
  SOCIAL_BUTTERFLY_ICON,
  POWER_USER_ICON,
  TRANSACTION_MASTER_ICON,
  MONEY_MAKER_ICON,
  SAVER_ICON,
  SHARING_IS_CARING_ICON,
  CENTURION_ICON,
  THOUSANDAIRE_ICON,
  HIGH_ROLLER_ICON,
} from "../constants/imageAssets";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any; // Can be string (emoji) or image source
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export interface GamificationStats {
  totalPoints: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  levelProgress: number;
  achievements: Achievement[];
  totalTransactions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfers: number;
  streak: number;
}

// Calculate points based on transactions
const calculatePoints = (transactions: Transaction[]): number => {
  if (!transactions || transactions.length === 0) return 0;

  let points = 0;
  transactions.forEach((transaction) => {
    // Base points for each transaction
    points += 10;

    // Bonus points based on transaction type
    if (transaction.type === "deposit") {
      points += 20; // Deposits are good!
    } else if (transaction.type === "transfer") {
      points += 15; // Transfers show activity
    } else if (transaction.type === "withdraw") {
      points += 5; // Withdrawals are neutral
    }

    // Bonus for larger amounts (capped)
    const amount = Math.abs(transaction.amount);
    if (amount >= 1000) points += 50;
    else if (amount >= 500) points += 30;
    else if (amount >= 100) points += 15;
  });

  return points;
};

// Calculate level from total points
const calculateLevel = (
  totalPoints: number
): { level: number; xp: number; xpToNextLevel: number } => {
  // Level formula: Each level requires more XP
  // Level 1: 0-100 XP
  // Level 2: 100-250 XP
  // Level 3: 250-450 XP
  // Level 4: 450-700 XP
  // etc.

  let level = 1;
  let xp = totalPoints;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = 100;

  while (xp >= xpForNextLevel) {
    xp -= xpForNextLevel;
    level++;
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = xpForCurrentLevel + level * 50 + 100;
  }

  return {
    level,
    xp,
    xpToNextLevel: xpForNextLevel,
  };
};

// Calculate achievements
const calculateAchievements = (
  transactions: Transaction[],
  profile: UserProfile | undefined
): Achievement[] => {
  const achievements: Achievement[] = [];

  if (!transactions) return achievements;

  const totalTransactions = transactions.length;
  const deposits = transactions.filter((t) => t.type === "deposit").length;
  const withdrawals = transactions.filter((t) => t.type === "withdraw").length;
  const transfers = transactions.filter((t) => t.type === "transfer").length;
  const balance = profile?.balance || 0;

  // First Transaction
  achievements.push({
    id: "first_transaction",
    name: "Getting Started",
    description: "Complete your first transaction",
    icon: GETTING_STARTED_ICON,
    unlocked: totalTransactions >= 1,
    progress: Math.min(totalTransactions, 1),
    maxProgress: 1,
  });

  // Transaction milestones
  achievements.push({
    id: "10_transactions",
    name: "Active User",
    description: "Complete 10 transactions",
    icon: SOCIAL_BUTTERFLY_ICON,
    unlocked: totalTransactions >= 10,
    progress: Math.min(totalTransactions, 10),
    maxProgress: 10,
  });

  achievements.push({
    id: "50_transactions",
    name: "Power User",
    description: "Complete 50 transactions",
    icon: POWER_USER_ICON,
    unlocked: totalTransactions >= 50,
    progress: Math.min(totalTransactions, 50),
    maxProgress: 50,
  });

  achievements.push({
    id: "100_transactions",
    name: "Transaction Master",
    description: "Complete 100 transactions",
    icon: TRANSACTION_MASTER_ICON,
    unlocked: totalTransactions >= 100,
    progress: Math.min(totalTransactions, 100),
    maxProgress: 100,
  });

  // Deposit achievements
  achievements.push({
    id: "first_deposit",
    name: "Money Maker",
    description: "Make your first deposit",
    icon: MONEY_MAKER_ICON,
    unlocked: deposits >= 1,
    progress: Math.min(deposits, 1),
    maxProgress: 1,
  });

  achievements.push({
    id: "10_deposits",
    name: "Saver",
    description: "Make 10 deposits",
    icon: SAVER_ICON,
    unlocked: deposits >= 10,
    progress: Math.min(deposits, 10),
    maxProgress: 10,
  });

  // Transfer achievements
  achievements.push({
    id: "first_transfer",
    name: "Sharing is Caring",
    description: "Make your first transfer",
    icon: SHARING_IS_CARING_ICON,
    unlocked: transfers >= 1,
    progress: Math.min(transfers, 1),
    maxProgress: 1,
  });

  achievements.push({
    id: "10_transfers",
    name: "Social Butterfly",
    description: "Make 10 transfers",
    icon: SOCIAL_BUTTERFLY_ICON,
    unlocked: transfers >= 10,
    progress: Math.min(transfers, 10),
    maxProgress: 10,
  });

  // Balance achievements
  achievements.push({
    id: "balance_100",
    name: "Centurion",
    description: "Reach 100 KWD balance",
    icon: CENTURION_ICON,
    unlocked: balance >= 100,
    progress: Math.min(balance, 100),
    maxProgress: 100,
  });

  achievements.push({
    id: "balance_1000",
    name: "Thousandaire",
    description: "Reach 1,000 KWD balance",
    icon: THOUSANDAIRE_ICON,
    unlocked: balance >= 1000,
    progress: Math.min(balance, 1000),
    maxProgress: 1000,
  });

  achievements.push({
    id: "balance_10000",
    name: "High Roller",
    description: "Reach 10,000 KWD balance",
    icon: HIGH_ROLLER_ICON,
    unlocked: balance >= 10000,
    progress: Math.min(balance, 10000),
    maxProgress: 10000,
  });

  return achievements;
};

export const useGamification = (
  transactions: Transaction[] | undefined,
  profile: UserProfile | undefined
): GamificationStats => {
  return useMemo(() => {
    if (!transactions) {
      return {
        totalPoints: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        levelProgress: 0,
        achievements: [],
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalTransfers: 0,
        streak: 0,
      };
    }

    const totalPoints = calculatePoints(transactions);
    const { level, xp, xpToNextLevel } = calculateLevel(totalPoints);
    const levelProgress = xpToNextLevel > 0 ? (xp / xpToNextLevel) * 100 : 0;

    const totalTransactions = transactions.length;
    const totalDeposits = transactions.filter(
      (t) => t.type === "deposit"
    ).length;
    const totalWithdrawals = transactions.filter(
      (t) => t.type === "withdraw"
    ).length;
    const totalTransfers = transactions.filter(
      (t) => t.type === "transfer"
    ).length;

    // Calculate streak (consecutive days with transactions)
    let streak = 0;
    if (transactions.length > 0) {
      const sortedTransactions = [...transactions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentDate = new Date(today);
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.createdAt);
        transactionDate.setHours(0, 0, 0, 0);

        if (transactionDate.getTime() === currentDate.getTime()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (transactionDate.getTime() < currentDate.getTime()) {
          break;
        }
      }
    }

    const achievements = calculateAchievements(transactions, profile);

    return {
      totalPoints,
      level,
      xp,
      xpToNextLevel,
      levelProgress,
      achievements,
      totalTransactions,
      totalDeposits,
      totalWithdrawals,
      totalTransfers,
      streak,
    };
  }, [transactions, profile]);
};
