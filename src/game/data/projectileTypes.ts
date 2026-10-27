export type ProjectileKind = "mr. 0-day" | "Spectre" | "Ransomware";
export type ProjectileSpecial = "impact" | "wave" | "infection";

export interface ProjectileSpec {
  kind: ProjectileKind;
  displayName: string;
  textureKey: string;
  color: number;
  accent: number;
  radius: number;
  density: number;
  baseDamage: number;
  impactMultiplier: number;
  special: ProjectileSpecial;
  description: string;
}

export const PROJECTILE_ORDER: ProjectileKind[] = [
  "mr. 0-day",
  "Spectre",
  "Ransomware",
];

export const PROJECTILE_SPECS: Record<ProjectileKind, ProjectileSpec> = {
  "mr. 0-day": {
    kind: "mr. 0-day",
    displayName: "mr. 0-day",
    textureKey: "projectile-mr-0day",
    color: 0xffb84d,
    accent: 0xffe5a4,
    radius: 29,
    density: 0.005,
    baseDamage: 16,
    impactMultiplier: 4.1,
    special: "impact",
    description: "тяжёлый пробой",
  },
  Spectre: {
    kind: "Spectre",
    displayName: "miss Spectre",
    textureKey: "projectile-spectre",
    color: 0xb78cff,
    accent: 0xe4d8ff,
    radius: 27,
    density: 0.0031,
    baseDamage: 11,
    impactMultiplier: 3.35,
    special: "wave",
    description: "волна по соседям",
  },
  Ransomware: {
    kind: "Ransomware",
    displayName: "The Ransom Guy",
    textureKey: "projectile-ransomware",
    color: 0xff6074,
    accent: 0xffc2cb,
    radius: 28,
    density: 0.0038,
    baseDamage: 13,
    impactMultiplier: 3.6,
    special: "infection",
    description: "заражение блоков",
  },
};
