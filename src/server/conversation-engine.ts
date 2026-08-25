// THE OPEN WORLD - Conversation Engine
// Natural language conversations with NPCs, now memory-aware and context-driven

import type { NPCState } from './social-engine.js';
import type { Relationship, ConversationMessage } from '../shared/types.js';

export type ConversationIntentType =
  | 'greeting' | 'question' | 'smalltalk' | 'trade' | 'farewell' | 'flirt'
  | 'insult' | 'compliment' | 'unknown' | 'quest' | 'apology' | 'rumor' | 'introduction'
  | 'answer_affirm' | 'answer_deny';

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
}

export interface GameTimeContext {
  hour: number;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}


export class ConversationEngine {

  detectIntent(input: string, player: any, lastNpcQuestion?: string): ConversationIntent {
    const lower = input.toLowerCase().trim();
    const playerName = player?.name || player?.firstName || '';
    const firstName = player?.firstName || '';

    // --- Introductions / player-name detection ---
    const explicitIntro = this.matchesAny(lower, [
      'my name is', 'i am ', "i'm ", 'call me', 'name is'
    ]);
    const nameAnswer = lastNpcQuestion && /name/i.test(lastNpcQuestion) && input.split(/\s+/).filter(Boolean).length <= 3 && input.length > 1;
    const nameTokens = (playerName + ' ' + firstName).split(/\s+/).filter(t => t.length > 1);
    const namesAnyToken = nameTokens.some(t => lower === t.toLowerCase());
    const nameMentionedInPhrase = nameTokens.some(t => lower.includes(t.toLowerCase())) && lower.length <= playerName.length + 6;

    if (explicitIntro || nameAnswer || namesAnyToken || nameMentionedInPhrase) {
      return { type: 'introduction', confidence: 0.92 };
    }

    // --- Farewells ---
    if (this.matchesAny(lower, ['bye', 'later', 'see ya', 'see you', 'gotta go', 'peace', 'take care', 'cya', 'im leaving', "i'm leaving", 'goodbye', 'im out', 'headin out', 'head out'])) {
      return { type: 'farewell', confidence: 0.9 };
    }

    // --- Insults ---
    if (this.matchesAny(lower, ['stupid', 'dumb', 'ugly', 'hate', 'suck', 'trash', 'garbage', 'worthless', 'idiot', 'fool', 'punk', 'bitch', 'ass', 'fuck', 'shit', 'loser'])) {
      return { type: 'insult', confidence: 0.8 };
    }

    // --- Apologies ---
    if (this.matchesAny(lower, ['sorry', 'apologize', 'my bad', 'i messed up', 'forgive me', 'didnt mean', "didn't mean", 'regret', 'i owe you'])) {
      return { type: 'apology', confidence: 0.8 };
    }

    // --- Flirting ---
    if (this.matchesAny(lower, ['cute', 'sexy', 'hot', 'gorgeous', 'date', 'kiss', 'love you', 'marry', 'beautiful eyes', 'pretty eyes', 'lookin good', 'looking good', 'you fine'])) {
      return { type: 'flirt', confidence: 0.7 };
    }

    // --- Greetings ---
    if (this.matchesAny(lower, ['hey', 'hi', 'hello', 'sup', 'wasup', 'wassup', 'yo', 'whats up', "what's up", 'howdy', 'mornin', 'evenin', 'wassgood', 'wsgood', 'good morning', 'good afternoon', 'good evening'])) {
      return { type: 'greeting', confidence: 0.92 };
    }

    // --- Trade/Business ---
    if (this.matchesAny(lower, ['buy', 'sell', 'trade', 'deal', 'price', 'cost', 'how much', 'discount', 'bargain', 'purchase', 'pay'])) {
      return { type: 'trade', fair: true, confidence: 0.8 };
    }

    // --- Rumors/Gossip ---
    if (this.matchesAny(lower, ['rumor', 'gossip', 'hear anything', 'heard anything', 'whats going on', "what's going on", 'what are people saying', 'any news', 'street talk', 'apparently', 'word is'])) {
      return { type: 'rumor', confidence: 0.7 };
    }

    // --- Affirmative / negative answers to an NPC question ---
    if (lastNpcQuestion) {
      if (this.isAffirmative(lower)) return { type: 'answer_affirm', confidence: 0.85 };
      if (this.isNegative(lower)) return { type: 'answer_deny', confidence: 0.85 };
    }

    // --- Small talk ---
    if (
      this.matchesAny(lower, ['how are you', 'hows it going', "how's it going", 'how you been', 'how you doing', 'whats good', "what's good", 'hows life', "how's life", 'hows your day', "how's your day", 'what you doing', 'what are you doing', 'what u doing', 'what you up to', 'whats up', "what's up", 'doing', 'been up to', 'hows everything', "how's everything"])
    ) {
      return { type: 'smalltalk', topic: 'life', confidence: 0.75 };
    }
    if (this.matchesAny(lower, ['what you working on', 'what are you working on', 'whatcha working on', 'work', 'job', 'career'])) {
      return { type: 'smalltalk', topic: 'work', confidence: 0.72 };
    }
    if (this.matchesAny(lower, ['weather', 'rain', 'sunny', 'hot out', 'cold out', 'storm'])) {
      return { type: 'smalltalk', topic: 'weather', confidence: 0.72 };
    }
    if (this.matchesAny(lower, ['family', 'kids', 'wife', 'husband', 'parents', 'mom', 'dad'])) {
      return { type: 'smalltalk', topic: 'family', confidence: 0.7 };
    }

    // --- Compliments ---
    if (this.matchesAny(lower, ['cool', 'awesome', 'great', 'nice', 'love', 'amazing', 'beautiful', 'handsome', 'pretty', 'smart', 'best', 'good job', 'well done', 'impressive'])) {
      return { type: 'compliment', confidence: 0.6 };
    }

    // --- Questions (must come after small-talk triggers) ---
    if (lower.includes('?') || this.matchesAny(lower, ['how', 'what', 'why', 'when', 'where', 'who', 'can you', 'could you', 'do you', 'are you', 'is there', 'tell me', 'explain'])) {
      return { type: 'question', confidence: 0.7 };
    }

    // --- Remaining small talk ---
    if (this.matchesAny(lower, ['day', 'night', 'life', 'plans', 'weekend', 'good', 'bad'])) {
      return { type: 'smalltalk', topic: 'life', confidence: 0.5 };
    }

    // --- Quests/Help ---
    if (this.matchesAny(lower, ['quest', 'help', 'mission', 'task', 'work', 'favor', 'do for you', 'need anything', 'something to do'])) {
      return { type: 'quest', confidence: 0.8 };
    }

    return { type: 'unknown', confidence: 0 };
  }


  generateGreeting(
    npc: NPCState,
    player: any,
    relationship?: Relationship,
    gameTime?: GameTimeContext
  ): { text: string; relationshipChange: number } {
    const ctx = gameTime || this.inferTimeContext();
    const flags = relationship?.flags ?? [];
    const rel = relationship ? relationship.value : npc.relationship;
    const text = this.greetingResponse(npc, rel, player, ctx, flags);
    this.rememberTopic(flags, 'greeting', '', player);
    if (relationship?.memory) {
      this.rememberMessage(relationship.memory, { role: 'npc', content: text });
    }
    return { text, relationshipChange: rel < 0 ? 1 : 2 };
  }

  generateResponse(
    npc: NPCState,
    playerInput: string,
    player: any,
    relationship?: Relationship,
    gameTime?: GameTimeContext
  ): ConversationResponse {
    const ctx = gameTime || this.inferTimeContext();

    const flags = relationship?.flags ?? [];
    const messages = relationship?.memory ?? [];
    const lastNpcQuestion = this.recallLastNpcQuestion(messages);

    const intent = this.detectIntent(playerInput, player, lastNpcQuestion);
    const rel = relationship ? relationship.value : npc.relationship;
    const topic = this.topicFromIntent(intent, playerInput);

    this.rememberTopic(flags, topic, playerInput, player);

    let text = '';
    let relChange = 0;

    switch (intent.type) {
      case 'introduction':
        relChange = 3;
        text = this.introductionResponse(npc, player, ctx, flags);
        this.setFlag(flags, 'knows_name');
        if (!/new|old|local/i.test(playerInput)) {
          this.setFlag(flags, 'npc_asked_about_player');
        }
        break;

      case 'greeting':
        relChange = rel < 0 ? 1 : 2;
        text = this.greetingResponse(npc, rel, player, ctx, flags, topic);
        break;

      case 'answer_affirm':
        relChange = 1;
        text = this.contextualAffirmResponse(npc, rel, player, ctx, flags, lastNpcQuestion);
        break;

      case 'answer_deny':
        relChange = 0;
        text = this.contextualDenyResponse(npc, rel, player, ctx, flags, lastNpcQuestion);
        break;

      case 'question':
        relChange = 1;
        text = this.questionResponse(npc, rel, player, ctx, flags, topic);
        break;

      case 'smalltalk':
        relChange = 1;
        text = this.smallTalkResponse(npc, rel, player, ctx, flags, topic);
        break;

      case 'trade':
        relChange = intent.fair ? 2 : -3;
        text = this.tradeResponse(npc, rel, player, ctx, flags);
        break;

      case 'farewell':
        relChange = 0;
        text = this.farewellResponse(npc, rel, player, ctx, flags);
        break;

      case 'flirt':
        relChange = rel > 30 ? 3 : -5;
        text = this.flirtResponse(npc, rel, player, flags);
        break;

      case 'insult':
        relChange = -10;
        text = this.insultResponse(npc, rel, player, flags);
        break;

      case 'compliment':
        relChange = 3;
        text = this.complimentResponse(npc, rel, player, flags);
        break;

      case 'apology':
        relChange = rel < 0 ? 5 : 2;
        text = this.apologyResponse(npc, rel, player, flags);
        if (this.hasFlag(flags, 'npc_is_mad')) this.removeFlag(flags, 'npc_is_mad');
        break;

      case 'rumor':
        relChange = 1;
        text = this.rumorResponse(npc, rel, player, flags);
        break;

      case 'quest':
        relChange = 1;
        const availableQuest = npc.quests?.find(q => q.status === 'available');
        if (availableQuest) {
          text = this.questOfferResponse(npc, availableQuest, player, flags);
          this.setFlag(flags, 'topic:quest');
          this.setFlag(flags, 'npc_offered_quest');
          this.rememberMessage(messages, { role: 'npc', content: text });
          return { text, relationshipChange: relChange, questTriggered: availableQuest.id };
        }
        text = this.noQuestResponse(npc, rel, player, flags);
        break;

      default:
        relChange = 0;
        text = this.defaultResponse(npc, playerInput, rel, player, ctx, flags, lastNpcQuestion);
    }

    text = this.applyContinuity(npc, text, flags, ctx, player);
    text = this.applyStateAwareness(npc, text, player, flags);
    text = this.applyPersonalityFlavor(npc, text);
    text = this.applyCityFlavor(npc, text);

    this.rememberTopic(flags, topic, playerInput, player);
    this.rememberMessage(messages, { role: 'player', content: playerInput });
    this.rememberMessage(messages, { role: 'npc', content: text });

    return { text, relationshipChange: relChange };
  }

  // --- MEMORY & CONTEXT ---

  private recallLastNpcQuestion(messages: ConversationMessage[]): string {
    const last = [...messages].reverse().find(m => m.role === 'npc');
    return last && last.content.includes('?') ? last.content : '';
  }

  private rememberTopic(flags: string[], topic: string, _input: string, _player: any): void {
    this.removeFlag(flags, f => f.startsWith('topic:'));
    this.setFlag(flags, `topic:${topic}`);
  }

  private rememberMessage(messages: ConversationMessage[], msg: { role: 'player' | 'npc' | 'system'; content: string }): void {
    messages.push({ ...msg, timestamp: Date.now() });
    if (messages.length > 12) messages.shift();
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
    return ['yeah', 'yes', 'yep', 'yup', 'sure', 'definitely', 'absolutely', 'of course', 'right', 'correct', 'true', 'indeed', 'you know it']
      .some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w));
  }

  private isNegative(lower: string): boolean {
    return ['nah', 'no', 'nope', 'not really', 'not at all', 'never', 'false', 'incorrect']
      .some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w));
  }

  private playerName(flags: string[], player: any): string | null {
    if (this.hasFlag(flags, 'knows_name') && player?.name) return player.name;
    if (this.hasFlag(flags, 'knows_name') && player?.firstName) return player.firstName;
    return null;
  }

  private npcName(npc: NPCState): string {
    return npc.firstName || npc.name.split(' ')[0] || npc.name;
  }

  // --- RESPONSE GENERATORS ---

  private introductionResponse(npc: NPCState, player: any, ctx: GameTimeContext, flags: string[]): string {
    const name = this.playerName(flags, player);
    const npcName = this.npcName(npc);
    const greeting = ctx.timeOfDay === 'morning' ? 'morning' : ctx.timeOfDay;
    if (name) {
      return this.pickRandom([
        `"Nice to meet you, ${name}. I'm ${npcName}. Good ${greeting}."`,
        `"${name}, right? I'm ${npcName}. I'll remember that."`,
        `"Good ${greeting}, ${name}. Pleasure. I'm ${npcName}."`,
      ]);
    }
    return this.pickRandom([
      `"I'm ${npcName}. And you are?"`,
      `"Name's ${npcName}. What's yours?"`,
      `"Pleasure. I'm ${npcName} — you?"`,
    ]);
  }

  private greetingResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[], topic?: string): string {
    const timeOfDay = ctx.timeOfDay;
    const charisma = player?.charisma || 50;
    const crimRep = player?.reputation?.criminal || 0;
    const wealth = (player?.money || 0) + (player?.bankBalance || 0);
    const name = this.playerName(flags, player);
    const npcName = this.npcName(npc);
    const activity = this.currentActivityFor(npc, ctx);

    if (crimRep > 70 && rel < 20) {
      return this.pickRandom([
        `"Oh... it's you. I'll... just stay out of your way."`,
        `"I've heard about you. Please, just don't cause any trouble here."`,
        `"Right. Hello. Do you need something, or are you just... visiting?"`,
      ]);
    }

    if (wealth > 1000000 && rel >= 0) {
      return name
        ? this.pickRandom([`"${name}! Always a pleasure. What brings you today?"`, `"Welcome back, ${name}. Can I get you anything?"`])
        : this.pickRandom([`"Welcome, sir/madam! It is an absolute honor to have you here."`, `"A pleasure to see you! I hope your day is as prosperous as your portfolio."`])
    }

    if (name && rel > 50) {
      return this.pickRandom([
        `"What's good, ${name}! Good to see ya, my friend."`,
        `"Yo, ${name}! Was just thinking about you. What's the move today?"`,
        `"There they are — ${name}! How's your ${timeOfDay} going?"`,
      ]);
    }

    if (name && rel > 10) {
      return this.pickRandom([
        `"What's up, ${name}."`,
        `"Hey, ${name}."`,
        `"${name}, good ${timeOfDay}."`,
      ]);
    }

    if (name && rel >= 0) {
      return this.pickRandom([
        `"${name}, right? Good ${timeOfDay}."`,
        `"Hey ${name}, I remember you. What's up?"`,
        `"${name}. Good to see a familiar face."`,
      ]);
    }

    if (charisma > 75 && rel >= 0 && !name) {
      return this.pickRandom([
        `"Well, hello there. I don't think we've met. I'm ${npcName}. What's your name?"`,
        `"Hey! You got good energy. I'm ${npcName} — what's your name?"`,
      ]);
    }

    if (rel >= 0 && !name) {
      return this.pickRandom([
        `"Good ${timeOfDay}. I'm ${npcName}. Don't think we've met — what's your name?"`,
        `"${this.greetingForCity(npc.city)} I'm ${npcName}. And you are?"`,
      ]);
    }

    return `"${npcName} looks up from ${activity}. \"${this.greetingForCity(npc.city)} Good ${timeOfDay}.\""`;
  }

  private contextualAffirmResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[], lastQuestion: string): string {
    const q = lastQuestion.toLowerCase();
    const name = this.playerName(flags, player);
    const call = name ? `${name}, ` : '';

    if (q.includes('new around') || q.includes('new here') || q.includes('new to town')) {
      this.setFlag(flags, 'player_is_new');
      return this.pickRandom([
        `"${call}Welcome to ${this.cityDisplayName(npc.city)}. Need any tips on where to start?"`,
        `"${call}Ahh, fresh blood. What brings you to ${this.cityDisplayName(npc.city)}?"`,
        `"${call} figures. Well, stick with me and you'll learn the ropes."`,
      ]);
    }

    if (q.includes('busy') || q.includes('free')) {
      return `"${call}No problem, I'll keep it short. Just wanted to chop it up for a second."`;
    }

    if (q.includes('help') || q.includes('favor') || q.includes('need')) {
      return `"${call}Good looking out. I might have something for you soon."`;
    }

    if (q.includes('know') || q.includes('remember')) {
      return `"${call}I appreciate that, real talk."`;
    }

    return this.pickRandom([
      `"${call}Yeah? Go on, I'm listening."`,
      `"${call}I feel you. Keep talking."`,
      `"${call}Right, right. What else?"`,
    ]);
  }

  private contextualDenyResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[], lastQuestion: string): string {
    const q = lastQuestion.toLowerCase();
    const name = this.playerName(flags, player);
    const call = name ? `${name}, ` : '';

    if (q.includes('new around') || q.includes('new here')) {
      this.setFlag(flags, 'player_is_local');
      return this.pickRandom([
        `"${call}Oh, my bad. You got that local look about you."`,
        `"${call}My mistake. I should've recognized a regular face."`,
      ]);
    }

    if (q.includes('busy') || q.includes('free')) {
      return `"${call}No doubt, I'll catch you another time then."`;
    }

    if (q.includes('help') || q.includes('favor')) {
      return `"${call}It's all good. No pressure."`;
    }

    return this.pickRandom([
      `"${call}Aight, noted."`,
      `"${call}Fair enough."`,
      `"${call}Got it. Say no more."`,
    ]);
  }

  private smallTalkResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[], topic: string): string {
    const crimRecordLength = (player?.criminalRecord || []).length;
    const name = this.playerName(flags, player);
    const call = name ? `${name}, ` : '';

    if (crimRecordLength > 5 && rel < 50) {
      return this.pickRandom([
        `"${call}I've heard some... interesting rumors about your past. Try to stay clean, eh?"`,
        `"${call}You've got a bit of a reputation, don't you? Just be careful."`,
        `"${call}I don't judge, but I've seen your record. Interesting choices."`,
      ]);
    }

    if (topic === 'work') {
      const activity = this.currentActivityFor(npc, ctx);
      const roleLine = this.roleWorkLine(npc);

      return this.pickRandom([
        `"${call}Same grind, different day. I'm ${activity}. ${roleLine}"`,
        `"${call}Right now I'm ${activity}. Day in, day out. ${roleLine}"`,
        `"${call}Just handling business—${activity}. ${roleLine}"`,
      ]).replace(/\.$/, ` What about you, ${name || 'friend'}?"`);
    }

    if (topic === 'weather') {
      return this.pickRandom([
        `"${call}Weather's weather, you know? Can't control it."`,
        `"${call}Better than yesterday, that's for sure."`,
        `"${call}A little too hot for my taste, but what can you do?"`,
      ]);
    }

    if (topic === 'family') {
      if (rel > 40) {
        return this.pickRandom([
          `"${call}Family's good, thanks for asking. Don't get to see 'em enough."`,
          `"${call}They're doing well. Always busy though."`,
        ]);
      }
      return this.pickRandom([
        `"${call}That's a bit personal, don't you think?"`,
        `"${call}Family's fine. Why do you ask?"`,
      ]);
    }

    if (this.hasFlag(flags, 'player_is_new')) {
      return this.pickRandom([
        `"${call}Since you're new, you'll want to learn the districts. Downtown is where the action is."`,
        `"${call}New here, huh? Pace yourself. ${this.cityDisplayName(npc.city)} can chew you up if you let it."`,
      ]);
    }

    if (rel > 30) {
      return this.pickRandom([
        `"${call}Can't complain, you know? Just takin' it one day at a time."`,
        `"${call}It's been alright. Could be worse, could be better."`,
        `"${call}Same old, same old. But that ain't necessarily bad. What about you?"`,
      ]);
    }

    return this.pickRandom([
      `"${call}Yeah, just workin'. Same old same old."`,
      `"${call}Nothin' much. Just livin'."`,
      `"${call}It is what it is. You?"`,
      `"${call}Just tryin' to get by, like everybody else."`,
    ]);
  }

  private questionResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[], topic: string): string {
    if (rel < 0) {
      return this.pickRandom([
        `"Why you asking me?"`,
        `"I ain't got time for your questions."`,
        `"Find somebody else to bother."`,
      ]);
    }

    const name = this.playerName(flags, player);
    const call = name ? `${name}, ` : '';
    const activity = this.currentActivityFor(npc, ctx);
    const role = npc.role || 'local';

    if (topic === 'work' || topic === 'job') {
      return this.pickRandom([
        `"${call}I'm ${activity} right now. Day job keeps me busy."`,
        `"${call}I work as a ${role.replace(/_/g, ' ')}. It's a living."`,
        `"${call}Right now I'm just ${activity}. Not glamorous, but honest."`,
      ]);
    }

    if (topic === 'city' || topic === 'here') {
      return this.pickRandom([
        `"${call}${this.cityPitch(npc.city)}"`,
        `"${call}It's got its own rhythm. I like it."`,
        `"${call}Plenty to do if you know where to look."`,
      ]);
    }

    if (topic === 'crime' || topic === 'police') {
      if (npc.role === 'police_officer') {
        return this.pickRandom([
          `"${call}I'm just doing my job, keeping the streets safe."`,
          `"${call}Crime's like whack-a-mole. We handle it."`,
        ]);
      }
      return this.pickRandom([
        `"${call}I mind my business. That's how you stay out of trouble."`,
        `"${call}Not something I talk about with strangers."`,
      ]);
    }

    if (topic === 'self') {
      return this.roleQuestionResponse(npc, call);
    }

    // Default question: ask about player
    return this.pickRandom([
      `"${call}Good question. You new around here?"`,
      `"${call}Interesting you ask that. What about you—what's your story?"`,
      `"${call}I could talk about it, but I'd rather hear about you. What's your name?"`,
    ]);
  }

  private roleQuestionResponse(npc: NPCState, call: string): string {
    const roleLines: Record<string, string[]> = {
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
    const lines = roleLines[npc.role] || ['"That\'s a fair question."', '"I\'ll tell you what I know."'];
    const line = this.pickRandom(lines);
    return call ? `"${call}${line.slice(2, -1)}"` : line;
  }

  private tradeResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[]): string {
    if (rel < -20) return `"I don't do business with folks I don't trust."`;
    return this.pickRandom([
      `"Let's see what we can work out. Whatchu got in mind?"`,
      `"I'm always open to a fair deal. What's the offer?"`,
      `"Business is business. Lay it on me."`,
      `"Yeah, we can talk business. What you need?"`,
    ]);
  }

  private farewellResponse(npc: NPCState, rel: number, player: any, ctx: GameTimeContext, flags: string[]): string {
    const name = this.playerName(flags, player);
    if (rel > 50) {
      return name
        ? this.pickRandom([`"Catch you later, ${name}! Stay up."`, `"Peace, ${name}! Hit me up sometime."`, `"Take care, ${name}. You know where to find me."`])
        : this.pickRandom([`"Catch you later! Stay up."`, `"Peace! Hit me up sometime."`])
    }
    if (rel > 10) {
      return this.pickRandom([
        `"Later${name ? `, ${name}` : ''}."`,
        `"Take it easy."`,
        `"Peace."`,
      ]);
    }
    return name
      ? this.pickRandom([`"Bye, ${name}."`, `"See ya around, ${name}."`])
      : this.pickRandom([`"Bye."`, `"See ya around."`]);
  }

  private flirtResponse(npc: NPCState, rel: number, player: any, flags: string[]): string {
    const name = this.playerName(flags, player);
    if (rel < 20) return `"We ain't there yet${name ? `, ${name}` : ''}. Slow down."`;
    if (rel > 50) {
      return this.pickRandom([
        `"You're sweet. Real sweet${name ? `, ${name}` : ''}."`,
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

  private insultResponse(npc: NPCState, rel: number, player: any, flags: string[]): string {
    this.setFlag(flags, 'npc_is_mad');
    return this.pickRandom([
      `"Watch your mouth. I ain't the one."`,
      `"Say that again. I dare you."`,
      `"You got a lot of nerve. Best walk away while you can."`,
      `"I don't know what your problem is, but you better fix it."`,
      `"You tryin' to start something? 'Cause that's how you start something."`,
    ]);
  }

  private complimentResponse(npc: NPCState, rel: number, player: any, flags: string[]): string {
    const name = this.playerName(flags, player);
    if (rel < 0) return `"Is that supposed to make up for something?"`;
    return this.pickRandom([
      `"Oh, stop it${name ? `, ${name}` : ''}! You're going to make me blush."`,
      `"Now that's the kind of energy I like around here."`,
      `"Right back at you. Keep being you."`,
      `"You sure know how to brighten a day."`,
    ]);
  }

  private apologyResponse(npc: NPCState, rel: number, player: any, flags: string[]): string {
    if (rel < 0) {
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

  private rumorResponse(npc: NPCState, rel: number, player: any, flags: string[]): string {
    const trustLevel = rel > 50 ? 'trusted' : 'stranger';
    const city = (npc.city || 'default').toLowerCase();
    const rumors: Record<string, Record<string, string[]>> = {
      trusted: {
        memphis: [
          `"Between us — there's been a lot of talk about some big real estate buy downtown."`,
          `"Word at the barber shop is that the police are cracking down hard near Beale."`,
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
    return this.pickRandom(pool);
  }

  private questOfferResponse(npc: NPCState, quest: any, player: any, flags: string[]): string {
    return this.pickRandom([
      `"Actually, I could use some help. I've got a situation: ${quest.title}. You interested?"`,
      `"Funny you should ask. I was just thinking about ${quest.title}. You think you can handle it?"`,
      `"I might have something for you. ${quest.description} Interested?"`,
    ]);
  }

  private noQuestResponse(npc: NPCState, rel: number, player: any, flags: string[]): string {
    if (rel > 30) {
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

  private defaultResponse(npc: NPCState, input: string, rel: number, player: any, ctx: GameTimeContext, flags: string[], lastQuestion: string): string {
    const name = this.playerName(flags, player);
    const call = name ? `${name}, ` : '';

    if (lastQuestion) {
      return this.contextualAffirmResponse(npc, rel, player, ctx, flags, lastQuestion);
    }

    const lastTopic = flags.find(f => f.startsWith('topic:'))?.replace('topic:', '');
    if (lastTopic && lastTopic !== 'general') {
      const followUp: Record<string, string> = {
        work: 'We were talking about work last time.',
        weather: 'Weather still on your mind?',
        family: 'Family can be complicated.',
        rumor: 'You still hunting rumors?',
        city: 'Still figuring out the city?',
      };
      if (followUp[lastTopic]) {
        return `"${call}${followUp[lastTopic]} ${this.pickRandom(['Go on.', 'Say more.', 'I\'m listening.'])}"`;
      }
    }

    return this.pickRandom([
      `"${call}I'm not sure I follow, but I'm listening."`,
      `"${call}Say that again? You lost me a little."`,
      `"${call}I hear you. Keep talking."`,
    ]);
  }

  // --- FLAVOR & HELPERS ---

  private applyContinuity(npc: NPCState, text: string, flags: string[], ctx: GameTimeContext, player: any): string {
    const topic = flags.find(f => f.startsWith('topic:'))?.replace('topic:', '') || '';
    if (topic === 'farewell' || topic === 'question') return text;
    const lastTopic = flags.filter(f => f.startsWith('topic:')).slice(-2, -1)[0]?.replace('topic:', '');
    if (!lastTopic || lastTopic === topic) return text;

    const followUps: Record<string, string> = {
      work: ' Did you ever find steady work?',
      weather: ' Has the weather turned yet?',
      crime: ' Let\'s keep things clean today, yeah?',
      rumor: ' Heard anything new since last time?',
      family: ' How\'s the family holding up?',
    };
    if (topic === 'greeting' && followUps[lastTopic] && Math.random() > 0.5) {
      return this.appendToQuote(text, followUps[lastTopic]!);
    }
    return text;
  }

  private applyStateAwareness(npc: NPCState, text: string, player: any, flags: string[]): string {
    const crimRep = player?.reputation?.criminal || 0;
    const arrests = (player?.prisonRecord || []).length || 0;
    const health = player?.health ?? 100;
    const stress = player?.stress ?? 0;
    const job = player?.job;

    if (crimRep > 70 && arrests > 0 && Math.random() > 0.6) {
      text = this.appendToQuote(text, ' Word is you\'ve been running pretty hot lately. Be careful.');
    } else if (arrests > 0 && arrests < 3 && Math.random() > 0.7) {
      text = this.appendToQuote(text, ' I won\'t judge, but I\'d stay away from that life.');
    }

    if (stress > 80 && Math.random() > 0.6) {
      text = this.appendToQuote(text, ' You look worn out, honestly. Make sure you\'re taking care of yourself.');
    }
    if (health < 30 && Math.random() > 0.6) {
      text = this.appendToQuote(text, ' And you really don\'t look too good... should get checked out.');
    }

    if (job && job.title && Math.random() > 0.7 && !this.hasFlag(flags, 'job_mentioned')) {
      const roles = ['proud of where you\'re at', 'good for you', 'hope it\'s treating you well'];
      text = this.appendToQuote(text, ` ${this.pickRandom(roles)} at ${job.employer}.`);
      this.setFlag(flags, 'job_mentioned');
    }

    return text;
  }

  private applyCityFlavor(npc: NPCState, text: string): string {
    const city = (npc.city || '').toLowerCase();
    if (city !== 'memphis' && city !== 'west_memphis') return text;

    if (Math.random() > 0.5) {
      const slang = ['mane', 'junt', 'on god', 'no cap', 'real talk', 'you feel me', 'straight up', 'big facts'];
      const word = this.pickRandom(slang);
      if (text.endsWith('."')) return text.replace(/\."$/, `, ${word}."`);
      if (text.endsWith('?"')) return text.replace(/\?"$/, `? ${word.charAt(0).toUpperCase() + word.slice(1)}."`);
    }

    if (Math.random() > 0.7 && text.toLowerCase().includes('city')) {
      const ref = this.pickRandom(['River City', 'The Bluff City', '901', 'M-Town']);
      text = text.replace('city', ref);
    }

    return text;
  }

  private applyPersonalityFlavor(npc: NPCState, text: string): string {
    const personality = npc.personality || [];
    if (personality.length === 0) return text;

    if ((personality.includes('wise') || personality.includes('scholarly')) && Math.random() > 0.5) {
      const prefixes = ['"Listen close... ', '"As they say... ', '"In my experience... ', '"Mark my words... '];
      text = this.replaceQuotePrefix(text, this.pickRandom(prefixes));
    }

    if (personality.includes('rebellious') || personality.includes('street_smart')) {
      text = this.appendToQuote(text, ' You feel me?');
      if (Math.random() > 0.3) text = this.replaceQuotePrefix(text, '"Yo, ');
    }

    if ((personality.includes('proper') || personality.includes('elegant')) && Math.random() > 0.5) {
      text = this.replaceQuotePrefix(text, '"Pardon me, but ');
      text = this.appendToQuote(text, ' If you please.');
    }

    if (personality.includes('competitive') || personality.includes('aggressive')) {
      text = this.appendToQuote(text, ' Don\'t get it twisted.');
      if (Math.random() > 0.4) text = this.replaceQuotePrefix(text, '"Listen here! ');
    }

    if (personality.includes('warm') || personality.includes('caring')) {
      text = this.appendToQuote(text, ' Stay safe out there, honey.');
      if (Math.random() > 0.3) text = this.replaceQuotePrefix(text, '"Aww, ');
    }

    if ((personality.includes('strict') || personality.includes('disciplined')) && Math.random() > 0.5) {
      text = this.appendToQuote(text, ' Make it quick.');
    }

    return text;
  }

  private replaceQuotePrefix(text: string, prefix: string): string {
    if (text.startsWith('"')) return prefix + text.slice(1);
    return prefix + text;
  }

  private appendToQuote(text: string, fragment: string): string {
    if (text.endsWith('"')) return text.slice(0, -1) + fragment + '"';
    return text + fragment;
  }

  private topicFromIntent(intent: ConversationIntent, input: string): string {
    const lower = input.toLowerCase();
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
    if (intent.type === 'question') {
      if (lower.includes('city') || lower.includes('here') || lower.includes('town')) return 'city';
      if (lower.includes('work') || lower.includes('job')) return 'work';
      if (lower.includes('crime') || lower.includes('police') || lower.includes('illegal')) return 'crime';
      if (lower.includes('you') || lower.includes('yourself')) return 'self';
      return 'question';
    }
    return 'general';
  }

  private roleWorkLine(npc: NPCState): string {
    const roleLines: Record<string, string> = {
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
    return roleLines[npc.role] || 'Keeping busy.';
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
