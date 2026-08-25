// THE OPEN WORLD — Achievement System
// Tracks player accomplishments and milestones

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'life' | 'wealth' | 'social' | 'crime' | 'travel' | 'special';
  icon: string;
  hidden?: boolean;
  progress?: number;
  maxProgress?: number;
}

export interface PlayerAchievements {
  unlocked: Set<string>;
  progress: Map<string, number>;
  notifiedAt: Map<string, number>;
}

export interface SerializableAchievements {
  unlocked: string[];
  progress: Record<string, number>;
  notifiedAt: Record<string, number>;
}

export const ACHIEVEMENTS: Achievement[] = [
  // === LIFE MILESTONES ===
  { id: 'first_day', name: 'First Day', description: 'Complete your first day of work', category: 'life', icon: '💼' },
  { id: 'promoted', name: 'Moving Up', description: 'Get promoted to a higher tier job', category: 'life', icon: '📈' },
  { id: 'educated', name: 'Book Smart', description: 'Study 10 times', category: 'life', icon: '📚', maxProgress: 10 },
  { id: 'gym_rat', name: 'Gym Rat', description: 'Reach 80+ fitness', category: 'life', icon: '💪' },
  { id: 'genius', name: 'Genius', description: 'Reach 90+ intelligence', category: 'life', icon: '🧠' },
  { id: 'people_person', name: 'People Person', description: 'Reach 90+ charisma', category: 'life', icon: '💬' },
  { id: 'scholar', name: 'Scholar', description: 'Earn your first certification or degree', category: 'life', icon: '🎓' },
  { id: 'master_worker', name: 'Seasoned Worker', description: 'Complete 100 work shifts', category: 'life', icon: '⚒️' },
  { id: 'veteran', name: 'Veteran', description: 'Survive 365 in-game days', category: 'life', icon: '🎖️', hidden: true },
  { id: 'centenarian', name: 'Living Long', description: 'Stay alive for 100 game days', category: 'life', icon: '🎂' },
  
  // === WEALTH ===
  { id: 'first_k', name: 'Thousandaire', description: 'Accumulate $1,000', category: 'wealth', icon: '💵' },
  { id: 'ten_k', name: 'Five Figures', description: 'Accumulate $10,000', category: 'wealth', icon: '💰' },
  { id: 'hundred_k', name: 'Six Figures', description: 'Accumulate $100,000', category: 'wealth', icon: '💎' },
  { id: 'millionaire', name: 'Millionaire', description: 'Accumulate $1,000,000', category: 'wealth', icon: '🏆' },
  { id: 'first_car', name: 'First Ride', description: 'Buy your first vehicle', category: 'wealth', icon: '🚗' },
  { id: 'car_collector', name: 'Car Collector', description: 'Own 3 vehicles at once', category: 'wealth', icon: '🚙' },
  { id: 'homeowner', name: 'Homeowner', description: 'Purchase your first property', category: 'wealth', icon: '🏠' },
  { id: 'landlord', name: 'Landlord', description: 'Own 3+ properties', category: 'wealth', icon: '🏙️' },
  { id: 'real_estate_tycoon', name: 'Real Estate Tycoon', description: 'Own properties in 5 different cities', category: 'wealth', icon: '🏰' },
  { id: 'investor', name: 'Wall Street', description: 'Make your first investment', category: 'wealth', icon: '📈' },
  { id: 'diversified', name: 'Diversified Portfolio', description: 'Own 5+ different investments', category: 'wealth', icon: '📊' },
  
  // === SOCIAL ===
  { id: 'friendly', name: 'Friendly', description: 'Build 5 relationships to level 25', category: 'social', icon: '🤝', maxProgress: 5 },
  { id: 'popular', name: 'Popular', description: 'Build 10 relationships to level 50', category: 'social', icon: '⭐', maxProgress: 10 },
  { id: 'best_friend', name: 'Best Friend', description: 'Reach relationship level 75 with someone', category: 'social', icon: '💚' },
  { id: 'soulmate', name: 'Soul Connection', description: 'Reach relationship level 100', category: 'social', icon: '💜' },
  { id: 'networker', name: 'Networker', description: 'Meet 20 different NPCs', category: 'social', icon: '🌐', maxProgress: 20 },
  { id: 'first_introduction', name: 'First Introduction', description: 'Meet your first NPC', category: 'social', icon: '🤝' },
  { id: 'socialite', name: 'Socialite', description: 'Meet 10 unique NPCs', category: 'social', icon: '🎩', maxProgress: 10 },
  { id: 'city_hopper', name: 'City Hopper', description: 'Meet NPCs in 5 different cities', category: 'social', icon: '🏙️', maxProgress: 5 },
  { id: 'city_angel', name: 'City Angel', description: 'Reach 50 community reputation', category: 'social', icon: '😇' },
  { id: 'faction_leader', name: 'Faction Leader', description: 'Reach 100% influence with a faction', category: 'social', icon: '👑' },
  { id: 'saboteur', name: 'Master Saboteur', description: 'Successfully sabotage rival factions 5 times', category: 'social', icon: '🔥', maxProgress: 5 },
  
  // === CRIME ===
  { id: 'first_crime', name: 'First Offense', description: 'Commit your first crime', category: 'crime', icon: '🎭', hidden: true },
  { id: 'mastermind', name: 'Mastermind', description: 'Successfully complete 10 crimes', category: 'crime', icon: '🦹', maxProgress: 10 },
  { id: 'untouchable', name: 'Untouchable', description: 'Complete 5 crimes without getting caught', category: 'crime', icon: '👻' },
  { id: 'infamous', name: 'Infamous', description: 'Reach criminal reputation 50', category: 'crime', icon: '⚠️' },
  { id: 'busted', name: 'Busted', description: 'Get caught committing a crime', category: 'crime', icon: '🚨' },
  { id: 'most_wanted', name: 'Most Wanted', description: 'Reach maximum police heat (100)', category: 'crime', icon: '🔥', hidden: true },
  { id: 'underground_legend', name: 'Underground Legend', description: 'Reach 100 criminal reputation', category: 'crime', icon: '🦂' },
  
  // === TRAVEL ===
  { id: 'traveler', name: 'Traveler', description: 'Visit 3 different cities', category: 'travel', icon: '🗺️', maxProgress: 3 },
  { id: 'jetsetter', name: 'Jetsetter', description: 'Visit 10 different cities', category: 'travel', icon: '✈️', maxProgress: 10 },
  { id: 'world_traveler', name: 'World Traveler', description: 'Visit all 28 cities', category: 'travel', icon: '🌍', maxProgress: 28 },
  { id: 'international', name: 'Going Global', description: 'Visit your first international city', category: 'travel', icon: '🌏' },
  { id: 'continental', name: 'Continental', description: 'Visit 3 international cities', category: 'travel', icon: '🌐' },
  { id: 'global_citizen', name: 'Global Citizen', description: 'Visit 5 international cities', category: 'travel', icon: '🌎', maxProgress: 5 },
  { id: 'passport_collector', name: 'Passport Collector', description: 'Visit all 8 international cities', category: 'travel', icon: '🛂', maxProgress: 8 },
  { id: 'coast_to_coast', name: 'Coast to Coast', description: 'Visit both NYC and LA', category: 'travel', icon: '🇺🇸' },
  
  // === SPECIAL ===
  { id: 'survivor', name: 'Survivor', description: 'Recover from near-death (health < 10)', category: 'special', icon: '❤️‍🩹', hidden: true },
  { id: 'comeback', name: 'Comeback Kid', description: 'Go from broke ($0) to $5,000', category: 'special', icon: '🔄', hidden: true },
  { id: 'workaholic', name: 'Workaholic', description: 'Work 30 days straight without rest', category: 'special', icon: '😴', hidden: true },
  { id: 'lucky', name: 'Lucky Streak', description: 'Succeed on 5 random events in a row', category: 'special', icon: '🍀', hidden: true },
  { id: 'balanced', name: 'Balanced Life', description: 'Keep all stats above 70 for 7 days', category: 'special', icon: '⚖️' },
  { id: 'mid_south', name: 'Mid-South Native', description: 'Stay in starting region for 30 days', category: 'special', icon: '🎸' },
  { id: 'peak_fitness', name: 'Peak Fitness', description: 'Reach 100 fitness', category: 'life', icon: '🏃' },
  { id: 'skill_master', name: 'Renaissance Person', description: 'Master 3 different skills to level 50', category: 'life', icon: '🎭' },
  { id: 'trophy_hunter', name: 'Trophy Hunter', description: 'Unlock 10 achievements', category: 'special', icon: '🏆' },
];

export class AchievementEngine {
  private achievements: PlayerAchievements;
  
  constructor() {
    this.achievements = {
      unlocked: new Set(),
      progress: new Map(),
      notifiedAt: new Map(),
    };
  }
  
  checkAchievement(achievementId: string, playerState: any): { unlocked: boolean; achievement?: Achievement } {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return { unlocked: false };
    
    if (this.achievements.unlocked.has(achievementId)) {
      return { unlocked: false }; // Already unlocked
    }
    
    let unlocked = false;
    
    // Check based on achievement type
    switch (achievementId) {
      case 'first_day':
        unlocked = playerState.workDaysCompleted >= 1;
        break;
      case 'first_k':
        unlocked = playerState.money >= 1000;
        break;
      case 'ten_k':
        unlocked = playerState.money >= 10000;
        break;
      case 'hundred_k':
        unlocked = playerState.money >= 100000;
        break;
      case 'millionaire':
        unlocked = playerState.money >= 1000000;
        break;
      case 'first_car':
        unlocked = playerState.vehicles?.length >= 1;
        break;
      case 'car_collector':
        unlocked = playerState.vehicles?.length >= 3;
        break;
      case 'homeowner':
        unlocked = playerState.properties?.length >= 1;
        break;
      case 'landlord':
        unlocked = playerState.properties?.length >= 3;
        break;
      case 'real_estate_tycoon':
        unlocked = this.hasPropertiesInMultipleCities(playerState.properties, 5);
        break;
      case 'investor':
        unlocked = playerState.investments?.length >= 1;
        break;
      case 'gym_rat':
        unlocked = playerState.fitness >= 80;
        break;
      case 'genius':
        unlocked = playerState.intelligence >= 90;
        break;
      case 'people_person':
        unlocked = playerState.charisma >= 90;
        break;
      case 'infamous':
        unlocked = playerState.reputation?.criminal >= 50;
        break;
      case 'busted':
        unlocked = (playerState.criminalRecord?.length > 0) || (playerState.prisonRecord?.arrests > 0);
        break;
      case 'most_wanted':
        unlocked = (playerState.heat || 0) >= 100;
        break;
      case 'underground_legend':
        unlocked = (playerState.reputation?.criminal || 0) >= 100;
        break;
      case 'city_angel':
        unlocked = (playerState.reputation?.community || 0) >= 50;
        break;
      case 'faction_leader':
        unlocked = this.checkFactionInfluence(playerState, 100);
        break;
      case 'international':
        unlocked = this.hasVisitedInternationalCity(playerState.visitedCities);
        break;
      case 'scholar':
        unlocked = (playerState.certifications || []).length >= 1;
        break;
      case 'master_worker':
        unlocked = (playerState.workDaysCompleted || 0) >= 100;
        break;
      case 'veteran':
        unlocked = (playerState.gameDays || this.daysSinceCreation(playerState)) >= 365;
        break;
      case 'continental':
        unlocked = this.countInternationalCities(playerState.visitedCities) >= 3;
        break;
      case 'first_introduction':
        unlocked = this.countMetNPCs(playerState) >= 1;
        break;
      case 'socialite':
        unlocked = this.countMetNPCs(playerState) >= 10;
        break;
      case 'city_hopper':
        unlocked = this.countMetCities(playerState) >= 5;
        break;
      case 'peak_fitness':
        unlocked = (playerState.fitness || 0) >= 100;
        break;
      case 'skill_master':
        unlocked = this.countHighSkills(playerState.skills, 50) >= 3;
        break;
      case 'trophy_hunter':
        unlocked = this.achievements.unlocked.size >= 10;
        break;
      default:
        // Progress-based achievements
        if (achievement.maxProgress) {
          const current = this.achievements.progress.get(achievementId) || 0;
          unlocked = current >= achievement.maxProgress;
        }
    }
    
    if (unlocked) {
      this.achievements.unlocked.add(achievementId);
      this.achievements.notifiedAt.set(achievementId, Date.now());
      return { unlocked: true, achievement };
    }
    
    return { unlocked: false };
  }
  
  updateProgress(achievementId: string, increment: number = 1): void {
    const current = this.achievements.progress.get(achievementId) || 0;
    this.achievements.progress.set(achievementId, current + increment);
  }
  
  getProgress(achievementId: string): number {
    return this.achievements.progress.get(achievementId) || 0;
  }
  
  getUnlocked(): Achievement[] {
    return ACHIEVEMENTS.filter(a => this.achievements.unlocked.has(a.id));
  }
  
  getAll(): Achievement[] {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      progress: this.achievements.progress.get(a.id),
      unlocked: this.achievements.unlocked.has(a.id),
    }));
  }
  
  getVisible(): Achievement[] {
    return ACHIEVEMENTS.filter(a => !a.hidden || this.achievements.unlocked.has(a.id));
  }
  
  private countMetNPCs(playerState: any): number {
    if (!playerState.relationships) return 0;
    return Object.keys(playerState.relationships).length;
  }

  private countMetCities(playerState: any): number {
    const metNPCCities = playerState.metNPCCities || {};
    return new Set<string>(Object.values(metNPCCities)).size;
  }

  private countHighSkills(skills: any, minLevel: number): number {
    if (!skills) return 0;
    return Object.values(skills).filter((s: any) => typeof s.level === 'number' && s.level >= minLevel).length;
  }

  private hasVisitedInternationalCity(visitedCities: any): boolean {
    if (!visitedCities) return false;
    const internationalCities = ['london', 'tokyo', 'paris', 'berlin', 'dubai', 'mexico_city', 'toronto', 'sydney'];
    
    // Handle both Set and Array due to JSON serialization
    if (visitedCities instanceof Set) {
      return internationalCities.some(city => visitedCities.has(city));
    } else if (Array.isArray(visitedCities)) {
      return internationalCities.some(city => visitedCities.includes(city));
    }
    
    return false;
  }



  private countInternationalCities(visitedCities: any): number {
    if (!visitedCities) return 0;
    const internationalCities = ['london', 'tokyo', 'paris', 'berlin', 'dubai', 'mexico_city', 'toronto', 'sydney'];
    if (visitedCities instanceof Set) {
      return internationalCities.filter(city => visitedCities.has(city)).length;
    }
    if (Array.isArray(visitedCities)) {
      return internationalCities.filter(city => visitedCities.includes(city)).length;
    }
    return 0;
  }

  private daysSinceCreation(playerState: any): number {
    if (!playerState.createdAt) return 0;
    const now = playerState.lastActive || Date.now();
    const diffMs = now - playerState.createdAt;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private hasPropertiesInMultipleCities(properties: any[], count: number): boolean {
    if (!properties) return false;
    const cities = new Set(properties.map(p => p.city));
    return cities.size >= count;
  }

  private checkFactionInfluence(playerState: any, threshold: number): boolean {
    // This requires checking the actual faction influence from the social engine
    // But since the engine is stateless and we might not have full access here,
    // we'll rely on the player state if it's mirrored there, or return false for now.
    // In a real implementation, we'd pass the social engine or influence map.
    return false; 
  }
  
  export(): PlayerAchievements {
    return {
      unlocked: new Set(this.achievements.unlocked),
      progress: new Map(this.achievements.progress),
      notifiedAt: new Map(this.achievements.notifiedAt),
    };
  }
  
  exportSerializable(): SerializableAchievements {
    return {
      unlocked: Array.from(this.achievements.unlocked),
      progress: Object.fromEntries(this.achievements.progress),
      notifiedAt: Object.fromEntries(this.achievements.notifiedAt),
    };
  }
  
  import(data: PlayerAchievements): void {
    this.achievements = {
      unlocked: new Set(data.unlocked),
      progress: new Map(data.progress),
      notifiedAt: new Map(data.notifiedAt),
    };
  }

  importSerializable(data: SerializableAchievements): void {
    this.achievements = {
      unlocked: new Set(data.unlocked || []),
      progress: new Map(Object.entries(data.progress || {})),
      notifiedAt: new Map(Object.entries(data.notifiedAt || {})),
    };
  }
}
