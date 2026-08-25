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
}

export type MaintenanceType = 'oil' | 'tires' | 'brakes' | 'tuneup' | 'wash';

const MAINTENANCE_TASKS: Record<MaintenanceType, { label: string; baseMiles: number; costPct: number; conditionGain: number }> = {
  oil: { label: 'Oil change', baseMiles: 3000, costPct: 0.005, conditionGain: 2 },
  tires: { label: 'Tire rotation & alignment', baseMiles: 5000, costPct: 0.01, conditionGain: 4 },
  brakes: { label: 'Brake service', baseMiles: 8000, costPct: 0.015, conditionGain: 6 },
  tuneup: { label: 'Engine tune-up', baseMiles: 10000, costPct: 0.025, conditionGain: 12 },
  wash: { label: 'Full detail & wash', baseMiles: 1500, costPct: 0.002, conditionGain: 1 },
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
    const lines = [
      `🚗 **${vehicle.name}** (${vehicle.type})`,
      `Condition: ${vehicle.condition}%`,
      `Mileage: ${vehicle.mileage.toLocaleString()} mi`,
      `Current value: $${Math.floor(this.currentValue(vehicle)).toLocaleString()}`,
      `Breakdown risk: ${risk}%`,
      `Next service: ${nextService}`,
      `Last service: ${Math.max(0, Math.floor((Date.now() - (vehicle.lastService || 0)) / 86400000))} days ago`,
    ];
    return lines.join('\n');
  }

  currentValue(vehicle: Vehicle): number {
    const ageFactor = Math.max(0.2, 1 - Math.floor(vehicle.mileage / 50000) * 0.05);
    return Math.floor(vehicle.value * (vehicle.condition / 100) * ageFactor);
  }

  breakdownRisk(vehicle: Vehicle): number {
    const conditionRisk = Math.max(0, (100 - vehicle.condition) * 0.6);
    const dueRisk = this.overdueServices(vehicle).length * 5;
    return Math.min(85, Math.floor(conditionRisk + dueRisk));
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

  applyWear(vehicle: Vehicle, distance: number): void {
    vehicle.mileage = (vehicle.mileage || 0) + Math.round(distance);
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
    const cost = Math.floor(vehicle.value * 0.12);
    return { happened: true, message: `💥 Engine overheated badly. Major repair needed before the next trip — $${cost.toLocaleString()}.`, cost };
  }

  inspect(name: string, player: PlayerState): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };
    return { success: true, message: this.describeStatus(vehicle) };
  }

  service(name: string, player: PlayerState, type?: string): GameAction {
    const vehicle = this.findVehicle(player, name);
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : "You don't own any vehicles." };

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
    const missingCondition = 100 - vehicle.condition;
    if (missingCondition <= 0) return { success: true, message: `${vehicle.name} is already in perfect condition.` };
    const costPerPoint = Math.floor(vehicle.value * 0.002);
    const cost = Math.max(50, Math.floor(costPerPoint * missingCondition));
    if (player.money < cost) {
      return { success: false, message: `Full repair for ${vehicle.name} costs $${cost.toLocaleString()}. You have $${player.money.toFixed(2)}.` };
    }
    player.money -= cost;
    vehicle.condition = 100;
    vehicle.lastService = Date.now();
    return { success: true, message: `🛠️ ${vehicle.name} fully repaired for $${cost.toLocaleString()}. Condition restored to 100%.` };
  }

  serviceMenu(): string {
    const lines = Object.entries(MAINTENANCE_TASKS).map(([key, task]) => {
      return `• ${key}: ${task.label} — ~${Math.round(task.costPct * 100)}% of vehicle value, +${task.conditionGain}% condition`;
    });
    return lines.join('\n');
  }
}
