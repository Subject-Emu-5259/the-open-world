import type { PlayerState, GameAction } from './game-engine.js';

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  value: number;
  condition: number;
  mileage: number;
  purchasedAt: number;
  lastService: number;
  services: Record<string, number>;
  fuel?: number;
  fuelCap?: number;
  mpg?: number;
  registered?: boolean;
  registrationExpiry?: number;
  inspected?: boolean;
  inspectionExpiry?: number;
  modifications?: string[];
  immobilized?: boolean;
}

export type MaintenanceType = 'oil' | 'tires' | 'brakes' | 'tuneup' | 'wash';
export type ModType = 'tint' | 'spoiler' | 'exhaust' | 'suspension' | 'paint' | 'rims' | 'turbo' | 'stereo';

const MAINTENANCE_TASKS: Record<MaintenanceType, { label: string; baseMiles: number; costPct: number; conditionGain: number }> = {
  oil: { label: 'Oil change', baseMiles: 3000, costPct: 0.005, conditionGain: 2 },
  tires: { label: 'Tire rotation & alignment', baseMiles: 5000, costPct: 0.01, conditionGain: 4 },
  brakes: { label: 'Brake service', baseMiles: 8000, costPct: 0.015, conditionGain: 6 },
  tuneup: { label: 'Engine tune-up', baseMiles: 10000, costPct: 0.025, conditionGain: 12 },
  wash: { label: 'Full detail & wash', baseMiles: 1500, costPct: 0.002, conditionGain: 1 },
};

const MODS: Record<ModType, { label: string; price: number; conditionGain: number; valueBoost: number }> = {
  tint: { label: 'Window tint', price: 250, conditionGain: 0, valueBoost: 0.01 },
  spoiler: { label: 'Rear spoiler', price: 600, conditionGain: 0, valueBoost: 0.02 },
  exhaust: { label: 'Performance exhaust', price: 900, conditionGain: 0, valueBoost: 0.04 },
  suspension: { label: 'Sport suspension', price: 1400, conditionGain: 1, valueBoost: 0.05 },
  paint: { label: 'Custom paint', price: 1100, conditionGain: 1, valueBoost: 0.03 },
  rims: { label: 'Rim upgrade', price: 1200, conditionGain: 1, valueBoost: 0.04 },
  turbo: { label: 'Turbo kit', price: 3500, conditionGain: 0, valueBoost: 0.12 },
  stereo: { label: 'Premium stereo', price: 600, conditionGain: 0, valueBoost: 0.02 },
};

export class VehicleService {
  findVehicle(player: PlayerState, name?: string): Vehicle | undefined {
    const vehicles = player.vehicles;
    if (!vehicles || vehicles.length === 0) return undefined;
    if (!name) return vehicles[0] as Vehicle;
    return vehicles.find((v: any) =>
      (v.name || '').toLowerCase().includes(name.toLowerCase()) ||
      (v.type || '').toLowerCase().includes(name.toLowerCase())
    ) as Vehicle | undefined;
  }

  describeStatus(vehicle: Vehicle): string {
    const risk = this.breakdownRisk(vehicle);
    const overdue = this.overdueServices(vehicle);
    const nextService = overdue.length ? overdue[0]!.label : 'All caught up';
    const fuelLine = (vehicle.fuelCap ?? 0) > 0
      ? `Fuel: ${Math.round((vehicle.fuel ?? 0) / vehicle.fuelCap! * 100)}% (${Math.round(vehicle.fuel ?? 0)}/${vehicle.fuelCap} gal)`
      : 'Fuel: n/a';
    const regLine = `Registration: ${this.registrationStatus(vehicle)}`;
    const inspLine = `Inspection: ${this.inspectionStatus(vehicle)}`;
    const legal = this.isRoadLegal(vehicle) ? 'Road legal ✅' : 'Not road legal ⚠️';
    const immobilized = vehicle.immobilized ? '\n🚨 IMMOBILIZED — needs tow, repair, or registration release.' : '';
    const modLine = (vehicle.modifications && vehicle.modifications.length > 0)
      ? `Mods: ${vehicle.modifications.join(', ')}`
      : 'Mods: none';
    const lines = [
      `🚗 **${vehicle.name}** (${vehicle.type})`,
      `Condition: ${vehicle.condition}%`,
      fuelLine,
      `Mileage: ${vehicle.mileage.toLocaleString()} mi`,
      `Current value: $${Math.floor(this.currentValue(vehicle)).toLocaleString()}`,
      `Breakdown risk: ${risk}%`,
      `Impound risk: ${this.impoundRisk(vehicle)}%`,
      regLine,
      inspLine,
      legal,
      `Next service: ${nextService}`,
      `Last service: ${Math.max(0, Math.floor((Date.now() - (vehicle.lastService || 0)) / 86400000))} days ago`,
      modLine,
    ];
    return lines.filter(Boolean).join('\n') + immobilized;
  }

  currentValue(vehicle: Vehicle): number {
    const ageFactor = Math.max(0.2, 1 - Math.floor(vehicle.mileage / 50000) * 0.05);
    const modFactor = 1 + ((vehicle.modifications?.length ?? 0) * 0.02);
    return Math.floor(vehicle.value * (vehicle.condition / 100) * ageFactor * modFactor);
  }

  breakdownRisk(vehicle: Vehicle): number {
    const conditionRisk = Math.max(0, (100 - vehicle.condition) * 0.6);
    const dueRisk = this.overdueServices(vehicle).length * 5;
    const fuelRisk = ((vehicle.fuelCap ?? 0) > 0 && (vehicle.fuel ?? 0) <= 0) ? 25 : 0;
    return Math.min(85, Math.floor(conditionRisk + dueRisk + fuelRisk));
  }

  impoundRisk(vehicle: Vehicle): number {
    if ((vehicle.fuelCap ?? 0) === 0) return 0;
    if (!vehicle.registered || !vehicle.inspected) return 40;
    const now = Date.now();
    const regExpired = now > (vehicle.registrationExpiry ?? 0);
    const inspExpired = now > (vehicle.inspectionExpiry ?? 0);
    if (regExpired || inspExpired) return 25;
    return 0;
  }

  overdueServices(vehicle: Vehicle): { key: MaintenanceType; label: string; milesOver: number }[] {
    const overdue: { key: MaintenanceType; label: string; milesOver: number }[] = [];
    for (const key of Object.keys(MAINTENANCE_TASKS) as MaintenanceType[]) {
      const task = MAINTENANCE_TASKS[key];
      const milesSince = vehicle.mileage - (vehicle.services?.[`_${key}_mileage`] ?? 0);
      if (milesSince > task.baseMiles) {
        overdue.push({ key, label: task.label, milesOver: milesSince - task.baseMiles });
      }
    }
    overdue.sort((a, b) => b.milesOver - a.milesOver);
    return overdue;
  }

  registrationStatus(vehicle: Vehicle): string {
    if ((vehicle.fuelCap ?? 0) === 0) return 'Pedal power, no registration needed';
    if (!vehicle.registered) return 'Unregistered — risk of impound';
    const expired = Date.now() > (vehicle.registrationExpiry ?? 0);
    return expired ? 'Expired — renew with "register [name]"' : `Valid until ${new Date(vehicle.registrationExpiry ?? Date.now()).toISOString().split('T')[0]}`;
  }

  inspectionStatus(vehicle: Vehicle): string {
    if ((vehicle.fuelCap ?? 0) === 0) return 'Pedal power, no inspection needed';
    if (!vehicle.inspected) return 'Not inspected — risk of impound';
    const expired = Date.now() > (vehicle.inspectionExpiry ?? 0);
    return expired ? 'Expired — renew with "register [name]"' : `Valid until ${new Date(vehicle.inspectionExpiry ?? Date.now()).toISOString().split('T')[0]}`;
  }

  isRoadLegal(vehicle: Vehicle): boolean {
    if ((vehicle.fuelCap ?? 0) === 0) return true;
    const now = Date.now();
    return !!(vehicle.registered && vehicle.inspected && now <= (vehicle.registrationExpiry ?? 0) && now <= (vehicle.inspectionExpiry ?? 0) && !vehicle.immobilized);
  }

  applyWear(vehicle: Vehicle, distance: number): void {
    vehicle.mileage = (vehicle.mileage || 0) + Math.round(distance);
    const fuelCap = vehicle.fuelCap ?? 0;
    if (fuelCap > 0) {
      const gallonsUsed = distance / Math.max(1, vehicle.mpg ?? 20);
      vehicle.fuel = Math.max(0, (vehicle.fuel ?? fuelCap) - gallonsUsed);
      if ((vehicle.fuel ?? 0) <= 0) vehicle.immobilized = true;
    }
    const wearRate = distance * (0.00002 + (this.overdueServices(vehicle).length * 0.00001));
    vehicle.condition = Math.max(0, Math.min(100, (vehicle.condition || 100) - wearRate));
  }

  attemptBreakdown(vehicle: Vehicle): { happened: boolean; message: string; cost?: number } {
    const risk = this.breakdownRisk(vehicle);
    const roll = Math.random() * 100;
    if (roll >= risk) return { happened: false, message: '' };
    const severity = Math.random();
    if (severity < 0.4) {
      vehicle.condition = Math.max(0, vehicle.condition - 8);
      return { happened: true, message: '🚨 Your vehicle stalled on the shoulder. A quick jump got you moving, but the battery is aging.', cost: 0 };
    }
    if (severity < 0.75) {
      vehicle.condition = Math.max(0, vehicle.condition - 15);
      const cost = Math.floor(vehicle.value * 0.04);
      return { happened: true, message: `🔧 A belt snapped during the drive. Roadside repair cost $${cost.toLocaleString()}.`, cost };
    }
    vehicle.condition = Math.max(0, vehicle.condition - 25);
    vehicle.immobilized = true;
    const cost = Math.floor(vehicle.value * 0.12);
    return { happened: true, message: `💥 Engine overheated badly. Vehicle immobilized. Major repair needed — $${cost.toLocaleString()}.`, cost };
  }

  inspect(name: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    return { success: true, message: this.describeStatus(vehicle) };
  }

  service(name: string, player: PlayerState, type?: string): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    if ((vehicle.fuelCap ?? 0) > 0 && vehicle.immobilized) {
      return { success: false, message: `${vehicle.name} is immobilized. Use "tow ${vehicle.name}" to a lot, or "repair vehicle ${vehicle.name}" if condition is low.` };
    }

    if (!type || type.toLowerCase() === 'auto') {
      const overdue = this.overdueServices(vehicle);
      if (overdue.length === 0) {
        return { success: true, message: `${vehicle.name} is in good shape. Nothing is currently due. Try a specific service if you want.` };
      }
      type = overdue[0]!.key;
    }

    const key = type.toLowerCase() as MaintenanceType;
    const task = MAINTENANCE_TASKS[key];
    if (!task) {
      const options = Object.entries(MAINTENANCE_TASKS).map(([k, v]) => `${k}: ${v.label} (+${v.conditionGain}% condition)`).join(', ');
      return { success: false, message: `Unknown service "${type}". Available: ${options}` };
    }

    const cost = Math.floor(vehicle.value * task.costPct);
    if (player.money < cost) {
      return { success: false, message: `${task.label} for ${vehicle.name} costs $${cost.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    }

    player.money -= cost;
    if (!vehicle.services) vehicle.services = {};
    vehicle.services[key] = Date.now();
    vehicle.services![`_${key}_mileage`] = vehicle.mileage;
    vehicle.condition = Math.min(100, vehicle.condition + task.conditionGain);
    vehicle.lastService = Date.now();
    return { success: true, message: `🔧 ${task.label} completed on ${vehicle.name} for $${cost.toLocaleString()}. Condition improved to ${vehicle.condition}%.` };
  }

  maintain(name: string, player: PlayerState): GameAction {
    return this.service(name, player, 'oil');
  }

  repair(name: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };

    if (vehicle.immobilized && vehicle.condition <= 0) {
      return { success: false, message: `${vehicle.name} is immobilized and undrivable. Use "tow ${vehicle.name}" first.` };
    }

    const missingCondition = 100 - vehicle.condition;
    if (missingCondition <= 0) {
      vehicle.immobilized = false;
      return { success: true, message: `${vehicle.name} is already in perfect condition.` };
    }
    const costPerPoint = Math.floor(vehicle.value * 0.002);
    const cost = Math.max(50, Math.floor(costPerPoint * missingCondition));
    if (player.money < cost) {
      return { success: false, message: `Full repair for ${vehicle.name} costs $${cost.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    }
    player.money -= cost;
    vehicle.condition = 100;
    vehicle.immobilized = false;
    vehicle.lastService = Date.now();
    return { success: true, message: `🛠️ ${vehicle.name} fully repaired for $${cost.toLocaleString()}. Condition restored to 100%.` };
  }

  fuel(name: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    if ((vehicle.fuelCap ?? 0) === 0) return { success: false, message: `${vehicle.name} doesn't use fuel.` };
    if ((vehicle.immobilized ?? false) && (vehicle.condition ?? 100) <= 0) {
      return { success: false, message: `${vehicle.name} is too damaged. Repair or tow it first.` };
    }
    const pricePerGallon = 3.5;
    const gallonsNeeded = vehicle.fuelCap! - (vehicle.fuel ?? 0);
    if (gallonsNeeded <= 0.1) return { success: true, message: `⛽ ${vehicle.name} is already full.` };
    const cost = Math.floor(gallonsNeeded * pricePerGallon);
    if (player.money < cost) return { success: false, message: `Refuel for ${vehicle.name} costs $${cost.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    player.money -= cost;
    vehicle.fuel = vehicle.fuelCap!;
    const skill = player.skills?.driving;
    if (skill) skill.xp += 2;
    return { success: true, message: `⛽ Fueled ${vehicle.name} for $${cost.toLocaleString()}. Tank is now ${Math.round(vehicle.fuel! / vehicle.fuelCap! * 100)}% full.${skill ? ' +2 driving XP' : ''}` };
  }

  register(name: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    if ((vehicle.fuelCap ?? 0) === 0) return { success: false, message: `${vehicle.name} doesn't need registration.` };
    const cost = Math.floor(vehicle.value * 0.015) + 75;
    if (player.money < cost) return { success: false, message: `Registration + inspection for ${vehicle.name} costs $${cost.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    player.money -= cost;
    vehicle.registered = true;
    vehicle.registrationExpiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
    vehicle.inspected = true;
    vehicle.inspectionExpiry = vehicle.registrationExpiry;
    vehicle.immobilized = false;
    return { success: true, message: `📋 ${vehicle.name} registered and inspected for $${cost.toLocaleString()}. Valid for 365 days.` };
  }

  customize(name: string, mod: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    if ((vehicle.fuelCap ?? 0) === 0) return { success: false, message: `${vehicle.name} is a bicycle — it can't be tuned at a shop.` };

    if (!mod) {
      const modList = Object.entries(MODS).map(([key, m]) => `• ${key}: ${m.label} — $${m.price.toLocaleString()}`).join('\n');
      return { success: true, message: `🔧 Available mods for ${vehicle.name}:\n${modList}` };
    }
    const key = mod.toLowerCase() as ModType;
    const entry = MODS[key];
    if (!entry) {
      const available = Object.keys(MODS).join(', ');
      return { success: false, message: `Unknown mod "${mod}". Available: ${available}` };
    }
    if (vehicle.modifications?.includes(entry.label)) return { success: false, message: `${vehicle.name} already has ${entry.label}.` };
    if (player.money < entry.price) return { success: false, message: `${entry.label} for ${vehicle.name} costs $${entry.price.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    player.money -= entry.price;
    if (!vehicle.modifications) vehicle.modifications = [];
    vehicle.modifications.push(entry.label);
    vehicle.value = Math.floor(vehicle.value * (1 + entry.valueBoost));
    vehicle.condition = Math.min(100, vehicle.condition + entry.conditionGain);
    return { success: true, message: `🔧 Installed ${entry.label} on ${vehicle.name} for $${entry.price.toLocaleString()}. Value boosted to $${Math.floor(this.currentValue(vehicle)).toLocaleString()}.` };
  }

  emergencyTow(name: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    if ((vehicle.fuelCap ?? 0) === 0) return { success: false, message: `You can carry ${vehicle.name} yourself.` };
    if (!vehicle.immobilized) return { success: false, message: `${vehicle.name} isn't immobilized. Use "repair vehicle ${vehicle.name}" if condition is low.` };
    const cost = Math.max(150, Math.floor(vehicle.value * 0.01));
    if (player.money < cost) return { success: false, message: `Tow service for ${vehicle.name} costs $${cost.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    player.money -= cost;
    vehicle.immobilized = false;
    vehicle.condition = Math.max(10, vehicle.condition);
    vehicle.fuel = Math.max(vehicle.fuel ?? 0, 1);
    return { success: true, message: `🚗 ${vehicle.name} towed to a mechanic lot for $${cost.toLocaleString()}. Refuel, register, or repair before driving.` };
  }

  serviceMenu(): string {
    const lines = Object.entries(MAINTENANCE_TASKS).map(([key, task]) => {
      return `• ${key}: ${task.label} — ~${Math.round(task.costPct * 100)}% of vehicle value, +${task.conditionGain}% condition`;
    });
    return lines.join('\n');
  }
}
