/** Keyboard, touch and gamepad input, flattened into one control state. */

const KEY_MAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'handbrake',
  ShiftLeft: 'handbrake',
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { up: false, down: false, left: false, right: false, handbrake: false };
    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.handbrake = false;
    this.onAction = () => {};

    // Anything typed into a field is for the field, not for the car. Without
    // this, entering a cheat code drives you into the desert while you do it.
    const typing = (e) => {
      const t = e.target;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };

    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (e.repeat) {
        if (KEY_MAP[e.code]) e.preventDefault();
        return;
      }
      const mapped = KEY_MAP[e.code];
      if (mapped) {
        this.keys.add(mapped);
        e.preventDefault();
      }
      if (e.code === 'KeyE') this.onAction('accept');
      if (e.code === 'KeyC') this.onAction('camera');
      if (e.code === 'KeyR') this.onAction('restart');
      if (e.code === 'KeyP' || e.code === 'Escape') this.onAction('pause');
      if (e.code === 'KeyM') this.onAction('mute');
      if (e.code === 'KeyH') this.onAction('horn');
      // Tab would otherwise walk the focus ring round the HUD buttons.
      if (e.code === 'Tab') {
        e.preventDefault();
        this.onAction('map');
      }
      // The workshop counter, one key per line.
      if (/^Digit[1-9]$/.test(e.code)) this.onAction('shop' + e.code.slice(5));
      if (e.code === 'Enter') this.onAction('enter');
    });
    window.addEventListener('keyup', (e) => {
      if (typing(e)) return;
      const mapped = KEY_MAP[e.code];
      if (mapped) this.keys.delete(mapped);
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Wires on-screen buttons: elements with data-control="up|down|left|right". */
  bindTouch(root) {
    const buttons = root.querySelectorAll('[data-control]');
    for (const el of buttons) {
      const name = el.dataset.control;
      const set = (v) => (e) => {
        e.preventDefault();
        this.touch[name] = v;
        el.classList.toggle('pressed', v);
      };
      el.addEventListener('pointerdown', set(true));
      el.addEventListener('pointerup', set(false));
      el.addEventListener('pointerleave', set(false));
      el.addEventListener('pointercancel', set(false));
    }
  }

  pollGamepad() {
    if (!navigator.getGamepads) return null;
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.connected) return pad;
    }
    return null;
  }

  update() {
    const k = this.keys;
    const t = this.touch;
    let throttle = k.has('up') || t.up ? 1 : 0;
    let brake = k.has('down') || t.down ? 1 : 0;
    let steer = (k.has('right') || t.right ? 1 : 0) - (k.has('left') || t.left ? 1 : 0);
    let handbrake = k.has('handbrake') || t.handbrake;

    const pad = this.pollGamepad();
    if (pad) {
      const axis = pad.axes[0] || 0;
      if (Math.abs(axis) > 0.12) steer = axis;
      throttle = Math.max(throttle, pad.buttons[7]?.value || 0);
      brake = Math.max(brake, pad.buttons[6]?.value || 0);
      if (pad.buttons[0]?.pressed) handbrake = true;
    }

    this.throttle = throttle;
    this.brake = brake;
    this.steer = Math.max(-1, Math.min(1, steer));
    this.handbrake = handbrake;
    return this;
  }
}
