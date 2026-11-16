---
name: truco-reglas
description: Reglas exactas del Truco argentino 1 vs 1 sin Flor tal como las implementa este proyecto (jerarquía de cartas, cálculo de envido, cantos, pardas, irse al mazo, tabla de puntos, falta envido, fin de partida). Usar siempre que se toque src/engine o se escriban tests de puntuación.
---

# Reglas del Truco (implementación del proyecto)

## Mazo

Baraja española de 40 cartas: palos `espada`, `basto`, `oro`, `copa`; números 1-7, 10, 11, 12.

## Jerarquía para el truco (rank: mayor gana; iguales = parda)

| Rank | Cartas                |
| ---- | --------------------- |
| 14   | 1 de espada           |
| 13   | 1 de basto            |
| 12   | 7 de espada           |
| 11   | 7 de oro              |
| 10   | todos los 3           |
| 9    | todos los 2           |
| 8    | 1 de oro, 1 de copa   |
| 7    | todos los 12          |
| 6    | todos los 11          |
| 5    | todos los 10          |
| 4    | 7 de basto, 7 de copa |
| 3    | todos los 6           |
| 2    | todos los 5           |
| 1    | todos los 4           |

## Cálculo de envido de una mano (3 cartas)

- Valor de envido de una carta: 1-7 su número; 10, 11, 12 valen **0**.
- Si hay ≥ 2 cartas del mismo palo: `20 + suma de las dos de mayor valor de ese palo`.
  (Con 3 del mismo palo se toman las dos más altas; no hay flor.)
- Si no: el mayor valor individual. Rango posible: 0..33.
- Ejemplos: 7♠ 6♠ 1♣ → 33 · 12♠ 11♠ 4♣ → 20 · 7♠ 12♠ → 27 · 5♣ 3♠ 12♦ → 5 · 10♣ 11♠ 12♦ → 0.
- Empate de envido: gana el **mano**.

## Estructura de una ronda de reparto ("mano")

- Se reparten 3 cartas a cada uno. El **mano** (el que es "mano") juega primero la 1ª baza; el mano alterna en cada reparto.
- 3 bazas; en cada baza juega primero quien ganó la baza anterior (si fue parda, el mano).
- Se gana la mano al ganar 2 bazas, con estas reglas de parda:
  - 1ª parda → define la 2ª; si la 2ª también es parda → define la 3ª; si las tres son parda → gana el mano.
  - 1ª ganada por X y 2ª parda → gana X (no se juega la 3ª).
  - 1ª ganada por X, 2ª por Y, 3ª parda → gana X (quien ganó la 1ª).
- La mano termina apenas está decidida (no se juegan bazas innecesarias).

## Truco

| Estado      | Querido                   | No querido (puntos para quien cantó) |
| ----------- | ------------------------- | ------------------------------------ |
| Sin cantar  | ganador de la mano suma 1 | —                                    |
| Truco       | 2                         | 1                                    |
| Retruco     | 3                         | 2                                    |
| Vale Cuatro | 4                         | 3                                    |

- Respuestas válidas a un canto: `quiero`, `noQuiero`, o subir (`retruco`/`valeCuatro`), que implica querer el anterior.
- Solo puede subir quien **tiene el quiero** (el que aceptó el último canto). Nadie sube su propio canto.
- Se puede cantar en cualquier momento del propio turno, antes de jugar la carta.
- No querer → la mano termina y el que cantó suma los puntos de "no querido".

## Envido

- Solo durante la 1ª baza: cada jugador puede cantarlo antes de jugar su primera carta. Una vez que ambos jugaron su carta de la 1ª baza, ya no hay envido.
- Solo se puede cantar envido una vez por mano (una secuencia).
- **"El envido está primero"**: si en 1ª baza cantan Truco y el que responde todavía puede cantar envido, puede responder con un canto de envido; se resuelve el envido completo y luego se vuelve a responder el Truco pendiente.
- Secuencias permitidas (orden creciente): `envido` (máx. 2 veces), luego `realEnvido` (1 vez), luego `faltaEnvido`. No se puede bajar.

### Tabla de puntos de envido

| Secuencia cantada                                                                                                    | Querido | No querido |
| -------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| Envido                                                                                                               | 2       | 1          |
| Envido, Envido                                                                                                       | 4       | 2          |
| Real Envido                                                                                                          | 3       | 1          |
| Envido, Real Envido                                                                                                  | 5       | 2          |
| Envido, Envido, Real Envido                                                                                          | 7       | 4          |
| Falta Envido                                                                                                         | Falta   | 1          |
| Envido, Falta Envido                                                                                                 | Falta   | 2          |
| Envido, Envido, Falta Envido                                                                                         | Falta   | 4          |
| Real Envido, Falta Envido                                                                                            | Falta   | 3          |
| Envido, Real Envido, Falta Envido                                                                                    | Falta   | 5          |
| Envido, Envido, Real Envido, Falta Envido                                                                            | Falta   | 7          |
| Regla general de "no querido": suma lo **querido** de la secuencia sin el último canto (o 1 si era el primer canto). |

### Falta Envido

- Partida a 30: si el que va **ganando** (puntaje mayor; con empate, cualquiera) está en **malas** (< 15) → quien gane el envido **gana el partido**.
  Si está en **buenas** (≥ 15) → vale `30 − puntaje del que va ganando`.
- Partida a 15: vale `15 − puntaje del que va ganando`.

## Irse al mazo

- Se puede en el propio turno o en vez de responder un canto.
- Si es en la 1ª baza, sin envido cantado y el que se va todavía podía cantar envido: el rival suma **2** (1 de truco no cantado + 1 de envido).
  Si había truco querido, suma el valor del truco querido + 1 del envido.
- En cualquier otro caso: el rival suma el valor del truco vigente (1 si no se cantó; 2/3/4 si fue querido; si había un canto pendiente sin responder, se trata como "no querido").

## Suma de puntos y fin de partida

- Orden de conteo al terminar la mano: primero envido, después truco.
- El partido termina **en el instante** en que un jugador alcanza el objetivo (15 o 30), incluso a mitad de mano por un envido.
- Los puntos nunca superan el objetivo al mostrarse (el marcador se topa en el objetivo, pero el historial guarda el resultado).
- 30 puntos: 0-15 "malas", 15-30 "buenas" (el punto 16 es la "primera buena").

## Checklist para tests

Pardas (las 6 combinaciones), cada fila de las tablas de truco y envido, falta envido en malas/buenas/a 15, mazo en 1ª baza con y sin envido, empate de envido (gana el mano), fin de partida por envido a mitad de mano.
