// THE OPEN WORLD - Property & Investment Engine
// Real estate, rental income, property appreciation

import type { PlayerState, GameAction } from './game-engine.js';

export type PropertyType = 'house' | 'apartment' | 'commercial' | 'land' | 'luxury_penthouse' | 'vacation_rental' | 'warehouse' | 'farmland' | 'offshore_villa';
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
  renovationLevel?: number;
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

export const PROPERTIES_INTERNATIONAL: PropertyListing[] = [
  {
    id: 'prop_011',
    name: 'Kensington Townhouse',
    type: 'house',
    city: 'london',
    district: 'kensington',
    price: 2450000,
    rentalPotential: 8500,
    description: 'Stunning 4-story townhouse in prime Kensington. Ultimate prestige.',
  },
  {
    id: 'prop_012',
    name: 'Shinjuku Micro-Apartment',
    type: 'apartment',
    city: 'tokyo',
    district: 'shinjuku',
    price: 450000,
    rentalPotential: 2200,
    description: 'Efficient and modern micro-apartment in the heart of Tokyo.',
  },
  {
    id: 'prop_013',
    name: 'Montmartre Artist Studio',
    type: 'apartment',
    city: 'paris',
    district: 'montmartre',
    price: 680000,
    rentalPotential: 3100,
    description: 'Charming studio with high ceilings and city views.',
  },
  {
    id: 'prop_014',
    name: 'Palm Jumeirah Villa',
    type: 'house',
    city: 'dubai',
    district: 'palm_jumeirah',
    price: 5200000,
    rentalPotential: 25000,
    description: 'Luxury villa on the iconic Palm Jumeirah with private beach access.',
  },
  {
    id: 'prop_015',
    name: 'Kreuzberg Industrial Loft',
    type: 'commercial',
    city: 'berlin',
    district: 'kreuzberg',
    price: 1100000,
    rentalPotential: 5500,
    description: 'Converted factory loft. Perfect for creative space or luxury living.',
  },
];

export const PROPERTIES_NASHVILLE: PropertyListing[] = [
  {
    id: 'prop_016',
    name: 'Music Row Studio Condo',
    type: 'apartment',
    city: 'nashville',
    district: 'music_row',
    price: 310000,
    rentalPotential: 2100,
    description: 'Compact studio right on Music Row. High turnover from touring musicians.',
  },
  {
    id: 'prop_017',
    name: 'Germantown Historic Home',
    type: 'house',
    city: 'nashville',
    district: 'germantown_nash',
    price: 425000,
    rentalPotential: 2400,
    description: 'Restored Victorian near top restaurants. Active short-term rental market.',
  },
];

export const PROPERTIES_ATLANTA: PropertyListing[] = [
  {
    id: 'prop_018',
    name: 'Buckhead Luxury High-Rise',
    type: 'apartment',
    city: 'atlanta',
    district: 'buckhead',
    price: 650000,
    rentalPotential: 3800,
    description: 'Skyline views and concierge service in Atlanta\'s premier financial district.',
  },
  {
    id: 'prop_019',
    name: 'West End Renovation Project',
    type: 'house',
    city: 'atlanta',
    district: 'west_end',
    price: 195000,
    rentalPotential: 1400,
    description: 'Diamond in the rough near the BeltLine. Strong appreciation bet.',
  },
];

export const PROPERTIES_CHICAGO: PropertyListing[] = [
  {
    id: 'prop_020',
    name: 'Loop Micro-Unit',
    type: 'apartment',
    city: 'chicago',
    district: 'loop',
    price: 285000,
    rentalPotential: 1900,
    description: 'Efficient downtown unit walking distance to transit and Millennium Park.',
  },
  {
    id: 'prop_021',
    name: 'Wicker Park Duplex',
    type: 'commercial',
    city: 'chicago',
    district: 'wicker_park',
    price: 525000,
    rentalPotential: 3200,
    description: 'Mixed-use duplex with retail below and residential above.',
  },
];

export const PROPERTIES_NEWYORK: PropertyListing[] = [
  {
    id: 'prop_022',
    name: 'Harlem Brownstone',
    type: 'house',
    city: 'new_york',
    district: 'harlem',
    price: 1200000,
    rentalPotential: 5500,
    description: 'Classic brownstone with original details. Stable long-term rental demand.',
  },
  {
    id: 'prop_023',
    name: 'Brooklyn Garden Apartment',
    type: 'apartment',
    city: 'new_york',
    district: 'brooklyn',
    price: 780000,
    rentalPotential: 3600,
    description: 'Garden-level unit in a quiet block. Popular with young families.',
  },
];

export const PROPERTIES_LOSANGELES: PropertyListing[] = [
  {
    id: 'prop_024',
    name: 'Venice Beach Bungalow',
    type: 'house',
    city: 'los_angeles',
    district: 'venice',
    price: 1850000,
    rentalPotential: 7200,
    description: 'Breezy coastal bungalow blocks from the boardwalk.',
  },
  {
    id: 'prop_025',
    name: 'Hollywood Studio Tower',
    type: 'apartment',
    city: 'los_angeles',
    district: 'hollywood',
    price: 420000,
    rentalPotential: 2300,
    description: 'No-frills studio tower with pool. Steady supply of aspiring industry renters.',
  },
];

export const PROPERTIES_MIAMI: PropertyListing[] = [
  {
    id: 'prop_026',
    name: 'South Beach Art Deco Condo',
    type: 'apartment',
    city: 'miami',
    district: 'downtown_generic',
    price: 590000,
    rentalPotential: 3400,
    description: 'Iconic Art Deco building with seasonal rental upside near the beach.',
  },
  {
    id: 'prop_027',
    name: 'Wynwood Creative Loft',
    type: 'commercial',
    city: 'miami',
    district: 'industrial',
    price: 875000,
    rentalPotential: 4800,
    description: 'Converted warehouse near the Wynwood Walls. Gallery or studio potential.',
  },
];

export const PROPERTIES_HOUSTON: PropertyListing[] = [
  {
    id: 'prop_028',
    name: 'Montrose Mid-Century Home',
    type: 'house',
    city: 'houston',
    district: 'suburbs',
    price: 355000,
    rentalPotential: 2100,
    description: 'Pristine mid-century home in one of Houston\'s most walkable neighborhoods.',
  },
  {
    id: 'prop_029',
    name: 'Downtown Energy Corridor Office',
    type: 'commercial',
    city: 'houston',
    district: 'downtown_generic',
    price: 1150000,
    rentalPotential: 6200,
    description: 'Small-office suite near the energy corridor. Corporate lease potential.',
  },
];

export const PROPERTIES_DALLAS: PropertyListing[] = [
  {
    id: 'prop_030',
    name: 'Uptown High-Rise Condo',
    type: 'apartment',
    city: 'dallas',
    district: 'uptown',
    price: 480000,
    rentalPotential: 2700,
    description: 'Walkable Uptown living with skyline pool and nightlife access.',
  },
  {
    id: 'prop_031',
    name: 'Deep Ellum Live/Work Loft',
    type: 'commercial',
    city: 'dallas',
    district: 'downtown_generic',
    price: 670000,
    rentalPotential: 3800,
    description: 'Live/work unit in Dallas\'s music and arts district.',
  },
];

export const PROPERTIES_PHOENIX: PropertyListing[] = [
  {
    id: 'prop_032',
    name: 'Scottsdale Desert Ranch',
    type: 'house',
    city: 'phoenix',
    district: 'suburbs',
    price: 520000,
    rentalPotential: 2600,
    description: 'Adobe-style ranch with pool and mountain views. Snowbird rental favorite.',
  },
  {
    id: 'prop_033',
    name: 'Downtown Phoenix Tech Office',
    type: 'commercial',
    city: 'phoenix',
    district: 'downtown_generic',
    price: 890000,
    rentalPotential: 4500,
    description: 'Modern office shell in Phoenix\'s revitalized core. Startup sublease potential.',
  },
];

export const PROPERTIES_EXPANSION: PropertyListing[] = [
  {
    id: 'prop_034',
    name: 'Manhattan Skyline Penthouse',
    type: 'luxury_penthouse',
    city: 'new_york',
    district: 'manhattan',
    price: 5200000,
    rentalPotential: 22000,
    description: 'Full-floor penthouse with Central Park views. Ultra-high-net-worth tenant pool.',
  },
  {
    id: 'prop_035',
    name: 'Malibu Beach Rental Villa',
    type: 'vacation_rental',
    city: 'los_angeles',
    district: 'venice',
    price: 2800000,
    rentalPotential: 15000,
    description: 'Coastal retreat that commands premium nightly rates in summer and holiday seasons.',
  },
  {
    id: 'prop_036',
    name: 'Palm Jumeirah Offshore Mansion',
    type: 'offshore_villa',
    city: 'dubai',
    district: 'palm_jumeirah',
    price: 8500000,
    rentalPotential: 35000,
    description: 'Private beach, marina access, and concierge service on Dubai\'s most famous archipelago.',
  },
  {
    id: 'prop_037',
    name: 'Champs-Élysées Penthouse Suite',
    type: 'luxury_penthouse',
    city: 'paris',
    district: 'champs_elysees',
    price: 4600000,
    rentalPotential: 19000,
    description: 'Haussmann-era penthouse with rooftop terrace overlooking the avenue.',
  },
  {
    id: 'prop_038',
    name: 'South Beach Vacation Condo',
    type: 'vacation_rental',
    city: 'miami',
    district: 'downtown_generic',
    price: 1150000,
    rentalPotential: 6500,
    description: 'Art Deco condo blocks from the beach. Strong short-term rental demand year-round.',
  },
  {
    id: 'prop_039',
    name: 'Houston Logistics Warehouse',
    type: 'warehouse',
    city: 'houston',
    district: 'industrial',
    price: 1450000,
    rentalPotential: 7800,
    description: 'Distribution warehouse near the ship channel. Long-term logistics tenant available.',
  },
  {
    id: 'prop_040',
    name: 'Sonoran Desert Farmland',
    type: 'farmland',
    city: 'phoenix',
    district: 'suburbs',
    price: 420000,
    rentalPotential: 1100,
    description: 'Irrigated acreage on the desert fringe. Slow but steady agricultural income and land-appreciation play.',
  },
  {
    id: 'prop_041',
    name: 'Memphis Distribution Center',
    type: 'warehouse',
    city: 'memphis',
    district: 'orange_mound',
    price: 680000,
    rentalPotential: 4200,
    description: 'Logistics hub near the FedEx superhub. Reliable commercial cash flow.',
  },
  {
    id: 'prop_042',
    name: 'Buckhead Mansion Estate',
    type: 'luxury_penthouse',
    city: 'atlanta',
    district: 'buckhead',
    price: 3400000,
    rentalPotential: 14500,
    description: 'Gated estate on a private drive. Old-money Atlanta aesthetic with modern amenities.',
  },
  {
    id: 'prop_043',
    name: 'Sydney Harbour Villa',
    type: 'offshore_villa',
    city: 'sydney',
    district: 'bondi',
    price: 6200000,
    rentalPotential: 26000,
    description: 'Waterfront villa minutes from Bondi Beach. International vacation-rental magnet.',
  },
];

export class PropertyEngine {
  private marketTrend: number = 0.003; // 0.3% monthly appreciation
  
  constructor() {}
  
  // === PROPERTY LISTINGS ===
  
  getAllListings(): PropertyListing[] {
    return [
      ...PROPERTIES_MEMPHIS,
      ...PROPERTIES_LITTLEROCK,
      ...PROPERTIES_SOUTHAVEN,
      ...PROPERTIES_INTERNATIONAL,
      ...PROPERTIES_NASHVILLE,
      ...PROPERTIES_ATLANTA,
      ...PROPERTIES_CHICAGO,
      ...PROPERTIES_NEWYORK,
      ...PROPERTIES_LOSANGELES,
      ...PROPERTIES_MIAMI,
      ...PROPERTIES_HOUSTON,
      ...PROPERTIES_DALLAS,
      ...PROPERTIES_PHOENIX,
      ...PROPERTIES_EXPANSION,
    ];
  }
  
  getListingsByCity(city: string): PropertyListing[] {
    const listings = {
      memphis: PROPERTIES_MEMPHIS,
      littlerock: PROPERTIES_LITTLEROCK,
      southaven: PROPERTIES_SOUTHAVEN,
      nashville: PROPERTIES_NASHVILLE,
      atlanta: PROPERTIES_ATLANTA,
      chicago: PROPERTIES_CHICAGO,
      new_york: PROPERTIES_NEWYORK,
      los_angeles: PROPERTIES_LOSANGELES,
      miami: PROPERTIES_MIAMI,
      houston: PROPERTIES_HOUSTON,
      dallas: PROPERTIES_DALLAS,
      phoenix: PROPERTIES_PHOENIX,
      london: PROPERTIES_INTERNATIONAL.filter(p => p.city === 'london'),
      tokyo: PROPERTIES_INTERNATIONAL.filter(p => p.city === 'tokyo'),
      paris: PROPERTIES_INTERNATIONAL.filter(p => p.city === 'paris'),
      dubai: PROPERTIES_INTERNATIONAL.filter(p => p.city === 'dubai'),
      berlin: PROPERTIES_INTERNATIONAL.filter(p => p.city === 'berlin'),
    };
    const base = listings[city as keyof typeof listings] || [];
    return [...base, ...PROPERTIES_EXPANSION.filter(p => p.city === city)];
  }
  
  getListingById(id: string): PropertyListing | undefined {
    return this.getAllListings().find(p => p.id === id);
  }
  
  private getTypeEconomics(type: PropertyType, price: number, rentalPotential: number): { rentalIncome: number; maintenanceCost: number; conditionDecay: number } {
    switch (type) {
      case 'luxury_penthouse':
        return { rentalIncome: Math.floor(rentalPotential * 1.2), maintenanceCost: Math.floor(price * 0.015 / 12), conditionDecay: 1 };
      case 'offshore_villa':
        return { rentalIncome: Math.floor(rentalPotential * 1.15), maintenanceCost: Math.floor(price * 0.012 / 12), conditionDecay: 1 };
      case 'vacation_rental':
        return { rentalIncome: rentalPotential, maintenanceCost: Math.floor(price * 0.01 / 12), conditionDecay: 2 };
      case 'warehouse':
        return { rentalIncome: rentalPotential, maintenanceCost: Math.floor(price * 0.008 / 12), conditionDecay: 1 };
      case 'farmland':
        return { rentalIncome: Math.floor(rentalPotential * 0.7), maintenanceCost: Math.floor(price * 0.003 / 12), conditionDecay: 0 };
      default:
        return { rentalIncome: rentalPotential, maintenanceCost: Math.floor(price * 0.01 / 12), conditionDecay: 1 };
    }
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
    const economics = this.getTypeEconomics(listing.type, listing.price, listing.rentalPotential);
    const property: Property = {
      id: `owned_${listing.id}_${Date.now()}`,
      name: listing.name,
      type: listing.type,
      city: listing.city,
      district: listing.district,
      purchasePrice: listing.price,
      currentValue: listing.price,
      condition: 100,
      rentalIncome: economics.rentalIncome,
      maintenanceCost: economics.maintenanceCost,
      mortgageRemaining: useMortgage ? listing.price - downPayment : 0,
      mortgagePayment: useMortgage ? Math.floor((listing.price - downPayment) * 0.005) : 0,
      purchasedAt: Date.now(),
      renovationLevel: 0,
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
- Rental Income: $${property.rentalIncome.toLocaleString()}/mo
- Type: ${property.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Location: ${listing.district.replace('_', ' ')}, ${listing.city.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Littlerock', 'Little Rock').replace('New York', 'New York').replace('Los Angeles', 'Los Angeles')}

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
      const economics = this.getTypeEconomics(p.type, p.purchasePrice, p.rentalIncome);
      let volatility = 0.005;
      let trendBias = 0;

      if (p.type === 'luxury_penthouse' || p.type === 'offshore_villa') volatility = 0.012;
      if (p.type === 'warehouse') { volatility = 0.003; trendBias = 0.001; }
      if (p.type === 'farmland') { volatility = 0.004; trendBias = 0.0015; }

      const variance = (Math.random() - 0.5) * volatility;
      const monthlyChange = this.marketTrend + trendBias + variance;
      p.currentValue = Math.floor(p.currentValue * (1 + monthlyChange));

      // Condition degradation (farmland is land, no structural decay)
      const decay = economics.conditionDecay;
      p.condition = Math.max(0, p.condition - decay);

      // Value adjustment for condition
      if (p.condition < 50) {
        p.currentValue = Math.floor(p.currentValue * 0.99);
      }

      // Vacation rentals swing with tourist season
      if (p.type === 'vacation_rental') {

        p.rentalIncome = Math.floor(p.rentalIncome * (0.6 + Math.random() * 0.8));
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

  renovateProperty(property: Property, player: PlayerState): GameAction {
    const level = property.renovationLevel ?? 0;
    if (level >= 5) {
      return { success: false, message: `${property.name} is already fully renovated (Level 5).` };
    }

    const cost = Math.floor(property.purchasePrice * 0.05 * (level + 1));
    if (player.money < cost) {
      return {
        success: false,
        message: `Renovation costs $${cost.toLocaleString()}. You have $${player.money.toLocaleString()}.`,
      };
    }

    player.money -= cost;
    property.renovationLevel = level + 1;
    property.condition = 100;
    const valueBoost = Math.floor(property.purchasePrice * 0.05);
    property.currentValue += valueBoost;
    const incomeBoost = Math.floor(property.purchasePrice * 0.002);
    property.rentalIncome += incomeBoost;

    return {
      success: true,
      message: `🏗️ Renovated ${property.name} to Level ${property.renovationLevel}!\n🔨 Cost: $${cost.toLocaleString()}\n📈 Value boost: +$${valueBoost.toLocaleString()}\n💰 Rent boost: +$${incomeBoost.toLocaleString()}/mo`,
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
