# DOCS técnico

## Esquema de datos

### DOC_NAMES
`var DOC_NAMES = { PV1: "1- Propuesta de Valor.pdf", ... }` — mapea abreviatura interna → nombre real del PDF.
La UI nunca muestra la abreviatura: `docFull(id)` la convierte a nombre real (sin `.pdf`); `ALL` → "Todos los documentos".
El `id` (PV1, PV2…) solo se usa interno: claves de `localStorage`, `value` del filtro y campo `doc` de cada pregunta.

### Etiquetas visibles
`tipoLabel`: multiple → "Opción múltiple", vf → "Verdadero/Falso".
`difLabel`: base → "básica", detalle → "detalle", trampa → "preguntas trampa".
La pastilla de cada pregunta muestra `tipo · dificultad` (sin ID). El resultado lista fallos como "Pregunta N (nombre real del documento)".

### QUESTION_BANK[i]
```json
{
  "id": "PV2-014", "doc": "PV2", "tema": "Paso 3",
  "tipo": "multiple",
  "pregunta": "...", "opciones": ["a","b","c","d"], "respuesta": 2,
  "explicacion": "...", "fuente": "PV2 - paso 3", "dificultad": "detalle"
}
```
Conteo actual: PV1 20, PV2 35, MKT8 20, COST 20, EJPV 10, SEG1 12, SEG2 12 = 129.
IDs estables: no renombrar ni reutilizar (rompería `eq_stats_v1` guardado).

### Criterios de redacción de preguntas (obligatorios)
Basados en JHU-CTEI, UT Austin, ACS/NBME, Haladyna et al. 2002 y guía UNED:
1. Enunciado autocontenido: se responde sin ver opciones y sin el PDF a la mano (test "tapar opciones").
2. Prohibido "según el documento X / la portada dice / en el ejemplo Y": los datos van DENTRO del enunciado (mini-caso) o se evalúa el concepto.
3. Los ejemplos del material se usan como casos con datos incluidos para CLASIFICAR/DECIDIR, nunca como datos a recordar (nombres, cifras, frases literales).
4. Sin trivia meta: autores de fichas, páginas, frases literales, cifras exactas de ejemplos.
5. Sin enunciados negativos ni "todas/ninguna de las anteriores".
6. Distractores plausibles y homogéneos (confusiones reales entre conceptos vecinos: aliviador vs creador, fijo vs variable, perfil vs mapa, markup vs margen). Sin bromas ni menciones al docente.
7. Las V/F discriminan conceptos confundibles, no repiten definiciones copiadas.
8. Mezcla Bloom: recuerdo de marcos (4P, 8 pasos, fórmulas, 6 cuadrantes, reglas 1%-10%, 6 meses, 5 segundos, 3-8 personas), comprensión (clasificar con casos NUEVOS, no los del PDF) y aplicación (mini-caso, cálculo con datos dados).
9. Ortografía completa (tildes y ñ) en preguntas, opciones y explicaciones.

## localStorage
- `eq_stats_v1`: `{ [qid]: { fails, hits, streak } }` — `streak` = aciertos consecutivos (amortigua peso).
- `eq_history_v1`: `[{ fecha ISO, total, aciertos, pct, porDoc: {DOC:{ok,tot}}, docs, seg }]`
- `eq_prefs_v1`: `{ doc, num, fails }`
- Botón Limpiar: `removeItem` de stats + history (prefs se conservan). Doble `confirm()`.

## Algoritmo de refuerzo
```
w(q) = 1 + fails*2.5 - min(streak,3)*0.8 + (dificultad==trampa ? 0.5 : 0), min 0.2
```
`pickQuestions(doc, num, onlyFails)`: filtra por doc/fallos → ordena desc por `w` → toma top-N → `shuffle` final. Además cada intento re-mezcla opciones con Fisher-Yates y recalcula índice correcto. Efecto: falladas suben, rachas buenas bajan, 20% de variedad por el corte top-N + shuffle.

## Router y vistas
- Hash router: `#/inicio`, `#/quiz`, `#/biblioteca`. `router()` oculta/muestra `<section>` y llama `renderHome()` / `renderDocs()`.
- Sesión quiz: `{ items: [{q, order, answer}], idx, ok, answers, t0, docs }`. `answer(pos)` bloquea botones, marca correct/wrong, actualiza stats, muestra `explicacion + fuente`, habilita Siguiente. `finishQuiz()` guarda historial, muestra resultado, ofrece "Repetir falladas de este intento".

## Charts
- Si `window.Chart` existe: barra últimos 10 intentos + barra por doc (agregado de `porDoc`).
- Si no: fallback `div.bars` con barras CSS. Instancias destruidas en cada render (`destroyChart`).

## Biblioteca
- Render desde `DOCS` + conteo de preguntas. Botones: `Abrir` (`target=_blank`) y `Descargar` (`download`). Rutas `pdfs/*.pdf` relativas → OK en `file://`.

## Edge cases
- `localStorage` en `file://` es por archivo/ruta: mover la carpeta resetea progreso (documentar al usuario si se queja).
- `num=all` con filtro pequeño: `n = pool.length`, sin error.
- `soloFalladas` sin fallos: alerta y no inicia sesión vacía.
