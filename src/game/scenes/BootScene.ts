import Phaser from 'phaser';
import { createGameTextures } from '../rendering/ArtFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    createGameTextures(this);
    this.scene.start('GameScene');
  }
}
