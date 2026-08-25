import type { GameAction } from './game-engine.js';

export type TrackType = 'street' | 'drag' | 'circuit';

export interface RaceTrack {
  id: string;
  name: string;
  city: string;
  aliases: string[];
  region: string;
  type: TrackType;
  description: string;
  entryFee: number;
  prizePool: number;
  participants: number;
  laps: number;
  distance: number;
  heatRisk: number;
}

export interface RaceResult {
  success: boolean;
  placement: number;
  totalParticipants: number;
  performance: number;
  prize: number;
  entryFee: number;
  trackName: string;
  trackType: TrackType;
  vehicleWear: number;
  heatGained: number;
  skillXp: number;
  breakdown: boolean;
}

export const RACE_TRACKS: RaceTrack[] = [
  {
    id: 'memphis_river_drag',
    name: 'Riverfront Drag Strip',
    city: 'Memphis',
    aliases: ['memphis', 'mem'],
    region: 'Mid-South',
    type: 'drag',
    description: 'A quarter-mile stretch along the Mississippi riverbank. Short, loud, and unforgiving.',
    entryFee: 150,
    prizePool: 1200,
    participants: 6,
    laps: 1,
    distance: 0.25,
    heatRisk: 8,
  },
  {
    id: 'atlanta_circuit',
    name: 'Atlanta South Circuit',
    city: 'Atlanta',
    aliases: ['atlanta', 'atl'],
    region: 'Southeast',
    type: 'circuit',
    description: 'A technical road course threading through warehouse districts on the south side.',
    entryFee: 400,
    prizePool: 3500,
    participants: 8,
    laps: 3,
    distance: 1.8,
    heatRisk: 4,
  },
  {
    id: 'la_canyon_run',
    name: 'Canyon Midnight Run',
    city: 'Los Angeles',
    aliases: ['la', 'los angeles'],
    region: 'West',
    type: 'street',
    description: 'Winding canyon roads after dark. One mistake and you are hitting guardrail or worse.',
    entryFee: 650,
    prizePool: 5500,
    participants: 10,
    laps: 2,
    distance: 4.2,
    heatRisk: 14,
  },
  {
    id: 'miami_beach_sprint',
    name: 'Ocean Drive Sprint',
    city: 'Miami',
    aliases: ['miami', 'mia'],
    region: 'Southeast',
    type: 'street',
    description: 'A neon-lit sprint down the strip. Tourists and cops everywhere.',
    entryFee: 500,
    prizePool: 4000,
    participants: 8,
    laps: 2,
    distance: 2.0,
    heatRisk: 12,
  },
  {
    id: 'detroit_abandoned_lot',
    name: 'Abandoned Plant Lot',
    city: 'Detroit',
    aliases: ['detroit', 'det'],
    region: 'Midwest',
    type: 'circuit',
    description: 'A makeshift track carved through the skeleton of an old assembly plant.',
    entryFee: 250,
    prizePool: 2000,
    participants: 7,
    laps: 4,
    distance: 1.2,
    heatRisk: 6,
  },
  {
    id: 'houston_dragway',
    name: 'Houston Space City Dragway',
    city: 'Houston',
    aliases: ['houston', 'hou'],
    region: 'Southwest',
    type: 'drag',
    description: 'A sanctioned eighth-mile strip with sticky prep and serious horsepower.',
    entryFee: 300,
    prizePool: 2400,
    participants: 8,
    laps: 1,
    distance: 0.125,
    heatRisk: 2,
  },
  {
    id: 'chicago_underground',
    name: 'Lower Wacker Underground',
    city: 'Chicago',
    aliases: ['chicago', 'chi'],
    region: 'Midwest',
    type: 'street',
    description: 'The famous lower deck. Tight tunnels, unpredictable traction, zero visibility.',
    entryFee: 550,
    prizePool: 4800,
    participants: 9,
    laps: 3,
    distance: 1.6,
    heatRisk: 16,
  },
  {
    id: 'tokyo_highway_loop',
    name: 'Shuto Expressway Loop',
    city: 'Tokyo',
    aliases: ['tokyo', 'tok'],
    region: 'International',
    type: 'street',
    description: 'A high-stakes loop through the expressway system when the traffic thins.',
    entryFee: 800,
    prizePool: 7000,
    participants: 12,
    laps: 5,
    distance: 8.0,
    heatRisk: 18,
  },
  {
    id: 'dubai_palm_circuit',
    name: 'Palm Jumeirah Circuit',
    city: 'Dubai',
    aliases: ['dubai', 'dxb'],
    region: 'International',
    type: 'circuit',
    description: 'Dream money on the man-made island. Medical bills cost more than most engines.',
    entryFee: 2000,
    prizePool: 18000,
    participants: 10,
    laps: 4,
    distance: 5.0,
    heatRisk: 10,
  },
  {
    id: 'berlin_tempelhof',
    name: 'Tempelhof Runway',
    city: 'Berlin',
    aliases: ['berlin', 'ber'],
    region: 'International',
    type: 'drag',
    description: 'Straight-line racing on decommissioned airport tarmac. Fast and relatively safe.',
    entryFee: 350,
    prizePool: 2800,
    participants: 6,
    laps: 1,
    distance: 0.5,
    heatRisk: 3,
  },
];

const TYPE_BONUS: Record<string, number> = {
  sports: 16,
  luxury: 10,
  motorcycle: 12,
  car: 5,
  truck: -6,
  bike: -10,
};

const TRACK_TYPE_MOD: Record<TrackType, Record<string, number>> = {
  drag: { sports: 8, motorcycle: 6, luxury: 4, truck: -2 },
  circuit: { sports: 10, luxury: 6, motorcycle: 6, truck: -4 },
  street: { sports: 6, motorcycle: 8, luxury: 2, truck: -6 },
};

export class RacingService {
  listTracks(currentCity?: string): string {
    const byRegion: Record<string, RaceTrack[]> = {};
    for (const track of RACE_TRACKS) {
      if (!byRegion[track.region]) byRegion[track.region] = [];
      byRegion[track.region]!.push(track);
    }

    let message = '\u2022 **Race Tracks** — pick a track: `race <track name>`\n';
    for (const [region, tracks] of Object.entries(byRegion)) {
      message += `\n**${region}**\n`;
      for (const track of tracks) {
        const nearby = currentCity?.toLowerCase() === track.city.toLowerCase() ? ' [local]' : '';
        message += `\u2022 ${track.name} (${track.city}) — ${track.type.toUpperCase()} — Entry $${track.entryFee.toLocaleString()} — ${track.participants} racers${nearby}\n`;
        message += `  ${track.description}\n`;
      }
    }
    message += '\nUsage: `race <track name>` | `race list`\n';
    return message;
  }

  findTrack(query: string): RaceTrack | undefined {
    const q = query.toLowerCase().trim();
    if (!q || q === 'list') return undefined;

    // Prefer exact id, alias, city, or track name matches first
    const exact = RACE_TRACKS.find(
      (t) =>
        t.id === q ||
        t.aliases?.some(a => a.toLowerCase() === q) ||
        t.name.toLowerCase() === q ||
        t.city.toLowerCase() === q
    );
    if (exact) return exact;

    // Fall back to partial name/city match
    return RACE_TRACKS.find(
      (t) => t.name.toLowerCase().includes(q) || t.city.toLowerCase().includes(q)
    );
  }

  race(player: any, vehicle: any, trackInput: string): GameAction {
    const query = (trackInput || '').trim();
    if (!query || query.toLowerCase() === 'list') {
      return { success: true, message: this.listTracks(player.city) };
    }

    const track = this.findTrack(query);
    if (!track) {
      return { success: false, message: `No track matching "${query}". Type "race" to see available tracks.` };
    }

    if (!vehicle) {
      return { success: false, message: 'You need a vehicle to race. Buy one with "buy vehicle [type]".' };
    }

    if ((vehicle.condition || 0) < 15) {
      return { success: false, message: `${vehicle.name} is barely running (${vehicle.condition}% condition). Repair it before racing.` };
    }

    if (player.money < track.entryFee) {
      return { success: false, message: `The ${track.name} entry fee is $${track.entryFee.toLocaleString()}. You only have $${player.money.toFixed(2)}.` };
    }

    if ((player.energy || 0) < 15) {
      return { success: false, message: 'You are too tired to race. Sleep or rest first.' };
    }

    player.money -= track.entryFee;

    const drivingSkill = player.skills?.driving?.level || 1;
    const baseStat = this.calculatePerformance(vehicle, track, drivingSkill);
    const roll = (Math.random() * 40) - 20;
    const finalScore = baseStat + roll;

    const opponentScores: number[] = [];
    for (let i = 1; i < track.participants; i++) {
      opponentScores.push(45 + Math.random() * 40 + Math.random() * track.entryFee / 40);
    }
    opponentScores.push(finalScore);
    opponentScores.sort((a, b) => b - a);
    const placement = opponentScores.indexOf(finalScore) + 1;

    const prize = this.calculatePrize(placement, track);
    const wear = this.calculateWear(track, placement);
    const breakdown = Math.random() * 100 < (this.breakdownChance(vehicle, track) + (placement > 5 ? 5 : 0));

    vehicle.condition = Math.max(0, Math.min(100, (vehicle.condition || 100) - wear));
    vehicle.mileage = (vehicle.mileage || 0) + Math.round(track.distance * track.laps);

    const heatGained = track.heatRisk + (placement >= track.participants - 2 ? 3 : 0) + (breakdown ? 2 : 0);
    player.heat = (player.heat || 0) + heatGained;

    if (player.skills?.driving && player.skills.driving.xp !== undefined) {
      const xpGain = 15 + Math.max(0, track.participants - placement) * 5;
      player.skills.driving.xp += xpGain;
    }

    let message = `\u2022 **${track.name}** — ${placement}${this.ordinalSuffix(placement)} of ${track.participants}\n`;
    message += `Vehicle: ${vehicle.name} | Performance score: ${Math.round(finalScore)}\n`;

    if (breakdown) {
      vehicle.condition = Math.max(0, vehicle.condition - 20);
      message += `\u26a0\ufe0f Mid-race mechanical issue! Repairs will be needed.\n`;
    }

    if (placement === 1) {
      message += `\ud83c\udfc6 **FIRST PLACE!** You take home $${prize.toLocaleString()}.\n`;
      player.money += prize;
      player.reputation = player.reputation || {};
      player.reputation.social = (player.reputation.social || 0) + 5;
    } else if (placement <= 3) {
      message += `\ud83e\udd48 **Podium finish!** You earned $${prize.toLocaleString()}.\n`;
      player.money += prize;
    } else if (prize > 0) {
      message += `You placed ${placement}${this.ordinalSuffix(placement)} and earned $${prize.toLocaleString()}.\n`;
      player.money += prize;
    } else {
      message += `You finished ${placement}${this.ordinalSuffix(placement)}. No payout this time.\n`;
    }

    message += `Wear: -${Math.round(wear)}% condition | Heat: +${heatGained} | Driving XP gained.\n`;
    if (track.heatRisk > 5) {
      message += `\u26a0\ufe0f Street racing carries heat. Lay low if it gets too hot.\n`;
    }

    return {
      success: true,
      message,
      data: {
        placement,
        totalParticipants: track.participants,
        prize,
        entryFee: track.entryFee,
        track: track.name,
        vehicleWear: wear,
        heatGained,
        breakdown,
      },
    };
  }

  private calculatePerformance(vehicle: any, track: RaceTrack, drivingSkill: number): number {
    const conditionMod = (vehicle.condition || 100) * 0.35;
    const typeBase = TYPE_BONUS[vehicle.type?.toLowerCase()] || 0;
    const trackMod = TRACK_TYPE_MOD[track.type]?.[vehicle.type?.toLowerCase()] || 0;
    const skillMod = drivingSkill * 3;
    const cityFamiliarity = 2;
    return conditionMod + typeBase + trackMod + skillMod + cityFamiliarity;
  }

  private calculateWear(track: RaceTrack, placement: number): number {
    const baseWear = track.distance * track.laps * 0.8;
    const racingWear = track.type === 'street' ? 3 : track.type === 'circuit' ? 2 : 1;
    const finishBonus = placement <= 3 ? 0.7 : 1;
    return Math.max(1, baseWear * racingWear * finishBonus);
  }

  private breakdownChance(vehicle: any, track: RaceTrack): number {
    const baseRisk = Math.max(0, 100 - (vehicle.condition || 100)) * 0.4;
    const overheatRisk = track.type === 'street' ? 4 : 2;
    return Math.min(60, baseRisk + overheatRisk);
  }

  private calculatePrize(placement: number, track: RaceTrack): number {
    const pool = track.prizePool;
    if (placement === 1) return Math.floor(pool * 0.55);
    if (placement === 2) return Math.floor(pool * 0.25);
    if (placement === 3) return Math.floor(pool * 0.12);
    if (placement === 4) return Math.floor(pool * 0.05);
    return 0;
  }

  private ordinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || 'th';
  }
}
