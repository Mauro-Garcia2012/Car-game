/** All DOM: menu, HUD, overlays. The 3D side never touches the document. */
import { CARS, carRange } from './cars/index.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'desert-run.best';

function km(metres) {
  return `${(metres / 1000).toFixed(2)} km`;
}

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.el = {
      loading: $('loading'),
      menu: $('menu'),
      hud: $('hud'),
      pause: $('pause'),
      gameover: $('gameover'),
      picker: $('car-picker'),
      specs: $('spec-sheet'),
      message: $('hud-message'),
      speed: $('hud-speed'),
      gear: $('hud-gear'),
      speedArc: $('speed-arc'),
      needle: $('speed-needle'),
      litres: $('hud-litres'),
      fuelFill: $('fuel-fill'),
      fuelBar: document.querySelector('.fuel-bar'),
      rangeFill: $('range-fill'),
      stationMarker: $('station-marker'),
      next: $('hud-next'),
      range: $('hud-range'),
      distance: $('hud-distance'),
      stops: $('hud-stops'),
      best: $('hud-best'),
      damage: $('damage-fill'),
      refuelPanel: $('refuel-panel'),
      refuelFill: $('refuel-fill'),
      refuelLitres: $('refuel-litres'),
      overTitle: $('over-title'),
      overText: $('over-text'),
      overDistance: $('over-distance'),
      overStops: $('over-stops'),
      overBest: $('over-best'),
    };

    this.selected = CARS[0].id;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.lastMessage = null;

    this.buildPicker();
    this.bindButtons();

    if (window.matchMedia('(pointer: coarse)').matches) {
      document.body.classList.add('touch');
    }
  }

  buildPicker() {
    this.el.picker.innerHTML = '';
    for (const car of CARS) {
      const card = document.createElement('button');
      card.className = 'car-card';
      card.dataset.id = car.id;
      card.innerHTML = `
        <div class="swatch" style="background:${car.color}"></div>
        <h3>${car.name}</h3>
        <p>${car.tagline}</p>`;
      card.addEventListener('click', () => this.selectCar(car.id));
      this.el.picker.appendChild(card);
    }
    this.selectCar(this.selected, true);
  }

  selectCar(id, silent = false) {
    this.selected = id;
    for (const card of this.el.picker.children) {
      card.classList.toggle('active', card.dataset.id === id);
    }
    const car = CARS.find((c) => c.id === id);
    const row = (label, value, text, cls = '') => `
      <div class="spec-row ${cls}">
        <label>${label}</label>
        <div class="meter"><i style="width:${Math.round(value * 100)}%"></i></div>
        <b>${text}</b>
      </div>`;
    this.el.specs.innerHTML = [
      row('Top speed', car.stats.speed, `${Math.round(car.topSpeed * 3.6)}`),
      row('Acceleration', car.stats.accel, `${car.power.toFixed(1)}`),
      row('Grip', car.stats.grip, `${car.grip.toFixed(2)}`),
      row('Off-road', car.offroadGrip, `${Math.round(car.offroadGrip * 100)}%`),
      row('Tank', car.stats.range, `${car.tank} L`, 'range'),
      row(
        'Range',
        Math.min(1, carRange(car) / 4500),
        `${(carRange(car) / 1000).toFixed(1)} km`,
        'range'
      ),
    ].join('');
    if (!silent) this.h.onSelectCar(id);
  }

  bindButtons() {
    $('start-btn').addEventListener('click', () => this.h.onStart(this.selected));
    $('resume-btn').addEventListener('click', () => this.h.onResume());
    $('quit-btn').addEventListener('click', () => this.h.onQuit());
    $('retry-btn').addEventListener('click', () => this.h.onRetry());
    $('garage-btn').addEventListener('click', () => this.h.onQuit());
  }

  hideLoading() {
    this.el.loading.classList.add('hidden');
  }

  showMenu() {
    this.el.menu.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
  }

  showHud() {
    this.el.menu.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.best.textContent = km(this.best);
  }

  setPaused(paused) {
    this.el.pause.classList.toggle('hidden', !paused);
  }

  showGameOver({ title, text, distance, stops }) {
    this.best = Math.max(this.best, distance);
    localStorage.setItem(BEST_KEY, String(Math.round(this.best)));
    this.el.overTitle.textContent = title;
    this.el.overText.textContent = text;
    this.el.overDistance.textContent = km(distance);
    this.el.overStops.textContent = String(stops);
    this.el.overBest.textContent = km(this.best);
    this.el.gameover.classList.remove('hidden');
  }

  message(text, level = '') {
    const key = `${text}|${level}`;
    if (key === this.lastMessage) return;
    this.lastMessage = key;
    const el = this.el.message;
    el.className = `hud-message ${level} ${text ? 'show' : ''}`;
    el.textContent = text;
  }

  /**
   * @param {{speedKmh:number, topKmh:number, gear:number, engineOn:boolean,
   *          fuel:number, tank:number, rangeLeft:number, toStation:number,
   *          distance:number, stops:number, damage:number,
   *          refuelling:boolean, refuelProgress:number, refuelLitres:number}} s
   */
  update(s) {
    const e = this.el;
    e.speed.textContent = String(Math.round(s.speedKmh));
    e.gear.textContent = s.engineOn ? (s.speedKmh < 1 ? 'N' : String(s.gear)) : '—';

    const ratio = Math.min(1, s.speedKmh / s.topKmh);
    e.speedArc.style.strokeDashoffset = String(251 - 251 * ratio);
    e.speedArc.style.stroke = ratio > 0.85 ? '#ff6a4d' : 'var(--amber)';
    e.needle.style.transform = `rotate(${-90 + ratio * 180}deg)`;

    const fuelRatio = Math.max(0, s.fuel / s.tank);
    e.fuelFill.style.width = `${fuelRatio * 100}%`;
    e.litres.textContent = `${s.fuel.toFixed(1)} L`;
    e.fuelBar.classList.toggle('low', fuelRatio < 0.3);
    e.fuelBar.classList.toggle('critical', fuelRatio < 0.12);

    // Range bar: green = how far the tank goes, marker = the next station.
    const scale = Math.max(s.rangeLeft, s.toStation, 500) * 1.12;
    e.rangeFill.style.width = `${Math.min(100, (s.rangeLeft / scale) * 100)}%`;
    e.stationMarker.style.left = `${Math.min(100, (s.toStation / scale) * 100)}%`;
    e.stationMarker.style.background =
      s.toStation > s.rangeLeft ? '#ff5b3d' : '#fff2d8';

    e.next.textContent = s.toStation < 0 ? '—' : km(s.toStation);
    e.range.textContent = km(Math.max(0, s.rangeLeft));
    e.distance.textContent = km(s.distance);
    e.stops.textContent = String(s.stops);
    e.damage.style.width = `${s.damage}%`;

    e.refuelPanel.classList.toggle('hidden', !s.refuelling);
    if (s.refuelling) {
      e.refuelFill.style.width = `${s.refuelProgress * 100}%`;
      e.refuelLitres.textContent = `${s.refuelLitres.toFixed(0)} L`;
    }
  }
}
