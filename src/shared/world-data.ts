// THE OPEN WORLD — World Data
// Expanded world with global cities and districts

import type { City as CityType, District as DistrictType, Region as RegionType, WeatherCondition } from './types.js';

// Re-export types
export type City = CityType;
export type District = DistrictType;
export type Region = RegionType;

// Re-export CITY_METADATA from types.ts
export { CITY_METADATA } from './types.js';

export interface CityData {
  displayName: string;
  region: Region;
  country: string;
  economicIndex: number; // 0-100, affects job pay
  volatility: number; // 0-100, affects investment risk
  crimeRate: number; // 0-100, affects safety
  costOfLiving: number; // multiplier for expenses
  timezone: string;
  climate: 'tropical' | 'subtropical' | 'temperate' | 'continental' | 'desert' | 'mediterranean';
  modifiers: string[];
  districts: District[];
}

export interface DistrictData {
  city: City;
  displayName: string;
  crimeRate: number;
  communityRepBonus: number;
  jobTypes: string[];
  description: string;
  rentCost: number; // monthly rent for housing
}

export interface TravelRoute {
  from: City;
  to: City;
  distance: number; // miles
  cost: number; // travel cost
  timeHours: number; // travel time
  method: 'bus' | 'train' | 'flight' | 'drive';
}

// === CITY DATA ===

export const WORLD_CITIES: Record<City, CityData> = {
  // MID-SOUTH REGION (Starting)
  memphis: {
    displayName: 'Memphis, TN',
    region: 'mid_south',
    country: 'USA',
    economicIndex: 65,
    volatility: 15,
    crimeRate: 55,
    costOfLiving: 0.85,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['blues_music', 'bbq_capital', 'logistics_hub', 'nightlife'],
    districts: ['downtown', 'midtown', 'south_memphis', 'east_memphis', 'orange_mound', 'cordova', 'bartlett'],
  },
  west_memphis: {
    displayName: 'West Memphis, AR',
    region: 'mid_south',
    country: 'USA',
    economicIndex: 55,
    volatility: 20,
    crimeRate: 60,
    costOfLiving: 0.75,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['small_town', 'truck_stop', 'border_city'],
    districts: ['broadway', 'mississippi_park', 'meadowlake'],
  },
  littlerock: {
    displayName: 'Little Rock, AR',
    region: 'mid_south',
    country: 'USA',
    economicIndex: 75,
    volatility: 8,
    crimeRate: 35,
    costOfLiving: 0.90,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['government_town', 'steady_jobs', 'balanced'],
    districts: ['river_market', 'hillcrest', 'southwest_lr', 'west_lr', 'heights'],
  },
  southaven: {
    displayName: 'Southaven, MS',
    region: 'mid_south',
    country: 'USA',
    economicIndex: 60,
    volatility: 5,
    crimeRate: 25,
    costOfLiving: 0.80,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['family_friendly', 'quiet', 'suburban', 'growing'],
    districts: ['goodman_road', 'snowden', 'church_road'],
  },
  
  // SOUTHEAST US
  nashville: {
    displayName: 'Nashville, TN',
    region: 'southeast',
    country: 'USA',
    economicIndex: 80,
    volatility: 12,
    crimeRate: 40,
    costOfLiving: 1.05,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['music_city', 'healthcare_hub', 'growing_fast', 'bachelorette_capital'],
    districts: ['music_row', 'downtown_nash', 'east_nash', 'germantown_nash'],
  },
  atlanta: {
    displayName: 'Atlanta, GA',
    region: 'southeast',
    country: 'USA',
    economicIndex: 85,
    volatility: 10,
    crimeRate: 45,
    costOfLiving: 1.00,
    timezone: 'America/New_York',
    climate: 'subtropical',
    modifiers: ['black_excellence', 'hip_hop_capital', 'corporate_hub', 'airport_city'],
    districts: ['buckhead', 'midtown_atl', 'downtown_atl', 'west_end'],
  },
  new_orleans: {
    displayName: 'New Orleans, LA',
    region: 'southeast',
    country: 'USA',
    economicIndex: 70,
    volatility: 25,
    crimeRate: 70,
    costOfLiving: 0.95,
    timezone: 'America/Chicago',
    climate: 'tropical',
    modifiers: ['party_city', 'jazz_birthplace', 'hurricane_zone', 'tourism_heavy'],
    districts: ['french_quarter', 'garden_district', 'marigny'],
  },
  miami: {
    displayName: 'Miami, FL',
    region: 'southeast',
    country: 'USA',
    economicIndex: 90,
    volatility: 15,
    crimeRate: 50,
    costOfLiving: 1.30,
    timezone: 'America/New_York',
    climate: 'tropical',
    modifiers: ['beach_city', 'latin_influence', 'nightlife', 'crypto_hub', 'hurricane_zone'],
    districts: ['downtown_generic', 'suburbs', 'uptown'],
  },
  charlotte: {
    displayName: 'Charlotte, NC',
    region: 'southeast',
    country: 'USA',
    economicIndex: 82,
    volatility: 8,
    crimeRate: 35,
    costOfLiving: 0.95,
    timezone: 'America/New_York',
    climate: 'subtropical',
    modifiers: ['banking_hub', 'growing_fast', 'clean_city'],
    districts: ['downtown_generic', 'suburbs', 'uptown'],
  },
  
  // NORTHEAST US
  new_york: {
    displayName: 'New York City, NY',
    region: 'northeast',
    country: 'USA',
    economicIndex: 100,
    volatility: 12,
    crimeRate: 45,
    costOfLiving: 1.80,
    timezone: 'America/New_York',
    climate: 'continental',
    modifiers: ['finance_capital', 'culture_hub', 'never_sleeps', 'expensive', 'career_maker'],
    districts: ['manhattan', 'brooklyn', 'queens', 'harlem', 'bronx'],
  },
  chicago: {
    displayName: 'Chicago, IL',
    region: 'midwest',
    country: 'USA',
    economicIndex: 88,
    volatility: 10,
    crimeRate: 55,
    costOfLiving: 1.05,
    timezone: 'America/Chicago',
    climate: 'continental',
    modifiers: ['second_city', 'finance_hub', 'food_scene', 'cold_winters', 'segregated'],
    districts: ['loop', 'south_side', 'wicker_park', 'hyde_park'],
  },
  detroit: {
    displayName: 'Detroit, MI',
    region: 'midwest',
    country: 'USA',
    economicIndex: 50,
    volatility: 30,
    crimeRate: 65,
    costOfLiving: 0.65,
    timezone: 'America/Detroit',
    climate: 'continental',
    modifiers: ['motor_city', 'comeback_city', 'cheap_housing', 'cold_winters', 'music_history'],
    districts: ['downtown_generic', 'industrial', 'suburbs'],
  },
  philly: {
    displayName: 'Philadelphia, PA',
    region: 'northeast',
    country: 'USA',
    economicIndex: 78,
    volatility: 10,
    crimeRate: 50,
    costOfLiving: 1.00,
    timezone: 'America/New_York',
    climate: 'continental',
    modifiers: ['history_city', 'sports_town', 'brotherly_love', 'cheesesteaks'],
    districts: ['downtown_generic', 'suburbs', 'uptown'],
  },
  
  // WEST US
  los_angeles: {
    displayName: 'Los Angeles, CA',
    region: 'west',
    country: 'USA',
    economicIndex: 92,
    volatility: 15,
    crimeRate: 50,
    costOfLiving: 1.60,
    timezone: 'America/Los_Angeles',
    climate: 'mediterranean',
    modifiers: ['entertainment_capital', 'traffic_nightmare', 'beach_culture', 'diverse', 'hollywood'],
    districts: ['hollywood', 'venice', 'downtown_la', 'compton', 'beverly_hills'],
  },
  vegas: {
    displayName: 'Las Vegas, NV',
    region: 'west',
    country: 'USA',
    economicIndex: 75,
    volatility: 35,
    crimeRate: 45,
    costOfLiving: 0.90,
    timezone: 'America/Los_Angeles',
    climate: 'desert',
    modifiers: ['gambling_paradise', 'entertainment', '24_hour_city', 'transient_population'],
    districts: ['downtown_generic', 'suburbs'],
  },
  houston: {
    displayName: 'Houston, TX',
    region: 'southwest',
    country: 'USA',
    economicIndex: 85,
    volatility: 12,
    crimeRate: 50,
    costOfLiving: 0.85,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['oil_capital', 'space_city', 'diverse', 'no_zoning', 'hurricane_zone'],
    districts: ['downtown_generic', 'suburbs', 'industrial'],
  },
  dallas: {
    displayName: 'Dallas, TX',
    region: 'southwest',
    country: 'USA',
    economicIndex: 88,
    volatility: 10,
    crimeRate: 45,
    costOfLiving: 0.90,
    timezone: 'America/Chicago',
    climate: 'subtropical',
    modifiers: ['corporate_hub', 'tech_growing', 'sports_town', 'sprawling'],
    districts: ['downtown_generic', 'suburbs', 'uptown'],
  },
  phoenix: {
    displayName: 'Phoenix, AZ',
    region: 'southwest',
    country: 'USA',
    economicIndex: 75,
    volatility: 8,
    crimeRate: 40,
    costOfLiving: 0.85,
    timezone: 'America/Phoenix',
    climate: 'desert',
    modifiers: ['retirement_hub', 'hot_summers', 'sprawling', 'growing_fast'],
    districts: ['downtown_generic', 'suburbs'],
  },
  seattle: {
    displayName: 'Seattle, WA',
    region: 'west',
    country: 'USA',
    economicIndex: 95,
    volatility: 10,
    crimeRate: 45,
    costOfLiving: 1.45,
    timezone: 'America/Los_Angeles',
    climate: 'mediterranean',
    modifiers: ['tech_hub', 'coffee_capital', 'rainy', 'outdoor_culture', 'expensive'],
    districts: ['downtown_generic', 'suburbs', 'industrial'],
  },
  
  // INTERNATIONAL
  london: {
    displayName: 'London, UK',
    region: 'international',
    country: 'UK',
    economicIndex: 95,
    volatility: 12,
    crimeRate: 35,
    costOfLiving: 1.70,
    timezone: 'Europe/London',
    climate: 'temperate',
    modifiers: ['finance_capital', 'history', 'diverse', 'expensive', 'pubs'],
    districts: ['camden', 'soho', 'shoreditch', 'westminster'],
  },
  tokyo: {
    displayName: 'Tokyo, Japan',
    region: 'international',
    country: 'Japan',
    economicIndex: 98,
    volatility: 5,
    crimeRate: 15,
    costOfLiving: 1.50,
    timezone: 'Asia/Tokyo',
    climate: 'temperate',
    modifiers: ['tech_advanced', 'safe', 'work_culture', 'anime_capital', 'food_paradise'],
    districts: ['shibuya', 'shinjuku', 'roppongi', 'akihabara'],
  },
  paris: {
    displayName: 'Paris, France',
    region: 'international',
    country: 'France',
    economicIndex: 90,
    volatility: 8,
    crimeRate: 40,
    costOfLiving: 1.55,
    timezone: 'Europe/Paris',
    climate: 'temperate',
    modifiers: ['fashion_capital', 'art_history', 'romantic', 'strikes', 'food_culture'],
    districts: ['marais', 'montmartre', 'latin_quarter', 'champs_elysees'],
  },
  berlin: {
    displayName: 'Berlin, Germany',
    region: 'international',
    country: 'Germany',
    economicIndex: 85,
    volatility: 5,
    crimeRate: 30,
    costOfLiving: 1.10,
    timezone: 'Europe/Berlin',
    climate: 'temperate',
    modifiers: ['tech_startup', 'nightlife', 'history', 'artistic', 'affordable_europe'],
    districts: ['kreuzberg', 'mitte', 'neukolln', 'prenzlauer_berg'],
  },
  dubai: {
    displayName: 'Dubai, UAE',
    region: 'international',
    country: 'UAE',
    economicIndex: 92,
    volatility: 20,
    crimeRate: 10,
    costOfLiving: 1.30,
    timezone: 'Asia/Dubai',
    climate: 'desert',
    modifiers: ['luxury', 'tax_free', 'expat_hub', 'extreme_heat', 'modern'],
    districts: ['dubai_marina', 'downtown_dubai', 'palm_jumeirah', 'deira'],
  },
  mexico_city: {
    displayName: 'Mexico City, Mexico',
    region: 'international',
    country: 'Mexico',
    economicIndex: 70,
    volatility: 25,
    crimeRate: 55,
    costOfLiving: 0.60,
    timezone: 'America/Mexico_City',
    climate: 'subtropical',
    modifiers: ['food_paradise', 'traffic', 'history', 'diverse', 'pollution'],
    districts: ['condesa', 'polanco', 'coyoacan', 'zocalo'],
  },
  toronto: {
    displayName: 'Toronto, Canada',
    region: 'international',
    country: 'Canada',
    economicIndex: 88,
    volatility: 8,
    crimeRate: 25,
    costOfLiving: 1.20,
    timezone: 'America/Toronto',
    climate: 'continental',
    modifiers: ['diverse', 'polite', 'cold_winters', 'finance_hub', 'clean'],
    districts: ['distillery_district', 'entertainment_district', 'kensington_market', 'yorkville'],
  },
  sydney: {
    displayName: 'Sydney, Australia',
    region: 'international',
    country: 'Australia',
    economicIndex: 90,
    volatility: 10,
    crimeRate: 30,
    costOfLiving: 1.40,
    timezone: 'Australia/Sydney',
    climate: 'subtropical',
    modifiers: ['beach_city', 'outdoor_lifestyle', 'expensive', 'work_life_balance'],
    districts: ['the_rocks', 'darling_harbour', 'surry_hills', 'bondi'],
  },
};

// === DISTRICT DATA ===

export const WORLD_DISTRICTS: Record<District, DistrictData> = {
  // Memphis Districts
  downtown: {
    city: 'memphis',
    displayName: 'Downtown Memphis',
    crimeRate: 65,
    communityRepBonus: 0,
    jobTypes: ['tourism', 'hospitality', 'nightlife', 'finance'],
    description: 'Beale Street, blues clubs, and riverfront tourism.',
    rentCost: 1200,
  },
  midtown: {
    city: 'memphis',
    displayName: 'Midtown',
    crimeRate: 40,
    communityRepBonus: 10,
    jobTypes: ['creative', 'service', 'retail', 'healthcare'],
    description: 'Cooper-Young, Overton Square, artsy vibes.',
    rentCost: 950,
  },
  south_memphis: {
    city: 'memphis',
    displayName: 'South Memphis',
    crimeRate: 80,
    communityRepBonus: -5,
    jobTypes: ['labor', 'service', 'manufacturing'],
    description: 'Historic neighborhood, high-risk but strong community roots.',
    rentCost: 650,
  },
  east_memphis: {
    city: 'memphis',
    displayName: 'East Memphis',
    crimeRate: 20,
    communityRepBonus: 5,
    jobTypes: ['corporate', 'professional', 'retail', 'healthcare'],
    description: 'Corporate offices, upscale malls, suburban feel.',
    rentCost: 1400,
  },
  orange_mound: {
    city: 'memphis',
    displayName: 'Orange Mound',
    crimeRate: 50,
    communityRepBonus: 20,
    jobTypes: ['service', 'small_business', 'education'],
    description: 'Historic Black community, strong cultural pride.',
    rentCost: 700,
  },
  cordova: {
    city: 'memphis',
    displayName: 'Cordova',
    crimeRate: 25,
    communityRepBonus: 5,
    jobTypes: ['retail', 'service', 'warehouse'],
    description: 'Suburban growth area, family-friendly.',
    rentCost: 1100,
  },
  bartlett: {
    city: 'memphis',
    displayName: 'Bartlett',
    crimeRate: 18,
    communityRepBonus: 10,
    jobTypes: ['service', 'retail', 'education'],
    description: 'Quiet suburb, good schools.',
    rentCost: 1200,
  },
  
  // West Memphis Districts
  broadway: {
    city: 'west_memphis',
    displayName: 'Broadway District',
    crimeRate: 55,
    communityRepBonus: 0,
    jobTypes: ['service', 'retail', 'truck_stop'],
    description: 'Main commercial strip, trucker traffic.',
    rentCost: 600,
  },
  mississippi_park: {
    city: 'west_memphis',
    displayName: 'Mississippi Park',
    crimeRate: 45,
    communityRepBonus: 5,
    jobTypes: ['service', 'industrial'],
    description: 'Near the river, industrial jobs.',
    rentCost: 550,
  },
  meadowlake: {
    city: 'west_memphis',
    displayName: 'Meadowlake',
    crimeRate: 35,
    communityRepBonus: 10,
    jobTypes: ['service', 'retail'],
    description: 'Quieter residential area.',
    rentCost: 700,
  },
  
  // Little Rock Districts
  river_market: {
    city: 'littlerock',
    displayName: 'River Market District',
    crimeRate: 30,
    communityRepBonus: 15,
    jobTypes: ['hospitality', 'service', 'tourism', 'government'],
    description: 'Restaurants, farmers market, Clinton Library.',
    rentCost: 1300,
  },
  hillcrest: {
    city: 'littlerock',
    displayName: 'Hillcrest',
    crimeRate: 25,
    communityRepBonus: 10,
    jobTypes: ['professional', 'service', 'healthcare'],
    description: 'Young professionals, walkable neighborhood.',
    rentCost: 1100,
  },
  southwest_lr: {
    city: 'littlerock',
    displayName: 'Southwest Little Rock',
    crimeRate: 45,
    communityRepBonus: 5,
    jobTypes: ['blue_collar', 'industrial', 'service'],
    description: 'Diverse working-class area.',
    rentCost: 750,
  },
  west_lr: {
    city: 'littlerock',
    displayName: 'West Little Rock',
    crimeRate: 15,
    communityRepBonus: 0,
    jobTypes: ['corporate', 'professional', 'healthcare'],
    description: 'Affluent suburbs, corporate offices.',
    rentCost: 1500,
  },
  heights: {
    city: 'littlerock',
    displayName: 'The Heights',
    crimeRate: 20,
    communityRepBonus: 8,
    jobTypes: ['professional', 'service', 'retail'],
    description: 'Upscale shopping and dining.',
    rentCost: 1400,
  },
  
  // Southaven Districts
  goodman_road: {
    city: 'southaven',
    displayName: 'Goodman Road Corridor',
    crimeRate: 35,
    communityRepBonus: 5,
    jobTypes: ['retail', 'service', 'warehouse'],
    description: 'Main retail strip, new development.',
    rentCost: 950,
  },
  snowden: {
    city: 'southaven',
    displayName: 'Snowden District',
    crimeRate: 20,
    communityRepBonus: 15,
    jobTypes: ['service', 'education', 'healthcare'],
    description: 'Family-friendly, good schools.',
    rentCost: 1100,
  },
  church_road: {
    city: 'southaven',
    displayName: 'Church Road Area',
    crimeRate: 25,
    communityRepBonus: 10,
    jobTypes: ['service', 'retail', 'small_business'],
    description: 'Growing residential area.',
    rentCost: 1000,
  },
  
  // Nashville Districts
  music_row: {
    city: 'nashville',
    displayName: 'Music Row',
    crimeRate: 30,
    communityRepBonus: 10,
    jobTypes: ['entertainment', 'music', 'creative', 'tech'],
    description: 'Heart of the music industry.',
    rentCost: 1600,
  },
  downtown_nash: {
    city: 'nashville',
    displayName: 'Downtown Nashville',
    crimeRate: 45,
    communityRepBonus: 0,
    jobTypes: ['tourism', 'hospitality', 'nightlife', 'entertainment'],
    description: 'Broadway honky-tonks, bachelorette parties.',
    rentCost: 2000,
  },
  east_nash: {
    city: 'nashville',
    displayName: 'East Nashville',
    crimeRate: 40,
    communityRepBonus: 15,
    jobTypes: ['creative', 'service', 'food_service', 'small_business'],
    description: 'Hipster paradise, gentrifying fast.',
    rentCost: 1400,
  },
  germantown_nash: {
    city: 'nashville',
    displayName: 'Germantown',
    crimeRate: 25,
    communityRepBonus: 10,
    jobTypes: ['professional', 'service', 'food_service'],
    description: 'Historic neighborhood, trendy restaurants.',
    rentCost: 1700,
  },
  
  // Atlanta Districts
  buckhead: {
    city: 'atlanta',
    displayName: 'Buckhead',
    crimeRate: 30,
    communityRepBonus: 0,
    jobTypes: ['corporate', 'finance', 'luxury_retail', 'hospitality'],
    description: 'Upscale shopping and corporate HQs.',
    rentCost: 2200,
  },
  midtown_atl: {
    city: 'atlanta',
    displayName: 'Midtown Atlanta',
    crimeRate: 35,
    communityRepBonus: 10,
    jobTypes: ['tech', 'professional', 'creative', 'healthcare'],
    description: 'Tech hub, Piedmont Park, arts district.',
    rentCost: 1900,
  },
  downtown_atl: {
    city: 'atlanta',
    displayName: 'Downtown Atlanta',
    crimeRate: 50,
    communityRepBonus: 5,
    jobTypes: ['corporate', 'government', 'hospitality', 'entertainment'],
    description: 'Business district, CNN Center, sports venues.',
    rentCost: 1500,
  },
  west_end: {
    city: 'atlanta',
    displayName: 'West End',
    crimeRate: 55,
    communityRepBonus: 20,
    jobTypes: ['service', 'small_business', 'education'],
    description: 'Historic Black neighborhood, cultural center.',
    rentCost: 900,
  },
  
  // New Orleans Districts
  french_quarter: {
    city: 'new_orleans',
    displayName: 'French Quarter',
    crimeRate: 60,
    communityRepBonus: 5,
    jobTypes: ['tourism', 'hospitality', 'nightlife', 'entertainment'],
    description: 'Historic heart, parties never stop.',
    rentCost: 1800,
  },
  garden_district: {
    city: 'new_orleans',
    displayName: 'Garden District',
    crimeRate: 35,
    communityRepBonus: 10,
    jobTypes: ['professional', 'service', 'tourism'],
    description: 'Historic mansions, streetcars.',
    rentCost: 2000,
  },
  marigny: {
    city: 'new_orleans',
    displayName: 'Marigny',
    crimeRate: 45,
    communityRepBonus: 15,
    jobTypes: ['creative', 'music', 'service', 'nightlife'],
    description: 'Music clubs, bohemian vibes.',
    rentCost: 1200,
  },
  
  // NYC Districts
  manhattan: {
    city: 'new_york',
    displayName: 'Manhattan',
    crimeRate: 40,
    communityRepBonus: 0,
    jobTypes: ['finance', 'corporate', 'tech', 'media', 'luxury_retail'],
    description: 'The center of the world. Expensive but career-defining.',
    rentCost: 4000,
  },
  brooklyn: {
    city: 'new_york',
    displayName: 'Brooklyn',
    crimeRate: 45,
    communityRepBonus: 10,
    jobTypes: ['tech', 'creative', 'startup', 'service'],
    description: 'Hip, diverse, gentrifying, tech hub.',
    rentCost: 2800,
  },
  queens: {
    city: 'new_york',
    displayName: 'Queens',
    crimeRate: 40,
    communityRepBonus: 15,
    jobTypes: ['service', 'retail', 'airport', 'small_business'],
    description: 'Most diverse place in America.',
    rentCost: 2200,
  },
  harlem: {
    city: 'new_york',
    displayName: 'Harlem',
    crimeRate: 50,
    communityRepBonus: 20,
    jobTypes: ['service', 'education', 'creative', 'small_business'],
    description: 'Historic Black cultural center, gentrifying.',
    rentCost: 2000,
  },
  bronx: {
    city: 'new_york',
    displayName: 'The Bronx',
    crimeRate: 55,
    communityRepBonus: 10,
    jobTypes: ['service', 'healthcare', 'industrial'],
    description: 'Working-class borough, hip-hop birthplace.',
    rentCost: 1600,
  },
  
  // LA Districts
  hollywood: {
    city: 'los_angeles',
    displayName: 'Hollywood',
    crimeRate: 45,
    communityRepBonus: 5,
    jobTypes: ['entertainment', 'creative', 'service', 'nightlife'],
    description: 'Movie industry, dreams, tourists.',
    rentCost: 2400,
  },
  venice: {
    city: 'los_angeles',
    displayName: 'Venice Beach',
    crimeRate: 50,
    communityRepBonus: 10,
    jobTypes: ['creative', 'tech', 'service', 'fitness'],
    description: 'Beach life, tech bros, skaters.',
    rentCost: 2800,
  },
  downtown_la: {
    city: 'los_angeles',
    displayName: 'Downtown LA',
    crimeRate: 55,
    communityRepBonus: 0,
    jobTypes: ['corporate', 'finance', 'creative', 'government'],
    description: 'Revitalizing, arts district, Skid Row nearby.',
    rentCost: 2200,
  },
  compton: {
    city: 'los_angeles',
    displayName: 'Compton',
    crimeRate: 70,
    communityRepBonus: 20,
    jobTypes: ['service', 'manufacturing', 'small_business'],
    description: 'Historic hip-hop hub, working-class.',
    rentCost: 1400,
  },
  beverly_hills: {
    city: 'los_angeles',
    displayName: 'Beverly Hills',
    crimeRate: 15,
    communityRepBonus: -5,
    jobTypes: ['luxury_retail', 'entertainment', 'finance', 'professional'],
    description: 'Wealthiest zip code, celebrity homes.',
    rentCost: 5000,
  },
  
  // Chicago Districts
  loop: {
    city: 'chicago',
    displayName: 'The Loop',
    crimeRate: 40,
    communityRepBonus: 0,
    jobTypes: ['finance', 'corporate', 'government', 'professional'],
    description: 'Downtown business district, skyscrapers.',
    rentCost: 2500,
  },
  south_side: {
    city: 'chicago',
    displayName: 'South Side',
    crimeRate: 70,
    communityRepBonus: 15,
    jobTypes: ['service', 'education', 'healthcare', 'manufacturing'],
    description: 'Historic Black neighborhoods, deep history.',
    rentCost: 1100,
  },
  wicker_park: {
    city: 'chicago',
    displayName: 'Wicker Park',
    crimeRate: 35,
    communityRepBonus: 10,
    jobTypes: ['creative', 'tech', 'service', 'food_service'],
    description: 'Hipster paradise, music scene.',
    rentCost: 1800,
  },
  hyde_park: {
    city: 'chicago',
    displayName: 'Hyde Park',
    crimeRate: 40,
    communityRepBonus: 15,
    jobTypes: ['education', 'research', 'healthcare', 'professional'],
    description: 'University of Chicago, intellectual hub.',
    rentCost: 1600,
  },
  
  // London Districts
  camden: {
    city: 'london',
    displayName: 'Camden',
    crimeRate: 35,
    communityRepBonus: 15,
    jobTypes: ['creative', 'music', 'service', 'retail'],
    description: 'Alternative culture, markets, music venues.',
    rentCost: 2200,
  },
  soho: {
    city: 'london',
    displayName: 'Soho',
    crimeRate: 40,
    communityRepBonus: 5,
    jobTypes: ['media', 'entertainment', 'hospitality', 'creative'],
    description: 'Entertainment district, nightlife hub.',
    rentCost: 3500,
  },
  shoreditch: {
    city: 'london',
    displayName: 'Shoreditch',
    crimeRate: 35,
    communityRepBonus: 10,
    jobTypes: ['tech', 'startup', 'creative', 'finance'],
    description: 'Tech startup hub, street art, gentrified.',
    rentCost: 2800,
  },
  westminster: {
    city: 'london',
    displayName: 'Westminster',
    crimeRate: 30,
    communityRepBonus: 0,
    jobTypes: ['government', 'finance', 'professional', 'luxury_retail'],
    description: 'Political heart, Buckingham Palace, expensive.',
    rentCost: 4000,
  },
  
  // Tokyo Districts
  shibuya: {
    city: 'tokyo',
    displayName: 'Shibuya',
    crimeRate: 15,
    communityRepBonus: 10,
    jobTypes: ['tech', 'retail', 'entertainment', 'creative'],
    description: 'Fashion capital, famous crossing, youth culture.',
    rentCost: 2500,
  },
  shinjuku: {
    city: 'tokyo',
    displayName: 'Shinjuku',
    crimeRate: 20,
    communityRepBonus: 5,
    jobTypes: ['corporate', 'government', 'hospitality', 'nightlife'],
    description: 'Business district, nightlife, busiest station.',
    rentCost: 2200,
  },
  roppongi: {
    city: 'tokyo',
    displayName: 'Roppongi',
    crimeRate: 25,
    communityRepBonus: 0,
    jobTypes: ['finance', 'nightlife', 'hospitality', 'expat'],
    description: 'Expat hub, nightlife, expensive.',
    rentCost: 3500,
  },
  akihabara: {
    city: 'tokyo',
    displayName: 'Akihabara',
    crimeRate: 10,
    communityRepBonus: 15,
    jobTypes: ['tech', 'retail', 'gaming'],
    description: 'Anime capital and electronic wonderland.',
    rentCost: 1600,
  },
  
  // Paris Districts
  marais: {
    city: 'paris',
    displayName: 'Le Marais',
    crimeRate: 30,
    communityRepBonus: 10,
    jobTypes: ['fashion', 'creative', 'tourism'],
    description: 'Historic district with cobblestone streets and trendy boutiques.',
    rentCost: 2200,
  },
  montmartre: {
    city: 'paris',
    displayName: 'Montmartre',
    crimeRate: 40,
    communityRepBonus: 15,
    jobTypes: ['art', 'tourism', 'hospitality'],
    description: 'The bohemian heart of Paris, famous for its artists and the Sacré-Cœur.',
    rentCost: 1800,
  },
  latin_quarter: {
    city: 'paris',
    displayName: 'Latin Quarter',
    crimeRate: 25,
    communityRepBonus: 20,
    jobTypes: ['education', 'creative', 'retail'],
    description: 'Student-filled neighborhood home to the Sorbonne and historic bookshops.',
    rentCost: 1900,
  },
  champs_elysees: {
    city: 'paris',
    displayName: 'Champs-Élysées',
    crimeRate: 35,
    communityRepBonus: 0,
    jobTypes: ['luxury_retail', 'finance', 'tourism'],
    description: 'The most beautiful avenue in the world, lined with luxury shops.',
    rentCost: 4500,
  },
  
  // Berlin Districts
  kreuzberg: {
    city: 'berlin',
    displayName: 'Kreuzberg',
    crimeRate: 45,
    communityRepBonus: 20,
    jobTypes: ['creative', 'nightlife', 'service'],
    description: 'Alternative culture, street art, and legendary nightlife.',
    rentCost: 1100,
  },
  mitte: {
    city: 'berlin',
    displayName: 'Mitte',
    crimeRate: 30,
    communityRepBonus: 5,
    jobTypes: ['tech', 'government', 'professional'],
    description: 'The historic and commercial center of reunited Berlin.',
    rentCost: 1600,
  },
  neukolln: {
    city: 'berlin',
    displayName: 'Neukölln',
    crimeRate: 50,
    communityRepBonus: 15,
    jobTypes: ['creative', 'service', 'retail'],
    description: 'A vibrant, multicultural district that has become a hipster hub.',
    rentCost: 950,
  },
  prenzlauer_berg: {
    city: 'berlin',
    displayName: 'Prenzlauer Berg',
    crimeRate: 20,
    communityRepBonus: 10,
    jobTypes: ['professional', 'service', 'education'],
    description: 'Post-wall success story, now a leafy neighborhood for families.',
    rentCost: 1400,
  },
  
  // Dubai Districts
  dubai_marina: {
    city: 'dubai',
    displayName: 'Dubai Marina',
    crimeRate: 10,
    communityRepBonus: 5,
    jobTypes: ['tourism', 'hospitality', 'real_estate'],
    description: 'A luxury residential area with high-rise apartments and a man-made canal.',
    rentCost: 3500,
  },
  downtown_dubai: {
    city: 'dubai',
    displayName: 'Downtown Dubai',
    crimeRate: 15,
    communityRepBonus: 0,
    jobTypes: ['finance', 'corporate', 'luxury_retail'],
    description: 'Home to the Burj Khalifa and the Dubai Mall.',
    rentCost: 4000,
  },
  palm_jumeirah: {
    city: 'dubai',
    displayName: 'Palm Jumeirah',
    crimeRate: 5,
    communityRepBonus: 5,
    jobTypes: ['hospitality', 'luxury_service'],
    description: 'The world-famous tree-shaped artificial island.',
    rentCost: 6000,
  },
  deira: {
    city: 'dubai',
    displayName: 'Deira',
    crimeRate: 35,
    communityRepBonus: 15,
    jobTypes: ['trade', 'service', 'retail'],
    description: 'Old Dubai, known for its gold and spice souks.',
    rentCost: 1200,
  },
  
  // Mexico City Districts
  condesa: {
    city: 'mexico_city',
    displayName: 'La Condesa',
    crimeRate: 30,
    communityRepBonus: 15,
    jobTypes: ['creative', 'hospitality', 'professional'],
    description: 'Charming neighborhood with Art Deco buildings and vibrant parks.',
    rentCost: 1500,
  },
  polanco: {
    city: 'mexico_city',
    displayName: 'Polanco',
    crimeRate: 20,
    communityRepBonus: 0,
    jobTypes: ['finance', 'luxury_retail', 'corporate'],
    description: 'The most prestigious residential and commercial area in the city.',
    rentCost: 2800,
  },
  coyoacan: {
    city: 'mexico_city',
    displayName: 'Coyoacán',
    crimeRate: 25,
    communityRepBonus: 20,
    jobTypes: ['art', 'education', 'tourism'],
    description: 'Bohemian neighborhood with a colonial feel, home to Frida Kahlo.',
    rentCost: 1200,
  },
  zocalo: {
    city: 'mexico_city',
    displayName: 'Zócalo',
    crimeRate: 45,
    communityRepBonus: 10,
    jobTypes: ['government', 'trade', 'tourism'],
    description: 'The massive main square, surrounded by historic cathedrals and palaces.',
    rentCost: 900,
  },
  
  // Toronto Districts
  distillery_district: {
    city: 'toronto',
    displayName: 'Distillery District',
    crimeRate: 20,
    communityRepBonus: 10,
    jobTypes: ['creative', 'tourism', 'retail'],
    description: 'Pedestrian-only area with Victorian industrial architecture.',
    rentCost: 2500,
  },
  entertainment_district: {
    city: 'toronto',
    displayName: 'Entertainment District',
    crimeRate: 35,
    communityRepBonus: 5,
    jobTypes: ['media', 'nightlife', 'hospitality'],
    description: 'The hub of Toronto’s arts and nightlife scene.',
    rentCost: 2800,
  },
  kensington_market: {
    city: 'toronto',
    displayName: 'Kensington Market',
    crimeRate: 40,
    communityRepBonus: 20,
    jobTypes: ['creative', 'retail', 'service'],
    description: 'One of the city’s most diverse and eclectic neighborhoods.',
    rentCost: 1800,
  },
  yorkville: {
    city: 'toronto',
    displayName: 'Yorkville',
    crimeRate: 15,
    communityRepBonus: 5,
    jobTypes: ['luxury_retail', 'professional', 'finance'],
    description: 'A high-end neighborhood known for its designer boutiques.',
    rentCost: 3500,
  },
  
  // Sydney Districts
  the_rocks: {
    city: 'sydney',
    displayName: 'The Rocks',
    crimeRate: 25,
    communityRepBonus: 10,
    jobTypes: ['tourism', 'hospitality', 'history'],
    description: 'Historic area with colonial buildings and views of the Opera House.',
    rentCost: 3000,
  },
  darling_harbour: {
    city: 'sydney',
    displayName: 'Darling Harbour',
    crimeRate: 30,
    communityRepBonus: 5,
    jobTypes: ['tourism', 'entertainment', 'hospitality'],
    description: 'Waterfront destination for shopping, dining, and nightlife.',
    rentCost: 3200,
  },
  surry_hills: {
    city: 'sydney',
    displayName: 'Surry Hills',
    crimeRate: 35,
    communityRepBonus: 15,
    jobTypes: ['creative', 'tech', 'food_service'],
    description: 'Trendy inner-city suburb known for its fashion and dining scene.',
    rentCost: 2400,
  },
  bondi: {
    city: 'sydney',
    displayName: 'Bondi',
    crimeRate: 25,
    communityRepBonus: 10,
    jobTypes: ['fitness', 'tourism', 'hospitality'],
    description: 'Home to one of the most famous beaches in the world.',
    rentCost: 2800,
  },
  
  // Generic Districts
  downtown_generic: {
    city: 'memphis',
    displayName: 'Downtown',
    crimeRate: 45,
    communityRepBonus: 5,
    jobTypes: ['corporate', 'service', 'retail', 'government'],
    description: 'City center, business and commerce.',
    rentCost: 1200,
  },
  suburbs: {
    city: 'memphis',
    displayName: 'Suburbs',
    crimeRate: 25,
    communityRepBonus: 10,
    jobTypes: ['service', 'retail', 'education', 'healthcare'],
    description: 'Family-friendly residential area.',
    rentCost: 1000,
  },
  industrial: {
    city: 'memphis',
    displayName: 'Industrial District',
    crimeRate: 50,
    communityRepBonus: 0,
    jobTypes: ['manufacturing', 'warehouse', 'logistics', 'labor'],
    description: 'Factories, warehouses, blue-collar jobs.',
    rentCost: 700,
  },
  uptown: {
    city: 'memphis',
    displayName: 'Uptown',
    crimeRate: 30,
    communityRepBonus: 10,
    jobTypes: ['professional', 'retail', 'service', 'hospitality'],
    description: 'Upscale shopping and dining.',
    rentCost: 1500,
  },
};

// === TRAVEL SYSTEM ===

export const TRAVEL_ROUTES: TravelRoute[] = [
  // Mid-South Regional (Bus/Drive)
  { from: 'west_memphis', to: 'memphis', distance: 10, cost: 15, timeHours: 0.5, method: 'drive' },
  { from: 'west_memphis', to: 'southaven', distance: 15, cost: 20, timeHours: 0.5, method: 'drive' },
  { from: 'west_memphis', to: 'littlerock', distance: 135, cost: 35, timeHours: 2.5, method: 'bus' },
  { from: 'memphis', to: 'nashville', distance: 210, cost: 45, timeHours: 3.5, method: 'bus' },
  { from: 'memphis', to: 'atlanta', distance: 380, cost: 75, timeHours: 6, method: 'bus' },
  { from: 'memphis', to: 'new_orleans', distance: 390, cost: 65, timeHours: 6, method: 'bus' },
  
  // Major City Flights
  { from: 'memphis', to: 'new_york', distance: 950, cost: 250, timeHours: 3, method: 'flight' },
  { from: 'memphis', to: 'los_angeles', distance: 1800, cost: 300, timeHours: 4.5, method: 'flight' },
  { from: 'memphis', to: 'chicago', distance: 530, cost: 150, timeHours: 1.5, method: 'flight' },
  { from: 'memphis', to: 'miami', distance: 1000, cost: 200, timeHours: 2.5, method: 'flight' },
  { from: 'memphis', to: 'vegas', distance: 1500, cost: 250, timeHours: 3.5, method: 'flight' },
  
  // International Flights (from major hubs)
  { from: 'new_york', to: 'london', distance: 3450, cost: 600, timeHours: 7, method: 'flight' },
  { from: 'new_york', to: 'paris', distance: 3600, cost: 650, timeHours: 7.5, method: 'flight' },
  { from: 'new_york', to: 'tokyo', distance: 6700, cost: 1200, timeHours: 14, method: 'flight' },
  { from: 'los_angeles', to: 'tokyo', distance: 5500, cost: 900, timeHours: 11, method: 'flight' },
  { from: 'los_angeles', to: 'sydney', distance: 7500, cost: 1500, timeHours: 15, method: 'flight' },
  { from: 'miami', to: 'mexico_city', distance: 1200, cost: 250, timeHours: 3, method: 'flight' },
  { from: 'chicago', to: 'toronto', distance: 500, cost: 200, timeHours: 1.5, method: 'flight' },
  { from: 'london', to: 'dubai', distance: 3400, cost: 500, timeHours: 7, method: 'flight' },
  { from: 'london', to: 'berlin', distance: 580, cost: 150, timeHours: 1.5, method: 'flight' },
];

// Helper to get travel options from current city
export function getTravelOptions(fromCity: City): TravelRoute[] {
  return TRAVEL_ROUTES.filter(r => r.from === fromCity);
}

// Helper to get region for a city
export function getCityRegion(city: City): Region {
  return WORLD_CITIES[city]?.region || 'mid_south';
}

// Helper to get cities by region
export function getCitiesByRegion(region: Region): City[] {
  return Object.entries(WORLD_CITIES)
    .filter(([_, data]) => data.region === region)
    .map(([city]) => city as City);
}

// Weather generation by climate
export function generateWeatherByClimate(climate: CityData['climate'], month: number): WeatherCondition {
  const rand = Math.random();
  
  switch (climate) {
    case 'tropical':
      if (month >= 6 && month <= 10) {
        return rand < 0.4 ? 'stormy' : rand < 0.6 ? 'rainy' : 'humid';
      }
      return rand < 0.3 ? 'rainy' : rand < 0.5 ? 'humid' : 'clear';
      
    case 'desert':
      return rand < 0.8 ? 'hot' : 'clear';
      
    case 'continental':
      if (month <= 2 || month >= 11) {
        return rand < 0.5 ? 'snowy' : rand < 0.7 ? 'cold' : 'cloudy';
      }
      if (month >= 6 && month <= 8) {
        return rand < 0.6 ? 'clear' : rand < 0.8 ? 'hot' : 'cloudy';
      }
      return rand < 0.5 ? 'clear' : rand < 0.7 ? 'cloudy' : 'rainy';
      
    case 'mediterranean':
      if (month >= 11 || month <= 3) {
        return rand < 0.5 ? 'rainy' : 'cloudy';
      }
      return rand < 0.8 ? 'clear' : rand < 0.9 ? 'hot' : 'cloudy';
      
    case 'subtropical':
    case 'temperate':
    default:
      if (month <= 2 || month >= 11) {
        return rand < 0.3 ? 'cold' : rand < 0.5 ? 'cloudy' : 'clear';
      }
      if (month >= 6 && month <= 8) {
        return rand < 0.5 ? 'hot' : rand < 0.7 ? 'humid' : 'clear';
      }
      return rand < 0.4 ? 'clear' : rand < 0.6 ? 'cloudy' : 'rainy';
  }
}
