# Quiz Emprendedurismo — Documentación interna (privada, no desplegar)

> Esta carpeta `_internal/` vive FUERA de `sitio-quiz/`. Solo se sube/despliega `sitio-quiz/`. Nada en `index.html` enlaza aquí.

## 1. Cómo abrir el sitio
- Doble-click en `sitio-quiz/index.html`. Sin servidor, sin build, sin `python`.
- Funciona `file://` y offline porque todo es local: CSS, JS, `js/vendor/chart.umd.min.js`, `pdfs/*.pdf`.
- Restricciones `file://` respetadas: sin `fetch`, sin `type="module"`, sin CDN. Solo `<script>` clásico.

## 2. Estructura pública (`sitio-quiz/`)
```
sitio-quiz/
├── index.html                  # 3 vistas por hash: #/inicio #/quiz #/biblioteca
├── css/styles.css              # Minimalista, variables CSS, responsive
├── js/questions-data.js        # var DOCS + var QUESTION_BANK (editar como JSON)
├── js/app.js                   # Router, quiz, localStorage, stats, charts, biblioteca
├── js/vendor/chart.umd.min.js  # Chart.js 4.4.1 vendorizado (jsdelivr)
└── pdfs/*.pdf                  # Copias con nombres slug (01-... a 07-...)
```

## 3. Cómo agregar preguntas
1. Abre `js/questions-data.js`.
2. No cambies `var QUESTION_BANK =` ni `var DOCS =`. Solo agrega objetos.
3. Campos obligatorios: `id` (DOC-### único), `doc` (PV1|PV2|MKT8|COST|EJPV|SEG1|SEG2), `tema`, `tipo` (multiple|vf), `pregunta`, `opciones` (4 para multiple, ["Verdadero","Falso"] para vf), `respuesta` (índice 0-based), `explicacion`, `fuente`, `dificultad` (base|detalle|trampa).
4. Para nuevo PDF: agrega entrada en `DOCS` con `id`, `titulo`, `archivo: "pdfs/xx-nombre.pdf"`, `descripcion`; copia el PDF a `pdfs/`; agrega sus preguntas con ese `doc`.

## 4. Cómo actualizar Chart.js
- Origen: https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
- Descargar y reemplazar `js/vendor/chart.umd.min.js`. Mantener nombre. El sitio tiene fallback a barras CSS si `window.Chart` no existe.

## 5. Despliegue
- Sube SOLO `sitio-quiz/`. GitHub Pages / Netlify Drop funcionan tal cual (rutas relativas).
- No subas `_internal/` ni los PDFs originales de la raíz si no quieres duplicar peso.

## 6. Limpieza / mantenimiento
- Si cambias IDs de preguntas, el `localStorage` viejo (`eq_stats_v1`) conserva claves huérfanas; no rompe nada. Para reset mayor, bump a `eq_stats_v2` en `app.js`.
