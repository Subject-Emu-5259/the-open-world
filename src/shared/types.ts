// THE OPEN WORLD — Shared Types
// World expanded to include global locations

export type City = 
  // Mid-South (Starting Region)
  | 'memphis' | 'littlerock' | 'southaven' | 'west_memphis'
  // Southeast US
  | 'nashville' | 'atlanta' | 'new_orleans' | 'miami' | 'charlotte'
  // Northeast US
  | 'new_york' | 'chicago' | 'detroit' | 'philly'
  // West US
  | 'los_angeles' | 'vegas' | 'houston' | 'dallas' | 'phoenix' | 'seattle'
  // International
  | 'london' | 'tokyo' | 'paris' | 'berlin' | 'dubai' | 'mexico_city' | 'toronto' | 'sydney';

export type Region = 'mid_south' | 'southeast' | 'northeast' | 'midwest' | 'southwest' | 'west' | 'international';

export type District =
  // Memphis Districts
  | 'downtown' | 'midtown' | 'south_memphis' | 'east_memphis' | 'orange_mound' | 'cordova' | 'bartlett'
  // Little Rock Districts
  | 'river_market' | 'hillcrest' | 'southwest_lr' | 'west_lr' | 'heights'
  // Southaven Districts
  | 'goodman_road' | 'snowden' | 'church_road'
  // West Memphis Districts
  | 'broadway' | 'mississippi_park' | 'meadowlake'
  // Nashville Districts
  | 'music_row' | 'downtown_nash' | 'east_nash' | 'germantown_nash'
  // Atlanta Districts
  | 'buckhead' | 'midtown_atl' | 'downtown_atl' | 'west_end'
  // New Orleans Districts
  | 'french_quarter' | 'garden_district' | 'marigny'
  // NYC Districts
  | 'manhattan' | 'brooklyn' | 'queens' | 'harlem' | 'bronx'
  // LA Districts
  | 'hollywood' | 'venice' | 'downtown_la' | 'compton' | 'beverly_hills'
  // Chicago Districts
  | 'loop' | 'south_side' | 'wicker_park' | 'hyde_park'
  // London Districts
  | 'camden' | 'soho' | 'shoreditch' | 'westminster'
  // Tokyo Districts
  | 'shibuya' | 'shinjuku' | 'roppongi' | 'akihabara'
  // Paris Districts
  | 'marais' | 'montmartre' | 'latin_quarter' | 'champs_elysees'
  // Berlin Districts
  | 'kreuzberg' | 'mitte' | 'neukolln' | 'prenzlauer_berg'
  // Dubai Districts
  | 'dubai_marina' | 'downtown_dubai' | 'palm_jumeirah' | 'deira'
  // Mexico City Districts
  | 'condesa' | 'polanco' | 'coyoacan' | 'zocalo'
  // Toronto Districts
  | 'distillery_district' | 'entertainment_district' | 'kensington_market' | 'yorkville'
  // Sydney Districts
  | 'the_rocks' | 'darling_harbour' | 'surry_hills' | 'bondi'
  // Generic (for cities without specific districts)
  | 'downtown_generic' | 'suburbs' | 'industrial' | 'uptown';

export type Background = 'working_class' | 'student' | 'corporate' | 'hustler' | 'creative' | 'unemployed' | 'service_industry' | 'immigrant' | 'heir' | 'veteran';
export type Trait = 'charisma_trait' | 'discipline' | 'empathy' | 'hustle' | 'intelligence' | 'risk_taking' | 'resilient' | 'ambitious';
export type Perk = 'knows_people' | 'fast_learner' | 'street_smart' | 'reliable_worker' | 'creative_mind' | 'world_traveler' | 'polyglot';
export type JobTier = 'entry' | 'skilled' | 'career' | 'elite' | 'executive';
export type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'hot' | 'cold' | 'snowy' | 'humid' | 'foggy';

export interface PlayerSkills { charisma: number; tech: number; fitness: number; driving: number; cooking: number; craftsmanship: number; finance: number; languages: number; }
export interface Reputation { professional: number; social: number; criminal: number; community: number; }
export interface Job { title: string; employer: string; tier: JobTier; dailyPay: number; skillReq: keyof PlayerSkills; skillReqValue: number; }
export interface InventoryItem { id: string; name: string; type: string; value: number; condition: number; }
export interface Vehicle { id: string; name: string; type: string; value: number; condition: number; mileage: number; lastService: number; }
export interface ConversationMessage { role: 'player' | 'npc' | 'system'; content: string; timestamp: number; }
export interface Relationship { value: number; flags: string[]; metAt: number; lastInteracted: number; memory: ConversationMessage[]; }
export interface Player {
  id: string; redditUsername: string; firstName: string; lastName: string; age: number; gender: string;
  background: Background; traits: Trait[]; perk: Perk;
  health: number; happiness: number; energy: number; stress: number;
  skills: PlayerSkills; reputation: Reputation;
  money: number; bankBalance: number;
  city: City; district: District;
  job: Job | null; jobPerformance: number; daysAtJob: number;
  inventory: InventoryItem[]; vehicles: Vehicle[];
  relationships: Record<string, Relationship>;
  currentEventId: string | null; activeStorylineId: string | null;
  backstoryFlags: string[]; createdAt: number; lastActive: number;
}
export interface NPC {
  id: string; name: string; firstName: string; lastName: string;
  city: City; district: District; role: string; age: number; gender: string;
  personalityTraits: string[]; description: string;
  relationshipValues: Record<string, number>; relationshipFlags: Record<string, string[]>;
  conversationMemory: Record<string, ConversationMessage[]>;
  goals: string[]; currentMood: string; secrets: string[];
  schedule: WeeklySchedule; isDeceased: boolean; deathReason?: string;
}
export interface DayActivity { startHour: number; endHour: number; location: string; activity: string; }
export interface WeeklySchedule { [day: string]: DayActivity[]; }
export interface DailyNews { headline: string; summary: string; district?: District; }
export interface CityState { name: City; economicIndex: number; crimeRate: number; weather: WeatherCondition; news: DailyNews[]; lastUpdated: number; }
export interface JobListing { id: string; title: string; employer: string; tier: JobTier; pay: number; skill: keyof PlayerSkills; required: number; city: City; district: District; description: string; }
export interface GameEvent { id: string; type: string; title: string; description: string; district?: District; city?: City; playerOnly?: boolean; choices?: EventChoice[]; statChanges?: Partial<Record<keyof PlayerSkills, number>>; rewards?: { money?: number; items?: InventoryItem[] }; consequences?: { money?: number; statDamage?: Record<string, number> }; isComplete: boolean; }
export interface EventChoice { label: string; description: string; requiredSkill?: keyof PlayerSkills; dc?: number; outcomes: { success: Partial<GameEvent>; failure: Partial<GameEvent>; }; }
export interface GameResponse {
  text: string;
  newPlayer?: Player;
  npcName?: string;
}

export const BACKGROUND_DATA: Record<Background, { startingMoney: number; skillBonus: keyof PlayerSkills; bonusValue: number }> = {
  working_class: { startingMoney: 400, skillBonus: 'craftsmanship', bonusValue: 2 },
  student: { startingMoney: 150, skillBonus: 'charisma', bonusValue: 2 },
  corporate: { startingMoney: 900, skillBonus: 'finance', bonusValue: 2 },
  hustler: { startingMoney: 300, skillBonus: 'driving', bonusValue: 2 },
  creative: { startingMoney: 250, skillBonus: 'charisma', bonusValue: 2 },
  unemployed: { startingMoney: 50, skillBonus: 'fitness', bonusValue: 2 },
  service_industry: { startingMoney: 500, skillBonus: 'charisma', bonusValue: 2 },
  immigrant: { startingMoney: 200, skillBonus: 'languages', bonusValue: 3 },
  heir: { startingMoney: 5000, skillBonus: 'finance', bonusValue: 3 },
  veteran: { startingMoney: 600, skillBonus: 'fitness', bonusValue: 2 },
};
export const TRAIT_DATA: Record<Trait, { description: string; effect: string }> = {
  charisma_trait: { description: 'Better social interactions', effect: '+2 to social checks' },
  discipline: { description: 'Better job performance', effect: '+2 to work checks' },
  empathy: { description: 'Better relationships', effect: '+5 to relationship gains' },
  hustle: { description: 'Better side gig income', effect: '+20% side hustle money' },
  intelligence: { description: 'Faster skill gains', effect: '+20% skill XP' },
  risk_taking: { description: 'Higher crime rewards, higher risk', effect: '+30% crime reward, +20% crime fail chance' },
  resilient: { description: 'Recover faster from setbacks', effect: '+25% health/energy recovery' },
  ambitious: { description: 'Faster career advancement', effect: '+15% promotion chance' },
};
export const PERK_DATA: Record<Perk, { description: string }> = {
  knows_people: { description: 'Starts with +20 relationship with 3 random NPCs' },
  fast_learner: { description: 'Skill points earned 20% faster' },
  street_smart: { description: '+15% chance to detect scams' },
  reliable_worker: { description: 'Never fired for minor mistakes' },
  creative_mind: { description: 'Side hustle income +25%' },
  world_traveler: { description: '50% discount on all travel costs' },
  polyglot: { description: 'Start with +2 languages skill, unlock international jobs' },
};
export const CITY_METADATA: Record<City, { displayName: string; economicIndex: number; volatility: number; crimeRate: number; modifiers: string[] }> = {
  // Mid-South
  memphis: { displayName: 'Memphis, TN', economicIndex: 65, volatility: 15, crimeRate: 55, modifiers: ['blues_hustle', 'nightlife', 'music_industry'] },
  west_memphis: { displayName: 'West Memphis, AR', economicIndex: 55, volatility: 20, crimeRate: 60, modifiers: ['small_town', 'border_city'] },
  littlerock: { displayName: 'Little Rock, AR', economicIndex: 75, volatility: 8, crimeRate: 35, modifiers: ['steady', 'government', 'balanced'] },
  southaven: { displayName: 'Southaven, MS', economicIndex: 60, volatility: 5, crimeRate: 25, modifiers: ['family', 'quiet', 'suburban'] },
  // Southeast
  nashville: { displayName: 'Nashville, TN', economicIndex: 80, volatility: 12, crimeRate: 40, modifiers: ['music_city', 'healthcare_hub'] },
  atlanta: { displayName: 'Atlanta, GA', economicIndex: 85, volatility: 10, crimeRate: 45, modifiers: ['hip_hop_capital', 'corporate_hub'] },
  new_orleans: { displayName: 'New Orleans, LA', economicIndex: 70, volatility: 25, crimeRate: 70, modifiers: ['party_city', 'jazz_birthplace'] },
  miami: { displayName: 'Miami, FL', economicIndex: 90, volatility: 15, crimeRate: 50, modifiers: ['beach_city', 'latin_influence', 'crypto_hub'] },
  charlotte: { displayName: 'Charlotte, NC', economicIndex: 82, volatility: 8, crimeRate: 35, modifiers: ['banking_hub', 'clean_city'] },
  // Northeast/Midwest
  new_york: { displayName: 'New York, NY', economicIndex: 100, volatility: 12, crimeRate: 45, modifiers: ['finance_capital', 'culture_hub', 'career_maker'] },
  chicago: { displayName: 'Chicago, IL', economicIndex: 88, volatility: 10, crimeRate: 55, modifiers: ['second_city', 'finance_hub', 'cold_winters'] },
  detroit: { displayName: 'Detroit, MI', economicIndex: 50, volatility: 30, crimeRate: 65, modifiers: ['motor_city', 'comeback_city', 'cheap_housing'] },
  philly: { displayName: 'Philadelphia, PA', economicIndex: 78, volatility: 10, crimeRate: 50, modifiers: ['history_city', 'sports_town'] },
  // West/Southwest
  los_angeles: { displayName: 'Los Angeles, CA', economicIndex: 92, volatility: 15, crimeRate: 50, modifiers: ['entertainment_capital', 'hollywood', 'diverse'] },
  vegas: { displayName: 'Las Vegas, NV', economicIndex: 75, volatility: 35, crimeRate: 45, modifiers: ['gambling_paradise', '24_hour_city'] },
  houston: { displayName: 'Houston, TX', economicIndex: 85, volatility: 12, crimeRate: 50, modifiers: ['oil_capital', 'space_city', 'diverse'] },
  dallas: { displayName: 'Dallas, TX', economicIndex: 88, volatility: 10, crimeRate: 45, modifiers: ['corporate_hub', 'tech_growing'] },
  phoenix: { displayName: 'Phoenix, AZ', economicIndex: 75, volatility: 8, crimeRate: 40, modifiers: ['retirement_hub', 'hot_summers'] },
  seattle: { displayName: 'Seattle, WA', economicIndex: 95, volatility: 10, crimeRate: 45, modifiers: ['tech_hub', 'coffee_capital', 'rainy'] },
  // International
  london: { displayName: 'London, UK', economicIndex: 95, volatility: 12, crimeRate: 35, modifiers: ['finance_capital', 'history', 'expensive'] },
  tokyo: { displayName: 'Tokyo, Japan', economicIndex: 98, volatility: 5, crimeRate: 15, modifiers: ['tech_advanced', 'safe', 'work_culture'] },
  paris: { displayName: 'Paris, France', economicIndex: 90, volatility: 8, crimeRate: 40, modifiers: ['fashion_capital', 'art_history', 'food_culture'] },
  berlin: { displayName: 'Berlin, Germany', economicIndex: 85, volatility: 5, crimeRate: 30, modifiers: ['tech_startup', 'nightlife', 'artistic'] },
  dubai: { displayName: 'Dubai, UAE', economicIndex: 92, volatility: 20, crimeRate: 10, modifiers: ['luxury', 'tax_free', 'expat_hub'] },
  mexico_city: { displayName: 'Mexico City, MX', economicIndex: 70, volatility: 25, crimeRate: 55, modifiers: ['food_paradise', 'history', 'traffic'] },
  toronto: { displayName: 'Toronto, Canada', economicIndex: 88, volatility: 8, crimeRate: 25, modifiers: ['diverse', 'polite', 'finance_hub'] },
  sydney: { displayName: 'Sydney, Australia', economicIndex: 90, volatility: 10, crimeRate: 30, modifiers: ['beach_city', 'outdoor_lifestyle'] },
};
export const DISTRICT_METADATA: Record<District, { city: City; displayName: string; crimeRate: number; communityRepBonus: number; jobTypes: string[]; description: string }> = {
  // Memphis
  downtown: { city: 'memphis', displayName: 'Downtown Memphis', crimeRate: 65, communityRepBonus: 0, jobTypes: ['tourism', 'hospitality', 'nightlife'], description: 'Beale Street, bars, and tourism.' },
  midtown: { city: 'memphis', displayName: 'Midtown', crimeRate: 40, communityRepBonus: 10, jobTypes: ['creative', 'service', 'retail'], description: 'Cooper-Young, Overton Square.' },
  south_memphis: { city: 'memphis', displayName: 'South Memphis', crimeRate: 80, communityRepBonus: -5, jobTypes: ['labor', 'service'], description: 'High-risk, high-reward.' },
  east_memphis: { city: 'memphis', displayName: 'East Memphis', crimeRate: 20, communityRepBonus: 5, jobTypes: ['corporate', 'professional', 'retail'], description: 'Corporate offices and malls.' },
  orange_mound: { city: 'memphis', displayName: 'Orange Mound', crimeRate: 50, communityRepBonus: 20, jobTypes: ['service', 'small_business'], description: 'Strong community.' },
  cordova: { city: 'memphis', displayName: 'Cordova', crimeRate: 25, communityRepBonus: 5, jobTypes: ['retail', 'service', 'warehouse'], description: 'Suburban growth area.' },
  bartlett: { city: 'memphis', displayName: 'Bartlett', crimeRate: 18, communityRepBonus: 10, jobTypes: ['service', 'retail', 'education'], description: 'Quiet suburb.' },
  // Little Rock
  river_market: { city: 'littlerock', displayName: 'River Market', crimeRate: 30, communityRepBonus: 15, jobTypes: ['hospitality', 'service', 'tourism'], description: 'Restaurants, farmers market.' },
  hillcrest: { city: 'littlerock', displayName: 'Hillcrest', crimeRate: 25, communityRepBonus: 10, jobTypes: ['professional', 'service'], description: 'Young professionals.' },
  southwest_lr: { city: 'littlerock', displayName: 'Southwest Little Rock', crimeRate: 45, communityRepBonus: 5, jobTypes: ['blue_collar', 'industrial', 'service'], description: 'Diverse and busy.' },
  west_lr: { city: 'littlerock', displayName: 'West Little Rock', crimeRate: 15, communityRepBonus: 0, jobTypes: ['corporate', 'professional'], description: 'Affluent suburbs.' },
  heights: { city: 'littlerock', displayName: 'The Heights', crimeRate: 20, communityRepBonus: 8, jobTypes: ['professional', 'service', 'retail'], description: 'Upscale shopping.' },
  // Southaven
  goodman_road: { city: 'southaven', displayName: 'Goodman Road', crimeRate: 35, communityRepBonus: 5, jobTypes: ['retail', 'service'], description: 'Retail heavy.' },
  snowden: { city: 'southaven', displayName: 'Snowden', crimeRate: 20, communityRepBonus: 15, jobTypes: ['service', 'education'], description: 'Families and schools.' },
  church_road: { city: 'southaven', displayName: 'Church Road', crimeRate: 25, communityRepBonus: 10, jobTypes: ['service', 'retail'], description: 'New developments.' },
  // West Memphis
  broadway: { city: 'west_memphis', displayName: 'Broadway', crimeRate: 55, communityRepBonus: 0, jobTypes: ['service', 'retail', 'truck_stop'], description: 'Main strip.' },
  mississippi_park: { city: 'west_memphis', displayName: 'Mississippi Park', crimeRate: 45, communityRepBonus: 5, jobTypes: ['service', 'industrial'], description: 'Near the river.' },
  meadowlake: { city: 'west_memphis', displayName: 'Meadowlake', crimeRate: 35, communityRepBonus: 10, jobTypes: ['service', 'retail'], description: 'Quieter residential.' },
  // Nashville
  music_row: { city: 'nashville', displayName: 'Music Row', crimeRate: 30, communityRepBonus: 10, jobTypes: ['entertainment', 'music', 'creative'], description: 'Heart of music industry.' },
  downtown_nash: { city: 'nashville', displayName: 'Downtown Nashville', crimeRate: 45, communityRepBonus: 0, jobTypes: ['tourism', 'hospitality', 'nightlife'], description: 'Broadway honky-tonks.' },
  east_nash: { city: 'nashville', displayName: 'East Nashville', crimeRate: 40, communityRepBonus: 15, jobTypes: ['creative', 'service', 'food_service'], description: 'Hipster paradise.' },
  germantown_nash: { city: 'nashville', displayName: 'Germantown', crimeRate: 25, communityRepBonus: 10, jobTypes: ['professional', 'service'], description: 'Historic neighborhood.' },
  // Atlanta
  buckhead: { city: 'atlanta', displayName: 'Buckhead', crimeRate: 30, communityRepBonus: 0, jobTypes: ['corporate', 'finance', 'luxury_retail'], description: 'Upscale corporate hub.' },
  midtown_atl: { city: 'atlanta', displayName: 'Midtown Atlanta', crimeRate: 35, communityRepBonus: 10, jobTypes: ['tech', 'professional', 'creative'], description: 'Tech hub.' },
  downtown_atl: { city: 'atlanta', displayName: 'Downtown Atlanta', crimeRate: 50, communityRepBonus: 5, jobTypes: ['corporate', 'government', 'hospitality'], description: 'Business district.' },
  west_end: { city: 'atlanta', displayName: 'West End', crimeRate: 55, communityRepBonus: 20, jobTypes: ['service', 'small_business', 'education'], description: 'Historic Black neighborhood.' },
  // New Orleans
  french_quarter: { city: 'new_orleans', displayName: 'French Quarter', crimeRate: 60, communityRepBonus: 5, jobTypes: ['tourism', 'hospitality', 'nightlife'], description: 'Historic heart.' },
  garden_district: { city: 'new_orleans', displayName: 'Garden District', crimeRate: 35, communityRepBonus: 10, jobTypes: ['professional', 'service', 'tourism'], description: 'Historic mansions.' },
  marigny: { city: 'new_orleans', displayName: 'Marigny', crimeRate: 45, communityRepBonus: 15, jobTypes: ['creative', 'music', 'service'], description: 'Music clubs.' },
  // NYC
  manhattan: { city: 'new_york', displayName: 'Manhattan', crimeRate: 40, communityRepBonus: 0, jobTypes: ['finance', 'corporate', 'tech', 'media'], description: 'The center of the world.' },
  brooklyn: { city: 'new_york', displayName: 'Brooklyn', crimeRate: 45, communityRepBonus: 10, jobTypes: ['tech', 'creative', 'startup'], description: 'Hip and diverse.' },
  queens: { city: 'new_york', displayName: 'Queens', crimeRate: 40, communityRepBonus: 15, jobTypes: ['service', 'retail', 'airport'], description: 'Most diverse place.' },
  harlem: { city: 'new_york', displayName: 'Harlem', crimeRate: 50, communityRepBonus: 20, jobTypes: ['service', 'education', 'creative'], description: 'Historic Black culture.' },
  bronx: { city: 'new_york', displayName: 'The Bronx', crimeRate: 55, communityRepBonus: 10, jobTypes: ['service', 'healthcare', 'industrial'], description: 'Hip-hop birthplace.' },
  // LA
  hollywood: { city: 'los_angeles', displayName: 'Hollywood', crimeRate: 45, communityRepBonus: 5, jobTypes: ['entertainment', 'creative', 'service'], description: 'Movie industry.' },
  venice: { city: 'los_angeles', displayName: 'Venice Beach', crimeRate: 50, communityRepBonus: 10, jobTypes: ['creative', 'tech', 'fitness'], description: 'Beach life.' },
  downtown_la: { city: 'los_angeles', displayName: 'Downtown LA', crimeRate: 55, communityRepBonus: 0, jobTypes: ['corporate', 'finance', 'creative'], description: 'Revitalizing downtown.' },
  compton: { city: 'los_angeles', displayName: 'Compton', crimeRate: 70, communityRepBonus: 20, jobTypes: ['service', 'manufacturing'], description: 'Hip-hop hub.' },
  beverly_hills: { city: 'los_angeles', displayName: 'Beverly Hills', crimeRate: 15, communityRepBonus: -5, jobTypes: ['luxury_retail', 'entertainment', 'finance'], description: 'Wealthiest zip.' },
  // Chicago
  loop: { city: 'chicago', displayName: 'The Loop', crimeRate: 40, communityRepBonus: 0, jobTypes: ['finance', 'corporate', 'government'], description: 'Downtown business.' },
  south_side: { city: 'chicago', displayName: 'South Side', crimeRate: 70, communityRepBonus: 15, jobTypes: ['service', 'education', 'healthcare'], description: 'Deep history.' },
  wicker_park: { city: 'chicago', displayName: 'Wicker Park', crimeRate: 35, communityRepBonus: 10, jobTypes: ['creative', 'tech', 'service'], description: 'Hipster paradise.' },
  hyde_park: { city: 'chicago', displayName: 'Hyde Park', crimeRate: 40, communityRepBonus: 15, jobTypes: ['education', 'research', 'healthcare'], description: 'University of Chicago.' },
  // London
  camden: { city: 'london', displayName: 'Camden', crimeRate: 35, communityRepBonus: 15, jobTypes: ['creative', 'music', 'service'], description: 'Alternative culture.' },
  soho: { city: 'london', displayName: 'Soho', crimeRate: 40, communityRepBonus: 5, jobTypes: ['media', 'entertainment', 'hospitality'], description: 'Entertainment district.' },
  shoreditch: { city: 'london', displayName: 'Shoreditch', crimeRate: 35, communityRepBonus: 10, jobTypes: ['tech', 'startup', 'creative'], description: 'Tech startup hub.' },
  westminster: { city: 'london', displayName: 'Westminster', crimeRate: 30, communityRepBonus: 0, jobTypes: ['government', 'finance', 'professional'], description: 'Political heart.' },
  // Tokyo
  shibuya: { city: 'tokyo', displayName: 'Shibuya', crimeRate: 15, communityRepBonus: 10, jobTypes: ['tech', 'retail', 'entertainment'], description: 'Fashion capital.' },
  shinjuku: { city: 'tokyo', displayName: 'Shinjuku', crimeRate: 20, communityRepBonus: 5, jobTypes: ['corporate', 'government', 'hospitality'], description: 'Busiest station.' },
  roppongi: { city: 'tokyo', displayName: 'Roppongi', crimeRate: 25, communityRepBonus: 0, jobTypes: ['finance', 'nightlife', 'expat'], description: 'Expat hub.' },
  akihabara: { city: 'tokyo', displayName: 'Akihabara', crimeRate: 10, communityRepBonus: 15, jobTypes: ['tech', 'retail', 'gaming'], description: 'Anime paradise.' },
  // Paris
  marais: { city: 'paris', displayName: 'Le Marais', crimeRate: 30, communityRepBonus: 10, jobTypes: ['fashion', 'creative', 'tourism'], description: 'Historic and trendy.' },
  montmartre: { city: 'paris', displayName: 'Montmartre', crimeRate: 40, communityRepBonus: 15, jobTypes: ['art', 'tourism', 'hospitality'], description: 'Bohemian hilltop.' },
  latin_quarter: { city: 'paris', displayName: 'Latin Quarter', crimeRate: 25, communityRepBonus: 20, jobTypes: ['education', 'creative', 'retail'], description: 'Student life.' },
  champs_elysees: { city: 'paris', displayName: 'Champs-Élysées', crimeRate: 35, communityRepBonus: 0, jobTypes: ['luxury_retail', 'finance', 'tourism'], description: 'Iconic avenue.' },
  // Berlin
  kreuzberg: { city: 'berlin', displayName: 'Kreuzberg', crimeRate: 45, communityRepBonus: 20, jobTypes: ['creative', 'nightlife', 'service'], description: 'Alternative and edgy.' },
  mitte: { city: 'berlin', displayName: 'Mitte', crimeRate: 30, communityRepBonus: 5, jobTypes: ['tech', 'government', 'professional'], description: 'Central business.' },
  neukolln: { city: 'berlin', displayName: 'Neukölln', crimeRate: 50, communityRepBonus: 15, jobTypes: ['creative', 'service', 'retail'], description: 'Hip and diverse.' },
  prenzlauer_berg: { city: 'berlin', displayName: 'Prenzlauer Berg', crimeRate: 20, communityRepBonus: 10, jobTypes: ['professional', 'service', 'education'], description: 'Gentrified families.' },
  // Dubai
  dubai_marina: { city: 'dubai', displayName: 'Dubai Marina', crimeRate: 10, communityRepBonus: 5, jobTypes: ['tourism', 'hospitality', 'real_estate'], description: 'Modern skyscrapers.' },
  downtown_dubai: { city: 'dubai', displayName: 'Downtown Dubai', crimeRate: 15, communityRepBonus: 0, jobTypes: ['finance', 'corporate', 'luxury_retail'], description: 'Burj Khalifa area.' },
  palm_jumeirah: { city: 'dubai', displayName: 'Palm Jumeirah', crimeRate: 5, communityRepBonus: 5, jobTypes: ['hospitality', 'luxury_service'], description: 'Artificial island.' },
  deira: { city: 'dubai', displayName: 'Deira', crimeRate: 35, communityRepBonus: 15, jobTypes: ['trade', 'service', 'retail'], description: 'Historic market area.' },
  // Mexico City
  condesa: { city: 'mexico_city', displayName: 'La Condesa', crimeRate: 30, communityRepBonus: 15, jobTypes: ['creative', 'hospitality', 'professional'], description: 'Art deco and parks.' },
  polanco: { city: 'mexico_city', displayName: 'Polanco', crimeRate: 20, communityRepBonus: 0, jobTypes: ['finance', 'luxury_retail', 'corporate'], description: 'Upscale and modern.' },
  coyoacan: { city: 'mexico_city', displayName: 'Coyoacán', crimeRate: 25, communityRepBonus: 20, jobTypes: ['art', 'education', 'tourism'], description: 'Frida Kahlo neighborhood.' },
  zocalo: { city: 'mexico_city', displayName: 'Zócalo', crimeRate: 45, communityRepBonus: 10, jobTypes: ['government', 'trade', 'tourism'], description: 'The historic heart.' },
  // Toronto
  distillery_district: { city: 'toronto', displayName: 'Distillery District', crimeRate: 20, communityRepBonus: 10, jobTypes: ['creative', 'tourism', 'retail'], description: 'Victorian industrial.' },
  entertainment_district: { city: 'toronto', displayName: 'Entertainment District', crimeRate: 35, communityRepBonus: 5, jobTypes: ['media', 'nightlife', 'hospitality'], description: 'Theaters and clubs.' },
  kensington_market: { city: 'toronto', displayName: 'Kensington Market', crimeRate: 40, communityRepBonus: 20, jobTypes: ['creative', 'retail', 'service'], description: 'Eclectic market.' },
  yorkville: { city: 'toronto', displayName: 'Yorkville', crimeRate: 15, communityRepBonus: 5, jobTypes: ['luxury_retail', 'professional', 'finance'], description: 'Upscale shopping.' },
  // Sydney
  the_rocks: { city: 'sydney', displayName: 'The Rocks', crimeRate: 25, communityRepBonus: 10, jobTypes: ['tourism', 'hospitality', 'history'], description: 'Historic waterfront.' },
  darling_harbour: { city: 'sydney', displayName: 'Darling Harbour', crimeRate: 30, communityRepBonus: 5, jobTypes: ['tourism', 'entertainment', 'hospitality'], description: 'Pedestrian precinct.' },
  surry_hills: { city: 'sydney', displayName: 'Surry Hills', crimeRate: 35, communityRepBonus: 15, jobTypes: ['creative', 'tech', 'food_service'], description: 'Fashion and food.' },
  bondi: { city: 'sydney', displayName: 'Bondi', crimeRate: 25, communityRepBonus: 10, jobTypes: ['fitness', 'tourism', 'hospitality'], description: 'Famous beach.' },
  // Generic
  downtown_generic: { city: 'memphis', displayName: 'Downtown', crimeRate: 45, communityRepBonus: 5, jobTypes: ['corporate', 'service', 'retail'], description: 'City center.' },
  suburbs: { city: 'memphis', displayName: 'Suburbs', crimeRate: 25, communityRepBonus: 10, jobTypes: ['service', 'retail', 'education'], description: 'Family-friendly.' },
  industrial: { city: 'memphis', displayName: 'Industrial', crimeRate: 50, communityRepBonus: 0, jobTypes: ['manufacturing', 'warehouse', 'logistics'], description: 'Factories and warehouses.' },
  uptown: { city: 'memphis', displayName: 'Uptown', crimeRate: 30, communityRepBonus: 10, jobTypes: ['professional', 'retail', 'service'], description: 'Upscale area.' },
};
export const ApiEndpoint = {
  Init: '/api/init', Increment: '/api/increment', Decrement: '/api/decrement',
  OnPostCreate: '/internal/menu/post-create', OnAppInstall: '/internal/on-app-install',
} as const;
export type Command = 'start' | 'profile' | 'work' | 'study' | 'explore' | 'talk' | 'apply' | 'budget' | 'relationships' | 'move' | 'invest' | 'side_hustle' | 'crime' | 'help' | 'cheat_money' | 'cheat_skill' | 'cheat_relationship' | 'cheat_reset' | 'cheat_location' | 'custom_start';
export interface ParsedCommand { command: Command; args: string[]; }
