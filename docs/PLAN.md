# Plan de desarrollo — Truco Argentino (PWA)

> Documento vivo. Quien continúe el proyecto: leé **Decisiones**, buscá la primera tarea `[ ]`
> en **Etapas** y revisá el **Registro de progreso** al final.
> Para ejecutar una etapa en Antigravity usá `/plan` pidiendo "Etapa N de docs/PLAN.md":
> el Implementation Plan nativo detalla los pasos; este archivo marca el avance global.

## 1. Decisiones tomadas (2026-11-16)

| Tema                     | Decisión                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plataforma               | PWA instalable en celular. React + Vite + TypeScript                                                                                              |
| Persistencia             | Local (`localStorage`), offline, sin backend ni cuentas                                                                                           |
| Modalidad                | 1 vs 1 contra la máquina                                                                                                                          |
| Flor                     | **No** se juega con Flor                                                                                                                          |
| Puntos                   | Seleccionable: 15 o 30 (30 = malas 0-15 / buenas 15-30)                                                                                           |
| Falta Envido             | En malas gana el partido; en buenas (y a 15) vale lo que le falta al que va ganando                                                               |
| Irse al mazo             | En 1ª baza sin envido cantado → rival suma 2 (1 truco + 1 envido no cantado). Si no, lo que valga el truco en juego                               |
| "El envido está primero" | Permitido: ante Truco en 1ª baza se puede responder Envido                                                                                        |
| Dificultad               | Fácil / Medio / Difícil, con personaje gaucho distinto por nivel                                                                                  |
| Personajes               | Fácil: "El Pibe" · Medio: "Don Ramón" · Difícil: "El Viejo Vizcacha"                                                                              |
| Estética                 | Campo argentino: mesa de madera, mate, pampa, tipografía criolla. Cartas españolas en SVG propio                                                  |
| Mesa                     | Las cartas jugadas en bazas anteriores quedan visibles (por baza) durante toda la mano                                                            |
| Extras                   | Animaciones de reparto/jugada · globos de diálogo + sonidos (voz TTS opcional) · estadísticas · tutorial/reglas · anotador con palitos (fósforos) |
| Historial                | Se guarda cada partida terminada (fecha, dificultad, puntos, resultado, duración)                                                                 |
| Partida en curso         | Se guarda tras cada acción; al abrir la app se ofrece "Continuar partida"                                                                         |
| Git / tests              | Repo local, Conventional Commits, ≥1 commit por tarea, tag por etapa. Vitest para engine/ai/persistence                                           |

## 2. Organización de la documentación para agentes

- `AGENTS.md` — reglas siempre activas (stack, arquitectura, prohibiciones). Corto.
- `.agents/skills/` — documentación técnica bajo demanda, una por módulo:
  - `truco-reglas` — jerarquía de cartas, envido, truco, pardas, puntuación exacta.
  - `truco-ia` — diseño de los bots por dificultad.
  - `persistencia` — esquema de guardado, versiones y migraciones.
  - `ui-estetica` — paleta, tipografía, cartas SVG, mesa, anotador, animaciones, sonido.
  - `etapas-y-commits` — procedimiento para cerrar tareas/etapas y commitear.
- `docs/PLAN.md` — este archivo: decisiones, etapas, progreso.

## 3. Etapas

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha. Commit sugerido entre paréntesis.

### Etapa 0 — Planificación ✅

- [x] Definir decisiones con el usuario
- [x] Crear `AGENTS.md`, skills y `docs/PLAN.md` (`docs: plan inicial, reglas y skills`)

### Etapa 1 — Entorno y esqueleto ✅

> Requisito: Node.js LTS (≥ 20). Instalado v26.13.1 / npm 11.20.0 vía `winget install OpenJS.NodeJS.LTS`.

- [x] Instalar Node.js LTS y verificar `node -v`, `npm -v`
- [x] Scaffold Vite React-TS en la raíz (`chore: scaffold vite react-ts`)
- [x] ESLint + Prettier + `tsconfig` strict (`chore: lint y formato`)
- [x] Vitest + Testing Library + test de humo (`test: configura vitest`)
- [x] Estructura de carpetas `src/{engine,ai,persistence,store,ui}` y scripts `lint/test/build` (`chore: estructura de capas`)
- [x] `README.md` con cómo correr el proyecto (`docs: readme`)
- Hecho cuando: `npm run lint && npm test && npm run build` pasa. Tag `etapa-1`.

### Etapa 2 — Engine: cartas y envido ✅

- [x] Tipos `Suit`, `Card`, mazo de 40 cartas, RNG con semilla, mezclar y repartir (`feat(engine): mazo y reparto`)
- [x] Jerarquía de truco y `compareCards` (`feat(engine): jerarquia de cartas`)
- [x] `calculateEnvido(hand)` (`feat(engine): calculo de envido`)
- [x] Tests exhaustivos de jerarquía y envido (todas las combinaciones relevantes)
- Hecho cuando: cobertura de `engine/cards` y `engine/envido` ≥ 95 %. Tag `etapa-2`.

### Etapa 3 — Engine: flujo de la mano y truco ✅

- [x] Estado de partida/mano serializable, turnos, mano/pie (`feat(engine): estado de mano`)
- [x] Bazas, ganador de baza, reglas de parda completas (`feat(engine): bazas y pardas`)
- [x] Truco / Retruco / Vale Cuatro con quién puede subir, quiero / no quiero (`feat(engine): cantos de truco`)
- [x] Irse al mazo con la regla decidida (`feat(engine): irse al mazo`)
- [x] `getLegalActions(state)` y `applyAction(state, action)` (`feat(engine): acciones legales`)
- [x] Tests de todos los escenarios de parda, cantos y mazo
- Tag `etapa-3`.

### Etapa 4 — Engine: envido en juego y puntuación ✅

- [x] Cantos Envido / Real Envido / Falta Envido, secuencias y "el envido está primero" (`feat(engine): cantos de envido`)
- [x] Tabla de puntos querido / no querido (`feat(engine): puntos de envido`)
- [x] Falta Envido según malas/buenas y partida a 15 (`feat(engine): falta envido`)
- [x] Suma de puntos al final de la mano, fin de partida inmediato al llegar al objetivo (`feat(engine): puntuacion y fin de partida`)
- [x] Simulación: 10 000 manos aleatorias sin errores ni puntajes inválidos (`test(engine): simulacion masiva`)
- Tag `etapa-4`. **Punto de control con el usuario: revisar tabla de puntos.**

### Etapa 5 — IA por dificultad ✅

- [x] Interfaz `Bot` (`decide(view) => Action`), vista con información oculta (`feat(ai): interfaz de bot`)
- [x] Fácil — "El Pibe" (`feat(ai): bot facil`)
- [x] Medio — "Don Ramón" (`feat(ai): bot medio`)
- [x] Difícil — "El Viejo Vizcacha" (Monte Carlo + mentiras + modelo del rival) (`feat(ai): bot dificil`)
- [x] Torneo automático: Difícil > Medio > Fácil en ≥ 1000 partidas (`test(ai): torneo entre bots`)
- Tag `etapa-5`.

### Etapa 6 — Persistencia ✅

- [x] Guardar/cargar partida en curso tras cada acción (`feat(persistence): partida en curso`)
- [x] Historial de partidas terminadas (`feat(persistence): historial`)
- [x] Estadísticas acumuladas y configuración (`feat(persistence): estadisticas y config`)
- [x] Versionado de esquema + migraciones + tolerancia a datos corruptos (`feat(persistence): versionado`)
- Tag `etapa-6`.

### Etapa 7 — UI funcional (sin estética final) ✅

- [x] Store Zustand conectando engine + ai + persistence (`feat(store): store de partida`)
- [x] Pantalla inicio: Nueva partida / Continuar / Historial / Estadísticas / Reglas (`feat(ui): pantalla inicio`)
- [x] Nueva partida: dificultad + 15/30 (`feat(ui): configuracion de partida`)
- [x] Mesa jugable: mano propia, botones de canto, turnos de la máquina (`feat(ui): mesa jugable`)
- [x] Cartas de bazas anteriores visibles por baza (`feat(ui): bazas visibles`)
- [x] Resumen de mano: envidos mostrados, puntos sumados (`feat(ui): resumen de mano`)
- [x] Pantallas historial y estadísticas (`feat(ui): historial y estadisticas`)
- Hecho cuando: se puede jugar una partida completa de punta a punta. Tag `etapa-7`.

### Etapa 8 — Estética de campo ✅

- [x] Paleta, tipografías, fondo de mesa de madera/pampa (`style(ui): tema campero`)
- [x] 40 cartas españolas en SVG (componente generado) + dorso (`feat(ui): cartas svg`)
- [x] Avatares de los 3 personajes (`feat(ui): personajes`)
- [x] Anotador con palitos/fósforos (grupos de 5, malas/buenas) (`feat(ui): anotador de palitos`)
- [x] Responsive móvil vertical primero (`style(ui): responsive`)
- Tag `etapa-8`. **Punto de control con el usuario: aprobación visual.**

### Etapa 9 — Animaciones, sonido y frases

- [ ] Animación de reparto y de jugar carta (`feat(ui): animaciones`)
- [ ] Globos de diálogo con frases por personaje (`feat(ui): globos de dialogo`)
- [ ] Efectos de sonido + voz TTS opcional + botón silencio (`feat(ui): sonido y voz`)
- Tag `etapa-9`.

### Etapa 10 — Tutorial, PWA y cierre

- [ ] Reglas y tutorial interactivo dentro de la app (`feat(ui): tutorial y reglas`)
- [ ] PWA: manifest, íconos, offline (`feat: pwa instalable`)
- [ ] Accesibilidad básica, QA manual en celular, corrección de bugs (`fix: ...`)
- [ ] Build final y release (`chore: release v1.0.0`). Tag `v1.0.0`.

## 4. Registro de progreso

<!-- Una línea por tarea terminada: fecha · etapa · tarea · commit -->

- 2026-11-16 · Etapa 0 · Decisiones, AGENTS.md, skills y plan · `docs: plan inicial, reglas y skills`
- 2026-11-16 · Etapa 1 · Node.js LTS 26 instalado + scaffold Vite 8 / React 18 / TS (manual, sin create-vite) · `chore: scaffold vite react-ts`
- 2026-11-16 · Etapa 1 · ESLint 10 (reglas de capas, engine sin Math.random/Date.now/DOM) + Prettier + TS strict. TypeScript fijado en ~6.0 porque typescript-eslint 8 no soporta TS 7. `npm audit`: 7 moderadas solo en dev (minimatch vía typescript-eslint), aceptadas · `chore: lint y formato`
- 2026-11-16 · Etapa 1 · Vitest 5 + Testing Library; entorno `node` por defecto, UI con `// @vitest-environment jsdom`; 2 tests de humo · `test: configura vitest`
- 2026-11-16 · Etapa 1 · Capas `src/{engine,ai,persistence,store,ui}` + `theme.css` con la paleta; reglas de capas verificadas con imports prohibidos de prueba (9/9 detectados) · `chore: estructura de capas`
- 2026-11-16 · Etapa 1 · `README.md` con comandos, capas y guía de continuación; cierre de etapa con tag `etapa-1` · `docs: readme`
- 2026-11-16 · Etapa 2 · Tipos `Suit`/`Card`, mazo de 40 cartas, RNG Mulberry32 con semilla, `shuffleDeck` y `dealHands` con tests · `feat(engine): mazo y reparto`
- 2026-11-16 · Etapa 2 · Jerarquía de Truco (`getTrucoRank` 1..14) y `compareCards` (-1/0/1) con tests · `feat(engine): jerarquia de cartas`
- 2026-11-16 · Etapa 2 · `getCardEnvidoValue`, `calculateEnvido`, `compareEnvido` y `hasEnvidoPair` en `src/engine/envido.ts` · `feat(engine): calculo de envido`
- 2026-11-16 · Etapa 2 · Tests exhaustivos: 1600 comparaciones de jerarquía (40×40) y las 9880 manos posibles C(40,3) de envido; cobertura 100 % en `cards.ts`, `envido.ts` y `rng.ts`; cierre con tag `etapa-2` · `test(engine): tests exhaustivos de cartas y envido`
- 2026-11-16 · Etapa 3 · Tipos `GameState`/`HandState`/`TrickState`/`TrucoState`, `createGame`, `startNextHand` y `getActivePlayer` · `feat(engine): estado de mano`
- 2026-11-16 · Etapa 3 · `resolveTrickWinner`, `nextTrickLeadPlayer` y `resolveHandWinnerFromTricks` (las 6 reglas de parda) con tests · `feat(engine): bazas y pardas`
- 2026-11-16 · Etapa 3 · Máquina de estados de Truco (`canPlayerCallTruco`, `applyTrucoCall`, `applyTrucoQuiero`, tablas de puntos) con tests · `feat(engine): cantos de truco`
- 2026-11-16 · Etapa 3 · `canPlayerStillCallEnvido` y `calculateMazoPoints` (incluye +1 por envido no cantado en 1ª baza) con tests · `feat(engine): irse al mazo`
- 2026-11-16 · Etapa 3 · `getLegalActions`, `isActionLegal` y `applyAction` puros e inmutables en `src/engine/game.ts` · `feat(engine): acciones legales`
- 2026-11-16 · Etapa 3 · Tests integrales de flujo de mano, pardas, escalera de truco/retruco/valeCuatro y mazo; cierre con tag `etapa-3` · `test(engine): escenarios de parda, truco y mazo`
- 2026-11-16 · Etapa 4 · Tipos `EnvidoCall`/`EnvidoState`, `getAllowedNextEnvidoCalls`, `canPlayerCallEnvidoInHand` (incluye "el envido está primero") y `applyEnvidoCall` · `feat(engine): cantos de envido`
- 2026-11-16 · Etapa 4 · `getEnvidoAcceptedBasePoints` y `getEnvidoDeclinedPoints` con test de las 11 filas oficiales · `feat(engine): puntos de envido`
- 2026-11-16 · Etapa 4 · `calculateFaltaEnvidoPoints` (malas/buenas a 30 y partida a 15) y `getEnvidoAcceptedPoints` con tests · `feat(engine): falta envido`
- 2026-11-16 · Etapa 4 · Integración de `callEnvido`/`respondEnvido` en `game.ts`, "el envido está primero" y fin de partida inmediato al alcanzar `targetScore` · `feat(engine): puntuacion y fin de partida`
- 2026-11-16 · Etapa 4 · Simulación masiva de 10 000 manos aleatorias (a 15 y a 30 puntos) sin errores ni puntajes inválidos; cierre con tag `etapa-4` · `test(engine): simulacion masiva`
- 2026-11-16 · Etapa 5 · Interfaz `Bot`, `PlayerView` sin información oculta, `handStrength`, `OpponentProfile` y personajes con frases criollas · `feat(ai): interfaz de bot`
- 2026-11-16 · Etapa 5 · Bot Fácil ("El Pibe") en `src/ai/bot-facil.ts` con tests · `feat(ai): bot facil`
- 2026-11-16 · Etapa 5 · Bot Medio ("Don Ramón") con heurísticas clásicas de carta, envido en malas/buenas y ~10 % de mentira · `feat(ai): bot medio`
- 2026-11-16 · Etapa 5 · Bot Difícil ("El Viejo Vizcacha") con muestreo Monte Carlo condicionado, EV, mentiras y modelo del rival · `feat(ai): bot dificil`
- 2026-11-16 · Etapa 5 · Torneo automático de 3000 partidas (1000 por cruce: Medio > Fácil > 60 %, Difícil > Medio > 60 %, Difícil > Fácil > 75 %); cierre con tag `etapa-5` · `test(ai): torneo entre bots`
- 2026-11-16 · Etapa 6 · `StorageAdapter`, `saveCurrentGame`, `loadCurrentGame` y `clearCurrentGame` en `src/persistence` · `feat(persistence): partida en curso`
- 2026-11-16 · Etapa 6 · Historial de partidas (`loadHistory`, `appendGameRecord`, `createGameRecordFromSavedGame`, tope 500) · `feat(persistence): historial`
- 2026-11-16 · Etapa 6 · Estadísticas (`Stats`, `accumulateHandCounters`, `finishAndPersistGame`) y configuración (`Settings`) · `feat(persistence): estadisticas y config`
- 2026-11-16 · Etapa 6 · Versionado (`CURRENT_SCHEMA_VERSION`), `migrateSavedGamePayload`, `migrateHistoryRecordPayload` y tests de datos corruptos/migraciones; cierre con tag `etapa-6` · `feat(persistence): versionado`
- 2026-11-16 · Etapa 7 · Store Zustand (`createTrucoStore`, `useGameStore`, `hasResumableGame`) conectando engine + ai + persistence · `feat(store): store de partida`
- 2026-11-16 · Etapa 7 · Pantalla de inicio (`HomeScreen.tsx`) con Continuar partida, Nueva partida, Historial, Estadísticas, Reglas y controles de audio · `feat(ui): pantalla inicio`
- 2026-11-16 · Etapa 7 · Pantalla de configuración de nueva partida (`NewGameScreen.tsx`) con selector de personaje/dificultad y 15/30 puntos · `feat(ui): configuracion de partida`
- 2026-11-16 · Etapa 7 · Mesa jugable (`TableScreen.tsx` y `ActionBar.tsx`) con cartas del jugador, cantos según `getLegalActions` y turnos automáticos del bot · `feat(ui): mesa jugable`
- 2026-11-16 · Etapa 7 · Tablero de 3 bazas siempre visibles (`TrickBoard.tsx`) con cartas jugadas por baza y estado · `feat(ui): bazas visibles`
- 2026-11-16 · Etapa 7 · Modal/resumen de fin de mano y fin de partida (`HandSummaryModal.tsx`) con tantos de envido y desglose de puntos · `feat(ui): resumen de mano`
- 2026-11-16 · Etapa 7 · Pantallas de Historial (`HistoryScreen.tsx`), Estadísticas (`StatsScreen.tsx`) y Reglas (`RulesScreen.tsx`) + tests de integración de UI; cierre con tag `etapa-7` · `feat(ui): historial y estadisticas`
- 2026-11-16 · Etapa 8 · Tema campero (`theme.css`) con texturas de mesa de madera, horizonte pampeano y tipografías criollas · `style(ui): tema campero`
- 2026-11-16 · Etapa 8 · Componente `<SpanishCard />` con las 40 cartas españolas en SVG, pintas reglamentarias (0/1/2/3), figuras 10/11/12 y dorso con guarda pampa · `feat(ui): cartas svg`
- 2026-11-16 · Etapa 8 · Retratos SVG de los 3 personajes (`GauchoAvatar.tsx`: El Pibe, Don Ramón y El Viejo Vizcacha) en mesa y selector · `feat(ui): personajes`
- 2026-11-16 · Etapa 8 · Anotador de palitos/fósforos en SVG (`MatchstickScoreboard.tsx`) con grupos de 5 y separación malas/buenas · `feat(ui): anotador de palitos`
- 2026-11-16 · Etapa 8 · Ajustes responsive móvil vertical primero (360×640) y tests de componentes visuales; cierre con tag `etapa-8` · `style(ui): responsive`
