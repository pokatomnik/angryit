import Phaser from "phaser";
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  PHYSICS,
  SLINGSHOT,
  WORLD_BOTTOM,
} from "../constants";
import { InfrastructureBlock } from "../entities/InfrastructureBlock";
import { Slingshot } from "../entities/Slingshot";
import { VulnerabilityProjectile } from "../entities/VulnerabilityProjectile";
import { PROJECTILE_SPECS, type ProjectileKind } from "../data/projectileTypes";
import { MEME_REFERENCE, TOWER_LAYOUT } from "../data/towerLayout";
import { drawPaperFrame, INK } from "../rendering/ArtFactory";
import { DamageSystem } from "../systems/DamageSystem";
import { ProjectileQueue } from "../systems/ProjectileQueue";

interface DebrisPiece {
  body: MatterJS.BodyType;
  image: Phaser.GameObjects.Rectangle;
  age: number;
}

/** Contact tolerances for deciding whether a block still rests on something. */
const SUPPORT_GAP = 5;
const SUPPORT_PENETRATION = 3;
const TOWER_CENTER_X = MEME_REFERENCE.originX + 130 * MEME_REFERENCE.scale;

export class GameScene extends Phaser.Scene {
  private readonly queue = new ProjectileQueue();
  private readonly damageSystem = new DamageSystem();
  private readonly blocks: InfrastructureBlock[] = [];
  private readonly blockByBodyId = new Map<number, InfrastructureBlock>();
  private readonly blockByDefinitionId = new Map<string, InfrastructureBlock>();
  private readonly supportsByBlockId = new Map<string, string[]>();
  private readonly projectiles: VulnerabilityProjectile[] = [];
  private readonly projectileByBodyId = new Map<
    number,
    VulnerabilityProjectile
  >();
  private readonly debris: DebrisPiece[] = [];
  private readonly queueLabels: Phaser.GameObjects.GameObject[] = [];
  private slingshot!: Slingshot;
  private currentProjectile: VulnerabilityProjectile | null = null;
  private isAiming = false;
  private shotsFired = 0;
  private initialHealth = 0;
  private integrityText!: Phaser.GameObjects.Text;
  private integrityGraphics!: Phaser.GameObjects.Graphics;
  private shotsText!: Phaser.GameObjects.Text;
  private currentHint!: Phaser.GameObjects.Text;
  private hasLaunched = false;
  private towerAwake = false;
  private gameOver = false;
  private debrisCleanupTimer = 0;
  private nextProjectileTimer = 0;
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private queueDisplay!: Phaser.GameObjects.Graphics;
  private readonly handleRestartKey = (): void => {
    this.scene.restart();
  };

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.gameOver = false;
    this.isAiming = false;
    this.hasLaunched = false;
    this.towerAwake = false;
    this.shotsFired = 0;
    this.initialHealth = 0;
    this.debrisCleanupTimer = 0;
    this.nextProjectileTimer = 0;
    this.currentProjectile = null;
    this.queueLabels.length = 0;
    this.overlayObjects = [];
    this.blocks.length = 0;
    this.projectiles.length = 0;
    this.debris.length = 0;
    this.blockByBodyId.clear();
    this.blockByDefinitionId.clear();
    this.supportsByBlockId.clear();
    this.projectileByBodyId.clear();
    this.queue.reset();
    this.drawBackdrop();
    this.createGround();
    this.createTower();
    this.slingshot = new Slingshot(this);
    this.createHud();
    this.spawnNextProjectile();

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("pointerupoutside", this.handlePointerUp, this);
    this.input.keyboard?.on("keydown-R", this.handleRestartKey);
    this.matter.world.on("collisionstart", this.handleCollisionStart, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off("collisionstart", this.handleCollisionStart, this);
      this.input.off("pointerdown", this.handlePointerDown, this);
      this.input.off("pointermove", this.handlePointerMove, this);
      this.input.off("pointerup", this.handlePointerUp, this);
      this.input.off("pointerupoutside", this.handlePointerUp, this);
      this.input.keyboard?.off("keydown-R", this.handleRestartKey);
    });
  }

  update(_time: number, delta: number): void {
    for (const block of this.blocks) {
      if (block.destroyed) continue;
      block.sync();
      if (block.centerY > WORLD_BOTTOM) {
        this.destroyBlock(block, false);
      }
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      if (projectile.destroyed) continue;
      projectile.sync(delta);
      if (
        projectile.body.position.y > WORLD_BOTTOM ||
        projectile.restingTime > 2600 ||
        projectile.flightAge > 10000
      ) {
        this.removeProjectile(projectile);
      }
    }

    this.updateDebris(delta);
    this.updateShotFlow(delta);
    this.updateHud();

    if (!this.gameOver && this.blocks.every((block) => block.destroyed)) {
      this.showEndOverlay(true);
    }
  }

  private drawBackdrop(): void {
    const background = this.add.graphics().setDepth(-30);
    background.fillStyle(COLORS.background, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cell = 24;
    background.lineStyle(1, COLORS.grid, 0.48);
    for (let x = 0; x <= GAME_WIDTH; x += cell) {
      background.lineBetween(x, 0, x, GROUND_Y);
    }
    for (let y = 0; y < GROUND_Y; y += cell) {
      background.lineBetween(0, y, GAME_WIDTH, y);
    }
    background.lineStyle(1.5, 0xc78b87, 0.5);
    background.lineBetween(22, 0, 22, GROUND_Y);

    // Keep the physical contact edge level; the shading below it gives the
    // illusion that the notebook page bends away into a folded paper lip.
    const ground = this.add.graphics().setDepth(-5);
    const foldHeight = GAME_HEIGHT - GROUND_Y;
    for (let row = 0; row < foldHeight; row += 1) {
      const t = row / foldHeight;
      const light = Math.exp(-Math.pow((t - 0.19) / 0.16, 2));
      const shadow = Math.exp(-t * 13) * 34 + t * 17;
      const shade = Math.round(238 + light * 14 - shadow);
      ground.fillStyle(Phaser.Display.Color.GetColor(shade, shade - 3, shade - 12), 1);
      ground.fillRect(0, GROUND_Y + row, GAME_WIDTH, 1);
    }
    ground.lineStyle(1, 0x8c8573, 0.55);
    ground.lineBetween(0, GROUND_Y, GAME_WIDTH, GROUND_Y);
    ground.lineStyle(1, 0xffffff, 0.75);
    ground.lineBetween(0, GROUND_Y + 3, GAME_WIDTH, GROUND_Y + 3);
    ground.lineStyle(1, COLORS.grid, 0.23);
    for (let x = 0; x <= GAME_WIDTH; x += cell) {
      const line = new Phaser.Curves.Path(x, GROUND_Y);
      line.cubicBezierTo(x + 7, GAME_HEIGHT, x - 2, GROUND_Y + 18, x + 6, GROUND_Y + 37);
      line.draw(ground, 20);
    }
    for (const y of [GROUND_Y + 18, GROUND_Y + 43, GAME_HEIGHT - 3]) {
      ground.lineBetween(0, y, GAME_WIDTH, y);
    }

    this.add
      .text(37, 27, "ANGRY", {
        resolution: 3,
        fontFamily: "Arial, sans-serif",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#30383c",
        letterSpacing: 1,
      })
      .setDepth(90);
    this.add
      .text(152, 27, "IT", {
        resolution: 3,
        fontFamily: "Arial, sans-serif",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#356478",
        letterSpacing: 1,
      })
      .setDepth(90);
    this.add
      .text(40, 65, "SECURITY IS A STRUCTURAL PROBLEM", {
        resolution: 3,
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#687778",
        letterSpacing: 1.7,
      })
      .setDepth(90);

    // The whole drawing lives on one paper sheet, exactly like the source
    // image: ink lines and grey washes on white, with the notebook UI around it.
    const panel = MEME_REFERENCE.panel;
    const sheet = this.add.graphics().setDepth(-8);
    sheet.fillStyle(0x57503d, 0.12);
    sheet.fillRoundedRect(
      panel.x + 6,
      panel.y + 8,
      panel.width,
      panel.height,
      4,
    );
    drawPaperFrame(sheet, panel.x, panel.y, panel.width, panel.height);

    // The caption is part of the joke and must stay.
    const titleX = MEME_REFERENCE.originX + 138 * MEME_REFERENCE.scale;
    this.add
      .text(titleX, panel.y + 15, "ALL MODERN DIGITAL", {
        resolution: 3,
        fontFamily: "Comic Sans MS, Chalkboard SE, Segoe Print, cursive",
        fontSize: "20px",
        color: "#1b1b1b",
        letterSpacing: 0.2,
      })
      .setOrigin(0.5, 0)
      .setDepth(4);
    this.add
      .text(titleX, panel.y + 38, "INFRASTRUCTURE", {
        resolution: 3,
        fontFamily: "Comic Sans MS, Chalkboard SE, Segoe Print, cursive",
        fontSize: "20px",
        color: "#1b1b1b",
        letterSpacing: 0.4,
      })
      .setOrigin(0.5, 0)
      .setDepth(4);

    const titleBracket = this.add.graphics().setDepth(3);
    this.drawBrace(
      titleBracket,
      MEME_REFERENCE.originX + 46 * MEME_REFERENCE.scale,
      MEME_REFERENCE.originX + 220 * MEME_REFERENCE.scale,
      MEME_REFERENCE.originY + 67 * MEME_REFERENCE.scale,
      MEME_REFERENCE.originY + 90 * MEME_REFERENCE.scale,
    );
  }

  /** The curly brace under the caption, drawn as a shallow hand-sketched arc. */
  private drawBrace(
    graphics: Phaser.GameObjects.Graphics,
    left: number,
    right: number,
    top: number,
    bottom: number,
  ): void {
    const center = (left + right) / 2;
    const curve = new Phaser.Curves.Path(left, bottom);
    curve.cubicBezierTo(center - 16, top + 2, left, top - 5, left + 5, top);
    curve.cubicBezierTo(center, top - 7, center - 3, top + 2, center - 2, top - 3);
    curve.cubicBezierTo(center + 16, top + 2, center + 2, top - 3, center + 3, top + 2);
    curve.cubicBezierTo(right, bottom, right - 5, top, right, top - 5);
    graphics.lineStyle(1.8, INK.ink, 0.95);
    curve.draw(graphics, 64);
  }

  private createGround(): void {
    this.matter.add.rectangle(
      GAME_WIDTH / 2,
      GROUND_Y + 46,
      GAME_WIDTH + 220,
      92,
      {
        isStatic: true,
        label: "ground",
        friction: PHYSICS.defaultFriction,
        frictionStatic: PHYSICS.defaultStaticFriction,
        restitution: 0.04,
      },
    );
    this.matter.add.rectangle(-48, GAME_HEIGHT / 2, 96, GAME_HEIGHT * 2, {
      isStatic: true,
      label: "left-world-wall",
      friction: 0.8,
    });
    this.matter.add.rectangle(
      GAME_WIDTH + 48,
      GAME_HEIGHT / 2,
      96,
      GAME_HEIGHT * 2,
      {
        isStatic: true,
        label: "right-world-wall",
        friction: 0.8,
      },
    );
  }

  private createTower(): void {
    for (const definition of TOWER_LAYOUT) {
      const block = new InfrastructureBlock(this, definition);
      this.blocks.push(block);
      this.blockByBodyId.set(block.body.id, block);
      this.blockByDefinitionId.set(block.definition.id, block);
      this.initialHealth += block.maxHealth;
      this.supportsByBlockId.set(block.definition.id, []);
    }
  }

  /**
   * Recomputes, from the live bodies, which blocks are still carried by
   * something below them. Tolerances are deliberately tight: a block counts
   * as resting on another only when the gap is essentially closed. A loose
   * heuristic here was what let a knocked-out support leave the tower hanging.
   */
  private rebuildSupports(): void {
    const bodies = this.blocks.filter((block) => !block.destroyed);
    for (const candidate of bodies) {
      const bottom = candidate.body.bounds.max.y;
      const supports: string[] = [];
      for (const support of bodies) {
        if (support === candidate) continue;
        if (support.body.bounds.max.y <= bottom + SUPPORT_GAP) continue;

        const overlap =
          Math.min(candidate.body.bounds.max.x, support.body.bounds.max.x) -
          Math.max(candidate.body.bounds.min.x, support.body.bounds.min.x);
        if (overlap < Math.min(4, candidate.definition.width * 0.25)) continue;

        const gap = support.body.bounds.min.y - bottom;
        if (gap > SUPPORT_GAP || gap < -SUPPORT_PENETRATION) continue;
        supports.push(support.definition.id);
      }
      this.supportsByBlockId.set(candidate.definition.id, supports);
    }
  }

  private wakeTower(): void {
    if (this.towerAwake) return;
    this.towerAwake = true;
    for (const block of this.blocks) {
      if (block.destroyed) continue;
      this.matter.body.setStatic(block.body, false);
      this.matter.body.setVelocity(block.body, { x: 0, y: 0 });
      this.matter.body.setAngularVelocity(block.body, 0);
      block.body.isSleeping = false;
    }
    this.matter.world.engine.enableSleeping = false;
  }

  private createHud(): void {
    const panels = this.add.graphics().setDepth(80);
    panels.fillStyle(0xfffcf2, 0.9);
    panels.lineStyle(1, 0xaaa995, 0.9);
    panels.fillRoundedRect(30, 111, 306, 130, 14);
    panels.strokeRoundedRect(30, 111, 306, 130, 14);
    panels.fillStyle(0xfffcf2, 0.9);
    panels.fillRoundedRect(927, 25, 322, 84, 14);
    panels.strokeRoundedRect(927, 25, 322, 84, 14);
    panels.fillStyle(0xfffcf2, 0.84);
    panels.fillRoundedRect(32, 274, 286, 66, 12);
    panels.strokeRoundedRect(32, 274, 286, 66, 12);

    this.add
      .text(49, 126, "УЯЗВИМОСТИ В ОЧЕРЕДИ", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#687778",
        letterSpacing: 1.5,
      })
      .setDepth(90);

    this.queueDisplay = this.add.graphics().setDepth(83);
    this.integrityGraphics = this.add.graphics().setDepth(84);
    this.integrityText = this.add
      .text(1228, 65, "100%", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#30383c",
      })
      .setOrigin(1, 0)
      .setDepth(90);
    this.add
      .text(948, 45, "СТРУКТУРНАЯ ЦЕЛОСТНОСТЬ", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#586b73",
        letterSpacing: 1,
      })
      .setDepth(90);
    this.integrityGraphics.fillStyle(0xd8ddcf, 1);
    this.integrityGraphics.fillRoundedRect(948, 78, 205, 8, 4);
    this.add
      .text(947, 92, "ЦЕЛЬ: ОБРУШИТЬ БАШНЮ", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#707b78",
        letterSpacing: 1,
      })
      .setDepth(90);
    this.add
      .text(47, 289, "ЦЕЛЬСЯ В ОПОРЫ", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#343f43",
        letterSpacing: 1,
      })
      .setDepth(90);
    this.currentHint = this.add
      .text(47, 311, "Тяни влево-вниз и отпускай", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "11px",
        color: "#59696c",
      })
      .setDepth(90);

    this.shotsText = this.add
      .text(1070, 128, "ВЫСТРЕЛЫ  0", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#627376",
        letterSpacing: 1,
      })
      .setOrigin(1, 0)
      .setDepth(90);

    const restart = this.add
      .rectangle(1175, 136, 112, 34, 0xe6e8db, 1)
      .setStrokeStyle(1, 0x9ca998, 1)
      .setDepth(88);
    restart.setInteractive({ useHandCursor: true });
    restart.on("pointerover", () => restart.setFillStyle(0xd4dfd4, 1));
    restart.on("pointerout", () => restart.setFillStyle(0xe6e8db, 1));
    restart.on("pointerdown", () => this.scene.restart());
    this.add
      .text(1175, 136, "↻  RESTART", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#3c535e",
        letterSpacing: 0.7,
      })
      .setOrigin(0.5)
      .setDepth(90);

    this.drawQueue();
    this.drawIntegrity();
  }

  private drawQueue(): void {
    this.queueDisplay.clear();
    for (const label of this.queueLabels) label.destroy();
    this.queueLabels.length = 0;

    const kinds: ProjectileKind[] = this.currentProjectile
      ? [this.currentProjectile.kind, ...this.queue.peekMany(2)]
      : this.queue.peekMany(3);
    kinds.forEach((kind, index) => {
      const spec = PROJECTILE_SPECS[kind];
      const x = 45 + index * 94;
      const y = 155;
      const current = index === 0;
      this.queueDisplay.fillStyle(
        current ? spec.color : 0xe8e9de,
        current ? 0.17 : 0.85,
      );
      this.queueDisplay.fillRoundedRect(x, y, 87, 68, 10);
      this.queueDisplay.lineStyle(
        current ? 2 : 1,
        current ? spec.color : 0xb4bcae,
        current ? 0.9 : 0.7,
      );
      this.queueDisplay.strokeRoundedRect(x, y, 87, 68, 10);

      const icon = this.add
        .image(x + 21, y + 23, spec.textureKey)
        .setDisplaySize(27, 27)
        .setDepth(89);
      const label = this.add
        .text(x + 40, y + 17, spec.shortLabel, {
          resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "9px",
          fontStyle: "bold",
          color: current ? "#30383c" : "#586a71",
        })
        .setOrigin(0, 0.5)
        .setDepth(90);
      const subtitle = this.add
        .text(x + 40, y + 34, current ? "СЕЙЧАС" : "ДАЛЕЕ", {
          resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "8px",
          fontStyle: "bold",
          color: current ? "#394f59" : "#738081",
          letterSpacing: 0.6,
        })
        .setOrigin(0, 0.5)
        .setDepth(90);
      this.queueLabels.push(icon, label, subtitle);
    });
  }

  private drawIntegrity(): void {
    const ratio =
      this.initialHealth > 0 ? this.remainingHealth / this.initialHealth : 1;
    const color =
      ratio > 0.58 ? 0x6c9274 : ratio > 0.28 ? 0xc59942 : 0xc36c58;
    this.integrityGraphics.clear();
    this.integrityGraphics.fillStyle(0xd8ddcf, 1);
    this.integrityGraphics.fillRoundedRect(948, 78, 205, 8, 4);
    this.integrityGraphics.fillStyle(color, 1);
    this.integrityGraphics.fillRoundedRect(
      948,
      78,
      Math.max(2, 205 * ratio),
      8,
      4,
    );
    this.integrityText.setText(`${Math.round(ratio * 100)}%`);
  }

  private get remainingHealth(): number {
    return this.blocks.reduce(
      (total, block) => total + (block.destroyed ? 0 : block.health),
      0,
    );
  }

  private spawnNextProjectile(): void {
    const kind = this.queue.take();
    const projectile = new VulnerabilityProjectile(
      this,
      kind,
      this.slingshot.anchor.x,
      this.slingshot.anchor.y,
    );
    this.currentProjectile = projectile;
    projectile.image.setInteractive({ useHandCursor: true });
    projectile.image.on("pointerdown", this.handlePointerDown, this);
    this.projectiles.push(projectile);
    this.projectileByBodyId.set(projectile.body.id, projectile);
    this.slingshot.drawBand(projectile.image.x, projectile.image.y, false);
    this.drawQueue();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (
      this.gameOver ||
      !this.currentProjectile ||
      this.currentProjectile.launched
    )
      return;
    const position = this.pointerWorldPosition(pointer);
    const distance = Phaser.Math.Distance.Between(
      position.x,
      position.y,
      this.currentProjectile.image.x,
      this.currentProjectile.image.y,
    );
    const nearSling = position.x < 345 && position.y > 410;
    if (distance > this.currentProjectile.spec.radius * 3.4 && !nearSling)
      return;
    this.isAiming = true;
    this.currentHint.setText("Тяни влево-вниз — отпусти для запуска вверх");
    this.moveProjectileTo(position.x, position.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isAiming || this.gameOver) return;
    const position = this.pointerWorldPosition(pointer);
    this.moveProjectileTo(position.x, position.y);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    const projectile = this.currentProjectile;
    if (!this.isAiming || this.gameOver || !projectile) return;
    this.isAiming = false;
    const position = this.pointerWorldPosition(pointer);
    this.moveProjectileTo(position.x, position.y);
    const dx = this.slingshot.anchor.x - projectile.image.x;
    const dy = this.slingshot.anchor.y - projectile.image.y;
    const pull = Math.hypot(dx, dy);

    this.slingshot.clearTrajectory();
    if (pull < 4) {
      projectile.setPosition(this.slingshot.anchor.x, this.slingshot.anchor.y);
      this.slingshot.drawBand(projectile.image.x, projectile.image.y, false);
      this.currentHint.setText("Потяни снаряд назад и отпусти");
      return;
    }

    const velocityX = Math.max(8, dx * SLINGSHOT.launchPower);
    const velocityY = dy * SLINGSHOT.launchPower;
    this.wakeTower();
    projectile.launch(velocityX, velocityY);
    this.slingshot.drawBand(projectile.image.x, projectile.image.y, false);
    this.slingshot.clearTrajectory();
    this.hasLaunched = true;
    this.shotsFired += 1;
    this.nextProjectileTimer = 0;
    this.currentHint.setText("Снаряд запущен — целься в опоры");
    this.shotsText.setText(`ВЫСТРЕЛЫ  ${this.shotsFired}`);
    this.currentProjectile = null;
    this.drawQueue();
  }

  private moveProjectileTo(pointerX: number, pointerY: number): void {
    const projectile = this.currentProjectile;
    if (!projectile) return;
    // A target is always on the right, so the pouch can only be pulled behind
    // the fork. This also prevents an accidental backward launch.
    const dx = Math.min(pointerX - this.slingshot.anchor.x, -6);
    const dy = Math.max(pointerY - this.slingshot.anchor.y, 0);
    const length = Math.hypot(dx, dy);
    const scale = length > SLINGSHOT.maxPull ? SLINGSHOT.maxPull / length : 1;
    const x = this.slingshot.anchor.x + dx * scale;
    const y = this.slingshot.anchor.y + dy * scale;
    projectile.setPosition(x, y);
    this.slingshot.drawBand(x, y, true);

    const launchX = (this.slingshot.anchor.x - x) * SLINGSHOT.launchPower;
    const launchY = (this.slingshot.anchor.y - y) * SLINGSHOT.launchPower;
    this.slingshot.drawTrajectory(x, y, launchX, launchY);
  }

  private pointerWorldPosition(
    pointer: Phaser.Input.Pointer,
  ): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
  }

  private updateShotFlow(delta: number): void {
    if (this.currentProjectile || !this.hasLaunched || this.gameOver) return;
    this.nextProjectileTimer += delta;
    const lastProjectile = [...this.projectiles]
      .reverse()
      .find((projectile) => projectile.launched && !projectile.destroyed);
    const settled =
      !lastProjectile ||
      lastProjectile.restingTime > 720 ||
      lastProjectile.flightAge > 3300;
    if (settled && this.nextProjectileTimer > 300) {
      this.hasLaunched = false;
      this.spawnNextProjectile();
    }
  }

  private handleCollisionStart(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ): void {
    for (const pair of event.pairs) {
      const blockA = this.blockByBodyId.get(pair.bodyA.id);
      const blockB = this.blockByBodyId.get(pair.bodyB.id);
      const projectileA = this.projectileByBodyId.get(pair.bodyA.id);
      const projectileB = this.projectileByBodyId.get(pair.bodyB.id);
      const block = blockA ?? blockB;
      const projectile = projectileA ?? projectileB;
      if (!block || !projectile || projectile.destroyed || block.destroyed)
        continue;

      const speed = Math.hypot(
        pair.bodyA.velocity.x - pair.bodyB.velocity.x,
        pair.bodyA.velocity.y - pair.bodyB.velocity.y,
      );
      this.wakeTower();
      const damage = this.damageSystem.calculateImpactDamage(
        projectile.kind,
        speed,
        block.infected,
      );
      this.damageBlock(block, damage, projectile.spec.color);
      this.createImpactEffect(
        block.centerX,
        block.centerY,
        projectile.spec.color,
        1,
      );

      if (!projectile.specialTriggered) {
        projectile.specialTriggered = true;
        this.triggerSpecial(projectile.kind, block);
      }
    }
  }

  private triggerSpecial(
    kind: ProjectileKind,
    struckBlock: InfrastructureBlock,
  ): void {
    if (kind === "mr. 0-day") return;
    const radius = kind === "Spectre" ? 156 : 132;
    const color = PROJECTILE_SPECS[kind].color;
    this.createPulse(struckBlock.centerX, struckBlock.centerY, radius, color);

    for (const candidate of this.blocks) {
      if (candidate.destroyed || candidate === struckBlock) continue;
      const distance = Phaser.Math.Distance.Between(
        struckBlock.centerX,
        struckBlock.centerY,
        candidate.centerX,
        candidate.centerY,
      );
      if (distance >= radius) continue;
      const falloff = 1 - distance / radius;
      if (kind === "Spectre") {
        const pulseDamage = this.damageSystem.calculatePulseDamage(
          distance,
          radius,
          25,
        );
        this.damageBlock(candidate, pulseDamage, color);
      } else {
        candidate.infect();
        this.damageBlock(candidate, 7 + 10 * falloff, color);
      }
    }
  }

  private damageBlock(
    block: InfrastructureBlock,
    damage: number,
    color: number,
  ): void {
    if (block.destroyed) return;
    if (block.damage(damage)) {
      this.destroyBlock(block, true, color);
    } else {
      this.createImpactEffect(block.centerX, block.centerY, color, 0.45);
    }
  }

  private destroyBlock(
    block: InfrastructureBlock,
    makeDebris: boolean,
    color = COLORS.server,
  ): void {
    if (block.destroyed) return;
    const x = block.centerX;
    const y = block.centerY;
    if (makeDebris) this.createDebris(block, color);
    block.destroy();
    this.blockByBodyId.delete(block.body.id);
    if (this.towerAwake) {
      for (const remaining of this.blocks) {
        if (!remaining.destroyed) remaining.body.isSleeping = false;
      }
      this.collapseUnsupportedBlocks();
    }
    this.createImpactEffect(x, y, color, 1.2);
    this.drawIntegrity();
  }

  private collapseUnsupportedBlocks(): void {
    this.rebuildSupports();

    const grounded = new Set<string>();
    for (const block of this.blocks) {
      if (block.destroyed) continue;
      if (block.body.bounds.max.y >= GROUND_Y - SUPPORT_GAP) {
        grounded.add(block.definition.id);
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of this.blocks) {
        const candidateId = candidate.definition.id;
        if (candidate.destroyed || grounded.has(candidateId)) continue;
        const supports = this.supportsByBlockId.get(candidateId) ?? [];
        if (supports.some((supportId) => grounded.has(supportId))) {
          grounded.add(candidateId);
          changed = true;
        }
      }
    }

    for (const candidate of this.blocks) {
      if (candidate.destroyed || grounded.has(candidate.definition.id))
        continue;
      const body = candidate.body;
      body.isSleeping = false;
      // An unsupported piece is left to gravity instead of being teleported:
      // it tips over its own bottom edge, which is what makes the collapse
      // look like something falling rather than blocks blinking downward.
      this.matter.body.setStatic(body, false);
      this.matter.body.setAngularVelocity(
        body,
        body.angularVelocity +
          Phaser.Math.FloatBetween(-0.02, 0.02) +
          (body.position.x < TOWER_CENTER_X ? -0.012 : 0.012),
      );
    }
  }

  private createDebris(block: InfrastructureBlock, color: number): void {
    const x = block.centerX;
    const y = block.centerY;
    const count = Phaser.Math.Clamp(
      Math.round((block.definition.width * block.definition.height) / 2200),
      3,
      7,
    );
    for (let index = 0; index < count; index += 1) {
      const width = Phaser.Math.Between(12, 24);
      const height = Phaser.Math.Between(9, 20);
      const offsetX = Phaser.Math.Between(
        -block.definition.width / 3,
        block.definition.width / 3,
      );
      const offsetY = Phaser.Math.Between(
        -block.definition.height / 3,
        block.definition.height / 3,
      );
      const image = this.add
        .rectangle(x + offsetX, y + offsetY, width, height, color, 1)
        .setStrokeStyle(2, COLORS.ink, 0.8)
        .setDepth(16);
      const body = this.matter.add.rectangle(
        x + offsetX,
        y + offsetY,
        width,
        height,
        {
          label: "debris",
          density: 0.0014,
          friction: 0.5,
          restitution: 0.18,
        },
      );
      this.matter.body.setVelocity(body, {
        x: Phaser.Math.Between(-5, 5),
        y: Phaser.Math.Between(-8, 1),
      });
      this.matter.body.setAngularVelocity(
        body,
        Phaser.Math.FloatBetween(-0.14, 0.14),
      );
      this.debris.push({ body, image, age: 0 });
    }
  }

  private updateDebris(delta: number): void {
    this.debrisCleanupTimer += delta;
    for (let index = this.debris.length - 1; index >= 0; index -= 1) {
      const piece = this.debris[index];
      piece.age += delta;
      piece.image.setPosition(piece.body.position.x, piece.body.position.y);
      piece.image.setRotation(piece.body.angle);
      if (piece.age > 2800 || piece.body.position.y > WORLD_BOTTOM) {
        this.matter.world.remove(piece.body);
        piece.image.destroy();
        this.debris.splice(index, 1);
      }
    }

    if (this.debrisCleanupTimer > 8000) {
      this.debrisCleanupTimer = 0;
      while (this.debris.length > 80) {
        const piece = this.debris.shift();
        if (!piece) break;
        this.matter.world.remove(piece.body);
        piece.image.destroy();
      }
    }
  }

  private removeProjectile(projectile: VulnerabilityProjectile): void {
    if (projectile.destroyed) return;
    projectile.destroy();
    this.projectileByBodyId.delete(projectile.body.id);
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) this.projectiles.splice(index, 1);
  }

  private createImpactEffect(
    x: number,
    y: number,
    color: number,
    strength: number,
  ): void {
    const count = Math.round(4 + strength * 4);
    for (let index = 0; index < count; index += 1) {
      const angle =
        (Math.PI * 2 * index) / count + Phaser.Math.FloatBetween(-0.25, 0.25);
      const distance = Phaser.Math.Between(18, 58) * strength;
      const particle = this.add
        .circle(x, y, Phaser.Math.Between(2, 4), color, 0.9)
        .setDepth(55);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.15,
        duration: Phaser.Math.Between(260, 470),
        ease: "Cubic.Out",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createPulse(
    x: number,
    y: number,
    radius: number,
    color: number,
  ): void {
    const ring = this.add
      .circle(x, y, 31, color, 0)
      .setStrokeStyle(3, color, 0.85)
      .setDepth(53);
    this.tweens.add({
      targets: ring,
      scale: radius / 31,
      alpha: 0,
      duration: 440,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });
  }

  private updateHud(): void {
    const ratio =
      this.initialHealth > 0 ? this.remainingHealth / this.initialHealth : 1;
    const rounded = `${Math.round(ratio * 100)}%`;
    if (this.integrityText.text !== rounded) this.drawIntegrity();
  }

  private showEndOverlay(won: boolean): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.isAiming = false;
    this.slingshot.clearTrajectory();
    this.overlayObjects.forEach((object) => object.destroy());
    this.overlayObjects = [];

    const shade = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x585747,
        0.76,
      )
      .setDepth(150);
    const card = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 470, 270, 0xfffcf2, 1)
      .setStrokeStyle(2, won ? COLORS.cyan : COLORS.amber, 0.9)
      .setDepth(151);
    const eyebrow = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 77,
        won ? "INFRASTRUCTURE OFFLINE" : "СЕССИЯ ЗАВЕРШЕНА",
        {
          resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: won ? "#356478" : "#ffb84d",
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(152);
    const title = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 29,
        won ? "БАШНЯ РАЗРУШЕНА" : "ПОПРОБУЙ ЕЩЁ",
        {
          resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "27px",
          fontStyle: "900",
          color: "#30383c",
          letterSpacing: 0.4,
        },
      )
      .setOrigin(0.5)
      .setDepth(152);
    const copy = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 20,
        won
          ? `Цифровая инфраструктура выведена из строя за ${this.shotsFired} выстрелов.`
          : "Перезапусти уровень и попробуй новую траекторию.",
        {
          resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          color: "#59696c",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(152);
    const button = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 86, 190, 46, 0x466e77, 1)
      .setStrokeStyle(1, 0x5fe4e8, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(152);
    button.on("pointerover", () => button.setFillStyle(0x567e86, 1));
    button.on("pointerout", () => button.setFillStyle(0x466e77, 1));
    button.on("pointerdown", () => this.scene.restart());
    const buttonLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 86, "НОВАЯ ПОПЫТКА", {
        resolution: 3,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(153);
    this.overlayObjects = [
      shade,
      card,
      eyebrow,
      title,
      copy,
      button,
      buttonLabel,
    ];
  }
}
