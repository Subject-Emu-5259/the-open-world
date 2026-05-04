// THE OPEN WORLD - Main Game Engine
// Version: 0.31.4

import { TimeEngine, getWeather } from './time-engine.js';
import { EconomyEngine, JOBS_WEST_MEMPHIS } from './economy-engine.js';
import { CommHub, generateInitialMessages } from './comm-hub.js';
import { SocialEngine } from './social-engine.js';
import { PropertyEngine } from './property-engine.js';
import type { Property, Investment } from './property-engine.js';
import { StorylineEngine } from './storyline-engine.js';
import { ConversationEngine } from './conversation-engine.js';
import { WORLD_CITIES } from '../shared/world-data.js';

export const GAME_VERSION = '0.36.0';

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
  private economy: EconomyEngine;
  private comm: CommHub;
  private social: SocialEngine;
  private property: PropertyEngine;
  private storyline: StorylineEngine;
  private conversation: ConversationEngine;
  public player: any;

  constructor() {
    this.time = new TimeEngine();
    this.economy = new EconomyEngine();
    this.comm = new CommHub();
    this.social = new SocialEngine();
    this.property = new PropertyEngine();
    this.storyline = new StorylineEngine();
    this.conversation = new ConversationEngine();
    this.player = this.initPlayer();
    generateInitialMessages(this.comm);
  }

  private initPlayer(): any {
    return {
      name: 'Traveler',
      city: 'west_memphis',
      district: 'downtown',
      money: 500,
      bankBalance: 0,
      health: 100,
      energy: 100,
      happiness: 60,
      stress: 10,
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
    };
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
    let weatherMsg = '';
    
    if (weather.condition === 'stormy' || weather.condition === 'rainy') {
      weatherModifier = 0.85;
      weatherMsg = ' -15% due to rain.';
    } else if (weather.condition === 'hot') {
      weatherModifier = 0.90;
      weatherMsg = ' -10% due to heat.';
    } else if (weather.condition === 'cold') {
      weatherModifier = 0.92;
      weatherMsg = ' -8% due to cold.';
    }

    let hourlyWage = 15;
    if (this.player.job.basePay) {
      hourlyWage = this.economy.calculateHourlyWage(this.player.job);
    } else if (this.player.job.hourlyPay) {
      hourlyWage = this.player.job.hourlyPay;
    }
    
    const hours = 8;
    const baseEarned = Math.round(hourlyWage * hours * 100) / 100;
    const earned = Math.round(baseEarned * weatherModifier * 100) / 100;

    this.player.money += earned;
    this.player.energy = Math.max(0, this.player.energy - 30);
    this.player.stress = Math.min(100, this.player.stress + 10);
    this.player.reputation.professional += 1;
    this.player.lastActive = Date.now();
    this.time.advance({ hours: 8, minutes: 0 });

    this.triggerCommunication(); // Living world update

    // Check for random event
    const randomEvent = this.storyline.generateRandomEvent(this.player);
    if (randomEvent) {
      this.storyline.activateEvent(randomEvent);
      return { 
        success: true, 
        message: `Shift at ${this.player.job.employer}. Earned $${earned.toFixed(2)}${weatherMsg}\n\n🎬 **Event: ${randomEvent.title}**\n${randomEvent.description}\n\nType "event" to see choices.`
      };
    }

    return { success: true, message: `Shift at ${this.player.job.employer}. Earned $${earned.toFixed(2)}${weatherMsg}` };
  }

  apply(): GameAction {
    const listings = JOBS_WEST_MEMPHIS.map(job => {
      const hourly = this.economy.calculateHourlyWage(job);
      return `- ${job.title} @ ${job.employer}: $${hourly.toFixed(2)}/hr [${job.tier}]`;
    });
    
    return { success: true, message: `📋 JOB LISTINGS (West Memphis)\n${'─'.repeat(50)}\n${listings.slice(0, 10).join('\n')}\n\nType "apply [job name]" to get hired.` };
  }

  applyForJob(jobTitle: string): GameAction {
    const job = JOBS_WEST_MEMPHIS.find(j => j.title.toLowerCase().includes(jobTitle.toLowerCase()));
    
    if (!job) {
      return { success: false, message: `No job matching "${jobTitle}". Try "apply" to see available jobs.` };
    }
    
    this.player.job = { ...job };
    this.player.reputation.professional += 5;
    this.player.lastActive = Date.now();
    
    const hourlyWage = this.economy.calculateHourlyWage(job);
    return { success: true, message: `✅ Hired as ${job.title} at ${job.employer}! $${hourlyWage.toFixed(2)}/hr. Type "work" to earn money.` };
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
💼 Job: ${job}
🕐 ${this.time.formatTime()} | ${this.time.formatDate()} | 🌡️ ${weather.temp}°F ${weather.condition}` 
    };
  }

  help(): GameAction {
    return { 
      success: true, 
      message: `🎮 **THE OPEN WORLD - Commands**
${'─'.repeat(50)}

**📍 Movement**
• travel [city] - Go to another city
• explore - Look around current area
• goto [district] - Move to a district

**💼 Work & Money**
• apply - See job listings
• apply [job] - Get hired
• work - Work a shift (8 hrs)
• gym - Workout ($15, FIT +2)
• study - Library ($25, INT +2)

**🏠 Property & Wealth**
• real-estate - View properties
• buy property [name]
• sell property [name]
• properties - Your portfolio
• invest - Investment options
• investments - Your investments
• vehicles - Your garage

**👥 Social**
• people - See who's around
• talk [name] - Chat with NPC
• greet [name] - Say hello

**ℹ️ Info**
• status - Your life snapshot
• help - This list
• sleep - Rest 8 hours
• event - Active events

**💡 Tips**
• Weather affects work pay
• Sleep to restore energy
• Explore to find NPCs` 
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
    const districtNpcs = npcs.filter(n => n.district === this.player.district);
    
    if (districtNpcs.length === 0) {
      return { success: true, message: `No one around right now. Try exploring or visiting different districts.` };
    }
    
    const list = districtNpcs.slice(0, 8).map(n => {
      const rel = n.relationship > 0 ? ` (+${n.relationship})` : n.relationship < 0 ? ` (${n.relationship})` : '';
      return `• ${n.name} - ${n.role.replace(/_/g, ' ')}${rel}`;
    }).join('\n');
    
    return { success: true, message: `👥 **People in ${this.player.district.replace('_', ' ')}**\n${'─'.repeat(40)}\n${list}\n\nType "talk [name]" to interact.` };
  }

  talk(name: string): GameAction {
    const npcs = this.social.getAllNPCs();
    const npc = npcs.find(n => n.name.toLowerCase().includes(name.toLowerCase()));
    
    if (!npc) {
      return { success: false, message: `No one named "${name}" around here.` };
    }
    
    this.player.currentConversation = { npcId: npc.id, npcName: npc.name };
    return { 
      success: true, 
      message: `You start talking to ${npc.name}. What do you say?` 
    };
  }
  
  continueConversation(input: string): GameAction {
    const conv = this.player.currentConversation;
    if (!conv) return { success: false, message: "You aren't in a conversation." };
    
    const npc = this.social.getNPCById(conv.npcId);
    if (!npc) return { success: false, message: "The person you were talking to disappeared." };
    
    const response = this.conversation.generateResponse(npc, input);
    
    // Update relationship
    npc.relationship = Math.max(-100, Math.min(100, npc.relationship + response.relationshipChange));
    
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

  study(): GameAction {
    if (this.player.money < 25) return { success: false, message: "Need $25 for library card." };
    this.player.money -= 25;
    this.player.intelligence = Math.min(100, this.player.intelligence + 2);
    this.player.energy = Math.max(0, this.player.energy - 15);
    this.time.advance({ hours: 3, minutes: 0 });
    return { success: true, message: `Studied at library. INT +2 (now ${this.player.intelligence}). Money: $${this.player.money.toFixed(2)}` };
  }

  gym(): GameAction {
    if (this.player.money < 15) return { success: false, message: "Need $15 for gym day pass." };
    this.player.money -= 15;
    this.player.fitness = Math.min(100, this.player.fitness + 2);
    this.player.energy = Math.max(0, this.player.energy - 20);
    this.player.stress = Math.max(0, this.player.stress - 5);
    this.time.advance({ hours: 2, minutes: 0 });
    return { success: true, message: `Workout complete. FIT +2 (now ${this.player.fitness}). Stress -5. Energy: ${this.player.energy}/100` };
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
    this.time.advance({ hours: 2, minutes: 0 });
    this.player.energy = Math.max(0, this.player.energy - 10);
    
    this.triggerCommunication(); // Living world update
    
    return { success: true, message: `🚗 Arrived in ${data.displayName}. ${data.districts?.length || 0} districts to explore. Type "explore" to look around.` };
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
      return { success: true, message: 'You don\'t own any vehicles. Type "buy vehicle [type]" to purchase.\n\nAvailable: car, truck, motorcycle, bike' };
    }
    
    const list = this.player.vehicles.map((v: any) => 
      `• ${v.name} - ${v.type} | Value: $${v.value?.toLocaleString() || 'N/A'}`
    ).join('\n');
    
    return { success: true, message: `🚗 **Your Vehicles**\n${'─'.repeat(30)}\n${list}` };
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
    const salePrice = Math.floor(vehicle.value * 0.6); // 60% resale
    
    this.player.money += salePrice;
    this.player.vehicles.splice(index, 1);
    
    return { success: true, message: `💰 Sold ${vehicle.name} for $${salePrice.toLocaleString()} (60% of value).` };
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
    if (this.player.incarcerated && this.player.sentenceEnd) {
      if (Date.now() >= this.player.sentenceEnd) {
        this.player.incarcerated = false;
        this.player.sentenceEnd = undefined;
        this.player.prisonRecord.paroleEligible = false;
        // We'll handle the "Release" message in the command that triggered this check
      }
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
      message: `📱 **Phone**
${'─'.repeat(40)}
📬 Emails: ${unread.emails} unread
💬 Messages: ${unread.sms} unread
📞 Voicemails: ${unread.voicemails} unread

Commands:
• emails - View inbox
• messages - View texts
• text [name] [msg] - Send text
• social - View social feed` 
    };
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
    
    // NPC responds based on relationship
    const rel = this.player.relationships?.get(npc.id) || 0;
    const responses = rel > 30 
      ? ['Gotcha!', 'Sounds good!', '👍', 'Bet.']
      : ['Ok...', 'Sure.', 'Noted.', 'Alright.'];
    
    const response = responses[Math.floor(Math.random() * responses.length)] || 'Ok.';
    this.comm.receiveSMS(npc.id, npc.name, response);
    
    return { success: true, message: `📱 Sent to ${npc.name}: "${msg}"\n\n💬 ${npc.name} replied: "${response}"` };
  }

  email(args: string): GameAction {
    if (!args) {
      return { success: false, message: 'Usage: email [name] [subject]' };
    }
    return { success: true, message: '📧 Email feature - Coming soon! Use "emails" to check inbox.' };
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

  // === LIVING WORLD SYSTEM ===
  triggerCommunication(): void {
    const npcs = this.social.getAllNPCs();
    const chance = Math.random();
    
    if (chance > 0.2) return; // Only 20% chance to trigger a message on action
    
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    if (!npc) return;
    const rel = this.player.relationships?.get(npc.id) || 0;
    
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
    const unlocked = this.getUnlockedAchievements();
    const total = 36; // Total achievements defined
    
    if (unlocked.length === 0) {
      return { success: true, message: `🏆 **Achievements**\n${'─'.repeat(40)}\nNo achievements unlocked yet.\n\nGet started:\n• Work your first shift\n• Buy a vehicle\n• Travel to a new city\n• Build relationships` };
    }
    
    const list = unlocked.slice(0, 10).map(a => 
      `${a.icon} **${a.name}** - ${a.description}`
    ).join('\n');
    
    return { 
      success: true, 
      message: `🏆 **Achievements** (${unlocked.length}/${total} unlocked)\n${'─'.repeat(40)}\n${list}${unlocked.length > 10 ? `\n\n...and ${unlocked.length - 10} more!` : ''}` 
    };
  }

  private getUnlockedAchievements(): any[] {
    const unlocked: any[] = [];
    
    // Check wealth achievements
    if (this.player.money >= 1000) unlocked.push({ id: 'first_k', icon: '💵', name: 'Thousandaire', description: 'Accumulate $1,000' });
    if (this.player.money >= 10000) unlocked.push({ id: 'ten_k', icon: '💰', name: 'Five Figures', description: 'Accumulate $10,000' });
    if (this.player.money >= 100000) unlocked.push({ id: 'hundred_k', icon: '💎', name: 'Six Figures', description: 'Accumulate $100,000' });
    
    // Check property achievements
    if (this.player.properties?.length >= 1) unlocked.push({ id: 'homeowner', icon: '🏠', name: 'Homeowner', description: 'Purchase your first property' });
    if (this.player.properties?.length >= 3) unlocked.push({ id: 'landlord', icon: '🏘️', name: 'Landlord', description: 'Own 3+ properties' });
    
    // Check vehicle achievements
    if (this.player.vehicles?.length >= 1) unlocked.push({ id: 'first_car', icon: '🚗', name: 'First Ride', description: 'Buy your first vehicle' });
    if (this.player.vehicles?.length >= 3) unlocked.push({ id: 'car_collector', icon: '🚙', name: 'Car Collector', description: 'Own 3 vehicles' });
    
    // Check investment achievements
    if (this.player.investments?.length >= 1) unlocked.push({ id: 'investor', icon: '📈', name: 'Wall Street', description: 'Make your first investment' });
    
    // Check stat achievements
    if (this.player.fitness >= 80) unlocked.push({ id: 'gym_rat', icon: '💪', name: 'Gym Rat', description: 'Reach 80+ fitness' });
    if (this.player.intelligence >= 90) unlocked.push({ id: 'genius', icon: '🧠', name: 'Genius', description: 'Reach 90+ intelligence' });
    if (this.player.charisma >= 90) unlocked.push({ id: 'people_person', icon: '💬', name: 'People Person', description: 'Reach 90+ charisma' });
    
    // Check job achievement
    if (this.player.job) unlocked.push({ id: 'employed', icon: '💼', name: 'Employed', description: 'Got a job' });
    
    return unlocked;
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
      // Ensure arrays exist
      properties: state.properties || [],
      investments: state.investments || [],
      vehicles: state.vehicles || [],
      inventory: state.inventory || [],
      // Convert relationships back to Map if needed
      relationships: state.relationships instanceof Map 
        ? state.relationships 
        : new Map(Object.entries(state.relationships || {})),
    }; 
  }

  // === COMMAND DISPATCHER ===
  processCommand(input: string): GameAction {
    this.updateIncarceration();

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
      
      // Allow meta commands even during conversation
      const metaCommands = ['status', 'help', 'sleep', 'people'];
      const [cmd] = lowerInput.split(/\s+/);
      
      if (cmd && !metaCommands.includes(cmd)) {
        // Route to conversation handler
        return this.continueConversation(input);
      }
    }
    
    const [command, ...args] = input.trim().toLowerCase().split(/\s+/);
    const rawArgs = input.trim().split(/\s+/).slice(1).join(' ');

    switch (command) {
      // Core
      case 'work': return this.work();
      case 'apply': return args.length === 0 ? this.apply() : this.applyForJob(rawArgs);
      case 'status': return this.status();
      case 'help': return this.help();
      case 'sleep': return this.sleep();
      case 'rest': return this.sleep();
      case 'study': return this.study();
      case 'gym': return this.gym();
      
      // Movement
      case 'explore': return this.explore();
      case 'goto': return this.goto(rawArgs);
      case 'travel': return rawArgs ? this.travelTo(rawArgs) : { success: false, message: 'Travel where? Usage: travel [city]' };
      
      // Social
      case 'talk': return this.talk(rawArgs);
      case 'greet': return this.greet(rawArgs);
      case 'assist': return rawArgs ? this.helpNPC(rawArgs) : { success: false, message: 'Assist whom? Type "people" to see who\'s around.' };
      case 'people': return this.people();
      
      // Property
      case 'real-estate': case 'realestate': case 'properties_list': return this.realEstate();
      case 'buy': 
        if (args[0] === 'property') return this.buyProperty(args.slice(1).join(' '));
        if (args[0] === 'vehicle') return this.buyVehicle(args.slice(1).join(' '));
        return { success: false, message: 'Buy what? "buy property [name]" or "buy vehicle [type]"' };
      case 'sell':
        if (args[0] === 'property') return this.sellProperty(args.slice(1).join(' '));
        if (args[0] === 'vehicle') return this.sellVehicle(args.slice(1).join(' '));
        if (args[0] === 'investment') return this.sellInvestment(args.slice(1).join(' '));
        return { success: false, message: 'Sell what? "sell property/vehicle/investment [name]"' };
      case 'properties': return this.properties();
      case 'repair':
        if (args[0] === 'property') return this.repairProperty(args.slice(1).join(' '));
        return { success: false, message: 'Usage: repair property [name]' };
      
      // Investments
      case 'invest':
        if (args.length === 0) return this.invest();
        if (args[0] !== 'options') {
          // invest [name] [amount]
          const amount = args[args.length - 1] || '0';
          const name = args.slice(0, -1).join(' ');
          return this.makeInvestment(name, amount);
        }
        return this.invest();
      case 'investments': return this.investments();
      
      // Vehicles
      case 'vehicles': return this.vehicles();
      
      // Events
      case 'event':
        if (args[0] === 'choice') return this.eventChoice(args.slice(1).join(' '));
        return this.event();
      
      // Phone (placeholders)
      case 'phone': return this.phone();
      case 'text': return this.textMsg(rawArgs);
      case 'email': return this.email(rawArgs);
      case 'emails': return this.emails();
      case 'messages': return this.messages();
      case 'social': return this.socialFeed();
      case 'achievements': return this.achievements();
      case 'achievement': return this.achievements();
      
      default:
        return { success: false, message: `Unknown command: "${command}". Type "help" for available commands.` };
    }
  }
}
