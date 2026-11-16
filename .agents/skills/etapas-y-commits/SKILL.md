---
name: etapas-y-commits
description: Procedimiento para empezar, cerrar y commitear tareas y etapas del plan (docs/PLAN.md), con Conventional Commits y tags. Usar al iniciar o terminar cualquier tarea del proyecto.
---

# Trabajo por etapas y commits

## Al empezar
1. Leer `docs/PLAN.md` y tomar la **primera** tarea `[ ]` de la etapa activa. Marcarla `[~]`.
2. Cargar la skill del módulo correspondiente (`truco-reglas`, `truco-ia`, `persistencia`, `ui-estetica`).
3. Para una etapa entera, generar el Implementation Plan nativo con `/plan` y esperar aprobación del usuario.

## Al terminar una tarea
1. Verificar: `npm run lint && npm test && npm run build` (desde la Etapa 1 en adelante).
2. Marcar la tarea `[x]` en `docs/PLAN.md` y agregar al "Registro de progreso":
   `- AAAA-MM-DD · Etapa N · <tarea> · \`<mensaje de commit>\``
3. Commit (incluye el cambio de `PLAN.md`):
   ```
   git add -A
   git commit -m "<tipo>(<ámbito>): <descripción en español, minúsculas, imperativo/presente>"
   ```
   Tipos: `feat`, `fix`, `test`, `refactor`, `style`, `docs`, `chore`. Ámbitos: `engine`, `ai`, `persistence`, `store`, `ui`.

## Al cerrar una etapa
1. Todas sus tareas en `[x]` y el criterio "Hecho cuando" cumplido.
2. Marcar el título de la etapa con ✅.
3. `git tag etapa-N` (tag liviano, sin push).
4. Si la etapa tiene **punto de control con el usuario**, detenerse y pedir revisión antes de seguir.

## Si algo cambia
- Una decisión nueva o modificada se registra en la tabla "Decisiones" de `docs/PLAN.md` con la fecha.
- Si una tarea resulta demasiado grande, dividirla en sub-tareas `[ ]` dentro del plan en lugar de dejarla a medias sin registro.
- Nunca `git push`, `rebase -i` ni `reset --hard` sin pedido explícito del usuario.
