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
| Take the offer in front of you | `E` | |
| Camera (chase / bonnet / orbit) | `C` | |
| Pause | `P` or `Esc` | |
| Restart | `R` | |
| Horn | `H` | |
| Buy line 1–8 at the workshop | `1`–`8` | |
| Mute | `M`, or the speaker button top right | |

The speaker button is always there — in the garage, mid-drive and on the
game-over card — and it silences everything: engine, tyres, crashes, beeps.
The choice is remembered, so a game you muted at your desk stays muted the
next time you open it.

On phones and tablets, on-screen pedals and steering buttons appear
automatically.

### Debug menu

The button next to the speaker opens a debug panel. It asks for a
**four-digit PIN — `5214`** — and then takes **four-character codes**: `FUEL`
fills the tank, `OPEN` hands over the whole garage, `MEGA` does fuel, cash,
sleep, bodywork and the garage at once, `PUMP` `BEDS` `HALT` `DIRT` `SAND`
teleport you to the next station, motel, bus stop, dirt spur or sandstorm,
`CAR1`–`CAR9` swap the vehicle without losing the run, and there are forty in
all — the panel lists every one of them, and clicking a line runs it.

It is built so it cannot leak into a real run. **Nothing it does is written
down**: vehicles it hands over go into a session-only set that never reaches
localStorage, so closing the page leaves the garage exactly as you found it.
And **the PIN is held in a plain variable** — reload the page and you type it
again. Getting it wrong says `PIN INCORRECTO` and nothing else happens.

## The rules

- Gas stations sit **1.95–2.47 km apart** along the highway. A full tank is
  good for **5.2–6.8 km** of hard driving (6.4–8.5 km if you are gentle with
  the throttle), and the pumps are 1.95–2.47 km apart. So a car clears two of
  those gaps and starts on a third: **skipping a station is a decision, not a
  death sentence — skipping two usually is.** The moped runs past five and
  pays for it in time; see the garage.
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
- **Passengers wait at the bus stops.** A transit authority once ran a service
  up this highway; the buses stopped years ago and the shelters did not. One
  stands roughly every **10 km** — a concrete slab, three walls, a bench, a
  timetable nobody has reprinted and the route sign still on its post — and
  about **six in ten** have somebody standing at them, visible from a long way
  out. Pull off onto the shoulder beside one and stop.
- **Passengers pay.** The offer tells you everything **before** you take it:
  how far the ride is, what it pays, and how much extra fuel the extra weight
  will drink, in litres and dollars. Press `E` (or tap it) to take it. Most
  are riding one stop; about one in five is riding two, so a fare runs
  **10 to 23 km** — more than a tank in some cars and usually a night's sleep.
  A passenger burns **12% more fuel**, and while one is aboard the HUD counts
  down to their shelter. Pull in where they asked and you get paid; drive
  **500 m past it** and they get out for nothing.
- **Half up front.** You are handed half the fare at the kerb and the other
  half when they get out. That changes what a fare is: it stops being a
  promise you get paid for keeping and becomes money you are already holding —
  a tank you could not otherwise afford, a bed, the bodywork. It also means
  driving past somebody's shelter costs you the balance rather than
  everything, and that a broke driver has a way out that is not simply hoping.
- **And they pay properly.** Rides run **$44–72 a kilometre** with the market
  freshly opened, which is **$450 for a short hop and better than $1,600 for a
  long one**, against $62 to fill the supercar. Nobody out here is catching a
  lift to the shops: they are stranded on a road with no signal and no other
  traffic, and they pay what that is worth. **The fare tracks the pump** — when
  the market climbs overnight so does what a lift is worth — and the quote you
  see is today's; accepting freezes it.
- **The pump is a body shop too.** Damage used to be a one-way trip: it went
  up, and at 100% the run was over. Stop at a station with a dented car and
  the shop offers to beat the panels straight at **$9 a point** — a bad shunt
  costs about what one good fare pays. If you cannot cover the lot it fixes
  what your wallet reaches, the same way the pump sells you the litres you can
  afford. It is also where the money finally goes: once the tank is full and
  the bed is paid, bodywork is the only thing left to spend on.
- **Sandstorms.** A few times in a long run the wind gets up. The horizon goes
  first, then everything past ninety metres, and the light goes flat and
  ochre; a crosswind leans on the car hard enough that holding a lane is work.
  You can see one coming — the sky browns for the best part of a kilometre
  before it arrives — so it is a decision, not an ambush: slow down and lose
  the daylight, or keep your foot in and meet a semi you cannot see. Storms
  belong to a stretch of road rather than to a clock, so a given seed always
  has its weather in the same places, and the **NEXT STOP** readout becomes
  the only way to find a station.
- **A bent car drives like one.** Damage used to be a life bar and nothing
  else: eighty per cent handled exactly like nothing, right up until a hundred
  ended the run. Now it goes off with you — **a fifth of the grip and a tenth
  of the top speed** by the time it is written off, half a second more to
  100 km/h, and a lean towards one side that you hold out with the wheel. The
  side is the car's own and never changes, so you learn it. It is also what
  makes the body shop worth visiting before the number gets frightening.
- **Deer, after dark.** Night used to be a colour. Now something walks onto
  the road: one stands on the verge with its eyes lit up in the beams from a
  long way out, holds until you are nearly on it, and bolts across. Lift off
  early and it is nothing; keep your foot in at 140 and it is a bill at the
  next pump. They are only about once it is properly dark. **Sound the horn**
  and anything within two hundred metres goes now rather than later, which is
  the whole reason to have one: a deer that crosses while you are still back
  there is a deer you never meet.
- **Everything on the road has its lights on.** Headlamps and tail lights on
  the traffic lift hard after dark — a semi coming the other way used to be
  invisible until it was inside your own beams, which is not a hazard, it is
  an ambush. Now it is two white dots a long way off, closing.
- **Landmarks.** Every twenty-odd kilometres there is one thing not built out
  of the same parts as everything else: a **dead town**, a **drive-in** nobody
  switched off, an **airliner** on its belly in the sand, a **roadside
  dinosaur**, a **water tower** with its beacon still lit. They stand well
  back and you cannot touch them; they are there so distance has somewhere to
  land. They come off a deck rather than a die, so you never get the same one
  twice running, and the deck is seeded — the same run always has the same
  sights in the same places.
- **The passenger talks.** Every couple of kilometres somebody riding with you
  says something. Twelve lines, never the same one twice in a row, and quiet
  enough that they are company rather than commentary.
- **The road gets harder the further you go.** Kilometre five hundred used to
  play exactly like kilometre five. Now the desert thins out: by the time you
  are three hundred kilometres out the **pumps are twice as far apart** (2.4 km
  → 5.2), the **beds two thirds further** (8.3 → 13.8), the traffic is thicker
  and the **storms come round twice as often**. It saturates rather than
  climbing forever, so the road is eventually as bad as it gets and no worse —
  and the answer to it is the counter at every station.
- **One billboard, at kilometre ninety.** Forty-eight metres of it, on the
  empty side of the road, saying *the pumps get further apart from here on —
  I'd get a bigger tank at our workshop, unless you fancy the walk.* It stands
  where the margin is still comfortable rather than where the trouble starts:
  measured over eight seeds, the worst gap in the following sixty kilometres
  is about 4.4 km against 6.0 km of range for the thirstiest car in the garage
  with a passenger and a load aboard — 28% in hand. Past roughly kilometre 260
  that margin is down to 16%, and past 1,400 there are gaps that car cannot
  cross at all. **One jerry can, $340, closes every one of them.**
- **The workshop.** Money used to have a ceiling: past the first few fares the
  tank was always full and a thousand dollars bought the same run as ten
  thousand. Stop on any forecourt and there is a price list — beat the panels
  straight, a new set of tyres, **jerry cans** (+18 L, up to three), **soft
  compound** (+14% grip), a **reinforced body** (−32% damage taken),
  **long-range lamps** (70% more beam), and an **engine tune** (+7% power and
  +4% top speed a step, up to three). Press the number or click the line.
  Nothing survives the run: it is bought with the money you found on this road
  and it dies with the car.
- **Tyres wear out, and then they let go.** The one consumable the game did
  not have. Rubber goes slowly on clean tarmac and much faster for the things
  that were free before: **sand eats it five times over**, sliding eats it,
  and speed eats it squared. A careful driver gets a hundred kilometres or so
  out of a set; a driver who lives on the dirt spurs gets forty. Run it to
  nothing and one lets go — a bang, a swerve, a fifth of the grip gone and
  **60 km/h until you buy rubber**.
- **Freight.** A fare is ten to twenty kilometres. A load is **forty to a
  hundred**, for money that dwarfs it, taken on at one station and handed over
  at another. It is also a car that will not pull away and will not stop:
  **−22% power, −18% braking, 30% more fuel** — and every crash on the way
  breaks some of it, off the price you get paid at the far end.
- **Highway patrol.** The speed limit was a fifty-dollar toll collected by a
  camera you could see coming. There is a car sitting in the shade every six
  to fifteen kilometres now, and come past it more than **23 km/h over** and
  it pulls out with the bar going. Stop and it is **$120 plus $7 for every
  km/h you were doing over** — and the two minutes, which on a road where the
  sleep meter is the clock is most of what it costs. Or run: it does about
  **200 km/h** and gives up after forty seconds or a kilometre, so two cars in
  the garage can simply leave it behind and the rest cannot.
- **Crates in the sand.** Every 300 m or so a crate sits about **10 m off the
  tarmac**, fallen off somebody's truck. Three out of four hold nothing at all,
  roughly one in five is worth **$10**, and about **3%** are worth **$100**.
  Swerving out for one costs you fuel, seconds and the grip of the sand, so
  every crate is a small bet — and once you have broken one open it stays open.
- **Photo enforcement, very occasionally.** About one speed camera every 13 km,
  each one signposted 300 m ahead. Cross it more than 8 km/h over the posted
  limit and the flash goes off: **$50 gone**. Slow down for it and it costs you
  nothing but a few seconds.
- **The sleep meter is the clock.** It is not just a stamina bar — it is what
  time of day it is. You leave the garage at **07:00** in the low morning sun,
  and as the meter drains the sun crosses the sky. Daylight fills the first
  three quarters: high noon at 30%, golden hour at 58%, the sun on the horizon
  at 66%. **By the time a quarter of the meter is left it is 21:00 and fully
  dark, headlamps on, stars out** — so the last quarter of every day is night
  driving with enough left in the tank to go somewhere in it. After the meter
  empties the world stops moving: it stays night, the moon stays up, and no
  amount of driving brings the morning back. Only a bed does — you wake at
  dawn on the next day, and the day counter ticks over.
- **Driving at night is a different game.** Your headlamps come up on their own
  through dusk and past that they are all you have: a hundred metres of tarmac
  and whatever is standing in it. The desert reads as silhouettes under the
  moon, the sign faces catch the beams, and a gas station forty seconds up the
  road is a glow on the horizon long before it is a building. Getting caught
  out at night is the natural punishment for dawdling — and it is also the
  best the game looks.
- **Sleep runs on the clock, not the odometer.** **Twelve minutes** of driving
  takes you from wide awake to nodding off, and the only place to fix it is a
  **motel** — they sit about 8 km apart, several gas stations' worth. About one
  in four shares a plot with a station; the rest stand alone with nothing but
  their neon. Park in the lot, stop, and you check in.
- A day's sleep is **24 km at 120 km/h, 14 at 70, 9 on the moped**, against a
  motel every 8: every vehicle in the garage can reach a bed, and there is
  room in a day to stop for a fare, take a dirt spur or sit out a sandstorm
  rather than sprinting bed to bed.
- Run it down anyway and it does not take the car off you. The wheel wanders,
  the edges of the world close in, and past empty you black out for about a
  second at a time — but a driver who keeps hold of it wanders under two
  metres and stays on the road. Sleep never kills you by itself, and it does
  not steer for you either: it just makes you a much worse driver.
- Driving on sand is slow and burns **70% more fuel**; the gravel shoulder
  costs 25% more. Standing still still burns fuel — the engine is idling.
- Traffic is thin on the ground, like the real thing: a vehicle every
  kilometre or two, never more than three on the road, mostly semis coming the
  other way. Rear-end a pickup or clip one of them and you lose speed, fuel and
  bodywork; at 100% damage the run is over. How much of an impact a vehicle
  keeps is its own business — see the moped in the garage.
- The posted limit is Nevada-realistic: **70 mph** out on the open two-lane
  (a few stretches drop to 65), **55** on the approach to a gas station and
  **45** past the pumps. The MUTCD R2-1 signs on the shoulder and the little
  replica sign next to the speedo always agree; go over and the replica lights
  up red. Nobody stops you for it — the only thing watching is the occasional
  camera.
- The speedometer is a dial, and only a dial — no digits. Its face is cut to
  fit whatever you are driving, so the needle always uses most of the sweep:
  0–60 in tens on the moped, 0–440 in forties in the hypercar, and the stretch
  of the scale the car cannot reach is marked in red.
- The run ends when the tank hits zero and the car rolls to a stop, or when the
  car is wrecked. Dying with an empty wallet gets its own ending. Your best
  distance is stored in the browser.

The HUD's green bar is your remaining range and the white tick on it is the
next station. **When the tick turns red, you are already out of road.**

## Language

Every string lives in `src/i18n.js`, keyed by id. The language is detected from
the browser, remembered in `localStorage`, and can be changed at any time from
the switcher in the garage or the pause screen — the menu, the HUD, the endings
and even the painted roadside signage (`1 MI` → `1,6 KM`) are repainted on
the spot. The service signs are the Spanish S-series boards — white panel,
black pictogram, one line underneath — and there are three of them: a pump
before each station, a bed before each motel, a bus on the post at each stop.
The only thing on any of them that needs translating is the line underneath.
A pictogram resolves at four hundred metres, where a word does not. Adding another language means adding one more block of
strings to `STRINGS` and one more entry to `LANGUAGES`.

## The cars

| | Vipera GT | Falcon R1 | Ridgeback 4x4 | Avispa 49 |
| --- | --- | --- | --- | --- |
| Type | Mid-engine supercar | GT prototype | Lifted desert truck | 49cc moped |
| Top speed | 200 km/h | 230 km/h | 150 km/h | **45 km/h** (restricted) |
| Tank | 55 L | 46 L | 95 L | 4.5 L |
| Range | ~5.5 km | ~5.2 km | ~6.8 km | **~12.5 km** |
| Off-road grip | 34% | 20% | 78% | 18% |

The race car is the fastest way between two pumps and the least forgiving if
you overshoot one; the 4x4 shrugs off the sand and can afford one more mistake
than either, but it will not outrun anything.

Those ranges are what a full tank actually covers driven flat out, measured to
the last drop rather than quoted off the spec sheet — the sheet assumes you
cruise, and nobody does.

**The top speeds are the speeds too.** They did not use to be: aero drag was
one constant for the whole garage, so drag rather than the spec decided where
each car ran out of breath, and the supercar advertised 295 km/h and managed
138. The coefficient is worked out per car from its own power and top speed
now, so every number above is one the car reaches. That is also why they are
lower than they were — the old figures were fiction, and making fiction true
would have doubled everything.

### Three you have not met

Three more sit in the garage behind a locked card that will not even tell you
what it is hiding. They are earned by **lifetime distance** — every kilometre
of every run, not one heroic session — and handed over **at a pump**: pass the
mark on the road, and the keys are on the counter the next time you fill up.

| | Earned at | What it is for |
| --- | --- | --- |
| ??? | 100 km | It takes a hit better than anything else here |
| ??? | 500 km | It does not care whether there is a road |
| ??? | 1000 km | The fastest thing on the highway, and the furthest on a tank |

Lifetime rather than per-run is a deliberate choice: a thousand kilometres in
one sitting is nine hours of driving, and a reward nobody can reach is not a
reward. Unlocks live in `localStorage` and survive everything except clearing
your browser data.

### Dirt tracks, and what is at the end of them

Every ten kilometres or so a graded track leaves the highway and runs **400
to 700 metres** out into the desert — call it a kilometre out and back — and
stops at a briefcase. The track is real ground: it grades as gravel, so
following it is far quicker than cutting across the sand beside it.

| In the case | How often |
| --- | --- |
| **$300** in used notes | 50% |
| **A seized engine**: 40 km/h until the next pump, and $100 to fix | 39% |
| A set of keys — one of two cars not in the showroom | 10% and 1% |

Each junction is signposted: a yellow diamond with a skull and an arrow
pointing the way the track goes, so you get the chance to decide before you
are past it.

The seized engine is the reason a track is a bet rather than free money. You
pay for it in the detour either way: a kilometre of fuel and a couple of
minutes off the clock, on a road where both are finite.

Keys you already have turn back into money. The two cars they unlock stay in
the garage for good, like the distance ones — see the locked cards.

### The run keeps until you die

A run in progress is parked every couple of seconds and again the moment the
tab goes away, so **closing the game is not the same as losing.** Come back and
the garage offers **BACK ON THE ROAD** with the day, the distance, the money
and the car you were in; the start button becomes *start a new run*, so nobody
throws two hours away by pressing the big obvious button out of habit.

Everything comes back: where you were on the road, your fuel, your damage, the
hour of day, how awake you are, the money, which pumps you have already used,
which crates you have opened, the passenger in the car and where they are
going, and what the market is charging for petrol tonight.

**Dying deletes it.** That is the whole point of the game ending, and a save
you could reload after running dry would make the fuel gauge a suggestion.
Quitting to the garage does not count as dying — the run is still there.

The road itself is saved with it. Every run rolls a new desert — a different
centre line, different hills, the pumps and beds in different places, the
buttes somewhere else — so resuming has to put you back in *that* one rather
than a fresh one.

**The moped plays a different game.** It burns a fiftieth of what the supercar
does per metre, so four and a half litres will carry it past five gas stations
and to within a few hundred metres of the sixth: the fuel gauge simply stops
being the thing you worry about. What replaces it is the clock. Restricted to
45 km/h it covers 9 km in a day's worth of sleep against motels about 8 km
apart, so it reaches a bed — but only just, and only if nothing goes wrong.
There is no room in its day for a dirt spur, a long fare or a sandstorm sat
out at the roadside: anything that costs time is a night ridden asleep,
wandering, blacking out a second at a time.

And there is nothing around you. A car takes three big hits before it is
finished; the moped takes **one head-on and the run is over**, whatever the
gauges say, because anything coming the other way closes at 120 km/h or more.
Two ordinary shunts from behind do the same. Riding it asleep past oncoming
traffic is exactly as bad an idea as it sounds.

## How it works

```
index.html          markup for the menu, HUD and overlays
styles.css          UI skin
tools/
  build-single.sh   packs the game into one self-contained HTML file
src/
  main.js           boot and the animation loop
  game.js           game state, rules, refuelling, camera work
  track.js          the analytic highway curve (everything hangs off this)
  vehicle.js        arcade car physics and the fuel model
  fatigue.js        sleep: drains on the clock, degrades the driving
  progress.js       lifetime odometer and the three locked vehicles
  daynight.js       the clock: one sleep meter is one day, dawn to dark
  fares.js          passengers: who is waiting where, and what they pay
  weather.js        sandstorms: which stretches of road they own
  difficulty.js     how hard the road is, as a function of how far out
  workshop.js       the counter at every station
  freight.js        loads: what is on the dock and what it is worth
  traffic.js        AI pickups and semis
  input.js          keyboard, touch and gamepad
  audio.js          synthesised engine, tyres and beeps (no audio files)
  effects.js        tyre dust and crash smoke
  ui.js             all DOM updates
  textures.js       every texture, painted on a <canvas>
  rng.js            deterministic hash noise
  cars/             the three player cars, built from extruded side profiles
  world/            sky and the day/night rig, road, terrain, scenery,
                    stations, motels, bus stops, signs, cameras, headlamps,
                    crates, dirt spurs, the briefcases at the end of them,
                    the deer that walk out after dark, the landmarks and
                    the patrol car in the shade, and the one billboard
vendor/three/       three.js r169 (MIT), vendored so the game runs offline
```

A few things worth knowing if you want to poke at it:

- **The road is a function, not a mesh.** `track.js` defines the centre line as
  a sum of sines over the distance travelled, `s`. Every object in the world —
  road ribbon, terrain, cacti, gas stations, traffic, the player — is placed
  through `roadPoint(s, lateral)`, so the whole world stays glued to the curve
  and the highway can run forever.
- **Two ground heights, and using the wrong one is a bug.** `terrainHeight` is
  the analytic surface; `groundHeight` interpolates the same triangle the
  renderer actually draws. Out where the desert mesh has eighty metres between
  columns the two differ by up to eight metres, so scenery planted with the
  analytic value hovered over dunes the mesh had flattened. Everything that
  stands in the sand uses `groundHeight`; only the car's own physics uses the
  smooth analytic one.
- **A mirrored ribbon winds the other way.** The dirt spurs share one index
  buffer, and a spur leaving to the left is the mirror image of one leaving to
  the right: the same vertex order winds clockwise on one side and
  anticlockwise on the other. With front faces only, every spur on one side of
  the highway was culled — half of them, invisible, for as long as they had
  existed. Anything mirrored across the centre line wants `DoubleSide` or an
  index buffer per side.
- **Chunk recycling.** The road and desert are ribbons of quads split into
  100 m chunks. When a chunk falls behind the camera, its vertex buffers are
  rewritten for a slot further up the road; scenery is one `InstancedMesh` per
  prop type per chunk, refilled from a deterministic hash so a stretch of
  desert always regenerates the same way — within a run. Across runs it does
  not: see below.
- **Every run is a different road.** One seed, rolled when you press start,
  feeds `hashRand` and therefore everything the world is made of: the phases,
  amplitudes and frequencies of the sines that shape the centre line and the
  elevation, where the pumps and the beds fall, the dunes, the buttes, the
  cacti, the crates. Pass the same number to `Game.start(car, seed)` and you
  get the same desert back down to the metre — which is how it is tested, and
  how a resumed run lands in the road it left rather than a new one.
- **Fuel and sleep pull in opposite directions.** Petrol is spent per metre and
  cash per litre, while sleep is spent per second. Driving slowly saves fuel
  and money but costs you the bed; driving fast saves the bed but empties the
  tank and the wallet. There is a speed in the middle that keeps all three
  alive, and finding it is the game.
- **The cars are extruded side profiles.** Each body panel is a 2D outline
  extruded across the car, then squeezed laterally by a `bodySculpt()` function
  that pinches the nose and tail and adds tumblehome. That is what turns a slab
  into something car-shaped without any modelling tools. The outlines are
  resampled to a fine step before extruding, so the squeeze has somewhere to
  bend, and the result is shaded with `toCreasedNormals` — smooth across the
  curvature, sharp along the panel creases.
- **Fittings follow the sculpt.** Mirrors, door shut lines, handles and side
  intakes are placed through `flankX()`, which asks the sculpt where the body
  surface actually is at that height and station along the car. Bolted on at a
  fixed offset instead, they sink into the paint at one end and float off it
  at the other.
- **A triangle budget, roughly.** A frame is about 930k triangles over ~1,140
  draw calls, shadow pass included. The scenery is where it goes and where it
  is easiest to overspend: the saguaros alone were half a million triangles
  before they were cut back, because a prop with 168 instances on screen pays
  for every ring you give it.

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
| Aceptar lo que te ofrezcan | `E` | |
| Cámara (persecución / capó / órbita) | `C` | |
| Pausa | `P` o `Esc` | |
| Reiniciar | `R` | |
| Claxon | `H` | |
| Comprar la línea 1–8 del taller | `1`–`8` | |
| Silencio | `M`, o el botón del altavoz arriba a la derecha | |

El botón del altavoz está siempre ahí —en el garaje, conduciendo y en la
pantalla de fin de partida— y calla todo: motor, ruedas, choques y pitidos. La
elección se recuerda, así que una partida que silenciaste en la oficina sigue
callada la próxima vez que la abras.

En móviles y tablets aparecen pedales y botones de dirección en pantalla.

### Menú de depuración

El botón que hay al lado del altavoz abre un panel de depuración. Pide un
**PIN de cuatro dígitos — `5214`** — y a partir de ahí acepta **códigos de
cuatro caracteres**: `FUEL` llena el depósito, `OPEN` te da todo el garaje,
`MEGA` hace gasolina, dinero, sueño, chapa y garaje de golpe, `PUMP` `BEDS`
`HALT` `DIRT` `SAND` te teletransportan a la siguiente gasolinera, motel,
parada, camino de tierra o tormenta, `CAR1`–`CAR9` te cambian de vehículo sin
perder la partida, y hay cuarenta en total — el panel los lista todos y
pinchando en una línea se ejecuta.

Está hecho para que no se cuele en una partida de verdad. **No guarda nada**:
los vehículos que da van a un conjunto que sólo existe en memoria y nunca
llega a localStorage, así que al cerrar la página el garaje está como lo
dejaste. Y **el PIN vive en una variable normal**: recargas y hay que
volver a meterlo. Si te equivocas dice `PIN INCORRECTO` y no pasa nada más.

### Las reglas

- Las gasolineras están a **1,95–2,47 km** unas de otras y un depósito lleno da
  para **5,2–6,8 km** conduciendo fuerte (6,4–8,5 km si eres suave con el
  acelerador). O sea que un coche se salta dos huecos y empieza el tercero:
  **saltarte una gasolinera es una decisión, no una sentencia; saltarte dos
  suele serlo.** El ciclomotor se pasa cinco y lo paga en tiempo.
- Para repostar hay que **salir del asfalto, entrar en la explanada de los
  surtidores y detenerse** (por debajo de ~12 km/h). **La gasolina se paga.**
  Toda la carretera comparte un mismo precio de mercado, cotizado y cobrado
  **por litro**, que abre a **1,13 $**; cada gasolinera se desvía un par de
  céntimos de sus vecinas y llevar el combustible más lejos encarece un poco
  más. Llenar cuesta 62 $ el deportivo y 107 $ la camioneta. Empiezas con
  **500 $ en la guantera**, y llevar gente es la forma de reponerlos.
- **El precio solo se mueve de noche.** Cada noche que pasas en un motel el
  mercado sube entre **2 y 8 céntimos el litro**, a veces más, y al despertar
  te dicen cuánto cuesta ahora. Todos los surtidores suben a la vez. El tope,
  pase lo que pase, son **2,37 $**.
- **La barra de sueño es el reloj.** No es solo una barra de aguante: es la
  hora que es. Sales del garaje a las **07:00** con el sol bajo de la mañana y,
  según baja la barra, el sol cruza el cielo. La luz de día ocupa los tres
  primeros cuartos: mediodía al 30 %, hora dorada al 58 %, el sol en el
  horizonte al 66 %. **Cuando te queda un cuarto de barra son las 21:00 y ya
  es noche cerrada, con los faros puestos y las estrellas fuera** — así que el
  último cuarto de cada día es conducción nocturna con barra de sobra para
  llegar a algún sitio. Cuando la barra se vacía el mundo se para: se queda de
  noche, la luna se queda arriba y por mucho que conduzcas no vuelve a
  amanecer. Solo lo hace una cama: despiertas al alba del día siguiente y el
  contador de días sube.
- **Conducir de noche es otro juego.** Los faros se encienden solos al
  anochecer y a partir de ahí son lo único que tienes: cien metros de asfalto y
  lo que haya plantado en ellos. El desierto se queda en siluetas bajo la luna,
  las señales devuelven la luz de los faros y una gasolinera a cuarenta
  segundos es un resplandor en el horizonte mucho antes de ser un edificio.
  Llegar de noche es el castigo natural por ir despacio — y también es cuando
  mejor se ve el juego.
- **El sueño va por tiempo, no por kilómetros.** **Doce minutos** al volante
  te llevan de estar fresco a caerte de sueño, y lo único que lo arregla es un
  **motel** — la habitación son **20 $**, y están a unos 8 km unos de otros,
  varias gasolineras de por medio. Uno de cada cuatro comparte parcela con una
  gasolinera; el resto están solos en mitad de la nada con su neón. Aparca en
  el parking, párate del todo y te registras.
- Un día de sueño son **24 km a 120 km/h, 14 a 70 y 9 en la Vespino**, contra
  un motel cada 8: cualquier vehículo del garaje llega a una cama, y sobra día
  para parar a por un viaje, meterse por un camino de tierra o esperar a que
  pase una tormenta en vez de ir de cama en cama sin levantar el pie.
- Aun así, agotarla no te quita el coche. El volante se va, la pantalla se
  cierra por los bordes y, pasado el cero, te quedas frito casi un segundo
  cada pocos — pero quien sujeta el volante se mueve menos de dos metros y no
  se sale. El sueño nunca te mata por sí mismo, y tampoco conduce por ti: solo
  te convierte en un conductor mucho peor.
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
- El velocímetro es una esfera analógica, sin cifras digitales. La escala se
  corta a la medida del coche que lleves, para que la aguja aproveche casi todo
  el recorrido: de 0 a 60 de diez en diez en la Vespino, de 0 a 440 de cuarenta
  en cuarenta en el hiperdeportivo, y el tramo que el coche no alcanza va
  marcado en rojo.
- **Cada noche pasa un día**, y el contador de días de la esquina es el reloj
  contra el que se mide toda la partida.
- **La gente espera en las paradas de autobús.** Alguna vez hubo una línea por
  esta carretera; los autobuses dejaron de pasar hace años y las marquesinas
  no. Hay una cada **10 km** más o menos — losa de hormigón, tres paredes, un
  banco, un horario que nadie ha vuelto a imprimir y el cartel de la línea
  todavía en su poste — y en unas **seis de cada diez** hay alguien de pie, que
  se ve desde lejos. Sal al arcén y párate a su lado.
- **Los pasajeros pagan.** La oferta te dice todo **antes** de aceptar: cuánto
  es el viaje, cuánto te paga y cuánta gasolina de más va a gastar, en litros y
  en dólares. Pulsa `E` (o tócalo) para aceptar. Casi todos van a la parada
  siguiente y uno de cada cinco va dos más allá, así que un viaje son **de 10 a
  23 km** — más de un depósito en algunos coches, y normalmente una noche de
  sueño por el camino. Llevar a alguien gasta un **12% más**, y mientras va
  contigo el HUD va **descontando** lo que queda hasta su marquesina. Si paras
  donde te pidió, cobras; si te pasas **500 m**, se baja sin pagarte.
- **La mitad por delante.** Te dan la mitad del viaje al subir y la otra
  mitad al bajarse. Eso cambia lo que es un viaje: deja de ser una promesa que
  te pagan por cumplir y pasa a ser dinero que ya tienes en la mano — un
  depósito que si no no podrías pagar, una cama, la chapa. Y también: pasarte
  de su parada te cuesta la mitad que falta, no todo, y un conductor sin un
  dólar tiene una salida que no consiste sólo en confiar.
- **Y pagan de verdad.** El viaje sale a **44–72 $ el kilómetro** con la
  gasolina recién abierta: **450 $ el corto y más de 1.600 $ el largo**, frente
  a los 62 $ de llenar el deportivo. **La tarifa sigue al surtidor**: aquí todo
  el mundo sabe lo que cuesta la gasolina, así que cuando el mercado sube de
  noche sube con él. Lo que te enseñan es el precio de hoy, y aceptar lo
  congela.
- **El surtidor es también un taller de chapa.** Los daños sólo subían: al
  100% se acababa la partida y no había nada que hacer. Ahora, si paras en una
  gasolinera con el coche abollado, el taller te ofrece sacarte los golpes a
  **9 $ el punto** — un buen topetazo cuesta más o menos lo que paga un viaje.
  Si no llegas, te arregla lo que te dé el dinero, igual que el surtidor te
  vende los litros que puedas pagar. Y es donde por fin va a parar el dinero:
  con el depósito lleno y la cama pagada, la chapa es lo único que queda.
- **Tormentas de arena.** Unas cuantas veces en una partida larga se levanta
  el viento. Primero desaparece el horizonte, luego todo lo que esté a más de
  noventa metros, y la luz se vuelve plana y ocre; un viento cruzado empuja el
  coche lo bastante como para que mantener el carril sea trabajo. **Se ve
  venir** —el cielo se pone marrón casi un kilómetro antes—, así que es una
  decisión y no una emboscada: frenas y pierdes luz de día, o sigues a fondo y
  te encuentras un camión que no ves. Las tormentas pertenecen a un tramo de
  carretera, no a un reloj, así que una semilla dada tiene siempre su tiempo
  en los mismos sitios, y el indicador de **PRÓXIMA PARADA** pasa a ser la
  única forma de encontrar una gasolinera.
- **Un coche abollado conduce como tal.** Los daños eran una barra de vida y
  nada más: al ochenta por ciento se conducía exactamente igual que a cero,
  hasta que al cien se acababa. Ahora el coche se estropea contigo: **un
  quinto del agarre y un décimo de la punta** cuando está para el desguace,
  medio segundo más a los 100 km/h, y un tirón hacia un lado que hay que
  aguantar con el volante. El lado es el suyo y no cambia nunca, así que te lo
  aprendes. Es también lo que hace que merezca la pena pasar por el taller
  antes de que el número dé miedo.
- **Ciervos, de noche.** La noche era un color y poco más. Ahora algo se te
  cruza: uno se queda en el arcén con los ojos encendidos en los faros desde
  muy lejos, aguanta hasta que casi lo tienes encima, y sale corriendo. Si
  levantas el pie a tiempo no pasa nada; si sigues a 140 es una factura en la
  siguiente gasolinera. Sólo andan por ahí cuando ya es noche cerrada. **Toca
  el claxon** y todo lo que haya a doscientos metros sale ya en vez de luego,
  que es para lo que sirve: un ciervo que cruza cuando aún estás lejos es un
  ciervo con el que no te encuentras.
- **Todo lo que va por la carretera lleva las luces puestas.** Los faros y los
  pilotos del tráfico se encienden de noche. Antes un camión de frente era
  invisible hasta que entraba en tus propios faros, y eso no es un peligro,
  es una emboscada. Ahora son dos puntos blancos muy lejos, acercándose.
- **Monumentos.** Cada veintitantos kilómetros hay una cosa que no está hecha
  con las mismas piezas que todo lo demás: un **pueblo abandonado**, un
  **autocine** que nadie apagó, un **avión** panza abajo en la arena, un
  **dinosaurio de carretera**, un **depósito de agua** con la baliza aún
  encendida. Están lejos de la vía y no se pueden tocar; están ahí para que la
  distancia tenga dónde aterrizar. Salen de una baraja, no de un dado, así que
  nunca te toca el mismo dos veces seguidas, y la baraja va con la semilla:
  una partida dada tiene siempre las mismas vistas en los mismos sitios.
- **El pasajero habla.** Cada par de kilómetros, quien va contigo dice algo.
  Doce frases, nunca la misma dos veces seguidas, y lo bastante bajito como
  para ser compañía y no comentario.
- **La carretera se endurece según avanzas.** El kilómetro quinientos se
  jugaba exactamente igual que el cinco. Ahora el desierto se despuebla: a
  trescientos kilómetros los **surtidores están al doble de distancia** (2,4 km
  → 5,2), las **camas dos tercios más lejos** (8,3 → 13,8), hay más tráfico y
  las **tormentas caen el doble de a menudo**. Se satura en vez de subir para
  siempre, así que la carretera llega a ser todo lo mala que va a ser y no
  más — y la respuesta está en el mostrador de cada gasolinera.
- **Una valla publicitaria, en el kilómetro noventa.** Cuarenta y ocho metros
  de valla, en el lado despejado de la carretera: *de aquí en adelante las
  gasolineras se distancian — yo que tú ampliaría el depósito en nuestro
  taller, si no quieres quedarte tirado.* Está donde el margen todavía es
  cómodo, no donde empieza el problema: medido sobre ocho semillas, el peor
  hueco de los sesenta kilómetros siguientes son unos 4,4 km contra los 6,0 km
  de autonomía del coche más sediento del garaje con pasajero y carga — un
  28 % de margen. Hacia el kilómetro 260 ese margen baja al 16 %, y pasado el
  1.400 hay huecos que ese coche no puede cruzar. **Un solo bidón, 340 $, los
  cierra todos.**
- **El taller.** El dinero tenía techo: pasados los primeros viajes el depósito
  siempre estaba lleno y mil dólares compraban la misma partida que diez mil.
  Párate en cualquier gasolinera y hay una lista de precios: enderezar la
  chapa, neumáticos nuevos, **bidones** (+18 L, hasta tres), **compuesto
  blando** (+14 % de agarre), **carrocería reforzada** (−32 % de daños),
  **faros de largo alcance** (70 % más de haz) y **puesta a punto** (+7 % de
  potencia y +4 % de punta por paso, hasta tres). Pulsa el número o pincha la
  línea. Nada sobrevive a la partida: se compra con el dinero que encontraste
  en esta carretera y muere con el coche.
- **Los neumáticos se gastan, y luego revientan.** El consumible que le
  faltaba al juego. La goma se va despacio en asfalto limpio y mucho más
  rápido con lo que antes salía gratis: **la arena se la come cinco veces más
  deprisa**, derrapar se la come, y la velocidad se la come al cuadrado. Quien
  conduce con cabeza saca unos cien kilómetros de un juego; quien vive en los
  caminos de tierra, cuarenta. Si la agotas, una revienta: un estallido, un
  bandazo, un quinto del agarre menos y **60 km/h hasta que compres goma**.
- **Mercancía.** Un viaje son diez o veinte kilómetros. Una carga son **de
  cuarenta a cien**, por un dinero que no tiene comparación, que se coge en una
  gasolinera y se entrega en otra. Y es también un coche que no arranca y no
  frena: **−22 % de potencia, −18 % de freno, 30 % más de gasolina** — y cada
  golpe por el camino rompe una parte, que te descuentan al entregar.
- **Patrulla de carretera.** El límite era un peaje de cincuenta dólares que
  cobraba un radar que veías venir. Ahora hay un coche a la sombra cada seis o
  quince kilómetros, y si pasas a más de **23 km/h por encima** sale con la
  barra encendida. Si te paras son **120 $ más 7 $ por cada km/h de más** — y
  los dos minutos, que en una carretera donde la barra de sueño es el reloj
  son casi todo lo que cuesta. O huyes: hace unos **200 km/h** y se rinde a los
  cuarenta segundos o al kilómetro, así que dos coches del garaje se le van y
  el resto no.
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

| | Vipera GT | Falcon R1 | Ridgeback 4x4 | Avispa 49 |
| --- | --- | --- | --- | --- |
| Tipo | Superdeportivo | Prototipo GT | Camioneta elevada | Ciclomotor 49cc |
| Vel. máxima | 200 km/h | 230 km/h | 150 km/h | **45 km/h** (limitado) |
| Depósito | 55 L | 46 L | 95 L | 4,5 L |
| Autonomía | ~5,5 km | ~5,2 km | ~6,8 km | **~12,5 km** |
| Agarre fuera de asfalto | 34% | 20% | 78% | 18% |

### Tres que no conoces

En el garaje hay tres más detrás de una ficha bloqueada que ni siquiera te dice
qué esconde. Se ganan por **distancia acumulada** —cada kilómetro de cada
partida, no una sesión heroica— y se entregan **en el surtidor**: pasas la
marca en la carretera y las llaves están en el mostrador la próxima vez que
repostes.

| | Se gana a los | Para qué sirve |
| --- | --- | --- |
| ??? | 100 km | Encaja un golpe mejor que nada de lo que hay aquí |
| ??? | 500 km | Le da igual que haya carretera o no |
| ??? | 1000 km | Lo más rápido de la carretera, y lo que más lejos llega |

Que sea acumulada y no de una sola partida es a propósito: mil kilómetros del
tirón son nueve horas al volante, y un premio que nadie puede alcanzar no es un
premio. Los desbloqueos viven en `localStorage` y sobreviven a todo menos a
borrar los datos del navegador.

### Caminos de tierra, y lo que hay al final

Cada diez kilómetros más o menos sale de la carretera un camino de tierra
que se adentra **400 a 700 metros** en el desierto —un kilómetro largo ida y
vuelta— y termina en un maletín. El camino es firme de verdad: cuenta como
grava, así que seguirlo es mucho más rápido que cortar por la arena de al
lado.

| En el maletín | Cada cuánto |
| --- | --- |
| **300 $** en billetes usados | 50% |
| **Motor gripado**: 40 km/h hasta el próximo surtidor, y 100 $ arreglarlo | 39% |
| Unas llaves — uno de dos coches que no están en el concesionario | 10% y 1% |

Cada cruce lleva su cartel: un rombo amarillo con una calavera y una flecha
hacia donde va el camino, para que puedas decidir antes de pasártelo.

El motor gripado es lo que convierte el camino en una apuesta y no en dinero
gratis. El desvío lo pagas igual: un kilómetro de gasolina y un par de
minutos de reloj, en una carretera donde las dos cosas se acaban.

Unas llaves que ya tienes se convierten en dinero. Los dos coches que
desbloquean se quedan en el garaje para siempre, como los de la distancia.

### La partida se guarda hasta que mueras

La partida en curso se aparca cada dos segundos y otra vez en cuanto cierras la
pestaña, así que **cerrar el juego no es lo mismo que perder.** Al volver, el
garaje te ofrece **VOLVER A LA CARRETERA** con el día, la distancia, el dinero
y el coche que llevabas; el botón de empezar pasa a decir *empezar una partida
nueva*, para que nadie tire dos horas por pulsar el botón grande de siempre.

Vuelve todo: dónde estabas en la carretera, la gasolina, los daños, la hora, lo
despierto que vas, el dinero, en qué surtidores ya paraste, qué cajas abriste,
el pasajero que llevas y adónde va, y a cuánto está la gasolina esta noche.

**Morir lo borra.** Para eso se acaba la partida, y un guardado que pudieras
recargar después de quedarte seco convertiría la aguja de la gasolina en una
sugerencia. Salir al garaje no cuenta como morir: la partida sigue ahí.

La carretera se guarda con ella. **Cada partida genera un desierto distinto**
—otra línea central, otras cuestas, las gasolineras y las camas en otros
sitios, las mesetas en otra parte—, así que reanudar tiene que devolverte a
*ese* y no a uno nuevo.

**El ciclomotor juega a otra cosa.** Gasta la cincuentava parte que el
superdeportivo por metro, así que con cuatro litros y medio se planta más allá
de cinco gasolineras y a unos cientos de metros de la sexta: la aguja de la
gasolina deja de ser el problema. Lo que la sustituye es el reloj. Limitado a
45 km/h recorre 9 km con un depósito de sueño lleno contra moteles cada 8 km,
así que llega a la cama — pero justo, y sólo si no pasa nada. En su día no cabe
un camino de tierra, ni un viaje largo, ni esperar a que pase una tormenta:
cualquier cosa que cueste tiempo es una noche montada dormido, dando bandazos
y con apagones de un segundo. **No puedes permitirte perder ni un minuto.**

Y no llevas nada alrededor. Un coche aguanta tres golpes fuertes antes de
quedarse; el ciclomotor se acaba **con un frontal y ya**, marque lo que marque
la barra de daños, porque lo que viene de frente cierra a 120 km/h o más. Dos
alcances por detrás hacen lo mismo. Ir dormido entre el tráfico de frente es
tan mala idea como suena.

## Licence

Game code: MIT. Bundled three.js is MIT, see `vendor/three/LICENSE`.
