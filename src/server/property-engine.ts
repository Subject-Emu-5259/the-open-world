// THE OPEN WORLD - Property & Investment Engine
// Real estate, rental income, property appreciation

import type { PlayerState, GameAction } from './game-engine.js';

export type PropertyType = 'house' | 'apartment' | 'commercial' | 'land';
export type InvestmentType = 'stocks' | 'bonds' | 'crypto' | 'business';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  city: string;
  district: string;
  purchasePrice: number;
  currentValue: number;
  condition: number; // 0-100
  rentalIncome: number; // Monthly
  maintenanceCost: number; // Monthly
  mortgageRemaining: number;
  mortgagePayment: number; // Monthly
  purchasedAt: number;
}

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  shares: number;
  purchasePrice: number;
  currentValue: number;
  purchasedAt: number;
}

export interface PropertyListing {
  id: string;
  name: string;
  type: PropertyType;
  city: string;
  district: string;
  price: number;
  rentalPotential: number;
  description: string;
}

// Mid-South Real Estate Market
export const PROPERTIES_MEMPHIS: PropertyListing[] = [
  {
    id: 'prop_001',
    name: 'South Memphis Bungalow',
    type: 'house',
    city: 'memphis',
    district: 'south_memphis',
    price: 85000,
    rentalPotential: 800,
    description: 'Charming 2BR bungalow in established neighborhood. Needs some TLC.',
  },
  {
    id: 'prop_002',
    name: 'Downtown Loft',
    type: 'apartment',
    city: 'memphis',
    district: 'downtown',
    price: 180000,
    rentalPotential: 1500,
    description: 'Modern loft near Beale St. High rental demand.',
  },
  {
    id: 'prop_003',
    name: 'Orange Mound Duplex',
    type: 'commercial',
    city: 'memphis',
    district: 'orange_mound',
    price: 120000,
    rentalPotential: 1600,
    description: 'Duplex - live in one unit, rent the other. Cash flow positive.',
  },
  {
    id: 'prop_004',
    name: 'East Memphis Family Home',
    type: 'house',
    city: 'memphis',
    district: 'east_memphis',
    price: 250000,
    rentalPotential: 1800,
    description: '4BR family home in top school district. Solid investment.',
  },
  {
    id: 'prop_005',
    name: 'Midtown Condo',
    type: 'apartment',
    city: 'memphis',
    district: 'midtown',
    price: 145000,
    rentalPotential: 1200,
    description: 'Walkable location near Cooper-Young. Young professional renters.',
  },
];

export const PROPERTIES_LITTLEROCK: PropertyListing[] = [
  {
    id: 'prop_006',
    name: 'River Market Penthouse',
    type: 'apartment',
    city: 'littlerock',
    district: 'river_market',
    price: 320000,
    rentalPotential: 2200,
    description: 'Luxury penthouse with river views. Premium tenant market.',
  },
  {
    id: 'prop_007',
    name: 'Hillcrest Craftsman',
    type: 'house',
    city: 'littlerock',
    district: 'hillcrest',
    price: 275000,
    rentalPotential: 1900,
    description: 'Historic craftsman in trendy Hillcrest. High appreciation potential.',
  },
  {
    id: 'prop_008',
    name: 'West LR Retail Space',
    type: 'commercial',
    city: 'littlerock',
    district: 'west_lr',
    price: 400000,
    rentalPotential: 3500,
    description: 'Strip mall unit. Multiple retail tenants possible.',
  },
];

export const PROPERTIES_SOUTHAVEN: PropertyListing[] = [
  {
    id: 'prop_009',
    name: 'Snowden Starter Home',
    type: 'house',
    city: 'southaven',
    district: 'snowden',
    price: 165000,
    rentalPotential: 1300,
    description: 'New construction 3BR. Growing suburb, strong rental market.',
  },
  {
    id: 'prop_010',
    name: 'Goodman Rd Commercial Lot',
    type: 'land',
    city: 'southaven',
    district: 'goodman_road',
    price: 95000,
    rentalPotential: 0,
    description: 'Prime commercial lot on busy corridor. Appreciation play.',
  },
];

export class PropertyEngine {
  private marketTrend: number = 0.003; // 0.3% monthly appreciation
  
  constructor() {}
  
  // === PROPERTY LISTINGS ===
  
  getAllListings(): PropertyListing[] {
    return [...PROPERTIES_MEMPHIS, ...PROPERTIES_LITTLEROCK, ...PROPERTIES_SOUTHAVEN];
  }
  
  getListingsByCity(city: string): PropertyListing[] {
    const listings = {
      memphis: PROPERTIES_MEMPHIS,
      littlerock: PROPERTIES_LITTLEROCK,
      southaven: PROPERTIES_SOUTHAVEN,
    };
    return listings[city as keyof typeof listings] || [];
  }
  
  getListingById(id: string): PropertyListing | undefined {
    return this.getAllListings().find(p => p.id === id);
  }
  
  // === PROPERTY PURCHASE ===
  
  purchaseProperty(player: PlayerState, listingId: string, useMortgage: boolean = true): GameAction {
    const listing = this.getListingById(listingId);
    if (!listing) {
      return { success: false, message: 'Property not found.' };
    }
    
    const downPaymentPercent = 0.20;
    const downPayment = Math.floor(listing.price * downPaymentPercent);
    
    if (useMortgage) {
      if (player.money < downPayment) {
        return { 
          success: false, 
          message: `Need $${downPayment.toLocaleString()} down payment (20%). You have $${player.money.toLocaleString()}.` 
        };
      }
    } else {
      if (player.money < listing.price) {
        return { 
          success: false, 
          message: `Need $${listing.price.toLocaleString()} for full purchase. You have $${player.money.toLocaleString()}.` 
        };
      }
    }
    
    // Create property
    const property: Property = {
      id: `owned_${listing.id}_${Date.now()}`,
      name: listing.name,
      type: listing.type,
      city: listing.city,
      district: listing.district,
      purchasePrice: listing.price,
      currentValue: listing.price,
      condition: 100,
      rentalIncome: listing.rentalPotential,
      maintenanceCost: Math.floor(listing.price * 0.01 / 12), // 1% annually
      mortgageRemaining: useMortgage ? listing.price - downPayment : 0,
      mortgagePayment: useMortgage ? Math.floor((listing.price - downPayment) * 0.005) : 0, // ~0.5%/month
      purchasedAt: Date.now(),
    };
    
    const cashSpent = useMortgage ? downPayment : listing.price;
    
    return {
      success: true,
      message: `🏠 **Purchased: ${listing.name}**
${listing.description}

**Details:**
- Purchase Price: $${listing.price.toLocaleString()}
- Down Payment: $${downPayment.toLocaleString()}
- Mortgage: ${useMortgage ? `$${property.mortgageRemaining.toLocaleString()} ($${property.mortgagePayment}/mo)` : 'None (Cash Purchase)'}
- Rental Income: $${listing.rentalPotential}/mo
- Location: ${listing.district.replace('_', ' ')}, ${listing.city.replace('littlerock', 'Little Rock').replace('memphis', 'Memphis').replace('southaven', 'Southaven')}

**Cash spent:** $${cashSpent.toLocaleString()}
Use "properties" to view your portfolio.`,
      data: { property, cashSpent },
    };
  }
  
  // === PROPERTY MANAGEMENT ===
  
  calculateMonthlyIncome(properties: Property[]): number {
    return properties.reduce((sum, p) => {
      const netIncome = p.rentalIncome - p.maintenanceCost - p.mortgagePayment;
      return sum + netIncome;
    }, 0);
  }
  
  calculatePropertyValue(properties: Property[]): number {
    return properties.reduce((sum, p) => sum + p.currentValue, 0);
  }
  
  calculateEquity(properties: Property[]): number {
    return properties.reduce((sum, p) => {
      const equity = p.currentValue - p.mortgageRemaining;
      return sum + equity;
    }, 0);
  }
  
  applyMonthlyAppreciation(properties: Property[]): void {
    properties.forEach(p => {
      // Random appreciation/depreciation within market trend
      const variance = (Math.random() - 0.5) * 0.005;
      const monthlyChange = this.marketTrend + variance;
      p.currentValue = Math.floor(p.currentValue * (1 + monthlyChange));
      
      // Condition degradation
      p.condition = Math.max(0, p.condition - 1);
      
      // Value adjustment for condition
      if (p.condition < 50) {
        p.currentValue = Math.floor(p.currentValue * 0.99);
      }
    });
  }
  
  repairProperty(property: Property, player: PlayerState): GameAction {
    const repairCost = Math.floor((100 - property.condition) * 50);
    
    if (player.money < repairCost) {
      return { 
        success: false, 
        message: `Repairs cost $${repairCost.toLocaleString()}. You have $${player.money.toLocaleString()}.` 
      };
    }
    
    property.condition = 100;
    player.money -= repairCost;
    
    return {
      success: true,
      message: `🔧 Repaired ${property.name}. Condition restored to 100%. Cost: $${repairCost.toLocaleString()}`,
    };
  }
  
  sellProperty(property: Property, player: PlayerState): GameAction {
    const salePrice = Math.floor(property.currentValue * (property.condition / 100));
    const mortgagePayoff = property.mortgageRemaining;
    const netProceeds = salePrice - mortgagePayoff;
    
    return {
      success: true,
      message: `💰 **Sold: ${property.name}**
Sale Price: $${salePrice.toLocaleString()}
Mortgage Paid Off: $${mortgagePayoff.toLocaleString()}
Net Proceeds: $${netProceeds.toLocaleString()}`,
      data: { salePrice, mortgagePayoff, netProceeds },
    };
  }
  
  // === INVESTMENTS ===
  
  getInvestmentOptions(): Array<{ type: InvestmentType; name: string; minInvestment: number; risk: string; expectedReturn: string }> {
    return [
      { type: 'stocks', name: 'S&P 500 Index Fund', minInvestment: 100, risk: 'Medium', expectedReturn: '8-12% annually' },
      { type: 'stocks', name: 'Tech Growth Fund', minInvestment: 250, risk: 'High', expectedReturn: '15-25% annually' },
      { type: 'bonds', name: 'Treasury Bonds', minInvestment: 100, risk: 'Low', expectedReturn: '3-5% annually' },
      { type: 'bonds', name: 'Municipal Bonds', minInvestment: 500, risk: 'Low', expectedReturn: '2-4% annually' },
      { type: 'crypto', name: 'Bitcoin', minInvestment: 50, risk: 'Very High', expectedReturn: '-50% to +200%' },
      { type: 'crypto', name: 'Ethereum', minInvestment: 25, risk: 'Very High', expectedReturn: '-50% to +200%' },
      { type: 'business', name: 'Local Restaurant Partnership', minInvestment: 5000, risk: 'High', expectedReturn: '10-30% annually' },
      { type: 'business', name: 'Startup Investment', minInvestment: 1000, risk: 'Very High', expectedReturn: '-100% to +1000%' },
    ];
  }
  
  purchaseInvestment(player: PlayerState, type: InvestmentType, name: string, amount: number): GameAction {
    if (player.money < amount) {
      return { success: false, message: `Insufficient funds. Need $${amount}, have $${player.money}.` };
    }
    
    const investment: Investment = {
      id: `inv_${Date.now()}`,
      type,
      name,
      shares: amount,
      purchasePrice: amount,
      currentValue: amount,
      purchasedAt: Date.now(),
    };
    
    return {
      success: true,
      message: `📈 **Invested: $${amount.toLocaleString()} in ${name}**
Type: ${type.charAt(0).toUpperCase() + type.slice(1)}
Shares: ${amount}
Use "investments" to track your portfolio.`,
      data: { investment },
    };
  }
  
  applyInvestmentReturns(investments: Investment[]): void {
    investments.forEach(inv => {
      const returns: Record<InvestmentType, { mean: number; variance: number }> = {
        stocks: { mean: 0.008, variance: 0.04 },
        bonds: { mean: 0.003, variance: 0.01 },
        crypto: { mean: 0.02, variance: 0.25 },
        business: { mean: 0.01, variance: 0.08 },
      };
      
      const config = returns[inv.type];
      const change = config.mean + (Math.random() - 0.5) * config.variance;
      inv.currentValue = Math.floor(inv.currentValue * (1 + change));
    });
  }
  
  sellInvestment(investment: Investment): GameAction {
    const profit = investment.currentValue - investment.purchasePrice;
    const profitPercent = ((profit / investment.purchasePrice) * 100).toFixed(1);
    
    return {
      success: true,
      message: `📊 **Sold: ${investment.name}**
Purchase: $${investment.purchasePrice.toLocaleString()}
Sale: $${investment.currentValue.toLocaleString()}
${profit >= 0 ? '📈 Profit' : '📉 Loss'}: $${Math.abs(profit).toLocaleString()} (${profitPercent}%)`,
      data: { proceeds: investment.currentValue, profit },
    };
  }
  
  // === MARKET CONDITIONS ===
  
  getMarketReport(): { trend: string; trendDirection: 'up' | 'down' | 'stable'; recommendation: string } {
    const trends = [
      { trend: 'Hot seller\'s market - prices rising fast', trendDirection: 'up' as const, recommendation: 'Buy quickly if you find a deal' },
      { trend: 'Balanced market - fair prices', trendDirection: 'stable' as const, recommendation: 'Good time to buy or sell' },
      { trend: 'Buyer\'s market - prices softening', trendDirection: 'down' as const, recommendation: 'Negotiate hard, look for deals' },
    ];
    
    const idx = Math.floor(Math.random() * trends.length);
    return trends[idx] ?? trends[1]!;
  }
}
