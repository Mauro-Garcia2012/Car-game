/** Wires the world, the car, the rules and the camera into a playable game. */
import * as THREE from 'three';
import { createCar, carById, carRange, CARS } from './cars/index.js';
import { RoadSystem } from './world/road.js';
import { PropField } from './world/props.js';
import {
  GasStations,
  stationDistance,
  nextStationIndex,
  fuelPricePerLitre,
  overnightHike,
  resetMarket,
  marketPrice,
  setMarketPrice,
  ZONE_HALF,
} from './world/gasStation.js';
import { Motels, motelDistance, nextMotelIndex } from './world/motel.js';
import { Crates, BIG_PRIZE } from './world/crates.js';
import {
  SideRoads,
  CASE_CASH,
  REPAIR_COST,
  WORN_LIMIT,
  PRIZE_CASH,
  PRIZE_WORN,
  PRIZE_HATCH,
  PRIZE_SUPER,
} from './world/sideroads.js';
import { Fatigue, AWAKE_TIME } from './fatigue.js';
import {
  Fares,
  offerAt,
  extraLitresFor,
  PASSENGER_BURN,
  STATION,
  MOTEL,
} from './fares.js';
import { RoadSigns, SpeedCameras, speedLimitAt, FINE } from './world/signs.js';
import { createSky } from './world/sky.js';
import { Headlights } from './world/headlights.js';
import { setNightGlow } from './world/nightlights.js';
import { clockFor, DAY_START_HOUR, NIGHT_HOUR } from './daynight.js';
import { setWorldSeed, worldSeed } from './rng.js';
import {
  addMetres,
  claimUnlocked,
  unlockById,
  flush as flushProgress,
  saveRun,
  loadRun,
  clearRun,
} from './progress.js';
import { Vehicle, SURFACE } from './vehicle.js';
import { Traffic } from './traffic.js';
import { DustSystem } from './effects.js';
import { roadPoint, roadYaw } from './track.js';
import { onLanguageChange } from './i18n.js';
import { terrainHeight } from './world/road.js';

const REFUEL_RATE = 14; // litres per second
const REFUEL_SPEED_LIMIT = 3.2; // m/s — you have to actually stop
const CHECKIN_TIME = 2.5; // seconds parked before the room key appears
/** What a night costs. The bed used to be free; the road no longer is. */
const BED_COST = 20;
/** Seconds the sky takes to run from midnight back round to dawn. */
const DAWN_SWEEP = 2.6;
/** Seconds of driving between writes of the run in progress. */
const RUN_SAVE_EVERY = 2;
/** Cash in the glovebox at the start. There is no way to earn more yet. */
const START_CASH = 500;
const CAMERA_MODES = ['chase', 'hood', 'orbit'];

export class Game {
  constructor(canvas, ui, input, audio) {
    this.ui = ui;
    this.input = input;
    this.audio = audio;
    this.state = 'menu';
    this.cameraMode = 0;
    this.shake = 0;
    this.dustAccum = 0;
    this.stops = new Set();
    this.skipped = new Set();
    this.messageTimer = 0;
    this.tempMessage = null;
    this.inZone = -1;
    this.motelZone = -1;
    this.refuelling = false;
    this.checkingIn = 0;
    this.cash = START_CASH;
    this.day = 1;
    // The sleep meter is the clock: 0 is dawn, 1 is nightfall.
    this.dayPhase = 0;
    this.bankedDistance = 0;
    this.nightOverrun = 0;
    this.fatigue = new Fatigue();
    this.fares = new Fares();
    this.offer = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.4,
      4200
    );
    this.camera.position.set(0, 4, 12);

    this.sky = createSky(this.scene);

    // Reflections for the car paint, baked once from the sky alone.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromScene(this.scene, 0, 0.5, 5000).texture;
    pmrem.dispose();

    this.road = new RoadSystem(this.scene);
    this.props = new PropField(this.scene, this.road.slotCount);
    this.road.addListener(this.props);
    this.crates = new Crates(this.scene, this.road.slotCount);
    this.road.addListener(this.crates);
    this.stations = new GasStations(this.scene);
    onLanguageChange(() => this.stations.retranslate());
    this.signs = new RoadSigns(this.scene);
    this.cameras = new SpeedCameras(this.scene);
    this.motels = new Motels(this.scene);
    this.sideRoads = new SideRoads(this.scene);
    this.traffic = new Traffic(this.scene);
    this.dust = new DustSystem(this.scene);

    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);
    this.headlights = new Headlights();
    this.setCar(carById('sport').id);

    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.tmpV = new THREE.Vector3();
    this.orbitAngle = 0;

    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.setPaused(true);
      if (document.hidden) this.parkRun();
    });
    // pagehide is the one that fires reliably when a tab really goes away.
    window.addEventListener('pagehide', () => this.parkRun());

    this.input.onAction = (action) => this.onAction(action);
    this.clock = new THREE.Clock();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  onAction(action) {
    if (action === 'camera') {
      this.cameraMode = (this.cameraMode + 1) % CAMERA_MODES.length;
    } else if (action === 'pause' && (this.state === 'playing' || this.state === 'paused')) {
      this.setPaused(this.state === 'playing');
    } else if (action === 'restart' && this.state !== 'menu') {
      this.start(this.spec.id);
    } else if (action === 'accept') {
      this.acceptFare();
    } else if (action === 'mute') {
      this.audio.setMuted(!this.audio.muted);
    } else if (action === 'enter' && this.state === 'menu') {
      this.start(this.ui.selected);
    }
  }

  setCar(id) {
    if (this.carModel) {
      // Off the old model before its geometries go, or the beams go with it.
      this.headlights.detach();
      this.carGroup.remove(this.carModel);
      this.carModel.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
    }
    const { spec, model } = createCar(id);
    this.spec = spec;
    this.carModel = model;
    this.carGroup.add(model);
    this.headlights.attach(model);
    this.vehicle = new Vehicle(spec, model);
    this.vehicle.reset(0);
    if (this.state === 'menu') this.parkForMenu();
  }

  parkForMenu() {
    const s = 40;
    const lat = 2.6;
    const p = roadPoint(s, lat);
    this.vehicle.s = s;
    this.vehicle.lateral = lat;
    this.vehicle.position.set(p.x, terrainHeight(s, lat), p.z);
    this.vehicle.yaw = roadYaw(s);
    this.vehicle.speed = 0;
    this.vehicle.syncModel(0);
    this.road.update(s);
    this.stations.update(s);
    this.signs.update(s);
    this.motels.update(s);
  }

  start(id, seed = (Math.random() * 0xffffffff) >>> 0) {
    // A new road before anything is placed on it. Everything in the world is
    // a hash of the chunk number, so one number here is the difference
    // between a new desert and the same one again.
    setWorldSeed(seed);
    if (id && (!this.spec || id !== this.spec.id)) this.setCar(id);
    this.vehicle.reset(0);
    this.vehicle.yaw = roadYaw(0);
    this.traffic.reset();
    this.crates.reset();
    this.sideRoads.reset();
    this.sleptAt = -1;
    this.setWornEngine(false);
    this.dust.clear();
    this.stops.clear();
    this.skipped.clear();
    this.beds = new Set();
    this.refuelling = false;
    this.refuelTick = 0;
    this.checkingIn = 0;
    this.cash = START_CASH;
    this.spent = 0;
    this.day = 1;
    this.dayPhase = 0;
    this.nightOverrun = 0;
    this.bankedDistance = 0;
    this.saveTick = RUN_SAVE_EVERY;
    clearRun();
    resetMarket();
    this.stations.refreshPrices();
    this.cameras.reset(0);
    this.fatigue.reset();
    this.fares.reset();
    this.offer = null;
    this.vehicle.load = 1;
    this.earned = 0;
    this.lowFuelWarned = false;
    this.drowsyWarned = false;
    this.cameraMode = 0;
    this.state = 'playing';
    this.ui.showHud();
    this.audio.start();
    this.audio.resume();
    // Build the world before the first frame asks the camera about it.
    this.road.update(0);
    this.stations.update(0);
    this.signs.update(0);
    this.motels.update(0);
    this.snapCamera();
  }

  /**
   * Writes the run in progress out, so closing the tab is not the same as
   * dying. Cheap enough to call every couple of seconds: the whole thing is
   * a few hundred numbers and two lists of indices.
   */
  parkRun() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    const v = this.vehicle;
    saveRun({
      car: this.spec.id,
      s: v.s,
      lateral: v.lateral,
      yaw: v.yaw,
      speed: v.speed,
      fuel: v.fuel,
      damage: v.damage,
      distance: v.distance,
      cash: this.cash,
      spent: this.spent,
      earned: this.earned,
      day: this.day,
      dayPhase: this.dayPhase,
      nightOverrun: this.nightOverrun,
      sleep: this.fatigue.level,
      market: marketPrice(),
      stops: [...this.stops],
      skipped: [...this.skipped],
      beds: [...this.beds],
      crates: [...this.crates.opened],
      faresUsed: [...this.fares.used],
      fare: this.fares.active
        ? { kind: this.fares.active.kind, index: this.fares.active.index }
        : null,
      cameraMode: this.cameraMode,
      seed: worldSeed(),
      cases: [...this.sideRoads.taken],
      worn: this.wornEngine,
    });
    this.saveTick = RUN_SAVE_EVERY;
  }

  /** Is there a run parked, and what does it look like? */
  parkedRun() {
    const run = loadRun();
    return run && carById(run.car) ? run : null;
  }

  /** Picks a parked run back up exactly where it was left. */
  resumeRun() {
    const run = this.parkedRun();
    if (!run) return false;

    // Same car, same road: start() would otherwise roll a fresh desert and
    // drop the resumed car into a different one.
    this.start(run.car, run.seed >>> 0);
    const v = this.vehicle;
    v.s = run.s;
    v.lateral = run.lateral;
    v.yaw = run.yaw;
    v.speed = run.speed;
    v.fuel = run.fuel;
    v.damage = run.damage;
    v.distance = run.distance;
    const p = roadPoint(run.s, run.lateral);
    v.position.set(p.x, terrainHeight(run.s, run.lateral), p.z);

    this.cash = run.cash;
    this.spent = run.spent;
    this.earned = run.earned;
    this.day = run.day;
    this.dayPhase = run.dayPhase;
    this.nightOverrun = run.nightOverrun;
    this.bankedDistance = run.distance; // already banked on the odometer
    this.fatigue.level = run.sleep;
    this.cameraMode = run.cameraMode ?? 0;

    setMarketPrice(run.market);
    this.stops = new Set(run.stops);
    this.skipped = new Set(run.skipped);
    this.beds = new Set(run.beds);
    this.crates.opened = new Set(run.crates);
    this.fares.used = new Set(run.faresUsed);
    this.fares.active = run.fare ? offerAt(run.fare.kind, run.fare.index) : null;
    v.load = this.fares.active ? PASSENGER_BURN : 1;

    // Rebuild the world around wherever we came back to.
    this.road.update(v.s);
    this.stations.update(v.s);
    this.stations.refreshPrices();
    this.signs.update(v.s);
    this.cameras.reset(v.s);
    this.motels.update(v.s);
    this.sideRoads.taken = new Set(run.cases || []);
    this.sideRoads.update(v.s);
    this.setWornEngine(!!run.worn);
    this.traffic.update(0, v.s);
    v.syncModel(0);
    this.advanceClock(0);
    this.sky.update(v.position);
    this.snapCamera();
    this.parkRun(); // start() wiped the save; put it straight back
    return true;
  }

  setPaused(paused) {
    if (paused && this.state === 'playing') {
      this.state = 'paused';
      this.ui.setPaused(true);
    } else if (!paused && this.state === 'paused') {
      this.state = 'playing';
      this.ui.setPaused(false);
      this.audio.resume();
    }
  }

  toMenu() {
    // Going back to the garage is not giving up: park the run first, and
    // offer it again on the way out.
    this.parkRun();
    this.state = 'menu';
    this.orbitAngle = 2.3; // three-quarter front view to start
    this.ui.setPaused(false);
    this.ui.showMenu();
    this.ui.showParkedRun(this.parkedRun());
    this.parkForMenu();
    this.snapCamera();
  }

  gameOver(titleKey, textKey, textParams) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.audio.fail();
    clearRun();
    flushProgress();
    this.ui.showGameOver({
      titleKey,
      textKey,
      textParams,
      distance: this.vehicle.distance,
      stops: this.stops.size,
      days: this.day,
    });
  }

  /* ---------------------------------------------------------------- */

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.state === 'playing') this.simulate(dt);
    else if (this.state === 'menu') this.menuIdle(dt);
    else if (this.state === 'over') this.simulate(dt, true);

    this.dust.update(dt);
    this.advanceClock(dt);
    this.sky.update(this.vehicle.position);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Moves the sky to whatever hour the driver's own reserves say it is.
   *
   * Forwards it simply tracks the sleep meter, so the light drains at the
   * same rate the driver does and the last of the dusk goes with the last of
   * the meter. Backwards — the moment a bed resets the meter — it sweeps
   * rather than cuts, and that sweep is the night passing.
   */
  advanceClock(dt) {
    const target = 1 - this.fatigue.level;
    if (target < this.dayPhase - 0.001) {
      this.dayPhase = Math.max(target, this.dayPhase - dt / DAWN_SWEEP);
    } else {
      this.dayPhase = target;
    }

    // Past nightfall the sky holds, but the hands keep going round.
    if (this.state === 'playing' && this.fatigue.level <= 0) {
      this.nightOverrun += (dt * (NIGHT_HOUR - DAY_START_HOUR)) / AWAKE_TIME;
    } else if (this.dayPhase < 0.999) {
      this.nightOverrun = 0;
    }

    const light = this.sky.setPhase(this.dayPhase, this.clock.elapsedTime);
    this.headlights.setLevel(light.lamps);
    setNightGlow(Math.min(1, Math.max(0, (light.neon - 0.9) / 1.5)));
    this.renderer.toneMappingExposure = light.exposure;
  }

  menuIdle(dt) {
    this.orbitAngle += dt * 0.24;
    for (const w of this.carModel.userData.wheels || []) {
      if (w.front) w.root.rotation.y = Math.sin(this.orbitAngle * 0.7) * 0.22;
    }
  }

  simulate(dt, frozen = false) {
    const v = this.vehicle;
    const raw = frozen
      ? { throttle: 0, brake: 1, steer: 0, handbrake: false }
      : this.input.update();

    // Sleep runs on the clock, and filters the controls once it runs low.
    if (!frozen) this.fatigue.update(dt);
    const input = frozen ? raw : this.fatigue.applyToInput(raw);
    if (this.fatigue.blinked) this.audio.blip(180, 0.5, 'sine', 0.12);

    v.update(dt, input);
    if (!frozen) {
      // Lifetime odometer: what the unlocks are measured against.
      addMetres(v.distance - this.bankedDistance);
      this.bankedDistance = v.distance;
    }

    this.road.update(v.s);
    this.stations.update(v.s);
    this.signs.update(v.s);
    this.cameras.update(dt, v.s);
    this.motels.update(v.s);
    this.sideRoads.update(v.s);
    this.traffic.update(dt, v.s);

    if (!frozen) {
      this.handleCollisions();
      this.handleSpeedCamera();
      this.handleCrates();
      this.handleBriefcase();
      this.handleRefuelling(dt);
      this.handleMotel(dt);
      this.handleFares();
      this.handleStationBookkeeping();
      this.checkGameOver();

      this.saveTick -= dt;
      if (this.saveTick <= 0) this.parkRun();
    }

    this.orbitAngle += dt * 0.3;
    this.emitDust(dt);
    this.audio.updateEngine({
      rpm: v.rpm,
      throttle: input.throttle,
      speed: Math.abs(v.speed),
      slip: v.slip,
      engineOn: v.engineOn,
      surface: v.surface,
    });
    this.pushHud(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6);
  }

  /**
   * A seized engine will not pull past forty until it is looked at, and
   * looking at it costs a hundred dollars at the next pump.
   */
  setWornEngine(worn) {
    this.wornEngine = worn;
    this.vehicle.limitOverride = worn ? WORN_LIMIT : null;
  }

  /**
   * Whatever was in the case at the end of the dirt track.
   *
   * Keys you already have turn back into money — a one-in-a-hundred find is
   * worth something the second time too, just not another set of keys.
   */
  handleBriefcase() {
    const v = this.vehicle;
    const found = this.sideRoads.collect(v.s, v.lateral);
    if (!found) return;

    for (let i = 0; i < 18; i++) {
      this.dust.emit(found.x, found.y + 0.5, found.z, {
        spread: 1.4,
        size: 2.4,
        life: 1.1,
        rise: 1.8,
        color: [0.7, 0.6, 0.42],
      });
    }

    let prize = found.prize;
    if (prize === PRIZE_HATCH || prize === PRIZE_SUPER) {
      const id = prize === PRIZE_SUPER ? 'hypercar' : 'hatch';
      const car = carById(id);
      if (unlockById(id)) {
        this.ui.unlockCar(car);
        this.audio.fanfare();
        this.flash('msg.caseKeys', 'good', 6, { name: car.name });
        return;
      }
      prize = PRIZE_CASH; // already in the garage
    }

    if (prize === PRIZE_WORN) {
      this.setWornEngine(true);
      this.audio.warn();
      this.flash('msg.caseWorn', 'danger', 6, {
        cost: `$${REPAIR_COST}`,
      });
      return;
    }

    this.cash += CASE_CASH;
    this.earned += CASE_CASH;
    this.audio.fanfare();
    this.flash('msg.caseCash', 'good', 3.4, { cash: `$${CASE_CASH}` });
  }

  handleCollisions() {
    const v = this.vehicle;
    const closing = this.traffic.collide(
      v.s,
      v.lateral,
      v.speed,
      this.spec.collisionRadius
    );
    if (closing > 0) {
      const severity = v.crash(closing);
      if (severity > 0) {
        this.audio.crash(severity);
        this.shake = Math.min(1.4, 0.5 + severity);
        for (let i = 0; i < 26; i++) {
          this.dust.emit(v.position.x, v.position.y + 0.7, v.position.z, {
            spread: 2.6,
            size: 3.4,
            life: 1.4,
            rise: 2.4,
            color: [0.35, 0.33, 0.32],
          });
        }
        this.flash(severity > 0.55 ? 'msg.bigCrash' : 'msg.crash', 'danger', 1.4);
      }
    }
  }

  /** Photo enforcement: rare, signposted, and $50 a shot. */
  handleSpeedCamera() {
    const v = this.vehicle;
    const caught = this.cameras.check(v.s, Math.abs(v.speed) * 3.6);
    if (caught < 0) return;
    const fine = Math.min(this.cash, FINE);
    this.cash -= fine;
    this.audio.blip(1400, 0.09, 'square', 0.2);
    this.ui.cameraFlash();
    this.flash('msg.ticket', 'danger', 3.2, { fine: `$${fine.toFixed(0)}` });
  }

  /**
   * Crates off the shoulder. Most are empty, so the swerve is a gamble: the
   * detour costs fuel and seconds, and only now and then does it pay.
   */
  handleCrates() {
    const v = this.vehicle;
    const loot = this.crates.collect(v.s, v.lateral);
    if (!loot) return;

    // Splinters and sand where the crate was.
    for (let i = 0; i < 14; i++) {
      this.dust.emit(loot.x, loot.y + 0.5, loot.z, {
        spread: 1.3,
        size: 2.2,
        life: 1.0,
        rise: 1.6,
        color: [0.66, 0.5, 0.3],
      });
    }

    if (loot.cash <= 0) {
      this.audio.blip(150, 0.14, 'sine', 0.12);
      this.flash('msg.crateEmpty', 'warn', 1.8);
      return;
    }

    this.cash += loot.cash;
    this.earned += loot.cash;
    const big = loot.cash >= BIG_PRIZE;
    if (big) this.audio.fanfare();
    else this.audio.blip(920, 0.12, 'triangle', 0.16);
    this.flash(big ? 'msg.crateBig' : 'msg.crateSmall', 'good', big ? 3.4 : 2.4, {
      cash: `$${loot.cash}`,
    });
  }

  handleRefuelling(dt) {
    const v = this.vehicle;
    const index = this.stations.zoneAt(v.s, v.lateral);
    this.inZone = index;
    const stopped = Math.abs(v.speed) < REFUEL_SPEED_LIMIT;
    const wasRefuelling = this.refuelling;
    this.refuelling = index >= 0 && stopped && v.fuel < this.spec.tank - 0.05;

    const price = index >= 0 ? fuelPricePerLitre(index) : 0;
    this.pumpPrice = price;
    if (this.refuelling && this.cash < price * 0.2) {
      this.refuelling = false; // not even a splash of it
      this.broke = true;
    }

    if (this.refuelling) {
      this.broke = false;
      if (!wasRefuelling) this.audio.blip(520, 0.12, 'triangle', 0.14);
      // Buy as many litres as the tank and the wallet allow this frame.
      const wanted = Math.min(REFUEL_RATE * dt, this.spec.tank - v.fuel);
      const affordable = price > 0 ? this.cash / price : wanted;
      const litres = Math.min(wanted, affordable);
      v.fuel += litres;
      this.cash = Math.max(0, this.cash - litres * price);
      this.spent += litres * price;
      v.engineOn = true;
      this.refuelTick -= dt;
      if (this.refuelTick <= 0) {
        this.audio.refuelTick();
        this.refuelTick = 0.12;
      }
      if (v.fuel >= this.spec.tank - 0.05 && !this.stops.has(index)) {
        this.completeStop(index);
      }
    } else if (index >= 0 && stopped && !this.stops.has(index)) {
      // Arrived with a full tank: still counts as a stop.
      this.completeStop(index);
    }
  }

  completeStop(index) {
    this.stops.add(index);
    this.audio.fanfare();
    this.flash('msg.tankFull', 'good', 2.2);
    this.repairEngine();
    this.handOverKeys();
  }

  /**
   * The pump is also the workshop. A seized engine gets looked at while the
   * tank fills, and it is not free — if the wallet cannot cover it you leave
   * still doing forty and try again at the next one.
   */
  repairEngine() {
    if (!this.wornEngine) return;
    if (this.cash < REPAIR_COST) {
      this.flash('msg.repairBroke', 'danger', 4, { cost: `$${REPAIR_COST}` });
      return;
    }
    this.cash -= REPAIR_COST;
    this.spent += REPAIR_COST;
    this.setWornEngine(false);
    this.flash('msg.repaired', 'good', 3.6, { cost: `$${REPAIR_COST}` });
  }

  /**
   * The garage catches up with you at the pump.
   *
   * Milestones are passed out on the road but only collected here, standing
   * still with the engine off — partly so the message is readable, partly
   * because a car appearing in the showroom mid-corner would be absurd.
   */
  handOverKeys() {
    for (const car of claimUnlocked(CARS)) {
      this.ui.unlockCar(car);
      this.audio.fanfare();
      this.flash('msg.unlocked', 'good', 5, { name: car.name });
    }
  }

  /** Parking at a motel and sleeping it off — free, but it costs time. */
  handleMotel(dt) {
    const v = this.vehicle;
    const index = this.motels.zoneAt(v.s, v.lateral);
    this.motelZone = index;
    const stopped = Math.abs(v.speed) < REFUEL_SPEED_LIMIT;

    // One night per visit. Sleep resets the meter, but it starts draining
    // again immediately, so without this you check in every few seconds for
    // as long as you sit in the car park and burn a week doing it.
    if (index < 0) this.sleptAt = -1;
    if (index < 0 || !stopped || index === this.sleptAt || this.fatigue.level > 0.995) {
      this.checkingIn = 0;
      return;
    }
    this.checkingIn += dt;
    if (this.checkingIn >= CHECKIN_TIME) {
      this.checkingIn = 0;
      if (this.cash < BED_COST) {
        this.sleptAt = index; // no bed tonight; do not ask again here
        this.audio.warn();
        this.flash('msg.noBed', 'danger', 4, { cost: `$${BED_COST}` });
        return;
      }
      this.cash -= BED_COST;
      this.spent += BED_COST;
      this.fatigue.sleep();
      this.sleptAt = index;
      this.beds.add(index);
      this.day += 1; // a night in a bed is what turns the calendar over
      this.audio.fanfare();
      // Every pump on the highway moves overnight, and you find out at dawn.
      // The figure quoted is what the next station down the road now charges.
      const hike = overnightHike();
      this.stations.refreshPrices();
      const nextPump = fuelPricePerLitre(nextStationIndex(v.s));
      this.flash('msg.sleptPrice', 'good', 4.5, {
        day: this.day,
        cost: `$${BED_COST}`,
        delta: `$${hike.delta.toFixed(2)}`,
        price: `$${nextPump.toFixed(2)}`,
      });
    }
  }

  /**
   * Passengers: who is waiting where you are stopped, and whether the person
   * in the car has arrived. The ride is only ever forward, so the cost of
   * taking it is the extra fuel and the promise to stop at the far end.
   */
  handleFares() {
    const v = this.vehicle;
    const kind = this.inZone >= 0 ? STATION : this.motelZone >= 0 ? MOTEL : null;
    const index = kind === STATION ? this.inZone : this.motelZone;
    const stopped = Math.abs(v.speed) < REFUEL_SPEED_LIMIT;

    // Dropping off: pay out the moment the car stops at the right place.
    if (kind && stopped && this.fares.isDestination(kind, index)) {
      const { pay } = this.fares.active;
      this.cash += pay;
      this.earned += pay;
      this.fares.clear();
      v.load = 1;
      this.audio.fanfare();
      this.flash('msg.dropOff', 'good', 3.4, { pay: `$${pay}` });
      this.offer = null;
      return;
    }

    // The passenger gives up if you drive well past where they asked for.
    if (this.fares.missed(v.s)) {
      this.fares.clear();
      v.load = 1;
      this.audio.warn();
      this.flash('msg.fareLost', 'danger', 3.2);
    }

    // Standing offer at the stop the car is rolling through.
    this.offer =
      kind && Math.abs(v.speed) < 15 ? this.fares.offerFor(kind, index) : null;
    this.canAccept = !!this.offer && stopped;
    v.load = this.fares.active ? PASSENGER_BURN : 1;
  }

  /** Takes the fare currently on offer, if the car is stopped beside it. */
  acceptFare() {
    if (this.state !== 'playing' || !this.offer || !this.canAccept) return;
    this.fares.board(this.offer);
    this.vehicle.load = PASSENGER_BURN;
    this.audio.blip(880, 0.1, 'triangle', 0.16);
    this.flash('msg.fareTaken', 'good', 3.4, {
      metres: Math.round(this.offer.distance),
      pay: `$${this.offer.pay}`,
    });
    this.offer = null;
  }

  handleStationBookkeeping() {
    const v = this.vehicle;
    const idx = Math.max(0, nextStationIndex(v.s) - 1);
    const passed = stationDistance(idx);
    if (
      v.s > passed + ZONE_HALF + 40 &&
      !this.stops.has(idx) &&
      !this.skipped.has(idx)
    ) {
      this.skipped.add(idx);
      this.audio.warn();
      this.flash('msg.skipped', 'danger', 3);
    }
  }

  checkGameOver() {
    const v = this.vehicle;
    if (v.damage >= 100) {
      this.gameOver('over.title.wrecked', 'over.text.wrecked', {
        car: this.spec.name,
        km: (v.distance / 1000).toFixed(2),
      });
      return;
    }
    if (v.fuel <= 0 && Math.abs(v.speed) < 0.6) {
      const idx = nextStationIndex(v.s);
      const short = stationDistance(idx) - v.s;
      // Dying with an empty wallet is its own kind of ending.
      const broke = this.cash < 2;
      this.gameOver(
        broke ? 'over.title.broke' : 'over.title.fuel',
        broke ? 'over.text.broke' : 'over.text.fuel',
        { km: (short / 1000).toFixed(2) }
      );
    }
  }

  emitDust(dt) {
    const v = this.vehicle;
    const speed = Math.abs(v.speed);
    let rate = 0;
    let color = [0.82, 0.68, 0.47];
    if (v.surface === SURFACE.SAND && speed > 3) rate = 26 + speed * 1.6;
    else if (v.surface === SURFACE.SHOULDER && speed > 5) rate = 10 + speed * 0.7;
    if (v.slip > 0.2 && v.surface === SURFACE.ROAD) {
      rate = Math.max(rate, v.slip * 30);
      color = [0.42, 0.4, 0.39];
    }
    if (rate <= 0) return;

    this.dustAccum += rate * dt;
    const wheels = this.carModel.userData.wheels || [];
    while (this.dustAccum >= 1) {
      this.dustAccum -= 1;
      const w = wheels[2 + ((Math.random() * 2) | 0)] || wheels[0];
      if (!w) break;
      w.root.getWorldPosition(this.tmpV);
      this.dust.emit(this.tmpV.x, this.tmpV.y - 0.15, this.tmpV.z, {
        spread: 0.7,
        size: 2.0 + speed * 0.05,
        life: 0.9 + Math.random() * 0.6,
        rise: 0.7 + speed * 0.03,
        color,
      });
    }
  }

  /** Shows a translation key for a few seconds, above the ambient messages. */
  flash(key, level, duration, params = null) {
    this.tempMessage = { key, level, params };
    this.messageTimer = duration;
  }

  pushHud(dt) {
    const v = this.vehicle;
    const spec = this.spec;
    const idx = nextStationIndex(v.s);
    const toStation = stationDistance(idx) - v.s;
    const rangeLeft = (v.fuel / spec.tank) * carRange(spec) * 0.92;
    const speedLimit = speedLimitAt(v.s);
    const motelIdx = nextMotelIndex(v.s);
    const toMotel = motelDistance(motelIdx) - v.s;

    this.ui.update({
      day: this.day,
      speedKmh: Math.abs(v.speed) * 3.6,
      speedLimit,
      topKmh: spec.topSpeed * 3.6,
      gear: v.gear,
      engineOn: v.engineOn,
      fuel: v.fuel,
      tank: spec.tank,
      rangeLeft,
      toStation,
      distance: v.distance,
      stops: this.stops.size,
      damage: v.damage,
      refuelling: this.refuelling,
      refuelProgress: v.fuel / spec.tank,
      refuelLitres: v.fuel,
      refuelCost: this.spent,
      cash: this.cash,
      pumpPrice: this.pumpPrice || 0,
      sleep: this.fatigue.level,
      clock: clockFor(this.dayPhase, this.nightOverrun),
      night: this.sky.light.lamps,
      drowsiness: this.fatigue.drowsiness,
      asleep: this.fatigue.asleep,
      toMotel,
      checkingIn: this.checkingIn / CHECKIN_TIME,
      fare: this.fares.active
        ? {
            metres: Math.round(this.fares.remaining(v.s)),
            total: Math.round(this.fares.active.distance),
            pay: this.fares.active.pay,
            destKind: this.fares.active.dest.kind,
          }
        : null,
      offer: this.offer
        ? {
            metres: Math.round(this.offer.distance),
            pay: this.offer.pay,
            destKind: this.offer.dest.kind,
            litres: extraLitresFor(spec, this.offer.distance),
            cost:
              extraLitresFor(spec, this.offer.distance) *
              fuelPricePerLitre(Math.max(0, nextStationIndex(v.s))),
            canAccept: this.canAccept,
          }
        : null,
    });

    // Message priority: temporary flashes, then situational advice.
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      this.ui.message(
        this.tempMessage.key,
        this.tempMessage.level,
        this.tempMessage.params
      );
      return;
    }

    if (this.checkingIn > 0) {
      this.ui.message('msg.checkingIn', 'good');
    } else if (this.fatigue.asleep) {
      this.ui.message('msg.asleep', 'danger');
    } else if (this.refuelling) {
      this.ui.message('msg.filling', 'good');
    } else if (this.broke && this.inZone >= 0) {
      this.ui.message('msg.noCash', 'danger');
    } else if (this.motelZone >= 0 && Math.abs(v.speed) >= REFUEL_SPEED_LIMIT) {
      this.ui.message('msg.stopToSleep', 'warn');
    } else if (this.fatigue.level <= 0) {
      this.ui.message('msg.fallingAsleep', 'danger');
    } else if (this.inZone >= 0 && Math.abs(v.speed) >= REFUEL_SPEED_LIMIT) {
      this.ui.message('msg.stopToRefuel', 'warn');
    } else if (!v.engineOn) {
      this.ui.message('msg.outOfFuel', 'danger');
    } else if (toStation > rangeLeft) {
      this.ui.message('msg.wontMakeIt', 'danger');
    } else if (this.fares.active && this.fares.remaining(v.s) < 350) {
      this.ui.message('msg.dropOffAhead', 'warn');
    } else if (this.wornEngine) {
      this.ui.message('msg.wornRunning', 'danger');
    } else if (this.fatigue.level < 0.2) {
      this.ui.message('msg.drowsy', 'warn');
    } else if (v.fuel / spec.tank < 0.25) {
      this.ui.message('msg.lowFuel', 'warn');
    } else {
      this.ui.message('');
    }

    if (v.fuel / spec.tank < 0.15 && !this.lowFuelWarned) {
      this.lowFuelWarned = true;
      this.audio.warn();
    }
    if (v.fuel / spec.tank > 0.3) this.lowFuelWarned = false;

    if (this.fatigue.level < 0.25 && !this.drowsyWarned) {
      this.drowsyWarned = true;
      this.audio.warn();
    }
    if (this.fatigue.level > 0.5) this.drowsyWarned = false;
  }

  /* ---------------------------------------------------------------- */

  snapCamera() {
    this.desiredCamera(this.camPos, this.camLook);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  desiredCamera(outPos, outLook) {
    const v = this.vehicle;
    const spec = this.spec;
    const mode = this.state === 'menu' ? 'orbit' : CAMERA_MODES[this.cameraMode];

    if (mode === 'orbit') {
      const r = this.state === 'menu' ? 8.2 : 12;
      const a = this.orbitAngle;
      outPos.set(
        v.position.x + Math.sin(a) * r,
        v.position.y + (this.state === 'menu' ? 2.0 : 5),
        v.position.z + Math.cos(a) * r
      );
      outLook.set(v.position.x, v.position.y + 0.85, v.position.z);
      return;
    }

    if (mode === 'hood') {
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        v.yaw
      );
      // Just ahead of the windscreen, above the bonnet.
      outPos.set(
        v.position.x + forward.x * spec.hood.forward,
        v.position.y + spec.hood.height,
        v.position.z + forward.z * spec.hood.forward
      );
      outLook.set(
        v.position.x + forward.x * 30,
        v.position.y + spec.hood.height + 0.2,
        v.position.z + forward.z * 30
      );
      return;
    }

    // Chase camera, slightly swung out when sliding.
    const yaw = v.yaw + v.slip * 0.18 * Math.sign(v.steer || 1);
    const back = spec.camera.back + Math.abs(v.speed) * 0.035;
    outPos.set(
      v.position.x + Math.sin(yaw) * back,
      v.position.y + spec.camera.height,
      v.position.z + Math.cos(yaw) * back
    );
    outLook.set(
      v.position.x - Math.sin(v.yaw) * spec.camera.look,
      v.position.y + 1.1,
      v.position.z - Math.cos(v.yaw) * spec.camera.look
    );
  }

  updateCamera(dt) {
    const v = this.vehicle;
    this.desiredCamera(this.tmpV, this.camLook);
    const mode = this.state === 'menu' ? 'orbit' : CAMERA_MODES[this.cameraMode];
    const lag = mode === 'hood' ? 1 : 1 - Math.pow(0.0016, dt);
    this.camera.position.lerp(this.tmpV, lag);

    // Keep the camera above the ground when the car dives into a dip.
    const minY = terrainHeight(v.s, v.lateral) + 0.9;
    if (this.camera.position.y < minY) this.camera.position.y = minY;

    if (this.shake > 0) {
      const k = this.shake * 0.28;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
    }
    this.camera.lookAt(this.camLook);

    const targetFov =
      58 + (Math.abs(v.speed) / this.spec.topSpeed) * 15 + this.shake * 2;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.updateProjectionMatrix();
  }
}
