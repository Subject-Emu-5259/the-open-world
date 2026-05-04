// THE OPEN WORLD - Save System
// LocalStorage-based save/load for Devvit

export interface SaveSlot {
  slot: number;
  playerName: string;
  timestamp: number;
  dayCount: number;
  money: number;
  city: string;
}

export async function saveGame(slot: number, playerName: string, player: any): Promise<void> {
  try {
    const saveKey = `theopenworld_save_${slot}`;
    const saveData = {
      ...player,
      savedAt: Date.now(),
      slot,
    };
    localStorage.setItem(saveKey, JSON.stringify(saveData));
    console.log(`[save] Saved to slot ${slot}: ${playerName}`);
  } catch (e) {
    console.error('[save] Failed to save:', e);
  }
}

export async function loadGame(slot: number): Promise<any | null> {
  try {
    const saveKey = `theopenworld_save_${slot}`;
    const data = localStorage.getItem(saveKey);
    if (!data) return null;
    const player = JSON.parse(data);
    console.log(`[save] Loaded from slot ${slot}: ${player.name}`);
    return player;
  } catch (e) {
    console.error('[save] Failed to load:', e);
    return null;
  }
}

export async function deleteSave(slot: number): Promise<void> {
  try {
    const saveKey = `theopenworld_save_${slot}`;
    localStorage.removeItem(saveKey);
    console.log(`[save] Deleted slot ${slot}`);
  } catch (e) {
    console.error('[save] Failed to delete:', e);
  }
}

export async function getAllSaves(): Promise<SaveSlot[]> {
  const saves: SaveSlot[] = [];
  for (let slot = 1; slot <= 3; slot++) {
    const saveKey = `theopenworld_save_${slot}`;
    const data = localStorage.getItem(saveKey);
    if (data) {
      try {
        const player = JSON.parse(data);
        saves.push({
          slot,
          playerName: player.name || 'Unknown',
          timestamp: player.savedAt || 0,
          dayCount: player.dayCount || 1,
          money: player.money || 0,
          city: player.city || 'west_memphis',
        });
      } catch (e) {
        saves.push({ slot, playerName: 'Corrupted', timestamp: 0, dayCount: 1, money: 0, city: 'west_memphis' });
      }
    }
  }
  return saves;
}

export function formatSaveInfo(save: SaveSlot): string {
  const date = save.timestamp ? new Date(save.timestamp).toLocaleString() : 'Unknown';
  return `[Slot ${save.slot}] ${save.playerName} | Day ${save.dayCount} | $${save.money?.toFixed(2) || '0.00'} | ${save.city} | ${date}`;
}
