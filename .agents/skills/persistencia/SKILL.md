---
name: persistencia
description: Esquema de guardado local (localStorage) de la partida en curso, historial, estadísticas y configuración, con versionado y migraciones. Usar al trabajar en src/persistence o al cambiar la forma del estado del engine.
---

# Persistencia local

## Claves de `localStorage`
| Clave | Contenido |
|---|---|
| `truco:v1:current` | `SavedGame` de la partida en curso (o ausente) |
| `truco:v1:history` | `GameRecord[]` (más reciente primero, máximo 500) |
| `truco:v1:stats` | `Stats` acumuladas |
| `truco:v1:settings` | `Settings` (sonido, voz, última dificultad, último objetivo) |

## Tipos
```ts
interface SavedGame { schemaVersion: number; savedAt: string; seed: number; state: GameState; }
interface GameRecord {
  id: string; startedAt: string; endedAt: string; durationSec: number;
  difficulty: 'facil' | 'medio' | 'dificil'; target: 15 | 30;
  finalScore: { human: number; bot: number }; winner: 'human' | 'bot';
  handsPlayed: number; abandoned: boolean;
}
interface Stats {
  gamesPlayed: number; gamesWon: number; currentStreak: number; bestStreak: number;
  byDifficulty: Record<'facil' | 'medio' | 'dificil', { played: number; won: number }>;
  envidosWon: number; envidosPlayed: number; trucosWon: number; trucosPlayed: number;
}
```

## Reglas
- Guardar `current` después de **cada** `applyAction` (vía suscripción del store, no desde la UI).
- Al terminar la partida: agregar `GameRecord`, actualizar `Stats`, borrar `current`.
- Abandonar (nueva partida con una en curso): confirmar al usuario y registrar con `abandoned: true` como derrota.
- Lectura siempre con `try/catch` + validación de forma; si está corrupto → descartar y loguear (`console.warn`), nunca romper la app.
- Si cambia la forma de `GameState`, subir `schemaVersion` y agregar una migración en `src/persistence/migrations.ts`. Si no es migrable, descartar la partida en curso (el historial siempre se migra).
- Encapsular el acceso en un `StorageAdapter` para poder usar uno en memoria en tests.

## Tests
Ida y vuelta (guardar/cargar) idéntica, datos corruptos, migración v1→v2 de ejemplo, actualización de stats y rachas.
