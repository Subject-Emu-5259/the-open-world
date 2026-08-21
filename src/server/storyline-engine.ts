// THE OPEN WORLD - Storyline Events Engine
// Dynamic events, job interviews, relationship milestones

import type { PlayerState, GameAction } from './game-engine.js';
import type { WeatherState } from './time-engine.js';
import type { Quest } from './social-engine.js';

export type StorylineType = 'job_interview' | 'relationship' | 'community' | 'random' | 'milestone';

export interface StorylineEvent {
  id: string;
  type: StorylineType;
  title: string;
  description: string;
  trigger: EventTrigger;
  outcomes: EventOutcome[];
  timestamp?: number;
}

export interface EventTrigger {
  type: 'time' | 'location' | 'stat' | 'relationship' | 'job' | 'random';
  conditions: Record<string, number | string | boolean>;
  probability?: number;
}

export interface EventOutcome {
  id: string;
  text: string;
  effects: EventEffect[];
  requirements?: EventRequirement[];
}

export interface EventEffect {
  type: 'money' | 'stat' | 'relationship' | 'reputation' | 'job' | 'property';
  target: string;
  value: number;
}

export interface EventRequirement {
  type: 'stat' | 'money' | 'item' | 'relationship';
  target: string;
  min?: number;
  max?: number;
}

export class StorylineEngine {
  private activeEvents: Map<string, StorylineEvent> = new Map();
  private eventHistory: StorylineEvent[] = [];
  private activeQuests: Map<string, Quest> = new Map();
  
  constructor() {
    this.initializeEvents();
  }
  
  private initializeEvents(): void {
    // Events will be generated dynamically based on triggers
  }
  
  // === JOB INTERVIEW SYSTEM ===
  
  generateJobInterview(player: PlayerState, jobTitle: string): StorylineEvent {
    const interviewTypes = this.getInterviewQuestions(jobTitle);
    const eventId = `interview_${Date.now()}`;
    
    return {
      id: eventId,
      type: 'job_interview',
      title: `Interview: ${jobTitle}`,
      description: `You've been called in for an interview. The hiring manager sits across from you, reviewing your application.`,
      trigger: { type: 'job', conditions: { jobTitle } },
      outcomes: interviewTypes,
    };
  }
  
  private getInterviewQuestions(jobTitle: string): EventOutcome[] {
    const baseOutcomes: EventOutcome[] = [
      {
        id: 'confident',
        text: '"Tell me about yourself." You speak confidently about your experience and goals.',
        effects: [
          { type: 'stat', target: 'charisma', value: 2 },
          { type: 'reputation', target: 'professional', value: 5 },
        ],
        requirements: [{ type: 'stat', target: 'charisma', min: 40 }],
      },
      {
        id: 'honest',
        text: '"What\'s your biggest weakness?" You answer honestly but show how you\'re working on it.',
        effects: [
          { type: 'stat', target: 'intelligence', value: 1 },
          { type: 'reputation', target: 'professional', value: 3 },
        ],
      },
      {
        id: 'nervous',
        text: 'Your hands shake slightly as you answer. The interviewer notices but seems understanding.',
        effects: [
          { type: 'stat', target: 'stress', value: 5 },
        ],
        requirements: [{ type: 'stat', target: 'charisma', max: 30 }],
      },
      {
        id: 'blow_it',
        text: 'You stumble over your words. The interview ends awkwardly.',
        effects: [
          { type: 'stat', target: 'stress', value: 10 },
          { type: 'reputation', target: 'professional', value: -3 },
        ],
        requirements: [{ type: 'stat', target: 'charisma', max: 20 }],
      },
      {
        id: 'ace_it',
        text: 'You nail every question. The hiring manager is impressed and offers you the job on the spot!',
        effects: [
          { type: 'stat', target: 'charisma', value: 5 },
          { type: 'reputation', target: 'professional', value: 10 },
        ],
        requirements: [
          { type: 'stat', target: 'charisma', min: 60 },
          { type: 'stat', target: 'intelligence', min: 50 },
        ],
      },
    ];
    
    return baseOutcomes;
  }
  
  processInterviewChoice(player: PlayerState, eventId: string, choiceId: string): GameAction {
    const event = this.activeEvents.get(eventId);
    if (!event) {
      return { success: false, message: 'Interview not found.' };
    }
    
    const outcome = event.outcomes.find(o => o.id === choiceId);
    if (!outcome) {
      return { success: false, message: 'Invalid choice.' };
    }
    
    // Check requirements
    if (outcome.requirements) {
      for (const req of outcome.requirements) {
        if (!this.meetsRequirement(player, req)) {
          return { 
            success: false, 
            message: `You don't meet the requirements for this response. (${req.target}: ${req.min ?? req.max}+)` 
          };
        }
      }
    }
    
    // Apply effects
    let resultText = outcome.text + '\n\n';
    for (const effect of outcome.effects) {
      this.applyEffect(player, effect);
    }
    
    resultText += '**Effects applied.**';
    
    this.eventHistory.push(event);
    this.activeEvents.delete(eventId);
    
    return { success: true, message: resultText };
  }
  
  // === RELATIONSHIP MILESTONES ===
  
  generateRelationshipMilestone(player: PlayerState, npcName: string, relationshipLevel: number): StorylineEvent | null {
    const milestones = this.getMilestonesForLevel(relationshipLevel);
    if (!milestones) return null;
    
    const eventId = `milestone_${Date.now()}`;
    
    return {
      id: eventId,
      type: 'relationship',
      title: `Relationship Milestone: ${npcName}`,
      description: milestones.description.replace('{npc}', npcName),
      trigger: { type: 'relationship', conditions: { npcName, level: relationshipLevel } },
      outcomes: milestones.outcomes.map(o => ({
        ...o,
        text: o.text.replace('{npc}', npcName),
      })),
    };
  }
  
  private getMilestonesForLevel(level: number): { description: string; outcomes: EventOutcome[] } | null {
    if (level >= 75) {
      return {
        description: '{npc} considers you a close friend. They have something important to tell you.',
        outcomes: [
          {
            id: 'share_secret',
            text: '{npc} shares a personal secret with you. Your bond deepens.',
            effects: [
              { type: 'relationship', target: 'trusted', value: 10 },
              { type: 'stat', target: 'happiness', value: 5 },
            ],
          },
          {
            id: 'ask_advice',
            text: '{npc} asks for your advice on an important matter.',
            effects: [
              { type: 'stat', target: 'charisma', value: 2 },
              { type: 'reputation', target: 'social', value: 3 },
            ],
          },
        ],
      };
    } else if (level >= 50) {
      return {
        description: '{npc} smiles warmly when they see you. You\'ve become good acquaintances.',
        outcomes: [
          {
            id: 'hangout',
            text: '{npc} invites you to hang out sometime.',
            effects: [
              { type: 'stat', target: 'happiness', value: 3 },
            ],
          },
          {
            id: 'discount',
            text: '{npc} offers you a discount at their business.',
            effects: [
              { type: 'money', target: 'discount', value: 10 },
            ],
          },
        ],
      };
    } else if (level >= 25) {
      return {
        description: '{npc} recognizes you now. They give a friendly nod.',
        outcomes: [
          {
            id: 'small_talk',
            text: 'You make small talk with {npc}. They seem receptive.',
            effects: [
              { type: 'stat', target: 'charisma', value: 1 },
            ],
          },
        ],
      };
    }
    return null;
  }
  
  // === COMMUNITY EVENTS ===
  
  generateCommunityEvent(playerCity: string, weather: WeatherState, month: number): StorylineEvent | null {
    const events = this.getSeasonalEvents(month, playerCity);
    if (events.length === 0) return null;
    
    const selected = events[Math.floor(Math.random() * events.length)];
    if (!selected) return null;
    
    const eventId = `community_${Date.now()}`;
    
    return {
      id: eventId,
      type: 'community',
      title: selected.title,
      description: selected.description,
      trigger: { type: 'time', conditions: { month } },
      outcomes: selected.outcomes,
    };
  }
  
  private getSeasonalEvents(month: number, city: string): Array<{ title: string; description: string; outcomes: EventOutcome[] }> {
    const events: Array<{ title: string; description: string; outcomes: EventOutcome[] }> = [];
    
    // Memphis in May (month 4 = May)
    if (month === 4 && city === 'memphis') {
      events.push({
        title: 'Memphis in May Festival',
        description: 'The annual Memphis in May festival is happening! Crowds gather for BBQ, music, and celebration.',
        outcomes: [
          {
            id: 'join_festival',
            text: 'You join the festivities, enjoying BBQ and live blues music. The atmosphere is electric!',
            effects: [
              { type: 'stat', target: 'happiness', value: 15 },
              { type: 'stat', target: 'energy', value: -20 },
              { type: 'money', target: 'cash', value: -30 },
            ],
          },
          {
            id: 'work_festival',
            text: 'You pick up a temporary job at a food booth. Long hours but good tips!',
            effects: [
              { type: 'money', target: 'cash', value: 150 },
              { type: 'stat', target: 'energy', value: -40 },
              { type: 'reputation', target: 'community', value: 5 },
            ],
          },
        ],
      });
    }
    
    // Summer events
    if (month >= 6 && month <= 8) {
      events.push({
        title: 'Heat Wave',
        description: 'A scorching heat wave hits the Mid-South. Stay hydrated!',
        outcomes: [
          {
            id: 'stay_inside',
            text: 'You stay indoors with AC, staying cool but missing out on activities.',
            effects: [
              { type: 'stat', target: 'energy', value: -5 },
              { type: 'stat', target: 'health', value: 0 },
            ],
          },
          {
            id: 'push_through',
            text: 'You push through the heat. You feel drained but accomplished.',
            effects: [
              { type: 'stat', target: 'energy', value: -25 },
              { type: 'stat', target: 'health', value: -5 },
              { type: 'stat', target: 'fitness', value: 2 },
            ],
          },
        ],
      });
    }
    
    // Arkansas State Fair (October = month 9)
    if (month === 9 && city === 'littlerock') {
      events.push({
        title: 'Arkansas State Fair',
        description: 'The Arkansas State Fair is in town! Rides, games, fried everything.',
        outcomes: [
          {
            id: 'go_to_fair',
            text: 'You spend the day at the fair, riding rides and eating funnel cakes.',
            effects: [
              { type: 'stat', target: 'happiness', value: 20 },
              { type: 'stat', target: 'health', value: -3 },
              { type: 'money', target: 'cash', value: -50 },
            ],
          },
        ],
      });
    }
    
    // Winter holiday season
    if (month === 11) {
      events.push({
        title: 'Holiday Season',
        description: 'The holidays are here. Streets are decorated, families gather.',
        outcomes: [
          {
            id: 'family_time',
            text: 'You spend quality time with family. It warms your spirit.',
            effects: [
              { type: 'stat', target: 'happiness', value: 25 },
              { type: 'stat', target: 'stress', value: -10 },
            ],
          },
          {
            id: 'volunteer',
            text: 'You volunteer at a local shelter. It feels good to give back.',
            effects: [
              { type: 'reputation', target: 'community', value: 15 },
              { type: 'stat', target: 'happiness', value: 10 },
            ],
          },
        ],
      });
    }
    
    return events;
  }
  
  // === RANDOM LIFE EVENTS ===
  
  generateRandomEvent(player: PlayerState): StorylineEvent | null {
    const roll = Math.random();
    if (roll > 0.1) return null; // 10% chance of random event
    
    const events: Array<{ title: string; description: string; outcomes: EventOutcome[] }> = [
      {
        title: 'Street Musician',
        description: 'A talented street musician is playing blues. People are stopping to listen.',
        outcomes: [
          {
            id: 'tip_musician',
            text: 'You toss a few dollars in their case. They nod in appreciation.',
            effects: [
              { type: 'money' as const, target: 'cash', value: -5 },
              { type: 'stat' as const, target: 'happiness', value: 3 },
              { type: 'reputation' as const, target: 'community', value: 1 },
            ],
          },
          {
            id: 'listen',
            text: 'You stop and listen for a while. The music lifts your spirits.',
            effects: [
              { type: 'stat' as const, target: 'happiness', value: 5 },
            ],
          },
        ],
      },
      {
        title: 'Found Money',
        description: 'You spot a $20 bill on the ground. No one seems to be looking for it.',
        outcomes: [
          {
            id: 'keep_it',
            text: 'You pocket the money. Finders keepers.',
            effects: [
              { type: 'money' as const, target: 'cash', value: 20 },
            ],
          },
          {
            id: 'ask_around',
            text: 'You ask around. An elderly woman says she dropped it. You return it.',
            effects: [
              { type: 'reputation' as const, target: 'community', value: 5 },
              { type: 'stat' as const, target: 'happiness', value: 5 },
            ],
          },
        ],
      },
      {
        title: 'Car Breakdown',
        description: 'Your car makes a strange noise and stalls on the side of the road.',
        outcomes: [
          {
            id: 'call_tow',
            text: 'You call a tow truck. Expensive but necessary.',
            effects: [
              { type: 'money' as const, target: 'cash', value: -150 },
              { type: 'stat' as const, target: 'stress', value: 10 },
            ],
          },
          {
            id: 'fix_yourself',
            text: 'You pop the hood and manage to fix it yourself! Basic mechanic skills pay off.',
            effects: [
              { type: 'stat' as const, target: 'intelligence', value: 2 },
              { type: 'stat' as const, target: 'stress', value: 5 },
            ],
            requirements: [{ type: 'stat', target: 'intelligence', min: 40 }],
          },
        ],
      },
      {
        title: 'Old Friend',
        description: 'You run into someone from your past. They seem happy to see you.',
        outcomes: [
          {
            id: 'catch_up',
            text: 'You catch up over coffee. It\'s good to reconnect.',
            effects: [
              { type: 'stat' as const, target: 'happiness', value: 8 },
              { type: 'money' as const, target: 'cash', value: -8 },
            ],
          },
          {
            id: 'polite_wave',
            text: 'You wave and keep walking. Sometimes the past stays in the past.',
            effects: [
              { type: 'stat' as const, target: 'stress', value: 2 },
            ],
          },
        ],
      },

      {
        title: 'Street Market Bargain',
        description: 'A pop-up street vendor is selling rare vintage items at suspiciously low prices.',
        outcomes: [
          { id: 'buy', text: 'Buy a vintage watch for $150.', effects: [{ type: 'money' as const, target: 'cash', value: -150 }, { type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'stat' as const, target: 'happiness', value: 6 }] },
          { id: 'walk', text: 'Keep walking—suspiciously cheap.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 1 }] },
        ],
      },
      {
        title: 'Scratch-Off Surprise',
        description: 'You find a lottery ticket on the ground. It looks unscratched.',
        outcomes: [
          { id: 'scratch', text: 'Scratch it and see what happens.', effects: [{ type: 'money' as const, target: 'cash', value: 100 }, { type: 'stat' as const, target: 'happiness', value: 10 }] },
          { id: 'sell', text: 'Sell it to a curious passerby for $5.', effects: [{ type: 'money' as const, target: 'cash', value: 5 }] },
        ],
      },
      {
        title: 'Food Drive Volunteer',
        description: 'A local food bank needs help packing boxes for families in need.',
        outcomes: [
          { id: 'help', text: 'Spend the afternoon volunteering.', effects: [{ type: 'reputation' as const, target: 'community', value: 12 }, { type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'energy', value: -10 }] },
          { id: 'donate', text: 'Donate $50 but skip the manual labor.', effects: [{ type: 'money' as const, target: 'cash', value: -50 }, { type: 'reputation' as const, target: 'community', value: 6 }] },
        ],
      },
      {
        title: 'Blackout in the City',
        description: 'The power grid flickers and the whole block goes dark. Businesses are closing early.',
        outcomes: [
          { id: 'candle', text: 'Buy candles and hunker down.', effects: [{ type: 'money' as const, target: 'cash', value: -20 }, { type: 'stat' as const, target: 'stress', value: -5 }] },
          { id: 'explore', text: 'Explore the darkened streets with neighbors.', effects: [{ type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'stat' as const, target: 'happiness', value: 5 }] },
        ],
      },
      {
        title: 'Stray Puppy',
        description: 'A wet, scruffy puppy wanders up to you with big, hopeful eyes.',
        outcomes: [
          { id: 'adopt', text: 'Adopt it and take it to a vet ($75).', effects: [{ type: 'money' as const, target: 'cash', value: -75 }, { type: 'stat' as const, target: 'happiness', value: 20 }, { type: 'stat' as const, target: 'stress', value: -8 }] },
          { id: 'shelter', text: 'Call animal control to help it.', effects: [{ type: 'reputation' as const, target: 'community', value: 5 }] },
        ],
      },
      {
        title: 'Free Concert Tickets',
        description: 'A promoter on the corner is handing out tickets to a show tonight.',
        outcomes: [
          { id: 'take', text: 'Grab a ticket and go.', effects: [{ type: 'stat' as const, target: 'happiness', value: 12 }, { type: 'stat' as const, target: 'energy', value: -5 }] },
          { id: 'decline', text: 'Decline and save your time.', effects: [{ type: 'stat' as const, target: 'stress', value: -3 }] },
        ],
      },
      {
        title: 'Rush Hour Hero',
        description: 'An elderly pedestrian drops their groceries near a busy intersection.',
        outcomes: [
          { id: 'help', text: 'Run over and help gather everything.', effects: [{ type: 'reputation' as const, target: 'community', value: 10 }, { type: 'stat' as const, target: 'charisma', value: 3 }] },
          { id: 'watch', text: 'Let someone else handle it.', effects: [{ type: 'stat' as const, target: 'happiness', value: -2 }] },
        ],
      },
      {
        title: 'Mystery Delivery',
        description: 'A delivery drone lands near you with a package addressed to a stranger who is nowhere in sight.',
        outcomes: [
          { id: 'open', text: 'Open the package.', effects: [{ type: 'money' as const, target: 'cash', value: 40 }, { type: 'reputation' as const, target: 'community', value: -5 }] },
          { id: 'return', text: 'Take it to the nearest post office.', effects: [{ type: 'reputation' as const, target: 'community', value: 7 }] },
        ],
      },
      // v0.88.0 events
      {
        title: 'Spontaneous Karaoke Contest',
        description: 'A bar is hosting an open-mic karaoke battle. The winner gets a cash prize and local fame.',
        outcomes: [
          { id: 'perform', text: 'Grab the mic and belt out your favorite song.', effects: [{ type: 'money' as const, target: 'cash', value: 80 }, { type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'reputation' as const, target: 'social', value: 5 }] },
          { id: 'cheer', text: 'Cheer from the crowd and buy the winner a drink.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'happiness', value: 4 }] },
        ],
      },
      {
        title: 'Shady Dealer Offer',
        description: 'A stranger in an alley whispers about "easy money" and a bag of unmarked goods.',
        outcomes: [
          { id: 'buy_goods', text: 'Pay $200 for the bag. Hope it pays off.', effects: [{ type: 'money' as const, target: 'cash', value: -200 }, { type: 'money' as const, target: 'cash', value: 500 }, { type: 'reputation' as const, target: 'criminal', value: 10 }, { type: 'stat' as const, target: 'stress', value: 8 }] },
          { id: 'refuse', text: 'Walk away. Nothing legal happens in alleys.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 2 }] },
        ],
      },
      {
        title: 'Lost Wallet',
        description: 'You find a leather wallet on a bench. It has cash and an ID inside.',
        outcomes: [
          { id: 'keep', text: 'Keep the cash and toss the wallet.', effects: [{ type: 'money' as const, target: 'cash', value: 60 }, { type: 'reputation' as const, target: 'community', value: -3 }] },
          { id: 'return', text: 'Mail it back to the address on the ID.', effects: [{ type: 'reputation' as const, target: 'community', value: 8 }, { type: 'stat' as const, target: 'happiness', value: 5 }] },
        ],
      },
      {
        title: 'Talent Scout',
        description: 'A scout claims they can get you into a talent show that pays real money.',
        outcomes: [
          { id: 'audition', text: 'Take the audition. Show them what you got.', effects: [{ type: 'money' as const, target: 'cash', value: 200 }, { type: 'stat' as const, target: 'charisma', value: 4 }, { type: 'reputation' as const, target: 'social', value: 6 }] },
          { id: 'pass', text: 'Decline. Showbiz is a scam.', effects: [{ type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      {
        title: 'Inspiration Strike',
        description: 'A sudden idea hits you for a new business, song, or invention.',
        outcomes: [
          { id: 'act', text: 'Drop everything and develop the idea.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 4 }, { type: 'stat' as const, target: 'energy', value: -10 }, { type: 'stat' as const, target: 'intelligence', value: 1 }] },
          { id: 'note', text: 'Jot it down for later.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 1 }] },
        ],
      },
      // v0.87.0 events
      {
        title: 'Pop-Up Job Fair',
        description: 'A recruiting bus is parked downtown, offering same-day interviews for contract work.',
        outcomes: [
          { id: 'interview', text: 'Hand over your resume and ace the interview.', effects: [{ type: 'money' as const, target: 'cash', value: 120 }, { type: 'stat' as const, target: 'stress', value: 5 }, { type: 'reputation' as const, target: 'professional', value: 4 }] },
          { id: 'skip', text: 'Walk past. Today is not your day.', effects: [{ type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      {
        title: 'Celebrity Sighting',
        description: 'You spot a famous actor filming a scene on a public sidewalk.',
        outcomes: [
          { id: 'photo', text: 'Snap a respectful photo from the crowd.', effects: [{ type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 1 }] },
          { id: 'autograph', text: 'Try to get an autograph to sell online.', effects: [{ type: 'money' as const, target: 'cash', value: 60 }, { type: 'reputation' as const, target: 'community', value: -2 }] },
        ],
      },
      {
        title: 'Flash Flood Warning',
        description: 'Emergency alerts warn of sudden flooding in low-lying areas.',
        outcomes: [
          { id: 'evacuate', text: 'Shelter in a cafe and wait it out.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'stress', value: -5 }] },
          { id: 'drive', text: 'Risk driving through water to get home.', effects: [{ type: 'money' as const, target: 'cash', value: -300 }, { type: 'stat' as const, target: 'stress', value: 15 }] },
        ],
      },
      {
        title: 'Language Exchange',
        description: 'A tourist asks you for directions in broken English and offers to buy you coffee as thanks.',
        outcomes: [
          { id: 'accept', text: 'Accept and chat about your city.', effects: [{ type: 'stat' as const, target: 'happiness', value: 6 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'decline', text: 'Politely decline and move on.', effects: [{ type: 'stat' as const, target: 'stress', value: -1 }] },
        ],
      },
      {
        title: 'Influencer Giveaway',
        description: 'A local influencer is drawing a crowd, handing out free merchandise for shares.',
        outcomes: [
          { id: 'participate', text: 'Share their post and grab the freebie.', effects: [{ type: 'stat' as const, target: 'happiness', value: 4 }, { type: 'stat' as const, target: 'charisma', value: 1 }] },
          { id: 'ignore', text: 'Keep walking. Social media is not worth it.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 1 }] },
        ],
      },
      {
        title: 'Neighborhood Watch',
        description: 'A flyer asks residents to sign up for the new neighborhood watch program.',
        outcomes: [
          { id: 'join', text: 'Sign up and attend the first meeting.', effects: [{ type: 'reputation' as const, target: 'community', value: 10 }, { type: 'stat' as const, target: 'stress', value: -3 }] },
          { id: 'pass', text: 'Toss the flyer in the recycling.', effects: [{ type: 'stat' as const, target: 'stress', value: -1 }] },
        ],
      },
      // v0.89.0 — International Flavor & City Life
      {
        title: 'Street Artist Commission',
        description: 'A traveling street artist offers to paint your portrait for a small fee.',
        outcomes: [
          { id: 'pay', text: 'Pay for the portrait and pose confidently.', effects: [{ type: 'money' as const, target: 'cash', value: -25 }, { type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'tip', text: 'Tip generously and chat with the artist.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'happiness', value: 4 }] },
          { id: 'decline', text: 'Politely decline and keep walking.', effects: [{ type: 'stat' as const, target: 'stress', value: -1 }] },
        ],
      },
      {
        title: 'Currency Exchange Windfall',
        description: 'You find an old currency exchange receipt in your pocket with leftover foreign cash.',
        outcomes: [
          { id: 'exchange', text: 'Convert it back at the nearest kiosk.', effects: [{ type: 'money' as const, target: 'cash', value: 45 }, { type: 'stat' as const, target: 'intelligence', value: 1 }] },
          { id: 'keep', text: 'Keep it as a souvenir.', effects: [{ type: 'stat' as const, target: 'happiness', value: 3 }] },
        ],
      },
      {
        title: 'Local Food Challenge',
        description: 'A diner challenges you to finish their hottest dish in under ten minutes.',
        outcomes: [
          { id: 'attempt', text: 'Accept the challenge.', effects: [{ type: 'stat' as const, target: 'health', value: -5 }, { type: 'stat' as const, target: 'happiness', value: 10 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'watch', text: 'Watch someone else suffer instead.', effects: [{ type: 'stat' as const, target: 'happiness', value: 3 }, { type: 'money' as const, target: 'cash', value: -10 }] },
        ],
      },
      {
        title: 'Open Mic Spotlight',
        description: 'A café host spots you in the crowd and calls your name for the open mic.',
        outcomes: [
          { id: 'perform', text: 'Grab the mic and give it your best shot.', effects: [{ type: 'stat' as const, target: 'charisma', value: 5 }, { type: 'stat' as const, target: 'stress', value: 5 }, { type: 'stat' as const, target: 'happiness', value: 6 }] },
          { id: 'refuse', text: 'Shake your head and order another coffee.', effects: [{ type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      {
        title: 'Lost Tourist',
        description: 'A confused tourist waves a map and asks for directions in a language you barely understand.',
        outcomes: [
          { id: 'help', text: 'Use gestures and your phone to guide them.', effects: [{ type: 'reputation' as const, target: 'community', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'ignore', text: 'Point vaguely and keep moving.', effects: [{ type: 'stat' as const, target: 'stress', value: 1 }] },
        ],
      },
      // v0.90.0 — City Life Expansion
      {
        title: 'Sunrise Yoga Class',
        description: 'A group is gathering in the park for a donation-based sunrise yoga session.',
        outcomes: [
          { id: 'join', text: 'Roll out a mat and join the class.', effects: [{ type: 'stat' as const, target: 'fitness', value: 4 }, { type: 'stat' as const, target: 'stress', value: -6 }, { type: 'stat' as const, target: 'happiness', value: 4 }] },
          { id: 'donate', text: 'Donate $10 but watch from a bench.', effects: [{ type: 'money' as const, target: 'cash', value: -10 }, { type: 'stat' as const, target: 'happiness', value: 2 }] },
        ],
      },
      {
        title: 'Bookstore Reading',
        description: 'A local author is reading from their new novel at a quiet bookstore.',
        outcomes: [
          { id: 'listen', text: 'Stay for the reading and buy a signed copy.', effects: [{ type: 'money' as const, target: 'cash', value: -25 }, { type: 'stat' as const, target: 'intelligence', value: 3 }, { type: 'stat' as const, target: 'happiness', value: 5 }] },
          { id: 'chat', text: 'Compliment the author and ask about their process.', effects: [{ type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'stat' as const, target: 'intelligence', value: 2 }] },
        ],
      },
      {
        title: 'Vintage Car Parade',
        description: 'A parade of classic cars rolls down the main street, horns honking and crowds cheering.',
        outcomes: [
          { id: 'cheer', text: 'Cheer and snap photos with the owners.', effects: [{ type: 'stat' as const, target: 'happiness', value: 6 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'race', text: 'Wave down a convertible and offer a friendly drag race.', effects: [{ type: 'stat' as const, target: 'stress', value: 4 }, { type: 'reputation' as const, target: 'social', value: 3 }] },
        ],
      },
      {
        title: 'Community Cleanup',
        description: 'Neighbors are organizing a Saturday morning litter cleanup along the riverfront.',
        outcomes: [
          { id: 'volunteer', text: 'Grab a trash bag and spend the morning cleaning.', effects: [{ type: 'reputation' as const, target: 'community', value: 12 }, { type: 'stat' as const, target: 'happiness', value: 5 }, { type: 'stat' as const, target: 'energy', value: -10 }] },
          { id: 'buy_pizza', text: 'Skip the cleanup but buy pizzas for the volunteers.', effects: [{ type: 'money' as const, target: 'cash', value: -40 }, { type: 'reputation' as const, target: 'community', value: 6 }, { type: 'stat' as const, target: 'happiness', value: 3 }] },
        ],
      },
      {
        title: 'Late-Night Food Truck',
        description: 'A glowing food truck is serving one last round after the bars close.',
        outcomes: [
          { id: 'eat', text: 'Order the special and chat with the cook.', effects: [{ type: 'money' as const, target: 'cash', value: -18 }, { type: 'stat' as const, target: 'happiness', value: 7 }, { type: 'stat' as const, target: 'health', value: -2 }] },
          { id: 'pass', text: 'Go home hungry and save the calories.', effects: [{ type: 'stat' as const, target: 'health', value: 2 }, { type: 'stat' as const, target: 'happiness', value: -2 }] },
        ],
      },
      // v0.91.0 — City Life Expansion
      {
        title: 'Impromptu Block Party',
        description: 'Someone rolled speakers onto the sidewalk and neighbors are starting an open-air dance party.',
        outcomes: [
          { id: 'dance', text: 'Jump in and dance like nobody\'s watching.', effects: [{ type: 'stat' as const, target: 'happiness', value: 9 }, { type: 'stat' as const, target: 'fitness', value: 2 }, { type: 'stat' as const, target: 'energy', value: -5 }] },
          { id: 'dj', text: 'Offer to DJ from your phone for an hour.', effects: [{ type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'reputation' as const, target: 'social', value: 3 }] },
        ],
      },
      {
        title: 'Unexpected Rainstorm',
        description: 'The sky opens up without warning. Pedestrians scatter and shop awnings fill with refugees.',
        outcomes: [
          { id: 'cafe', text: 'Duck into a cozy cafe and buy a warm drink.', effects: [{ type: 'money' as const, target: 'cash', value: -8 }, { type: 'stat' as const, target: 'stress', value: -4 }] },
          { id: 'sprint', text: 'Sprint home and embrace the chaos.', effects: [{ type: 'stat' as const, target: 'fitness', value: 3 }, { type: 'stat' as const, target: 'health', value: -3 }] },
        ],
      },
      {
        title: 'Street Chess Match',
        description: 'A weathered chess board sits on a folding table with a $10 challenge posted on the sign.',
        outcomes: [
          { id: 'play', text: 'Accept the match.', effects: [{ type: 'money' as const, target: 'cash', value: 10 }, { type: 'stat' as const, target: 'intelligence', value: 3 }, { type: 'stat' as const, target: 'happiness', value: 4 }] },
          { id: 'watch', text: 'Watch and learn from the sidelines.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 1 }] },
        ],
      },
      {
        title: 'Hidden Bookstore Sale',
        description: 'A tiny used bookstore is selling everything for $1 to make room for a new shipment.',
        outcomes: [
          { id: 'haul', text: 'Buy an armful of books and strengthen your mind.', effects: [{ type: 'money' as const, target: 'cash', value: -12 }, { type: 'stat' as const, target: 'intelligence', value: 4 }, { type: 'stat' as const, target: 'happiness', value: 5 }] },
          { id: 'recommend', text: 'Recommend it to strangers and make new friends.', effects: [{ type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'reputation' as const, target: 'community', value: 4 }] },
        ],
      },
      {
        title: 'Rooftop Movie Night',
        description: 'A building manager is projecting a classic film on a rooftop for a small donation.',
        outcomes: [
          { id: 'donate', text: 'Donate $15 and enjoy the film under the stars.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'stress', value: -6 }] },
          { id: 'peek', text: 'Watch from a nearby fire escape for free.', effects: [{ type: 'stat' as const, target: 'happiness', value: 3 }, { type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      // v0.93.0 — Global City Events
      {
        title: 'Night Market Discovery',
        description: 'A winding street market appears after sunset with unfamiliar spices, gadgets, and street food.',
        outcomes: [
          { id: 'feast', text: 'Sample dishes from five different stalls.', effects: [{ type: 'money' as const, target: 'cash', value: -22 }, { type: 'stat' as const, target: 'happiness', value: 10 }, { type: 'stat' as const, target: 'health', value: 2 }] },
          { id: 'souvenir', text: 'Buy a handmade souvenir for a stranger back home.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'reputation' as const, target: 'social', value: 3 }] },
        ],
      },
      {
        title: 'Public Transit Serenade',
        description: 'A musician boards your train and fills the car with a haunting melody, then passes a hat.',
        outcomes: [
          { id: 'tip', text: 'Drop a generous tip in the hat.', effects: [{ type: 'money' as const, target: 'cash', value: -10 }, { type: 'stat' as const, target: 'happiness', value: 6 }, { type: 'stat' as const, target: 'stress', value: -3 }] },
          { id: 'record', text: 'Record a clip and share it online.', effects: [{ type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'reputation' as const, target: 'social', value: 4 }] },
        ],
      },
      {
        title: 'Lost Tourist',
        description: 'A confused traveler waves a map at you, pointing to a landmark written in another language.',
        outcomes: [
          { id: 'guide', text: 'Walk them to the destination.', effects: [{ type: 'stat' as const, target: 'happiness', value: 5 }, { type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'reputation' as const, target: 'community', value: 4 }] },
          { id: 'translate', text: 'Use your phone to translate directions and send them on their way.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 2 }, { type: 'stat' as const, target: 'happiness', value: 1 }] },
        ],
      },
      {
        title: 'Historic Building Tour',
        description: 'A local historian offers a free, unscheduled tour of a beautiful old building about to close for renovation.',
        outcomes: [
          { id: 'join', text: 'Join the tour and ask thoughtful questions.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 5 }, { type: 'stat' as const, target: 'happiness', value: 4 }] },
          { id: 'sketch', text: 'Sketch the architecture in a notebook.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 3 }, { type: 'stat' as const, target: 'happiness', value: 3 }] },
        ],
      },
      {
        title: 'Free Street Haircut',
        description: 'A student barber is offering free haircuts on the sidewalk to build a portfolio.',
        outcomes: [
          { id: 'trust', text: 'Let them give you a fresh cut.', effects: [{ type: 'stat' as const, target: 'charisma', value: 4 }, { type: 'stat' as const, target: 'happiness', value: 5 }, { type: 'stat' as const, target: 'stress', value: 3 }] },
          { id: 'decline', text: 'Politely decline and compliment their sign.', effects: [{ type: 'stat' as const, target: 'charisma', value: 1 }, { type: 'stat' as const, target: 'happiness', value: 1 }] },
        ],
      },
      // v0.95.0 — City Life & Travel Moments
      {
        title: 'Ferry Sunset',
        description: 'The last ferry of the day cuts through golden water. A stranger offers to split a bottle of wine.',
        outcomes: [
          { id: 'share', text: 'Split the wine and watch the city skyline fade.', effects: [{ type: 'money' as const, target: 'cash', value: -12 }, { type: 'stat' as const, target: 'happiness', value: 9 }, { type: 'stat' as const, target: 'stress', value: -5 }] },
          { id: 'decline', text: 'Keep to yourself and enjoy the view alone.', effects: [{ type: 'stat' as const, target: 'stress', value: -3 }, { type: 'stat' as const, target: 'intelligence', value: 1 }] },
        ],
      },
      {
        title: 'Pop-Up Record Shop',
        description: 'A crate-digger sets up a pop-up shop with rare vinyl from every continent.',
        outcomes: [
          { id: 'dig', text: 'Spend an hour flipping crates and find a hidden gem.', effects: [{ type: 'money' as const, target: 'cash', value: -35 }, { type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'chat', text: 'Chat with the seller and learn the stories behind the records.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 3 }, { type: 'reputation' as const, target: 'social', value: 3 }] },
        ],
      },
      {
        title: 'Late-Night Pharmacy Run',
        description: "You wander into a 24-hour pharmacy where the pharmacist is solving a stranger's crisis.",
        outcomes: [
          { id: 'help', text: 'Help translate for a confused customer.', effects: [{ type: 'reputation' as const, target: 'community', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'medicine', text: 'Buy what you need and quietly leave.', effects: [{ type: 'money' as const, target: 'cash', value: -18 }, { type: 'stat' as const, target: 'health', value: 5 }] },
        ],
      },
      {
        title: 'Sidewalk Book Exchange',
        description: 'A neighborhood box labeled "Take one, leave one" holds a book you loved as a kid.',
        outcomes: [
          { id: 'trade', text: 'Trade a book from your bag for the childhood favorite.', effects: [{ type: 'stat' as const, target: 'happiness', value: 7 }, { type: 'stat' as const, target: 'intelligence', value: 2 }] },
          { id: 'donate', text: 'Leave a book and pass the joy forward.', effects: [{ type: 'reputation' as const, target: 'community', value: 5 }, { type: 'stat' as const, target: 'happiness', value: 3 }] },
        ],
      },
      {
        title: 'Construction Site Lottery',
        description: 'Workers are pulling names for a spare front-row ticket to a sold-out show tonight.',
        outcomes: [
          { id: 'enter', text: 'Drop your name in the hard hat.', effects: [{ type: 'stat' as const, target: 'happiness', value: 12 }, { type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'money' as const, target: 'cash', value: -10 }] },
          { id: 'pass', text: 'Smile and keep walking; someone else needs the win.', effects: [{ type: 'stat' as const, target: 'happiness', value: 3 }, { type: 'reputation' as const, target: 'community', value: 4 }] },
        ],
      },
      // v0.96.0 — City Moments & Surprises
      {
        title: 'Rooftop Garden Invitation',
        description: 'A neighbor on the elevator invites you to a secret rooftop garden one floor above the skyline.',
        outcomes: [
          { id: 'accept', text: 'Bring a drink and mingle with the hosts.', effects: [{ type: 'money' as const, target: 'cash', value: -25 }, { type: 'stat' as const, target: 'happiness', value: 10 }, { type: 'reputation' as const, target: 'social', value: 6 }] },
          { id: 'decline', text: 'Politely decline and head back to the street.', effects: [{ type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      {
        title: 'City-Wide Scavenger Hunt',
        description: 'A local group hands you a clue card for a neighborhood treasure hunt with a cash prize.',
        outcomes: [
          { id: 'join', text: 'Spend the afternoon solving riddles across the district.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 4 }, { type: 'stat' as const, target: 'happiness', value: 6 }, { type: 'money' as const, target: 'cash', value: 40 }] },
          { id: 'watch', text: 'Cheer from a café and follow the leaderboard.', effects: [{ type: 'stat' as const, target: 'happiness', value: 3 }, { type: 'money' as const, target: 'cash', value: -8 }] },
        ],
      },
      {
        title: 'Street Magician Disappearing Act',
        description: "A magician borrows your phone, makes it vanish, then pulls it from a stranger's pocket.",
        outcomes: [
          { id: 'applaud', text: 'Applaud wildly and tip them $10.', effects: [{ type: 'money' as const, target: 'cash', value: -10 }, { type: 'stat' as const, target: 'happiness', value: 7 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'skeptical', text: 'Inspect your phone for scratches and smile politely.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 1 }, { type: 'stat' as const, target: 'happiness', value: 1 }] },
        ],
      },
      {
        title: 'Vintage Polaroid Swap',
        description: 'A Polaroid enthusiast offers to trade one of your snapshots for a rare cityscape print.',
        outcomes: [
          { id: 'trade', text: 'Swap photos and frame the print.', effects: [{ type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'keep', text: 'Keep your own photos but ask for a reprint.', effects: [{ type: 'money' as const, target: 'cash', value: -5 }, { type: 'stat' as const, target: 'happiness', value: 2 }] },
        ],
      },
      {
        title: 'Midnight Ramen Queue',
        description: 'A glowing noodle shop has a line wrapping the block at 1 a.m. The smell is impossible to resist.',
        outcomes: [
          { id: 'wait', text: "Wait 45 minutes for the chef's signature bowl.", effects: [{ type: 'money' as const, target: 'cash', value: -22 }, { type: 'stat' as const, target: 'happiness', value: 11 }, { type: 'stat' as const, target: 'health', value: 3 }] },
          { id: 'takeout', text: 'Grab takeout and eat on a park bench.', effects: [{ type: 'money' as const, target: 'cash', value: -16 }, { type: 'stat' as const, target: 'happiness', value: 5 }] },
        ],
      },
      // v0.97.0 — City Encounters
      {
        title: 'Riverboat Jazz Invitation',
        description: 'A saxophonist on the waterfront offers you a spare ticket for a floating jazz set.',
        outcomes: [
          { id: 'board', text: 'Board the boat and enjoy the set with a drink.', effects: [{ type: 'money' as const, target: 'cash', value: -30 }, { type: 'stat' as const, target: 'happiness', value: 10 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'listen', text: 'Stay on the dock and listen from the shore.', effects: [{ type: 'stat' as const, target: 'happiness', value: 5 }, { type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      {
        title: 'Neighborhood Power Outage',
        description: 'The block goes dark. People pour onto the street with candles and battery radios.',
        outcomes: [
          { id: 'socialize', text: 'Join a sidewalk gathering and meet neighbors.', effects: [{ type: 'reputation' as const, target: 'community', value: 8 }, { type: 'stat' as const, target: 'charisma', value: 2 }] },
          { id: 'shop', text: 'Buy ice and flashlights at a corner store before supplies run out.', effects: [{ type: 'money' as const, target: 'cash', value: -25 }, { type: 'stat' as const, target: 'intelligence', value: 2 }] },
        ],
      },
      {
        title: 'Foreign Film Pop-Up',
        description: 'A rooftop is screening an award-winning foreign film. The crowd urges you to grab a beanbag.',
        outcomes: [
          { id: 'watch', text: 'Settle in with popcorn and subtitles.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'happiness', value: 8 }, { type: 'stat' as const, target: 'intelligence', value: 2 }] },
          { id: 'pass', text: 'Pass and keep exploring the streets.', effects: [{ type: 'stat' as const, target: 'stress', value: -1 }] },
        ],
      },
      {
        title: 'Street Cart Free Sample',
        description: 'A food cart owner insists you try her new fusion creation and refuses payment.',
        outcomes: [
          { id: 'accept', text: 'Take the sample and leave a generous tip.', effects: [{ type: 'money' as const, target: 'cash', value: -10 }, { type: 'stat' as const, target: 'happiness', value: 9 }, { type: 'stat' as const, target: 'health', value: 2 }] },
          { id: 'share', text: 'Share it with a stranger and make a new friend.', effects: [{ type: 'stat' as const, target: 'charisma', value: 3 }, { type: 'reputation' as const, target: 'social', value: 4 }] },
        ],
      },
      {
        title: 'Lost Tourist Needs Directions',
        description: 'A confused tourist waves a map and asks for help in a language you barely recognize.',
        outcomes: [
          { id: 'guide', text: 'Walk them to their destination and practice gestures.', effects: [{ type: 'reputation' as const, target: 'community', value: 7 }, { type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'stat' as const, target: 'intelligence', value: 1 }] },
          { id: 'point', text: 'Point toward the nearest transit station and wish them luck.', effects: [{ type: 'stat' as const, target: 'happiness', value: 2 }] },
        ],
      },
      // v0.98.0 — City Encounters
      {
        title: 'Sandstorm Shortcut',
        description: 'A sudden desert sandstorm forces you into an alley shop where the owner challenges you to a backgammon game.',
        outcomes: [
          { id: 'play', text: 'Accept the game and wager a small sum.', effects: [{ type: 'money' as const, target: 'cash', value: -15 }, { type: 'stat' as const, target: 'intelligence', value: 3 }, { type: 'stat' as const, target: 'happiness', value: 4 }] },
          { id: 'wait', text: 'Wait out the storm with tea and conversation.', effects: [{ type: 'money' as const, target: 'cash', value: -5 }, { type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'stat' as const, target: 'stress', value: -3 }] },
        ],
      },
      {
        title: 'Rooftop Yoga Class',
        description: 'A group is doing sunrise yoga on a nearby roof and invites you up.',
        outcomes: [
          { id: 'join', text: 'Roll out a borrowed mat and stretch.', effects: [{ type: 'stat' as const, target: 'fitness', value: 4 }, { type: 'stat' as const, target: 'happiness', value: 5 }, { type: 'stat' as const, target: 'stress', value: -4 }] },
          { id: 'watch', text: 'Watch from the fire escape with coffee.', effects: [{ type: 'money' as const, target: 'cash', value: -4 }, { type: 'stat' as const, target: 'happiness', value: 2 }] },
        ],
      },
      {
        title: 'Underground Comedy Night',
        description: 'A comic on the street hands you a flyer for a secret basement show starting in ten minutes.',
        outcomes: [
          { id: 'attend', text: 'Pay cover and laugh in the front row.', effects: [{ type: 'money' as const, target: 'cash', value: -20 }, { type: 'stat' as const, target: 'happiness', value: 9 }, { type: 'stat' as const, target: 'stress', value: -3 }] },
          { id: 'pass', text: 'Pass the flyer to someone else.', effects: [{ type: 'reputation' as const, target: 'social', value: 3 }, { type: 'stat' as const, target: 'charisma', value: 1 }] },
        ],
      },
      {
        title: 'Book Club on the Train',
        description: 'Strangers on your train car have begun discussing a novel you just finished.',
        outcomes: [
          { id: 'join', text: 'Share your take and swap recommendations.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 3 }, { type: 'stat' as const, target: 'charisma', value: 2 }, { type: 'reputation' as const, target: 'social', value: 4 }] },
          { id: 'listen', text: 'Listen quietly and annotate your own copy.', effects: [{ type: 'stat' as const, target: 'intelligence', value: 2 }, { type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
      {
        title: 'Midnight Dog Walker Meetup',
        description: 'A pack of neighborhood dogs has pulled their walkers into an impromptu late-night park gathering.',
        outcomes: [
          { id: 'socialize', text: 'Stay and let the dogs introduce themselves.', effects: [{ type: 'stat' as const, target: 'happiness', value: 7 }, { type: 'reputation' as const, target: 'community', value: 3 }] },
          { id: 'leave', text: 'Excuse yourself and head home.', effects: [{ type: 'stat' as const, target: 'stress', value: -2 }] },
        ],
      },
    ];
    
    const selected = events[Math.floor(Math.random() * events.length)];
    if (!selected) return null;
    
    return {
      id: `random_${Date.now()}`,
      type: 'random',
      title: selected.title,
      description: selected.description,
      trigger: { type: 'random', conditions: {}, probability: 0.1 },
      outcomes: selected.outcomes,
    };
  }
  
  // === UTILITIES ===
  
  private meetsRequirement(player: PlayerState, req: EventRequirement): boolean {
    const playerStats = player as unknown as Record<string, number | string | boolean>;
    const value = playerStats[req.target];
    
    if (typeof value !== 'number') return true;
    if (req.min !== undefined && value < req.min) return false;
    if (req.max !== undefined && value > req.max) return false;
    
    return true;
  }
  
  private applyEffect(player: PlayerState, effect: EventEffect): void {
    const playerStats = player as unknown as Record<string, unknown>;
    
    switch (effect.type) {
      case 'money':
        if (effect.target === 'cash') {
          player.money += effect.value;
        } else if (effect.target === 'bank') {
          player.bankBalance += effect.value;
        }
        break;
      case 'stat':
        if (effect.target in player) {
          const current = playerStats[effect.target];
          if (typeof current === 'number') {
            (playerStats as Record<string, number>)[effect.target] = Math.max(0, Math.min(100, current + effect.value));
          }
        }
        break;
      case 'reputation':
        if (effect.target in player.reputation) {
          player.reputation[effect.target as keyof typeof player.reputation] += effect.value;
        }
        break;
      default:
        break;
    }
  }
  
  activateEvent(event: StorylineEvent): void {
    this.activeEvents.set(event.id, event);
  }
  
  getActiveEvent(eventId: string): StorylineEvent | undefined {
    return this.activeEvents.get(eventId);
  }
  
  getActiveEvents(): StorylineEvent[] {
    return Array.from(this.activeEvents.values());
  }
  
  clearEvent(eventId: string): void {
    this.activeEvents.delete(eventId);
  }
  
  getEventHistory(): StorylineEvent[] {
    return this.eventHistory;
  }
  
  // === QUEST SYSTEM ===
  
  startQuest(player: PlayerState, npc: any, quest: Quest): GameAction {
    const questCopy = { ...quest, status: 'active' as const };
    this.activeQuests.set(quest.id, questCopy);
    
    return { 
      success: true, 
      message: `📜 **New Quest: ${quest.title}**\n${'─'.repeat(40)}\n${quest.description}\n\nObjective: ${quest.objectives[0]?.description || ''}` 
    };
  }
  
  updateQuestProgress(questId: string, objectiveIndex: number): boolean {
    const quest = this.activeQuests.get(questId);
    if (!quest || !quest.objectives[objectiveIndex]) return false;
    
    quest.objectives[objectiveIndex].isCompleted = true;
    
    // Check if all objectives are done
    if (quest.objectives.every(o => o.isCompleted)) {
      quest.status = 'completed';
    }
    
    return true;
  }
  
  completeQuest(player: PlayerState, npc: any, questId: string): GameAction {
    const quest = this.activeQuests.get(questId);
    if (!quest || quest.status !== 'completed') {
      return { success: false, message: 'Quest is not yet complete.' };
    }
    
    // Apply rewards
    player.money += quest.reward.money;
    if (quest.reward.stat) {
      const { target, value } = quest.reward.stat;
      (player as any)[target] = Math.min(100, (player as any)[target] + value);
    }
    if (quest.reward.relationship) {
      const { target, value } = quest.reward.relationship;
      const currentRel = player.relationships.get(target) || 0;
      player.relationships.set(target, Math.min(100, currentRel + value));
    }
    
    this.activeQuests.delete(questId);
    
    return { 
      success: true, 
      message: `✅ **Quest Completed: ${quest.title}**\n${'─'.repeat(40)}\n${npc.name} is impressed! Reward: $${quest.reward.money}` 
    };
  }
  
  getActiveQuests(): Quest[] {
    return Array.from(this.activeQuests.values());
  }
}
