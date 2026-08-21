/**
 * Localisation. Every user-facing string lives here, keyed by id.
 *
 * The language is picked from localStorage, falling back to the browser's
 * preference, and can be switched at runtime — listeners re-render the menu,
 * the HUD and even the roadside signage.
 */

export const LANGUAGES = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'es', label: 'ES', name: 'Español' },
];

const STORAGE_KEY = 'desert-run.lang';

const STRINGS = {
  en: {
    'app.title': 'Desert Run — Fuel or Die',
    'app.description':
      'A 3D desert highway driving game: pick your car, watch the gauge, and never skip a gas station.',

    'loading.text': 'Building the highway…',

    'menu.strap':
      'Route 66, dawn to dark, no cell service. The pumps are a long way apart — <b>skip one too many and you die out there.</b>',
    'menu.start': 'START ENGINE',
    'menu.resume': 'BACK ON THE ROAD',
    'menu.resumeAt': 'Day {day} · {km} · {cash} · {car}',
    'menu.startFresh': 'START A NEW RUN',
    'menu.language': 'Language',

    'controls.drive': '/ arrows drive',
    'controls.handbrake': 'handbrake',
    'controls.camera': 'camera',
    'controls.pause': 'pause',
    'controls.mute': 'mute',
    'controls.fare': 'take a fare',

    'spec.topSpeed': 'Top speed',
    'spec.accel': 'Acceleration',
    'spec.grip': 'Grip',
    'spec.offroad': 'Off-road',
    'spec.tank': 'Tank',
    'spec.range': 'Range',

    'car.sport.tagline': 'Mid-engine road weapon',
    'car.race.tagline': 'GT prototype, thirsty and vicious',
    'car.4x4.tagline': 'Slow, unstoppable, huge tank',
    'car.moped.tagline': 'Sips fuel, 45 km/h, one hit and it is over',
    'car.yacht.tagline': 'Two tonnes of chrome and a lounge for a cabin',
    'car.trophy.tagline': 'The sand is a shortcut, not an obstacle',
    'car.superbike.tagline': 'Three hundred an hour on seventeen litres',
    'car.locked': '??? ??? ???',
    'car.lockedHint': 'Locked — fill up after {km} km driven ({left} km to go)',

    'hud.day': 'Day',
    'hud.time': 'Time',
    'hud.distance': 'Distance',
    'hud.stops': 'Stops made',
    'hud.best': 'Best',
    'hud.refuelling': 'REFUELLING',
    'hud.fuel': 'FUEL',
    'hud.nextStop': 'Next stop',
    'hud.range': 'Range',
    'hud.rangeTitle': 'Range left vs. distance to the next station',
    'hud.damage': 'DAMAGE',
    'hud.cash': 'Cash',
    'hud.sleep': 'SLEEP',
    'hud.checkin': 'CHECKING IN',
    'hud.freeBed': 'FREE BED',
    'hud.motelShort': 'MOTEL',
    'hud.passenger': 'Passenger',
    'hud.fareTo': 'Ride to',
    'hud.fareDistance': 'Distance',
    'hud.farePay': 'Pays',
    'hud.fareFuel': 'Extra fuel',
    'hud.fareAccept': 'PRESS E — TAKE THE FARE',
    'hud.fareStop': 'STOP TO TAKE THE FARE',
    'hud.destStation': 'THE NEXT GAS STATION',
    'hud.destMotel': 'THE NEXT MOTEL',
    'hud.neutral': 'N',

    'touch.brake': 'BRAKE',
    'touch.gas': 'GAS',

    'msg.crash': 'CRASH!',
    'msg.bigCrash': 'BIG HIT!',
    'msg.tankFull': 'TANK FULL — HIT THE ROAD',
    'msg.unlocked': 'KEYS ON THE COUNTER — {name} IS YOURS',
    'msg.skipped': 'YOU RODE PAST A FUEL STOP',
    'msg.filling': 'FILLING UP…',
    'msg.stopToRefuel': 'STOP AT THE PUMPS TO REFUEL',
    'msg.outOfFuel': 'OUT OF FUEL',
    'msg.wontMakeIt': "YOU WON'T MAKE THE NEXT STATION",
    'msg.stationAhead': 'FUEL STOP AHEAD — PULL RIGHT',
    'msg.lowFuel': 'LOW FUEL',
    'msg.motelAhead': 'MOTEL AHEAD — FREE BEDS',
    'msg.stopToSleep': 'PARK AT THE MOTEL TO SLEEP',
    'msg.checkingIn': 'CHECKING IN…',
    'msg.sleptPrice':
      'DAY {day} — SLEPT LIKE A ROCK\nGAS WENT UP {delta} OVERNIGHT — NOW {price}/GAL',
    'msg.drowsy': 'YOU ARE GETTING SLEEPY',
    'msg.fallingAsleep': "YOU CAN'T KEEP YOUR EYES OPEN",
    'msg.asleep': 'ASLEEP AT THE WHEEL',
    'msg.noCash': 'NO CASH FOR FUEL',
    'msg.ticket': 'PHOTO ENFORCED — {fine} TICKET',
    'msg.fareTaken': 'PASSENGER ABOARD — {metres} m FOR {pay}',
    'msg.dropOffAhead': 'YOUR PASSENGER GETS OUT AT THIS STOP',
    'msg.dropOff': 'DROPPED OFF — {pay} IN YOUR POCKET',
    'msg.fareLost': 'YOU DROVE PAST THEIR STOP — NO FARE',
    'msg.crateEmpty': 'EMPTY CRATE — NOTHING BUT SAND',
    'msg.crateSmall': 'CRATE OPENED — {cash}',
    'msg.crateBig': 'JACKPOT CRATE — {cash}!',

    'pause.title': 'PAUSED',
    'pause.text': "Take a breath. The desert isn't going anywhere.",
    'pause.resume': 'RESUME',
    'pause.garage': 'BACK TO GARAGE',

    'over.title.fuel': 'OUT OF FUEL',
    'over.title.wrecked': 'WRECKED',
    'over.text.fuel':
      'The engine died {km} km short of the next pumps. Nothing out here but heat and buzzards.',
    'over.text.wrecked':
      "You folded the {car} around somebody's front bumper after {km} km.",
    'over.title.broke': 'BROKE',
    'over.text.broke':
      'Dry tank, empty wallet, {km} km short of the next pumps. Out here that is the same thing as the end of the road.',
    'over.distance': 'Distance',
    'over.stops': 'Fuel stops',
    'over.days': 'Days',
    'over.best': 'Best run',
    'over.retry': 'DRIVE AGAIN',
    'over.changeCar': 'CHANGE CAR',

    'sign.totem1': 'FUEL',
    'sign.totem2': 'STOP',
    'sign.board': 'LAST GAS',
    'sign.boardSub': '{miles} MI',
    'sign.advance': 'FUEL',
    'sign.advanceSub': '500 M',
  },

  es: {
    'app.title': 'Desert Run — Gasolina o Muerte',
    'app.description':
      'Juego de conducción 3D por una carretera del desierto: elige coche, vigila la aguja y no te saltes ni una gasolinera.',

    'loading.text': 'Construyendo la carretera…',

    'menu.strap':
      'Ruta 66, del amanecer a la noche cerrada, sin cobertura. Los surtidores están muy lejos unos de otros: <b>sáltate uno de más y te quedas tirado.</b>',
    'menu.start': 'ARRANCAR MOTOR',
    'menu.resume': 'VOLVER A LA CARRETERA',
    'menu.resumeAt': 'Día {day} · {km} · {cash} · {car}',
    'menu.startFresh': 'EMPEZAR UNA PARTIDA NUEVA',
    'menu.language': 'Idioma',

    'controls.drive': '/ flechas para conducir',
    'controls.handbrake': 'freno de mano',
    'controls.camera': 'cámara',
    'controls.pause': 'pausa',
    'controls.mute': 'silencio',
    'controls.fare': 'aceptar viaje',

    'spec.topSpeed': 'Vel. máxima',
    'spec.accel': 'Aceleración',
    'spec.grip': 'Agarre',
    'spec.offroad': 'Fuera de pista',
    'spec.tank': 'Depósito',
    'spec.range': 'Autonomía',

    'car.sport.tagline': 'Superdeportivo de motor central',
    'car.race.tagline': 'Prototipo GT, sediento y salvaje',
    'car.4x4.tagline': 'Lento, imparable, depósito enorme',
    'car.moped.tagline': 'No gasta nada, 45 km/h, y un choque te mata',
    'car.yacht.tagline': 'Dos toneladas de cromo y un salón por cabina',
    'car.trophy.tagline': 'La arena es un atajo, no un obstáculo',
    'car.superbike.tagline': 'Trescientos por hora con diecisiete litros',
    'car.locked': '??? ??? ???',
    'car.lockedHint': 'Bloqueado — reposta al llevar {km} km (te faltan {left} km)',

    'hud.day': 'Día',
    'hud.time': 'Hora',
    'hud.distance': 'Distancia',
    'hud.stops': 'Paradas',
    'hud.best': 'Récord',
    'hud.refuelling': 'REPOSTANDO',
    'hud.fuel': 'GASOLINA',
    'hud.nextStop': 'Próxima parada',
    'hud.range': 'Autonomía',
    'hud.rangeTitle':
      'Autonomía restante frente a la distancia hasta la próxima gasolinera',
    'hud.damage': 'DAÑOS',
    'hud.cash': 'Dinero',
    'hud.sleep': 'SUEÑO',
    'hud.checkin': 'REGISTRÁNDOTE',
    'hud.freeBed': 'CAMA GRATIS',
    'hud.motelShort': 'MOTEL',
    'hud.passenger': 'Pasajero',
    'hud.fareTo': 'Viaje a',
    'hud.fareDistance': 'Distancia',
    'hud.farePay': 'Te paga',
    'hud.fareFuel': 'Gasolina extra',
    'hud.fareAccept': 'PULSA E — ACEPTAR EL VIAJE',
    'hud.fareStop': 'DETENTE PARA ACEPTARLO',
    'hud.destStation': 'LA PRÓXIMA GASOLINERA',
    'hud.destMotel': 'EL PRÓXIMO MOTEL',
    'hud.neutral': 'N',

    'touch.brake': 'FRENO',
    'touch.gas': 'GAS',

    'msg.crash': '¡CHOQUE!',
    'msg.bigCrash': '¡GRAN GOLPE!',
    'msg.tankFull': 'DEPÓSITO LLENO — ¡EN MARCHA!',
    'msg.unlocked': 'LAS LLAVES EN EL MOSTRADOR — {name} ES TUYA',
    'msg.skipped': 'TE HAS PASADO UNA GASOLINERA',
    'msg.filling': 'REPOSTANDO…',
    'msg.stopToRefuel': 'DETENTE EN LOS SURTIDORES PARA REPOSTAR',
    'msg.outOfFuel': 'SIN GASOLINA',
    'msg.wontMakeIt': 'NO LLEGARÁS A LA PRÓXIMA GASOLINERA',
    'msg.stationAhead': 'GASOLINERA ADELANTE — SAL A LA DERECHA',
    'msg.lowFuel': 'QUEDA POCA GASOLINA',
    'msg.motelAhead': 'MOTEL ADELANTE — CAMA GRATIS',
    'msg.stopToSleep': 'APARCA EN EL MOTEL PARA DORMIR',
    'msg.checkingIn': 'REGISTRÁNDOTE…',
    'msg.sleptPrice':
      'DÍA {day} — HAS DORMIDO DE UN TIRÓN\nLA GASOLINA SUBIÓ {delta} ESTA NOCHE — AHORA {price}/GAL',
    'msg.drowsy': 'TE ESTÁ ENTRANDO SUEÑO',
    'msg.fallingAsleep': 'NO PUEDES MANTENER LOS OJOS ABIERTOS',
    'msg.asleep': 'TE HAS DORMIDO AL VOLANTE',
    'msg.noCash': 'NO TE QUEDA DINERO PARA GASOLINA',
    'msg.ticket': 'RADAR — MULTA DE {fine}',
    'msg.fareTaken': 'PASAJERO A BORDO — {metres} m POR {pay}',
    'msg.dropOffAhead': 'TU PASAJERO SE BAJA EN ESTA PARADA',
    'msg.dropOff': 'ENTREGADO — {pay} EN EL BOLSILLO',
    'msg.fareLost': 'TE PASASTE DE SU PARADA — SIN COBRAR',
    'msg.crateEmpty': 'CAJA VACÍA — SOLO ARENA',
    'msg.crateSmall': 'CAJA ABIERTA — {cash}',
    'msg.crateBig': '¡CAJA PREMIADA — {cash}!',

    'pause.title': 'EN PAUSA',
    'pause.text': 'Respira. El desierto no se va a ir a ninguna parte.',
    'pause.resume': 'CONTINUAR',
    'pause.garage': 'VOLVER AL GARAJE',

    'over.title.fuel': 'SIN GASOLINA',
    'over.title.wrecked': 'DESTROZADO',
    'over.text.fuel':
      'El motor se apagó a {km} km de los surtidores. Aquí fuera solo hay calor y buitres.',
    'over.text.wrecked':
      'Doblaste el {car} contra el parachoques de otro después de {km} km.',
    'over.title.broke': 'SIN BLANCA',
    'over.text.broke':
      'Depósito seco, cartera vacía y a {km} km de los surtidores. Aquí fuera eso es exactamente el final del camino.',
    'over.distance': 'Distancia',
    'over.stops': 'Repostajes',
    'over.days': 'Días',
    'over.best': 'Mejor viaje',
    'over.retry': 'CONDUCIR OTRA VEZ',
    'over.changeCar': 'CAMBIAR DE COCHE',

    'sign.totem1': 'PARADA',
    'sign.totem2': 'GASOLINA',
    'sign.board': 'GASOLINA',
    'sign.boardSub': 'A {miles} MI',
    'sign.advance': 'GASOLINA',
    'sign.advanceSub': '500 M',
  },
};

function detect() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && STRINGS[saved]) return saved;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

let current = detect();
const listeners = [];

export function getLanguage() {
  return current;
}

export function setLanguage(lang) {
  if (!STRINGS[lang] || lang === current) return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  document.title = t('app.title');
  for (const fn of listeners) fn(lang);
}

/** Registers a callback fired whenever the language changes. */
export function onLanguageChange(fn) {
  listeners.push(fn);
}

/** Looks up a string and fills in {placeholders}. */
export function t(key, params) {
  const table = STRINGS[current] || STRINGS.en;
  let text = table[key] ?? STRINGS.en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/**
 * Translates static markup: elements carrying data-i18n get their text (or
 * innerHTML with data-i18n-html) replaced, data-i18n-title their tooltip.
 */
export function applyStaticTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const text = t(el.dataset.i18n);
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = text;
    else el.textContent = text;
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle);
  }
  document.documentElement.lang = current;
  document.title = t('app.title');
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = t('app.description');
}

/** Wires every [data-lang] button in the document to switch language. */
export function bindLanguageButtons(root = document) {
  for (const btn of root.querySelectorAll('[data-lang]')) {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  }
  const sync = () => {
    for (const btn of root.querySelectorAll('[data-lang]')) {
      btn.classList.toggle('active', btn.dataset.lang === current);
    }
  };
  onLanguageChange(sync);
  sync();
}
