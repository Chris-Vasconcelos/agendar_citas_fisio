# Informe de Evaluación y Propuesta de Refactorización para Fisio-Citas

## 1. Análisis de `App.jsx`

El archivo `App.jsx` concentra casi toda la lógica de la aplicación, alcanzando un tamaño significativo (más de 1600 líneas). Actualmente tiene demasiadas responsabilidades que dificultan el mantenimiento a largo plazo.

### Responsabilidades actuales en `App.jsx`
*   **Gestión de estado global**: Maneja el estado de pacientes, citas, disponibilidad, alertas, modalidad de calendario y temas de UI.
*   **Conexión a base de datos (Supabase)**: Contiene lógica de carga inicial y validaciones directas contra Supabase (Auth y Data).
*   **Reglas de negocio complejas**: Contiene funciones de validación como `validateAppointmentConstraints` (concurrencia de espacios).
*   **Lógica de exportación/importación**: Gestiona la creación de backups JSON y la exportación a CSV.
*   **Renderizado completo de pantallas (UI)**: Define la estructura HTML/JSX para la agenda, listado de pacientes, configuración de horarios, sección de seguridad y *modales* completos para crear/editar citas, pacientes y autenticación.
*   **Gestión de Autenticación**: Lógica de login/registro y estados asociados.

### Problemas encontrados
*   **Acoplamiento excesivo**: Cambiar el diseño de la agenda puede romper accidentalmente la lógica de exportación.
*   **Dificultad de lectura**: Es difícil encontrar y modificar funciones específicas, lo que aumenta el tiempo de desarrollo.
*   **Reutilización**: Componentes genéricos como botones o modales no se pueden reusar fácilmente.

---

## 2. Análisis de Dependencias y Entorno

### `package.json`
El proyecto es pequeño y eficiente, las dependencias son correctas:
*   **React y React DOM** (v19.0.0): Versiones muy recientes.
*   **@supabase/supabase-js**: Cliente oficial para base de datos.
*   **lucide-react**: Para íconos ligeros.
*   **Vite**: Como empaquetador moderno y rápido.
*   **Tailwind CSS (v4.0.6)**: Integrado mediante `@tailwindcss/vite` de forma correcta y moderna.

### `.gitignore`
Está correctamente configurado para un proyecto frontend moderno y para ignorar archivos que el sistema de Fisio-Citas puede generar:
*   Ignora `node_modules` y directorios de compilación `dist/`.
*   Ignora variables de entorno (.env).
*   **Importante**: Ignora explícitamente los archivos de respaldo exportados generados por la aplicación (`backup_fisio_*.json`, `*.csv`). Esto significa que si creas exportaciones de prueba, no se subirán accidentalmente al repositorio (lo cual protege los datos).

---

## 3. Estrategia de Refactorización Gradual

Para preparar la aplicación para escalar, se propone la siguiente separación, a implementarse de forma progresiva. El objetivo es preservar la funcionalidad exacta (incluyendo el export CSV y reglas de horario).

### Fase 1: Extracción de Utilidades
Extraer funciones puras que no dependen de React.
*   **Crear `src/utils/dateUtils.js`**: Para `getTodayDateString`, `getCompactDateString`, `addMinutesToTimeStr`, `formatTimeShort`, `formatDateHuman`.
*   **Crear `src/utils/csvUtils.js`**: Para `escapeCsvCell`.
*   **Mover datos mock**: `INITIAL_DEMO_PATIENTS`, `INITIAL_DEMO_AVAILABILITY`.

### Fase 2: Componentes Reutilizables (UI)
Extraer partes de la interfaz que son independientes y modales.
*   **Crear `src/components/ui/`**: Botones genéricos, inputs.
*   **Crear `src/components/modals/`**:
    *   `AuthModal.jsx`
    *   `PrivacyNoticeModal.jsx`
    *   `PatientFormModal.jsx`
    *   `AppointmentFormModal.jsx`
    *   `ClinicalRecordModal.jsx`

### Fase 3: Separación por Pantallas (Pages)
Dividir el contenido principal de las vistas.
*   **Crear `src/pages/AgendaPage.jsx`**
*   **Crear `src/pages/PatientsPage.jsx`**
*   **Crear `src/pages/AvailabilityPage.jsx`**
*   **Crear `src/pages/SecurityPage.jsx`**

### Fase 4: Lógica de Negocio y Hooks (Opcional, más avanzado)
*   **Crear `src/hooks/useSupabaseData.js`**: Para gestionar la carga de pacientes, citas y disponibilidad.
*   **Crear `src/services/`**: Mover las consultas de `supabase.from(...)` a funciones centralizadas.

## 4. Archivos de entrega (`FisioCitas.html` / `scripts`)
Los archivos como `FisioCitas.html` (si existe en la raíz, aunque no está en la rama principal visible) o el generado por `scripts/single-file.mjs` están pensados para entregas offline. No se deben borrar ni romper, y cualquier cambio en el proceso de *build* debe considerar que el objetivo final puede ser mantener este mecanismo.

## Conclusión

El proyecto tiene bases técnicas sólidas pero `App.jsx` necesita refactorizarse pronto si se quieren añadir más características de forma segura. La prioridad debe ser extraer las funciones de utilidad, modales, y luego separar las vistas (páginas). Se debe mantener la política estricta de **cero pérdida de funcionalidad**, especialmente en la lógica del sistema de citas y manejo de archivos de datos locales.