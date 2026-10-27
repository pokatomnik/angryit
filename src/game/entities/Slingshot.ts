import Phaser from "phaser";
import { COLORS, GROUND_Y, PHYSICS, SLINGSHOT } from "../constants";

export class Slingshot {
  readonly anchor = new Phaser.Math.Vector2(SLINGSHOT.x, SLINGSHOT.y);
  private readonly forkY = SLINGSHOT.y - 74;
  private readonly junctionY = SLINGSHOT.y - 25;
  private readonly leftFork = new Phaser.Math.Vector2(
    SLINGSHOT.x - 44,
    this.forkY,
  );
  private readonly rightFork = new Phaser.Math.Vector2(
    SLINGSHOT.x + 44,
    this.forkY,
  );
  private readonly frameGraphics: Phaser.GameObjects.Graphics;
  private readonly bandGraphics: Phaser.GameObjects.Graphics;
  private readonly trajectoryGraphics: Phaser.GameObjects.Graphics;

  private returnTween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.frameGraphics = scene.add.graphics().setDepth(15);
    this.bandGraphics = scene.add.graphics().setDepth(20);
    this.trajectoryGraphics = scene.add.graphics().setDepth(18);
    this.drawFrame();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.returnTween?.stop();
      this.returnTween = undefined;
    });
  }

  drawBand(projectileX: number, projectileY: number, stretched: boolean): void {
    this.returnTween?.stop();
    this.returnTween = undefined;
    this.renderBand(projectileX, projectileY, stretched);
  }

  release(projectileX: number, projectileY: number): void {
    this.returnTween?.stop();
    const pouch = { x: projectileX, y: projectileY };
    this.returnTween = this.scene.tweens.add({
      targets: pouch,
      x: this.anchor.x,
      y: this.anchor.y,
      duration: 220,
      ease: "Back.Out",
      onUpdate: () => this.renderBand(pouch.x, pouch.y, false),
      onComplete: () => {
        this.returnTween = undefined;
        this.renderBand(this.anchor.x, this.anchor.y, false);
      },
    });
  }

  private renderBand(
    projectileX: number,
    projectileY: number,
    stretched: boolean,
  ): void {
    const g = this.bandGraphics;
    g.clear();

    g.lineStyle(stretched ? 9 : 6, COLORS.ink, 1);
    g.lineBetween(this.leftFork.x, this.leftFork.y, projectileX, projectileY);
    g.lineBetween(this.rightFork.x, this.rightFork.y, projectileX, projectileY);
    g.lineStyle(stretched ? 5 : 3, 0x824c39, 1);
    g.lineBetween(this.leftFork.x, this.leftFork.y, projectileX, projectileY);
    g.lineBetween(this.rightFork.x, this.rightFork.y, projectileX, projectileY);

    g.fillStyle(0x8d5a45, 1);
    g.fillEllipse(projectileX, projectileY, 34, 18);
    g.lineStyle(3, COLORS.ink, 1);
    g.strokeEllipse(projectileX, projectileY, 34, 18);
  }

  drawTrajectory(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
  ): void {
    const g = this.trajectoryGraphics;
    g.clear();
    if (velocityX <= 0) return;

    for (let frame = 4; frame <= 62; frame += 4) {
      const px = x + velocityX * frame;
      const gravityPerFrame = PHYSICS.gravityY * 0.35;
      const py = y + velocityY * frame + 0.5 * gravityPerFrame * frame * frame;
      if (py > 635 || px > 1250) break;
      const alpha = 0.8 * (1 - frame / 70);
      g.fillStyle(COLORS.cyan, alpha);
      g.fillCircle(px, py, Math.max(2, 5 - frame * 0.045));
    }
  }

  clearTrajectory(): void {
    this.trajectoryGraphics.clear();
  }

  private drawFrame(): void {
    const g = this.frameGraphics;
    // The foot extends 15px below baseY, plus its 2px outer stroke.
    const baseY = GROUND_Y - 17;

    g.fillStyle(0x000000, 0.09);
    g.fillEllipse(this.anchor.x, GROUND_Y + 2, 100, 10);

    // One broad handle splits into two fork arms in a clearly readable Y shape.
    g.lineStyle(32, COLORS.ink, 1);
    g.lineBetween(this.anchor.x, baseY, this.anchor.x, this.junctionY);
    g.lineBetween(
      this.anchor.x,
      this.junctionY,
      this.leftFork.x,
      this.leftFork.y,
    );
    g.lineBetween(
      this.anchor.x,
      this.junctionY,
      this.rightFork.x,
      this.rightFork.y,
    );
    g.lineStyle(23, 0x744b3d, 1);
    g.lineBetween(this.anchor.x, baseY, this.anchor.x, this.junctionY);
    g.lineBetween(
      this.anchor.x,
      this.junctionY,
      this.leftFork.x,
      this.leftFork.y,
    );
    g.lineBetween(
      this.anchor.x,
      this.junctionY,
      this.rightFork.x,
      this.rightFork.y,
    );

    g.lineStyle(4, 0xc28a68, 0.82);
    g.lineBetween(
      this.anchor.x - 4,
      baseY - 9,
      this.anchor.x - 4,
      this.junctionY + 8,
    );
    g.lineBetween(
      this.anchor.x - 4,
      this.junctionY + 4,
      this.leftFork.x + 3,
      this.leftFork.y + 10,
    );
    g.lineBetween(
      this.anchor.x - 4,
      this.junctionY + 4,
      this.rightFork.x - 3,
      this.rightFork.y + 10,
    );

    g.fillStyle(0x744b3d, 1);
    g.fillCircle(this.leftFork.x, this.leftFork.y, 17);
    g.fillCircle(this.rightFork.x, this.rightFork.y, 17);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeCircle(this.leftFork.x, this.leftFork.y, 17);
    g.strokeCircle(this.rightFork.x, this.rightFork.y, 17);
    g.fillStyle(0xd29b73, 1);
    g.fillCircle(this.leftFork.x - 2, this.leftFork.y - 2, 5);
    g.fillCircle(this.rightFork.x - 2, this.rightFork.y - 2, 5);

    g.fillStyle(0x95634e, 1);
    g.fillRoundedRect(this.anchor.x - 28, baseY - 4, 56, 19, 8);
    g.lineStyle(4, COLORS.ink, 1);
    g.strokeRoundedRect(this.anchor.x - 28, baseY - 4, 56, 19, 8);
    g.lineStyle(2, 0xd9b29a, 0.75);
    g.lineBetween(this.anchor.x - 17, baseY + 2, this.anchor.x + 17, baseY + 2);
  }
}
