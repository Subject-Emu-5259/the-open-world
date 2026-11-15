// Character backgrounds — single source of truth shared by the server
// (applyBackground) and the client (character-creation labels). Labels
// MUST be generated from this table, never hardcoded separately: the
// v0.108.10 client labels promised the wrong bonuses (e.g. Working Class
// "+craftsmanship" while the server granted fitness +5).

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
  // v0.108.20: bonuses use ONLY top-level engine stats (fitness,
  // intelligence, charisma, energy) — applyBackground applies a bonus
  // only when `bonus.stat in player`.
  { id: 'service_industry', name: 'Service Industry', startingMoney: 500, bonuses: [{ stat: 'charisma', value: 5 }], description: 'Tables, tips, and regulars. People skills.' },
  { id: 'immigrant', name: 'Immigrant', startingMoney: 200, bonuses: [{ stat: 'charisma', value: 3 }, { stat: 'intelligence', value: 3 }], description: 'New city, fresh start. Resourceful.' },
  { id: 'veteran', name: 'Veteran', startingMoney: 600, bonuses: [{ stat: 'fitness', value: 5 }, { stat: 'energy', value: 5 }], description: 'Service done. Discipline kept.' },
  { id: 'first_gen', name: 'First Generation', startingMoney: 150, bonuses: [{ stat: 'intelligence', value: 5 }], description: 'First in the family to chase more. Book smart, hungry.' },
];

// Human-readable bonus list, e.g. "fitness +5, energy +10".
export function formatBonuses(bg: BackgroundConfig): string {
  return bg.bonuses.map((b) => `${b.stat} +${b.value}`).join(', ');
}
