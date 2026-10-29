# Uso de Inteligencia Artificial

## Introducción

El proyecto se ha desarrollado con **Claude Code** (CLI de Anthropic, modelo Claude Opus 5.5), ejecutado en local sobre la carpeta del proyecto en Windows 11. Claude Code puede leer ficheros, escribir código y ejecutar comandos (npm, Docker, Git) con autorización.

La IA ha generado la mayor parte del código, los tests y la documentación, y ha aplicado las modificaciones posteriores. Mi trabajo ha consistido en definir los requisitos, las tecnologías y las restricciones, revisar los resultados de cada fase, probar la aplicación y pedir correcciones o cambios a partir de lo obtenido.

Este documento resume los prompts principales y el proceso seguido, como permite el apartado 7 del enunciado.

## Principales prompts y tareas

### 1. Planteamiento inicial

El desarrollo partió de un único prompt largo y estructurado, no de una petición genérica:

> "Desarrolla la prueba técnica completa siguiendo el PDF. Lee primero el PDF y el CSV y analiza todos los requisitos. Prioriza sencillez y calidad…"

El prompt incluía:

- **Contexto:** leer el enunciado y el CSV antes de empezar y cumplir fielmente el PDF.
- **Prioridades:** sencillez y código legible y fácil de explicar, sin arquitecturas sobredimensionadas.
- **Tecnologías:** Node.js, TypeScript, Express y Prisma, React y Vite, PostgreSQL, Docker Compose, Vitest y sesiones con cookies HttpOnly.
- **Reglas de trabajo:** commits pequeños, no subir secretos, no publicar en GitHub sin permiso, no modificar nada fuera de la carpeta del proyecto y no afirmar que algo funciona sin comprobarlo.
- **Fases:** análisis, arquitectura, base de datos e importador, API, autenticación e histórico, interfaz web, Docker, pruebas y documentación.

### 2. Implementación por fases

Los requisitos de cada fase venían detallados en el prompt inicial. Claude Code los desarrolló en orden y creó un commit por fase:

| Fase | Requisitos indicados | Resultado |
|---|---|---|
| Análisis y arquitectura | Revisar el CSV fila a fila antes de programar y proponer una estructura sencilla | Lista de anomalías del CSV y estructura `routes → controllers → services`, con sesiones en base de datos, borrado lógico y nginx como proxy |
| Importación CSV | Detectar duplicados, normalizar formatos de fecha e importe, no inventar datos que falten y que la importación se pueda repetir | Normalizadores e importador por filas, con una transacción por fila y registro de incidencias |
| API | Endpoints del enunciado, paginación, búsqueda y filtros | API REST con validación con Zod y gestión de errores centralizada |
| Autenticación | API protegida y contraseñas seguras | Login con bcrypt, sesiones en base de datos y cookie HttpOnly |
| Histórico | Registrar los cambios en una transacción y no escribir nada si no hay cambios | Una fila por campo modificado, guardada en la misma transacción que el cambio |
| Interfaz y Docker | Interfaz en español; arranque con `docker compose up` | React (login, listado, ficha y formulario), Dockerfiles, nginx y Docker Compose |
| Pruebas | Tests que se ejecuten con un solo comando | 40 tests unitarios y de integración con una base de datos de test propia |
| Documentación | README, ejemplos de la API y este documento | `README.md`, `api/clientes.http`, `api/ejemplos-curl.md` y `docs/USO_IA.md` |

### 3. Validaciones y auditoría

Después de revisar el resultado pedí una auditoría con una restricción explícita: corregir solo problemas reales, sin cambiar la arquitectura ni borrar datos.

> "Auditoría final: valida estrictamente las fechas de la API, revisa seguridad y autenticación, clasifica las vulnerabilidades de dependencias, comprueba requisito a requisito y los casos especiales, sin rehacer la arquitectura ni borrar datos"

El método fue escribir primero un test que reprodujera cada sospecha y corregir solo lo que ese test demostraba que fallaba. Se añadieron 10 tests (de 40 a 50).

### 4. Preparación de la entrega

> "Prepara un ZIP del proyecto para una revisión técnica externa, sin node_modules, .git, .env ni datos sensibles; no modifiques nada"

> "Preparación final: limpia el código como lo haría un sénior (sin cambiar funcionalidad), prepara un usuario privado local fuera del repositorio, separa la documentación pública de la de estudio y deja el repositorio listo para GitHub sin publicarlo"

> "Revisión final: README técnico y conciso, ninguna credencial publicada en el repositorio, eliminar emojis decorativos, limpieza ligera de comentarios, prueba de instalación limpia y revisión del historial de Git, sin añadir funcionalidades ni publicar"

Como material de estudio para la defensa técnica, pedí también una guía personal que explica cada parte del código. Estuvo en `docs/` durante el desarrollo y la saqué del repositorio al preparar la entrega; sigue visible en el historial de commits.

Este documento se ha reorganizado con Claude Code a partir de la información de la sesión.

## Supervisión y validación del desarrollo

### Comprobaciones realizadas por Claude Code

Claude Code verificó cada fase ejecutando el código, no solo leyéndolo:

- Importación del CSV contra PostgreSQL, contrastada con el análisis manual del CSV hecho antes de programar.
- Tests automáticos con `npm test`.
- Compilación de backend y frontend con `tsc` y `npm run build`.
- Arranque completo con Docker, incluida la instalación desde cero en una carpeta temporal.
- Peticiones a la API con curl a través de nginx: respuestas 401, 400, 404 y 409, búsqueda, filtros y paginación.

Claude Code no tuvo acceso a un navegador, así que no comprobó la interfaz visualmente.

### Comprobaciones realizadas personalmente

He probado la interfaz manualmente en el navegador:

- inicio de sesión;
- listado de clientes;
- creación, consulta, edición y eliminación de clientes;
- gestión de contactos;
- detección de CIF duplicado y mensajes de validación;
- búsqueda y filtros;
- histórico de modificaciones;
- diseño responsive (vista móvil).

No consta una prueba manual específica de la paginación en el navegador. Está cubierta por los tests de la API y por las peticiones con curl.

Además de probar la aplicación, revisé los resultados que Claude Code iba presentando en cada fase y, a partir de ellos, pedí las modificaciones descritas en este documento.

## Incidencias detectadas y correcciones

| Incidencia | Corrección |
|---|---|
| `npm audit` detectó vulnerabilidades en las versiones instaladas al principio (zod, csv-parse, express-rate-limit) | Dependencias actualizadas. Los avisos restantes requieren versiones mayores y están clasificados en el README |
| Claude Code intentó preparar la base de datos de test con `prisma migrate reset`, que borra la base de datos; Prisma lo bloqueó al detectar que lo ejecutaba un agente de IA | En lugar de saltarse la protección, se cambió a `prisma migrate deploy` (no borra datos) y a un `TRUNCATE` que se niega a ejecutarse si el nombre de la base de datos no contiene `test` |
| El `globalSetup` de Vitest no recibía la URL de la base de datos de test, y el fichero de configuración no podía importar Vitest | URL fijada en la configuración y fichero renombrado a `vitest.config.mts` |
| Desde un clon limpio, los tests fallaban porque el cliente de Prisma no estaba generado | Script `postinstall` con `prisma generate` y Dockerfile reordenado |
| Los puertos 8080 y 5433 estaban ocupados en mi equipo | Puertos por defecto cambiados a 8085 y 55432 |
| Riesgo de finales de línea CRLF en los contenedores Linux | `.gitattributes` para forzar LF |
| La API validaba `fechaAlta` con `Date.parse()`, que acepta `2026-09-31` y lo convierte en 1 de octubre | Validación con la misma función estricta que usa el importador |
| Un id mayor que el máximo de `INTEGER` provocaba un error 500 | Límite en la validación: ahora responde 400 |
| En `docker-compose.yml`, una contraseña vacía en `.env` activaba la contraseña de demostración pública | Primero se corrigió la sintaxis de la variable. En la revisión final se eliminaron todos los valores por defecto: el repositorio no publica credenciales de acceso y, si faltan las del usuario, no se crea ningún usuario |

## Resultado de las verificaciones

Estado tras la revisión final:

- **Tests:** 50/50 en verde (normalización, importación, validaciones, autenticación, búsqueda y filtros, histórico y borrado lógico).
- **Compilación:** backend y frontend sin errores de tipos ni de build.
- **Importación:** 18 filas leídas, con 7 clientes, 8 contactos y 14 facturas creados, 1 duplicado y 2 facturas rechazadas. Repetirla no duplica datos.
- **Instalación limpia:** en una carpeta temporal, con un proyecto Docker y una base de datos independientes, la aplicación arranca, el usuario configurado inicia sesión, se importa el CSV y la API y la web responden. Sin credenciales configuradas no se crea ningún usuario.
- **Seguridad del repositorio:** ningún fichero versionado contiene credenciales de acceso, y `.env` está excluido por `.gitignore`. Las credenciales de demostración que se usaron en versiones anteriores siguen visibles en el historial de commits, que se conserva tal cual; ya no dan acceso a una instalación nueva.
- **Pendiente:** la interfaz no tiene tests automáticos; se ha validado manualmente.
