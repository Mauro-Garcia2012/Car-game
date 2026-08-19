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
  (under ~12 km/h). **Fuel costs money**: Nevada prices, from about $4.30 a
  gallon at the first station to $7.99 out where nobody lives. You start with
  **$500 in the glovebox and there is no way to earn more yet**, so the wallet
  is a second countdown running under the fuel gauge.
- **Sleep runs on the clock, not the odometer.** Six minutes of driving takes
  you from wide awake to nodding off, and the only place to fix it is a
  **motel** — free, but they sit about 7.5 km apart, several gas stations'
  worth. About one in four shares a plot with a station; the rest stand alone
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
  up red. Nothing fines you — the only thing that punishes you out here is the
  fuel gauge.
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
  traffic.js        AI pickups and semis
  input.js          keyboard, touch and gamepad
  audio.js          synthesised engine, tyres and beeps (no audio files)
  effects.js        tyre dust and crash smoke
  ui.js             all DOM updates
  textures.js       every texture, painted on a <canvas>
  rng.js            deterministic hash noise
  cars/             the three player cars, built from extruded side profiles
  world/            sky, road, terrain, scenery, gas stations, motels, signage
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
  surtidores y detenerse** (por debajo de ~12 km/h). **La gasolina se paga**, a
  precios de Nevada: unos 4,30 $ el galón en la primera gasolinera y hasta
  7,99 $ donde no vive nadie. Empiezas con **500 $ en la guantera y todavía no
  hay forma de ganar más**, así que la cartera es una segunda cuenta atrás por
  debajo de la aguja.
- **El sueño va por tiempo, no por kilómetros.** Seis minutos al volante te
  llevan de estar fresco a caerte de sueño, y lo único que lo arregla es un
  **motel** — gratis, pero están a unos 7,5 km unos de otros, varias
  gasolineras de por medio. Uno de cada cuatro comparte parcela con una
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
  réplica se pone roja. No hay multas: aquí lo único que castiga es la aguja de
  la gasolina.
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
