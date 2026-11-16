# Truco Argentino 🧉

App web/móvil (PWA) para jugar al **Truco argentino 1 vs 1 contra la máquina**, con estética de campo,
tres niveles de dificultad, partida guardada, historial y estadísticas. 100 % offline, sin backend.

> Estado: **v1.0.0 completada** (Etapas 0 a 10 finalizadas). El detalle de todas las decisiones, etapas y commits está en [`docs/PLAN.md`](docs/PLAN.md).

## Requisitos

- Node.js ≥ 20 (se usa la LTS 26, ver `.nvmrc`)
- npm (viene con Node)

## Comandos

| Comando              | Qué hace                                        |
| -------------------- | ----------------------------------------------- |
| `npm install`        | Instala dependencias                            |
| `npm run dev`        | Servidor de desarrollo en http://localhost:5173 |
| `npm test`           | Tests (Vitest)                                  |
| `npm run test:watch` | Tests en modo watch                             |
| `npm run coverage`   | Tests con cobertura                             |
| `npm run lint`       | ESLint (incluye reglas de capas)                |
| `npm run format`     | Formatea con Prettier                           |
| `npm run build`      | Chequeo de tipos + build de producción          |

Antes de cada commit: `npm run lint && npm test && npm run build`.

## Arquitectura

```
src/ui/          componentes React, pantallas, estilos      → usa store
src/store/       Zustand, conecta UI ↔ engine ↔ ai ↔ persistence
src/ai/          bots por dificultad                         → usa engine
src/persistence/ guardado/carga versionado (localStorage)    → usa engine (tipos)
src/engine/      reglas puras del Truco (deterministas)
```

Las dependencias van **solo hacia abajo** y ESLint lo hace cumplir. El engine no puede usar React, el DOM,
`Math.random` ni `Date.now`.

## Documentación para quien continúe (personas o agentes)

- [`AGENTS.md`](AGENTS.md): reglas siempre activas (stack, convenciones, prohibiciones).
- [`docs/PLAN.md`](docs/PLAN.md): decisiones, etapas con tareas `[ ]`/`[x]` y registro de progreso.
- `.agents/skills/`: documentación técnica por módulo (reglas del truco, IA, persistencia, UI, flujo de commits).

Para retomar con Antigravity: `/plan Etapa N de docs/PLAN.md`, donde N es la primera etapa sin ✅.
