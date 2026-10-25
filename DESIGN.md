---
name: Clean Clinical + Bento (TypeUI Design System)
colors:
  primary: "#004070"
  primaryHover: "#002847"
  secondary: "#0F766E"
  success: "#137752"
  warning: "#B45309"
  danger: "#B30000"
  surface: "#FFFFFF"
  background: "#F4F6F8"
  text: "#111827"
  textMuted: "#4B5563"
  border: "#595959"
typography:
  h1:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
  h2:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
  body-md:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
  label-caps:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
  sourceScale: "12/14/16/20/24/28"
  weights: "400, 500, 600, 700"
rounded:
  outer: "16px"
  inner: "8px"
  sm: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  sourceScale: "4pt / 8pt baseline grid"
---

<!-- TYPEUI_SH_MANAGED_START -->
# fisio-citas — TypeUI Design System Specification (`clean` + `bento` + `shadcn`)

## Overview
Sistema de diseño clínico para el consultorio de fisioterapia deportiva de Eduardo (`fisio-citas`), basado en las skills de [TypeUI (`typeui.sh/design-skills`)](https://www.typeui.sh/design-skills):
- **`clean`**: Simplicidad, espacio en blanco generoso, tipografía altamente legible y paleta semántica acotada para reducir la carga cognitiva durante la consulta.
- **`bento`**: Tarjetas modulares organizadas en cuadrícula con jerarquía clara para métricas clínicas, calendario horizontal de doble espacio (`Espacio 1` y `Espacio 2`) y expedientes.
- **`shadcn`**: Bordes nítidos, controles de formulario consistentes, pestañas segmentadas y estados de foco visibles.
- **`paper`**: Opción de superficie cálida tipo papel clínico editorial para lectura prolongada de expedientes NOM-004.

## Reglas No Negociables de TypeUI Aplicadas (`typeui-fundamentals`)
1. **Insignias (`badges`) nunca a ancho completo**: Todas las etiquetas de estado, espacio y alerta de alergias usan `display: inline-flex; width: fit-content; white-space: nowrap`.
2. **Fórmula de radios anidados (`innerRadius + distance = outerRadius`)**:
   - Contenedores padres (`.bento-card`, `.calendar-scroll-wrapper`): `outerRadius = 16px`, `padding = 8px..12px`.
   - Elementos hijos (`.calendar-booked-slot`, `.calendar-empty-slot`, `.calendar-day-pill`): `innerRadius = 8px` (`16px - 8px`).
3. **`<select>` nativos con chevron SVG personalizado**: Se elimina la flecha nativa del sistema operativo (`appearance: none`) y se inyecta un chevron SVG con `inset` balanceado de `12px` y `padding-inline-end: 2.5rem`.
4. **Botones adyacentes e inputs en fila comparten altura exacta**: Altura base estandarizada (`min-height: 40px`), `white-space: nowrap`, `flex-shrink: 0`.
5. **Límite de tamaño de encabezados en Dashboard (`≤ 28px` título de página, `≤ 24px` widgets)**: Jerarquía compacta orientada a productividad clínica.
6. **Accesibilidad WCAG 2.2 Nivel AA**: Contraste verificado `> 7:1` en texto principal, `:focus-visible` con `outline` de `3px` y separación estricta HTML/CSS sin estilos en línea.
<!-- TYPEUI_SH_MANAGED_END -->
