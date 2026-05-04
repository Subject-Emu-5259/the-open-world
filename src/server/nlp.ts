// THE OPEN WORLD — Natural Language Processor
// Converts conversational input to game commands

export interface IntentResult {
  command: string;
  args: string[];
  confidence: number;
  originalInput: string;
}

export interface IntentPattern {
  patterns: RegExp[];
  command: string;
  extractArgs?: (matches: RegExpMatchArray) => string[];
}

// Intent patterns for natural language understanding
const INTENT_PATTERNS: IntentPattern[] = [
  // === MOVEMENT / EXPLORATION ===
  {
    patterns: [
      /(?:go|walk|head|travel|move)\s+(?:to\s+)?(?:the\s+)?(store|shop|mall|market|bar|club|diner|cafe|restaurant|gym|library|park|beach)/i,
      /(?:i want to|i'd like to|let me|let's)\s+(?:go|visit)\s+(?:to\s+)?(?:the\s+)?(store|shop|mall|market)/i,
      /(?:take me to|bring me to)\s+(?:the\s+)?(store|shop|mall|market)/i,
    ],
    command: 'explore',
    extractArgs: (m) => [m[1]?.toLowerCase() || ''],
  },
  {
    patterns: [
      /(?:go|travel|fly|head)\s+to\s+([a-z_]+(?:\s+[a-z_]+)?)\s*(?:city|town)?/i,
      /(?:i want to|i'd like to)\s+(?:visit|go to|travel to)\s+([a-z_]+(?:\s+[a-z_]+)?)/i,
      /(?:take|book)\s+(?:a\s+)?(?:flight|plane|trip)\s+to\s+([a-z_]+)/i,
      /(?:fly|drive)\s+to\s+([a-z_]+)/i,
    ],
    command: 'travel',
    extractArgs: (m) => [m[1]?.toLowerCase().replace(/\s+/g, '_') || ''],
  },
  {
    patterns: [
      /(?:explore|look around|walk around|see what's around|check out)(?:\s+(?:the\s+)?([a-z_]+(?:\s+[a-z_]+)?))?/i,
      /(?:what's|what is)\s+(?:around|nearby|here)/i,
      /(?:show me|tell me about)\s+(?:the\s+)?(?:area|neighborhood|surroundings)/i,
    ],
    command: 'explore',
    extractArgs: (m) => [m[1]?.toLowerCase() || ''],
  },

  // === WORK / JOB ===
  {
    patterns: [
      /(?:go to|head to)\s+work/i,
      /(?:i want to|i'm going to)\s+work/i,
      /(?:start|begin)\s+(?:my\s+)?(?:shift|workday)/i,
      /(?:time for|ready for)\s+work/i,
      /(?:put in|do)\s+(?:a\s+)?(?:full\s+)?(?:day'?s?\s+)?work/i,
      /work\s+(?:my\s+)?shift/i,
    ],
    command: 'work',
  },
  {
    patterns: [
      /(?:find|look for|get|search for)\s+(?:a\s+)?job/i,
      /(?:apply|submit application)\s+(?:for\s+)?(?:a\s+)?job/i,
      /(?:what|show)\s+(?:jobs|openings|positions|listings)\s*(?:are)?\s*(?:available|open|around)?/i,
      /(?:i need|i want)\s+(?:a\s+)?job/i,
      /(?:job\s+)?(?:search|hunt)/i,
    ],
    command: 'apply',
  },
  {
    patterns: [
      /(?:apply|submit)\s+(?:for\s+)?(?:the\s+)?(?:position\s+of\s+)?([a-z\s]+)\s+(?:job|position)?/i,
      /(?:i want|i'd like)\s+(?:to be|to work as)\s+(?:a\s+)?([a-z\s]+)/i,
      /(?:get|land)\s+(?:a\s+)?job\s+(?:as|at)\s+([a-z\s]+)/i,
    ],
    command: 'apply',
    extractArgs: (m) => [m[1]?.trim().toLowerCase() || ''],
  },

  // === STUDY / LEARN ===
  {
    patterns: [
      /(?:go to|head to|visit)\s+(?:the\s+)?(?:library|school|college|university)/i,
      /(?:study|learn|read)\s+(?:about\s+)?([a-z\s]+)?/i,
      /(?:i want to|i'd like to)\s+(?:study|learn)\s+([a-z\s]+)?/i,
      /(?:take|attend)\s+(?:a\s+)?class(?:es)?/i,
      /(?:improve|boost|increase)\s+(?:my\s+)?(?:intelligence|knowledge|skills)/i,
    ],
    command: 'study',
    extractArgs: (m) => [m[1]?.toLowerCase() || 'general'],
  },

  // === SLEEP / REST ===
  {
    patterns: [
      /(?:go to|head to)\s+(?:sleep|bed|rest)/i,
      /(?:i want to|i need to|i'm going to)\s+(?:sleep|rest|nap)/i,
      /(?:take|have)\s+(?:a\s+)?(?:nap|rest|break)/i,
      /(?:i'm|feeling)\s+(?:tired|exhausted|worn out)/i,
      /(?:sleep|rest|recharge)\s+(?:for\s+)?(?:a\s+)?(?:while|bit)/i,
    ],
    command: 'sleep',
  },

  // === PHONE / COMMUNICATION ===
  {
    patterns: [
      /(?:check|look at|open)\s+(?:my\s+)?(?:phone|messages|texts|sms)/i,
      /(?:do i have|got|any)\s+(?:new\s+)?(?:messages|texts|sms)/i,
      /(?:read|show)\s+(?:my\s+)?(?:messages|texts)/i,
      /(?:who\s+)?(?:texted|messaged)\s+me/i,
      /(?:open|check)\s+(?:the\s+)?(?:phone|device)/i,
    ],
    command: 'check',
    extractArgs: () => ['messages'],
  },
  {
    patterns: [
      /(?:check|look at|read)\s+(?:my\s+)?(?:emails?|inbox|mail)/i,
      /(?:do i have|got|any)\s+(?:new\s+)?email/i,
      /(?:who\s+)?(?:emailed|sent\s+mail)\s+me/i,
    ],
    command: 'check',
    extractArgs: () => ['email'],
  },
  {
    patterns: [
      /(?:check|listen to)\s+(?:my\s+)?(?:voicemails?|voice\s*mails?|messages?)/i,
      /(?:do i have|got|any)\s+(?:new\s+)?(?:voicemail|voice\s*mail)/i,
      /(?:any\s+)?(?:missed\s+)?calls?/i,
    ],
    command: 'check',
    extractArgs: () => ['voicemail'],
  },
  {
    patterns: [
      /(?:check|open|look at)\s+(?:my\s+)?phone/i,
      /(?:what'?s?\s+on|show)\s+(?:my\s+)?(?:phone|screen)/i,
      /(?:phone|device)\s*(?:check|status)/i,
    ],
    command: 'check',
    extractArgs: () => ['all'],
  },
  {
    patterns: [
      /(?:check|show)\s+(?:everything|all|my\s+stuff)/i,
      /(?:what\s+do\s+i\s+have|what's\s+new)/i,
      /(?:inbox|notifications?|alerts?)/i,
    ],
    command: 'check',
    extractArgs: () => ['all'],
  },

  // === SOCIAL / TALKING ===
  {
    patterns: [
      /(?:talk|speak|chat)\s+(?:to|with)\s+([a-z\s]+?)(?:\s+(?:about|regarding))?/i,
      /(?:say\s+(?:hi|hello|hey)\s+to)\s+([a-z\s]+)/i,
      /(?:meet|greet|approach)\s+([a-z\s]+)/i,
      /(?:have\s+a\s+)?conversation\s+with\s+([a-z\s]+)/i,
      /(?:who\s+is|who's)\s+(?:around|here|nearby)/i,
    ],
    command: 'talk',
    extractArgs: (m) => [m[1]?.trim().toLowerCase() || ''],
  },
  {
    patterns: [
      /(?:call|phone|text|message)\s+([a-z\s]+)/i,
      /(?:send|write)\s+(?:a\s+)?(?:text|message)\s+(?:to\s+)?([a-z\s]+)/i,
    ],
    command: 'talk',
    extractArgs: (m) => [m[1]?.trim().toLowerCase() || ''],
  },

  // === STATUS / INFO ===
  {
    patterns: [
      /(?:how\s+am\s+i\s+doing|how's\s+it\s+going|what's\s+my\s+status)/i,
      /(?:check|show|display)\s+(?:my\s+)?(?:status|stats|profile|info)/i,
      /(?:who\s+am\s+i|tell\s+me\s+about\s+myself)/i,
      /(?:what's\s+my|my\s+current)\s+(?:health|energy|money|cash|job|happiness)/i,
    ],
    command: 'status',
  },
  {
    patterns: [
      /(?:what\s+time\s+is\s+it|what's\s+the\s+time|tell\s+me\s+the\s+time)/i,
      /(?:current\s+)?(?:time|date|day)/i,
    ],
    command: 'time',
  },
  {
    patterns: [
      /(?:what's\s+the\s+weather|how's\s+the\s+weather|check\s+weather)/i,
      /(?:is\s+it\s+)?(?:raining|sunny|cold|hot|storming|cloudy)/i,
      /(?:temperature|temp|forecast)/i,
    ],
    command: 'weather',
  },

  // === MONEY / SHOPPING ===
  {
    patterns: [
      /(?:how\s+much\s+money\s+(?:do\s+i\s+have|is\s+in\s+my\s+(?:pocket|wallet)))/i,
      /(?:check|show)\s+(?:my\s+)?(?:money|cash|funds|bank|balance)/i,
      /(?:what\s+can\s+i\s+afford|i\s+want\s+to\s+(?:buy|purchase))/i,
    ],
    command: 'status',
  },
  {
    patterns: [
      /(?:buy|purchase|get)\s+(?:a\s+)?(?:vehicle|car|truck|suv|motorcycle|sedan|compact)\s*:?\s*([a-z\s]+)?/i,
      /(?:i want|i'd like)\s+(?:to\s+buy|a)\s+(vehicle|car|truck|suv|motorcycle)/i,
      /(?:shop\s+for|look\s+at)\s+(?:a\s+)?(?:car|vehicle)/i,
    ],
    command: 'buy',
    extractArgs: (m) => ['vehicle', m[1]?.toLowerCase() || 'sedan'],
  },
  {
    patterns: [
      /(?:show|view|check)\s+(?:my\s+)?(?:vehicles?|cars?|garage)/i,
      /(?:what\s+cars?\s+(?:do\s+i\s+have|are\s+in\s+my\s+garage))/i,
    ],
    command: 'vehicles',
  },

  // === PROPERTY / REAL ESTATE ===
  {
    patterns: [
      /(?:look\s+at|check|view|show)\s+(?:the\s+)?(?:real\s*estate|properties?|housing|homes?)/i,
      /(?:what\s+(?:properties?|houses?|homes?)\s+(?:are\s+)?(?:available|for\s+sale))/i,
      /(?:buy|purchase)\s+(?:a\s+)?(?:house|home|property|apartment)/i,
      /(?:i want|i'd like)\s+(?:to\s+buy|a)\s+(?:house|home|property)/i,
    ],
    command: 'real-estate',
  },
  {
    patterns: [
      /(?:my\s+properties?|my\s+houses?|my\s+real\s*estate|my\s+portfolio)/i,
      /(?:what\s+properties?\s+do\s+i\s+own)/i,
    ],
    command: 'properties',
  },

  // === INVESTMENT ===
  {
    patterns: [
      /(?:invest|investment)\s+(?:options?|opportunities?|choices?)/i,
      /(?:what\s+can\s+i\s+invest\s+in)/i,
      /(?:show\s+(?:me\s+)?investment\s+options)/i,
    ],
    command: 'invest',
    extractArgs: () => ['options'],
  },
  {
    patterns: [
      /(?:invest|put)\s+\$?(\d+)\s+(?:in|into|on)\s+([a-z\s]+)/i,
      /(?:buy|i want)\s+\$?(\d+)\s+(?:worth\s+of\s+)?([a-z\s]+)\s+(?:stock|shares?|bonds?|crypto)?/i,
    ],
    command: 'invest',
    extractArgs: (m) => [m[2]?.trim().toLowerCase() || '', m[1] || '0'],
  },

  // === HELP ===
  {
    patterns: [
      /(?:help|commands?|instructions?|how\s+(?:do\s+i|to\s+play|does\s+this\s+work))/i,
      /(?:what\s+can\s+i\s+do|what\s+are\s+my\s+options)/i,
      /(?:guide|tutorial|manual)/i,
    ],
    command: 'help',
  },

  // === EVENTS ===
  {
    patterns: [
      /(?:what's\s+happening|any\s+events?|current\s+events?)/i,
      /(?:is\s+there\s+(?:anything|something)\s+(?:going\s+on|happening))/i,
      /(?:community\s+events?|local\s+events?)/i,
    ],
    command: 'event',
  },

  // === CRIME (for future expansion) ===
  {
    patterns: [
      /(?:rob|steal|mug|burgle|break\s+into)/i,
      /(?:commit\s+(?:a\s+)?crime)/i,
      /(?:do\s+something\s+illegal)/i,
    ],
    command: 'crime',
  },
];

// Fuzzy matching for common misspellings and variations
const SPELLING_VARIATIONS: Record<string, string[]> = {
  'memphis': ['mephis', 'memfis', 'memph'],
  'nashville': ['nashvile', 'nashvill', 'nash'],
  'atlanta': ['atl', 'atlana', 'atlants'],
  'new york': ['nyc', 'newyork', 'ny'],
  'los angeles': ['la', 'l.a.', 'losangeles', 'angeles'],
  'chicago': ['chi', 'chicgo', 'chicago'],
};

export function parseNaturalInput(input: string): IntentResult {
  const cleanInput = input.trim().toLowerCase();
  
  // First, check if it's already a command (starts with command word)
  const directCommand = parseDirectCommand(cleanInput);
  if (directCommand) {
    return {
      command: directCommand.command,
      args: directCommand.args,
      confidence: 1.0,
      originalInput: input,
    };
  }
  
  // Try pattern matching for natural language
  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      const match = cleanInput.match(pattern);
      if (match) {
        let args: string[] = [];
        if (intent.extractArgs) {
          args = intent.extractArgs(match);
        }
        
        // Apply spelling corrections to args
        args = args.map(arg => correctSpelling(arg || ""));
        
        return {
          command: intent.command,
          args: args.filter(a => a.length > 0),
          confidence: 0.85 + (match[0].length / cleanInput.length) * 0.15,
          originalInput: input,
        };
      }
    }
  }
  
  // Fallback: try keyword-based matching
  const keywordResult = matchByKeywords(cleanInput);
  if (keywordResult) {
    return {
      ...keywordResult,
      originalInput: input,
    };
  }
  
  // No match found
  return {
    command: 'unknown',
    args: [cleanInput],
    confidence: 0,
    originalInput: input,
  };
}

function parseDirectCommand(input: string): { command: string; args: string[] } | null {
  // Direct command format: "work", "study finance", "apply warehouse", etc.
  const parts = input.split(/\s+/);
  const firstWord = parts[0] || "";
  
  const validCommands = [
    'work', 'study', 'explore', 'talk', 'sleep', 'rest', 
    'apply', 'status', 'help', 'time', 'weather', 'check',
    'travel', 'fly', 'drive', 'move', 'cities', 'destinations',
    'event', 'vehicles', 'garage', 'properties', 'real-estate',
    'invest', 'investments', 'crime', 'rob', 'steal', 'nextday', 'tomorrow', 'wait', 'morning', 'afternoon', 'evening', 'night', 'date', 'day',
  ];
  
  if (validCommands.includes(firstWord)) {
    return {
      command: firstWord,
      args: parts.slice(1),
    };
  }
  
  // Handle "buy vehicle sedan", "sell vehicle truck", etc.
  if (firstWord === 'buy' || firstWord === 'sell') {
    const secondWord = parts[1] || "";
    if (['vehicle', 'car', 'property', 'house', 'investment'].includes(secondWord || '')) {
      return {
        command: `${firstWord} ${secondWord}`,
        args: parts.slice(2),
      };
    }
  }
  
  return null;
}

function matchByKeywords(input: string): IntentResult | null {
  const keywords: Record<string, string> = {
    'work': 'work',
    'job': 'apply',
    'hire': 'apply',
    'sleep': 'sleep',
    'rest': 'sleep',
    'tired': 'sleep',
    'study': 'study',
    'learn': 'study',
    'explore': 'explore',
    'walk': 'explore',
    'look': 'explore',
    'status': 'status',
    'health': 'status',
    'money': 'status',
    'cash': 'status',
    'help': 'help',
    'time': 'time',
    'weather': 'weather',
    'travel': 'destinations',
    'fly': 'destinations',
    'city': 'destinations',
    'property': 'real-estate',
    'house': 'real-estate',
    'invest': 'invest',
    'stock': 'invest',
    'car': 'vehicles',
    'vehicle': 'vehicles',
    'message': 'check',
    'email': 'check',
    'phone': 'check',
  };
  
  for (const [keyword, command] of Object.entries(keywords)) {
    if (input.includes(keyword)) {
      return {
        command,
        args: [],
        confidence: 0.5,
        originalInput: input,
      };
    }
  }
  
  return null;
}

function correctSpelling(word: string): string {
  const lowerWord = word.toLowerCase().trim();
  
  for (const [correct, variations] of Object.entries(SPELLING_VARIATIONS)) {
    if (variations.includes(lowerWord)) {
      return correct;
    }
  }
  
  return lowerWord;
}

// Generate a natural response for unrecognized input
export function generateUnrecognizedResponse(input: string): string {
  const responses = [
    `I'm not sure what you mean by "${input.slice(0, 30)}${input.length > 30 ? '...' : ''}". Try saying something like "go to work" or "check my phone".`,
    `Didn't quite catch that. You could try "check my messages" or "go to the store".`,
    `Hmm, not sure how to help with that. Type "help" for a list of things you can do.`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)] || responses[0]!;
}
