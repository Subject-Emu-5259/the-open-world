// THE OPEN WORLD - Main Game Engine
// Version: 0.96.0

import { TimeEngine, getWeather } from './time-engine.js';
import { JOB_MARKET } from './economy-engine.js';
import { CommHub, generateInitialMessages } from './comm-hub.js';
import { SocialEngine } from './social-engine.js';
import { PropertyEngine } from './property-engine.js';
import type { Property, Investment } from './property-engine.js';
import { StorylineEngine } from './storyline-engine.js';
import { ConversationEngine } from './conversation-engine.js';
import { WORLD_CITIES } from '../shared/world-data.js';
import { AchievementEngine } from './achievements.js';
import type { SerializableAchievements } from './achievements.js';
import { SchoolEngine } from './school-engine.js';
import { VehicleService } from './vehicle-service.js';
import { RacingService, RACE_TRACKS } from './racing-service.js';
import { getJobsByCity } from './jobs-database.js';

export { GAME_VERSION } from '../shared/version.js';

export interface Skill {
  level: number;
  xp: number;
}

export interface PlayerState {
  name: string;
  city: string;
  district: string;
  money: number;
  bankBalance: number;
  health: number;
  energy: number;
  happiness: number;
  stress: number;
  fitness: number;
  intelligence: number;
  charisma: number;
  reputation: { professional: number; social: number; criminal: number; community: number };
  heat: number; // New: Track police attention. Increases with crimes, decays over time.
  background: string;
  job: any;
  inventory: any[];
  vehicles: any[];
  properties: Property[];
  investments: Investment[];
  relationships: Map<string, number>;
  createdAt: number;
  lastActive: number;
  currentConversation?: any;
  incarcerated: boolean;
  sentenceEnd?: number;
  prisonRecord: {
    arrests: number;
    timeServed: number;
    paroleEligible: boolean;
  };
  criminalRecord: string[]; // Track history of offenses
  achievements?: SerializableAchievements;
  visitedCities?: string[];
  workDaysCompleted?: number;
  skills: Record<string, Skill>;
  certifications: string[];
  specialization: string | null;
  enrolledCourse?: {
    schoolId: string;
    courseId: string;
    hoursCompleted: number;
    totalHours: number;
  };
}

export interface GameAction { success: boolean; message: string; data?: any; npcName?: string; }

export interface BackgroundConfig {
  id: string;
  name: string;
  startingMoney: number;
  bonuses: { stat: string; value: number }[];
  description: string;
}

export const BACKGROUNDS: BackgroundConfig[] = [
  { id: 'working_class', name: 'Working Class', startingMoney: 400, bonuses: [{ stat: 'fitness', value: 5 }], description: 'Blue-collar roots. Strong work ethic.' },
  { id: 'student', name: 'Student', startingMoney: 150, bonuses: [{ stat: 'intelligence', value: 5 }, { stat: 'charisma', value: 3 }], description: 'Fresh out of school. Book smart.' },
  { id: 'corporate', name: 'Corporate', startingMoney: 900, bonuses: [{ stat: 'charisma', value: 5 }], description: 'White-collar background. Connected.' },
  { id: 'hustler', name: 'Hustler', startingMoney: 300, bonuses: [{ stat: 'charisma', value: 5 }, { stat: 'fitness', value: 3 }], description: 'Street smart. Knows how to grind.' },
  { id: 'creative', name: 'Creative', startingMoney: 250, bonuses: [{ stat: 'charisma', value: 5 }, { stat: 'intelligence', value: 3 }], description: 'Artist soul. Thinks different.' },
  { id: 'unemployed', name: 'Unemployed', startingMoney: 50, bonuses: [{ stat: 'fitness', value: 5 }, { stat: 'energy', value: 10 }], description: 'Starting from nothing. Hungry.' },
];

export class GameEngine {
  private time: TimeEngine;
  private comm: CommHub;
  private social: SocialEngine;
  private property: PropertyEngine;
  private storyline: StorylineEngine;
  private conversation: ConversationEngine;
  private achievementEngine: AchievementEngine;
  private schools: SchoolEngine;
  private vehicleService: VehicleService;
  private racingService: RacingService;
  public player: any;

  constructor() {
    this.time = new TimeEngine();
    this.comm = new CommHub();
    this.social = new SocialEngine();
    this.property = new PropertyEngine();
    this.storyline = new StorylineEngine();
    this.conversation = new ConversationEngine();
    this.achievementEngine = new AchievementEngine();
    this.schools = new SchoolEngine();
    this.vehicleService = new VehicleService();
    this.racingService = new RacingService();
    this.player = this.initPlayer();
    generateInitialMessages(this.comm);
  }

  private initPlayer(): any {
    return {
      name: 'Traveler',
      city: 'west_memphis',
      district: 'downtown',
      money: 500.00,
      bankBalance: 0.00,
      health: 100,
      energy: 100,
      happiness: 80,
      stress: 20,
      fitness: 50,
      intelligence: 50,
      charisma: 50,
      reputation: { professional: 0, social: 0, criminal: 0, community: 0 },
      background: 'working_class',
      job: null,
      inventory: [],
      vehicles: [],
      properties: [],
      investments: [],
      relationships: new Map(),
      createdAt: Date.now(),
      lastActive: Date.now(),
      incarcerated: false,
      prisonRecord: { arrests: 0, timeServed: 0, paroleEligible: false },
      criminalRecord: [],
      achievements: { unlocked: [], stats: {} },
      visitedCities: ['west_memphis'],
      workDaysCompleted: 0,
      skills: {
        tech: { level: 1, xp: 0 },
        driving: { level: 1, xp: 0 },
        cooking: { level: 1, xp: 0 },
        craftsmanship: { level: 1, xp: 0 },
        finance: { level: 1, xp: 0 },
        charisma: { level: 1, xp: 0 },
        fitness: { level: 1, xp: 0 },
        stealth: { level: 1, xp: 0 },
        combat: { level: 1, xp: 0 }
      },
      certifications: [],
      specialization: null,
      factions: []
    };
  }

  private addSkillXP(skillName: string, amount: number): string {
    if (!this.player.skills) {
      this.player.skills = {
        tech: { level: 1, xp: 0 },
        driving: { level: 1, xp: 0 },
        cooking: { level: 1, xp: 0 },
        craftsmanship: { level: 1, xp: 0 },
        finance: { level: 1, xp: 0 },
        charisma: { level: 1, xp: 0 },
        fitness: { level: 1, xp: 0 },
        stealth: { level: 1, xp: 0 },
        combat: { level: 1, xp: 0 }
      };
    }
    
    if (!this.player.skills[skillName]) {
      this.player.skills[skillName] = { level: 1, xp: 0 };
    }

    const skill = this.player.skills[skillName];
    skill.xp += amount;

    const xpToNextLevel = skill.level * 100;
    if (skill.xp >= xpToNextLevel) {
      skill.level++;
      skill.xp -= xpToNextLevel;
      return `\n🌟 **LEVEL UP!** Your ${skillName} skill is now level ${skill.level}!`;
    }
    return '';
  }

  private skills(): GameAction {
    if (!this.player.skills) return { success: false, message: "No skills data found." };
    
    let message = "📊 **YOUR SKILLS**\n" + "─".repeat(20) + "\n";
    const skills = this.player.skills as Record<string, Skill>;
    
    for (const [name, data] of Object.entries(skills)) {
      const progressBar = this.generateProgressBar(data.xp, data.level * 100);
      const skillName = name.charAt(0).toUpperCase() + name.slice(1);
      message += `**${skillName}**: Lvl ${data.level} ${progressBar} (${data.xp}/${data.level * 100} XP)\n`;
    }
    
    return { success: true, message };
  }

  private generateProgressBar(current: number, total: number): string {
    const bars = 10;
    const progress = Math.min(bars, Math.max(0, Math.round((current / total) * bars)));
    return '🟩'.repeat(progress) + '⬜'.repeat(bars - progress);
  }

  applyBackground(backgroundId: string): void {
    const bg = BACKGROUNDS.find(b => b.id === backgroundId);
    if (!bg) return;
    
    this.player.background = backgroundId;
    this.player.money = bg.startingMoney;
    
    for (const bonus of bg.bonuses) {
      if (bonus.stat in this.player) {
        this.player[bonus.stat] = Math.min(100, (this.player[bonus.stat] || 0) + bonus.value);
      }
    }
  }

  // === WORK SYSTEM ===
  work(): GameAction {
    if (!this.player.job) {
      return { success: false, message: "You don't have a job. Use 'apply' to see openings." };
    }
    if (this.player.energy < 20) {
      return { success: false, message: "Too tired. Rest first." };
    }

    const weather = getWeather(this.time.currentTime, this.player.city);
    let weatherModifier = 1.0;

    if (weather.condition === 'stormy' || weather.condition === 'rainy') {
      weatherModifier = 0.85;
    } else if (weather.condition === 'hot') {
      weatherModifier = 0.95;
    }

    const shiftHours = 8;
    const hourlyRate = this.player.job.hourlyPay || (this.player.job.basePay / 2080);
    const grossPay = hourlyRate * shiftHours * weatherModifier;
    
    this.player.money += grossPay;
    this.player.energy = Math.max(0, this.player.energy - 35);
    this.time.advance({ hours: 8, minutes: 0 });
    this.player.workDaysCompleted = (this.player.workDaysCompleted || 0) + 1;
    this.achievementEngine.updateProgress('master_worker', 1);
    this.achievementEngine.checkAchievement('first_day', this.player);
    
    // Add skill XP based on job
    const skillName = this.player.job.skill || 'charisma';
    const levelUpMsg = this.addSkillXP(skillName, 25);
    
    return { 
      success: true, 
      message: `💼 Worked 8hr shift at ${this.player.job.employer}. Earned $${grossPay.toFixed(2)}${levelUpMsg}` 
    };
  }

  apply(): GameAction {
    const cityJobs = getJobsByCity(this.player.city);
    if (cityJobs.length === 0) {
      // Fallback to basic economy engine jobs if database is empty for this city
      const fallbackJobs = JOB_MARKET[this.player.city] || JOB_MARKET.west_memphis || [];
      const listings = fallbackJobs.map(job => `- ${job.title} @ ${job.employer}: $${(job.basePay/2080).toFixed(2)}/hr [${job.tier}]`);
      return { success: true, message: `📋 JOB LISTINGS (${this.player.city})\n${'─'.repeat(50)}\n${listings.slice(0, 10).join('\n')}\n\nType "apply [job name]" to get hired.` };
    }

    const listings = cityJobs.map(job => {
      const req = job.requirements ? ` (Req: ${job.requirements.join(', ')})` : '';
      return `- ${job.title} @ ${job.employer}: $${job.hourlyPay.toFixed(2)}/hr [${job.tier}]${req}`;
    });
    
    const cityName = this.player.city.replace('_', ' ').split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
    return { success: true, message: `📋 JOB LISTINGS (${cityName})\n${'─'.repeat(50)}\n${listings.slice(0, 15).join('\n')}\n\nType "apply [job name]" to get hired.` };
  }

  applyForJob(jobTitle: string): GameAction {
    const cityJobs = getJobsByCity(this.player.city);
    const job = cityJobs.find(j => j.title.toLowerCase().includes(jobTitle.toLowerCase()));
    
    if (!job) {
      // Fallback
      const fallbackJobs = JOB_MARKET[this.player.city] || JOB_MARKET.west_memphis || [];
      const fJob = fallbackJobs.find(j => j.title.toLowerCase().includes(jobTitle.toLowerCase()));
      if (fJob) {
        this.player.job = { ...fJob };
        return { success: true, message: `✅ Hired as ${fJob.title} at ${fJob.employer}!` };
      }
      return { success: false, message: `No job matching "${jobTitle}" in ${this.player.city}.` };
    }
    
    // Check requirements
    if (job.requirements) {
      for (const req of job.requirements) {
        if (req.includes('degree') || req.includes('certification') || req.includes('license')) {
          const hasMatch = (this.player.certifications || []).some((c: string) => {
            if (req.includes('RN') && c === 'RN_LICENSE') return true;
            if (req.includes('AI') && c.includes('AI')) return true;
            if (req.includes('IT') && c.includes('FULLSTACK')) return true;
            if (req.includes('EMT') && c === 'EMT_LICENSE') return true;
            return false;
          });
          if (!hasMatch) {
            return { success: false, message: `🚫 **REJECTED**: You don't meet the requirements for this position. Needed: ${req}. Visit a professional school to get certified.` };
          }
        }
      }
    }

    // Criminal background check
    if (this.player.prisonRecord?.paroleEligible) {
      return { success: false, message: `🚫 **REJECTED**: ${job.employer} does not hire people currently on parole.` };
    }
    if ((this.player.criminalRecord?.length || 0) > 0) {
      const restrictedTiers = ['tier3', 'tier4', 'executive', 'medical', 'government', 'law'];
      const tier = (job.tier || '').toString().toLowerCase();
      if (restrictedTiers.includes(tier)) {
        return { success: false, message: `🚫 **REJECTED**: Your criminal record prevents you from holding a trusted position like ${job.title}.` };
      }
    }

    this.player.job = { ...job };
    this.player.reputation.professional += 5;
    this.player.lastActive = Date.now();
    
    return { success: true, message: `✅ **HIRED!** Welcome to the team at ${job.employer}. You are now a ${job.title}. Type "work" to begin your first shift.` };
  }

  // === SCHOOL & STUDY SYSTEM ===
  study(): GameAction {
    const citySchools = this.schools.getSchoolsByCity(this.player.city);
    if (citySchools.length === 0) {
      return { 
        success: true, 
        message: `📚 **Library Study**\nNo professional schools in ${this.player.city} currently. You can still study at the local library for $25.\n\nType "study library" to proceed.` 
      };
    }

    let message = `🎓 **PROFESSIONAL SCHOOLS (${this.player.city})**\n${'─'.repeat(50)}\n`;
    citySchools.forEach(school => {
      message += `**${school.name}** (${school.district})\n   ${school.description}\n`;
      school.courses.forEach(course => {
        const req = course.requirement ? ` [Req: ${course.requirement.skill} Lvl ${course.requirement.level}]` : '';
        message += `   • ${course.name} - $${course.cost} (${course.durationHours} hrs)${req}\n`;
      });
      message += '\n';
    });

    message += `To enroll, type "enroll [school_id] [course_id]".\nExample: "enroll maestro_college ai_foundation"`;
    return { success: true, message };
  }

  enroll(args: string): GameAction {
    if (!args) return { success: false, message: "Usage: enroll [school_id] [course_id]" };
    const parts = args.split(' ');
    const schoolId = parts[0] || '';
    const courseId = parts[1] || '';
    
    const course = this.schools.getCourse(schoolId, courseId);
    if (!course) return { success: false, message: "Invalid school or course ID." };

    if (this.player.money < course.cost) {
      return { success: false, message: `Insufficient funds. Course costs $${course.cost}.` };
    }

    if (course.requirement) {
      const skill = this.player.skills[course.requirement.skill];
      if (!skill || skill.level < course.requirement.level) {
        return { success: false, message: `Requirements not met: ${course.requirement.skill} Level ${course.requirement.level} needed.` };
      }
    }

    this.player.money -= course.cost;
    this.player.enrolledCourse = {
      schoolId,
      courseId,
      hoursCompleted: 0,
      totalHours: course.durationHours
    };

    return { 
      success: true, 
      message: `✅ **Enrolled in ${course.name}!**\nCost: $${course.cost} paid. You need to complete ${course.durationHours} hours of study to graduate.\n\nUse "study hours [number]" to progress.` 
    };
  }

  studyHours(hoursStr: string): GameAction {
    if (!this.player.enrolledCourse) {
      if (hoursStr === 'library' || !hoursStr) {
         // Fallback to library study
         if (this.player.money < 25) return { success: false, message: "Need $25 for library card." };
         this.player.money -= 25;
         this.player.intelligence = Math.min(100, this.player.intelligence + 2);
         this.player.energy = Math.max(0, this.player.energy - 15);
         this.time.advance({ hours: 3, minutes: 0 });
         const levelUpMsg = this.addSkillXP('tech', 20);
         return { success: true, message: `Studied at library. INT +2${levelUpMsg}.` };
      }
      return { success: false, message: "You aren't enrolled in any course. Use 'study' to see options." };
    }

    const hours = parseInt(hoursStr) || 1;
    if (this.player.energy < hours * 5) {
      return { success: false, message: "Not enough energy for that much studying. Rest first." };
    }

    const courseData = this.player.enrolledCourse;
    const course = this.schools.getCourse(courseData.schoolId, courseData.courseId);
    if (!course) return { success: false, message: "Course data error." };

    const hoursToApply = Math.min(hours, courseData.totalHours - courseData.hoursCompleted);
    courseData.hoursCompleted += hoursToApply;
    this.player.energy -= hoursToApply * 5;
    this.time.advance({ hours: hoursToApply, minutes: 0 });
    this.player.intelligence = Math.min(100, this.player.intelligence + (course.intelligenceGain * (hoursToApply / course.durationHours)));

    let message = `📖 Studied for ${hoursToApply} hours on ${course.name}. Progress: ${courseData.hoursCompleted}/${courseData.totalHours} hrs.`;

    if (courseData.hoursCompleted >= courseData.totalHours) {
      if (!this.player.certifications) this.player.certifications = [];
      this.player.certifications.push(course.rewardCertification);
      this.player.enrolledCourse = undefined;
      message += `\n\n🎓 **GRADUATION!** You have earned your **${course.rewardCertification.replace(/_/g, ' ')}**! New career opportunities unlocked.`;
      
      // Automatic specialization for major degrees
      if (course.id === 'ai_software_eng') {
        this.player.specialization = 'AI Software Engineer';
        message += `\n🌟 Your specialization is now: **AI Software Engineer**`;
      }
    }

    return { success: true, message };
  }

  // === STATUS & INFO ===
  status(): GameAction {
    const weather = getWeather(this.time.currentTime, this.player.city);
    const job = this.player.job ? `${this.player.job.title} @ ${this.player.job.employer}` : 'Unemployed';
    const bg = BACKGROUNDS.find(b => b.id === this.player.background);
    const netWorth = this.calculateNetWorth();
    
    return { 
      success: true, 
      message: `${this.player.name} | ${bg?.name || 'Unknown Background'}
📍 ${this.player.city.replace('_', ' ').replace('memphis', 'Memphis, TN').replace('littlerock', 'Little Rock, AR').replace('west memphis', 'West Memphis, AR')}
💰 Cash: $${this.player.money.toFixed(2)} | 🏦 Bank: $${this.player.bankBalance.toFixed(2)} | 💎 Net Worth: $${netWorth.toLocaleString()}
⚡ Energy: ${this.player.energy}/100 | ❤️ Health: ${this.player.health}/100 | 😊 Happy: ${this.player.happiness}/100
🧠 INT: ${this.player.intelligence} | 💪 FIT: ${this.player.fitness} | 😎 CHA: ${this.player.charisma}
💼 Job: ${job}${this.player.prisonRecord.arrests > 0 ? `\n🚨 Criminal Record: ${this.player.prisonRecord.arrests} arrests` : ''}
🕐 ${this.time.formatTime()} | ${this.time.formatDate()} | 🌡️ ${weather.temp}°F ${weather.condition}` 
    };
  }

  help(): GameAction {
    return { 
      success: true, 
      message: `\ud83c\udfae **THE OPEN WORLD - Commands**
${'\u2500'.repeat(50)}

**\ud83d\udccd Movement**
\u2022 travel [city] - Go to another city
\u2022 explore - Look around current area
\u2022 goto [district] - Move to a district

**\ud83d\udcbc Work & Money**
\u2022 apply - See job listings
\u2022 apply [job] - Get hired
\u2022 work - Work a shift (8 hrs)
\u2022 bank - Check bank balance
\u2022 deposit [amount] - Put cash in bank
\u2022 withdraw [amount] - Take cash out

**\ud83c\udfe0 Property & Wealth**
\u2022 real-estate - View properties
\u2022 buy property [name]
\u2022 sell property [name]
\u2022 properties - Your portfolio
\u2022 renovate property [name] - Upgrade a property ($)
\u2022 invest - Investment options
\u2022 investments - Your investments
\u2022 vehicles - Your garage
\u2022 buy vehicle [type] - Purchase a vehicle
\u2022 sell vehicle [name] - Sell a vehicle
\u2022 maintain [name] - Perform maintenance ($)
\u2022 repair vehicle [name] - Full repair ($$)

**\ud83d\udc65 Social & Comms**\u2022 race - View race tracks
\u2022 race [track] - Enter a street/circuit race ($$)

\u2022 people - See who's around
\u2022 talk [name] - Chat with NPC
\u2022 greet [name] - Say hello
\u2022 contacts - View saved contacts
\u2022 factions - View your groups
\u2022 influence - View faction power
\u2022 support [id] - Help your faction
\u2022 sabotage [id] - Attack a rival
\u2022 chat [id] - Enter group chat
\u2022 email - Check inbox & commands
\u2022 text [name] [msg] - Send SMS

**\ud83c\udf93 Education & Self**
\u2022 enroll [school_id] [course_id] - Start a program
\u2022 study hours [n] - Progress your course
\u2022 gym - Workout ($15, FIT +2)

**\ud83d\udcd6 Info**
\u2022 status - Your life snapshot
\u2022 help - This list
\u2022 sleep - Rest 8 hours
\u2022 event - Active events

**\ud83d\udca1 Tips**
\u2022 Weather affects work pay
\u2022 Sleep to restore energy
\u2022 Explore to find NPCs` 
    };
  }

  // === EXPLORATION & MOVEMENT ===
  explore(): GameAction {
    const weather = getWeather(this.time.currentTime, this.player.city);
    this.player.energy = Math.max(0, this.player.energy - 10);
    this.time.advance({ hours: 1, minutes: 0 });
    
    this.triggerCommunication(); // Living world update

    // Get NPCs in current location
    const npcsHere = this.social.getNPCByLocation(
      this.player.district, 
      this.time.getHour(), 
      this.time.currentTime.getDay()
    );
    
    let npcList = '';
    if (npcsHere.length > 0) {
      const names = npcsHere.slice(0, 5).map(n => n.name);
      npcList = `\n\n👥 People here: ${names.join(', ')}${npcsHere.length > 5 ? ` (+${npcsHere.length - 5} more)` : ''}`;
    }
    
    // Check for random event
    const randomEvent = this.storyline.generateRandomEvent(this.player);
    if (randomEvent) {
      this.storyline.activateEvent(randomEvent);
      return { 
        success: true, 
        message: `Exploring ${this.player.district.replace('_', ' ')}. ${weather.temp}°F, ${weather.condition}.${npcList}\n\n🎬 **Event: ${randomEvent.title}**\n${randomEvent.description}\n\nType "event" to see choices.`
      };
    }
    
    return { success: true, message: `Exploring ${this.player.district.replace('_', ' ')}. ${weather.temp}°F, ${weather.condition}. Energy: ${this.player.energy}/100${npcList}` };
  }

  goto(district: string): GameAction {
    const normalized = district.toLowerCase().replace(/\s+/g, '_');
    // Basic validation - could expand to check valid districts for current city
    this.player.district = normalized;
    this.player.energy = Math.max(0, this.player.energy - 5);
    this.time.advance({ hours: 0, minutes: 30 });
    return { success: true, message: `🚶 Moved to ${normalized.replace('_', ' ')}.` };
  }

  // === NPC & SOCIAL SYSTEM ===
  people(): GameAction {
    const npcs = this.social.getNPCByCity(this.player.city);
    // Prefer NPCs in the same district, but show everyone in the city as a fallback
    // (some legacy NPC records have invalid/undefined districts).
    const districtNpcs = npcs.filter(n => n.district === this.player.district);
    const shownNpcs = districtNpcs.length > 0 ? districtNpcs : npcs;

    if (shownNpcs.length === 0) {
      return { success: true, message: `No one around right now. Try exploring or visiting different districts.` };
    }

    const list = shownNpcs.slice(0, 8).map(n => {
      const rel = n.relationship > 0 ? ` (+${n.relationship})` : n.relationship < 0 ? ` (${n.relationship})` : '';
      const here = n.district === this.player.district ? '' : ` — ${n.district?.replace(/_/g, ' ') || 'nearby'}`;
      return `• ${n.name} - ${n.role.replace(/_/g, ' ')}${rel}${here}`;
    }).join('\n');

    const header = districtNpcs.length > 0 ? this.player.district.replace('_', ' ') : this.player.city.replace('_', ' ');
    return { success: true, message: `👥 **People in ${header}**\n${'─'.repeat(40)}\n${list}\n\nType "talk [name]" to interact.` };
  }

  talk(name: string): GameAction {
    const nearby = this.social.getNPCByCity(this.player.city);

    if (!name.trim()) {
      if (nearby.length === 0) {
        return { success: true, message: `No one stands out nearby. Try "people" to see who's around.` };
      }
      const list = nearby.slice(0, 5).map(n => `• ${n.name}`).join('\n');
      return { success: true, message: `👥 **Who do you want to talk to?**\n${'-'.repeat(40)}\n${list}\n\nType "talk [name]".` };
    }

    const npc = nearby.find(n =>
      n.name.toLowerCase().includes(name.toLowerCase()) ||
      n.firstName.toLowerCase().includes(name.toLowerCase()) ||
      n.id.toLowerCase() === name.toLowerCase()
    );

    if (!npc) {
      return { success: false, message: `No one named "${name}" is around right now. Try "people" or "travel" to another city.` };
    }

    // Auto-add to contacts
    this.comm.addContact({
      id: npc.id,
      name: npc.name,
      phone: `555-${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
      email: `${npc.firstName.toLowerCase()}.${npc.lastName.toLowerCase()}@example.com`,
      isFavorite: false
    });

    // Initialize relationship on first meeting
    if (!this.player.relationships[npc.id]) {
      this.player.relationships[npc.id] = {
        value: 0,
        flags: [],
        metAt: Date.now(),
        lastInteracted: Date.now(),
        memory: [],
      };
      this.achievementEngine.updateProgress('first_introduction', 1);
      this.achievementEngine.updateProgress('networker', 1);
      this.achievementEngine.updateProgress('socialite', 1);

      const knownCities = new Set<string>();
      for (const relNpcId of Object.keys(this.player.relationships)) {
        const relNpc = this.social.getNPCById(relNpcId);
        if (relNpc) knownCities.add(relNpc.city);
      }
      const previous = this.achievementEngine.getProgress('city_hopper');
      this.achievementEngine.updateProgress('city_hopper', knownCities.size - previous);
    }

    const rel = this.player.relationships[npc.id]!;
    this.player.currentConversation = { npcId: npc.id, npcName: npc.name };

    // NPC speaks first so "talk" doesn't feel like talking to a bot
    const timeCtx = undefined;
    const opening = this.conversation.generateGreeting(npc, this.player, rel, timeCtx);
    rel.value = Math.max(-100, Math.min(100, rel.value + opening.relationshipChange));
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;

    return {
      success: true,
      message: `You walk up to ${npc.name} and they respond:\n\n${opening.text}\n\n_Say anything to continue. Type "bye" or "end" to leave._`,
      npcName: npc.name,
    };
  }
  
  continueConversation(input: string): GameAction {
    const conv = this.player.currentConversation;
    if (!conv) return { success: false, message: "You aren't in a conversation." };

    const npc = this.social.getNPCById(conv.npcId);
    if (!npc) return { success: false, message: "The person you were talking to disappeared." };

    // Exit conversation naturally
    const lower = input.toLowerCase().trim();
    if (['bye', 'goodbye', 'see ya', 'peace', 'later', 'end', 'leave', 'exit', 'gotta go'].includes(lower)) {
      this.player.currentConversation = null;
      return {
        success: true,
        message: `${npc.name} nods. "Take care." You step away from the conversation.`,
        npcName: npc.name,
      };
    }

    const relationship = this.player.relationships[npc.id];
    if (!relationship) {
      this.player.relationships[npc.id] = {
        value: 0,
        flags: [],
        metAt: Date.now(),
        lastInteracted: Date.now(),
        memory: [],
      };
    }
    const rel = this.player.relationships[npc.id]!;

    const timeCtx = undefined;
    const response = this.conversation.generateResponse(npc, input, this.player, rel, timeCtx);

    // Update relationship
    rel.value = Math.max(-100, Math.min(100, rel.value + response.relationshipChange));
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;

    // Remember the exchange
    rel.memory.push({ role: 'player', content: input, timestamp: Date.now() });
    rel.memory.push({ role: 'npc', content: response.text, timestamp: Date.now() });
    if (rel.memory.length > 20) rel.memory = rel.memory.slice(-20);
    
    let finalMessage = response.text;
    
    // Handle Quest Trigger
    if (response.questTriggered) {
      const questId = response.questTriggered;
      const quest = npc.quests?.find(q => q.id === questId);
      if (quest) {
        this.storyline.startQuest(this.player, npc, quest);
        finalMessage += `\n\n🎁 **Quest Started: ${quest.title}**\n${quest.description}`;
      }
    }
    
    return { 
      success: true, 
      message: finalMessage, 
      npcName: npc.name 
    };
  }
  
  endConversation(): GameAction {
    if (!this.player.currentConversation) {
      return { success: false, message: 'You\'re not in a conversation.' };
    }
    
    const conv = this.player.currentConversation;
    const npc = this.social.getNPCById(conv.npcId);
    this.player.currentConversation = null;
    
    if (npc) {
      return { success: true, message: `You wave goodbye to ${npc.name}. Conversation ended.` };
    }
    
    return { success: true, message: 'Conversation ended.' };
  }

  greet(npcName: string): GameAction {
    return this.talk(npcName);
  }

  helpNPC(npcName: string): GameAction {
    if (!npcName) return { success: false, message: 'Help whom? Type "people" to see who\'s around.' };
    
    const npcs = this.social.getAllNPCs();
    const npc = npcs.find(n => n.name.toLowerCase().includes(npcName.toLowerCase()));
    
    if (!npc) {
      return { success: false, message: `No one named "${npcName}" found.` };
    }
    
    const result = this.social.interact(npc.id, { type: 'help' });
    
    if (!this.player.relationships) this.player.relationships = new Map();
    const currentRel = this.player.relationships.get(npc.id) || 0;
    this.player.relationships.set(npc.id, currentRel + (result.relationshipChange || 0));
    
    this.player.reputation.community += 1;
    
    return { success: result.success, message: result.message };
  }

  // === REST & RECOVERY ===
  sleep(): GameAction {
    if (this.player.energy >= 100) {
      return { success: false, message: "You're fully rested." };
    }
    
    this.player.energy = 100;
    this.player.stress = Math.max(0, this.player.stress - 20);
    this.player.happiness = Math.min(100, this.player.happiness + 5);
    this.time.advance({ hours: 8, minutes: 0 });
    
    this.triggerCommunication(); // Living world update
    
    return { success: true, message: `😴 Slept for 8 hours. Energy restored to 100. Stress decreased.` };
  }

  gym(): GameAction {
    if (this.player.money < 15) return { success: false, message: "Need $15 for gym day pass." };
    this.player.money -= 15;
    this.player.fitness = Math.min(100, this.player.fitness + 2);
    this.player.energy = Math.max(0, this.player.energy - 20);
    this.player.stress = Math.max(0, this.player.stress - 5);
    this.time.advance({ hours: 2, minutes: 0 });
    
    const levelUpMsg = this.addSkillXP('fitness', 20);
    
    return { success: true, message: `Workout complete. FIT +2 (now ${this.player.fitness})${levelUpMsg}. Stress -5. Energy: ${this.player.energy}/100` };
  }

  // === TRAVEL ===
  travelTo(city: string): GameAction {
    const cityIds = Object.keys(WORLD_CITIES) as string[];
    const cityData = cityIds.find(id => 
      id === city || 
      WORLD_CITIES[id as keyof typeof WORLD_CITIES]?.displayName?.toLowerCase().includes(city.toLowerCase())
    );
    
    if (!cityData) return { success: false, message: `City "${city}" not found. Try: memphis, littlerock, southaven, nashville, atlanta, chicago, etc.` };
    
    const data = WORLD_CITIES[cityData as keyof typeof WORLD_CITIES];
    this.player.city = cityData;
    this.player.district = 'downtown';

    if (!this.player.visitedCities) this.player.visitedCities = ['west_memphis'];
    if (!this.player.visitedCities.includes(cityData)) {
      this.player.visitedCities.push(cityData);
      this.achievementEngine.updateProgress('traveler', this.player.visitedCities.length);
      this.achievementEngine.updateProgress('jetsetter', this.player.visitedCities.length);
      this.achievementEngine.updateProgress('world_traveler', this.player.visitedCities.length);
    }
    // International city progress
    const internationalCities = ['london', 'tokyo', 'paris', 'berlin', 'dubai', 'mexico_city', 'toronto', 'sydney'];
    const visitedInternational = this.player.visitedCities.filter((c: string) => internationalCities.includes(c)).length;
    this.achievementEngine.updateProgress('global_citizen', visitedInternational);
    this.achievementEngine.updateProgress('passport_collector', visitedInternational);
    // Check non-progress travel achievements
    this.achievementEngine.checkAchievement('international', this.player);
    this.achievementEngine.checkAchievement('continental', this.player);
    this.achievementEngine.checkAchievement('coast_to_coast', this.player);

    this.time.advance({ hours: 2, minutes: 0 });
    this.player.energy = Math.max(0, this.player.energy - 10);
    
    // Atmospheric Arrival Messages
    let arrivalMsg = `\ud83d\ude97 Arrived in ${data.displayName}.`;
    
    const greetings: Record<string, string[]> = {
      london: [
        'The red double-decker buses and historic skyline greet you. "Mind the gap," someone whispers.',
        'Fog rolls over the Thames as you arrive in the heart of the British Empire.',
        'The bustling energy of Piccadilly Circus welcomes you to the Big Smoke.'
      ],
      tokyo: [
        'Neon lights and organized chaos surround you. The city hums with high-tech energy.',
        'You step into a sea of people in Shibuya Crossing, the heartbeat of the world\'s largest city.',
        'The serene shrines and towering skyscrapers create a unique contrast as you arrive.'
      ],
      paris: [
        'The smell of fresh baguettes and the elegant architecture make it clear you\'re in the City of Light.',
        'The Eiffel Tower looms in the distance, a beacon of romance and art.',
        'Cobblestone streets and cozy cafes welcome you to the heart of France.'
      ],
      berlin: [
        'Vibrant street art and a gritty, creative energy pulse through the air.',
        'The echoes of history and the beat of techno define your arrival in the German capital.',
        'A city of contrast, where brutalist architecture meets avant-garde galleries.'
      ],
      dubai: [
        'Shimmering skyscrapers and luxury cars define the horizon in this desert oasis.',
        'The heat is intense, but the ambition of this city is even hotter.',
        'You arrive in a world of gold, glass, and gravity-defying architecture.'
      ],
      mexico_city: [
        'The vibrant colors and rich aromas of street food tell you you\'ve arrived in the heart of Mexico.',
        'A sprawling metropolis where ancient ruins and modern skyscrapers coexist.',
        'The energy of the Zócalo greets you with a whirlwind of music and culture.'
      ],
      toronto: [
        'A clean, modern skyline and friendly faces welcome you to Canada\'s largest hub.',
        'The CN Tower pierces the clouds, guiding you into the diverse heart of Ontario.',
        'A crisp breeze from Lake Ontario greets you as you step into the 6ix.'
      ],
      sydney: [
        'The salty sea breeze and the iconic silhouette of the Opera House welcome you down under.',
        'Bright sunshine and turquoise waters make Sydney feel like a permanent vacation.',
        'The laid-back vibe of the harbor greets you as you arrive in the Emerald City.'
      ],
      new_york: [
        'The concrete jungle surrounds you. You feel the frantic pace of the center of the world.',
        'Taxis honking and towering skyscrapers—welcome to the city that never sleeps.',
        'The electric energy of Times Square hits you like a wave upon arrival.'
      ],
      los_angeles: [
        'Palm trees and sunshine. The Hollywood sign peeks through the haze.',
        'The sprawl of the city and the promise of fame hang in the warm California air.',
        'Traffic, beaches, and movie stars—you\'ve arrived in the City of Angels.'
      ],
      chicago: [
        'Wind sweeps through the skyscrapers. The lake looks like an ocean from here.',
        'Deep-dish pizza and architectural marvels define the Windy City\'s welcome.',
        'The roar of the L-train echoes through the streets as you arrive.'
      ],
      memphis: [
        'The sound of blues and the smell of BBQ fill the air. Welcome to the Bluff City.',
        'The spirit of Elvis and the flow of the Mississippi define your arrival.',
        'Gritty, soulful, and authentic—Memphis welcomes you home.'
      ],
      nashville: [
        'Country music drifts from every doorway. Welcome to Music City.',
        'The neon lights of Broadway signal your arrival in the heart of songwriting.',
        'A blend of rhinestone and rustic charm welcomes you to Nashville.'
      ],
      atlanta: [
        'The busy airport and sprawling greenery welcome you to the capital of the South.',
        'Hip-hop beats and corporate power clash and blend in the Peach State\'s hub.',
        'The skyline of the A rises before you, promising opportunity and culture.'
      ],
      west_memphis: [
        'The quiet hum of the border town greets you where Arkansas meets the Mississippi.',
        'Trucks roll past and the water tower watches over familiar streets.',
        'You cross the bridge and feel the slower pace of small-town life.'
      ],
      littlerock: [
        'The dome of the State Capitol shines above the Arkansas River.',
        'A blend of government, history, and Southern hospitality awaits.',
        'You arrive in the Natural State\'s polished capital.'
      ],
      southaven: [
        'Suburban quiet spreads in every direction, just a short drive from Memphis.',
        'Well-kept neighborhoods and growing businesses signal a family-friendly stop.',
        'You arrive in a town that feels like home with room to grow.'
      ],
      new_orleans: [
        'Jazz spills into the street as the humid air wraps around you.',
        'The scent of Creole cooking and the sound of brass bands mark your arrival.',
        'You step into a city where every day feels like a celebration.'
      ],
      miami: [
        'Neon lights, ocean spray, and salsa rhythms pulse through the night.',
        'The tropical heat matches the energy of this coastal metropolis.',
        'You arrive where South Beach glamour meets Cuban soul.'
      ],
      charlotte: [
        'Banking towers rise beside Southern oak trees in the Queen City.',
        'A modern skyline meets old-school Southern charm on every corner.',
        'You arrive in one of the fastest-growing cities in the South.'
      ],
      detroit: [
        'The spirit of Motown and the roar of engines welcome you to the Motor City.',
        'Revitalized streets and gritty resilience define Detroit\'s comeback.',
        'You arrive in a city that built America and is rebuilding itself.'
      ],
      philadelphia: [
        'History echoes from cobblestone streets and Independence Hall.',
        'The aroma of cheesesteaks and the brotherly spirit surround you.',
        'You arrive in Philly, where liberty and attitude walk hand in hand.'
      ],
      las_vegas: [
        'The neon glow of the Strip lights up the desert night.',
        'Jackpot chimes, showbiz energy, and endless entertainment greet you.',
        'You arrive in a city that never stops rolling the dice.'
      ],
      houston: [
        'Space City sprawls under the Texas sun, driven by oil, tech, and ambition.',
        'Cultural diversity and Southern hospitality define this booming metropolis.',
        'You arrive where NASA dreams and Gulf Coast grit meet.'
      ],
      dallas: [
        'Cowboy boots and corporate towers share the skyline in Big D.',
        'The spirit of Texas pride is alive on every boulevard.',
        'You arrive in Dallas, where history, sports, and commerce collide.'
      ],
      phoenix: [
        'The desert sun blazes over red rock and saguaros in the Valley of the Sun.',
        'You arrive in a fast-growing oasis of heat, innovation, and southwestern spirit.',
        'Cactus-studded mountains frame the glowing sprawl below.'
      ],
      seattle: [
        'Coffee aroma, evergreen rain, and the Space Needle welcome you to the Emerald City.',
        'A tech hub tucked between Puget Sound and mist-covered mountains.',
        'You arrive where innovation meets Pacific Northwest calm.'
      ]
    };

    if (greetings[cityData]) {
      const options = greetings[cityData];
      arrivalMsg = `\ud83d\ude97 **${data.displayName}**: ${options[Math.floor(Math.random() * options.length)]}`;
    }

    // Time-of-day atmospheric detail
    const hour = this.time.currentTime.getHours();
    let timeDetail = '';
    if (hour >= 5 && hour < 12) {
      timeDetail = 'The morning light makes the city feel full of possibility.';
    } else if (hour >= 12 && hour < 17) {
      timeDetail = 'The afternoon hustle surrounds you as the city works.';
    } else if (hour >= 17 && hour < 21) {
      timeDetail = 'The golden hour settles over the streets as the day winds down.';
    } else {
      timeDetail = 'The city glows under the cover of night.';
    }
    arrivalMsg += `\n\ud83c\udf05 ${timeDetail}`;

    // Police checkpoint based on heat
    if ((this.player.heat || 0) > 50) {
      const checkpoint = this.handlePoliceEncounter(false);
      if (!checkpoint.success) {
        return checkpoint;
      }
      arrivalMsg += '\n\n' + checkpoint.message;
    }

    // Vehicle wear and tear / breakdown check
    if (this.player.vehicles && this.player.vehicles.length > 0) {
      const vehicle = this.player.vehicles[0];
      const dist = 50 + Math.random() * 150; // Miles traveled
      this.vehicleService.applyWear(vehicle, dist);
      const breakResult = this.vehicleService.attemptBreakdown(vehicle);
      if (breakResult.happened) {
        if ((breakResult.cost ?? 0) > 0) this.player.money = Math.max(0, this.player.money - breakResult.cost!);
        return {
          success: true,
          message: `🚗 ${breakResult.message} Condition fell to ${vehicle.condition}%.`
        };
      }
      if (vehicle.condition < 20) {
        return { success: true, message: `🚗 Arrived in ${data.displayName}. **WARNING**: Your ${vehicle.name} is in critical condition (${vehicle.condition}%). Maintain it soon!` };
      }
    }

    this.triggerCommunication(); // Living world update
    
    return { success: true, message: `${arrivalMsg}\n\n${data.districts?.length || 0} districts to explore. Type "explore" to look around.` };
  }

  // === PROPERTY SYSTEM ===
  realEstate(): GameAction {
    const listings = this.property.getListingsByCity(this.player.city);
    const market = this.property.getMarketReport();
    
    if (listings.length === 0) {
      return { success: true, message: `No properties available in ${this.player.city}. Try traveling to Memphis, Little Rock, or Southaven.` };
    }
    
    const list = listings.map(p => 
      `• ${p.name} - $${p.price.toLocaleString()}\n  ${p.type} in ${p.district.replace('_', ' ')} | Rent: $${p.rentalPotential}/mo\n  ${p.description}`
    ).join('\n\n');
    
    return { 
      success: true, 
      message: `🏠 **Real Estate - ${this.player.city.replace('_', ' ')}**\n${'─'.repeat(50)}\n📈 Market: ${market.trend}\n💡 ${market.recommendation}\n\n${list}\n\nType "buy property [name]" to purchase (20% down payment required).` 
    };
  }

  buyProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "real-estate" to see listings.' };
    }
    
    const listings = this.property.getAllListings();
    const listing = listings.find(l => l.name.toLowerCase().includes(propertyName.toLowerCase()));
    
    if (!listing) {
      return { success: false, message: `Property "${propertyName}" not found. Type "real-estate" to see listings.` };
    }
    
    const result = this.property.purchaseProperty(this.player, listing.id, true);
    
    if (result.success && result.data) {
      this.player.money -= result.data.cashSpent;
      this.player.properties.push(result.data.property);
    }
    
    return result;
  }

  sellProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "properties" to see your portfolio.' };
    }
    
    if (!this.player.properties || this.player.properties.length === 0) {
      return { success: false, message: 'You don\'t own any properties.' };
    }
    
    const propertyIndex = this.player.properties.findIndex((p: Property) => 
      p.name.toLowerCase().includes(propertyName.toLowerCase())
    );
    
    if (propertyIndex === -1) {
      return { success: false, message: `You don't own a property named "${propertyName}".` };
    }
    
    const property = this.player.properties[propertyIndex];
    const result = this.property.sellProperty(property, this.player);
    
    if (result.success && result.data) {
      this.player.money += result.data.netProceeds;
      this.player.properties.splice(propertyIndex, 1);
    }
    
    return result;
  }

  properties(): GameAction {
    if (!this.player.properties || this.player.properties.length === 0) {
      return { success: true, message: 'You don\'t own any properties yet. Type "real-estate" to browse listings.' };
    }
    
    const list = this.player.properties.map((p: Property) => 
      `• ${p.name} - $${p.currentValue.toLocaleString()}\n  Condition: ${p.condition}% | Rent: $${p.rentalIncome}/mo | Mortgage: $${p.mortgageRemaining.toLocaleString()}`
    ).join('\n\n');
    
    const totalValue = this.property.calculatePropertyValue(this.player.properties);
    const monthlyIncome = this.property.calculateMonthlyIncome(this.player.properties);
    const equity = this.property.calculateEquity(this.player.properties);
    
    return { 
      success: true, 
      message: `🏠 **Your Properties**\n${'─'.repeat(50)}\n${list}\n\n📊 Total Value: $${totalValue.toLocaleString()}\n💰 Monthly Net Income: $${monthlyIncome.toLocaleString()}\n Equity: $${equity.toLocaleString()}` 
    };
  }

  repairProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "properties" to see your portfolio.' };
    }
    
    const property = this.player.properties?.find((p: Property) => 
      p.name.toLowerCase().includes(propertyName.toLowerCase())
    );
    
    if (!property) {
      return { success: false, message: `Property "${propertyName}" not found in your portfolio.` };
    }
    
    return this.property.repairProperty(property, this.player);
  }

    // === PROPERTY RENOVATION ===
  renovateProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "properties" to see your portfolio.' };
    }
    
    const property = this.player.properties?.find((p: Property) => 
      p.name.toLowerCase().includes(propertyName.toLowerCase())
    );
    
    if (!property) {
      return { success: false, message: `Property "${propertyName}" not found in your portfolio.` };
    }
    
    return this.property.renovateProperty(property, this.player);
  }

  // === INVESTMENT SYSTEM ===
  invest(): GameAction {
    const options = this.property.getInvestmentOptions();
    const list = options.map(o => 
      `• ${o.name} (${o.type})\n  Min: $${o.minInvestment} | Risk: ${o.risk} | Return: ${o.expectedReturn}`
    ).join('\n\n');
    
    return { 
      success: true, 
      message: `📈 **Investment Options**\n${'─'.repeat(50)}\n${list}\n\nType "invest [name] [amount]" to invest.` 
    };
  }

  makeInvestment(name: string, amountStr: string): GameAction {
    const amount = parseInt(amountStr, 10);
    
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Invalid amount. Usage: invest [name] [amount]' };
    }
    
    const options = this.property.getInvestmentOptions();
    const option = options.find(o => o.name.toLowerCase().includes(name.toLowerCase()));
    
    if (!option) {
      return { success: false, message: `Investment "${name}" not found. Type "invest" to see options.` };
    }
    
    if (amount < option.minInvestment) {
      return { success: false, message: `Minimum investment for ${option.name} is $${option.minInvestment}.` };
    }
    
    const result = this.property.purchaseInvestment(this.player, option.type, option.name, amount);
    
    if (result.success && result.data) {
      this.player.money -= amount;
      this.player.investments.push(result.data.investment);
    }
    
    return result;
  }

  investments(): GameAction {
    if (!this.player.investments || this.player.investments.length === 0) {
      return { success: true, message: 'You don\'t have any investments. Type "invest" to see options.' };
    }
    
    const list = this.player.investments.map((i: Investment) => {
      const profit = i.currentValue - i.purchasePrice;
      const profitSign = profit >= 0 ? '+' : '';
      return `• ${i.name} - $${i.currentValue.toLocaleString()}\n  Invested: $${i.purchasePrice.toLocaleString()} | P/L: ${profitSign}$${profit.toLocaleString()}`;
    }).join('\n\n');
    
    const totalValue = this.player.investments.reduce((sum: number, i: Investment) => sum + i.currentValue, 0);
    const totalProfit = this.player.investments.reduce((sum: number, i: Investment) => sum + (i.currentValue - i.purchasePrice), 0);
    
    return { 
      success: true, 
      message: `📈 **Your Investments**\n${'─'.repeat(50)}\n${list}\n\n📊 Total Value: $${totalValue.toLocaleString()}\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toLocaleString()}` 
    };
  }

  sellInvestment(name: string): GameAction {
    if (!name) {
      return { success: false, message: 'Which investment? Type "investments" to see your portfolio.' };
    }
    
    const index = this.player.investments?.findIndex((i: Investment) => 
      i.name.toLowerCase().includes(name.toLowerCase())
    );
    
    if (index === undefined || index === -1) {
      return { success: false, message: `Investment "${name}" not found.` };
    }
    
    const investment = this.player.investments[index];
    const result = this.property.sellInvestment(investment);
    
    if (result.success && result.data) {
      this.player.money += result.data.proceeds;
      this.player.investments.splice(index, 1);
    }
    
    return result;
  }

  // === VEHICLE SYSTEM ===
  vehicles(): GameAction {
    if (!this.player.vehicles || this.player.vehicles.length === 0) {
      return { success: true, message: 'You don\'t own any vehicles. Type "buy vehicle [type]" to purchase.\n\nAvailable: car, truck, motorcycle, bike, luxury, sports' };
    }

    const list = this.player.vehicles.map((v: any) => {
      const risk = this.vehicleService.breakdownRisk(v);
      const overdue = this.vehicleService.overdueServices(v);
      const overdueStr = overdue.length ? ` | ⚠️ ${overdue[0]!.label} due` : '';
      return `• ${v.name} - ${v.type} | Condition: ${v.condition ?? 100}% | Value: $${this.vehicleService.currentValue(v).toLocaleString()} | Risk: ${risk}%${overdueStr}`;
    }).join('\n');

    return { success: true, message: `🚗 **Your Vehicles**\n${'─'.repeat(30)}\n${list}\n\nCommands: inspect [name] | maintain [name] | service [name] [oil|tires|brakes|tuneup|wash] | repair vehicle [name]` };
  }

  buyVehicle(type: string): GameAction {
    const prices: Record<string, { name: string; price: number }> = {
      car: { name: 'Used Sedan', price: 5000 },
      truck: { name: 'Used Pickup', price: 8000 },
      motorcycle: { name: 'Used Motorcycle', price: 3000 },
      bike: { name: 'Bicycle', price: 150 },
      luxury: { name: 'Luxury Sedan', price: 35000 },
      sports: { name: 'Sports Car', price: 25000 },
    };
    
    const vehicle = prices[type.toLowerCase()];
    if (!vehicle) {
      return { success: false, message: `Unknown vehicle type: "${type}". Available: car, truck, motorcycle, bike, luxury, sports` };
    }
    
    if (this.player.money < vehicle.price) {
      return { success: false, message: `Need $${vehicle.price.toLocaleString()} for a ${vehicle.name}. You have $${this.player.money.toFixed(2)}.` };
    }
    
    this.player.money -= vehicle.price;
    this.player.vehicles.push({
      id: `vehicle_${Date.now()}`,
      name: vehicle.name,
      type: type,
      value: vehicle.price,
      condition: 100,
      mileage: 0,
      lastService: Date.now(),
      lastServices: {},
      purchasedAt: Date.now(),
    });
    
    return { success: true, message: `🚗 Purchased ${vehicle.name} for $${vehicle.price.toLocaleString()}. Type "vehicles" to see your garage.` };
  }

  sellVehicle(name: string): GameAction {
    if (!name) {
      return { success: false, message: 'Which vehicle? Type "vehicles" to see your garage.' };
    }
    
    const index = this.player.vehicles?.findIndex((v: any) => 
      v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase())
    );
    
    if (index === undefined || index === -1) {
      return { success: false, message: `Vehicle "${name}" not found.` };
    }
    
    const vehicle = this.player.vehicles[index];
    const appraised = this.vehicleService.currentValue(vehicle);
    const sellPrice = Math.floor(appraised * 0.6);

    this.player.money += sellPrice;
    this.player.vehicles.splice(index, 1);
    
    return { success: true, message: `🚗 Sold ${vehicle.name} for $${sellPrice.toLocaleString()}. Your new balance is $${this.player.money.toFixed(2)}.` };
  }

  repairVehicle(name: string): GameAction {
    if (!name) {
      return { success: false, message: 'Which vehicle? Type "vehicles" to see your garage.' };
    }

    const index = this.player.vehicles?.findIndex((v: any) =>
      v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase())
    );

    if (index === undefined || index === -1) {
      return { success: false, message: `Vehicle "${name}" not found.` };
    }

    return this.vehicleService.repair(name, this.player);
  }

  maintainVehicle(name: string): GameAction {
    const vehicle = name
      ? this.player.vehicles?.find((v: any) => v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase()))
      : this.player.vehicles?.[0];

    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : 'You don\'t own any vehicles.' };

    return this.vehicleService.maintain(name, this.player);
  }

  serviceVehicle(name: string, serviceType: string): GameAction {
    if (!name || !serviceType) {
      return { success: false, message: 'Usage: service [vehicle name] [oil|tires|brakes|tuneup|wash]' };
    }
    const vehicle = this.player.vehicles?.find((v: any) =>
      v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase())
    );
    if (!vehicle) return { success: false, message: `Vehicle "${name}" not found.` };
    return this.vehicleService.service(name, this.player, serviceType);
  }

  inspectVehicle(name: string): GameAction {
    const vehicle = name
      ? this.player.vehicles?.find((v: any) => v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase()))
      : this.player.vehicles?.[0];
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : 'You don\'t own any vehicles.' };
    return { success: true, message: this.vehicleService.describeStatus(vehicle) };
  }

  race(query: string): GameAction {
    if (!query) {
      const localTracks = RACE_TRACKS.filter(t => t.city.toLowerCase() === (this.player.city || '').toLowerCase());
      const local = localTracks.map(t => `• ${t.name} — $${t.entryFee.toLocaleString()} entry`).join('\n');
      const localHeader = local ? `\n\n**Local tracks in ${this.player.city}:**\n${local}` : '';
      return { success: true, message: this.racingService.listTracks(this.player.city) + localHeader };
    }
    const vehicle = this.player.vehicles?.[0];
    const result = this.racingService.race(this.player, vehicle, query);
    if (result.success && result.data) {
      const trackName = (result.data.track || '').toLowerCase();
      this.time.advance({ hours: trackName.includes('drag') ? 1 : 2, minutes: 0 });
    }
    return result;
  }

  
  // === CRIME CONSEQUENCES HELPERS ===

  private decayHeat(): void {
    const now = Date.now();
    const last = this.player.lastActive || now;
    const hoursPassed = Math.max(0, now - last) / 3600000;
    if (hoursPassed >= 0.5 && (this.player.heat || 0) > 0) {
      const decay = Math.floor(hoursPassed * 2);
      this.player.heat = Math.max(0, (this.player.heat || 0) - decay);
    }
  }

  private applyCrimeConsequences(crimeName: string, reward: number): string {
    let info = '';
    // Reputation erosion
    this.player.reputation.professional = Math.max(-100, this.player.reputation.professional - 1);
    this.player.reputation.community = Math.max(-100, this.player.reputation.community - 2);

    // Possible witness
    const hour = this.time.getHour();
    const day = this.time.currentTime.getDay();
    const npcsHere = this.social.getNPCByLocation(this.player.district, hour, day);
    if (npcsHere.length > 0 && Math.random() < 0.35) {
      const witness = npcsHere[Math.floor(Math.random() * npcsHere.length)];
      if (witness && typeof witness.relationship === 'number') {
        witness.relationship = Math.max(-100, witness.relationship - 15);
        info += `\n👀 ${witness.name} saw something. They look at you differently now.`;
      }
    }

    // Heat warnings
    if ((this.player.heat || 0) >= 80) {
      info += '\n🔥 The streets are buzzing. You\'re attracting serious attention.';
    }
    if ((this.player.heat || 0) >= 50 && Math.random() < 0.25) {
      this.comm.addNotification('Law', 'A police cruiser slowed down as you passed. Keep your head down.');
    }

    // Large crimes trigger professional fallout
    if (reward >= 1000) {
      this.player.reputation.professional = Math.max(-100, this.player.reputation.professional - 2);
      info += '\n📉 Employers are whispering about your name.';
    }

    return info;
  }

  record(): GameAction {
    const record = this.player.criminalRecord || [];
    const arrests = this.player.prisonRecord?.arrests || 0;
    const parole = this.player.prisonRecord?.paroleEligible ? 'Yes' : 'No';

    if (record.length === 0 && arrests === 0) {
      return { success: true, message: '✅ You have a clean record. Stay that way.' };
    }

    let message = `📋 **CRIMINAL RECORD**\n${'─'.repeat(40)}\n`;
    message += `Arrests: ${arrests}\nParole: ${parole}\nHeat: ${this.player.heat || 0}/100\n`;
    message += `Offenses: ${record.length ? record.join(', ') : 'None'}\n`;
    message += `\nTip: Use "laylow" to let heat cool down.`;
    return { success: true, message };
  }

  layLow(): GameAction {
    if ((this.player.heat || 0) <= 0) {
      return { success: true, message: 'You\'re already flying under the radar.' };
    }
    this.time.advance({ hours: 4, minutes: 0 });
    this.player.energy = Math.max(0, this.player.energy - 10);
    const reduction = Math.max(5, Math.floor((this.player.heat || 0) * 0.3));
    this.player.heat = Math.max(0, (this.player.heat || 0) - reduction);
    return { success: true, message: `🌑 You lay low for a few hours. Heat drops by ${reduction}.` };
  }

  // === CRIME SYSTEM ===

  crime(): GameAction {
    const cityData = WORLD_CITIES[this.player.city as keyof typeof WORLD_CITIES];
    const crimeRate = cityData?.crimeRate || 50;
    
    let riskLevel = 'Normal';
    if (crimeRate > 70) riskLevel = 'High (Dangerous)';
    else if (crimeRate < 30) riskLevel = 'Low (Heavy Police)';

    return { 
      success: true, 
      message: `\ud83d\udde1\ufe0f **Crime - ${this.player.city.replace('_', ' ')}**\n${'\u2500'.repeat(40)}\nRisk Level: ${riskLevel} (${crimeRate}%)\n\n**Options:**\n\u2022 **pickpocket** - Low risk, $10-$50 reward\n\u2022 **shoplift** - Medium risk, $50-$200 reward\n\u2022 **scam** - Medium risk, $200-$1000 reward (INT bonus)\n\u2022 **robbery** - High risk, $500-$2000 reward\n\u2022 **grand_theft_auto** - High risk, $2000-$8000 reward\n\u2022 **heist** - Extreme risk, $5000+ reward\n\nType "crime [type]" to proceed. Consequences include prison time and reputation loss.` 
    };
  }

  private commitCrime(crimeType: string): GameAction {
    const crimes: Record<string, { name: string; risk: number; reward: number; heat: number; skill: string }> = {
      pickpocket: { name: 'pickpocketing', risk: 0.1, reward: 50, heat: 5, skill: 'stealth' },
      shoplift: { name: 'shoplifting', risk: 0.2, reward: 200, heat: 15, skill: 'stealth' },
      scam: { name: 'scamming', risk: 0.25, reward: 500, heat: 20, skill: 'charisma' },
      robbery: { name: 'robbery', risk: 0.35, reward: 1000, heat: 30, skill: 'combat' },
      grand_theft_auto: { name: 'grand theft auto', risk: 0.4, reward: 3000, heat: 35, skill: 'driving' },
      heist: { name: 'a heist', risk: 0.5, reward: 10000, heat: 50, skill: 'stealth' },
    };

    const crime = crimes[crimeType.toLowerCase()];
    if (!crime) {
      return { success: false, message: 'Invalid crime type. Usage: crime [pickpocket|shoplift|scam|robbery|grand_theft_auto|heist]' };
    }

    if (this.player.incarcerated) {
      return { success: false, message: 'You are in prison! You can\'t commit crimes here.' };
    }

    const skillLevel = this.player.skills[crime.skill]?.level || 1;
    let adjustedRisk = Math.max(0.05, crime.risk - (skillLevel * 0.02));
    let currentHeat = crime.heat;

    // Parole penalty: Higher risk and more heat if on parole
    if (this.player.prisonRecord?.paroleEligible) {
      adjustedRisk += 0.2;
      currentHeat *= 2;
    }
    
    this.player.heat = Math.min(100, (this.player.heat || 0) + currentHeat);
    this.player.reputation.criminal += 2;

    if (Math.random() < adjustedRisk) {
      // If on parole, the arrest is much more severe
      if (this.player.prisonRecord?.paroleEligible) {
        return this.handleArrest(30); // Heavy sentence for parole violation
      }
      return this.handlePoliceEncounter(true);
    }

    const actualReward = Math.floor(crime.reward * (0.8 + Math.random() * 0.4));
    this.player.money += actualReward;
    this.addSkillXP(crime.skill, 30);
    this.player.criminalRecord.push(crime.name);
    this.achievementEngine.updateProgress('mastermind', 1);
    this.achievementEngine.checkAchievement('first_crime', this.player);
    const consequenceMsg = this.applyCrimeConsequences(crime.name, actualReward);

    return { 
      success: true, 
      message: `🕵️ You successfully committed ${crime.name} and made $${actualReward}! Your heat is now ${this.player.heat}.${consequenceMsg}` 
    };
  }

  private handlePoliceEncounter(isDuringCrime: boolean): GameAction {
    const heat = this.player.heat || 0;
    const charisma = this.player.charisma || 50;
    const riskOfArrest = (heat / 100) * (1 - (charisma / 200));

    if (Math.random() < riskOfArrest) {
      this.player.incarcerated = true;
      this.player.prisonRecord.arrests++;
      this.player.heat = 0;
      this.player.money = Math.max(0, this.player.money - 500); // Bail/Fine
      
      return { 
        success: false, 
        message: `🚨 **BUSTED!** The police caught you. You've been arrested and fined $500. You are now incarcerated.` 
      };
    }

    return { 
      success: true, 
      message: isDuringCrime 
        ? `🚔 A police cruiser drove by, but you managed to stay hidden.` 
        : `🚔 You feel the eyes of the law on you. Stay low.` 
    };
  }

  // === STORYLINE & EVENTS ===
  event(): GameAction {
    const activeEvents = this.storyline.getActiveEvents();
    
    if (activeEvents.length === 0) {
      return { success: true, message: 'No active events right now. Explore, work, or travel to trigger new events.' };
    }
    
    const list = activeEvents.map(e => 
      `**${e.title}**\n${e.description}\n\nChoices:\n${e.outcomes.map(o => `  • ${o.id}: ${o.text.substring(0, 50)}...`).join('\n')}`
    ).join('\n\n' + '─'.repeat(50) + '\n\n');
    
    return { success: true, message: `🎬 **Active Events**\n${'─'.repeat(50)}\n${list}\n\nType "event choice [choice id]" to make a decision.` };
  }

  eventChoice(choiceId: string): GameAction {
    const activeEvents = this.storyline.getActiveEvents();
    if (activeEvents.length === 0) {
      return { success: false, message: 'No active events. Explore or work to trigger events.' };
    }
    
    // Find event with this choice
    for (const event of activeEvents) {
      const outcome = event.outcomes.find(o => o.id.toLowerCase() === choiceId.toLowerCase());
      if (outcome) {
        return this.storyline.processInterviewChoice(this.player, event.id, outcome.id);
      }
    }
    
    return { success: false, message: `Choice "${choiceId}" not found. Type "event" to see available choices.` };
  }

  // === PRISON SYSTEM ===
  handleArrest(sentenceDays: number): GameAction {
    this.player.incarcerated = true;
    this.player.prisonRecord.arrests += 1;
    
    const sentenceMs = sentenceDays * 24 * 60 * 60 * 1000;
    this.player.sentenceEnd = Date.now() + sentenceMs;
    
    return { 
      success: true, 
      message: `🚨 **ARRESTED!**\n\nYour crimes have caught up with you. You've been sentenced to ${sentenceDays} days in prison. Your freedom is now a distant dream.` 
    };
  }

  updateIncarceration(): void {
    if (!this.player.incarcerated || !this.player.sentenceEnd) return;
    if (Date.now() >= this.player.sentenceEnd) {
      this.player.incarcerated = false;
      this.player.sentenceEnd = undefined;
      this.player.prisonRecord.paroleEligible = true; // Set parole on release
      this.comm.addNotification('Law', 'You have been released from prison. You are now on parole. Stay clean, or you\'ll go back for much longer!');
    }
  }

  prisonStatus(): GameAction {
    if (!this.player.incarcerated) {
      return { success: false, message: "You aren't in prison." };
    }
    
    const remainingMs = this.player.sentenceEnd ? this.player.sentenceEnd - Date.now() : 0;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    
    return { 
      success: true, 
      message: `⛓️ **Prison Status**\n${'─'.repeat(40)}\nSentence Remaining: ${remainingDays} days\nArrests: ${this.player.prisonRecord.arrests}\nTime Served: ${this.player.prisonRecord.timeServed} days\n\nCommands:\n• prison work - Work in the laundry\n• sleep - Pass time\n• status - View stats` 
    };
  }

  prisonWork(): GameAction {
    if (!this.player.incarcerated) return { success: false, message: "You aren't in prison." };
    if (this.player.energy < 20) return { success: false, message: "Too exhausted to work." };
    
    this.player.energy = Math.max(0, this.player.energy - 30);
    this.player.fitness += 1;
    this.player.happiness = Math.max(0, this.player.happiness - 5);
    this.player.prisonRecord.timeServed += 0.1; // Partial credit
    
    return { 
      success: true, 
      message: "You spend the day scrubbing floors in the prison laundry. It's grueling work, but it keeps you fit. FIT +1." 
    };
  }

  // === PHONE & COMMUNICATION ===
  phone(): GameAction {
    const unread = this.comm.getUnreadCounts();
    return { 
      success: true, 
      message: `📱 **Phone OS v2.0**
${'─'.repeat(40)}
📬 Emails: ${unread.emails} unread
💬 Messages: ${unread.sms} unread
📞 Voicemails: ${unread.voicemails} unread
👥 Contacts: ${this.comm.getContacts().length} saved
🛡️ Factions: ${this.player.factions?.length || 0} joined

Commands:
• emails - View inbox
• messages - View texts
• factions - View your groups
• chat [id] - View group chat
• text [name] [msg] - Send text
• search [query] - Search all comms
• social - View social feed` 
    };
  }

  factions(): GameAction {
    this.checkFactions();
    if (!this.player.factions || this.player.factions.length === 0) {
      return { success: true, message: "🛡️ **Factions**\nYou haven't joined any factions yet. Increase your reputation to get invited!" };
    }

    let message = "🛡️ **YOUR FACTIONS**\n" + "─".repeat(40) + "\n";
    this.player.factions.forEach((id: string) => {
      const faction = this.social.getFaction(id);
      if (faction) {
        message += `**${faction.name}** [ID: ${faction.id}]\n   ${faction.description}\n`;
      }
    });

    message += '\nType "chat [id]" to view a faction group chat.';
    return { success: true, message };
  }

  influence(): GameAction {
    const allFactions = this.social.getAllFactions();
    let message = "📊 **FACTION INFLUENCE**\n" + "─".repeat(40) + "\n";
    
    allFactions.sort((a, b) => (b.influence || 0) - (a.influence || 0)).forEach(faction => {
      const influence = faction.influence || 0;
      let bar = "█".repeat(Math.floor(influence / 10)) + "░".repeat(10 - Math.floor(influence / 10));
      message += `**${faction.name}** (${faction.hqCity})\n[${bar}] ${influence}%\n`;
    });
    
    message += "\nUse 'support [id]' or 'sabotage [id]' to influence power.";
    return { success: true, message };
  }

  support(id: string): GameAction {
    if (!id) return { success: false, message: "Usage: support [faction_id]" };
    if (!this.player.factions?.includes(id)) {
      return { success: false, message: "You can only support factions you belong to." };
    }
    if (this.player.energy < 25) return { success: false, message: "Too tired. Go rest." };

    const faction = this.social.getFaction(id);
    if (!faction) return { success: false, message: "Faction not found." };

    this.player.energy -= 25;
    faction.influence = Math.min(100, (faction.influence || 0) + 5);
    this.player.reputation.social += 5;
    this.player.reputation.professional += 2;
    this.time.advance({ hours: 2, minutes: 0 });

    return { 
      success: true, 
      message: `✅ **Success!** You spent 2 hours supporting **${faction.name}**. Their influence increased to **${faction.influence}%**.` 
    };
  }

  sabotage(id: string): GameAction {
    if (!id) return { success: false, message: "Usage: sabotage [faction_id]" };
    const faction = this.social.getFaction(id);
    if (!faction) return { success: false, message: "Faction not found." };
    
    // Check if player is in a rival faction
    const isMemberOfRival = this.player.factions?.some((fId: string) => {
      const playerFaction = this.social.getFaction(fId);
      return playerFaction?.rivals?.includes(id);
    });

    if (!isMemberOfRival) {
      return { success: false, message: "You have no reason to sabotage this faction. Only members of rival factions can pull this off." };
    }

    if (this.player.energy < 40) return { success: false, message: "Too tired. Sabotage requires full focus." };

    this.player.energy -= 40;
    this.time.advance({ hours: 3, minutes: 0 });

    const successChance = 0.4 + (this.player.reputation.criminal / 500);
    if (Math.random() < successChance) {
      faction.influence = Math.max(0, (faction.influence || 0) - 8);
      this.player.reputation.criminal += 15;
      return { 
        success: true, 
        message: `🔥 **Success!** You effectively sabotaged **${faction.name}**. Their influence dropped to **${faction.influence}%** and your street cred rose.` 
      };
    } else {
      return this.handleArrest(14); // 2 weeks in prison
    }
  }

  chat(id: string): GameAction {
    if (!id) return { success: false, message: "Usage: chat [faction_id]" };
    
    if (!this.player.factions?.includes(id)) {
      return { success: false, message: "You are not a member of this faction." };
    }

    const group = this.comm.getGroupChat(id);
    if (!group) return { success: false, message: "Chat not found." };

    let message = `💬 **GROUP: ${group.name}**\n${'─'.repeat(40)}\n`;
    if (group.messages.length === 0) {
      message += "No messages yet.";
    } else {
      group.messages.forEach(m => {
        message += `**${m.from}**: ${m.message}\n`;
      });
    }

    return { success: true, message };
  }

  contacts(): GameAction {
    const contacts = this.comm.getContacts();
    if (contacts.length === 0) {
      return { success: true, message: '👥 No contacts saved yet. Meet people to add them!' };
    }
    
    const list = contacts.map(c => {
      const fav = c.isFavorite ? '⭐ ' : '';
      return `${fav}**${c.name}**\n   📞 ${c.phone} | 📧 ${c.email}`;
    }).join('\n');
    
    return { success: true, message: `👥 **Contacts**\n${'─'.repeat(40)}\n${list}` };
  }

  searchComm(query: string): GameAction {
    if (!query) return { success: false, message: 'Usage: search [query]' };
    
    const results = this.comm.searchComm(query);
    let message = `🔍 **Search Results for "${query}"**\n${'─'.repeat(40)}\n`;
    
    if (results.emails.length === 0 && results.sms.length === 0) {
      return { success: true, message: message + 'No results found.' };
    }
    
    if (results.emails.length > 0) {
      message += `📬 **Emails (${results.emails.length})**\n`;
      results.emails.forEach(e => message += `- ${e.subject} (from ${e.fromName})\n`);
      message += '\n';
    }
    
    if (results.sms.length > 0) {
      message += `💬 **Messages (${results.sms.length})**\n`;
      results.sms.forEach(s => message += `- ${s.fromName}: "${s.message.substring(0, 30)}..."\n`);
    }
    
    return { success: true, message };
  }

  emails(): GameAction {
    const emails = this.comm.getEmails();
    if (emails.length === 0) {
      return { success: true, message: '📭 No emails yet.' };
    }
    
    const list = emails.slice(0, 5).map(e => {
      const read = e.read ? '✅' : '🔵';
      return `${read} **${e.subject}**\n   From: ${e.fromName || e.from}\n   ${new Date(e.timestamp).toLocaleDateString()}`;
    }).join('\n\n');
    
    return { success: true, message: `📬 **Inbox**\n${'─'.repeat(40)}\n${list}` };
  }

  messages(): GameAction {
    const sms = this.comm.getMessages();
    if (sms.length === 0) {
      return { success: true, message: '💬 No messages yet.' };
    }
    
    const list = sms.slice(0, 8).map(s => {
      const read = s.read ? '✅' : '🔵';
      return `${read} **${s.fromName || s.from}**: "${s.message.substring(0, 40)}..."`;
    }).join('\n');
    
    return { success: true, message: `💬 **Messages**\n${'─'.repeat(40)}\n${list}` };
  }

  textMsg(args: string): GameAction {
    if (!args) {
      return { success: false, message: 'Usage: text [name] [message]' };
    }
    
    // Parse name and message
    const parts = args.split(' ');
    const name = parts[0] || '';
    const msg = parts.slice(1).join(' ');
    
    if (!msg || !name) {
      return { success: false, message: 'What do you want to say? Usage: text [name] [message]' };
    }
    
    // Find NPC
    const npcs = this.social.getAllNPCs();
    const npc = npcs.find(n => n.name.toLowerCase().includes(name.toLowerCase()));
    
    if (!npc) {
      return { success: false, message: `No contact named "${name}" found.` };
    }
    
    // Send SMS
    this.comm.sendSMS(npc.id, msg);
    
    // NPC responds based on relationship and personality
    const rel = this.player.relationships?.[npc.id]?.value ?? 0;
    let response = 'Ok.';
    
    if (rel > 70) {
      response = this.pickRandom(['You know I got you! 💯', 'Bet. See you soon?', 'Always a pleasure hearing from you.', 'For sure, fam!']);
    } else if (rel > 30) {
      response = this.pickRandom(['Gotcha!', 'Sounds good!', '👍', 'Bet.', 'I hear you.']);
    } else if (rel < -20) {
      response = this.pickRandom(['Don\'t text me.', 'Blocked.', 'Why you hit me up?', 'Leave me alone.']);
    } else {
      response = this.pickRandom(['Ok...', 'Sure.', 'Noted.', 'Alright.', 'I\'m busy right now.']);
    }

    // Add personality flavor
    if (npc.personality.includes('street_smart') && rel > 0) response += ' Real talk.';
    if (npc.personality.includes('proper')) response = 'Pardon me, but ' + response.toLowerCase();

    this.comm.receiveSMS(npc.id, npc.name, response);
    this.comm.addNotification('SMS', `New message from ${npc.name}`);
    
    return { success: true, message: `📱 Sent to ${npc.name}: "${msg}"\n\n💬 ${npc.name} replied: "${response}"` };
  }

  email(args: string): GameAction {
    if (!args) {
      return { 
        success: true, 
        message: `📧 **Email**\n${'─'.repeat(40)}\nUsage:\n• emails - View inbox\n• email read [id] - Read email\n• email compose [name] [subject] [body] - Send email\n• email delete [id] - Delete email` 
      };
    }

    const parts = args.split(' ');
    const subCommand = parts[0]?.toLowerCase();

    if (subCommand === 'read') {
      const id = parts[1];
      if (!id) return { success: false, message: 'Usage: email read [id]' };
      
      const email = this.comm.getEmailById(id);
      if (!email) return { success: false, message: 'Email not found.' };
      
      this.comm.markEmailRead(id);
      return { 
        success: true, 
        message: `📧 **${email.subject}**\n${'─'.repeat(40)}\nFrom: ${email.fromName || email.from}\nDate: ${new Date(email.timestamp).toLocaleString()}\n\n${email.body}` 
      };
    }

    if (subCommand === 'compose') {
      const name = parts[1];
      const subject = parts[2];
      const body = parts.slice(3).join(' ');

      if (!name || !subject || !body) {
        return { success: false, message: 'Usage: email compose [name] [subject] [body]' };
      }

      const npcs = this.social.getAllNPCs();
      const npc = npcs.find(n => n.name.toLowerCase().includes(name.toLowerCase()));

      if (!npc) {
        return { success: false, message: `Recipient "${name}" not found.` };
      }

      this.comm.composeEmail('player', npc.name, subject, body);
      return { success: true, message: `📧 Email sent to ${npc.name}: "${subject}"` };
    }

    if (subCommand === 'delete') {
      const id = parts[1];
      if (!id) return { success: false, message: 'Usage: email delete [id]' };
      
      const success = this.comm.deleteEmail(id);
      return { success, message: success ? 'Email deleted.' : 'Email not found.' };
    }

    return { success: false, message: 'Unknown email command. Type "email" for help.' };
  }

  socialFeed(): GameAction {
    const posts = this.comm.getSocialFeed(10);
    if (posts.length === 0) {
      return { success: true, message: '📱 Social feed is empty. Meet more people!' };
    }
    
    const list = posts.map(p => {
      const icon = p.platform === 'twitter' ? '🐦' : p.platform === 'instagram' ? '📸' : '📘';
      return `${icon} **${p.author}** ${p.authorHandle}\n"${p.content.substring(0, 60)}..."\n❤️ ${p.likes} | 💬 ${p.comments} | 🔄 ${p.shares}`;
    }).join('\n\n');
    
    return { success: true, message: `📱 **Social Feed**\n${'─'.repeat(40)}\n${list}` };
  }

  private pickRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)] || arr[0]!;
  }

  // === LIVING WORLD SYSTEM ===
  triggerCommunication(): void {
    const npcs = this.social.getAllNPCs();
    const chance = Math.random();
    
    // Simulate Faction Chat Activity
    if (this.player.factions?.length > 0 && Math.random() < 0.15) {
      const factionId = this.player.factions[Math.floor(Math.random() * this.player.factions.length)];
      const faction = this.social.getFaction(factionId);
      if (faction && faction.members.length > 0) {
        const senderId = faction.members[Math.floor(Math.random() * faction.members.length)] || '';
        const sender = this.social.getNPCById(senderId);
        if (sender) {
          const factionMsgs = [
            "Anyone seen the latest market trends?",
            "West Memphis is looking good tonight.",
            "Heard there's a big event coming up.",
            "Don't forget the meeting tomorrow.",
            "Stay safe out there, y'all.",
            "Business is booming."
          ];
          const randomMsg = factionMsgs[Math.floor(Math.random() * factionMsgs.length)] || "...";
          this.comm.sendGroupMessage(factionId, sender.name, randomMsg);
          this.comm.addNotification('Group Chat', `New message in ${faction.name}`);
        }
      }
    }

    if (chance > 0.2) return; // Only 20% chance to trigger a private message
    
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    if (!npc) return;
    const rel = this.player.relationships?.[npc.id]?.value ?? 0;
    
    if (rel > 50) {
      // Close friend sends a supportive text
      this.comm.receiveSMS(npc.id, npc.name, `Hey ${this.player.name}, just checking in! Hope you're doing good. 😊`);
      this.comm.addNotification('SMS', `New message from ${npc.name}`);
    } else if (rel < -20) {
      // Rival sends a snarky text
      this.comm.receiveSMS(npc.id, npc.name, `Saw you around. Still grinding that low-pay job, huh? 😂`);
      this.comm.addNotification('SMS', `New message from ${npc.name}`);
    } else if (this.player.money > 10000 && npc.role === 'realtor') {
      // Realtor emails about a property
      this.comm.receiveEmail(
        npc.id, 
        npc.name, 
        'Exclusive Listing', 
        `Hello ${this.player.name}, I noticed you've been doing well lately. I have a luxury property in East Memphis that just hit the market. Let me know if you're interested!`
      );
      this.comm.addNotification('Email', `New email from ${npc.name}`);
    } else {
      // Random social update
      this.comm.addPost(
        npc.name, 
        `@${npc.name.toLowerCase().replace(/\s+/g, '_')}`, 
        `Just had the best ${npc.role === 'chef' ? 'meal' : 'day'} in ${npc.city}! Living the dream. ✨`, 
        Math.random() > 0.5 ? 'twitter' : 'instagram'
      );
    }
  }

  // === ACHIEVEMENTS ===
  achievements(): GameAction {
    this.checkAllAchievements();
    const unlocked = this.achievementEngine.getUnlocked();
    const all = this.achievementEngine.getAll();
    const total = all.length;
    
    if (unlocked.length === 0) {
      return { success: true, message: `🏆 **Achievements**\n${'─'.repeat(40)}\nNo achievements unlocked yet.\n\nGet started:\n• Work your first shift\n• Buy a vehicle\n• Travel to a new city\n• Build relationships` };
    }
    
    const list = unlocked.slice(-10).reverse().map(a => 
      `${a.icon} **${a.name}** - ${a.description}`
    ).join('\n');
    
    return { 
      success: true, 
      message: `🏆 **Achievements** (${unlocked.length}/${total} unlocked)\n${'─'.repeat(40)}\n${list}${unlocked.length > 10 ? `\n\n...and ${unlocked.length - 10} more!` : ''}` 
    };
  }

  private checkFactions(): void {
    const allFactions = this.social.getAllFactions();
    if (!this.player.factions) this.player.factions = [];

    allFactions.forEach(faction => {
      if (this.player.factions.includes(faction.id)) return;

      const socialRep = this.player.reputation.social || 0;
      const profRep = this.player.reputation.professional || 0;
      const combinedRep = socialRep + profRep;

      if (combinedRep >= faction.reputationNeeded) {
        this.player.factions.push(faction.id);
        this.comm.createGroupChat(faction.id, faction.name, [...faction.members, 'player']);
        this.comm.addNotification('Faction', `You've been invited to join the ${faction.name}!`);
        
        // Welcome message in group chat
        if (faction.members.length > 0) {
          const welcomeNpcId = faction.members[0] || '';
          const welcomeNpc = this.social.getNPCById(welcomeNpcId);
          if (welcomeNpc) {
            this.comm.sendGroupMessage(faction.id, welcomeNpc.name, `Welcome to the group, ${this.player.name}! We've been watching your progress.`);
          }
        }
      }
    });
  }

  private checkAllAchievements(): void {
    const list = [
      'first_day', 'first_k', 'ten_k', 'hundred_k', 'millionaire',
      'first_car', 'car_collector', 'homeowner', 'landlord', 'investor',
      'gym_rat', 'genius', 'people_person', 'peak_fitness', 'infamous', 'international',
      'scholar', 'master_worker', 'veteran', 'continental',
      'first_introduction', 'socialite', 'city_hopper', 'city_angel',
      'first_crime', 'busted', 'most_wanted', 'underground_legend',
      'skill_master', 'trophy_hunter'
    ];
    
    list.forEach(id => {
      const result = this.achievementEngine.checkAchievement(id, this.player);
      if (result.unlocked && result.achievement) {
        // We could queue a notification here
      }
    });
  }

  // === UTILITIES ===
  calculateNetWorth(): number {
    let total = this.player.money + this.player.bankBalance;
    
    if (this.player.properties) {
      total += this.property.calculateEquity(this.player.properties);
    }
    
    if (this.player.investments) {
      total += this.player.investments.reduce((sum: number, i: Investment) => sum + i.currentValue, 0);
    }
    
    if (this.player.vehicles) {
      total += this.player.vehicles.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
    }
    
    return Math.floor(total);
  }

  getPlayer(): any { 
    // Convert Map to object for JSON serialization
    const relationships = this.player.relationships instanceof Map 
      ? Object.fromEntries(this.player.relationships) 
      : this.player.relationships;
    
    // Get time and weather info
    const weather = getWeather(this.time.currentTime, this.player.city);
    
    return { 
      ...this.player,
      relationships,
      achievements: this.achievementEngine.exportSerializable(),
      gameTime: this.time.formatTime(),
      gameDate: this.time.formatDate(),
      weather: { temp: weather.temp, condition: weather.condition },
    };
  }
  setPlayerName(name: string): void { this.player.name = name; }
  
  loadState(state: any): void { 
    this.player = { 
      ...this.player, 
      ...state,
      // Defensive number conversion for stats
      money: Number(state.money ?? 500),
      bankBalance: Number(state.bankBalance ?? 0),
      energy: Number(state.energy ?? 100),
      health: Number(state.health ?? 100),
      happiness: Number(state.happiness ?? 80),
      
      // Ensure arrays exist
      properties: state.properties || [],
      investments: state.investments || [],
      vehicles: state.vehicles || [],
      inventory: state.inventory || [],
      visitedCities: state.visitedCities || ['west_memphis'],
      workDaysCompleted: state.workDaysCompleted || 0,
      // Convert relationships back to Map if needed
      relationships: state.relationships instanceof Map 
        ? state.relationships 
        : new Map(Object.entries(state.relationships || {})),
    }; 
    
    if (state.achievements) {
      this.achievementEngine.importSerializable(state.achievements);
    }
  }

  // === BANKING ===

  private bank(): GameAction {
    const totalWealth = this.player.money + this.player.bankBalance;
    return {
      success: true,
      message: `🏦 **THE OPEN WORLD BANK**\n\n` +
               `**Cash**: $${this.player.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
               `**Bank Balance**: $${this.player.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
               `**Total Liquidity**: $${totalWealth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
               `Commands: \`deposit [amount]\`, \`withdraw [amount]\`, \`deposit all\`, \`withdraw all\``
    };
  }

  private deposit(amountStr: string): GameAction {
    let amount: number;
    if (amountStr.toLowerCase() === 'all') {
      amount = this.player.money;
    } else {
      amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Invalid deposit amount. Usage: deposit [amount] or deposit all' };
    }

    if (amount > this.player.money) {
      return { success: false, message: `You only have $${this.player.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in cash.` };
    }

    this.player.money -= amount;
    this.player.bankBalance += amount;
    
    // Round to 2 decimals
    this.player.money = Math.round(this.player.money * 100) / 100;
    this.player.bankBalance = Math.round(this.player.bankBalance * 100) / 100;

    return { 
      success: true, 
      message: `✅ Deposited $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. New bank balance: $${this.player.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` 
    };
  }

  private withdraw(amountStr: string): GameAction {
    let amount: number;
    if (amountStr.toLowerCase() === 'all') {
      amount = this.player.bankBalance;
    } else {
      amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Invalid withdrawal amount. Usage: withdraw [amount] or withdraw all' };
    }

    if (amount > this.player.bankBalance) {
      return { success: false, message: `You only have $${this.player.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in your bank account.` };
    }

    this.player.bankBalance -= amount;
    this.player.money += amount;
    
    // Round to 2 decimals
    this.player.money = Math.round(this.player.money * 100) / 100;
    this.player.bankBalance = Math.round(this.player.bankBalance * 100) / 100;

    return { 
      success: true, 
      message: `✅ Withdrew $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. New cash on hand: $${this.player.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` 
    };
  }

  // === COMMAND DISPATCHER ===
  processCommand(input: string): GameAction {
    this.updateIncarceration();
    this.decayHeat();

    if (this.player.incarcerated) {
      const [command, ...args] = input.trim().toLowerCase().split(/\s+/);

      if (command === 'prison') {
        if (args[0] === 'work') return this.prisonWork();
        return this.prisonStatus();
      }
      if (command === 'status') return this.status();
      if (command === 'help') return this.help();
      if (command === 'sleep' || command === 'rest') return this.sleep();

      return { success: false, message: '⛓️ You are incarcerated. You can only use "prison", "status", "help", and "sleep".' };
    }

    // Check if we're in a conversation first
    if (this.player.currentConversation) {
      const lowerInput = input.toLowerCase().trim();
      const [cmd] = lowerInput.split(/\s+/);

      // Meta commands still reach the normal dispatcher below.
      // Everything else is part of the active NPC conversation.
      if (cmd && !['status', 'help', 'sleep', 'people'].includes(cmd)) {
        return this.continueConversation(input);
      }
    }
    
    const [command, ...args] = input.trim().toLowerCase().split(/\s+/);
    const rawArgs = input.trim().split(/\s+/).slice(1).join(' ');

    let result: GameAction;

    switch (command) {
      // Core
      case 'work': result = this.work(); break;
      case 'apply': result = args.length === 0 ? this.apply() : this.applyForJob(rawArgs); break;
      case 'status': result = this.status(); break;
      case 'help': result = this.help(); break;
      case 'sleep': result = this.sleep(); break;
      case 'rest': result = this.sleep(); break;
      case 'study': result = this.study(); break;
      case 'gym': result = this.gym(); break;
      case 'skills': result = this.skills(); break;
      case 'bank': result = this.bank(); break;
      case 'deposit': result = this.deposit(rawArgs); break;
      case 'withdraw': result = this.withdraw(rawArgs); break;
      case 'lawyer': result = this.lawyer(rawArgs); break;
      case 'record': result = this.record(); break;
      case 'laylow': result = this.layLow(); break;
      case 'lay': result = this.layLow(); break;
      
      // Movement
      case 'explore': result = this.explore(); break;
      case 'goto': result = this.goto(rawArgs); break;
      case 'travel': result = rawArgs ? this.travelTo(rawArgs) : { success: false, message: 'Travel where? Usage: travel [city]' }; break;
      
      // Social
      case 'talk': result = this.talk(rawArgs); break;
      case 'greet': result = this.greet(rawArgs); break;
      case 'assist': result = rawArgs ? this.helpNPC(rawArgs) : { success: false, message: 'Assist whom? Type "people" to see who\'s around.' }; break;
      case 'people': result = this.people(); break;
      case 'end':
      case 'exit':
      case 'bye':
      case 'goodbye':
      case 'leave':
        result = this.endConversation();
        break;
      
      // Property
      case 'real-estate': case 'realestate': case 'properties_list': result = this.realEstate(); break;
      case 'buy': 
        if (args[0] === 'property') result = this.buyProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.buyVehicle(args.slice(1).join(' '));
        else result = { success: false, message: 'Buy what? "buy property [name]" or "buy vehicle [type]"' };
        break;
      case 'sell':
        if (args[0] === 'property') result = this.sellProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.sellVehicle(args.slice(1).join(' '));
        else if (args[0] === 'investment') result = this.sellInvestment(args.slice(1).join(' '));
        else result = { success: false, message: 'Sell what? "sell property/vehicle/investment [name]"' };
        break;
      case 'properties': result = this.properties(); break;
      case 'repair':
        if (args[0] === 'property') result = this.repairProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.repairVehicle(args.slice(1).join(' '));
        else result = { success: false, message: 'Usage: repair property [name] or repair vehicle [name]' };
        break;
      case 'renovate':
        if (args[0] === 'property') result = this.renovateProperty(args.slice(1).join(' '));
        else result = { success: false, message: 'Usage: renovate property [name]' };
        break;
      case 'maintain':
        result = this.maintainVehicle(rawArgs);
        break;
      case 'service': {
          const knownServices = ['oil','tires','brakes','tuneup','wash'];
          let serviceType = '';
          let vehicleName = rawArgs;
          if (args.length > 0 && knownServices.includes(args[args.length - 1]!.toLowerCase())) {
            serviceType = args[args.length - 1]!.toLowerCase();
            vehicleName = args.slice(0, -1).join(' ');
          }
          if (!serviceType) {
            const first = this.player.vehicles?.[0];
            result = first
              ? { success: true, message: `🔧 Available services for ${first.name}: oil, tires, brakes, tuneup, wash. Usage: service [vehicle name] [service]` }
              : { success: false, message: 'You don\'t own any vehicles.' };
          } else {
            result = this.serviceVehicle(vehicleName, serviceType);
          }
        }
        break;
      case 'inspect':
        result = this.inspectVehicle(rawArgs);
        break;
      case 'race':
      case 'races':
        result = rawArgs ? this.race(rawArgs) : this.race('');
        break;
      case 'crime':
        result = rawArgs ? this.commitCrime(rawArgs) : { success: false, message: 'What kind of crime? Usage: crime [pickpocket|shoplift|heist]' };
        break;
      
      // Investments
      case 'invest':
        if (args.length === 0) result = this.invest();
        else if (args[0] !== 'options') {
          // invest [name] [amount]
          const amount = args[args.length - 1] || '0';
          const name = args.slice(0, -1).join(' ');
          result = this.makeInvestment(name, amount);
        }
        else result = this.invest();
        break;
      case 'investments': result = this.investments(); break;
      
      // Phone / Social
      case 'phone': result = this.phone(); break;
      case 'text': result = this.textMsg(rawArgs); break;
      case 'email':
      case 'emails': result = this.email(rawArgs); break;
      case 'social': result = this.socialFeed(); break;
      case 'contacts': result = this.contacts(); break;
      case 'search': result = this.searchComm(rawArgs); break;
      case 'factions': result = this.factions(); break;
      case 'chat': result = this.chat(rawArgs); break;
      case 'influence': result = this.influence(); break;
      case 'support': result = this.support(rawArgs); break;
      case 'sabotage': result = this.sabotage(rawArgs); break;
      
      // Education
      case 'enroll': result = this.enroll(rawArgs); break;

      // Crimes
      case 'rob': result = this.commitCrime('robbery'); break;
      case 'scam': result = this.commitCrime('scam'); break;
      
      // Events
      case 'event': 
        if (args[0] === 'choice') result = this.eventChoice(args[1] ?? '');
        else result = this.event();
        break;
      
      // Meta
      case 'achievements': case 'achievement': result = this.achievements(); break;
      case 'clear_conv': this.player.currentConversation = null; result = { success: true, message: 'Conversation cleared.' }; break;
      
      default:
        result = { success: false, message: `Unknown command: \"${command}\". Type \"help\" for list of commands.` };
    }

    this.checkAllAchievements();
    return result;
  }

  private lawyer(action: string): GameAction {
    if (!action) {
      return { success: false, message: 'Which legal service? Usage: lawyer [clean|appeal]' };
    }

    const act = action.toLowerCase();

    if (act === 'clean') {
      if (this.player.incarcerated) {
        return { success: false, message: 'You can\'t hire a lawyer to clean your record while you\'re locked up. Try "lawyer appeal" instead.' };
      }
      
      const currentHeat = this.player.heat || 0;
      if (currentHeat === 0) {
        return { success: false, message: 'Your record is already clean.' };
      }

      const cost = currentHeat * 100;
      if (this.player.money < cost) {
        return { success: false, message: `A legal team to scrub your heat would cost $${cost.toLocaleString()}. You only have $${this.player.money.toFixed(2)}.` };
      }

      this.player.money -= cost;
      const reduction = Math.floor(currentHeat * (0.3 + (this.player.charisma / 200)));
      this.player.heat = Math.max(0, currentHeat - reduction);

      return { 
        success: true, 
        message: `⚖️ Your lawyer successfully scrubbed some of your record. Heat reduced by ${reduction}. New heat: ${this.player.heat}. Cost: $${cost.toLocaleString()}.` 
      };
    }

    if (act === 'appeal') {
      if (!this.player.incarcerated) {
        return { success: false, message: 'You can only appeal if you are currently incarcerated.' };
      }

      const cost = 1000;
      if (this.player.money < cost) {
        return { success: false, message: `An appeal costs $${cost.toLocaleString()}. You don\'t have enough funds.` };
      }

      this.player.money -= cost;
      const successChance = 0.3 + (this.player.intelligence / 400);
      
      if (Math.random() < successChance) {
        const reductionPercent = 0.25 + (Math.random() * 0.25); // 25-50% reduction
        if (this.player.sentenceEnd) {
          const remaining = this.player.sentenceEnd - Date.now();
          const reductionMs = Math.floor(remaining * reductionPercent);
          this.player.sentenceEnd = this.player.sentenceEnd! - reductionMs;
          
          const daysSaved = Math.ceil(reductionMs / (1000 * 60 * 60 * 24));
          return { success: true, message: `⚖️ **APPEAL SUCCESSFUL!** Your lawyer found a loophole. Your sentence has been reduced by ${daysSaved} days.` };
        }
      }

      return { success: false, message: `⚖️ The judge rejected your appeal. Your lawyer keeps the $${cost} fee regardless.` };
    }

    return { success: false, message: 'Invalid lawyer action. Usage: lawyer [clean|appeal]' };
  }
}