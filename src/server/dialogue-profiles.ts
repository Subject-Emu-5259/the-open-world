// THE OPEN WORLD — NPC Voice Profiles (v0.108.10)
//
// A voice profile is derived PURELY from an NPC's static roster data
// (role, personality traits, description, city, district, age). It never
// reads mutable singleton state, and it never varies per player, so two
// players talking to the same NPC get the same voice but never each
// other's memories — voice is shared, memory is not.
//
// New NPCs get a profile by default: unknown roles fall back to the
// neutral register and unknown traits are ignored, so no NPC ever falls
// back to the old shared template voice by accident.

export interface NpcVoiceProfile {
  /** e.g. 'plainspoken shop talk', 'academic', 'scriptural cadence'. */
  register: string;
  /** 'warm' | 'neutral' | 'cool' — how affectionate the NPC sounds. */
  warmth: 'warm' | 'neutral' | 'cool';
  /** 'formal' | 'plain' | 'street' — vocabulary register. */
  formality: 'formal' | 'plain' | 'street';
  /** 'dry' | 'light' | 'none' — humor style. */
  humor: 'dry' | 'light' | 'none';
  catchphrases: string[];
  topics: string[];
  /** Things this NPC never says (keeps voices distinct and in-fiction). */
  neverSay: string[];
  /** Free-form voice notes folded into the reply prompt. */
  speechNotes: string;
}

export interface NpcStaticData {
  id: string;
  name: string;
  role: string;
  city: string;
  district: string;
  age?: number;
  description?: string;
  personality?: string[];
}

const TRAIT_VOICE: Record<string, Partial<NpcVoiceProfile>> = {
  wise: { speechNotes: 'Speaks in measured sayings; answers a question with a short story or proverb before the point.' },
  generous: { warmth: 'warm', speechNotes: 'Offers help before being asked; speaks warmly of neighbors.' },
  warm: { warmth: 'warm' },
  strict: { formality: 'formal', humor: 'none', speechNotes: 'Short, rule-bound sentences. No slang.' },
  observant: { speechNotes: 'Notices details about the player and the street; comments on what they see.' },
  chatty: { speechNotes: 'Talks at length, digresses, circles back. Never one-word answers.' },
  ambitious: { speechNotes: 'Talks about growth, deals, and what is next. Forward-looking.' },
  free_spirited: { humor: 'light', speechNotes: 'Playful, breezy, unbothered by convention.' },
  fair: { formality: 'formal', speechNotes: 'Even-handed; weighs both sides before judging.' },
  intimidating: { warmth: 'cool', formality: 'formal', humor: 'none', speechNotes: 'Short, direct, no small talk. Silence is a tool.' },
  caring: { warmth: 'warm', speechNotes: 'Checks on the player first; gentle, practical kindness.' },
  exhausted: { speechNotes: 'Tired but kind; short sentences, sighs, mentions being run off their feet.' },
  charismatic: { humor: 'light', speechNotes: 'Magnetic, performs a little; loves an audience.' },
  intellectual: { formality: 'formal', speechNotes: 'Precise vocabulary; references ideas and books.' },
  distracted: { speechNotes: 'Loses the thread, trails off, remembers mid-sentence.' },
  hardworking: { speechNotes: 'Talks about the work itself; respects effort, distrusts shortcuts.' },
  family_first: { warmth: 'warm', speechNotes: 'Brings every topic back to family and home.' },
  mentor: { warmth: 'warm', speechNotes: 'Teaches through encouragement and hard truths in equal measure.' },
  tough_love: { warmth: 'cool', speechNotes: 'Blunt encouragement; no coddling, but never cruel.' },
  skilled: { speechNotes: 'Talks shop with quiet confidence; shows, does not boast.' },
  quiet: { humor: 'none', speechNotes: 'Few words, each one chosen. Comfortable with silence.' },
  spiritual: { speechNotes: 'Speaks of faith, community, and purpose without preaching at the player.' },
  compassionate: { warmth: 'warm' },
  fire_and_brimstone: { formality: 'formal', speechNotes: 'Preaches with fire; calls the player to account, then to grace.' },
  sassy: { humor: 'dry', speechNotes: 'Quick, cutting wit; says the thing everyone else is thinking.' },
  supportive: { warmth: 'warm' },
  hungry: { speechNotes: 'Eager, hustling, always looking for the next opportunity.' },
  quick: { speechNotes: 'Fast talker; short bursts, quick pivots.' },
  dedicated: { speechNotes: 'Earnest about the craft; patient explanations.' },
  patient: { speechNotes: 'Unhurried; explains twice without annoyance.' },
  professional: { formality: 'formal' },
  kind: { warmth: 'warm' },
  friendly: { warmth: 'warm' },
  disciplined: { formality: 'formal', speechNotes: 'Order, routine, standards. No wasted words.' },
  inspiring: { warmth: 'warm', speechNotes: 'Lifts the player up; speaks of what they could become.' },
  proud: { speechNotes: 'Proud of the work and the neighborhood; takes credit plainly.' },
  creative: { speechNotes: 'Thinks in images and ideas; loves what is new.' },
  academic: { formality: 'formal' },
  curious: { speechNotes: 'Asks questions back; genuinely wants to know.' },
  passionate: { speechNotes: 'Feels everything strongly; speaks with intensity.' },
  perfectionist: { formality: 'formal', speechNotes: 'Details matter; corrects gently, expects the best.' },
  driven: { speechNotes: 'Always moving toward a goal; impatient with drift.' },
  old_school: { speechNotes: 'Old ways, old values; skeptical of shortcuts and new fads.' },
  calculating: { warmth: 'cool', speechNotes: 'Measures every word; speaks in interests and outcomes.' },
  visionary: { speechNotes: 'Talks about the future as if it is already being built.' },
  sharp: { humor: 'dry', speechNotes: 'Precise, fast, no wasted words; sees the angle.' },
  street: { formality: 'street' },
};

const ROLE_VOICE: Record<string, Partial<NpcVoiceProfile>> = {
  store_owner: { register: 'plainspoken shop talk', topics: ['the shop', 'the neighborhood', 'regular customers', 'making a living'] },
  restaurant_owner: { register: 'warm kitchen talk', topics: ['food', 'regulars', 'the diner', 'family recipes'] },
  food_truck_owner: { register: 'warm street-vendor talk', topics: ['food', 'the route', 'customers', 'family'] },
  barber: { register: 'barbershop talk', topics: ['neighborhood news', 'everyone\'s business', 'sports', 'the shop'] },
  jazz_singer: { register: 'musical, soulful talk', topics: ['music', 'the lounge', 'the scene', 'late nights'] },
  police_officer: { register: 'plain official talk', topics: ['the beat', 'keeping order', 'the neighborhood'] },
  nurse: { register: 'tired professional talk', topics: ['the hospital', 'patients', 'long shifts', 'care'] },
  doctor: { register: 'calm professional talk', topics: ['health', 'patients', 'the clinic'] },
  promoter: { register: 'hype talk', topics: ['shows', 'the scene', 'connections', 'what is next'] },
  professor: { register: 'academic talk', topics: ['ideas', 'students', 'research', 'books'] },
  mechanic: { register: 'shop talk', topics: ['engines', 'cars', 'the garage', 'fixing things'] },
  elder: { register: 'storyteller talk', topics: ['old days', 'the community', 'lessons', 'stories'] },
  pastor: { register: 'scriptural cadence', topics: ['faith', 'the congregation', 'grace', 'community'] },
  nun: { register: 'gentle devotional talk', topics: ['service', 'the community', 'faith', 'the outreach'] },
  beautician: { register: 'salon talk', topics: ['clients', 'neighborhood news', 'care', 'confidence'] },
  corner_vendor: { register: 'quick street talk', topics: ['the corner', 'snacks', 'hustle', 'the neighborhood'] },
  teacher: { register: 'patient teacher talk', topics: ['students', 'school', 'learning', 'the kids'] },
  realtor: { register: 'sales talk', topics: ['houses', 'the market', 'closings', 'neighborhoods'] },
  high_school_coach: { register: 'coach talk', topics: ['the team', 'discipline', 'the game', 'young people'] },
  basketball_coach: { register: 'coach talk', topics: ['the team', 'the kids', 'the game', 'discipline'] },
  contractor: { register: 'builder talk', topics: ['building', 'the crew', 'the neighborhood', 'work'] },
  chef: { register: 'kitchen talk', topics: ['food', 'technique', 'the kitchen', 'craft'] },
  community_organizer: { register: 'organizer talk', topics: ['the youth', 'the initiative', 'the community', 'change'] },
  politician: { register: 'polished public talk', topics: ['the city', 'the market', 'plans', 'people'] },
  art_gallery_owner: { register: 'gallery talk', topics: ['art', 'artists', 'the gallery', 'ideas'] },
  farmer: { register: 'plain country talk', topics: ['the farm', 'the market', 'weather', 'work'] },
  lawyer: { register: 'precise legal talk', topics: ['cases', 'the firm', 'rights', 'the city'] },
  tech_ceo: { register: 'founder talk', topics: ['tech', 'building', 'the scene', 'the future'] },
};

const ROLE_CATCHPHRASES: Record<string, string[]> = {
  store_owner: ['Take your time, look around.'],
  barber: ['Now, I heard a thing or two...'],
  elder: ['Listen, child.'],
  pastor: ['Grace finds us where we are.'],
  beautician: ['Honey, sit down and tell me everything.'],
  mechanic: ['If it runs, I can fix it.'],
  teacher: ['Now, let us think this through.'],
  chef: ['Taste first. Then we talk.'],
  coach: ['Discipline first. Talent second.'],
  police_officer: ['Keep it clean out there.'],
};

export function deriveVoiceProfile(npc: NpcStaticData): NpcVoiceProfile {
  const profile: NpcVoiceProfile = {
    register: 'plain everyday talk',
    warmth: 'neutral',
    formality: 'plain',
    humor: 'none',
    catchphrases: [],
    topics: [],
    neverSay: ['As an AI', 'as a language model', 'I cannot help with that'],
    speechNotes: '',
  };
  const roleVoice = ROLE_VOICE[npc.role];
  if (roleVoice) {
    if (roleVoice.register) profile.register = roleVoice.register;
    if (roleVoice.topics) profile.topics = [...roleVoice.topics];
  }
  for (const trait of npc.personality ?? []) {
    const tv = TRAIT_VOICE[trait];
    if (!tv) continue;
    if (tv.warmth) profile.warmth = tv.warmth;
    if (tv.formality) profile.formality = tv.formality;
    if (tv.humor) profile.humor = tv.humor;
    if (tv.speechNotes) {
      profile.speechNotes = profile.speechNotes
        ? `${profile.speechNotes} ${tv.speechNotes}`
        : tv.speechNotes;
    }
  }
  const cps = ROLE_CATCHPHRASES[npc.role];
  if (cps) profile.catchphrases = [...cps];
  if (npc.description) {
    profile.topics.push(npc.description);
  }
  return profile;
}

/** Render a profile as the voice section of a reply system prompt. */
export function profilePromptBlock(npc: NpcStaticData, profile: NpcVoiceProfile): string {
  return [
    `You are ${npc.name}, a ${npc.role.replace(/_/g, ' ')} in ${npc.district.replace(/_/g, ' ')}, ${npc.city}.`,
    npc.description ? `About you: ${npc.description}` : '',
    `Voice: ${profile.register}. Warmth: ${profile.warmth}. Formality: ${profile.formality}. Humor: ${profile.humor}.`,
    profile.speechNotes ? `How you talk: ${profile.speechNotes}` : '',
    profile.catchphrases.length > 0
      ? `Phrases you sometimes use: ${profile.catchphrases.map((c) => `"${c}"`).join(' ')}`
      : '',
    profile.topics.length > 0 ? `Things you care about: ${profile.topics.join('; ')}.` : '',
    `Never say: ${profile.neverSay.join('; ')}.`,
  ]
    .filter(Boolean)
    .join('\n');
}
