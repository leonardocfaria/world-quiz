# World Quiz, Phase 1: Country Names on the Map. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A good-looking practice site where you learn every country's name on a world map: type names to fill the map (main mode), click the country you're asked for, or explore the map freely, one continent at a time or the whole world, with a reset available at any point.

**Architecture:** A static Vite + React SPA. A one-off script copies country data from the world-countries dataset into a committed JSON snapshot. At runtime that snapshot is joined to Natural Earth shapes (`world-atlas` TopoJSON) and drawn as an SVG with d3-geo, using d3-zoom for pan and zoom. All quiz logic lives in one pure reducer. Progress is saved to localStorage.

**Tech Stack:** Vite (react-ts template), React 19, TypeScript, d3-geo, d3-zoom, d3-selection, topojson-client, world-atlas (`countries-50m.json`), Vitest + jsdom + @testing-library/react + @testing-library/user-event.

**Spec:** No separate spec doc. The requirements are the section below, taken from the user's request and their answers on 2026-11-25.

## Requirements

1. World map with a side panel listing countries grouped by continent.
2. Pick a scope: World or one continent. The map re-frames to that continent, and only its countries count.
3. Modes:
   - **Type** (main mode): type a name and press Enter to confirm; if it is correct, the country fills in on the map and in the list. Nothing is accepted without Enter.
   - **Click**: the app names a country and you click it on the map.
   - **Explore**: view every country on the map and in the list, with no quiz.
4. Reset any time. It clears the current scope in the current mode.
5. Country set: the 193 UN members plus Vatican, Palestine, Kosovo and Taiwan. **197 in total.**
6. Data comes from the countries dataset behind REST Countries (`world-countries` package), because the free REST Countries API is shut down.
7. It must not be ugly. A deliberate visual design is part of the work (Task 7).

Out of scope for phase 1, but the data model leaves room for it: a capitals quiz (capitals are already in the snapshot), a cities quiz (REST Countries has no city data, so that phase needs a new source), and dark mode.

## Global Constraints

- Project folder: `C:\Users\leofa\Desktop\Projects\world-quiz`, with its **own** `git init`. Never commit into the parent `Projects` repo, which has unrelated pending deletions.
- Data source: the `world-countries` npm package (devDependency), file `world-countries/countries.json` (the mledoze/countries dataset REST Countries was built on; same field names). REST Countries v3.1 is shut down and v5 needs an API key (found 2026-11-25).
- Included set: `unMember === true` OR `cca3` ∈ `["VAT","PSE","UNK","TWN"]`. Exactly **197**.
- Continents: `Africa`, `Asia`, `Europe`, `North America`, `South America`, `Oceania`. Region `Americas` becomes `South America` when `subregion === "South America"`; every other `Americas` country is `North America`. All other regions map 1:1.
- The country `id` is `cca3` everywhere (state, storage, props).
- The app never calls the API at runtime. It reads only `src/data/countries.json`.
- localStorage key: `world-quiz:v1`.
- Click mode allows 3 wrong clicks per target, then reveals the answer and counts it as missed.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `npm test` (vitest run) and `npx tsc -b` both pass at the end of every task.

## Review Focus

1. **Enter on a wrong or unknown name.** Pressing Enter on "Nigerr" or "Atlantis" counts nothing, keeps the text so you can fix the typo, and shows "Not recognised". Prefix pairs like Niger/Nigeria are never a problem, because only an exact match on Enter counts. Test: Task 6 (UI test).
2. **Spelling variants.** "cote divoire", "Ivory Coast", "Sao Tome and Principe", "St Lucia", "Czech Republic", "Burma", "the gambia", "USA", "UK" are all accepted. Tests: Task 2.
3. **Tiny countries must be clickable.** Vatican, Monaco, Nauru, Tuvalu, Maldives: each one gets a marker when it has no shape or its shape is under about 1,000 km². Test: Task 3 checks that all 197 resolve to a shape or a marker.
4. **Oceania across the antimeridian.** Samoa and Tonga sit at about −172° longitude. In Oceania scope they must appear on screen, not wrapped to the far edge. Test: Task 5 (`projectionFor`).
5. **API drift or corrupt storage.** The fetch script exits non-zero unless it finds exactly 197 countries and no continent is empty. A garbage value under `world-quiz:v1` starts the app fresh instead of crashing it. Tests: Task 1 and Task 4.

---

## File Structure

```
world-quiz/
  scripts/fetch-countries.ts     fetch → filter → map → write snapshot (thin; logic in fromApi.ts)
  src/data/countries.json        generated, committed
  src/data/aliases.ts            hand-written extra names per cca3
  src/geo/fromApi.ts             RawCountry → Country mapping, inclusion rule, validation
  src/geo/countries.ts           Country/Continent/Scope types, COUNTRIES, countriesIn()
  src/geo/world.ts               join TopoJSON features to countries, tiny-country markers
  src/geo/projection.ts          projectionFor(scope, w, h), SCOPE_BOXES
  src/quiz/match.ts              normalize, name index
  src/quiz/reducer.ts            QuizState, actions, createQuizReducer, selectors
  src/quiz/storage.ts            loadSaved / save
  src/map/WorldMap.tsx           SVG map, zoom, status colours, markers, tooltip
  src/panel/SidePanel.tsx        mode switch, scope tabs, progress, grouped list
  src/panel/TypeBox.tsx          input with Enter-to-confirm
  src/panel/ClickPrompt.tsx      "Click: X" + tries left
  src/App.tsx, src/main.tsx, src/styles.css
  tests sit next to the code as *.test.ts(x)
```

---

### Task 1: Scaffold + country data snapshot

**Files:**
- Create: the project via `npm create vite@latest world-quiz -- --template react-ts`, then `git init`
- Create: `scripts/fetch-countries.ts`, `src/geo/fromApi.ts`, `src/geo/countries.ts`, `src/data/countries.json`
- Test: `src/geo/fromApi.test.ts`, `src/geo/countries.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // countries.ts
  export type Continent = 'Africa'|'Asia'|'Europe'|'North America'|'South America'|'Oceania';
  export const CONTINENTS: readonly Continent[];          // in the order above
  export type Scope = Continent | 'World';
  export interface Country {
    id: string; ccn3: string | null; name: string; officialName: string;
    altNames: string[]; capitals: string[]; continent: Continent; latlng: [number, number];
  }
  export const COUNTRIES: Country[];                       // from countries.json
  export function countriesIn(scope: Scope): Country[];
  // fromApi.ts
  export interface RawCountry { name:{common:string;official:string}; cca3:string; ccn3?:string;
    capital?:string[]; region:string; subregion?:string; latlng:number[]; unMember:boolean; altSpellings:string[] }
  export function isIncluded(raw: RawCountry): boolean;
  export function continentOf(region: string, subregion?: string): Continent | null;
  export function toCountry(raw: RawCountry): Country;     // altNames = altSpellings with length >= 3
  export function validateSnapshot(cs: Country[]): string[]; // list of problems; empty = OK
  ```

- [ ] **Step 1: Scaffold.** Run `npm create vite@latest world-quiz -- --template react-ts`, `git init`, then `npm i d3-geo d3-zoom d3-selection topojson-client world-atlas` and `npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/d3-geo @types/d3-zoom @types/d3-selection @types/topojson-client @types/geojson tsx`. Add `"test": "vitest run"` and `"fetch-data": "tsx scripts/fetch-countries.ts"` to the scripts, and set the vitest `environment: 'jsdom'` in `vite.config.ts`. Delete the template's demo content.
- [ ] **Step 2: Write failing tests in `fromApi.test.ts`:**
  - `continentOf('Americas','South America') === 'South America'`, `continentOf('Americas','Caribbean') === 'North America'`, `continentOf('Antarctic') === null`, `continentOf('Europe') === 'Europe'`
  - `isIncluded` returns true for `{cca3:'UNK', unMember:false}` and `{cca3:'TWN', unMember:false}`, and false for `{cca3:'GRL', unMember:false}`
  - `toCountry` drops `altSpellings` entries shorter than 3 characters and sets `ccn3: null` when the field is missing (Kosovo)
  - `validateSnapshot` returns a non-empty list for 196 countries, for a duplicate id, and for an empty continent
- [ ] **Step 3: Run `npm test`.** Expected: FAIL (module not found).
- [ ] **Step 4: Implement `fromApi.ts`.** Then write `scripts/fetch-countries.ts`: fetch the Global Constraints URL, filter with `isIncluded`, map with `toCountry`, sort by `name`, and run `validateSnapshot`. If it returns any problems, print them and `process.exit(1)`. Otherwise write `src/data/countries.json` (2-space indent).
- [ ] **Step 5: Run `npm run fetch-data`.** Expected: `countries.json` holds 197 entries. If validation fails, fix the mapping, never the count.
- [ ] **Step 6: Implement `countries.ts`.** Then write `countries.test.ts`: `COUNTRIES.length === 197`, the per-continent counts add up to 197, `countriesIn('World').length === 197`, and `countriesIn('South America')` contains `BRA` but not `MEX`.
- [ ] **Step 7: Run `npm test` and `npx tsc --noEmit`.** Expected: PASS.
- [ ] **Step 8: Commit** `feat: scaffold app and country data snapshot`.

### Task 2: Name matching

**Files:**
- Create: `src/quiz/match.ts`, `src/data/aliases.ts`
- Test: `src/quiz/match.test.ts`

**Interfaces:**
- Consumes: `Country`, `COUNTRIES`
- Produces:
  ```ts
  export function normalize(s: string): string;
  export type NameIndex = Map<string, string>;   // normalized key → cca3
  export function buildNameIndex(cs: Country[], aliases: Record<string, string[]>): NameIndex;
  export function matchName(input: string, index: NameIndex): string | null;
  // aliases.ts
  export const ALIASES: Record<string, string[]>;  // cca3 → extra names
  ```

`normalize`, in this order: NFD, then strip `\p{M}`, lowercase, `&`→`and`, the whole word `st`→`saint`, strip a leading `the `, remove every non-`[a-z0-9]` character. So `"Côte d'Ivoire"` becomes `"cotedivoire"`.

`buildNameIndex` keys: `name`, `officialName`, `altNames` and `ALIASES[id]`, all normalized. A key that points to two different ids gets **removed**.

Initial `ALIASES`, the minimum set:
`USA:[US,USA,America,United States of America]`, `GBR:[UK,Britain,Great Britain]`, `COD:[DRC,DR Congo,Congo Kinshasa,Democratic Republic of Congo]`, `COG:[Republic of Congo,Congo Brazzaville]`, `CIV:[Ivory Coast]`, `CZE:[Czech Republic,Czechia]`, `SWZ:[Swaziland,Eswatini]`, `MMR:[Burma]`, `MKD:[Macedonia]`, `TLS:[East Timor]`, `CPV:[Cape Verde,Cabo Verde]`, `VAT:[Vatican,Vatican City,Holy See]`, `PRK:[North Korea]`, `KOR:[South Korea]`, `ARE:[UAE]`, `CAF:[CAR]`, `BIH:[Bosnia]`, `FSM:[Micronesia]`, `TUR:[Turkey,Turkiye]`, `PSE:[Palestine]`, `NLD:[Holland]`, `LAO:[Laos]`, `VNM:[Vietnam,Viet Nam]`, `STP:[Sao Tome]`, `KNA:[Saint Kitts]`, `VCT:[Saint Vincent]`, `UNK:[Kosovo]`, `TWN:[Taiwan]`.

- [ ] **Step 1: Write failing tests:**
  - `normalize("Côte d'Ivoire") === 'cotedivoire'`, `normalize('St. Lucia') === 'saintlucia'`, `normalize('The Gambia') === 'gambia'`, `normalize('Bosnia & Herzegovina') === 'bosniaandherzegovina'`
  - with the real index: `matchName` maps each of `cote divoire`, `Ivory Coast`, `sao tome and principe`, `St Lucia`, `czech republic`, `burma`, `the gambia`, `usa`, `UK`, `kosovo`, `taiwan` to the right id
  - `matchName('Korea') === null` (ambiguous or absent), `matchName('xyz') === null`
  - a synthetic index where two countries share an alias: that key is absent
  - prefix pairs stay distinct: `niger`→`NER`, `nigeria`→`NGA`, `guinea`→`GIN`, `guinea bissau`→`GNB`, `dominica`→`DMA`, `dominican republic`→`DOM`
  - every one of the 197 `name`s matches its own id (catches collisions the API introduces)
- [ ] **Step 2: Run `npm test -- match`.** Expected: FAIL.
- [ ] **Step 3: Implement `match.ts` and `aliases.ts`.**
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: country name matching with aliases`.

### Task 3: Join map shapes to countries

**Files:**
- Create: `src/geo/world.ts`
- Test: `src/geo/world.test.ts`

**Interfaces:**
- Consumes: `Country`, `COUNTRIES`; `world-atlas/countries-50m.json` (import as JSON)
- Produces:
  ```ts
  export interface MapShape { key: string; countryId: string | null; feature: Feature<Geometry> }
  export interface Marker { countryId: string; lnglat: [number, number] }
  export interface WorldData { shapes: MapShape[]; markers: Marker[] }
  export const TINY_AREA_SR = 2.5e-5;   // ≈1,000 km²
  export function buildWorld(topology: Topology, countries: Country[]): WorldData;
  export const WORLD: WorldData;          // buildWorld(countries50m, COUNTRIES), computed once
  ```

How the join works: `topojson.feature(topology, topology.objects.countries)`. A feature matches a country when `feature.id === country.ccn3`, or, failing that, when `feature.properties.name === country.name` (this covers Kosovo). A shape with no match gets `countryId: null`; it is drawn as neutral land and cannot be clicked. A country gets a marker when it has no shape, or when `d3.geoArea(shape) < TINY_AREA_SR`. The marker sits at `[latlng[1], latlng[0]]`. `key` is the feature id, or its name when there is no id.

- [ ] **Step 1: Write failing tests:** every one of the 197 ids has a shape or a marker; the non-null `countryId`s across shapes are unique; `VAT`, `MCO`, `NRU`, `TUV`, `MDV` each have a marker; `BRA` and `RUS` have shapes and no markers; `UNK` and `TWN` have shapes.
- [ ] **Step 2: Run `npm test -- world`.** Expected: FAIL.
- [ ] **Step 3: Implement `world.ts`.**
- [ ] **Step 4: Run `npm test`.** Expected: PASS. If a country has neither a shape nor a marker, the code is wrong: every country has `latlng`.
- [ ] **Step 5: Commit** `feat: join world-atlas shapes to countries`.

### Task 4: Quiz state + persistence

**Files:**
- Create: `src/quiz/reducer.ts`, `src/quiz/storage.ts`
- Test: `src/quiz/reducer.test.ts`, `src/quiz/storage.test.ts`

**Interfaces:**
- Consumes: `Country`, `Scope`, `countriesIn`
- Produces:
  ```ts
  export type Mode = 'explore' | 'type' | 'click';
  export type QuizMode = Exclude<Mode, 'explore'>;
  export interface Progress { found: string[]; missed: string[] }
  export type Feedback =
    | { kind: 'correct'; id: string } | { kind: 'already'; id: string }
    | { kind: 'other-scope'; id: string; continent: Continent }
    | { kind: 'wrong-click'; id: string; triesLeft: number } | { kind: 'revealed'; id: string };
  export interface QuizState { mode: Mode; scope: Scope; progress: Record<QuizMode, Progress>;
    target: string | null; wrongTries: number; feedback: Feedback | null }
  export type QuizAction =
    | { type: 'setMode'; mode: Mode } | { type: 'setScope'; scope: Scope }
    | { type: 'typed'; id: string } | { type: 'clicked'; id: string }
    | { type: 'giveUp' } | { type: 'reset' } | { type: 'retryMissed' };
  export function initialState(saved?: Partial<QuizState> | null): QuizState; // mode 'type', scope 'World'
  export function createQuizReducer(random: () => number): (s: QuizState, a: QuizAction) => QuizState;
  export type CountryStatus = 'found' | 'missed' | 'pending' | 'target' | 'out';
  export function statusOf(s: QuizState, c: Country): CountryStatus;
  export function pendingIn(s: QuizState): string[];  // scope ids not in found/missed of current quiz mode
  // storage.ts
  export function loadSaved(): Pick<QuizState,'mode'|'scope'|'progress'> | null;
  export function save(s: QuizState): void;
  ```

Rules the tests pin:
- Type and Click keep separate progress. Explore has none, and `statusOf` returns `'found'` for everything in scope in Explore, so the whole scope shows as coloured.
- `typed`: a pending id in scope goes into `found` with feedback `correct`; an id already found or missed gives `already`; an id outside the scope gives `other-scope` with its continent, and progress does not change.
- `clicked` (click mode only, in-scope ids only; anything else is ignored): the target goes into `found`, `wrongTries` resets to 0, and a new target is picked. Any other in-scope id raises `wrongTries` and gives `wrong-click` with `triesLeft = 3 - wrongTries`. On the 3rd wrong click the target goes into `missed`, feedback is `revealed`, and a new target is picked.
- The target is chosen as `pending[Math.floor(random() * pending.length)]`, or `null` when nothing is pending. `setScope`, `setMode('click')`, `reset` and `retryMissed` all choose a new target.
- `giveUp`: every pending id in scope goes into `missed`, and the target becomes `null`.
- `reset`: removes the scope's ids from both `found` and `missed` of the current quiz mode. Other scopes are untouched.
- `retryMissed`: removes the scope's ids from `missed` only.
- `statusOf` returns `out` for any country outside the scope, in every mode.

- [ ] **Step 1: Write failing reducer tests,** one per rule above. Use `createQuizReducer(() => 0)` so the target is the first pending id. Include: typing `BRA` with scope `Europe` gives `other-scope` with continent `'South America'` and found stays empty; `reset` in Europe after finding `FRA` and `BRA` (the latter in World scope) leaves `BRA` found.
- [ ] **Step 2: Write failing storage tests:** a `save` then `loadSaved` round-trip keeps progress; `localStorage.setItem('world-quiz:v1','{bad')` makes `loadSaved()` return `null`; `{"progress":{"type":{"found":[1,2]}}}` (wrong types) returns `null`; when `localStorage.getItem` throws (stub it), `loadSaved()` returns `null` and `save` does not throw.
- [ ] **Step 3: Run `npm test -- quiz`.** Expected: FAIL.
- [ ] **Step 4: Implement `reducer.ts` and `storage.ts`.** Storage writes only `{mode, scope, progress}`. Every access is wrapped in try/catch. On load, check that `mode` is one of the three modes, `scope` is `'World'` or a continent, and every id is a string; otherwise return `null`.
- [ ] **Step 5: Run `npm test`.** Expected: PASS.
- [ ] **Step 6: Commit** `feat: quiz reducer and saved progress`.

### Task 5: World map component

**Files:**
- Create: `src/geo/projection.ts`, `src/map/WorldMap.tsx`
- Test: `src/geo/projection.test.ts`, `src/map/WorldMap.test.tsx`

**Interfaces:**
- Consumes: `WORLD`/`WorldData`, `Scope`, `CountryStatus`, `Continent`
- Produces:
  ```ts
  // projection.ts
  export const MAP_W = 1000, MAP_H = 600;
  export const SCOPE_BOXES: Record<Scope, { center: number; box: [[number, number], [number, number]] }>;
  export function projectionFor(scope: Scope, w?: number, h?: number): GeoProjection;
  // WorldMap.tsx
  export interface WorldMapProps {
    world: WorldData; scope: Scope;
    statusOf: (id: string) => CountryStatus;
    continentOf: (id: string) => Continent;
    focusId: string | null;            // explore: zoom to this country
    onCountryClick: (id: string) => void;
    tooltip: (id: string) => string | null;   // text on hover; null = no tooltip
  }
  export function WorldMap(p: WorldMapProps): JSX.Element;
  ```

`SCOPE_BOXES` values, as `[[west, south], [east, north]]` with east allowed to go past 180:
World `center 10`, box ignored (fit to `{type:'Sphere'}`); Africa `20, [[-20,-36],[55,38]]`; Europe `15, [[-25,34],[45,72]]`; Asia `90, [[25,-12],[150,56]]`; North America `-100, [[-170,5],[-50,75]]`; South America `-60, [[-85,-57],[-33,14]]`; Oceania `165, [[110,-50],[190,5]]`.

`projectionFor` returns `geoEqualEarth().rotate([-center, 0])` fitted with `fitExtent([[20,20],[w-20,h-20]], ...)`. The fit target is a `MultiPoint` of the box's 4 corners plus the two edge midpoints, which avoids polygon-winding problems.

Map behaviour:
- An SVG with `viewBox="0 0 1000 600"` and `preserveAspectRatio="xMidYMid meet"`. Path strings are recomputed only when `scope` changes (useMemo).
- d3-zoom runs on the SVG with `scaleExtent([1, 30])`. On a scope change the zoom resets to identity. When `focusId` changes, it transitions to scale 4 centred on that country's path centroid (or its marker).
- Fill comes from status: `found` gets the continent colour, `missed` the missed colour, `target` uses the pending colour with no hint, `pending` gets the land colour, `out` is land at opacity 0.35. Borders use `vector-effect: non-scaling-stroke`.
- A marker is a circle with radius `5 / k`, where k is the zoom scale, so it stays 5 px on screen. It gets the same status colour as a shape.
- `pointerup` on a shape or marker with a countryId calls `onCountryClick`, but only when the pointer moved less than 4 px since `pointerdown`, so a pan is not taken as a click.
- Hovering shows `tooltip(id)` beside the cursor when it is non-null.
- Each shape or marker has `data-id={countryId}`, `data-status={statusOf(id)}` and `aria-label={tooltip(id) ?? 'country'}`. Task 6's UI tests read `data-status`.
- `App` adapts the reducer's `statusOf(state, country)` into the `(id) => CountryStatus` prop.

- [ ] **Step 1: Write failing projection tests:** for `Oceania`, Samoa `[-172.3, -13.6]` and Australia `[134, -25]` both project inside `[0,1000]×[0,600]`; for `Europe`, Paris `[2.35, 48.85]` projects inside and Tokyo `[139.7, 35.7]` projects outside the viewport.
- [ ] **Step 2: Write a failing component smoke test:** render `WorldMap` with `WORLD`, scope `World`, and `statusOf = () => 'pending'`. Expect at least 190 elements with `[data-id]`. Firing `pointerdown` then `pointerup` on `[data-id="BRA"]` calls `onCountryClick('BRA')`.
- [ ] **Step 3: Run `npm test -- projection WorldMap`.** Expected: FAIL.
- [ ] **Step 4: Implement `projection.ts` and `WorldMap.tsx`.** Colours come from CSS variables (`--c-africa` and so on) defined in Task 7; use plain placeholder values in `styles.css` for now.
- [ ] **Step 5: Run `npm test`.** Expected: PASS.
- [ ] **Step 6: Commit** `feat: zoomable world map with per-continent framing`.

### Task 6: Side panel, modes, and app wiring

**Files:**
- Create: `src/panel/SidePanel.tsx`, `src/panel/TypeBox.tsx`, `src/panel/ClickPrompt.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: everything above
- Produces:
  ```ts
  export interface TypeBoxProps { index: NameIndex; onMatch: (id: string) => void }
  export interface ClickPromptProps { targetName: string | null; triesLeft: number }
  export interface SidePanelProps { state: QuizState; dispatch: (a: QuizAction) => void; onFocus: (id: string) => void }
  ```

Behaviour:
- `App` holds `useReducer(createQuizReducer(Math.random), loadSaved(), initialState)`, calls `save(state)` in an effect whenever progress, mode or scope changes, and keeps `focusId` as local state. Layout: the map fills the viewport and the panel sits on the right at 360 px wide, with a collapse button. Below 760 px wide the panel becomes a bottom drawer capped at 45vh.
- **Panel top:** a mode switch (Type · Click · Explore, in that order, Type first since it is the main mode); scope tabs (World + 6 continents), each showing `found/total` for the current quiz mode; a progress bar; and the buttons **Reset**, **Give up** (quiz modes only), and **Retry missed** (only when the scope has missed countries).
- **TypeBox:** autofocused. Nothing happens while typing; only **Enter** submits. On Enter it computes `id = matchName(value)`:
  - `id` found: call `onMatch(id)` and clear the input. The reducer decides `correct`, `already` or `other-scope`.
  - no match: keep the text, show "Not recognised" (TypeBox-local, not in the reducer), and shake the input for 300 ms.
  - empty input: do nothing.
  - Esc clears the input.
- **Feedback line** under the input: `correct` gives "✓ Brazil", `already` gives "Already found: Brazil", `other-scope` gives "Brazil is in South America", `wrong-click` gives "That's Chad. 2 tries left", `revealed` gives "It was Niger".
- **List:** grouped by continent (only the scope's continent unless the scope is World), each group headed `Europe · 12/45`.
  - In quiz modes: found names in continent colour, missed names in the missed colour, and pending shown only as a count ("33 left"), so the list never gives answers away.
  - In Explore: every name, A to Z, each clickable to set `focusId`.
- **When the scope is complete:** a summary card shows "45/45 found" (or found and missed counts) with buttons Retry missed and Reset.

- [ ] **Step 1: Write failing UI tests in `App.test.tsx`** (user-event):
  - typing `brazil` without Enter counts nothing; `brazil{Enter}` puts "Brazil" in the list, sets `data-status="found"` on `[data-id="BRA"]`, and clears the input
  - with Europe selected, `brazil{Enter}` shows "Brazil is in South America", and BRA stays not found
  - `niger{Enter}` finds Niger only; `nigeria{Enter}` then finds Nigeria
  - `nigerr{Enter}` shows "Not recognised", the input still holds `nigerr`, and the found count is unchanged
  - Reset clears the found count of the current scope to 0
  - Give up marks the remaining countries as missed and shows Retry missed
  - Click mode: the prompt names a country; clicking that country's `[data-id]` raises the found count to 1
- [ ] **Step 2: Run `npm test -- App`.** Expected: FAIL.
- [ ] **Step 3: Implement `TypeBox`, `ClickPrompt`, `SidePanel`, and the `App` wiring.**
- [ ] **Step 4: Run `npm test` and `npx tsc --noEmit`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: side panel, type/click/explore modes, reset`.

### Task 7: Visual design + browser check

**Files:**
- Modify: `src/styles.css`, `index.html` (fonts, title "World Quiz"), and minor markup in panel and map components

Design decisions (a warm "paper atlas" look, light theme only):
- Tokens on `:root`: `--ocean #dce7ec`, `--land #f4efe4`, `--border #b8b0a0`, `--ink #23262b`, `--muted #6b6f76`, `--panel #fbf9f4`, `--missed #d9483b`. Continent colours: `--c-africa #d98e4a`, `--c-asia #c65a52`, `--c-europe #5679b3`, `--c-north-america #5c9b76`, `--c-south-america #9c75bf`, `--c-oceania #3a9e9e`.
- Fonts (Google Fonts): **Fraunces** for the title and group headings, **Inter** for everything else. Country names in the list are set at 14 px.
- Motion: a newly found country fades from `--land` to its colour over 250 ms; a wrong click flashes the clicked country `--missed` for 400 ms; a hovered shape gets a 1.5 px `--ink` outline. Respect `prefers-reduced-motion`.
- Accessibility: visible focus rings; feedback line uses `aria-live="polite"`; contrast ≥ 4.5:1 for text on `--panel`.
- No horizontal scroll at 375 px width.

- [ ] **Step 1: Apply the tokens, fonts, motion, and responsive layout.** Use the frontend-design skill for spacing and hierarchy details.
- [ ] **Step 2: Run `npm test`.** Expected: PASS (no behaviour change).
- [ ] **Step 3: Run `npm run dev` and check it in the browser:**
  - type 5 European countries in Europe scope
  - switch to Oceania and confirm Samoa and Tonga are on screen
  - in Click mode, click Vatican's marker
  - reload and confirm progress survived
  - check the 375 px layout
  - take a screenshot of each scope
- [ ] **Step 4: Run `npm run build`.** Expected: exits 0.
- [ ] **Step 5: Commit** `style: paper-atlas visual design`.
