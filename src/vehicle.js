/**
 * Arcade vehicle dynamics: a bicycle model with a grip limit, plus the fuel
 * bookkeeping that the whole game is built around.
 */
import * as THREE from 'three';
import {
  roadCoords,
  roadPoint,
  roadPitch,
  roadYaw,
  ROAD_HALF,
  EDGE,
} from './track.js';
import { terrainHeight } from './world/road.js';
import { noise2 } from './rng.js';

const WHEELBASE = 2.85;
const GEARS = [0.0, 0.16, 0.32, 0.5, 0.68, 0.85, 1.0];

export const SURFACE = { ROAD: 'road', SHOULDER: 'shoulder', SAND: 'sand' };

export class Vehicle {
  constructor(spec, model) {
    this.spec = spec;
    this.model = model;

    this.s = 0;
    this.lateral = 0;
    this.position = new THREE.Vector3(0, 0, 0);
    this.yaw = 0; // world heading; 0 = straight down the road
    this.speed = 0;
    this.steer = 0;
    this.fuel = spec.tank;
    this.damage = 0;
    this.distance = 0;

    this.slip = 0; // 0..1, how far past the grip limit we are
    this.wheelSpin = 0;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.bounce = 0;
    this.surface = SURFACE.ROAD;
    /** Multiplier on fuel burn — above 1 when carrying a passenger. */
    this.load = 1;
    this.engineOn = true;
    this.rpm = 0.15;
    this.gear = 1;
    this.crashCooldown = 0;
    this.tmp = { s: 0, lateral: 0 };
  }

  reset(startS = 0) {
    this.s = startS;
    this.lateral = 2.3; // right-hand lane, American style
    this.yaw = roadYaw(startS);
    this.speed = 0;
    this.fuel = this.spec.tank;
    this.damage = 0;
    this.distance = 0;
    this.engineOn = true;
    this.slip = 0;
    this.crashCooldown = 0;
    const p = this.worldFromTrack(this.s, this.lateral);
    this.position.copy(p);
    this.syncModel(0);
  }

  worldFromTrack(s, lateral) {
    const p = roadPoint(s, lateral);
    return new THREE.Vector3(p.x, terrainHeight(s, lateral), p.z);
  }

  surfaceAt(lateral) {
    const d = Math.abs(lateral);
    if (d <= ROAD_HALF) return SURFACE.ROAD;
    if (d <= EDGE) return SURFACE.SHOULDER;
    return SURFACE.SAND;
  }

  /** @param {{throttle:number, brake:number, steer:number, handbrake:boolean}} input */
  update(dt, input) {
    const spec = this.spec;
    const surface = this.surfaceAt(this.lateral);
    this.surface = surface;

    const onTarmac = surface === SURFACE.ROAD;
    const grip =
      surface === SURFACE.ROAD
        ? spec.grip
        : surface === SURFACE.SHOULDER
          ? spec.grip * 0.62 + spec.offroadGrip * 0.38
          : spec.offroadGrip;
    const surfaceDrag =
      surface === SURFACE.ROAD ? 0 : surface === SURFACE.SHOULDER ? spec.offroadDrag * 0.35 : spec.offroadDrag;

    const outOfFuel = this.fuel <= 0;
    if (outOfFuel) this.engineOn = false;

    const throttle = this.engineOn ? input.throttle : 0;
    const topSpeed = onTarmac
      ? spec.topSpeed
      : spec.topSpeed * (0.32 + 0.55 * spec.offroadGrip);

    // Longitudinal forces.
    let a = 0;
    const v = this.speed;
    if (throttle > 0) {
      const fade = Math.max(0, 1 - Math.abs(v) / topSpeed);
      a += spec.power * throttle * (0.35 + 0.65 * fade);
    }
    a -= 0.0055 * v * Math.abs(v); // aero drag
    a -= Math.sign(v) * (0.55 + surfaceDrag); // rolling resistance
    if (input.brake > 0) {
      if (v > 0.4) {
        a -= spec.brakePower * input.brake;
      } else if (this.engineOn) {
        a -= spec.power * 0.5 * input.brake; // reverse
      }
    }
    if (input.handbrake) a -= 14 * Math.sign(v);

    this.speed += a * dt;
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    // A restricted moped has an engine that would pull harder and a limiter
    // that will not let it: the fade above uses what the motor can do, this
    // caps what comes out. Without the split it would sag short of the
    // number on the sticker, the way an unrestricted engine tails off.
    const ceiling = spec.speedLimit
      ? Math.min(spec.speedLimit, topSpeed * 1.02)
      : topSpeed * 1.02;
    this.speed = THREE.MathUtils.clamp(this.speed, -9, ceiling);

    // Steering: bicycle model, with the turn rate capped by available grip.
    const steerLimit = 0.62 / (1 + Math.abs(this.speed) * 0.055);
    const target = input.steer * steerLimit;
    this.steer += (target - this.steer) * Math.min(1, dt * 9);

    const speedAbs = Math.abs(this.speed);
    // Positive steer is to the right, which decreases the yaw angle.
    let yawRate = -(this.speed / WHEELBASE) * Math.tan(this.steer);
    const maxLatAccel = 9.0 * grip;
    const latAccel = Math.abs(yawRate * this.speed);
    if (latAccel > maxLatAccel && speedAbs > 1) {
      const k = maxLatAccel / latAccel;
      yawRate *= k;
      this.slip = Math.min(1, this.slip + (1 - k) * dt * 6);
      // Sliding wide scrubs speed off.
      this.speed -= (1 - k) * speedAbs * 0.55 * dt;
    } else {
      this.slip = Math.max(0, this.slip - dt * 2.2);
    }
    if (input.handbrake && speedAbs > 4) {
      yawRate *= 1.35;
      this.slip = Math.min(1, this.slip + dt * 2.5);
    }
    this.yaw += yawRate * dt;

    // Integrate position: local -Z is forward.
    const step = this.speed * dt;
    this.position.x -= Math.sin(this.yaw) * step;
    this.position.z -= Math.cos(this.yaw) * step;

    roadCoords(this.position.x, this.position.z, this.tmp);
    const advanced = this.tmp.s - this.s;
    this.s = this.tmp.s;
    this.lateral = this.tmp.lateral;
    if (advanced > 0) this.distance += advanced;

    // Fuel burn: distance based, plus idle drain and an off-road penalty.
    if (this.engineOn) {
      const penalty = surface === SURFACE.SAND ? 1.7 : surface === SURFACE.SHOULDER ? 1.25 : 1;
      const perMetre = spec.burn * (0.55 + 0.6 * throttle) * penalty * this.load;
      this.fuel -= perMetre * Math.abs(step) + spec.idleBurn * dt;
      if (this.fuel <= 0) {
        this.fuel = 0;
        this.engineOn = false;
      }
    }

    // Rev counter (used by the HUD and the engine sound).
    const ratio = THREE.MathUtils.clamp(speedAbs / spec.topSpeed, 0, 1);
    let gear = 1;
    while (gear < GEARS.length - 1 && ratio > GEARS[gear]) gear++;
    const lo = GEARS[gear - 1];
    const hi = GEARS[gear];
    this.gear = gear;
    const band = (ratio - lo) / Math.max(0.0001, hi - lo);
    const targetRpm = this.engineOn
      ? THREE.MathUtils.clamp(0.18 + band * 0.82 + throttle * 0.08, 0.12, 1)
      : 0;
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 6);

    this.wheelSpin -= step / 0.36;
    if (this.crashCooldown > 0) this.crashCooldown -= dt;

    this.syncModel(dt, input);
  }

  /** Places the model on the ground and adds body roll, pitch and bounce. */
  syncModel(dt, input = { throttle: 0, brake: 0 }) {
    const groundY = terrainHeight(this.s, this.lateral);
    let bump = 0;
    if (this.surface !== SURFACE.ROAD) {
      const amp = this.surface === SURFACE.SAND ? 0.075 : 0.035;
      bump =
        (noise2(this.position.x * 0.9, this.position.z * 0.9, 5) - 0.5) *
        amp *
        Math.min(1, Math.abs(this.speed) / 12);
    }
    this.bounce += (bump - this.bounce) * Math.min(1, dt * 14);

    const targetRoll = this.steer * Math.min(1, Math.abs(this.speed) / 22) * 0.35;
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(1, dt * 6);
    // Dive under braking, squat under power.
    const accelPitch =
      (input.throttle > 0 ? 0.03 : 0) - (input.brake > 0 ? 0.05 : 0);
    this.bodyPitch += (accelPitch - this.bodyPitch) * Math.min(1, dt * 5);

    this.model.position.set(
      this.position.x,
      groundY + this.bounce,
      this.position.z
    );
    this.model.rotation.set(0, 0, 0);
    this.model.rotateY(this.yaw);
    this.model.rotateX(roadPitch(this.s) + this.bodyPitch);
    this.model.rotateZ(this.bodyRoll);
    this.position.y = groundY;

    for (const w of this.model.userData.wheels || []) {
      w.spin.rotation.x = this.wheelSpin * (0.36 / w.radius);
      if (w.front) w.root.rotation.y = -this.steer * 0.9;
    }
  }

  /** Head-on or rear-end hit with another vehicle. */
  crash(closingSpeed) {
    if (this.crashCooldown > 0) return 0;
    this.crashCooldown = 1.2;
    const severity = THREE.MathUtils.clamp(closingSpeed / 55, 0.12, 1);
    this.damage = Math.min(100, this.damage + severity * 48);
    this.speed *= 0.25;
    this.yaw += (Math.random() - 0.5) * severity * 1.1;
    this.fuel = Math.max(0, this.fuel - severity * 3.5);
    return severity;
  }
}
