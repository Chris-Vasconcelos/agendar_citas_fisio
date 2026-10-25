# Estándares de Desarrollo Web, Diseño HTML/CSS y Conformidad WCAG 2.2 AA

Este documento registra las reglas técnicas obligatorias adoptadas en el proyecto **FisioCitas** a partir del *Reporte Técnico: Estándares Universales de Desarrollo Web, Diseño HTML/CSS y Plan de Arquitectura del Sistema*.

---

## 1. Separación Estricta de Capas (W3C / WCAG 2.2 SC 1.3.1)

1. **Capa Estructural Semántica (HTML5):**
   - Uso estricto de etiquetas semánticas (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<form>`, `<fieldset>`, `<legend>`, `<label>`).
   - **Prohibido usar estilos en línea (`style="..."`)** o manejadores de eventos incrustados como texto en atributos HTML.
2. **Capa de Presentación Visual (CSS):**
   - Basada en **Design Tokens** declarados en `:root` dentro de `src/index.css`.
   - Normalización universal del modelo de caja (`*, ::before, ::after { box-sizing: border-box; }`).
3. **Capa de Comportamiento (JavaScript / React):**
   - Manejo de eventos, sincronización programática de accesibilidad (`aria-invalid`, `aria-live="polite"`), API de Validación de Restricciones (*Constraint Validation API*) y persistencia transaccional.

---

## 2. Conformidad WCAG 2.1 / 2.2 Nivel AA

| Criterio WCAG | Requisito | Implementación en FisioCitas |
|---|---|---|
| **1.4.3 Contraste Mínimo (AA)** | Relación $\ge 4.5:1$ en texto normal y $\ge 3:1$ en texto grande y bordes de controles. | Texto principal `#222222` sobre `#ffffff` / `#f4f6f8` (15.9:1). Bordes de inputs `2px solid #595959` ($> 4.5:1$). Botón primario `#004070` con hover `#002847`. |
| **1.4.1 Uso del Color (A)** | No usar el color como único medio para indicar campos obligatorios o errores. | Campos requeridos acompañados por `<span class="required-asterisk" aria-hidden="true">*</span>` y texto explicativo; errores con icono/texto descriptivo y borde izquierdo de `4px`. |
| **2.4.7 Enfoque Visible (AA)** | Indicador claro al navegar con teclado (`Tab`, `Shift+Tab`, `Enter`, `Espacio`, flechas). | `outline: 3px solid var(--color-focus-ring)` (`#005a9c`) y `outline-offset: 2px` en `:focus-visible`. |
| **3.3.1 Identificación de Errores (A)** | Notificar errores dinámicos a lectores de pantalla sin interrumpir el foco. | Regiones dinámicas con `aria-live="polite"` y atributo `aria-invalid="true"` sincronizado en cada control inválido. |
| **2.3.3 Animación desde Interacciones** | Respetar la configuración del sistema operativo para reducir movimiento. | Transiciones rápidas de `0.2s ease` (100ms–300ms) y regla `@media (prefers-reduced-motion: reduce)` que desactiva animaciones. |

---

## 3. Reglas de Usabilidad y Formularios (Nielsen Norman Group & MDN)

1. **Layout de Columna Única Vertical:**
   - Todos los formularios se maquetan en **una sola columna vertical** dentro de `.form-container` (`max-width: 520px`), evitando múltiples columnas horizontales que fuerzan recorridos oculares en "Z".
2. **Ley de Proximidad de la Gestalt:**
   - `.form-label` tiene margen inferior mínimo (`--spacing-xs: 0.25rem`) pegado a su campo de entrada.
   - `.form-group` tiene margen inferior amplio (`--spacing-lg: 1.5rem`) para separar claramente cada pregunta.
3. **Semántica Estricta en Controles:**
   - Vinculación explícita `<label htmlFor="id">` con `<input id="id">` en el 100% de los campos.
   - Controles de opción múltiple (radios/checkboxes relacionados) agrupados dentro de `<fieldset>` con su respectivo `<legend>`.
   - **Prohibición absoluta de botones `reset`** para impedir el borrado accidental de datos clínicos o de agenda.
4. **Validación con `novalidate`, `:user-invalid` y Constraint Validation API:**
   - Se utiliza `:user-invalid` y `:user-valid` en lugar de `:invalid` para no mostrar errores agresivos antes de que el usuario interactúe con el campo.
   - Se valida en cliente para UX inmediata y se re-valida en base de datos/servidor (constraints `CHECK`, `EXCLUDE USING gist` y RLS en PostgreSQL) como barrera de seguridad.

---

## 4. Exportación Segura a CSV (UTF-8 con BOM)

- Al exportar el padrón de pacientes o el historial de sesiones a CSV, se antepone el indicador de orden de bytes **UTF-8 BOM (`\uFEFF`)** para garantizar que los acentos (`á, é, í, ó, ú`) y la letra `ñ` se abran correctamente en Microsoft Excel.
