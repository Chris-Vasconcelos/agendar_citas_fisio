> HISTORICO: no usar como instrucciones de instalacion ni como estado vigente. Ver ../mina-local-estado-integracion.md y ../mina-local-windows.md.

# MINA — Consolidación técnica y lecciones (2026-11-02)

## Qué causó los problemas del splash
1. Se intentó corregir el dibujo sin verificar primero la versión local/branch cargada por el navegador.
2. El splash dependía de keyframes SVG, `pathLength` y posteriormente de un `iframe` con `srcDoc`: añadimos complejidad, posibles interferencias de CSS y diferencias de comportamiento entre navegadores.
3. La rama del iframe omitía todo el trazado si el sistema reportaba `prefers-reduced-motion: reduce`, que en el navegador de desarrollo estaba activado.
4. No se distinguió el *dibujo visible* de la duración completa de la animación: las curvas originales terminaban cerca de 3.72 s, pero el splash retenía la pantalla hasta 8.45 s.
5. Se crearon demasiados PR encadenados sin consolidar en `main`; la rama principal quedó obsoleta.
6. Las pruebas del splash eran sobre todo aserciones de texto y compilación; no prueban la apariencia real en PC/móvil. Se necesita QA visual y funcional con datos ficticios.

## Cambios consolidados en esta rama
- Refactor a componentes, hooks, servicios y páginas, con agenda, pacientes, horarios y seguridad.
- Identificación de pacientes, avisos de homónimos y controles de duplicados.
- Agenda responsiva con dos espacios de citas; ajustes de legibilidad.
- Identidad MINA, consentimiento fotográfico y UI preparada para bucket privado.
- Splash SVG directo: 8 trazos originales, `requestAnimationFrame`, sin iframe ni bloqueo inesperado por CSS de movimiento reducido; salida al terminar el dibujo visible + 500 ms y al completar la carga inicial.
- Inicio más seguro: carga inicial por usuario, panel de error si falla, límite de tiempo para autenticación y consultas, bloqueo de modo local sin Supabase en producción.
- Migraciones y RPC de restauración: **incluidas como código, NO aplicadas a la base remota**.
- Pruebas automatizadas para UI estática, búsqueda y exportación CSV.

## Qué se elimina
- `README.mdgit`: instrucciones Git pegadas accidentalmente, sin valor técnico.
- `revision-app-final.txt`: copia obsoleta de código de la aplicación; la versión vigente está en `src/App.jsx`, y la historia ya se conserva en Git.

## Qué NO se debe borrar a ciegas
- `supabase/schema.sql` y todas las migraciones: contienen requisitos de datos clínicos, seguridad y restauración que requieren staging.
- `docs/`, `DESIGN.md`, `implementation_plan.md` y el PDF legal: referencias de decisiones de producto, diseño y privacidad.
- `package-lock.json`: garantiza dependencias reproducibles con `npm ci`.
- `src/services/googleCalendar.js`: no se integra en el MVP actual; conservar por ahora para no romper referencias o una integración futura sin verificar todos los consumidores.

## Antes de fusionar a main y antes de producción
1. Validar `npm ci && npm test && npm run build` y abrir en PC y móvil con datos ficticios.
2. Comprobar que la agenda no muestra cita libre falsa por error de red, que maneja solapamientos y dos camillas.
3. Confirmar la **visibilidad privada del repositorio** y revisar secretos/historial. La API de GitHub informa actualmente `public`.
4. Crear respaldo de staging y probar RLS, pertenencia, Storage privado, consentimiento, restauración atómica y cierre de sesión.
5. Confirmar foto del consultorio autorizada, aviso de privacidad, flujo de respaldo y cuenta única.
6. Revisar PR de consolidación completo contra `main` y fusionar **solo con aprobación explícita**.
7. Ejecutar las migraciones en producción únicamente después de pruebas y respaldo; no incluir operaciones clínicas destructivas en la limpieza.

## Estrategia de ramas
La rama de consolidación incluye la evolución acumulada de las ramas de implementación.
Se propone un único PR hacia `main`, evitando fusionar uno por uno los PR experimentales del splash.
Los PR anteriores se pueden cerrar como sustituidos **después** de integrar la rama consolidada.
No eliminar ramas históricas ni forzar `main` sin revisar las diferencias.
