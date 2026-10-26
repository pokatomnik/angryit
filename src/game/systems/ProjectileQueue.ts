import { PROJECTILE_ORDER, type ProjectileKind } from '../data/projectileTypes';

export class ProjectileQueue {
  private cursor = 0;

  take(): ProjectileKind {
    const kind = this.peek(0);
    this.cursor += 1;
    return kind;
  }

  peek(offset = 0): ProjectileKind {
    return PROJECTILE_ORDER[(this.cursor + offset) % PROJECTILE_ORDER.length];
  }

  peekMany(count: number): ProjectileKind[] {
    return Array.from({ length: count }, (_, index) => this.peek(index));
  }

  reset(): void {
    this.cursor = 0;
  }
}
