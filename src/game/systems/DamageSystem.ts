import { PROJECTILE_SPECS, type ProjectileKind } from '../data/projectileTypes';

export class DamageSystem {
  calculateImpactDamage(kind: ProjectileKind, relativeSpeed: number, infected: boolean): number {
    const spec = PROJECTILE_SPECS[kind];
    const speedDamage = Math.max(0, relativeSpeed - 1.8) * spec.impactMultiplier;
    const infectionBonus = infected ? 12 : 0;
    return Math.max(2, spec.baseDamage * 0.38 + speedDamage + infectionBonus);
  }

  calculatePulseDamage(distance: number, radius: number, baseDamage: number): number {
    if (distance >= radius) return 0;
    return baseDamage * (1 - distance / radius);
  }
}
