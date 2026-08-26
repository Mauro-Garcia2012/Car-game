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

    'quality.label': 'GRAPHICS',
    'quality.low': 'LOW',
    'quality.medium': 'MED',
    'quality.high': 'HIGH',
    'quality.ultra': 'ULTRA',
    'quality.note.low':
      'Flat panels, no interiors, no shadows, no reflections. For anything struggling.',
    'quality.note.medium':
      'Interiors and lamps back, softer bodywork. Hard shadows, dulled reflections.',
    'quality.note.high':
      'Nearly everything, at two thirds the detail. Clearcoat paint, soft shadows.',
    'quality.note.ultra':
      'Everything, at full detail. This is how the game looked before this setting existed.',
    'quality.reload': 'Antialiasing changes on reload.',
    'menu.resume': 'BACK ON THE ROAD',
    'menu.resumeAt': 'Day {day} · {km} · {cash} · {car}',
    'menu.startFresh': 'START A NEW RUN',
    'menu.language': 'Language',

    'controls.drive': '/ arrows drive',
    'controls.handbrake': 'handbrake',
    'controls.camera': 'camera',
    'controls.pause': 'pause',
    'map.open': 'Route map',
    'msg.noAtlas': 'NO MAP IN THE GLOVEBOX\nBUY AN ATLAS AT ANY PUMP, OR FIND ONE',
    'map.title': 'THE ROAD AHEAD',
    'map.close': 'CLOSE',
    'map.sub': '{car} · {km} · fuel {price}/L',
    'map.fuel': 'fuel reaches',
    'map.sleep': 'daylight reaches',
    'map.you': 'you',
    'map.cheapest': 'cheapest ahead',
    'map.waiting': 'somebody waiting',
    'map.dropoff': 'your drop-off',
    'map.delivery': 'your delivery',
    'map.storm': 'sand',
    'map.hint': 'TAB closes it',
    'cheat.open': 'Debug menu',
    'cheat.title': 'DEBUG',
    'cheat.pinHint':
      'Enter the four-digit PIN. It is not remembered — you type it again every time the page loads.',
    'cheat.codeHint':
      'Four-character codes. Nothing here is saved: close the page and none of it happened.',
    'cheat.badPin': 'PIN INCORRECTO',
    'cheat.armed': 'PIN OK',
    'cheat.go': 'ENTER',
    'cheat.close': 'CLOSE',
    'cheat.unlockAll': 'UNLOCK EVERYTHING',
    'controls.mute': 'mute',
    'controls.unmute': 'sound on',
    'controls.fare': 'take the offer',
    'controls.horn': 'horn',

    'spec.topSpeed': 'Top speed',
    'spec.accel': 'Acceleration',
    'spec.grip': 'Grip',
    'spec.offroad': 'Off-road',
    'spec.tank': 'Tank',
    'spec.range': 'Range',
    'spec.twoWheels': 'ON TWO WHEELS',
    'spec.noFreight': 'No freight — there is nowhere to put it',
    'spec.halfFares': 'Passengers pay half — nobody rides pillion for full fare',

    'car.sport.tagline': 'Mid-engine road weapon',
    'car.race.tagline': 'GT prototype, thirsty and vicious',
    'car.4x4.tagline': 'Slow, unstoppable, huge tank',
    'car.moped.tagline': 'Sips fuel, 45 km/h, one hit and it is over',
    'car.yacht.tagline': 'Two tonnes of chrome and a lounge for a cabin',
    'car.trophy.tagline': 'The sand is a shortcut, not an obstacle',
    'car.superbike.tagline': 'Three hundred an hour on seventeen litres',
    'car.hatch.tagline': 'Sensible, quick, and it never lets you down',
    'car.hypercar.tagline': '400 km/h, and a thirst to match',
    'car.locked': '??? ??? ???',
    'car.lockedHint': 'Locked — fill up after {km} km driven ({left} km to go)',
    'car.lockedCase': 'Locked — somewhere out on a dirt track',

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
    'hud.tyres': 'TYRES',
    'hud.cash': 'Cash',
    'hud.sleep': 'SLEEP',
    'hud.checkin': 'CHECKING IN',
    'hud.freeBed': 'BED $20',
    'hud.motelShort': 'MOTEL',
    'hud.passenger': 'Passenger',
    'hud.fareTo': 'Ride to',
    'hud.fareDistance': 'Distance',
    'hud.farePay': 'Pays',
    'hud.fareUpFront': 'Half up front',
    'hud.fareFuel': 'Extra fuel',
    'hud.fareAccept': 'PRESS E — TAKE THE FARE',
    'hud.fareStop': 'STOP TO TAKE THE FARE',
    'hud.workshop': 'Workshop',
    'hud.shopHint': 'number keys, or click',
    'shop.takeLoad': 'Take a load — {km} km',
    'shop.deliver': 'Hand the load over',
    'shop.deliverHurt': 'Hand over what is left of it',
    'shop.body': 'Beat the panels straight',
    'shop.tyres': 'A new set of tyres',
    'shop.cans': 'Jerry cans, +18 L',
    'shop.grip': 'Soft compound tyres',
    'shop.armour': 'Reinforced body',
    'shop.lamps': 'Long-range lamps',
    'shop.atlas': 'A road atlas — see the road ahead',
    'shop.tune': 'Engine tune',
    'hud.destOneStop': 'THE NEXT BUS STOP',
    'hud.destTwoStops': 'TWO BUS STOPS UP',
    'hud.neutral': 'N',

    'touch.brake': 'BRAKE',
    'touch.gas': 'GAS',

    'chat.0': '"Nobody stops out here. I have been at that shelter since Tuesday."',
    'chat.1': '"My sister has the room over the diner. She does not know I am coming."',
    'chat.2': '"You drive like somebody with somewhere to be."',
    'chat.3': '"I counted eleven cars yesterday. Eleven, all day."',
    'chat.4': '"That last motel — do not eat there. That is all I will say."',
    'chat.5': '"The bus came through until about six years ago. Then it did not."',
    'chat.6': '"Keep an eye out after dark. They come down for the warm tarmac."',
    'chat.7': '"Every one of those dirt tracks goes somewhere. Nobody comes back saying where."',
    'chat.8': '"Petrol was under a dollar when I moved out here. Under a dollar."',
    'chat.9': '"You look about as tired as I feel. Do not do anything clever."',
    'chat.10': '"When the sky goes brown you pull over. That is the whole trick."',
    'chat.11': '"I do this run twice a year. Never the same way twice."',
    'msg.freightTaken': 'LOADED — {km} UP THE ROAD FOR {pay}',
    'msg.freightPaid': 'DELIVERED — {pay}',
    'msg.freightHurt': 'DELIVERED, {lost} OF IT BROKEN — {pay}',
    'msg.copsOn': 'LIGHTS BEHIND YOU — PULL OVER OR RUN',
    'msg.copsFine': 'PULLED OVER — {over} KM/H OVER, {fine}',
    'msg.copsLost': 'THEY GAVE UP',
    'msg.cannotAfford': 'NOT ENOUGH FOR IT — {cost}',
    'msg.bought.body': 'PANELS BEATEN STRAIGHT — {cost}',
    'msg.bought.tyres': 'NEW RUBBER ON ALL FOUR — {cost}',
    'msg.bought.cans': 'JERRY CANS STRAPPED ON — {cost}',
    'msg.bought.grip': 'SOFT COMPOUND FITTED — {cost}',
    'msg.bought.armour': 'BODY REINFORCED — {cost}',
    'msg.bought.lamps': 'LONG-RANGE LAMPS FITTED — {cost}',
    'msg.bought.atlas': 'A ROAD ATLAS — {cost}\nTAB OPENS IT',
    'msg.bought.tune': 'ENGINE TUNED — {cost}',
    'msg.blowout': 'BLOWOUT — 60 KM/H UNTIL YOU BUY RUBBER',
    'msg.tyresLow': 'THE TYRES ARE DOWN TO THE CANVAS',
    'msg.crash': 'CRASH!',
    'msg.bigCrash': 'BIG HIT!',
    'msg.deer': 'DEER — IT NEVER MOVED',
    'msg.tankFull': 'TANK FULL — HIT THE ROAD',
    'msg.unlocked': 'KEYS ON THE COUNTER — {name} IS YOURS',
    'msg.skipped': 'YOU RODE PAST A FUEL STOP',
    'msg.filling': 'FILLING UP…',
    'msg.stopToRefuel': 'STOP AT THE PUMPS TO REFUEL',
    'msg.outOfFuel': 'OUT OF FUEL',
    'msg.wontMakeIt': "YOU WON'T MAKE THE NEXT STATION",
    'msg.lowFuel': 'LOW FUEL',
    'msg.stopToSleep': 'PARK AT THE MOTEL TO SLEEP',
    'msg.checkingIn': 'CHECKING IN…',
    'msg.sleptPrice':
      'DAY {day} — SLEPT LIKE A ROCK, {cost} FOR THE ROOM\nFUEL WENT UP {delta} OVERNIGHT — NOW {price}/L',
    'msg.noBed': 'NO {cost} FOR A ROOM — NOBODY SLEEPS TONIGHT',
    'msg.drowsy': 'YOU ARE GETTING SLEEPY',
    'msg.fallingAsleep': "YOU CAN'T KEEP YOUR EYES OPEN",
    'msg.asleep': 'ASLEEP AT THE WHEEL',
    'msg.noCash': 'NO CASH FOR FUEL',
    'msg.ticket': 'PHOTO ENFORCED — {fine} TICKET',
    'msg.fareTaken': 'PASSENGER ABOARD — {distance}\n{paid} NOW, {rest} WHEN THEY GET THERE',
    'msg.dropOffAhead': 'YOUR PASSENGER GETS OUT AT THIS STOP',
    'msg.dropOff': 'DROPPED OFF — THE OTHER {pay} IN YOUR POCKET',
    'msg.fareLost': 'YOU DROVE PAST THEIR SHELTER — {lost} YOU WILL NOT SEE',
    'msg.crateEmpty': 'EMPTY CRATE — NOTHING BUT SAND',
    'msg.crateSmall': 'CRATE OPENED — {cash}',
    'msg.crateBig': 'JACKPOT CRATE — {cash}!',
    'msg.caseCash': 'BRIEFCASE — {cash} IN USED NOTES',
    'msg.caseWorn': 'THE CASE WAS A TRAP — ENGINE SEIZED\n40 KM/H UNTIL THE NEXT PUMP, {cost} TO FIX',
    'msg.caseKeys': 'KEYS IN THE BRIEFCASE — A {name}\nIN THE GARAGE FOR YOUR NEXT RUN',
    'msg.caseAtlas': 'A ROAD ATLAS IN THE BRIEFCASE\nTAB OPENS IT',
    'msg.wornRunning': 'ENGINE SEIZED — LIMPING TO THE NEXT PUMP',
    'msg.repaired': 'ENGINE FIXED — {cost}',
    'msg.repairBroke': 'NO {cost} FOR THE ENGINE — STILL DOING 40',
    'msg.stormAhead': 'SAND COMING — YOU WILL NOT SEE A THING',
    'msg.stormOver': 'THE AIR IS CLEARING',

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
    'over.earned': 'Earned',
    'over.spent': 'Spent',
    'over.fares': 'Passengers',
    'over.topSpeed': 'Fastest',
    'over.retry': 'DRIVE AGAIN',
    'over.changeCar': 'CHANGE CAR',

    'sign.tank1': 'FROM HERE ON',
    'sign.tank2': 'THE PUMPS GET FURTHER APART',
    'sign.tank3': "I'D GET A BIGGER TANK AT OUR WORKSHOP",
    'sign.tank4': 'unless you fancy the walk',
    'sign.totemStop': 'STOP',
    'sign.advanceSub': '500 M',
    'sign.danger': 'DANGEROUS\nROAD',
    'sign.motelSub': '1 MI',
  },

  es: {
    'app.title': 'Desert Run — Gasolina o Muerte',
    'app.description':
      'Juego de conducción 3D por una carretera del desierto: elige coche, vigila la aguja y no te saltes ni una gasolinera.',

    'loading.text': 'Construyendo la carretera…',

    'menu.strap':
      'Ruta 66, del amanecer a la noche cerrada, sin cobertura. Los surtidores están muy lejos unos de otros: <b>sáltate uno de más y te quedas tirado.</b>',
    'menu.start': 'ARRANCAR MOTOR',

    'quality.label': 'GRÁFICOS',
    'quality.low': 'BAJO',
    'quality.medium': 'MEDIO',
    'quality.high': 'ALTO',
    'quality.ultra': 'ULTRA',
    'quality.note.low':
      'Chapa plana, sin interiores, sin sombras y sin reflejos. Para lo que vaya justo.',
    'quality.note.medium':
      'Vuelven interiores y ópticas, carrocería menos curva. Sombras duras y reflejos apagados.',
    'quality.note.high':
      'Casi todo, a dos tercios de detalle. Pintura con barniz y sombras suaves.',
    'quality.note.ultra':
      'Todo, a detalle completo. Así se veía el juego antes de que existiera este ajuste.',
    'quality.reload': 'El antialias cambia al recargar.',
    'menu.resume': 'VOLVER A LA CARRETERA',
    'menu.resumeAt': 'Día {day} · {km} · {cash} · {car}',
    'menu.startFresh': 'EMPEZAR UNA PARTIDA NUEVA',
    'menu.language': 'Idioma',

    'controls.drive': '/ flechas para conducir',
    'controls.handbrake': 'freno de mano',
    'controls.camera': 'cámara',
    'controls.pause': 'pausa',
    'map.open': 'Mapa de ruta',
    'msg.noAtlas': 'NO LLEVAS MAPA EN LA GUANTERA\nCÓMPRALO EN CUALQUIER SURTIDOR, O ENCUÉNTRALO',
    'map.title': 'LA CARRETERA POR DELANTE',
    'map.close': 'CERRAR',
    'map.sub': '{car} · {km} · gasolina {price}/L',
    'map.fuel': 'llega la gasolina',
    'map.sleep': 'llega la luz del día',
    'map.you': 'tú',
    'map.cheapest': 'la más barata',
    'map.waiting': 'hay alguien esperando',
    'map.dropoff': 'tu parada',
    'map.delivery': 'tu entrega',
    'map.storm': 'arena',
    'map.hint': 'TAB lo cierra',
    'cheat.open': 'Menú de depuración',
    'cheat.title': 'DEPURACIÓN',
    'cheat.pinHint':
      'Mete el PIN de cuatro dígitos. No se recuerda: hay que meterlo cada vez que abres la página.',
    'cheat.codeHint':
      'Códigos de cuatro caracteres. Aquí no se guarda nada: cierras la página y no ha pasado.',
    'cheat.badPin': 'PIN INCORRECTO',
    'cheat.armed': 'PIN CORRECTO',
    'cheat.go': 'ENTRAR',
    'cheat.close': 'CERRAR',
    'cheat.unlockAll': 'DESBLOQUEAR TODO',
    'controls.mute': 'silencio',
    'controls.unmute': 'activar sonido',
    'controls.fare': 'aceptar la oferta',
    'controls.horn': 'claxon',

    'spec.topSpeed': 'Vel. máxima',
    'spec.accel': 'Aceleración',
    'spec.grip': 'Agarre',
    'spec.offroad': 'Fuera de pista',
    'spec.tank': 'Depósito',
    'spec.range': 'Autonomía',
    'spec.twoWheels': 'SOBRE DOS RUEDAS',
    'spec.noFreight': 'Sin carga — no hay dónde meterla',
    'spec.halfFares': 'Los pasajeros pagan la mitad — nadie va de paquete a precio entero',

    'car.sport.tagline': 'Superdeportivo de motor central',
    'car.race.tagline': 'Prototipo GT, sediento y salvaje',
    'car.4x4.tagline': 'Lento, imparable, depósito enorme',
    'car.moped.tagline': 'No gasta nada, 45 km/h, y un choque te mata',
    'car.yacht.tagline': 'Dos toneladas de cromo y un salón por cabina',
    'car.trophy.tagline': 'La arena es un atajo, no un obstáculo',
    'car.superbike.tagline': 'Trescientos por hora con diecisiete litros',
    'car.hatch.tagline': 'Sensato, rápido y nunca te deja tirado',
    'car.hypercar.tagline': '400 km/h, y una sed a la altura',
    'car.locked': '??? ??? ???',
    'car.lockedHint': 'Bloqueado — reposta al llevar {km} km (te faltan {left} km)',
    'car.lockedCase': 'Bloqueado — está en algún camino de tierra',

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
    'hud.tyres': 'RUEDAS',
    'hud.cash': 'Dinero',
    'hud.sleep': 'SUEÑO',
    'hud.checkin': 'REGISTRÁNDOTE',
    'hud.freeBed': 'CAMA 20 $',
    'hud.motelShort': 'MOTEL',
    'hud.passenger': 'Pasajero',
    'hud.fareTo': 'Viaje a',
    'hud.fareDistance': 'Distancia',
    'hud.farePay': 'Te paga',
    'hud.fareUpFront': 'Mitad por delante',
    'hud.fareFuel': 'Gasolina extra',
    'hud.fareAccept': 'PULSA E — ACEPTAR EL VIAJE',
    'hud.fareStop': 'DETENTE PARA ACEPTARLO',
    'hud.workshop': 'Taller',
    'hud.shopHint': 'teclas de número, o pincha',
    'shop.takeLoad': 'Cargar mercancía — {km} km',
    'shop.deliver': 'Entregar la carga',
    'shop.deliverHurt': 'Entregar lo que queda de ella',
    'shop.body': 'Enderezar la chapa',
    'shop.tyres': 'Neumáticos nuevos',
    'shop.cans': 'Bidones, +18 L',
    'shop.grip': 'Neumáticos blandos',
    'shop.armour': 'Carrocería reforzada',
    'shop.lamps': 'Faros de largo alcance',
    'shop.atlas': 'Un mapa de carreteras — ver lo que viene',
    'shop.tune': 'Puesta a punto del motor',
    'hud.destOneStop': 'LA SIGUIENTE PARADA',
    'hud.destTwoStops': 'DOS PARADAS MÁS ALLÁ',
    'hud.neutral': 'N',

    'touch.brake': 'FRENO',
    'touch.gas': 'GAS',

    'chat.0': '«Aquí no para nadie. Llevo en esa marquesina desde el martes.»',
    'chat.1': '«Mi hermana tiene el cuarto encima del bar. No sabe que voy.»',
    'chat.2': '«Conduces como alguien que tiene adónde ir.»',
    'chat.3': '«Ayer conté once coches. Once, en todo el día.»',
    'chat.4': '«Ese último motel: no comas ahí. No digo más.»',
    'chat.5': '«El autobús pasó hasta hace unos seis años. Y luego dejó de pasar.»',
    'chat.6': '«Ojo cuando anochezca. Bajan por el calor del asfalto.»',
    'chat.7': '«Todos esos caminos de tierra van a alguna parte. Nadie vuelve contando adónde.»',
    'chat.8': '«La gasolina no llegaba al dólar cuando me vine. Ni al dólar.»',
    'chat.9': '«Tienes la misma cara de sueño que yo. No hagas nada raro.»',
    'chat.10': '«Cuando el cielo se pone marrón, te apartas. Ese es todo el truco.»',
    'chat.11': '«Hago este viaje dos veces al año. Nunca igual.»',
    'msg.freightTaken': 'CARGADO — {km} DE CAMINO POR {pay}',
    'msg.freightPaid': 'ENTREGADO — {pay}',
    'msg.freightHurt': 'ENTREGADO, CON UN {lost} ROTO — {pay}',
    'msg.copsOn': 'LUCES DETRÁS — PÁRATE O CORRE',
    'msg.copsFine': 'TE HAN PARADO — {over} KM/H DE MÁS, {fine}',
    'msg.copsLost': 'SE HAN RENDIDO',
    'msg.cannotAfford': 'NO TE LLEGA — {cost}',
    'msg.bought.body': 'CHAPA ENDEREZADA — {cost}',
    'msg.bought.tyres': 'GOMA NUEVA EN LAS CUATRO — {cost}',
    'msg.bought.cans': 'BIDONES AMARRADOS — {cost}',
    'msg.bought.grip': 'COMPUESTO BLANDO MONTADO — {cost}',
    'msg.bought.armour': 'CARROCERÍA REFORZADA — {cost}',
    'msg.bought.lamps': 'FAROS DE LARGO ALCANCE — {cost}',
    'msg.bought.atlas': 'UN MAPA DE CARRETERAS — {cost}\nSE ABRE CON TAB',
    'msg.bought.tune': 'MOTOR PUESTO A PUNTO — {cost}',
    'msg.blowout': 'REVENTÓN — 60 KM/H HASTA QUE COMPRES GOMA',
    'msg.tyresLow': 'LOS NEUMÁTICOS ESTÁN EN LA LONA',
    'msg.crash': '¡CHOQUE!',
    'msg.bigCrash': '¡GRAN GOLPE!',
    'msg.deer': 'UN CIERVO — NI SE MOVIÓ',
    'msg.tankFull': 'DEPÓSITO LLENO — ¡EN MARCHA!',
    'msg.unlocked': 'LAS LLAVES EN EL MOSTRADOR — {name} ES TUYA',
    'msg.skipped': 'TE HAS PASADO UNA GASOLINERA',
    'msg.filling': 'REPOSTANDO…',
    'msg.stopToRefuel': 'DETENTE EN LOS SURTIDORES PARA REPOSTAR',
    'msg.outOfFuel': 'SIN GASOLINA',
    'msg.wontMakeIt': 'NO LLEGARÁS A LA PRÓXIMA GASOLINERA',
    'msg.lowFuel': 'QUEDA POCA GASOLINA',
    'msg.stopToSleep': 'APARCA EN EL MOTEL PARA DORMIR',
    'msg.checkingIn': 'REGISTRÁNDOTE…',
    'msg.sleptPrice':
      'DÍA {day} — HAS DORMIDO DE UN TIRÓN, {cost} LA HABITACIÓN\nLA GASOLINA SUBIÓ {delta} ESTA NOCHE — AHORA {price}/L',
    'msg.noBed': 'NO TIENES {cost} PARA LA HABITACIÓN — HOY NADIE DUERME',
    'msg.drowsy': 'TE ESTÁ ENTRANDO SUEÑO',
    'msg.fallingAsleep': 'NO PUEDES MANTENER LOS OJOS ABIERTOS',
    'msg.asleep': 'TE HAS DORMIDO AL VOLANTE',
    'msg.noCash': 'NO TE QUEDA DINERO PARA GASOLINA',
    'msg.ticket': 'RADAR — MULTA DE {fine}',
    'msg.fareTaken': 'PASAJERO A BORDO — {distance}\n{paid} AHORA, {rest} AL LLEGAR',
    'msg.dropOffAhead': 'TU PASAJERO SE BAJA EN ESTA PARADA',
    'msg.dropOff': 'ENTREGADO — LA OTRA MITAD, {pay}, AL BOLSILLO',
    'msg.fareLost': 'TE PASASTE DE SU PARADA — {lost} QUE NO VERÁS',
    'msg.crateEmpty': 'CAJA VACÍA — SOLO ARENA',
    'msg.crateSmall': 'CAJA ABIERTA — {cash}',
    'msg.crateBig': '¡CAJA PREMIADA — {cash}!',
    'msg.caseCash': 'MALETÍN — {cash} EN BILLETES USADOS',
    'msg.caseWorn': 'EL MALETÍN ERA UNA TRAMPA — MOTOR GRIPADO\n40 KM/H HASTA EL PRÓXIMO SURTIDOR, {cost} ARREGLARLO',
    'msg.caseKeys': 'LLAVES EN EL MALETÍN — UN {name}\nEN EL GARAJE PARA LA PRÓXIMA PARTIDA',
    'msg.caseAtlas': 'UN MAPA DE CARRETERAS EN EL MALETÍN\nSE ABRE CON TAB',
    'msg.wornRunning': 'MOTOR GRIPADO — RENQUEANDO AL PRÓXIMO SURTIDOR',
    'msg.repaired': 'MOTOR ARREGLADO — {cost}',
    'msg.repairBroke': 'NO TIENES {cost} PARA EL MOTOR — SIGUES A 40',
    'msg.stormAhead': 'VIENE ARENA — NO VAS A VER NADA',
    'msg.stormOver': 'SE ESTÁ DESPEJANDO',

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
    'over.earned': 'Ganado',
    'over.spent': 'Gastado',
    'over.fares': 'Pasajeros',
    'over.topSpeed': 'Punta',
    'over.retry': 'CONDUCIR OTRA VEZ',
    'over.changeCar': 'CAMBIAR DE COCHE',

    'sign.tank1': 'DE AQUÍ EN ADELANTE',
    'sign.tank2': 'LAS GASOLINERAS SE DISTANCIAN',
    'sign.tank3': 'YO QUE TÚ AMPLIARÍA EL DEPÓSITO EN NUESTRO TALLER',
    'sign.tank4': 'si no quieres quedarte tirado',
    'sign.totemStop': 'PARADA',
    'sign.advanceSub': '500 M',
    'sign.danger': 'CARRETERA\nPELIGROSA',
    'sign.motelSub': '1,6 KM',
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
