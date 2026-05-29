export interface Wallet {
  coins: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export function createInitialWallet(): Wallet {
  return { coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
}

export function earn(w: Wallet, amount: number): Wallet {
  if (amount <= 0) return w;
  return {
    coins: w.coins + amount,
    lifetimeEarned: w.lifetimeEarned + amount,
    lifetimeSpent: w.lifetimeSpent,
  };
}

export function spend(w: Wallet, amount: number): Wallet | null {
  if (amount < 0) return null;
  if (w.coins < amount) return null;
  return {
    coins: w.coins - amount,
    lifetimeEarned: w.lifetimeEarned,
    lifetimeSpent: w.lifetimeSpent + amount,
  };
}
