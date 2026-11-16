# Truco Argentino — Reglas del proyecto (always-on)

App web/móvil (PWA) de Truco argentino 1 vs 1 contra la máquina. Estética de campo argentino.
**Antes de trabajar, leé `docs/PLAN.md`** (decisiones, etapas y progreso). Es la fuente de verdad.

## Stack (no cambiar sin aprobación del usuario)

- React 18 + Vite + TypeScript (`strict: true`). PWA con `vite-plugin-pwa`.
- Estado: Zustand. Estilos: CSS Modules + variables CSS (sin Tailwind). Animaciones: `motion` (Framer Motion).
- Tests: Vitest (+ Testing Library para UI). Lint: ESLint + Prettier.
- Persistencia: solo local (`localStorage`), sin backend, sin login, 100% offline.

## Arquitectura (capas, dependencias solo hacia abajo)

```
src/ui/          componentes React, pantallas, estilos      → usa store
src/store/       Zustand, conecta UI ↔ engine ↔ ai ↔ persistence
src/ai/          bots por dificultad                         → usa engine
src/persistence/ guardado/carga versionado                   → usa engine (tipos)
src/engine/      reglas puras del Truco (sin React, sin DOM, sin Math.random directo)
```

- `engine` es **puro y determinista**: funciones `(state, action) => newState`, estado serializable a JSON, RNG inyectable con semilla.
- La UI nunca calcula puntos ni valida jugadas: siempre le pregunta al engine (`getLegalActions`, `applyAction`).

## Reglas de juego decididas (resumen; detalle en skill `truco-reglas`)

- Sin Flor. Partida a 15 o 30 (30 = malas/buenas). Mano alterna cada ronda de reparto.
- Falta Envido: en malas gana el partido; en buenas (o a 15) vale lo que le falta al que va ganando.
- Irse al mazo en 1ª baza sin envido cantado: el rival suma 2. "El envido está primero": permitido.

## Convenciones

- Identificadores en inglés; términos del truco en español sin tildes (`envido`, `truco`, `retruco`, `valeCuatro`, `faltaEnvido`, `parda`, `mazo`, `mano`).
- Textos de UI en español rioplatense (voseo): "¡Quiero!", "No quiero", "Son buenas".
- Funciones chicas, sin `any`, sin `// @ts-ignore`. Un componente por archivo.

## Flujo de trabajo obligatorio

1. Trabajar solo en la etapa/tarea activa de `docs/PLAN.md`. No adelantar etapas.
2. Toda lógica de engine/ai/persistence se entrega **con tests** que pasan (`npm test`).
3. Antes de commitear: `npm run lint && npm test && npm run build` sin errores.
4. Commits con Conventional Commits en español: `feat(engine): calcula puntos de envido`.
   Al menos un commit por tarea; al cerrar una etapa, tag `etapa-N`.
5. Al terminar cada tarea: marcarla `[x]` en `docs/PLAN.md` y agregar una línea al "Registro de progreso".
6. Usar la skill `etapas-y-commits` para cerrar tareas/etapas.

## Nunca

- Nunca agregar backend, login, analytics ni dependencias pesadas sin aprobación.
- Nunca usar imágenes con copyright: cartas y arte son SVG propios o generados.
- Nunca modificar tests para que "pasen" ocultando un bug de puntuación.
- Nunca hacer `git push` ni reescribir historia (`rebase -i`, `reset --hard`) sin pedido explícito.
