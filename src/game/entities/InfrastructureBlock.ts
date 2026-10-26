import Phaser from "phaser";
import type { BlockDefinition } from "../data/towerLayout";
import { PHYSICS } from "../constants";
import { drawInkBlock, INK } from "../rendering/ArtFactory";

/**
 * Blocks are drawn procedurally instead of using stretched textures: every
 * contour keeps the same ink weight whatever the block size, which is what
 * makes the tower read like the single drawing in the reference.
 */
export class InfrastructureBlock {
  readonly body: MatterJS.BodyType;
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly maxHealth: number;
  health: number;
  infected = false;
  destroyed = false;
  readonly definition: BlockDefinition;
  private readonly seed: number;

  constructor(
    private readonly scene: Phaser.Scene,
    definition: BlockDefinition,
  ) {
    this.definition = definition;
    this.maxHealth = definition.health;
    this.health = definition.health;
    this.seed = definition.id
      .split("")
      .reduce((total, char) => total + char.charCodeAt(0), 7);

    this.body = scene.matter.add.rectangle(
      definition.x,
      definition.y,
      definition.width,
      definition.height,
      {
        label: `target:${definition.id}`,
        friction: PHYSICS.defaultFriction,
        frictionStatic: PHYSICS.defaultStaticFriction,
        restitution: PHYSICS.defaultRestitution,
        density: PHYSICS.bodyDensity,
        chamfer: {
          radius: Math.min(
            6,
            Math.min(definition.width, definition.height) / 4,
          ),
        },
      },
    );
    scene.matter.body.setStatic(this.body, true);

    this.graphics = scene.add
      .graphics({ x: definition.x, y: definition.y })
      .setDepth(12);
    this.redraw();
  }

  sync(): void {
    if (this.destroyed) return;
    this.graphics.setPosition(this.body.position.x, this.body.position.y);
    this.graphics.setRotation(this.body.angle);
  }

  damage(amount: number): boolean {
    if (this.destroyed || amount <= 0) return false;
    const before = this.damageStage;
    this.health = Math.max(0, this.health - amount);
    if (this.damageStage !== before) this.redraw();
    return this.health <= 0;
  }

  infect(): void {
    if (this.destroyed || this.infected) return;
    this.infected = true;
    this.redraw();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.matter.world.remove(this.body);
    this.graphics.destroy();
  }

  get centerX(): number {
    return this.body.position.x;
  }

  get centerY(): number {
    return this.body.position.y;
  }

  /** 0 healthy, 1 damaged, 2 critical — used only to avoid needless redraws. */
  private get damageStage(): number {
    const ratio = this.health / this.maxHealth;
    if (ratio <= 0.3) return 2;
    if (ratio <= 0.58) return 1;
    return 0;
  }

  private get fill(): number {
    if (this.infected) return INK.infected;
    switch (this.damageStage) {
      case 2:
        return INK.critical;
      case 1:
        return INK.damage;
      default:
        return this.definition.kind === "platform"
          ? INK.fillStrong
          : this.definition.kind === "server"
            ? INK.fill
            : INK.fillLight;
    }
  }

  private redraw(): void {
    this.graphics.clear();
    drawInkBlock(
      this.graphics,
      this.definition.width,
      this.definition.height,
      this.seed,
      this.fill,
    );
  }
}
