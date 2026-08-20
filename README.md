# Desert Run — Fuel or Die

A 3D driving game set on an endless American desert highway. Pick a car, watch
the fuel gauge, and **stop at every gas station** — the tank never holds enough
to reach the one after next. Miss a stop and you die out there.

![Desert Run](docs/screenshot.png)

Built with [three.js](https://threejs.org/) and nothing else: no build step, no
downloads, no art assets. Every texture, car, cactus and mesa is generated in
code at load time.

**English and Spanish** — the game picks your browser's language and there is an
EN/ES switch in the garage and on the pause screen. *(Español: ver
[abajo](#español).)*

## Play

The game is plain ES modules, so it needs to be served over HTTP (opening
`index.html` from the file system will not work — browsers block module
imports on `file://`).

```bash
git clone https://github.com/Mauro-Garcia2012/Car-game.git
cd Car-game
python3 -m http.server 8080      # or: npx http-server -p 8080
```

Then open <http://localhost:8080>. It also works as-is on GitHub Pages or any
static host.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Accelerate | `W` / `↑` | Right trigger |
| Brake / reverse | `S` / `↓` | Left trigger |
| Steer | `A` `D` / `←` `→` | Left stick |
| Handbrake | `Space` / `Shift` | `A` |
| Take the fare on offer | `E` | |
| Camera (chase / bonnet / orbit) | `C` | |
| Pause | `P` or `Esc` | |
| Restart | `R` | |
| Mute | `M` | |

On phones and tablets, on-screen pedals and steering buttons appear
automatically.

## The rules

- Gas stations sit **1.95–2.47 km apart** along the highway. A full tank is
  good for **3.0–3.7 km** of hard driving (3.3–4.2 km if you are gentle with
  the throttle) — enough for the next station, never enough for the one after
  it.
- To refuel, **leave the tarmac, pull onto the apron by the pumps and stop**
  (under ~12 km/h). **Fuel costs money.** The whole highway shares one market
  price, opening at **$4.29 a gallon**; each station is only a few cents off
  its neighbours, and hauling fuel further out adds a little more.
  You start with **$500 in the glovebox**, and carrying passengers is the way
  to top it up — enough to keep going, never enough to stop watching it.
- **Prices only move overnight.** Every night you spend in a motel the market
  jumps **8 to 30 cents**, occasionally more, and you are told what it costs
  now the moment you wake up. Every pump moves together. Nothing on this road
  will ever ask more than **$8.99**. Each night also turns the calendar over,
  and the **day counter** in the corner is the clock the whole run is measured
  against.
- **Passengers pay.** Somebody is waiting at about half the stops, wanting a
  lift to a gas station or motel further up the road. Roll in, stop, and the
  offer tells you everything **before** you take it: how many metres the ride
  is, what it pays, and how much extra fuel the extra weight will drink, in
  litres and dollars. Press `E` (or tap it) to take it. A passenger burns
  **12% more fuel**, and while one is aboard the HUD counts the metres down to
  their stop. Stop where they asked and you get paid; drive **500 m past it**
  and they get out for nothing.
- **Crates in the sand.** Every 300 m or so a crate sits about **10 m off the
  tarmac**, fallen off somebody's truck. Three out of four hold nothing at all,
  roughly one in five is worth **$10**, and about **3%** are worth **$100**.
  Swerving out for one costs you fuel, seconds and the grip of the sand, so
  every crate is a small bet — and once you have broken one open it stays open.
- **Photo enforcement, very occasionally.** About one speed camera every 13 km,
  each one signposted 300 m ahead. Cross it more than 8 km/h over the posted
  limit and the flash goes off: **$50 gone**. Slow down for it and it costs you
  nothing but a few seconds.
- **Sleep runs on the clock, not the odometer.** Six minutes of driving takes
  you from wide awake to nodding off, and the only place to fix it is a
  **motel** — the bed is free, but the night costs you at the pump, and they
  sit about 7.5 km apart, several gas stations' worth. About one in four shares a plot with a station; the rest stand alone
  with nothing but their neon. Park in the lot, stop, and you check in.
- Cruise at 120 km/h and you reach the next bed with a quarter of the meter
  left. **Dawdle at 70 km/h and you do not make it**: the last few hundred
  metres are driven asleep, with the wheel wandering, the edges of the world
  closing in and blackouts of about a second. Sleep never kills you by
  itself — it just makes you a much worse driver.
- Driving on sand is slow and burns **70% more fuel**; the gravel shoulder
  costs 25% more. Standing still still burns fuel — the engine is idling.
- Traffic is thin on the ground, like the real thing: a vehicle every
  kilometre or two, never more than three on the road, mostly semis coming the
  other way. Rear-end a pickup or clip one of them and you lose speed, fuel and
  bodywork; at 100% damage the run is over.
- The posted limit is Nevada-realistic: **70 mph** out on the open two-lane
  (a few stretches drop to 65), **55** on the approach to a gas station and
  **45** past the pumps. The MUTCD R2-1 signs on the shoulder and the little
  replica sign next to the speedo always agree; go over and the replica lights
  up red. Nobody stops you for it — the only thing watching is the occasional
  camera.
- The run ends when the tank hits zero and the car rolls to a stop, or when the
  car is wrecked. Dying with an empty wallet gets its own ending. Your best
  distance is stored in the browser.

The HUD's green bar is your remaining range and the white tick on it is the
next station. **When the tick turns red, you are already out of road.**

## Language

Every string lives in `src/i18n.js`, keyed by id. The language is detected from
the browser, remembered in `localStorage`, and can be changed at any time from
the switcher in the garage or the pause screen — the menu, the HUD, the endings
and even the painted roadside signage (`FUEL STOP` → `PARADA GASOLINA`) are
repainted on the spot. Adding another language means adding one more block of
strings to `STRINGS` and one more entry to `LANGUAGES`.

## The cars

| | Vipera GT | Falcon R1 | Ridgeback 4x4 |
| --- | --- | --- | --- |
| Type | Mid-engine supercar | GT prototype | Lifted desert truck |
| Top speed | 295 km/h | 342 km/h | 209 km/h |
| Tank | 55 L | 46 L | 95 L |
| Range | ~3.4 km | ~3.3 km | ~4.2 km |
| Off-road grip | 34% | 20% | 78% |

The race car is the fastest way between two pumps and the least forgiving if
you overshoot one; the 4x4 shrugs off the sand and can afford a mistake, but it
will not outrun anything.

## How it works

```
index.html          markup for the menu, HUD and overlays
styles.css          UI skin
src/
  main.js           boot and the animation loop
  game.js           game state, rules, refuelling, camera work
  track.js          the analytic highway curve (everything hangs off this)
  vehicle.js        arcade car physics and the fuel model
  fatigue.js        sleep: drains on the clock, degrades the driving
  fares.js          passengers: who is waiting where, and what they pay
  traffic.js        AI pickups and semis
  input.js          keyboard, touch and gamepad
  audio.js          synthesised engine, tyres and beeps (no audio files)
  effects.js        tyre dust and crash smoke
  ui.js             all DOM updates
  textures.js       every texture, painted on a <canvas>
  rng.js            deterministic hash noise
  cars/             the three player cars, built from extruded side profiles
  world/            sky, road, terrain, scenery, stations, motels, signs,
                    cameras, roadside crates
vendor/three/       three.js r169 (MIT), vendored so the game runs offline
```

A few things worth knowing if you want to poke at it:

- **The road is a function, not a mesh.** `track.js` defines the centre line as
  a sum of sines over the distance travelled, `s`. Every object in the world —
  road ribbon, terrain, cacti, gas stations, traffic, the player — is placed
  through `roadPoint(s, lateral)`, so the whole world stays glued to the curve
  and the highway can run forever.
- **Chunk recycling.** The road and desert are ribbons of quads split into
  100 m chunks. When a chunk falls behind the camera, its vertex buffers are
  rewritten for a slot further up the road; scenery is one `InstancedMesh` per
  prop type per chunk, refilled from a deterministic hash so a stretch of
  desert always regenerates the same way.
- **Fuel and sleep pull in opposite directions.** Petrol is spent per metre and
  cash per litre, while sleep is spent per second. Driving slowly saves fuel
  and money but costs you the bed; driving fast saves the bed but empties the
  tank and the wallet. There is a speed in the middle that keeps all three
  alive, and finding it is the game.
- **The cars are extruded side profiles.** Each body panel is a 2D outline
  extruded across the car, then squeezed laterally by a `bodySculpt()` function
  that pinches the nose and tail and adds tumblehome. That is what turns a slab
  into something car-shaped without any modelling tools.

## Español

**Desert Run — Gasolina o Muerte.** Un juego de conducción 3D por una carretera
del desierto americano. Elige coche, vigila la aguja y **para en todas las
gasolineras**: el depósito nunca da para saltarse una.

### Jugar

Necesita servirse por HTTP (los módulos ES no funcionan abriendo el archivo
directamente):

```bash
python3 -m http.server 8080      # o: npx http-server -p 8080
```

Abre <http://localhost:8080>. El juego detecta el idioma del navegador; también
puedes cambiarlo con el selector **EN / ES** del garaje o de la pantalla de
pausa.

### Controles

| Acción | Teclado | Mando |
| --- | --- | --- |
| Acelerar | `W` / `↑` | Gatillo derecho |
| Frenar / marcha atrás | `S` / `↓` | Gatillo izquierdo |
| Girar | `A` `D` / `←` `→` | Stick izquierdo |
| Freno de mano | `Espacio` / `Shift` | `A` |
| Aceptar el viaje ofrecido | `E` | |
| Cámara (persecución / capó / órbita) | `C` | |
| Pausa | `P` o `Esc` | |
| Reiniciar | `R` | |
| Silencio | `M` | |

En móviles y tablets aparecen pedales y botones de dirección en pantalla.

### Las reglas

- Las gasolineras están a **1,95–2,47 km** unas de otras y un depósito lleno da
  para **3,0–3,7 km** conduciendo fuerte: llegas a la siguiente, nunca a la de
  después.
- Para repostar hay que **salir del asfalto, entrar en la explanada de los
  surtidores y detenerse** (por debajo de ~12 km/h). **La gasolina se paga.**
  Toda la carretera comparte un mismo precio de mercado, que abre a **4,29 $ el
  galón**; cada gasolinera se desvía solo unos centavos de sus vecinas y llevar
  el combustible más lejos encarece un poco más. Empiezas con **500 $ en la
  guantera y todavía no hay forma de ganar más**, así que la cartera es una
  segunda cuenta atrás por debajo de la aguja.
- **El precio solo se mueve de noche.** Cada noche que pasas en un motel el
  mercado sube entre **8 y 30 centavos**, a veces más, y al despertar te dicen
  cuánto cuesta ahora. Todos los surtidores suben a la vez. El tope, pase lo
  que pase, son **8,99 $**.
- **El sueño va por tiempo, no por kilómetros.** Seis minutos al volante te
  llevan de estar fresco a caerte de sueño, y lo único que lo arregla es un
  **motel** — la cama es gratis, pero la noche te la cobran en el surtidor, y
  están a unos 7,5 km unos de otros, varias gasolineras de por medio. Uno de cada cuatro comparte parcela con una
  gasolinera; el resto están solos en mitad de la nada con su neón. Aparca en
  el parking, párate del todo y te registras.
- A 120 km/h llegas a la cama con un cuarto de la barra. **A 70 km/h no
  llegas**: los últimos cientos de metros los haces dormido, con el volante
  yéndose solo, la pantalla cerrándose por los bordes y apagones de casi un
  segundo. El sueño nunca te mata por sí mismo: solo te convierte en un
  conductor pésimo.
- La arena es lenta y gasta un **70% más** de gasolina; el arcén, un 25% más.
  Parado también gastas: el motor sigue al ralentí.
- Hay muy poco tráfico, como en el desierto de verdad: un vehículo cada
  kilómetro o dos, nunca más de tres en la carretera, y casi siempre camiones
  de frente. Si chocas contra uno pierdes velocidad, gasolina y chapa; al 100%
  de daños se acabó la partida.
- Los límites de velocidad son los de Nevada: **70 mph** en carretera abierta
  de dos carriles (algún tramo baja a 65), **55** al acercarte a una gasolinera
  y **45** a la altura de los surtidores. Las señales MUTCD del arcén y la
  réplica que verás junto al velocímetro siempre coinciden; si te pasas, la
  réplica se pone roja. Nadie te para por ello: lo único que vigila es algún
  radar suelto.
- **Cada noche pasa un día**, y el contador de días de la esquina es el reloj
  contra el que se mide toda la partida.
- **Los pasajeros pagan.** En la mitad de las paradas hay alguien esperando
  que quiere llegar a una gasolinera o a un motel más adelante. Párate y la
  oferta te dice todo **antes** de aceptar: cuántos metros es el viaje, cuánto
  te paga y cuánta gasolina de más va a gastar, en litros y en dólares. Pulsa
  `E` (o tócalo) para aceptar. Llevar a alguien gasta un **12% más**, y
  mientras va contigo el HUD va **descontando los metros** que quedan hasta su
  parada. Si paras donde te pidió, cobras; si te pasas **500 m**, se baja sin
  pagarte.
- **Cajas en la arena.** Cada 300 m más o menos hay una caja a unos **10 m de
  la carretera**, caída del camión de alguien. Tres de cada cuatro no llevan
  nada, alrededor de una de cada cinco lleva **$10** y un **3%** lleva **$100**.
  Salirte a por una te cuesta gasolina, segundos y el agarre de la arena, así
  que cada caja es una pequeña apuesta; y una vez abierta, se queda abierta.
- **Radares, muy de vez en cuando.** Uno cada 13 km más o menos, siempre
  avisado con un cartel 300 m antes. Si pasas a más de 8 km/h por encima del
  límite, salta el flash: **$50 menos**. Si levantas el pie, no te cuesta nada
  más que unos segundos.
- La barra verde del HUD es tu autonomía y la marca blanca es la próxima
  gasolinera. **Cuando la marca se pone roja, ya no llegas.** La barra azul es
  el sueño, y a su derecha tienes los kilómetros hasta el próximo motel.

### Los coches

| | Vipera GT | Falcon R1 | Ridgeback 4x4 |
| --- | --- | --- | --- |
| Tipo | Superdeportivo | Prototipo GT | Camioneta elevada |
| Vel. máxima | 295 km/h | 342 km/h | 209 km/h |
| Depósito | 55 L | 46 L | 95 L |
| Autonomía | ~3,4 km | ~3,3 km | ~4,2 km |
| Fuera de pista | 34% | 20% | 78% |

## Licence

Game code: MIT. Bundled three.js is MIT, see `vendor/three/LICENSE`.
