// THE OPEN WORLD - Sports Mode
// Live game feeds and permanent stat tracking

export class SportsEngine {
  private playerStats: SportsStats;
  private gameHistory: GameResult[] = [];
  private currentSeason: SeasonData;
  
  constructor() {
    this.playerStats = this.initStats();
    this.currentSeason = {
      year: 2024,
      sport: 'basketball',
      gamesPlayed: 0,
      teamRecord: { wins: 0, losses: 0 },
    };
  }
  
  private initStats(): SportsStats {
    return {
      basketball: {
        career: { games: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, turnovers: 0 },
        season: { games: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, turnovers: 0 },
        daily: { points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, turnovers: 0, minutesPlayed: 0 },
        averages: { ppg: 0, apg: 0, rpg: 0, spg: 0, bpg: 0, topg: 0, mpg: 0 },
      },
      football: {
        career: { games: 0, touchdowns: 0, yards: 0, receptions: 0, tackles: 0, interceptions: 0 },
        season: { games: 0, touchdowns: 0, yards: 0, receptions: 0, tackles: 0, interceptions: 0 },
        daily: { touchdowns: 0, yards: 0, receptions: 0, tackles: 0, interceptions: 0, minutesPlayed: 0 },
        averages: { tdpg: 0, ypg: 0, recpg: 0, tacpg: 0, intpg: 0, mpg: 0 },
      },
    };
  }
  
  // Simulate a game and track stats
  simulateGame(sport: 'basketball' | 'football', playerSkill: number): GameResult {
    const result: GameResult = {
      id: `game_${Date.now()}`,
      sport,
      date: Date.now(),
      playerStats: {},
      teamScore: 0,
      opponentScore: 0,
      result: 'loss',
    };
    
    if (sport === 'basketball') {
      // Performance based on skill + randomness
      const skillFactor = playerSkill / 100;
      const randomFactor = Math.random();
      const performance = (skillFactor * 0.6 + randomFactor * 0.4);
      
      result.playerStats = {
        points: Math.floor(performance * 30 + Math.random() * 10),
        assists: Math.floor(performance * 8 + Math.random() * 4),
        rebounds: Math.floor(performance * 10 + Math.random() * 5),
        steals: Math.floor(performance * 3 + Math.random() * 2),
        blocks: Math.floor(performance * 2 + Math.random() * 2),
        turnovers: Math.floor((1 - performance) * 5 + Math.random() * 2),
        minutesPlayed: Math.floor(25 + performance * 15),
      };
      
      result.teamScore = Math.floor(85 + performance * 20 + Math.random() * 15);
      result.opponentScore = Math.floor(85 + Math.random() * 25);
    }
    
    result.result = result.teamScore > result.opponentScore ? 'win' : 'loss';
    
    // Update stats
    this.updateStats(sport, result.playerStats);
    this.gameHistory.push(result);
    this.currentSeason.gamesPlayed++;
    if (result.result === 'win') this.currentSeason.teamRecord.wins++;
    else this.currentSeason.teamRecord.losses++;
    
    return result;
  }
  
  private updateStats(sport: string, gameStats: Record<string, number>): void {
    if (sport === 'basketball') {
      const bb = this.playerStats.basketball;
      
      // Daily
      bb.daily = { ...gameStats };
      
      // Season
      const seasonGames = (bb.season.games ?? 0) + 1;
      bb.season.games = seasonGames;
      (['points', 'assists', 'rebounds', 'steals', 'blocks', 'turnovers'] as const).forEach(stat => {
        bb.season[stat] = (bb.season[stat] ?? 0) + (gameStats[stat] ?? 0);
      });
      
      // Career
      const careerGames = (bb.career.games ?? 0) + 1;
      bb.career.games = careerGames;
      (['points', 'assists', 'rebounds', 'steals', 'blocks', 'turnovers'] as const).forEach(stat => {
        bb.career[stat] = (bb.career[stat] ?? 0) + (gameStats[stat] ?? 0);
      });
      
      // Averages
      if (seasonGames > 0) {
        bb.averages.ppg = Math.round((bb.season.points ?? 0) / seasonGames * 10) / 10;
        bb.averages.apg = Math.round((bb.season.assists ?? 0) / seasonGames * 10) / 10;
        bb.averages.rpg = Math.round((bb.season.rebounds ?? 0) / seasonGames * 10) / 10;
        bb.averages.spg = Math.round((bb.season.steals ?? 0) / seasonGames * 10) / 10;
        bb.averages.bpg = Math.round((bb.season.blocks ?? 0) / seasonGames * 10) / 10;
        bb.averages.topg = Math.round((bb.season.turnovers ?? 0) / seasonGames * 10) / 10;
        bb.averages.mpg = Math.round((bb.season.minutesPlayed ?? 0) / seasonGames * 10) / 10;
      }
    }
  }
  
  // Get stat report
  getStatReport(sport: 'basketball' | 'football'): StatReport {
    const stats = this.playerStats[sport];
    return {
      daily: stats.daily,
      season: stats.season,
      career: stats.career,
      averages: stats.averages,
      seasonRecord: `${this.currentSeason.teamRecord.wins}-${this.currentSeason.teamRecord.losses}`,
      gamesPlayed: this.currentSeason.gamesPlayed,
    };
  }
  
  // Get game history
  getGameHistory(limit: number = 10): GameResult[] {
    return this.gameHistory.slice(-limit).reverse();
  }
}

export interface SportsStats {
  basketball: SportStats;
  football: SportStats;
}

export interface SportStats {
  career: Record<string, number>;
  season: Record<string, number>;
  daily: Record<string, number>;
  averages: Record<string, number>;
}

export interface GameResult {
  id: string;
  sport: string;
  date: number;
  playerStats: Record<string, number>;
  teamScore: number;
  opponentScore: number;
  result: 'win' | 'loss';
}

export interface SeasonData {
  year: number;
  sport: string;
  gamesPlayed: number;
  teamRecord: { wins: number; losses: number };
}

export interface StatReport {
  daily: Record<string, number>;
  season: Record<string, number>;
  career: Record<string, number>;
  averages: Record<string, number>;
  seasonRecord: string;
  gamesPlayed: number;
}
