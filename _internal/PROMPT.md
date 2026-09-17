# PROMPT para futuro LLM / programador

Estás manteniendo `sitio-quiz/`, sitio 100% estático (HTML+CSS+JS vanilla) que se abre con doble-click (`file://`, offline, sin servidor).

Reglas duras:
- NO uses `fetch`, `import`, `type="module"` ni CDN. Todo por `<script src>` clásico y rutas relativas.
- NO agregues dependencias ni build. Solo edita `index.html`, `css/styles.css`, `js/app.js`, `js/questions-data.js`.
- El banco es `var QUESTION_BANK` en `js/questions-data.js`: edítalo como JSON, no cambies el `var`. IDs únicos `DOC-###`, `respuesta` es índice 0-based DESPUÉS de las opciones en su orden original (app.js re-mezcla solo). No renombres IDs existentes (rompe stats guardados).
- Al crear preguntas respeta los 9 criterios de redacción de `_internal/DOCS.md` (enunciado autocontenido, sin trivia del documento, sin negativos, distractores plausibles, mezcla Bloom, ortografía completa).
- Claves localStorage versionadas: `eq_stats_v1`, `eq_history_v1`, `eq_prefs_v1`. Si cambias el esquema, sube versión.
- Chart.js está vendorizado en `js/vendor/chart.umd.min.js` (v4.4.1). Mantén fallback CSS si falta.
- Documentación privada en `_internal/` (fuera del deploy). No enlaces docs desde la UI pública.
- Estética: minimalista, system-ui, sin frameworks.

Tareas típicas:
- Agregar preguntas: añade objetos al banco con explicacion + fuente exacta del PDF.
- Agregar PDF: copia a `sitio-quiz/pdfs/`, registra en `var DOCS`, agrega preguntas con ese `doc`.
- Cambiar pesos de refuerzo: edita `weight()` en `js/app.js`.
