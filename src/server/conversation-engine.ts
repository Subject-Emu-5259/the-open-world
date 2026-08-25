// THE OPEN WORLD - Conversation Engine v2
// Natural, memory-aware NPC conversations with optional AI backend.

import type { NPCState } from './social-engine.js';
import type { Relationship } from '../shared/types.js';
import { generateNPCReply } from './ai-npc-provider.js';

export type ConversationIntentType =
  | 'greeting' | 'question' | 'smalltalk' | 'trade' | 'farewell' | 'flirt'
  | 'insult' | 'compliment' | 'unknown' | 'quest' | 'apology' | 'rumor' | 'introduction'
  | 'answer_affirm' | 'answer_deny' | 'joke' | 'roast' | 'gift' | 'story';

export interface ConversationIntent {
  type: ConversationIntentType;
  confidence: number;
  fair?: boolean;
  topic?: string;
}

export interface ConversationResponse {
  text: string;
  relationshipChange: number;
  questTriggered?: string;
  usedAI?: boolean;
}

export interface GameTimeContext {
  hour: number;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface NPCMood {
  label: 'cheerful' | 'neutral' | 'busy' | 'guarded' | 'hostile' | 'tired';
  description: string;
}

export class ConversationEngine {


  // -------------------------------------------------------------------------
  // PUBLIC API
  // -------------------------------------------------------------------------

  async generateGreeting(
    npc: NPCState,
    player: any,
    relationship?: Relationship,
    gameTime?: GameTimeContext
  ): Promise<{ text: string; relationshipChange: number; usedAI?: boolean }> {
    const ctx = gameTime || this.inferTimeContext();
    const rel = relationship ?? { value: npc.relationship ?? 0, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] };

    const aiReply = await this.tryAI({ npc, player, relationship: rel, input: '', ctx, purpose: 'greeting' });
    if (aiReply) {
      return { text: this.ensureQuoted(aiReply.text), relationshipChange: this.greetingRelChange(rel.value), usedAI: true };
    }

    const text = this.greetingResponse(npc, rel, player, ctx);
    return { text, relationshipChange: this.greetingRelChange(rel.value), usedAI: false };
  }

  async generateResponse(
    npc: NPCState,
    playerInput: string,
    player: any,
    relationship?: Relationship,
    gameTime?: GameTimeContext
  ): Promise<ConversationResponse> {
    const ctx = gameTime || this.inferTimeContext();
    const rel = relationship ?? { value: npc.relationship ?? 0, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] };
    const input = playerInput.trim();
    const lower = input.toLowerCase();

    // Farewell has the highest priority so players can always exit naturally.
    if (this.isFarewell(lower)) {
      return { text: this.farewellResponse(npc, rel, player, ctx), relationshipChange: 0, usedAI: false };
    }

    // Try AI brain
    const aiReply = await this.tryAI({ npc, player, relationship: rel, input, ctx, purpose: 'reply' });
    if (aiReply) {
      return this.wrapAIResponse(aiReply.text, rel, input, npc, ctx, player, aiReply.learnedName);
    }

    // Local template pipeline
    const intent = this.detectIntent(input, player, rel);
    const topic = this.topicFromIntent(intent, input);
    this.rememberTopic(rel.flags, topic);

    const lastQuestion = this.recallLastNpcQuestion(rel.memory);
    const response = this.buildLocalResponse(npc, input, player, rel, ctx, intent, topic, lastQuestion);

    // Persist memory
    this.rememberMessage(rel.memory, { role: 'player', content: input });
    this.rememberMessage(rel.memory, { role: 'npc', content: this.stripNarrative(response.text) });
    this.updateRelationship(rel, response.relationshipChange, npc);

    return { text: response.text, relationshipChange: response.relationshipChange, usedAI: false };
  }

  // -------------------------------------------------------------------------
  // AI BRIDGE (optional)
  // -------------------------------------------------------------------------

  private async tryAI(opts: {
    npc: NPCState;
    player: any;
    relationship: Relationship;
    input: string;
    ctx: GameTimeContext;
    purpose: 'greeting' | 'reply';
  }): Promise<{ text: string; learnedName?: string } | null> {
    try {
      const result = await generateNPCReply({
        npc: opts.npc,
        player: opts.player,
        relationship: opts.relationship,
        playerInput: opts.input,
        timeContext: opts.ctx,
        purpose: opts.purpose,
      });
      return result && result.text ? { text: result.text, learnedName: result.learnedName } : null;
    } catch (e) {
      console.warn('[conversation-engine] AI bridge failed, using templates.', e);
      return null;
    }
  }

  private wrapAIResponse(raw: string, rel: Relationship, input: string, npc: NPCState, ctx: GameTimeContext, player: any, learnedName?: string): ConversationResponse {
    // Sanitize and normalize AI output.
    let text = raw.trim();
    if (!text) return this.buildLocalResponse(npc, input, player, rel, ctx, { type: 'unknown', confidence: 0 }, 'general', '');

    text = this.ensureQuoted(text);
    const relChange = this.estimateRelChange(input, rel.value);

    if (learnedName) {
      this.setKnownName(rel.flags, { name: learnedName });
    }

    this.rememberMessage(rel.memory, { role: 'player', content: input });
    this.rememberMessage(rel.memory, { role: 'npc', content: this.stripNarrative(text) });
    this.updateRelationship(rel, relChange, npc);

    return { text, relationshipChange: relChange, usedAI: true };
  }

  private estimateRelChange(input: string, relValue: number): number {
    const lower = input.toLowerCase();
    if (this.isInsulting(lower)) return -10;
    if (this.isApologetic(lower)) return relValue < 0 ? 5 : 2;
    if (this.isFlirty(lower)) return relValue > 30 ? 3 : -5;
    if (this.isCompliment(lower)) return 3;
    if (lower.includes('?')) return 1;
    return 1;
  }

  // -------------------------------------------------------------------------
  // INTENT DETECTION
  // -------------------------------------------------------------------------

  detectIntent(input: string, player: any, relationship?: Relationship): ConversationIntent {
    const lower = input.toLowerCase().trim();
    const lastQuestion = relationship ? this.recallLastNpcQuestion(relationship.memory) : '';

    // Farewell / exit
    if (this.isFarewell(lower)) return { type: 'farewell', confidence: 0.95 };

    // Insults
    if (this.isInsulting(lower)) return { type: 'insult', confidence: 0.85 };

    // Apologies
    if (this.isApologetic(lower)) return { type: 'apology', confidence: 0.82 };

    // Flirting
    if (this.isFlirty(lower)) return { type: 'flirt', confidence: 0.75 };

    // Joke request or laughter
    if (this.matchesAny(lower, ['joke', 'tell me a joke', 'say something funny', 'make me laugh', 'funny'])) {
      return { type: 'joke', confidence: 0.8 };
    }

    // Roast / trash talk
    if (this.matchesAny(lower, ['roast me', 'roast', 'come at me', 'say something mean', 'diss me'])) {
      return { type: 'roast', confidence: 0.7 };
    }

    // Greetings
    if (this.matchesAny(lower, ['hey', 'hi', 'hello', 'sup', 'wasup', 'wassup', 'yo', 'whats up', "what's up", 'howdy', 'mornin', 'evenin', 'wassgood', 'wsgood', 'good morning', 'good afternoon', 'good evening'])) {
      return { type: 'greeting', confidence: 0.9 };
    }

    // Introduction / name exchange
    if (this.isIntroduction(lower, player, lastQuestion)) {
      return { type: 'introduction', confidence: 0.92 };
    }

    // Gifts / money
    if (this.matchesAny(lower, ['gift', 'present', 'give you', 'buy you', 'for you'])) {
      return { type: 'gift', confidence: 0.65 };
    }

    // Yes/no answers to an NPC question
    if (lastQuestion) {
      if (this.isAffirmative(lower)) return { type: 'answer_affirm', confidence: 0.85 };
      if (this.isNegative(lower)) return { type: 'answer_deny', confidence: 0.85 };
    }

    // Trade / business
    if (this.matchesAny(lower, ['buy', 'sell', 'trade', 'deal', 'price', 'cost', 'how much', 'discount', 'bargain', 'purchase', 'pay'])) {
      return { type: 'trade', fair: true, confidence: 0.8 };
    }

    // Rumors / gossip
    if (this.matchesAny(lower, ['rumor', 'gossip', 'hear anything', 'heard anything', 'whats going on', "what's going on", 'what are people saying', 'any news', 'street talk', 'apparently', 'word is'])) {
      return { type: 'rumor', confidence: 0.72 };
    }

    // Small talk topics
    const smallTalkTopic = this.detectSmallTalk(lower);
    if (smallTalkTopic) return { type: 'smalltalk', topic: smallTalkTopic, confidence: 0.75 };

    // Compliments
    if (this.isCompliment(lower)) return { type: 'compliment', confidence: 0.65 };

    // Questions
    if (lower.includes('?') || this.matchesAny(lower, ['how', 'what', 'why', 'when', 'where', 'who', 'can you', 'could you', 'do you', 'are you', 'is there', 'tell me', 'explain'])) {
      return { type: 'question', topic: this.questionTopic(lower), confidence: 0.7 };
    }

    // Stories / backstory
    if (this.matchesAny(lower, ['story', 'past', 'history', 'tell me about yourself', 'who are you', 'what made you'])) {
      return { type: 'story', confidence: 0.7 };
    }

    // Quests / favors
    if (this.matchesAny(lower, ['quest', 'help', 'mission', 'task', 'work', 'favor', 'do for you', 'need anything', 'something to do'])) {
      return { type: 'quest', confidence: 0.8 };
    }

    return { type: 'unknown', confidence: 0 };
  }

  // -------------------------------------------------------------------------
  // LOCAL RESPONSE BUILDER
  // -------------------------------------------------------------------------

  private buildLocalResponse(
    npc: NPCState,
    input: string,
    player: any,
    rel: Relationship,
    ctx: GameTimeContext,
    intent: ConversationIntent,
    topic: string,
    lastQuestion: string
  ): ConversationResponse {
    let text = '';
    let relChange = 0;

    switch (intent.type) {
      case 'introduction': {
        relChange = 4;
        this.setKnownName(rel.flags, player);
        text = this.introductionResponse(npc, player, ctx, rel.flags);
        break;
      }

      case 'greeting': {
        relChange = this.greetingRelChange(rel.value);
        text = this.greetingResponse(npc, rel, player, ctx);
        break;
      }

      case 'answer_affirm': {
        relChange = 1;
        text = this.contextualAffirmResponse(npc, rel, player, ctx, rel.flags, lastQuestion);
        break;
      }

      case 'answer_deny': {
        relChange = 0;
        text = this.contextualDenyResponse(npc, rel, player, ctx, rel.flags, lastQuestion);
        break;
      }

      case 'question': {
        relChange = 1;
        text = this.questionResponse(npc, rel, player, ctx, rel.flags, topic);
        break;
      }

      case 'smalltalk': {
        relChange = 1;
        text = this.smallTalkResponse(npc, rel, player, ctx, rel.flags, topic);
        break;
      }

      case 'trade': {
        relChange = intent.fair ? 2 : -3;
        text = this.tradeResponse(npc, rel, player, ctx, rel.flags);
        break;
      }

      case 'flirt': {
        relChange = rel.value > 30 ? 3 : -5;
        text = this.flirtResponse(npc, rel, player, rel.flags, ctx);
        break;
      }

      case 'insult': {
        relChange = -10;
        text = this.insultResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'compliment': {
        relChange = 3;
        text = this.complimentResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'apology': {
        relChange = rel.value < 0 ? 5 : 2;
        text = this.apologyResponse(npc, rel, player, rel.flags);
        if (this.hasFlag(rel.flags, 'npc_is_mad')) this.removeFlag(rel.flags, 'npc_is_mad');
        break;
      }

      case 'rumor': {
        relChange = rel.value > 30 ? 2 : 1;
        text = this.rumorResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'joke': {
        relChange = 2;
        text = this.jokeResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'roast': {
        relChange = rel.value > 40 ? 1 : -2;
        text = this.roastResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'gift': {
        relChange = 3;
        text = this.giftResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'story': {
        relChange = 2;
        text = this.storyResponse(npc, rel, player, rel.flags);
        break;
      }

      case 'quest': {
        relChange = 1;
        const availableQuest = npc.quests?.find(q => q.status === 'available');
        if (availableQuest) {
          text = this.questOfferResponse(npc, availableQuest, player, rel.flags);
          this.setFlag(rel.flags, 'topic:quest');
          this.setFlag(rel.flags, 'npc_offered_quest');
          return { text, relationshipChange: relChange, questTriggered: availableQuest.id };
        }
        text = this.noQuestResponse(npc, rel, player, rel.flags);
        break;
      }

      default: {
        relChange = 0;
        text = this.defaultResponse(npc, input, rel, player, ctx, rel.flags, lastQuestion);
      }
    }

    text = this.applyPersonalityFlavor(npc, text);
    text = this.applyCityFlavor(npc, text);
    text = this.applyMoodFlavor(npc, text, ctx);
    return { text, relationshipChange: relChange };
  }

  // -------------------------------------------------------------------------
  // RESPONSE GENERATORS
  // -------------------------------------------------------------------------

  private introductionResponse(npc: NPCState, player: any, ctx: GameTimeContext, flags: string[]): string {
    const name = this.playerName(flags, player);
    const npcName = this.npcName(npc);
    const greeting = this.greetingWordForTime(ctx.timeOfDay);

    if (name) {
      return this.pickRandom([
        `"Nice to meet you, ${name}. I'm ${npcName}. Good ${greeting}. What brings you my way?"`,
        `"${name}, right? I'm ${npcName}. I'll remember that. So what's your story?"`,
        `"Good ${greeting}, ${name}. Pleasure. I'm ${npcName}. You new around here or you just passing through?"`,
      ]);
    }
    return this.pickRandom([
      `"I'm ${npcName}. And you are?"`,
      `"Name's ${npcName}. What's yours?"`,
      `"Pleasure. I'm ${npcName} — didn't catch your name?"`,
    ]);
  }

  private greetingResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext): string {
    const time = ctx.timeOfDay;
    const name = this.playerName(rel.flags, player);
    const npcName = this.npcName(npc);
    const charisma = player?.charisma || 50;
    const crimRep = player?.reputation?.criminal || 0;
    const wealth = (player?.money || 0) + (player?.bankBalance || 0);
    const activity = this.currentActivityFor(npc, ctx);

    if (crimRep > 70 && rel.value < 20) {
      return `"Oh... it's you. I'll just stay out of your way."`;
    }

    if (wealth > 1000000 && rel.value >= 0) {
      if (name) return this.pickRandom([`"${name}! Always a pleasure. What brings you today?"`, `"Welcome back, ${name}. Can I get you anything?"`]);
      return this.pickRandom([`"Welcome. It's an honor to have you here."`, `"A pleasure to see you! I hope your day is as prosperous as your portfolio."`]);
    }

    if (name) {
      if (rel.value > 50) {
        return this.pickRandom([
          `"What's good, ${name}! Good to see ya, my friend."`,
          `"Yo, ${name}! Was just thinking about you. What's the move today?"`,
          `"There they are — ${name}! How's your ${time} going?"`,
        ]);
      }
      if (rel.value > 10) {
        return this.pickRandom([
          `"What's up, ${name}."`,
          `"Hey, ${name}."`,
          `"${name}, good ${time}."`,
        ]);
      }
      return this.pickRandom([
        `"${name}, right? Good ${time}."`,
        `"Hey ${name}, I remember you. What's up?"`,
        `"${name}. Good to see a familiar face."`,
      ]);
    }

    if (charisma > 75 && rel.value >= 0) {
      return this.pickRandom([
        `"Well, hello there. I don't think we've met. I'm ${npcName}. What's your name?"`,
        `"Hey! You got good energy. I'm ${npcName} — what's your name?"`,
      ]);
    }

    if (rel.value >= 0) {
      return this.pickRandom([
        `"Good ${time}. I'm ${npcName}. Don't think we've met — what's your name?"`,
        `"${this.greetingForCity(npc.city)} I'm ${npcName}. And you are?"`,
      ]);
    }

    return `"${npcName} looks up from ${activity}. \"${this.greetingForCity(npc.city)} Good ${time}.\""`;
  }

  private contextualAffirmResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext, flags: string[], lastQuestion: string): string {
    const q = lastQuestion.toLowerCase();
    const name = this.playerName(flags, player);

    if (q.includes('new around') || q.includes('new here') || q.includes('new to town') || q.includes('new to the city')) {
      this.setFlag(flags, 'player_is_new');
      return `"${name ? name + ', ' : ''}Welcome to ${this.cityDisplayName(npc.city)}. Need any tips on where to start?"`;
    }
    if (q.includes('busy') || q.includes('free') || q.includes('got a minute')) {
      return `"${name ? name + ', ' : ''}No problem, I'll keep it short. Just wanted to chop it up for a second."`;
    }
    if (q.includes('help') || q.includes('favor') || q.includes('need')) {
      return `"${name ? name + ', ' : ''}Good looking out. I might have something for you soon."`;
    }
    if (q.includes('know') || q.includes('remember')) {
      return `"${name ? name + ', ' : ''}I appreciate that, real talk."`;
    }
    return `"${name ? name + ', ' : ''}Yeah? Go on, I'm listening."`;
  }

  private contextualDenyResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext, flags: string[], lastQuestion: string): string {
    const q = lastQuestion.toLowerCase();
    const name = this.playerName(flags, player);

    if (q.includes('new around') || q.includes('new here')) {
      this.setFlag(flags, 'player_is_local');
      return `"${name ? name + ', ' : ''}Oh, my bad. You got that local look about you."`;
    }
    if (q.includes('busy') || q.includes('free')) return `"${name ? name + ', ' : ''}No doubt, I'll catch you another time then."`;
    if (q.includes('help') || q.includes('favor')) return `"${name ? name + ', ' : ''}It's all good. No pressure."`;
    return `"${name ? name + ', ' : ''}Aight, noted."`;
  }

  private smallTalkResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext, flags: string[], topic: string): string {
    const name = this.playerName(flags, player);
    const call = name ? `${name}, ` : '';

    if (topic === 'work') {
      const activity = this.currentActivityFor(npc, ctx);
      const roleLine = this.roleWorkLine(npc);
      return `"${call}Same grind, different day. I'm ${activity}. ${roleLine} What about you?"`;
    }

    if (topic === 'weather') {
      return this.pickRandom([
        `"${call}Weather's weather, you know? Can't control it."`,
        `"${call}Better than yesterday, that's for sure."`,
        `"${call}A little too hot for my taste, but what can you do? You staying cool?"`,
      ]);
    }

    if (topic === 'family') {
      if (rel.value > 40) return `"${call}Family's good, thanks for asking. Don't get to see 'em enough. How's yours?"`;
      return `"${call}That's a bit personal, don't you think?"`;
    }

    if (this.hasFlag(flags, 'player_is_new')) {
      return `"${call}Since you're new, you'll want to learn the districts. Downtown is where the action is. You checked it out yet?"`;
    }

    if (rel.value > 30) {
      return this.pickRandom([
        `"${call}Can't complain, you know? Just takin' it one day at a time. What about you?"`,
        `"${call}It's been alright. Could be worse. You been staying out of trouble?"`,
        `"${call}Same old, same old. But that ain't necessarily bad. What's new with you?"`,
      ]);
    }

    return this.pickRandom([
      `"${call}Yeah, just workin'. Same old same old. You?"`,
      `"${call}Nothin' much. Just livin'. How 'bout yourself?"`,
      `"${call}It is what it is. You good though?"`,
      `"${call}Just tryin' to get by, like everybody else. What you need?"`,
    ]);
  }

  private questionResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext, flags: string[], topic: string): string {
    if (rel.value < -20) {
      return this.pickRandom([
        `"Why you asking me that?"`,
        `"I ain't got time for your questions."`,
        `"Find somebody else to bother."`,
      ]);
    }
    const name = this.playerName(flags, player);

    if (topic === 'work' || topic === 'job') {
      return `"${name ? name + ', ' : ''}I'm ${this.currentActivityFor(npc, ctx)} right now. Day job keeps me busy. Why, you looking?"`;
    }
    if (topic === 'city' || topic === 'here') {
      return `"${name ? name + ', ' : ''}${this.cityPitch(npc.city)} It's got its own rhythm."`;
    }
    if (topic === 'crime' || topic === 'police') {
      if (npc.role === 'police_officer') return `"${name ? name + ', ' : ''}I'm just doing my job, keeping the streets safe."`;
      return `"${name ? name + ', ' : ''}I mind my business. That's how you stay out of trouble."`;
    }
    if (topic === 'self') return this.roleQuestionResponse(npc, name || '');

    return this.pickRandom([
      `"${name ? name + ', ' : ''}Good question. You new around here?"`,
      `"${name ? name + ', ' : ''}Interesting you ask that. What about you — what's your story?"`,
      `"${name ? name + ', ' : ''}I could talk about it, but I'd rather hear about you. What's your name?"`,
    ]);
  }

  private roleQuestionResponse(npc: NPCState, name: string): string {
    const call = name ? `${name}, ` : '';
    const lines: Record<string, string[]> = {
      store_owner: ['"I\'ve been running this spot forever. Seen a lot of folks come through."', '"We got a little bit of everything. What you need?"'],
      banker: ['"Money talks. I just translate."', '"Markets are moody today. Keep your head on a swivel."'],
      software_engineer: ['"Code\'s code. Sometimes it cooperates, sometimes it fights you."', '"If it works, don\'t touch it. That\'s my motto."'],
      fashion_icon: ['"Style is an identity, not a trend."', '"You need something that speaks before you do."'],
      artist: ['"I\'m trying to capture the soul of this city."', '"Art isn\'t what you see, but what you make others see."'],
      dj: ['"The bass here hits different."', '"Crowd energy tells me what to play."'],
      investor: ['"I\'m always hunting the next big thing."', '"Risk is the price of admission."'],
      wrestler: ['"Lucha Libre is about honor and tradition!"', '"The mask is my soul."'],
      surf_instructor: ['"The waves are pumping today."', '"Respect the ocean."'],
      opera_singer: ['"Music is the language of the spirit."', '"The acoustics here are unreal."'],
      mechanic: ['"I can fix anything with an engine."', '"Bring it by the shop."'],
      teacher: ['"The kids keep me young. Most days."', '"Education is the great equalizer."'],
      nurse: ['"ER life ain\'t for everybody."', '"Some shifts stick with you."'],
      promoter: ['"You gotta know the right people."', '"There\'s always something popping if you know where to look."'],
      barber: ['"I hear everything in this chair."', '"Best fades in the city."'],
      police_officer: ['"Just doing my job."', '"Stay outta trouble."'],
      pastor: ['"Faith moves mountains."', '"This community is strong. We look out for each other."'],
      chef: ['"Food is love."', '"Cook with your soul."'],
      elder: ['"Listen more than you talk. That\'s wisdom."', '"Back in my day, things were different. Not better. Just different."'],
    };
    const pool = lines[npc.role] || ['"That\'s a fair question."', '"I\'ll tell you what I know."'];
    const line = this.pickRandom(pool);
    return line.startsWith('"') ? `"${call}${line.slice(2, -1)}"` : `"${call}${line}"`;
  }

  private tradeResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext, flags: string[]): string {
    if (rel.value < -20) return `"I don't do business with folks I don't trust."`;
    return this.pickRandom([
      `"Let's see what we can work out. Whatchu got in mind?"`,
      `"I'm always open to a fair deal. What's the offer?"`,
      `"Business is business. Lay it on me."`,
      `"Yeah, we can talk business. What you need?"`,
    ]);
  }

  private farewellResponse(npc: NPCState, rel: Relationship, player: any, ctx: GameTimeContext): string {
    const name = this.playerName(rel.flags, player);
    const npcName = this.npcName(npc);
    if (rel.value > 50) {
      return this.pickRandom([
        `"${npcName} daps you up. \"Catch you later, ${name || 'fam'}! Stay up.\"`,
        `"Peace, ${name || 'fam'}! Hit me up sometime."`,
        `"Take care, ${name || 'fam'}. You know where to find me."`,
      ]);
    }
    if (rel.value > 10) {
      return this.pickRandom([
        `"${npcName} nods. \"Take it easy${name ? ', ' + name : ''}.\"`,
        `"Later${name ? ', ' + name : ''}."`,
        `"Peace."`,
      ]);
    }
    return name
      ? this.pickRandom([`"${npcName} gives a small wave. \"Bye, ${name}.\"`, `"See ya around, ${name}."`])
      : this.pickRandom([`"${npcName} waves. \"Bye.\"`, `"See ya around."`]);
  }

  private flirtResponse(npc: NPCState, rel: Relationship, player: any, flags: string[], ctx: GameTimeContext): string {
    const name = this.playerName(flags, player);
    if (rel.value < 20) return `"We ain't there yet${name ? ', ' + name : ''}. Slow down."`;
    if (rel.value > 50) {
      return this.pickRandom([
        `"You're sweet. Real sweet${name ? ', ' + name : ''}."`,
        `"Now you're just trying to make me blush."`,
        `"Keep talkin' like that and I might have to take you seriously."`,
        `"You always know what to say, ${name || 'hon'}."`,
      ]);
    }
    return this.pickRandom([
      `"You got charm, I'll give you that."`,
      `"Smooth. I see you."`,
      `"Not bad. Not bad at all."`,
    ]);
  }

  private insultResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    this.setFlag(flags, 'npc_is_mad');
    return this.pickRandom([
      `"Watch your mouth. I ain't the one."`,
      `"Say that again. I dare you."`,
      `"You got a lot of nerve. Best walk away while you can."`,
      `"I don't know what your problem is, but you better fix it."`,
      `"You tryin' to start something? 'Cause that's how you start something."`,
    ]);
  }

  private complimentResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    const name = this.playerName(flags, player);
    if (rel.value < 0) return `"Is that supposed to make up for something?"`;
    return this.pickRandom([
      `"Oh, stop it${name ? ', ' + name : ''}! You're going to make me blush."`,
      `"Now that's the kind of energy I like around here."`,
      `"Right back at you. Keep being you."`,
      `"You sure know how to brighten a day."`,
    ]);
  }

  private apologyResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    if (rel.value < 0) {
      return this.pickRandom([
        `"Hmm. I accept the apology... but I'm watching you."`,
        `"It takes guts to say that. Fine, we can move on."`,
        `"Don't let it happen again. We good."`,
      ]);
    }
    return this.pickRandom([
      `"You're good, no worries at all."`,
      `"I appreciate that. Means a lot."`,
      `"All love over here. Water under the bridge."`,
    ]);
  }

  private rumorResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    const trustLevel = rel.value > 40 ? 'trusted' : 'stranger';
    const city = (npc.city || 'default').toLowerCase();
    const rumors: Record<string, Record<string, string[]>> = {
      trusted: {
        memphis: [
          `"Between us — there's been a lot of talk about some big real estate buy downtown."`,
          `"Word at the barbershop is that the police are cracking down near Beale."`,
          `"Some folks say a record label is scouting local singers this month."`,
        ],
        default: [
          `"I heard a group of out-of-town investors are sniffing around property deals."`,
          `"Rumor has it someone's running a poker game somewhere in this district."`,
          `"Word is the cops have a new task force. Keep your nose clean."`,
        ],
      },
      stranger: {
        memphis: [
          `"I don't know you like that. Ask around downtown."`,
          `"Why would I tell you anything?"`,
          `"I keep my ears open and my mouth shut."`,
        ],
        default: [
          `"I keep my business to myself."`,
          `"Don't know nothing about that."`,
          `"You asking a lot of questions for someone I don't know."`,
        ],
      },
    };
    const pool = rumors[trustLevel]?.[city] ?? rumors[trustLevel]?.default ?? rumors.stranger?.default ?? [];
    if (pool.length === 0) return `"I don't have any gossip right now."`;
    return this.pickRandom(pool);
  }

  private jokeResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    return this.pickRandom([
      `"Why don't scientists trust atoms? Because they make up everything."`,
      `"I told my wife she was drawing her eyebrows too high. She looked surprised."`,
      `"Why did the scarecrow win an award? He was outstanding in his field."`,
      `"I used to play piano by ear. Now I use my hands."`,
    ]);
  }

  private roastResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    if (rel.value < -10) return `"I already don't like you. Don't make it worse."`;
    return this.pickRandom([
      `"You look like you run on Wi-Fi and energy drinks."`,
      `"You bring everyone so much joy — when you leave the room."`,
      `"I'd agree with you but then we'd both be wrong."`,
      `"You have something on your chin... no, the third one."`,
    ]);
  }

  private giftResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    return this.pickRandom([
      `"A gift? You ain't gotta do all that, but I appreciate it."`,
      `"For real? That's real kind of you."`,
      `"You didn't have to. But I'm not gonna say no."`,
    ]);
  }

  private storyResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    if (rel.value < 10) return `"I don't know you well enough for all that."`;
    return this.pickRandom([
      `"I been in ${this.cityDisplayName(npc.city)} a long time. Seen a lot change. Some good, some not."`,
      `"Came here trying to make something of myself. Still working on it every day."`,
      `"My story? Long days, short nights, and a whole lot of hustle."`,
    ]);
  }

  private questOfferResponse(npc: NPCState, quest: any, player: any, flags: string[]): string {
    return this.pickRandom([
      `"Actually, I could use some help. I've got a situation: ${quest.title}. You interested?"`,
      `"Funny you should ask. I was just thinking about ${quest.title}. You think you can handle it?"`,
      `"I might have something for you. ${quest.description} Interested?"`,
    ]);
  }

  private noQuestResponse(npc: NPCState, rel: Relationship, player: any, flags: string[]): string {
    if (rel.value > 30) {
      return this.pickRandom([
        `"I'm all set for now, but I'll let you know if something comes up!"`,
        `"Nothing right now, but thanks for offering. I appreciate it."`,
      ]);
    }
    return this.pickRandom([
      `"I don't need help from you."`,
      `"I'm doing just fine on my own."`,
      `"Nothing for you."`,
    ]);
  }

  private defaultResponse(npc: NPCState, input: string, rel: Relationship, player: any, ctx: GameTimeContext, flags: string[], lastQuestion: string): string {
    const name = this.playerName(flags, player);

    if (lastQuestion && input.length < 50) {
      return this.pickRandom([
        `"${name ? name + ', ' : ''}Fair answer. Tell me more."`,
        `"${name ? name + ', ' : ''}I feel you. Keep going."`,
      ]);
    }

    // Try to reference last topic for continuity
    const lastTopic = flags.find(f => f.startsWith('topic:'))?.replace('topic:', '');
    if (lastTopic && lastTopic !== 'general') {
      const followUp: Record<string, string> = {
        work: 'We were talking about work last time.',
        weather: 'Weather still on your mind?',
        family: 'Family can be complicated.',
        rumor: 'You still hunting rumors?',
        city: 'Still figuring out the city?',
      };
      const phrase = followUp[lastTopic];
      if (phrase) return `"${name ? name + ', ' : ''}${phrase} ${this.pickRandom(['Go on.', 'Say more.', 'I\'m listening.'])}"`;
    }

    return this.pickRandom([
      `"${name ? name + ', ' : ''}I'm not sure I follow, but I'm listening."`,
      `"${name ? name + ', ' : ''}Say that again? You lost me a little."`,
      `"${name ? name + ', ' : ''}I hear you. Keep talking."`,
    ]);
  }

  // -------------------------------------------------------------------------
  // FLAVOR & HELPERS
  // -------------------------------------------------------------------------

  private applyPersonalityFlavor(npc: NPCState, text: string): string {
    const personality = npc.personality || [];
    if (personality.length === 0 || !text.startsWith('"')) return text;

    if (personality.includes('wise') || personality.includes('scholarly')) {
      if (Math.random() < 0.3) text = `"As they say... ${text.slice(1)}`;
    }
    if (personality.includes('rebellious') || personality.includes('street_smart')) {
      if (Math.random() < 0.3) text = this.appendToQuote(text, ' You feel me?');
    }
    if (personality.includes('proper') || personality.includes('elegant')) {
      if (Math.random() < 0.3) text = this.appendToQuote(text, ' If you please.');
    }
    if (personality.includes('competitive') || personality.includes('aggressive')) {
      if (Math.random() < 0.2) text = this.appendToQuote(text, ' Don\'t get it twisted.');
    }
    if (personality.includes('warm') || personality.includes('caring')) {
      if (Math.random() < 0.25) text = this.appendToQuote(text, ' Stay safe out there.');
    }
    if (personality.includes('strict') || personality.includes('disciplined')) {
      if (Math.random() < 0.2) text = this.appendToQuote(text, ' Make it quick.');
    }

    return text;
  }

  private applyCityFlavor(npc: NPCState, text: string): string {
    const city = (npc.city || '').toLowerCase();
    if ((city !== 'memphis' && city !== 'west_memphis') || !text.startsWith('"')) return text;

    if (Math.random() > 0.6) {
      const slang = ['mane', 'junt', 'real talk', 'you feel me', 'straight up', 'big facts'];
      const word = this.pickRandom(slang);
      if (text.endsWith('."')) return text.replace(/\."$/, `, ${word}."`);
      if (text.endsWith('?"')) return text.replace(/\?"$/, `? ${word.charAt(0).toUpperCase() + word.slice(1)}."`);
    }
    return text;
  }

  private applyMoodFlavor(npc: NPCState, text: string, ctx: GameTimeContext): string {
    if (!text.startsWith('"')) return text;
    const mood = this.inferMood(npc, ctx);
    if (mood.label === 'busy' && Math.random() < 0.3) return this.appendToQuote(text, ' Make it quick though.');
    if (mood.label === 'tired' && Math.random() < 0.25) return this.appendToQuote(text, ' Long day, man.');
    if (mood.label === 'cheerful' && Math.random() < 0.2) return `"${this.npcName(npc)} grins. ${text.slice(1)}`;
    return text;
  }

  private inferMood(npc: NPCState, ctx: GameTimeContext): NPCMood {
    const scheduleList = ctx.isWeekend ? npc.schedule?.weekend : npc.schedule?.weekday;
    const block = scheduleList?.find(b => ctx.hour >= b.start && ctx.hour < b.end);
    if (block?.activity === 'sleeping') return { label: 'tired', description: 'half-asleep' };
    if (['police_patrol', 'surgery', 'rush'].includes(block?.activity || '')) return { label: 'busy', description: 'rushed' };
    return { label: 'neutral', description: 'calm' };
  }

  private appendToQuote(text: string, fragment: string): string {
    if (text.endsWith('"')) return text.slice(0, -1) + fragment + '"';
    return text + fragment;
  }

  private ensureQuoted(text: string): string {
    text = text.trim();
    if (!text.startsWith('"')) text = '"' + text;
    if (!text.endsWith('"')) text = text + '"';
    return text;
  }

  private stripNarrative(text: string): string {
    return text.replace(/"[^"]*"/g, m => m).replace(/^[^"]*"/, '').replace(/"[^"]*$/, '').trim();
  }

  // -------------------------------------------------------------------------
  // MEMORY HELPERS
  // -------------------------------------------------------------------------

  private recallLastNpcQuestion(messages: { role: string; content: string }[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      if (m.role === 'npc' && m.content.includes('?')) return m.content;
    }
    return '';
  }

  private rememberTopic(flags: string[], topic: string): void {
    this.removeFlag(flags, (f: string) => f.startsWith('topic:'));
    if (topic && topic !== 'general') this.setFlag(flags, `topic:${topic}`);
  }

  private rememberMessage(messages: { role: string; content: string; timestamp?: number }[], msg: { role: 'player' | 'npc'; content: string }): void {
    messages.push({ ...msg, timestamp: Date.now() });
    if (messages.length > 16) messages.shift();
  }

  private updateRelationship(rel: Relationship, delta: number, npc: NPCState): void {
    rel.value = Math.max(-100, Math.min(100, rel.value + delta));
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;
  }

  private setKnownName(flags: string[], player: any): void {
    this.setFlag(flags, 'knows_name');
    if (player?.name) this.setFlag(flags, `known_name:${player.name}`);
  }

  private playerName(flags: string[], player: any): string | null {
    if (this.hasFlag(flags, 'knows_name') && player?.name) return player.name;
    const knownFlag = flags.find(f => f.startsWith('known_name:'));
    if (knownFlag) return knownFlag.replace('known_name:', '');
    if (this.hasFlag(flags, 'knows_name') && player?.firstName) return player.firstName;
    return null;
  }

  private npcName(npc: NPCState): string {
    return npc.firstName || npc.name.split(' ')[0] || npc.name;
  }

  private hasFlag(flags: string[], flag: string | ((f: string) => boolean)): boolean {
    if (typeof flag === 'string') return flags.includes(flag);
    return flags.some(flag);
  }

  private setFlag(flags: string[], flag: string): void {
    if (!flags.includes(flag)) flags.push(flag);
  }

  private removeFlag(flags: string[], flag: string | ((f: string) => boolean)): void {
    for (let i = flags.length - 1; i >= 0; i--) {
      const f = flags[i];
      if (!f) continue;
      if (typeof flag === 'string') {
        if (f === flag) flags.splice(i, 1);
      } else if (flag(f)) {
        flags.splice(i, 1);
      }
    }
  }

  private isAffirmative(lower: string): boolean {
    return ['yeah', 'yes', 'yep', 'yup', 'sure', 'definitely', 'absolutely', 'of course', 'right', 'correct', 'true', 'indeed', 'you know it', 'bet', 'aight', 'alright', 'okay', 'ok']
      .some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w));
  }

  private isNegative(lower: string): boolean {
    return ['nah', 'no', 'nope', 'not really', 'not at all', 'never', 'false', 'incorrect']
      .some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w));
  }

  private isFarewell(lower: string): boolean {
    return this.matchesAny(lower, ['bye', 'later', 'see ya', 'see you', 'gotta go', 'peace', 'take care', 'cya', 'im leaving', "i'm leaving", 'goodbye', 'im out', "i'm out", 'headin out', 'head out', 'ima head out']);
  }

  private isInsulting(lower: string): boolean {
    return this.matchesAny(lower, ['stupid', 'dumb', 'ugly', 'hate', 'suck', 'trash', 'garbage', 'worthless', 'idiot', 'fool', 'punk', 'bitch', 'ass ', ' ass', 'fuck', 'shit', 'loser', 'lame', 'weak']);
  }

  private isApologetic(lower: string): boolean {
    return this.matchesAny(lower, ['sorry', 'apologize', 'my bad', 'i messed up', 'forgive me', 'didnt mean', "didn't mean", 'regret', 'i owe you']);
  }

  private isFlirty(lower: string): boolean {
    return this.matchesAny(lower, ['cute', 'sexy', 'hot', 'gorgeous', 'date', 'kiss', 'love you', 'marry', 'beautiful eyes', 'pretty eyes', 'lookin good', 'looking good', 'you fine', 'you look good', 'take me out']);
  }

  private isCompliment(lower: string): boolean {
    return this.matchesAny(lower, ['cool', 'awesome', 'great', 'nice', 'love', 'amazing', 'beautiful', 'handsome', 'pretty', 'smart', 'best', 'good job', 'well done', 'impressive']);
  }

  private isIntroduction(lower: string, player: any, lastQuestion: string): boolean {
    if (this.matchesAny(lower, ['my name is', 'i am ', "i'm ", 'call me', 'name is'])) return true;
    if (lastQuestion && /name/i.test(lastQuestion) && inputWordCount(lower) <= 3 && lower.length > 1) return true;
    const playerName = player?.name || player?.firstName || '';
    if (playerName && (lower === playerName.toLowerCase() || lower.includes(playerName.toLowerCase()))) return true;
    return false;
  }

  private detectSmallTalk(lower: string): string | null {
    if (this.matchesAny(lower, ['how are you', 'hows it going', "how's it going", 'how you been', 'how you doing', 'whats good', "what's good", 'hows life', "how's life", 'hows your day', "how's your day", 'what you doing', 'what are you doing', 'what u doing', 'what you up to', 'whats up', "what's up", 'doing', 'been up to', 'hows everything', "how's everything", 'nothing much', 'not much', 'same old', 'chillin', 'chilling'])) return 'life';
    if (this.matchesAny(lower, ['what you working on', 'what are you working on', 'whatcha working on', 'work', 'job', 'career'])) return 'work';
    if (this.matchesAny(lower, ['weather', 'rain', 'sunny', 'hot out', 'cold out', 'storm'])) return 'weather';
    if (this.matchesAny(lower, ['family', 'kids', 'wife', 'husband', 'parents', 'mom', 'dad'])) return 'family';
    return null;
  }

  private questionTopic(lower: string): string {
    if (lower.includes('city') || lower.includes('here') || lower.includes('town')) return 'city';
    if (lower.includes('work') || lower.includes('job')) return 'work';
    if (lower.includes('crime') || lower.includes('police') || lower.includes('illegal')) return 'crime';
    if (lower.includes('you') || lower.includes('yourself')) return 'self';
    return 'question';
  }

  private topicFromIntent(intent: ConversationIntent, input: string): string {
    if (intent.type === 'introduction') return 'introduction';
    if (intent.type === 'greeting') return 'greeting';
    if (intent.type === 'farewell') return 'farewell';
    if (intent.type === 'flirt') return 'flirt';
    if (intent.type === 'insult') return 'insult';
    if (intent.type === 'apology') return 'apology';
    if (intent.type === 'rumor') return 'rumor';
    if (intent.type === 'trade') return 'trade';
    if (intent.type === 'quest') return 'quest';
    if (intent.type === 'answer_affirm' || intent.type === 'answer_deny') return 'answer';
    if (intent.type === 'smalltalk') return intent.topic || 'life';
    if (intent.type === 'question') return intent.topic || 'question';
    if (intent.type === 'joke') return 'joke';
    if (intent.type === 'roast') return 'roast';
    if (intent.type === 'gift') return 'gift';
    if (intent.type === 'story') return 'story';
    return 'general';
  }

  private greetingRelChange(relValue: number): number {
    return relValue < 0 ? 1 : 2;
  }

  private greetingWordForTime(timeOfDay: string): string {
    switch (timeOfDay) {
      case 'morning': return 'morning';
      case 'afternoon': return 'afternoon';
      case 'evening': return 'evening';
      default: return 'night';
    }
  }

  private roleWorkLine(npc: NPCState): string {
    const lines: Record<string, string> = {
      store_owner: 'Running the shop, keeping the lights on.',
      banker: 'Looking at numbers until they make sense.',
      software_engineer: 'Debugging code that should have worked yesterday.',
      fashion_icon: 'Planning the next look.',
      artist: 'Working on a new piece.',
      dj: 'Prepping my next set.',
      investor: 'Watching the market.',
      wrestler: 'Training and staying ready.',
      surf_instructor: 'Waiting on the right wave.',
      opera_singer: 'Warming up the vocal cords.',
      mechanic: 'Under the hood where I belong.',
      teacher: 'Grading papers, praying for patience.',
      nurse: 'Just got off shift.',
      promoter: 'Making calls, lining up the next event.',
      barber: 'Sharpening the clippers.',
      police_officer: 'Patrol. Same as always.',
      pastor: 'Tending to the flock.',
      chef: 'Planning tonight\'s special.',
      elder: 'Resting these old bones.',
      restaurant_owner: 'Keeping the kitchen running.',
      food_truck_owner: 'Serving plates and smiles.',
      jazz_singer: 'Singing the blues and everything between.',
      beautician: 'Making folks feel beautiful.',
      basketball_coach: 'Running drills and building character.',
      professor: 'Prepping lectures and grading papers.',
    };
    return lines[npc.role] || 'Keeping busy.';
  }

  private cityPitch(city: string): string {
    switch ((city || '').toLowerCase()) {
      case 'memphis': return 'River City has soul. You\'ll feel it.';
      case 'west_memphis': return 'It\'s quieter across the bridge, but we got heart.';
      case 'new_york': return 'Best city in the world. Don\'t @ me.';
      case 'los_angeles': return 'Sunshine, traffic, and dreams.';
      case 'chicago': return 'Deep dish, cold winters, real people.';
      case 'houston': return 'Everything\'s bigger here.';
      default: return 'It grows on you.';
    }
  }

  private greetingForCity(city: string): string {
    switch ((city || '').toLowerCase()) {
      case 'london': return 'Cheers, mate.';
      case 'tokyo': return 'Konnichiwa.';
      case 'paris': return 'Bonjour.';
      case 'berlin': return 'Hallo.';
      case 'dubai': return 'Marhaba.';
      case 'mexico_city': return 'Hola!';
      case 'new_york': return 'Hey.';
      case 'chicago': return 'Welcome to the Windy City.';
      case 'los_angeles': return 'Hey!';
      case 'miami': return 'Buenas.';
      case 'houston': return 'Howdy.';
      case 'dallas': return 'Howdy.';
      case 'nashville': return 'Howdy!';
      case 'atlanta': return 'What\'s up, fam.';
      case 'new_orleans': return 'Where y\'at?';
      case 'charlotte': return 'Hey there.';
      case 'detroit': return 'Welcome to the D.';
      case 'philly': return 'Yo, what\'s good?';
      case 'vegas': return 'Welcome to Vegas.';
      case 'phoenix': return 'Hot enough for ya?';
      case 'seattle': return 'Hey.';
      case 'littlerock': return 'Welcome to the Rock.';
      case 'southaven': return 'Hey there, neighbor.';
      default: return 'Hey.';
    }
  }

  private cityDisplayName(city: string): string {
    const map: Record<string, string> = {
      memphis: 'Memphis',
      west_memphis: 'West Memphis',
      new_york: 'New York',
      los_angeles: 'Los Angeles',
      chicago: 'Chicago',
      houston: 'Houston',
      miami: 'Miami',
      atlanta: 'Atlanta',
      dallas: 'Dallas',
      phoenix: 'Phoenix',
      philadelphia: 'Philadelphia',
    };
    return map[(city || '').toLowerCase()] || (city ? city.replace(/_/g, ' ') : 'the city');
  }

  private currentActivityFor(npc: NPCState, ctx: GameTimeContext): string {
    const scheduleList = ctx.isWeekend ? npc.schedule?.weekend : npc.schedule?.weekday;
    const block = scheduleList?.find(b => ctx.hour >= b.start && ctx.hour < b.end);
    if (block) return `${block.activity} at ${block.location}`;
    return 'taking it easy';
  }

  private inferTimeContext(): GameTimeContext {
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: GameTimeContext['timeOfDay'] = 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    const day = now.getDay();
    return { hour, isWeekend: day === 0 || day === 6, timeOfDay };
  }

  private matchesAny(input: string, patterns: string[]): boolean {
    return patterns.some(p => input.includes(p));
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
  }
}

function inputWordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
