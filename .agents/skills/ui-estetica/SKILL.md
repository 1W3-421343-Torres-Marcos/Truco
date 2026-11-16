---
name: ui-estetica
description: Guía visual y de interacción con estética de campo argentino (paleta, tipografías, mesa, cartas españolas SVG, bazas visibles, anotador de palitos, personajes, animaciones, sonido y voz). Usar al trabajar en src/ui.
---

# UI y estética de campo

## Paleta (variables CSS en `src/ui/theme.css`)
| Variable | Uso | Valor sugerido |
|---|---|---|
| `--madera-oscura` | marco de mesa | `#5b3a1e` |
| `--madera` | mesa | `#8b5a2b` |
| `--pampa` | fondo/cielo | `#c9b77a` / degradé a `#87a96b` |
| `--cuero` | paneles | `#a0703c` |
| `--crema` | cartas, textos claros | `#f4ead5` |
| `--celeste` | acentos (botones) | `#6cace4` |
| `--rojo-punzo` | alertas, "No quiero" | `#b22222` |
| `--tinta` | texto | `#2b1d0e` |
Tipografías (Google Fonts, empaquetadas localmente para offline): títulos con estilo fileteado/criollo (p. ej. "Rye" o "Sancreek"), texto con "Lora" o similar.

## Pantallas
Inicio (Nueva partida, Continuar si hay guardada, Historial, Estadísticas, Reglas/Tutorial, Ajustes) → Configuración (dificultad con tarjeta del personaje + 15/30) → Mesa → Resumen de partida.

## Mesa (móvil vertical primero, 360×640 mínimo)
```
[avatar bot + globo]          [anotador palitos]
[3 dorsos del bot]
[Baza 1] [Baza 2] [Baza 3]   ← cada baza muestra carta bot arriba, carta humano abajo,
                                quedan visibles toda la mano; marcar ganador/parda
[mis 3 cartas (tap para jugar)]
[Envido▾] [Truco] [Mazo]  + botones de respuesta cuando hay canto pendiente
```
- Botones habilitados según `getLegalActions` del engine. Nada de lógica de reglas en la UI.
- Indicar de quién es el turno y quién es mano.
- Al final de la mano: modal/resumen con envidos mostrados ("Tengo 28" / "Son buenas"), puntos de envido y de truco sumados.

## Cartas SVG
- Componente `<SpanishCard suit number faceDown? />` que genera el SVG por código (no 40 archivos sueltos): borde redondeado crema, marco interrumpido según la convención española (oro: sin cortes · copa: 1 corte · espada: 2 cortes · basto: 3 cortes), número en esquinas, símbolos dibujados en `src/ui/cards/suits/*.tsx`.
- Figuras 10/11/12: ilustración simplificada (sota, caballo, rey) reutilizable con el símbolo del palo.
- Dorso: diseño campero (guarda pampa, color `--madera-oscura`). Aspect ratio ≈ 2:3.

## Anotador de palitos
Cada 5 puntos = cuadrado de 4 fósforos + 1 diagonal. A 30: separar malas y buenas con una línea. Animar el fósforo nuevo.

## Personajes
| Nivel | Nombre | Rasgos para el avatar | Tono de frases |
|---|---|---|---|
| Fácil | El Pibe | joven, gorra, sonrisa | inocente, entusiasta |
| Medio | Don Ramón | gaucho con boina y mate | tranquilo, refranero |
| Difícil | El Viejo Vizcacha | anciano pícaro, sombrero, poncho | socarrón, mentiroso ("¡Quiero vale cuatro, m'hijo!") |
Avatares en SVG/PNG propios o generados (nunca con copyright).

## Animaciones (`motion`)
Reparto (cartas desde el mazo, 80 ms entre cartas), jugar carta (vuela a su baza), voltear cartas del bot al final, palito nuevo. Respetar `prefers-reduced-motion`.

## Sonido y voz
- Efectos cortos (barajar, tirar carta, sorber mate al ganar) en `public/sounds/`, licencia libre (CC0).
- Voz opcional con `speechSynthesis` (voz `es-AR` si existe, si no `es-*`), desactivada por defecto. Botón silencio global persistido en Settings.

## Accesibilidad
Botones ≥ 44 px, contraste AA, `aria-label` en cartas ("3 de espada").
