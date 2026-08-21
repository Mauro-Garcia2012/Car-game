/** All DOM: menu, HUD, overlays. The 3D side never touches the document. */
import { CARS, carRange, carTopSpeed } from './cars/index.js';
import { isUnlocked, totalMetres } from './progress.js';
import {
  t,
  applyStaticTranslations,
  bindLanguageButtons,
  onLanguageChange,
} from './i18n.js';

const $ = (id) => document.getElementById(id);
const BEST_KEY = 'desert-run.best';

function km(value) {
  return `${(value / 1000).toFixed(2)} km`;
}

/** Fares are quoted in plain metres, counting down as you close on the stop. */
function metres(value) {
  const n = Math.max(0, Math.round(value));
  return `${n.toLocaleString('en-US').replace(/,/g, ' ')} m`;
}

/** Full-scale marks for the two fuel bars: the best in the garage. */
const TANK_FULL_BAR = Math.max(...CARS.map((c) => c.tank));
const RANGE_FULL_BAR = Math.max(...CARS.map((c) => carRange(c)));

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
      limitSign: $('limit-sign'),
      limitValue: $('limit-value'),
      day: $('hud-day'),
      cash: $('hud-cash'),
      resumeRun: $('resume-run-btn'),
      resumeSummary: $('resume-summary'),
      startBtn: $('start-btn'),
      clock: $('hud-clock'),
      clockChip: $('clock-chip'),
      sleepBar: $('sleep-bar'),
      sleepFill: $('sleep-fill'),
      motel: $('hud-motel'),
      veil: $('drowsy-veil'),
      cameraFlash: $('camera-flash'),
      refuelPrice: $('refuel-price'),
      checkinPanel: $('checkin-panel'),
      checkinFill: $('checkin-fill'),
      fareChip: $('fare-chip'),
      fareRemaining: $('fare-remaining'),
      farePanel: $('fare-panel'),
      fareDest: $('fare-dest'),
      fareDistance: $('fare-distance'),
      farePay: $('fare-pay'),
      fareFuel: $('fare-fuel'),
      fareAccept: $('fare-accept'),
      overTitle: $('over-title'),
      overText: $('over-text'),
      overDistance: $('over-distance'),
      overStops: $('over-stops'),
      overDays: $('over-days'),
      overBest: $('over-best'),
    };

    this.selected = CARS[0].id;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.message_ = { key: '', level: '', params: null };
    this.lastResult = null;

    applyStaticTranslations();
    bindLanguageButtons();
    onLanguageChange(() => this.retranslate());
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
      card.dataset.id = car.id;
      this.el.picker.appendChild(card);
      this.paintCard(card, car);
      card.addEventListener('click', () => {
        if (card.classList.contains('locked')) return;
        this.selectCar(car.id);
      });
    }
    if (this.locked(this.selected)) this.selected = CARS[0].id;
    this.selectCar(this.selected, true);
  }

  /** True while a vehicle is still behind its milestone. */
  locked(id) {
    const car = CARS.find((c) => c.id === id);
    return !!(car && (car.unlockAt || car.unlockBy) && !isUnlocked(id));
  }

  /**
   * A card is either the vehicle or the promise of one. Locked cards keep
   * the name hidden — the whole point of these three is that you do not know
   * what is coming until it is yours.
   */
  paintCard(card, car) {
    const shut = this.locked(car.id);
    card.className = `car-card${shut ? ' locked' : ''}`;
    if (!shut) {
      card.innerHTML = `
        <div class="swatch" style="background:${car.color}"></div>
        <h3>${car.name}</h3>
        <p>${t(car.taglineKey)}</p>`;
      return;
    }
    // Two ways to be locked: a milestone you can count down to, or something
    // sitting in a briefcase that no amount of driving in a straight line
    // will ever hand you.
    const left = car.unlockAt ? Math.max(0, car.unlockAt - totalMetres()) : 0;
    const hint = car.unlockAt
      ? t('car.lockedHint', {
          km: (car.unlockAt / 1000).toFixed(0),
          left: (left / 1000).toFixed(left < 10000 ? 1 : 0),
        })
      : t('car.lockedCase');
    card.innerHTML = `
      <div class="swatch locked-swatch">?</div>
      <h3>${t('car.locked')}</h3>
      <p>${hint}</p>`;
  }

  /** Opens a card the moment its milestone is claimed at a pump. */
  unlockCar(car) {
    for (const card of this.el.picker.children) {
      if (card.dataset.id === car.id) {
        this.paintCard(card, car);
        card.classList.add('just-unlocked');
      }
    }
  }

  selectCar(id, silent = false) {
    this.selected = id;
    for (const card of this.el.picker.children) {
      card.classList.toggle('active', card.dataset.id === id);
    }
    const car = CARS.find((c) => c.id === id);
    if (this.locked(id)) return; // no peeking at a locked car's numbers
    const row = (label, value, text, cls = '') => `
      <div class="spec-row ${cls}">
        <label>${label}</label>
        <div class="meter"><i style="width:${Math.round(value * 100)}%"></i></div>
        <b>${text}</b>
      </div>`;
    this.el.specs.innerHTML = [
      row(t('spec.topSpeed'), car.stats.speed, `${Math.round(carTopSpeed(car) * 3.6)}`),
      row(t('spec.accel'), car.stats.accel, `${car.power.toFixed(1)}`),
      row(t('spec.grip'), car.stats.grip, `${car.grip.toFixed(2)}`),
      row(t('spec.offroad'), car.offroadGrip, `${Math.round(car.offroadGrip * 100)}%`),
      row(t('spec.tank'), car.tank / TANK_FULL_BAR, `${car.tank} L`, 'range'),
      row(
        t('spec.range'),
        carRange(car) / RANGE_FULL_BAR,
        `${(carRange(car) / 1000).toFixed(1)} km`,
        'range'
      ),
    ].join('');
    if (!silent) this.h.onSelectCar(id);
  }

  /** Re-renders every string the UI generated itself. */
  retranslate() {
    applyStaticTranslations();
    this.buildPicker();
    const { key, level, params } = this.message_;
    this.message_ = { key: null, level: null, params: null }; // force a repaint
    this.message(key, level, params);
    if (this.lastResult) this.showGameOver(this.lastResult);
  }

  bindButtons() {
    $('start-btn').addEventListener('click', () => this.h.onStart(this.selected));
    this.el.resumeRun.addEventListener('click', () => this.h.onResumeRun());
    $('resume-btn').addEventListener('click', () => this.h.onResume());
    $('quit-btn').addEventListener('click', () => this.h.onQuit());
    $('retry-btn').addEventListener('click', () => this.h.onRetry());
    $('garage-btn').addEventListener('click', () => this.h.onQuit());
    // Tapping the offer is the touch equivalent of pressing E.
    this.el.fareAccept.addEventListener('click', () => this.h.onAcceptFare());
  }

  hideLoading() {
    this.el.loading.classList.add('hidden');
  }

  /**
   * Offers the parked run, if there is one. The start button becomes the
   * explicit way to throw it away, so nobody loses two hours of driving by
   * pressing the big obvious button out of habit.
   */
  showParkedRun(run) {
    const has = !!run;
    this.el.resumeRun.classList.toggle('hidden', !has);
    this.el.startBtn.textContent = t(has ? 'menu.startFresh' : 'menu.start');
    this.el.startBtn.dataset.i18n = has ? 'menu.startFresh' : 'menu.start';
    if (!has) return;
    const car = CARS.find((c) => c.id === run.car);
    this.el.resumeSummary.textContent = t('menu.resumeAt', {
      day: run.day,
      km: km(run.distance),
      cash: `$${Math.round(run.cash)}`,
      car: car ? car.name : '',
    });
  }

  showMenu() {
    this.el.menu.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
  }

  showHud() {
    this.lastResult = null;
    this.el.menu.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.best.textContent = km(this.best);
  }

  setPaused(paused) {
    this.el.pause.classList.toggle('hidden', !paused);
  }

  /** @param {{titleKey:string, textKey:string, textParams:object,
   *           distance:number, stops:number, days:number}} result */
  showGameOver(result) {
    const { titleKey, textKey, textParams, distance, stops, days } = result;
    this.lastResult = result;
    this.best = Math.max(this.best, distance);
    localStorage.setItem(BEST_KEY, String(Math.round(this.best)));
    this.el.overTitle.textContent = t(titleKey);
    this.el.overText.textContent = t(textKey, textParams);
    this.el.overDistance.textContent = km(distance);
    this.el.overStops.textContent = String(stops);
    this.el.overDays.textContent = String(days);
    this.el.overBest.textContent = km(this.best);
    this.el.gameover.classList.remove('hidden');
  }

  /** Blows out the screen for a moment, the way a camera flash does. */
  cameraFlash() {
    const el = this.el.cameraFlash;
    el.classList.remove('pop');
    void el.offsetWidth; // restart the animation
    el.classList.add('pop');
  }

  /** Shows a HUD message by translation key, so it survives a language swap. */
  message(key, level = '', params = null) {
    if (
      key === this.message_.key &&
      level === this.message_.level &&
      params === this.message_.params
    ) {
      return;
    }
    this.message_ = { key, level, params };
    const el = this.el.message;
    el.className = `hud-message ${level} ${key ? 'show' : ''}`;
    el.textContent = key ? t(key, params) : '';
  }

  /**
   * @param {{day:number, speedKmh:number, topKmh:number, speedLimit:number,
   *          gear:number,
   *          engineOn:boolean,
   *          fuel:number, tank:number, rangeLeft:number, toStation:number,
   *          distance:number, stops:number, damage:number, cash:number,
   *          pumpPrice:number, sleep:number, drowsiness:number, asleep:boolean,
   *          toMotel:number, checkingIn:number,
   *          refuelling:boolean, refuelProgress:number, refuelLitres:number,
   *          refuelCost:number}} s
   */
  update(s) {
    const e = this.el;
    e.speed.textContent = String(Math.round(s.speedKmh));
    e.gear.textContent = s.engineOn
      ? s.speedKmh < 1
        ? t('hud.neutral')
        : String(s.gear)
      : '—';

    // Posted limit is in mph, the speedo in km/h — as it would be in a
    // European car driven across Nevada.
    e.limitValue.textContent = String(s.speedLimit);
    e.limitSign.classList.toggle('over', s.speedKmh > s.speedLimit * 1.609 + 5);

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

    e.day.textContent = String(s.day);
    e.cash.textContent = `$${s.cash.toFixed(0)}`;

    // The sleep meter and the clock are the same number twice: the light
    // outside is at whatever hour this says.
    e.clock.textContent = s.clock;
    e.clockChip.classList.toggle('night', s.night > 0.6);

    // Sleep: a clock, not a distance. The motel is the only refill.
    const sleepRatio = Math.max(0, s.sleep);
    e.sleepFill.style.width = `${sleepRatio * 100}%`;
    e.sleepBar.classList.toggle('low', sleepRatio < 0.35);
    e.sleepBar.classList.toggle('critical', sleepRatio < 0.15);
    e.motel.textContent =
      s.toMotel < 0 ? '—' : `${t('hud.motelShort')} ${(s.toMotel / 1000).toFixed(1)}`;

    e.veil.style.opacity = String(
      Math.min(1, s.drowsiness * 0.92 + (s.asleep ? 1 : 0))
    );
    e.veil.classList.toggle('asleep', s.asleep);

    e.refuelPanel.classList.toggle('hidden', !s.refuelling);
    if (s.refuelling) {
      e.refuelFill.style.width = `${s.refuelProgress * 100}%`;
      e.refuelLitres.textContent = `${s.refuelLitres.toFixed(0)} L`;
      e.refuelPrice.textContent = `$${(s.pumpPrice * 3.785).toFixed(2)}/gal · −$${s.refuelCost.toFixed(2)}`;
    }

    // Passenger aboard: metres left, counting down to the drop-off.
    e.fareChip.classList.toggle('hidden', !s.fare);
    if (s.fare) e.fareRemaining.textContent = metres(s.fare.metres);

    // Standing offer: distance, fare and what the extra weight will drink.
    e.farePanel.classList.toggle('hidden', !s.offer);
    if (s.offer) {
      e.fareDest.textContent = t(
        s.offer.destKind === 'motel' ? 'hud.destMotel' : 'hud.destStation'
      );
      e.fareDistance.textContent = metres(s.offer.metres);
      e.farePay.textContent = `+$${s.offer.pay}`;
      e.fareFuel.textContent = `+${s.offer.litres.toFixed(1)} L (−$${s.offer.cost.toFixed(2)})`;
      e.fareAccept.textContent = t(
        s.offer.canAccept ? 'hud.fareAccept' : 'hud.fareStop'
      );
      e.fareAccept.classList.toggle('ready', s.offer.canAccept);
    }

    e.checkinPanel.classList.toggle('hidden', s.checkingIn <= 0);
    if (s.checkingIn > 0) {
      e.checkinFill.style.width = `${Math.min(1, s.checkingIn) * 100}%`;
    }
  }
}
