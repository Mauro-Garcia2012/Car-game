/** Boot: build the world, hand the UI its callbacks, run the loop. */
import { Game } from './game.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Audio } from './audio.js';

const canvas = document.getElementById('scene');
const input = new Input();
const audio = new Audio();

let game;

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
  onRepairBody: () => game && game.repairBody(),
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
