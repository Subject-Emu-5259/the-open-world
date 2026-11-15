// THE OPEN WORLD - Time Engine
// Strict linear time progression where seconds matter

export class TimeEngine {
  private gameTime: Date;
  private dayCount: number = 1; // Track days played
  
  constructor(startDate?: Date) {
    // Start from West Memphis, AR local time
    this.gameTime = startDate || new Date('2024-01-01T06:00:00');
  }
  
  get currentTime(): Date {
    return new Date(this.gameTime);
  }
  
  advance(duration: ActionDuration): void {
    const hours = duration.hours || 0;
    const minutes = duration.minutes || 0;
    const totalMinutes = hours * 60 + minutes;
    
    // Add time directly (no timeScale - time advances by actions only)
    this.gameTime = new Date(this.gameTime.getTime() + totalMinutes * 60 * 1000);
  }
  
  formatTime(): string {
    const d = this.gameTime;
    const hour = d.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${min} ${ampm}`;
  }
  
  formatDate(): string {
    const d = this.gameTime;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  
  formatShortDate(): string {
    const d = this.gameTime;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }
  
  getDayNumber(): number {
    return this.gameTime.getDate();
  }

  // "YYYY-MM" key for the current game-month. Lexicographic order matches
  // chronological order, which the monthly-tick watermark relies on.
  getMonthKey(): string {
    const d = this.gameTime;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  
  getDayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[this.gameTime.getDay()] || 'Sunday';
  }
  
  getDayCount(): number {
    return this.dayCount;
  }
      
  wait(duration: ActionDuration): void {
    this.advance(duration);
  }
  
  isWeekend(): boolean {
    const day = this.gameTime.getDay();
    return day === 0 || day === 6;
  }
  
  getTimeOfDay(): TimeOfDay {
    const hour = this.gameTime.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }
  
  getHour(): number {
    return this.gameTime.getHours();
  }
  
  getMinute(): number {
    return this.gameTime.getMinutes();
  }
  
  isDaytime(): boolean {
    const hour = this.getHour();
    return hour >= 6 && hour < 20;
  }
}

export interface ActionDuration {
  hours: number;
  minutes: number;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

// Real-world weather data for West Memphis, AR
// v0.108.9 fix (minor 11): weather is rolled ONCE per game-day per city
// and cached for that day, so the header and a work message can no longer
// disagree within one response. The first roll of the day (including its
// night adjustment) stands for the whole game-day.
const weatherCache = new Map<string, WeatherState>();
export function getWeather(date: Date, city: string): WeatherState {
  const cacheKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}|${city}`;
  // v0.108.12 fix: prune stale game-days. The cache was keyed per game-day
  // per city and never pruned, so it grew for the lifetime of the server
  // process. Only the current game-day's entries can ever be read again.
  const dayPrefix = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  for (const key of weatherCache.keys()) {
    if (!key.startsWith(dayPrefix)) weatherCache.delete(key);
  }
  const cached = weatherCache.get(cacheKey);
  if (cached) return cached;
  const month = date.getMonth();
  const hour = date.getHours();
  
  // Simplified seasonal weather for Mid-South
  let temp: number, condition: WeatherCondition;
  
  if (month >= 3 && month <= 5) { // Spring
    temp = 65 + Math.floor(Math.random() * 20);
    const roll = Math.random();
    condition = roll > 0.75 ? 'foggy' : roll > 0.45 ? 'rainy' : 'clear';
  } else if (month >= 6 && month <= 8) { // Summer
    temp = 85 + Math.floor(Math.random() * 15);
    const roll = Math.random();
    condition = roll > 0.8 ? 'stormy' : roll > 0.6 ? 'humid' : roll > 0.45 ? 'windy' : 'hot';
  } else if (month >= 9 && month <= 11) { // Fall
    temp = 55 + Math.floor(Math.random() * 20);
    const roll = Math.random();
    condition = roll > 0.7 ? 'windy' : roll > 0.55 ? 'foggy' : roll > 0.3 ? 'clear' : 'cloudy';
  } else { // Winter
    temp = 35 + Math.floor(Math.random() * 25);
    const roll = Math.random();
    condition = roll > 0.75 ? 'snowy' : roll > 0.5 ? 'rainy' : 'cold';
  }
  
  // Night adjustment
  if (hour >= 20 || hour < 6) temp -= 15;
  
  const rolled: WeatherState = { temp, condition, humidity: 50 + Math.floor(Math.random() * 40) };
  weatherCache.set(cacheKey, rolled);
  return rolled;
}

export interface WeatherState {
  temp: number;
  condition: WeatherCondition;
  humidity: number;
}

export type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'hot' | 'cold' | 'foggy' | 'snowy' | 'windy' | 'humid';
