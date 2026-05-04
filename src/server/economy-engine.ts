// THE OPEN WORLD - Economy Engine
// Income vs Outcome tracked to the cent

export class EconomyEngine {
  private marketState: MarketState;
  
  constructor() {
    this.marketState = {
      inflation: 0.03,
      unemployment: 0.045,
      avgIncome: 45000,
      costOfLivingIndex: 89, // West Memphis, AR
    };
  }
  
  calculateHourlyWage(job: JobData): number {
    const baseWage = job.basePay / 2080; // Annual to hourly
    const adjusted = baseWage * (1 + this.marketState.inflation);
    return Math.round(adjusted * 100) / 100; // Track to cent
  }
  
  calculateDailyExpenses(lifestyle: Lifestyle, days: number = 1): ExpenseReport {
    const daily: ExpenseItem[] = [];
    
    // Housing
    daily.push({ category: 'housing', amount: lifestyle.rent / 30, desc: 'Rent' });
    
    // Food
    const foodCost = lifestyle.foodTier === 'premium' ? 25 : lifestyle.foodTier === 'standard' ? 15 : 8;
    daily.push({ category: 'food', amount: foodCost, desc: 'Food & groceries' });
    
    // Transportation
    if (lifestyle.hasVehicle) {
      daily.push({ category: 'transport', amount: 12, desc: 'Gas & maintenance' });
    }
    
    // Utilities
    daily.push({ category: 'utilities', amount: 8, desc: 'Electric, water, internet' });
    
    const total = daily.reduce((sum, item) => sum + item.amount, 0) * days;
    
    return { items: daily, total: Math.round(total * 100) / 100 };
  }
  
  getMarketReport(): MarketState {
    return { ...this.marketState };
  }
}

export interface MarketState {
  inflation: number;
  unemployment: number;
  avgIncome: number;
  costOfLivingIndex: number;
}

export interface JobData {
  title: string;
  employer: string;
  basePay: number;
  tier: 'entry' | 'skilled' | 'career' | 'elite' | 'executive';
  hoursPerWeek: number;
}

export interface Lifestyle {
  rent: number;
  foodTier: 'budget' | 'standard' | 'premium';
  hasVehicle: boolean;
  entertainment: number;
}

export interface ExpenseItem {
  category: string;
  amount: number;
  desc: string;
}

export interface ExpenseReport {
  items: ExpenseItem[];
  total: number;
}

// West Memphis, AR job market
export const JOBS_WEST_MEMPHIS: JobData[] = [
  { title: 'Cashier', employer: 'Walmart Supercenter', basePay: 28000, tier: 'entry', hoursPerWeek: 32 },
  { title: 'Warehouse Worker', employer: 'Amazon DSP', basePay: 35000, tier: 'entry', hoursPerWeek: 40 },
  { title: 'Line Cook', employer: "Charlie's Chicken", basePay: 26000, tier: 'entry', hoursPerWeek: 35 },
  { title: 'Customer Service Rep', employer: 'FedEx', basePay: 38000, tier: 'skilled', hoursPerWeek: 40 },
  { title: 'Truck Driver', employer: 'J.B. Hunt', basePay: 55000, tier: 'skilled', hoursPerWeek: 50 },
  { title: 'Registered Nurse', employer: 'Baptist Memorial', basePay: 65000, tier: 'career', hoursPerWeek: 36 },
  { title: 'Software Developer', employer: 'Remote', basePay: 85000, tier: 'career', hoursPerWeek: 40 },
];
