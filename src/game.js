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
  advanceOf,
  balanceOf,
  PASSENGER_BURN,
} from './fares.js';
import { BusStops } from './world/busStops.js';
import { stormLevel, metresToStorm } from './weather.js';
import { Wildlife } from './world/wildlife.js';
import { Landmarks } from './world/landmarks.js';
import { Police } from './world/police.js';
import { counter, buy as buyUpgrade, emptyUpgrades, applyUpgrades } from './workshop.js';
import { Freight, FREIGHT_BURN, loadAt } from './freight.js';
import { RoadSigns, SpeedCameras, speedLimitAt, FINE } from './world/signs.js';
import { createSky } from './world/sky.js';
import { Headlights } from './world/headlights.js';
import { setNightGlow } from './world/nightlights.js';
import { clockFor, DAY_START_HOUR, NIGHT_HOUR } from './daynight.js';
import { setWorldSeed, worldSeed, hashRand } from './rng.js';
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

/** How hard the wind pushes, in metres per second of drift, at full storm. */
const WIND_DRIFT = 1.5;

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
    this.sandAccum = 0;
    this.windA = { x: 0, y: 0, z: 0 };
    this.windB = { x: 0, y: 0, z: 0 };
    this.stops = new Set();
    this.skipped = new Set();
    this.messageTimer = 0;
    this.tempMessage = null;
    this.inZone = -1;
    this.motelZone = -1;
    this.busZone = -1;
    this.atShop = false;
    /** What the workshop counter is showing right now. */
    this.shopRows = [];
    /** Everything bought this run. Never saved to the garage. */
    this.upgrades = emptyUpgrades();
    /** 0 clear, 1 the worst of a sandstorm. */
    this.storm = 0;
    this.stormWarned = false;
    this.gust = 0;
    /** Fastest the run ever went, for the card at the end of it. */
    this.topSpeed = 0;
    /** Metres into the current ride at which the passenger next speaks. */
    this.chatAt = 0;
    this.chatLast = -1;
    /** Cheat-menu toggle. Never saved, never on unless you turned it on. */
    this.godMode = false;
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
    this.freight = new Freight();
    this.offer = null;
    /** Bound once: the shelters ask this every frame who is still waiting. */
    this.busWaiter = (index) => this.fares.hasWaiter(index);

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
    this.signs = new RoadSigns(this.scene);
    this.cameras = new SpeedCameras(this.scene);
    this.motels = new Motels(this.scene);
    this.buses = new BusStops(this.scene);
    this.sideRoads = new SideRoads(this.scene);
    this.wildlife = new Wildlife(this.scene);
    this.landmarks = new Landmarks(this.scene);
    this.police = new Police(this.scene);
    // Everything with words painted on it has to be repainted when the
    // language changes, roadside signage included.
    onLanguageChange(() => {
      this.stations.retranslate();
      this.motels.retranslate();
    });
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
      this.acceptOffer();
    } else if (action.startsWith('shop')) {
      this.ui.buyShopSlot(Number(action.slice(4)) - 1);
    } else if (action === 'horn') {
      this.audio.horn();
      this.wildlife.spook(this.vehicle.s);
    } else if (action === 'mute') {
      this.toggleMute();
    } else if (action === 'enter' && this.state === 'menu') {
      this.start(this.ui.selected);
    }
  }

  /** Silences everything, or brings it back. Button and `M` share this. */
  toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    this.ui.setMuted(this.audio.muted);
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
    this.wildlife.reset();
    this.police.reset();
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
    this.freight.reset();
    this.offer = null;
    this.busZone = -1;
    this.atShop = false;
    this.shopRows = [];
    this.upgrades = emptyUpgrades();
    applyUpgrades(this);
    this.blownWarned = false;
    this.tyreWarned = false;
    this.topSpeed = 0;
    this.chatAt = 0;
    this.chatLast = -1;
    this.storm = 0;
    this.stormWarned = false;
    this.gust = 0;
    this.vehicle.crosswind = 0;
    this.vehicle.load = 1;
    this.earned = 0;
    this.lowFuelWarned = false;
    this.drowsyWarned = false;
    this.cameraMode = 0;
    this.state = 'playing';
    // The dial belongs to the car, and a resumed run can arrive in one the
    // menu never selected.
    this.ui.buildSpeedo(this.spec);
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
      fare: this.fares.active ? this.fares.active.index : null,
      cameraMode: this.cameraMode,
      seed: worldSeed(),
      cases: [...this.sideRoads.taken],
      worn: this.wornEngine,
      freight: this.freight.active ? this.freight.active.index : null,
      freightHurt: this.freight.hurt,
      freightTaken: [...this.freight.taken],
      tyre: this.vehicle.tyre,
      blown: this.vehicle.blown,
      upgrades: { ...this.upgrades },
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
    this.fares.active = run.fare == null ? null : offerAt(run.fare);
    v.load =
      (this.fares.active ? PASSENGER_BURN : 1) + FREIGHT_BURN * v.freight;

    // Rebuild the world around wherever we came back to.
    this.road.update(v.s);
    this.stations.update(v.s);
    this.stations.refreshPrices();
    this.signs.update(v.s);
    this.cameras.reset(v.s);
    this.motels.update(v.s);
    this.buses.update(v.s, this.busWaiter);
    this.landmarks.update(v.s);
    this.props.roadside.update(v.s);
    this.sideRoads.taken = new Set(run.cases || []);
    this.sideRoads.update(v.s);
    this.setWornEngine(!!run.worn);
    this.freight.taken = new Set(run.freightTaken || []);
    this.freight.active =
      run.freight == null ? null : loadAt(run.freight);
    this.freight.hurt = run.freightHurt || 0;
    v.freight = this.freight.active ? 1 : 0;
    v.tyre = run.tyre ?? 100;
    v.blown = !!run.blown;
    this.upgrades = { ...emptyUpgrades(), ...(run.upgrades || {}) };
    applyUpgrades(this);
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
      earned: this.earned,
      spent: this.spent,
      fares: this.fares.used.size,
      topSpeed: this.topSpeed * 3.6,
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

    this.sky.setStorm(this.storm);
    const light = this.sky.setPhase(this.dayPhase, this.clock.elapsedTime);
    this.headlights.setLevel(light.lamps);
    setNightGlow(Math.min(1, Math.max(0, (light.neon - 0.9) / 1.5)));
    this.renderer.toneMappingExposure = light.exposure;
  }

  /** Snaps the sky to whatever the sleep meter says, with no dawn sweep. */
  jumpClock() {
    this.dayPhase = 1 - this.fatigue.level;
    this.nightOverrun = 0;
    this.advanceClock(0);
    this.sky.update(this.vehicle.position);
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

    if (!frozen) this.updateWeather(dt);
    v.update(dt, input);
    // Debug only, and never saved: the cheat menu's one toggle.
    if (this.godMode) {
      v.fuel = v.tankSize;
      v.damage = 0;
    }
    if (!frozen) {
      // Lifetime odometer: what the unlocks are measured against.
      addMetres(v.distance - this.bankedDistance);
      this.bankedDistance = v.distance;
    }

    if (!frozen) this.topSpeed = Math.max(this.topSpeed, Math.abs(v.speed));

    this.road.update(v.s);
    this.stations.update(v.s);
    this.signs.update(v.s);
    this.cameras.update(dt, v.s);
    this.motels.update(v.s);
    this.buses.update(v.s, this.busWaiter);
    this.sideRoads.update(v.s);
    this.landmarks.update(v.s);
    this.props.roadside.update(v.s);
    this.traffic.update(dt, v.s);
    this.wildlife.update(dt, v.s, this.sky.light.lamps);

    if (!frozen) {
      this.handleTyres();
      this.handlePolice(dt);
      this.handleCollisions();
      this.handleSpeedCamera();
      this.handleCrates();
      this.handleBriefcase();
      this.handleRefuelling(dt);
      this.handleMotel(dt);
      this.handleFares();
      this.handleChat();
      this.shopRows = this.atShop ? counter(this) : [];
      this.handleFreight();
      this.handleStationBookkeeping();
      this.checkGameOver();

      this.saveTick -= dt;
      if (this.saveTick <= 0) this.parkRun();
    }

    this.orbitAngle += dt * 0.3;
    this.emitDust(dt);
    this.emitSand(dt);
    this.audio.updateEngine({
      rpm: v.rpm,
      throttle: input.throttle,
      speed: Math.abs(v.speed),
      slip: v.slip,
      engineOn: v.engineOn,
      surface: v.surface,
      wind: this.storm,
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
    // A deer is softer than a semi and takes about a third of the hit, but
    // at a hundred and forty in the dark that is still a night at the pump.
    const deer = this.wildlife.collide(
      v.s,
      v.lateral,
      v.speed,
      this.spec.collisionRadius
    );
    if (deer > 0) {
      const severity = v.crash(deer * 0.34);
      if (severity > 0) {
        this.audio.crash(severity * 0.8);
        this.shake = Math.min(1.1, 0.4 + severity);
        for (let i = 0; i < 18; i++) {
          this.dust.emit(v.position.x, v.position.y + 0.6, v.position.z, {
            spread: 2.2,
            size: 2.6,
            life: 1,
            rise: 2.2,
            color: [0.48, 0.36, 0.25],
          });
        }
      }
      this.flash('msg.deer', 'danger', 3.4);
    }
    const closing = this.traffic.collide(
      v.s,
      v.lateral,
      v.speed,
      this.spec.collisionRadius
    );
    if (closing > 0) {
      const severity = v.crash(closing);
      if (severity > 0 && this.freight.active) {
        this.freight.hurt = Math.min(1, this.freight.hurt + severity * 0.4);
      }
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
    this.refuelling = index >= 0 && stopped && v.fuel < v.tankSize - 0.05;

    // The pump is the workshop: standing still on a forecourt is the one
    // place anything about the car can be changed.
    this.atShop = index >= 0 && stopped;

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
      const wanted = Math.min(REFUEL_RATE * dt, v.tankSize - v.fuel);
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
      if (v.fuel >= v.tankSize - 0.05 && !this.stops.has(index)) {
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
   * Passengers: who is waiting at the shelter you are pulled up at, and
   * whether the person in the car has arrived. The ride is only ever forward,
   * so the cost of taking it is the extra fuel and the promise to pull in at
   * the far end.
   */
  handleFares() {
    const v = this.vehicle;
    const index = this.buses.zoneAt(v.s, v.lateral);
    this.busZone = index;
    const stopped = Math.abs(v.speed) < REFUEL_SPEED_LIMIT;

    // Dropping off: the balance is handed over the moment the car stops at
    // the right shelter. The other half was paid at the kerb.
    if (index >= 0 && stopped && this.fares.isDestination(index)) {
      const balance = balanceOf(this.fares.active);
      this.cash += balance;
      this.earned += balance;
      this.fares.clear();
      v.load = 1 + FREIGHT_BURN * v.freight;
      this.audio.fanfare();
      this.flash('msg.dropOff', 'good', 3.4, { pay: `$${balance}` });
      this.offer = null;
      return;
    }

    // The passenger gives up if you drive well past where they asked for.
    // They do not ask for the advance back — they just get out.
    if (this.fares.missed(v.s)) {
      const lost = balanceOf(this.fares.active);
      this.fares.clear();
      v.load = 1 + FREIGHT_BURN * v.freight;
      this.audio.warn();
      this.flash('msg.fareLost', 'danger', 3.6, { lost: `$${lost}` });
    }

    // Standing offer at the shelter the car is rolling through.
    this.offer =
      index >= 0 && Math.abs(v.speed) < 15 ? this.fares.offerFor(index) : null;
    this.canAccept = !!this.offer && stopped;
    v.load =
      (this.fares.active ? PASSENGER_BURN : 1) + FREIGHT_BURN * v.freight;
  }

  /**
   * One key for whatever is being offered.
   *
   * A fare and a body shop can never be in front of you at the same time —
   * the shelters are kept clear of the station plots — so `E` never has to
   * choose, and there is no second key to learn.
   */
  acceptOffer() {
    if (this.offer && this.canAccept) this.acceptFare();
    else this.buyFromShop(this.shopRows[0] && this.shopRows[0].id);
  }

  /**
   * Buys one line off the workshop counter.
   *
   * Everything it sells lives on the car for this run and nowhere else: the
   * spec objects are shared between runs, so the upgrades are counters on
   * the game and multipliers on the vehicle.
   */
  buyFromShop(id) {
    if (this.state === 'over' || !this.atShop || !id) return;
    if (id === 'freight') {
      this.toggleFreight();
      return;
    }
    const result = buyUpgrade(this, id);
    if (!result.ok) {
      this.audio.warn();
      this.flash('msg.cannotAfford', 'danger', 2.6, {
        cost: `$${Math.round(result.price || 0)}`,
      });
      return;
    }
    this.audio.fanfare();
    this.flash(`msg.bought.${result.id}`, 'good', 3.2, {
      cost: `$${result.price}`,
    });
  }

  /**
   * The passenger says something, every couple of kilometres.
   *
   * A fare was a number that walked into the car and a number that walked
   * out of it. One line every two thousand metres is enough to make it a
   * person instead, and rare enough that it never becomes chatter — a long
   * ride is five or six of them, spread over a quarter of an hour.
   *
   * Which line is deterministic from the ride and the count, so a passenger
   * never repeats themselves and a resumed run carries on where it was.
   */
  handleChat() {
    const fare = this.fares.active;
    if (!fare) {
      this.chatAt = 0;
      return;
    }
    const gone = this.vehicle.s - fare.from;
    if (gone < CHAT_EVERY || gone < this.chatAt) return;
    const n = Math.floor(gone / CHAT_EVERY);
    this.chatAt = (n + 1) * CHAT_EVERY;
    let line = Math.floor(hashRand(fare.index * 31 + n, 7717) * CHAT_LINES);
    // Twelve lines and a hash will collide; nobody says the same thing twice
    // in a row, so step off it when it does.
    if (line === this.chatLast) line = (line + 1) % CHAT_LINES;
    this.chatLast = line;
    this.flash(`chat.${line}`, 'chat', 5);
  }

  /**
   * The dock, and the load in the back.
   *
   * It rides on the workshop counter rather than a panel of its own: it is
   * the same forecourt, the same stop, and one list of things you can do
   * while standing on it is easier to read than three.
   */
  handleFreight() {
    const v = this.vehicle;
    if (!this.atShop) {
      v.freight = this.freight.active ? 1 : 0;
      return;
    }
    const index = this.inZone;
    if (this.freight.isDestination(index)) {
      const paid = this.freight.worth();
      this.shopRows.push({
        id: 'freight',
        key: this.freight.hurt > 0.02 ? 'shop.deliverHurt' : 'shop.deliver',
        pay: paid,
        price: 0,
        owned: 0,
        max: 0,
        affordable: true,
      });
      return;
    }
    const load = this.freight.offerFor(index);
    if (!load) return;
    this.shopRows.push({
      id: 'freight',
      key: 'shop.takeLoad',
      pay: load.pay,
      km: (load.distance / 1000).toFixed(0),
      price: 0,
      owned: 0,
      max: 0,
      affordable: true,
    });
  }

  /** Takes a load on, or hands one over. */
  toggleFreight() {
    const index = this.inZone;
    if (this.freight.isDestination(index)) {
      const paid = this.freight.worth();
      this.cash += paid;
      this.earned += paid;
      const hurt = this.freight.hurt;
      this.freight.clear();
      this.vehicle.freight = 0;
      this.audio.fanfare();
      this.flash(hurt > 0.02 ? 'msg.freightHurt' : 'msg.freightPaid', 'good', 4, {
        pay: `$${paid}`,
        lost: `${Math.round(hurt * 100)}%`,
      });
      return;
    }
    const load = this.freight.offerFor(index);
    if (!load) return;
    this.freight.take(load);
    this.vehicle.freight = 1;
    this.audio.blip(420, 0.14, 'square', 0.16);
    this.flash('msg.freightTaken', 'good', 4, {
      km: `${(load.distance / 1000).toFixed(0)} km`,
      pay: `$${load.pay}`,
    });
  }

  /**
   * The patrol car, and what it costs.
   *
   * The fine is bigger than the camera's by a distance, and it takes the
   * time as well: you have to actually stop, which on a road where the sleep
   * meter is the clock is most of what it costs you.
   */
  handlePolice(dt) {
    const v = this.vehicle;
    const limit = speedLimitAt(v.s) / 3.6;
    const event = this.police.update(dt, v.s, Math.abs(v.speed), limit);
    if (event.started) {
      this.audio.warn();
      this.flash('msg.copsOn', 'danger', 4.5);
    }
    if (event.fine) {
      this.cash = Math.max(0, this.cash - event.fine);
      this.spent += event.fine;
      this.audio.fail();
      this.flash('msg.copsFine', 'danger', 5, {
        fine: `$${event.fine}`,
        over: `${event.over}`,
      });
    }
    if (event.lost) {
      this.audio.blip(300, 0.2, 'sine', 0.12);
      this.flash('msg.copsLost', 'good', 3.4);
    }
  }

  /** Says something the two times the rubber matters. */
  handleTyres() {
    const v = this.vehicle;
    if (v.blown && !this.blownWarned) {
      this.blownWarned = true;
      this.audio.crash(0.5);
      this.shake = 0.7;
      this.flash('msg.blowout', 'danger', 4.5);
    }
    if (!v.blown) this.blownWarned = false;
    if (v.tyre < 18 && !v.blown && !this.tyreWarned) {
      this.tyreWarned = true;
      this.audio.warn();
      this.flash('msg.tyresLow', 'danger', 3.4);
    }
    if (v.tyre > 30) this.tyreWarned = false;
  }

  /**
   * The wind, and what it does to the car.
   *
   * The storm belongs to a stretch of road rather than to a clock, so it is
   * read straight off the odometer and needs nothing in the save. The gust
   * is the only part that is not deterministic, and it is only ever a
   * wobble on top of a steady push.
   */
  updateWeather(dt) {
    const v = this.vehicle;
    const level = stormLevel(v.s);
    this.storm = level;

    // A steady lean plus a slow gust, so holding a lane is work rather than
    // a one-off correction. The side comes off the odometer, so a given
    // storm always blows the same way.
    this.gust += dt * 1.7;
    const side = Math.sin(v.s * 0.0007) >= 0 ? 1 : -1;
    const gust = 0.6 + 0.4 * Math.sin(this.gust) * Math.sin(this.gust * 0.37);
    // Scaled by speed, because wind does not push a parked car down the
    // road, and because you cannot steer out of a drift you cannot steer.
    // Stopped at a pump in a storm you stay where you are.
    const grip = Math.min(1, Math.abs(v.speed) / 10);
    v.crosswind = side * level * WIND_DRIFT * gust * grip;

    const ahead = metresToStorm(v.s);
    if (!this.stormWarned && ahead < 900) {
      this.stormWarned = true;
      this.audio.warn();
      this.flash('msg.stormAhead', 'danger', 4.5);
    } else if (this.stormWarned && level <= 0 && ahead > 2000) {
      this.stormWarned = false;
      this.flash('msg.stormOver', 'good', 3);
    }
  }

  /** Takes the fare currently on offer, if the car is stopped beside it. */
  acceptFare() {
    if (this.state !== 'playing' || !this.offer || !this.canAccept) return;
    const advance = advanceOf(this.offer);
    this.fares.board(this.offer);
    this.cash += advance;
    this.earned += advance;
    this.vehicle.load = PASSENGER_BURN;
    this.audio.blip(880, 0.1, 'triangle', 0.16);
    this.flash('msg.fareTaken', 'good', 3.8, {
      distance: `${(this.offer.distance / 1000).toFixed(1)} km`,
      paid: `$${advance}`,
      rest: `$${balanceOf(this.offer)}`,
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

  /**
   * Sand blowing past the car in a storm.
   *
   * Seeded around the camera rather than the wheels: it is the air that is
   * full of it, not the ground, and what sells a sandstorm is the stuff
   * going past your face at the speed of the wind whether you are moving or
   * not. It rides the same particle pool as the tyre dust, so a storm costs
   * nothing but the emission.
   */
  emitSand(dt) {
    if (this.storm < 0.05) return;
    this.sandAccum += this.storm * 170 * dt;
    const c = this.camera.position;
    // Blown along the road's lateral axis, the same way the car is being
    // pushed, and fast: what sells a storm from inside a stopped car is that
    // the air is still moving.
    const a = roadPoint(this.vehicle.s, 0, this.windA);
    const b = roadPoint(this.vehicle.s, 1, this.windB);
    const push = Math.sign(this.vehicle.crosswind || 1) * (7 + this.storm * 16);
    while (this.sandAccum >= 1) {
      this.sandAccum -= 1;
      this.dust.emit(
        c.x + (Math.random() - 0.5) * 40,
        c.y - 4 + Math.random() * 11,
        c.z + (Math.random() - 0.5) * 40,
        {
          spread: 4,
          size: 4 + Math.random() * 7,
          life: 0.4 + Math.random() * 0.5,
          rise: 0.5,
          driftX: (b.x - a.x) * push,
          driftZ: (b.z - a.z) * push,
          color: [0.88, 0.74, 0.5],
        }
      );
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
      tank: v.tankSize,
      rangeLeft,
      toStation,
      distance: v.distance,
      stops: this.stops.size,
      damage: v.damage,
      refuelling: this.refuelling,
      refuelProgress: v.fuel / v.tankSize,
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
      storm: this.storm,
      tyre: v.tyre,
      blown: v.blown,
      shop: this.atShop ? this.shopRows : null,
      fare: this.fares.active
        ? {
            metres: Math.round(this.fares.remaining(v.s)),
            total: Math.round(this.fares.active.distance),
            pay: balanceOf(this.fares.active),
            hops: this.fares.active.hops,
          }
        : null,
      offer: this.offer
        ? {
            metres: Math.round(this.offer.distance),
            pay: this.offer.pay,
            advance: advanceOf(this.offer),
            hops: this.offer.hops,
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
    } else if (v.fuel / v.tankSize < 0.25) {
      this.ui.message('msg.lowFuel', 'warn');
    } else {
      this.ui.message('');
    }

    if (v.fuel / v.tankSize < 0.15 && !this.lowFuelWarned) {
      this.lowFuelWarned = true;
      this.audio.warn();
    }
    if (v.fuel / v.tankSize > 0.3) this.lowFuelWarned = false;

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
