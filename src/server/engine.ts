// THE OPEN WORLD - Advanced Simulation Engine
// Real-world geography, persistent time, dynamic economy

export interface TimeEngine {
  currentTick: number;
  getCurrentTime(): Date;
  advance(time: { hours: number; minutes: number }): void;
}

export interface WeatherState {
  temp: number;
  condition: string;
  humidity: number;
  uvIndex: number;
  windSpeed: number;
}

export interface DistrictInfo {
  id: string;
  name: string;
  description: string;
  crimeRate: number;
  avgIncome: number;
  popularTimes: number[];
}

export interface GameConfig {
  startDate: Date;
  timeScale: number;
  city: string;
  state: string;
}

// Default configuration for West Memphis, AR
export const DEFAULT_CONFIG: GameConfig = {
  startDate: new Date('2024-01-01T06:00:00'),
  timeScale: 60, // 1 real second = 1 game minute
  city: 'West Memphis',
  state: 'Arkansas',
};

// District definitions
export const DISTRICTS: Record<string, DistrictInfo> = {
  downtown: {
    id: 'downtown',
    name: 'Downtown',
    description: 'The heart of West Memphis with commerce and culture',
    crimeRate: 0.3,
    avgIncome: 35000,
    popularTimes: [9, 10, 11, 12, 17, 18],
  },
  south_memphis: {
    id: 'south_memphis',
    name: 'South Memphis',
    description: 'Residential area with strong community ties',
    crimeRate: 0.5,
    avgIncome: 28000,
    popularTimes: [7, 8, 17, 18, 19],
  },
};

// Helper function to get time of day
export function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
