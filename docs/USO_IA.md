# Uso de Inteligencia Artificial

## Herramienta

- **Claude Code** (CLI de Anthropic), modelo **Claude Opus 5.5**, ejecutado en local sobre la carpeta del proyecto en Windows 11.
- Claude Code puede leer ficheros, escribir código y ejecutar comandos (npm, docker, git) con mi autorización. Todo el desarrollo de esta prueba se hizo en una única sesión.

## Cómo dirigí a la IA

Escribí un único prompt inicial largo y estructurado (no una petición genérica) con:

1. **Contexto y objetivo**: leer el PDF del enunciado y el CSV antes de empezar y cumplir fielmente el PDF.
2. **Prioridad**: sencillez, código legible y fácil de explicar en una entrevista; nada de arquitecturas sobredimensionadas.
3. **Tecnologías propuestas**: Node + TypeScript + Express + Prisma, React + Vite, PostgreSQL, Docker Compose, Vitest, sesiones con cookies HttpOnly.
4. **Requisitos detallados** de base de datos, importación (detectar duplicados, formatos de fecha y número, no inventar datos, idempotencia), API, interfaz, histórico (transacciones, no registrar si no hay cambios), Docker y tests.
5. **Reglas de trabajo**: commits pequeños, no subir secretos, no publicar en GitHub sin mi permiso, no modificar nada fuera de la carpeta, **no afirmar que algo funciona sin comprobarlo**.
6. **Fases**: análisis → arquitectura → BD e importador → API → autenticación e histórico → web → Docker → pruebas → documentación → guía de defensa.
7. **Entregables de documentación**: README, este documento y una guía de estudio para la defensa técnica.

### Resumen de los prompts principales

| # | Prompt (resumen) | Resultado |
|---|---|---|
| 1 | "Desarrolla la prueba técnica completa siguiendo el PDF. Lee primero el PDF y el CSV y analiza todos los requisitos. Prioriza sencillez y calidad…" (prompt completo con los 14 apartados descritos arriba) | Todo el proyecto, desarrollado por fases con commits |

La sesión fue autónoma: la IA trabajó por fases sin pedir confirmación en cada paso, tal como le indiqué.

## Fases asistidas por IA

| Fase | Qué hizo la IA | Commit |
|---|---|---|
| 1. Análisis | Leyó el PDF y el CSV y listó las anomalías del CSV fila a fila (formatos de importe ambiguos, fecha imposible, factura duplicada, fila sin CIF, emails en otro formato, países en varios idiomas…) | — |
| 2. Arquitectura | Propuso `routes → controllers → services`, sesiones en BD, borrado lógico y nginx como proxy | — |
| 3. BD e importador | `schema.prisma`, migración inicial, normalizadores y el importador por filas con transacciones | `Base de datos (Prisma + PostgreSQL) e importador…` |
| 4-5. API, auth e histórico | Endpoints, validación con Zod, errores centralizados, login con bcrypt y cookie HttpOnly, histórico en transacción | `API REST de clientes con autenticacion…` |
| 8 (adelantada). Tests | 40 tests: unitarios e integración con base de datos de test | `Tests automaticos…` |
| 6-7. Web y Docker | React (login, listado, ficha, formulario), CSS, Dockerfiles, nginx, docker-compose | `Interfaz web en React… y Docker Compose…` |
| 9. Ejemplos API | `api/clientes.http` y `api/ejemplos-curl.md` | `Coleccion de ejemplos de la API` |
| 9-10. Documentación | README, este fichero y la guía de defensa | commits de documentación |

## Decisiones técnicas tomadas durante la sesión

- **Prisma 6 en vez de 7**: Prisma 7 exige *driver adapters* y un fichero de configuración extra. Más piezas sin beneficio aquí.
- **TypeScript 5.9 en vez de 7**: TypeScript 7 es el nuevo compilador nativo; se prefirió la versión madura para evitar problemas de compatibilidad.
- **Sesiones en base de datos en vez de JWT**: más fáciles de explicar e invalidar; el token no es accesible desde JavaScript.
- **Borrado lógico**: para no perder facturas ni histórico.
- **Regla de importes**: `1.250` = mil doscientos cincuenta (miles), `640.5` = seiscientos cuarenta con cincuenta (decimal).
- **Fila sin CIF**: se asocia al cliente por el email de su contacto; si no es posible, se rechaza.
- **Importación al arrancar solo si el fichero es nuevo** (hash SHA-256), para que reiniciar no recree clientes borrados.
- **Puertos 8085 y 55432** porque 8080 y 5433 estaban ocupados por otros proyectos en mi equipo.

Todas están explicadas en el README (apartado 12).

## Validaciones realizadas (comprobadas de verdad durante la sesión)

| Comprobación | Cómo | Resultado |
|---|---|---|
| Importación del CSV | Ejecutando el importador contra PostgreSQL y comparando con un análisis manual del CSV | 7 clientes, 8 contactos, 14 facturas, 1 duplicado, 2 rechazadas. Totales por cliente revisados a mano (p. ej. Ebro: 1250 + 1875,60 + 529,50 + 520,80 = 4175,90) |
| Importación repetida | Segunda ejecución del importador | 0 creados, 15 duplicados: nada se duplica |
| Tests automáticos | `npm test` | 40/40 en verde |
| Compilación | `tsc --noEmit` y `npm run build` en backend y frontend | Sin errores |
| Arranque desde cero | `docker compose down -v` + `docker compose up -d --build` | db, api y web *healthy*; migraciones aplicadas; usuario demo creado; CSV importado |
| API a través de nginx | curl: sin sesión (401), login incorrecto (401), login correcto (cookie `HttpOnly; SameSite=Strict`), listado filtrado, resumen, ruta de la SPA (200) | Correcto |
| Persistencia | Modificar un cliente por API → `docker compose down` (sin `-v`) → `up` | El cambio y el histórico se conservan, la sesión sigue válida y la importación se omite |
| Histórico | PUT con cambios en cliente y en un contacto | Solo se registran los campos que cambian, con valor anterior, nuevo y usuario |
| Ejemplo `.http` | Ejecutando el PUT del fichero con curl | 200 y dos entradas de histórico correctas |
| Importación manual en el contenedor | `docker compose exec api node dist/src/scripts/importar.js` | Funciona; avisa de que el comercial de un cliente difiere y no lo sobrescribe |

### Lo que NO se pudo comprobar en la sesión

- **La interfaz web en un navegador real.** La extensión de navegador de Claude no estaba disponible en la sesión. Se comprobó que el frontend compila sin errores de tipos y que todos los endpoints que usa responden correctamente, pero **los formularios, filtros y navegación deben revisarse manualmente** antes de la entrega. Lista de comprobación recomendada:
  1. Entrar con el usuario demo y con una contraseña incorrecta.
  2. Buscar "ebro", filtrar por país/estado/comercial, cambiar de página.
  3. Crear un cliente con un contacto; intentar crear otro con el mismo CIF (debe mostrar error).
  4. Dejar la empresa vacía o poner un email mal escrito (deben aparecer errores en rojo).
  5. Editar un cliente, cambiar un teléfono, añadir y quitar contactos; ver el histórico en la ficha.
  6. Eliminar un cliente (debe pedir confirmación) y comprobar que desaparece del listado.
  7. Ver la web con el ancho de un móvil (herramientas de desarrollador del navegador).

## Correcciones importantes durante el desarrollo

1. **Vulnerabilidades de dependencias**: `npm audit` detectó vulnerabilidades en las versiones que se instalaron al principio (zod, csv-parse, express-rate-limit). Se actualizaron. Queda una en el CLI de Prisma 6 que solo se corrige con Prisma 7 (documentada en el README).
2. **Preparación de la base de datos de tests**: la IA usó primero `prisma migrate reset` (borra y recrea la BD). Prisma lo **bloqueó** al detectar que lo ejecutaba un agente de IA, pidiendo consentimiento explícito. En lugar de saltarse esa protección, se cambió el diseño a uno más seguro: `prisma migrate deploy` (no borra nada) + `TRUNCATE` que se niega a ejecutarse si la base de datos no se llama `*test*`.
3. **Variables de entorno en el `globalSetup` de Vitest**: no recibía la URL de la BD de test (se ejecuta en otro proceso). Corregido fijándola en `vitest.config.mts`.
4. **`vitest.config.ts` → `.mts`**: TypeScript no podía importar Vitest (módulo ES) desde un fichero CommonJS.
5. **Puertos ocupados** (5433 y 8080) en mi equipo: se cambiaron los puertos por defecto.
6. **Finales de línea**: se añadió `.gitattributes` para forzar LF y evitar problemas en los contenedores Linux.
7. **Ids del ejemplo PUT** en `api/clientes.http`: se comprobaron contra la base de datos real y se corrigió el id de un contacto.

## Cómo se ha comprobado el código generado

- Cada fase se verificó **ejecutando** el código (importador contra PostgreSQL, tests, builds, Docker, curl), no solo leyéndolo.
- Los resultados de la importación se contrastaron con un **análisis manual del CSV** hecho antes de programar.
- Los tests cubren los casos concretos del CSV real (no datos inventados), y comprueban tanto lo que debe funcionar como los errores (401, 400, 404, 409, transacción revertida).
- Para entender y poder modificar todo el código, la IA generó la guía [`GUIA_DEFENSA_TECNICA.md`](GUIA_DEFENSA_TECNICA.md), que explica cada parte con referencias a los ficheros reales.

<!-- Completa esta sección con tu propia revisión antes de entregar (qué revisaste, qué cambiaste tú). -->


## Historial de commits

Se conserva tal cual en el repositorio (`git log`).
