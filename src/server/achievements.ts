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

export const ACHIEVEMENTS: Achievement[] = [
  // === LIFE MILESTONES ===
  { id: 'first_day', name: 'First Day', description: 'Complete your first day of work', category: 'life', icon: '💼' },
  { id: 'promoted', name: 'Moving Up', description: 'Get promoted to a higher tier job', category: 'life', icon: '📈' },
  { id: 'educated', name: 'Book Smart', description: 'Study 10 times', category: 'life', icon: '📚', maxProgress: 10 },
  { id: 'gym_rat', name: 'Gym Rat', description: 'Reach 80+ fitness', category: 'life', icon: '💪' },
  { id: 'genius', name: 'Genius', description: 'Reach 90+ intelligence', category: 'life', icon: '🧠' },
  { id: 'people_person', name: 'People Person', description: 'Reach 90+ charisma', category: 'life', icon: '💬' },
  { id: 'centenarian', name: 'Living Long', description: 'Stay alive for 100 game days', category: 'life', icon: '🎂' },
  
  // === WEALTH ===
  { id: 'first_k', name: 'Thousandaire', description: 'Accumulate $1,000', category: 'wealth', icon: '💵' },
  { id: 'ten_k', name: 'Five Figures', description: 'Accumulate $10,000', category: 'wealth', icon: '💰' },
  { id: 'hundred_k', name: 'Six Figures', description: 'Accumulate $100,000', category: 'wealth', icon: '💎' },
  { id: 'millionaire', name: 'Millionaire', description: 'Accumulate $1,000,000', category: 'wealth', icon: '🏆' },
  { id: 'first_car', name: 'First Ride', description: 'Buy your first vehicle', category: 'wealth', icon: '🚗' },
  { id: 'car_collector', name: 'Car Collector', description: 'Own 3 vehicles at once', category: 'wealth', icon: '🚙' },
  { id: 'homeowner', name: 'Homeowner', description: 'Purchase your first property', category: 'wealth', icon: '🏠' },
  { id: 'landlord', name: 'Landlord', description: 'Own 3+ properties', category: 'wealth', icon: '🏘️' },
  { id: 'investor', name: 'Wall Street', description: 'Make your first investment', category: 'wealth', icon: '📈' },
  { id: 'diversified', name: 'Diversified Portfolio', description: 'Own 5+ different investments', category: 'wealth', icon: '📊' },
  
  // === SOCIAL ===
  { id: 'friendly', name: 'Friendly', description: 'Build 5 relationships to level 25', category: 'social', icon: '🤝', maxProgress: 5 },
  { id: 'popular', name: 'Popular', description: 'Build 10 relationships to level 50', category: 'social', icon: '⭐', maxProgress: 10 },
  { id: 'best_friend', name: 'Best Friend', description: 'Reach relationship level 75 with someone', category: 'social', icon: '💚' },
  { id: 'soulmate', name: 'Soul Connection', description: 'Reach relationship level 100', category: 'social', icon: '💜' },
  { id: 'networker', name: 'Networker', description: 'Meet 20 different NPCs', category: 'social', icon: '🌐', maxProgress: 20 },
  
  // === CRIME ===
  { id: 'first_crime', name: 'First Offense', description: 'Commit your first crime', category: 'crime', icon: '🎭', hidden: true },
  { id: 'mastermind', name: 'Mastermind', description: 'Successfully complete 10 crimes', category: 'crime', icon: '🦹', maxProgress: 10 },
  { id: 'untouchable', name: 'Untouchable', description: 'Complete 5 crimes without getting caught', category: 'crime', icon: '👻' },
  { id: 'infamous', name: 'Infamous', description: 'Reach criminal reputation 50', category: 'crime', icon: '⚠️' },
  { id: 'busted', name: 'Busted', description: 'Get caught committing a crime', category: 'crime', icon: '🚨' },
  
  // === TRAVEL ===
  { id: 'traveler', name: 'Traveler', description: 'Visit 3 different cities', category: 'travel', icon: '🗺️', maxProgress: 3 },
  { id: 'jetsetter', name: 'Jetsetter', description: 'Visit 10 different cities', category: 'travel', icon: '✈️', maxProgress: 10 },
  { id: 'world_traveler', name: 'World Traveler', description: 'Visit all 28 cities', category: 'travel', icon: '🌍', maxProgress: 28 },
  { id: 'international', name: 'Going Global', description: 'Visit your first international city', category: 'travel', icon: '🌏' },
  { id: 'coast_to_coast', name: 'Coast to Coast', description: 'Visit both NYC and LA', category: 'travel', icon: '🇺🇸' },
  
  // === SPECIAL ===
  { id: 'survivor', name: 'Survivor', description: 'Recover from near-death (health < 10)', category: 'special', icon: '❤️‍🩹', hidden: true },
  { id: 'comeback', name: 'Comeback Kid', description: 'Go from broke ($0) to $5,000', category: 'special', icon: '🔄', hidden: true },
  { id: 'workaholic', name: 'Workaholic', description: 'Work 30 days straight without rest', category: 'special', icon: '😴', hidden: true },
  { id: 'lucky', name: 'Lucky Streak', description: 'Succeed on 5 random events in a row', category: 'special', icon: '🍀', hidden: true },
  { id: 'balanced', name: 'Balanced Life', description: 'Keep all stats above 70 for 7 days', category: 'special', icon: '⚖️' },
  { id: 'mid_south', name: 'Mid-South Native', description: 'Stay in starting region for 30 days', category: 'special', icon: '🎸' },
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
      case 'international':
        unlocked = this.hasVisitedInternationalCity(playerState.visitedCities);
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
  
  private hasVisitedInternationalCity(visitedCities: Set<string> | undefined): boolean {
    if (!visitedCities) return false;
    const internationalCities = ['london', 'tokyo', 'paris', 'berlin', 'sydney', 'dubai', 'singapore'];
    return internationalCities.some(city => visitedCities.has(city));
  }
  
  export(): PlayerAchievements {
    return {
      unlocked: new Set(this.achievements.unlocked),
      progress: new Map(this.achievements.progress),
      notifiedAt: new Map(this.achievements.notifiedAt),
    };
  }
  
  import(data: PlayerAchievements): void {
    this.achievements = {
      unlocked: new Set(data.unlocked),
      progress: new Map(data.progress),
      notifiedAt: new Map(data.notifiedAt),
    };
  }
}
