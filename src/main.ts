import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { GameScene } from "./game/scenes/GameScene";
import { GAME_HEIGHT, GAME_WIDTH, COLORS, PHYSICS } from "./game/constants";
import "./styles/game.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: "high-performance",
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    min: {
      width: 320,
      height: 180,
    },
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: PHYSICS.gravityY },
      positionIterations: 8,
      velocityIterations: 6,
      constraintIterations: 2,
      enableSleeping: false,
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
};

new Phaser.Game(config);
