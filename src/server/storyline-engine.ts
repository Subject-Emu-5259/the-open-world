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
