// THE OPEN WORLD - Conversation Engine
// Natural language conversations with NPCs

import type { NPCState } from './social-engine.js';

export interface ConversationIntent {
  type: 'greeting' | 'question' | 'smalltalk' | 'trade' | 'farewell' | 'flirt' | 'insult' | 'compliment' | 'unknown' | 'quest';
  confidence: number;
  fair?: boolean;
}

export interface ConversationResponse {
  text: string;
  relationshipChange: number;
  questTriggered?: string;
}

export class ConversationEngine {
  
  // Detect what the player is trying to say
  detectIntent(input: string): ConversationIntent {
    const lower = input.toLowerCase().trim();
    
    // Greetings
    if (this.matchesAny(lower, ['hey', 'hi', 'hello', 'sup', 'wasup', 'wassup', 'yo', 'whats up', "what's up", 'howdy', 'mornin', 'evenin', 'wassgood', 'wsgood'])) {
      return { type: 'greeting', confidence: 0.9 };
    }
    
    // Farewells
    if (this.matchesAny(lower, ['bye', 'later', 'see ya', 'see you', 'gotta go', 'peace', 'take care', 'cya', 'im leaving', "i'm leaving", 'goodbye', 'im out', 'headin out'])) {
      return { type: 'farewell', confidence: 0.9 };
    }
    
    // Insults
    if (this.matchesAny(lower, ['stupid', 'dumb', 'ugly', 'hate', 'suck', 'trash', 'garbage', 'worthless', 'idiot', 'fool', 'punk', 'bitch', 'ass', 'fuck', 'shit'])) {
      return { type: 'insult', confidence: 0.8 };
    }
    
    // Flirting
    if (this.matchesAny(lower, ['cute', 'sexy', 'hot', 'gorgeous', 'date', 'kiss', 'love you', 'marry', 'beautiful eyes', 'pretty eyes', 'lookin good', 'looking good'])) {
      return { type: 'flirt', confidence: 0.7 };
    }
    
    // Trade/Business
    if (this.matchesAny(lower, ['buy', 'sell', 'trade', 'deal', 'price', 'cost', 'how much', 'discount', 'bargain', 'purchase', 'pay'])) {
      return { type: 'trade', fair: true, confidence: 0.8 };
    }
    
    // Questions
    if (lower.includes('?') || this.matchesAny(lower, ['how', 'what', 'why', 'when', 'where', 'who', 'can you', 'could you', 'do you', 'are you', 'is there', 'tell me', 'explain'])) {
      return { type: 'question', confidence: 0.7 };
    }
    
    // Compliments
    if (this.matchesAny(lower, ['cool', 'awesome', 'great', 'nice', 'love', 'amazing', 'beautiful', 'handsome', 'pretty', 'smart', 'best', 'good job', 'well done', 'impressive'])) {
      return { type: 'compliment', confidence: 0.6 };
    }
    
    // Small talk
    if (this.matchesAny(lower, ['weather', 'day', 'night', 'life', 'work', 'job', 'family', 'kids', 'weekend', 'plans', 'doing', 'been up', 'good', 'bad', 'how are', 'hows it going'])) {
      return { type: 'smalltalk', confidence: 0.5 };
    }
    
    return { type: 'unknown', confidence: 0 };
  }
  
  // Generate NPC response based on input, NPC state, and relationship
  generateResponse(npc: NPCState, playerInput: string): ConversationResponse {
    const intent = this.detectIntent(playerInput);
    const rel = npc.relationship;
    
    let text = '';
    let relChange = 0;
    
    switch (intent.type) {
      case 'greeting':
        relChange = rel < 0 ? 1 : 2;
        text = this.greetingResponse(npc, rel);
        break;
        
      case 'question':
        relChange = 1;
        text = this.questionResponse(npc, rel);
        break;
        
      case 'smalltalk':
        relChange = 1;
        text = this.smallTalkResponse(npc, rel);
        break;
        
      case 'trade':
        relChange = intent.fair ? 2 : -3;
        text = this.tradeResponse(npc, rel);
        break;
        
      case 'farewell':
        relChange = 0;
        text = this.farewellResponse(npc, rel);
        break;
        
      case 'flirt':
        relChange = rel > 30 ? 3 : -5;
        text = this.flirtResponse(npc, rel);
        break;
        
      case 'insult':
        relChange = -10;
        text = this.insultResponse(npc, rel);
        break;
        
      case 'compliment':
        relChange = 3;
        text = this.complimentResponse(npc, rel);
        break;
        
      case 'quest':
        relChange = 1;
        const availableQuest = npc.quests?.find(q => q.status === 'available');
        if (availableQuest) {
          text = this.questOfferResponse(npc, availableQuest);
          return { text, relationshipChange: relChange, questTriggered: availableQuest.id };
        }
        text = this.noQuestResponse(npc, rel);
        break;
        
      default:
        relChange = 0;
        text = this.defaultResponse(npc, playerInput, rel);
    }
    
    return { text, relationshipChange: relChange };
  }
  
  private matchesAny(input: string, patterns: string[]): boolean {
    return patterns.some(p => input.includes(p));
  }
  
  private pickRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)] || arr[0]!;
  }
  
  private greetingResponse(npc: NPCState, rel: number): string {
    if (rel > 50) {
      return this.pickRandom([
        `"Hey there! Good to see ya!"`,
        `"What's good! Always happy to see a friendly face."`,
        `"Yo! How you been?"`,
        `"Look who it is! What's poppin?"`,
      ]);
    } else if (rel > 10) {
      return this.pickRandom([
        `"What's up."`,
        `"Hey."`,
        `"What's good."`,
        `"Yo."`,
      ]);
    } else {
      return this.pickRandom([
        `"Can I help you?"`,
        `"You new around here?"`,
        `"Sup."`,
        `"Don't think we've met. What's your name?"`,
      ]);
    }
  }
  
  private questionResponse(npc: NPCState, rel: number): string {
    // Role-specific responses
    const roleResponses: Record<string, string[]> = {
      store_owner: [
        `"Been runnin' this store 20 years now. Best decision I ever made."`,
        `"Yeah, we got plenty in stock. What you lookin' for?"`,
        `"Business is good. Community takes care of its own."`,
      ],
      mechanic: [
        `"I can fix anything with an engine. Bring it by the shop."`,
        `"Yeah, that sounds like a transmission issue. Come by tomorrow."`,
        `"Parts? I can get most anything within a day or two."`,
      ],
      teacher: [
        `"The kids keep me young. Most days, anyway."`,
        `"Education is the great equalizer. I believe that."`,
        `"Fourth grade is a special age. They still want to learn."`,
      ],
      nurse: [
        `"ER life ain't for everybody. But somebody's gotta do it."`,
        `"Seen a lot in my years. Try not to bring it home."`,
        `"Takes a special kind of crazy to work nights. That's me."`,
      ],
      promoter: [
        `"You gotta know the right people. That's half the game."`,
        `"There's always something poppin' if you know where to look."`,
        `"Music scene here is underrated. For real."`,
      ],
      barber: [
        `"I hear everything in this chair. Everything."`,
        `"Best fades in the city. That ain't even a question."`,
        `"You'd be surprised what people say when they sittin' in the chair."`,
      ],
      police_officer: [
        `"Just doin' my job, keepin' the streets safe."`,
        `"I've seen a lot. Most folks are just tryin' to get by."`,
        `"You stay out of trouble, we won't have problems."`,
      ],
      pastor: [
        `"The Lord works in mysterious ways, child."`,
        `"Faith can move mountains. You believe that?"`,
        `"This community is strong. We look out for each other."`,
      ],
      chef: [
        `"Food is love. That's what my grandmother taught me."`,
        `"You gotta cook with your soul, not just your hands."`,
        `"Best ingredients, best technique, that's the secret. No shortcuts."`,
      ],
      elder: [
        `"I've been around a long time. Seen a lot of changes."`,
        `"Back in my day, things were different. Not better, not worse. Different."`,
        `"Listen more than you talk. That's wisdom."`,
      ],
    };
    
    const responses = roleResponses[npc.role] || [
      `"That's a good question. Let me think on it."`,
      `"Hmm, I ain't really sure. Ask around."`,
      `"You'd have to ask someone who knows more about that."`,
    ];
    
    return this.pickRandom(responses);
  }
  
  private smallTalkResponse(npc: NPCState, rel: number): string {
    if (rel > 30) {
      return this.pickRandom([
        `"Can't complain, you know? Just takin' it one day at a time."`,
        `"It's been alright. Could be worse, could be better."`,
        `"You know how it is. The grind never stops."`,
        `"Same old, same old. But that ain't necessarily bad."`,
      ]);
    }
    return this.pickRandom([
      `"Yeah, just workin'. Same old same old."`,
      `"Nothin' much. Just livin'."`,
      `"It is what it is."`,
      `"Just tryin' to get by, like everybody else."`,
    ]);
  }
  
  private tradeResponse(npc: NPCState, rel: number): string {
    if (rel < -20) {
      return `"I don't do business with folks I don't trust."`;
    }
    return this.pickRandom([
      `"Let's see what we can work out. Whatchu got in mind?"`,
      `"I'm always open to a fair deal. What's the offer?"`,
      `"Business is business. Lay it on me."`,
      `"Yeah, we can talk business. What you need?"`,
    ]);
  }
  
  private farewellResponse(npc: NPCState, rel: number): string {
    if (rel > 50) {
      return this.pickRandom([
        `"Catch you later! Stay up."`,
        `"Peace! Hit me up sometime."`,
        `"Take care now. You know where to find me."`,
        `"See ya round. Don't be a stranger!"`,
      ]);
    } else if (rel > 10) {
      return this.pickRandom([
        `"Later."`,
        `"Take it easy."`,
        `"Peace."`,
        `"See ya."`,
      ]);
    }
    return this.pickRandom([
      `"Bye."`,
      `"See ya around."`,
    ]);
  }
  
  private flirtResponse(npc: NPCState, rel: number): string {
    if (rel < 20) {
      return this.pickRandom([
        `"We ain't there yet. Slow down."`,
        `"You're movin' a little fast there."`,
        `"I barely know you. Pump the brakes."`,
      ]);
    }
    if (rel > 50) {
      return this.pickRandom([
        `"You're sweet. Real sweet."`,
        `"Now you're just trying to make me blush."`,
        `"Keep talkin' like that and I might have to take you seriously."`,
        `"You always know what to say."`,
      ]);
    }
    return this.pickRandom([
      `"You got charm, I'll give you that."`,
      `"Smooth. I see you."`,
      `"Not bad. Not bad at all."`,
    ]);
  }
  
  private insultResponse(npc: NPCState, rel: number): string {
    return this.pickRandom([
      `"Watch your mouth. I ain't the one."`,
      `"Say that again. I dare you."`,
      `"You got a lot of nerve. Best walk away while you can."`,
      `"I don't know what your problem is, but you better fix it."`,
      `"You tryin' to start something? 'Cause that's how you start something."`,
    ]);
  }
  
  private complimentResponse(npc: NPCState, rel: number): string {
    return this.pickRandom([
      `"Appreciate that. Means somethin'."`,
      `"Thanks, I try. We all just tryin' to make it."`,
      `"That's kind of you to say. Not everyone notices."`,
      `"You're alright. You know that?"`,
      `"Thanks. That's real decent of you."`,
    ]);
  }
  
  private defaultResponse(npc: NPCState, input: string, rel: number): string {
    return this.pickRandom([
      `"Hmm. I hear you."`,
      `"Yeah, I feel that. Life be like that sometimes."`,
      `"Right, right."`,
      `"I ain't sure I follow, but I'm listenin'."`,
      `"Word."`,
    ]);
  }
  
  private questOfferResponse(npc: NPCState, quest: any): string {
    return this.pickRandom([
      `"Actually, I could use some help. I've got a situation: ${quest.title}. You interested?"`,
      `"Funny you should ask. I was just thinking about ${quest.title}. You think you can handle it?"`,
      `"I might have something for you. ${quest.description} Interested?"`,
    ]);
  }
  
  private noQuestResponse(npc: NPCState, rel: number): string {
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
}
