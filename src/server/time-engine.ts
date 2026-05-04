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
  
  getDayName(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[this.gameTime.getDay()] || 'Sunday';
  }
  
  getDayCount(): number {
    return this.dayCount;
  }
  
  advanceToNextDay(): void {
    // Advance to 6 AM next day
    const current = this.gameTime;
    const nextDay = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 6, 0, 0, 0);
    this.gameTime = nextDay;
    this.dayCount++;
  }
  
  advanceToTime(hour: number, minute: number = 0): void {
    const current = this.gameTime;
    let newTime = new Date(current.getFullYear(), current.getMonth(), current.getDate(), hour, minute, 0, 0);
    if (newTime <= current) {
      newTime = new Date(newTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours if time already passed
      this.dayCount++;
    }
    this.gameTime = newTime;
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
export function getWeather(date: Date, city: string): WeatherState {
  const month = date.getMonth();
  const hour = date.getHours();
  
  // Simplified seasonal weather for Mid-South
  let temp: number, condition: WeatherCondition;
  
  if (month >= 3 && month <= 5) { // Spring
    temp = 65 + Math.floor(Math.random() * 20);
    condition = Math.random() > 0.6 ? 'rainy' : 'clear';
  } else if (month >= 6 && month <= 8) { // Summer
    temp = 85 + Math.floor(Math.random() * 15);
    condition = Math.random() > 0.7 ? 'stormy' : 'hot';
  } else if (month >= 9 && month <= 11) { // Fall
    temp = 55 + Math.floor(Math.random() * 20);
    condition = Math.random() > 0.5 ? 'clear' : 'cloudy';
  } else { // Winter
    temp = 35 + Math.floor(Math.random() * 25);
    condition = Math.random() > 0.7 ? 'rainy' : 'cold';
  }
  
  // Night adjustment
  if (hour >= 20 || hour < 6) temp -= 15;
  
  return { temp, condition, humidity: 50 + Math.floor(Math.random() * 40) };
}

export interface WeatherState {
  temp: number;
  condition: WeatherCondition;
  humidity: number;
}

export type WeatherCondition = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'hot' | 'cold';
