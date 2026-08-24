/** Boot: build the world, hand the UI its callbacks, run the loop. */
import { Game } from './game.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { run as runCheat } from './cheats.js';

const canvas = document.getElementById('scene');
const input = new Input();
const audio = new Audio();

let game;
let pausedForCheats = false;

const ui = new UI({
  onSelectCar: (id) => game && game.setCar(id),
  onStart: (id) => {
    audio.start();
    game.start(id);
  },
  onResume: () => game.setPaused(false),
  onQuit: () => game.toMenu(),
  onRetry: () => game.start(game.spec.id),
  onResumeRun: () => game.resumeRun(),
  onAcceptFare: () => game && game.acceptOffer(),
  onShopBuy: (id) => game && game.buyFromShop(id),
  // The debug menu holds the game still while it is open, so a code typed at
  // speed does not arrive three hundred metres later. It only resumes what it
  // paused: opening it on an already-paused game leaves it paused.
  onCheatOpen: () => {
    pausedForCheats = !!game && game.state === 'playing';
    if (pausedForCheats) game.setPaused(true);
  },
  onCheatClose: () => {
    if (pausedForCheats) game.setPaused(false);
    pausedForCheats = false;
  },
  onCheat: (code) =>
    game ? runCheat(code, game) : { ok: false, text: 'not running' },
  onToggleMute: () => (game ? game.toggleMute() : audio.setMuted(!audio.muted)),
});

input.bindTouch(document.getElementById('touch-controls'));

// Build on the next frame so the loading screen actually paints first.
requestAnimationFrame(() => {
  game = new Game(canvas, ui, input, audio);
  window.__game = game; // handy for debugging from the console
  game.toMenu();
  ui.setMuted(audio.muted); // whatever was chosen last time this was open
  ui.showParkedRun(game.parkedRun());
  ui.hideLoading();

  const loop = () => {
    requestAnimationFrame(loop);
    game.frame();
  };
  loop();
});

// Any first gesture unlocks WebAudio.
for (const evt of ['pointerdown', 'keydown']) {
  window.addEventListener(
    evt,
    () => {
      audio.start();
      audio.resume();
    },
    { once: true }
  );
}
