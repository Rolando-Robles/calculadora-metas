# **App Name**: Aviva Móvil

## Core Features:

- Panel de Inicio: Muestra KPIs clave (Solicitudes, Aprobadas, Desembolsadas, Monto) con barras de progreso, un gráfico de avance a meta y una línea de tiempo de 30 días, permitiendo a los vendedores visualizar su desempeño actual y el progreso hacia sus metas. Incluye sugerencias de 'Qué hacer hoy' generadas para impulsar el rendimiento.
- Simulador de Incentivos: Calculadora de incentivos que permite a los vendedores simular diferentes escenarios de solicitudes creadas y monto desembolsado para ver el impacto en su comisión proyectada y el multiplicador alcanzado.
- Captura Rápida de Datos: Interfaz sencilla para registrar las métricas diarias (Creadas, Aprobadas, Desembolsadas, Monto) con validación de fechas y soporte offline, garantizando que los vendedores puedan registrar su actividad diaria de forma rápida y eficiente.
- Integración con Google Sheets: Sincroniza la información de usuarios (email, owner_id, producto, kiosco, rol, active) desde Google Sheets para poblar datos en la aplicación.  Implementa caché con TTL y un CRON para actualizaciones completas diarias, gestionando la creación, actualización y desactivación de usuarios.  Esta tool resolves usuarios a partir de la hoja de cálculo, impidiendo el login si están inactivos.
- Integración con HubSpot: Extrae datos diarios de HubSpot (creadas, aprobadas, desembolsadas, monto) mediante una tarea programada y un endpoint on-demand para alimentar la colección de dailyEntries. Evita duplicados y reconcilia cambios. Se asegura la disponibilidad de datos del vendedor, sin necesidad de que éste ingrese datos manualmente.
- Perfil de Usuario: Muestra información del vendedor (nombre, kiosco, producto) y acceso a la sección de ayuda (FAQs) y cierre de sesión. Se provee acceso rápido a la información del usuario y soporte técnico.
- Generación de recomendaciones diarias: Usa la información sobre el rendimiento reciente, las metas y el esquema de incentivos para generar dinámicamente hasta tres sugerencias diarias sobre las acciones más impactantes que el vendedor puede tomar para mejorar su rendimiento y aumentar sus comisiones.

## Style Guidelines:

- Color primario: Azul (#2B4EFF) para las llamadas a la acción, transmite confianza y modernidad.
- Color de acento: Verde (#00C389) para indicar éxito y logros, reforzando una sensación positiva.
- Color secundario: Morado (#6E56CF) para gráficos y visualizaciones, aportando un toque creativo y diferenciador.
- Color de fondo: Gris claro (#F7F8FC) para una interfaz limpia y moderna, que facilita la lectura y el enfoque en el contenido principal.
- Fuente: 'Inter' (sans-serif) para títulos (28–32 px) y cuerpo de texto (16–18 px), garantizando una lectura clara y moderna.
- Diseño tablet-first adaptado a móviles con navegación inferior que facilita el acceso a las secciones principales (Inicio, Simular, Capturar, Perfil).
- Iconografía clara y representativa para la navegación y elementos de la interfaz, mejorando la usabilidad y la comprensión.
- Micro-animaciones sutiles para proporcionar retroalimentación visual y mejorar la interacción del usuario.