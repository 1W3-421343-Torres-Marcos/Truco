---
name: truco-ia
description: Diseño de los bots de la máquina por dificultad (Fácil "El Pibe", Medio "Don Ramón", Difícil "El Viejo Vizcacha"): interfaz, información oculta, heurísticas, Monte Carlo, mentiras y tests de torneo. Usar al trabajar en src/ai.
---

# IA de la máquina

## Interfaz

```ts
interface Bot {
  id: 'facil' | 'medio' | 'dificil';
  decide(view: PlayerView, rng: Rng): Action; // debe devolver SIEMPRE una acción de getLegalActions
}
```

- `PlayerView` = estado visto por el bot: sus cartas, cartas jugadas en la mesa, cantos, puntajes, envido que el rival ya mostró. **Nunca** las cartas ocultas del humano (no hacer trampa).
- RNG inyectado para tests reproducibles. Agregar una pequeña demora en la UI (600-1200 ms), no en el bot.

## Fuerza de mano (helper compartido)

`handStrength(cards)` = promedio ponderado de los ranks (ver skill `truco-reglas`) normalizado a 0..1. Útil para todos los niveles.

## Fácil — "El Pibe"

- Juega una carta legal al azar (con leve preferencia por la más alta si ya perdió una baza).
- Canta envido solo con ≥ 28; truco solo con 1♠/1♣ en mano. Acepta cantos ~50 % al azar. Nunca miente.

## Medio — "Don Ramón"

- Heurísticas clásicas: en 1ª baza juega carta media; si es pie, mata con la menor que gana o tira la más baja.
- Envido: canta con ≥ 27, quiere con ≥ 25 (ajustar por puntaje: más conservador en buenas).
- Truco: canta/acepta según `handStrength` y bazas ganadas. Miente ~10 % de las veces.
- Falta envido solo si va perdiendo por mucho o tiene ≥ 31.

## Difícil — "El Viejo Vizcacha"

- **Monte Carlo**: muestrea N (≈ 200-500) manos posibles del rival entre las cartas no vistas, condicionadas a lo observado (envido mostrado, cartas jugadas, cantos hechos) y simula el resto con política Medio para estimar la probabilidad de ganar cada acción.
- **Inferencia por cantos**: si el rival cantó/quiso envido, sesgar el muestreo hacia manos con envido alto.
- **Mentiras**: farolea ~20-25 % cuando la situación lo permite (ej. canta truco con mano floja si ganó la 1ª baza).
- **Modelo del rival**: guarda frecuencias del humano en la partida (cuánto miente, umbral al querer) y las usa para ajustar umbrales.
- **Contexto de puntaje**: arriesga más cuando va perdiendo; cuida puntos cuando está cerca de ganar.
- Debe decidir en < 150 ms en un celular medio (limitar N si hace falta).

## Frases

Cada bot expone el personaje (`name`, `avatar`, `phrases`) usado por la UI para los globos de diálogo (skill `ui-estetica`).

## Tests obligatorios

- Fuzz: 1000 partidas bot vs bot por nivel sin acciones ilegales ni excepciones.
- Torneo: Difícil gana > 60 % a Medio y Medio > 60 % a Fácil en ≥ 1000 partidas (semilla fija).
- El bot nunca accede a cartas ocultas (test sobre `PlayerView`).
