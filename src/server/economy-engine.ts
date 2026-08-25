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
  skill?: string;
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

// Global Job Market Data
export const JOB_MARKET: Record<string, JobData[]> = {
  west_memphis: [
    { title: 'Cashier', employer: 'Walmart Supercenter', basePay: 28000, tier: 'entry', hoursPerWeek: 32, skill: 'charisma' },
    { title: 'Warehouse Worker', employer: 'Amazon DSP', basePay: 35000, tier: 'entry', hoursPerWeek: 40, skill: 'fitness' },
    { title: 'Line Cook', employer: "Charlie's Chicken", basePay: 26000, tier: 'entry', hoursPerWeek: 35, skill: 'cooking' },
    { title: 'Customer Service Rep', employer: 'FedEx', basePay: 38000, tier: 'skilled', hoursPerWeek: 40, skill: 'charisma' },
    { title: 'Truck Driver', employer: 'J.B. Hunt', basePay: 55000, tier: 'skilled', hoursPerWeek: 50, skill: 'driving' },
    { title: 'Registered Nurse', employer: 'Baptist Memorial', basePay: 65000, tier: 'career', hoursPerWeek: 36, skill: 'charisma' },
    { title: 'Software Developer', employer: 'Remote', basePay: 85000, tier: 'career', hoursPerWeek: 40, skill: 'tech' },
  ],
  memphis: [
    { title: 'Package Handler', employer: 'FedEx World Hub', basePay: 38000, tier: 'entry', hoursPerWeek: 40, skill: 'fitness' },
    { title: 'Security Guard', employer: 'St. Jude', basePay: 32000, tier: 'entry', hoursPerWeek: 40, skill: 'fitness' },
    { title: 'IT Support', employer: 'AutoZone HQ', basePay: 55000, tier: 'skilled', hoursPerWeek: 40, skill: 'tech' },
    { title: 'Logistics Analyst', employer: 'FedEx', basePay: 65000, tier: 'skilled', hoursPerWeek: 40, skill: 'finance' },
    { title: 'Hospital Administrator', employer: 'Methodist Health', basePay: 95000, tier: 'executive', hoursPerWeek: 45, skill: 'finance' },
    { title: 'Content Creator', employer: 'GhostWax', basePay: 75000, tier: 'career', hoursPerWeek: 35, skill: 'charisma' },
  ],
  new_york: [
    { title: 'Barista', employer: 'Joe Coffee', basePay: 45000, tier: 'entry', hoursPerWeek: 30 },
    { title: 'Junior Analyst', employer: 'Goldman Sachs', basePay: 95000, tier: 'skilled', hoursPerWeek: 60 },
    { title: 'Frontend Developer', employer: 'Vercel', basePay: 140000, tier: 'career', hoursPerWeek: 40 },
    { title: 'Fashion Assistant', employer: 'Vogue', basePay: 55000, tier: 'entry', hoursPerWeek: 45 },
    { title: 'Senior Portfolio Manager', employer: 'BlackRock', basePay: 280000, tier: 'executive', hoursPerWeek: 55 },
  ],
  london: [
    { title: 'Pub Staff', employer: 'The Red Lion', basePay: 32000, tier: 'entry', hoursPerWeek: 35 },
    { title: 'Financial Associate', employer: 'HSBC', basePay: 75000, tier: 'skilled', hoursPerWeek: 45 },
    { title: 'UX Designer', employer: 'Monzo', basePay: 85000, tier: 'career', hoursPerWeek: 40 },
    { title: 'Cloud Architect', employer: 'Revolut', basePay: 120000, tier: 'career', hoursPerWeek: 40 },
  ],
  tokyo: [
    { title: 'Convenience Store Clerk', employer: '7-Eleven', basePay: 30000, tier: 'entry', hoursPerWeek: 40 },
    { title: 'Game Tester', employer: 'Nintendo', basePay: 45000, tier: 'entry', hoursPerWeek: 40 },
    { title: 'Systems Engineer', employer: 'Sony', basePay: 85000, tier: 'skilled', hoursPerWeek: 50 },
    { title: 'Robotics Researcher', employer: 'Toyota', basePay: 110000, tier: 'career', hoursPerWeek: 40 },
  ],
  atlanta: [
    { title: 'Production Assistant', employer: 'Tyler Perry Studios', basePay: 42000, tier: 'entry', hoursPerWeek: 45 },
    { title: 'Data Scientist', employer: 'Mailchimp', basePay: 125000, tier: 'career', hoursPerWeek: 40 },
    { title: 'A&R Scout', employer: 'Quality Control Music', basePay: 65000, tier: 'skilled', hoursPerWeek: 40 },
  ],
  los_angeles: [
    { title: 'Extra', employer: 'Warner Bros', basePay: 35000, tier: 'entry', hoursPerWeek: 20 },
    { title: 'Social Media Manager', employer: 'Influencer Agency', basePay: 65000, tier: 'skilled', hoursPerWeek: 40 },
    { title: 'Script Writer', employer: 'Netflix', basePay: 110000, tier: 'career', hoursPerWeek: 40 },
    { title: 'Executive Producer', employer: 'Disney', basePay: 350000, tier: 'executive', hoursPerWeek: 50 },
  ],
};

// Kept for backward compatibility
export const JOBS_WEST_MEMPHIS: JobData[] = JOB_MARKET.west_memphis || [];
