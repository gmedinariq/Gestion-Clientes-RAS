# Uso de Inteligencia Artificial

## Herramienta

- **Claude Code** (CLI de Anthropic), modelo **Claude Opus 5.5**, ejecutado en local sobre la carpeta del proyecto en Windows 11.
- Claude Code puede leer ficheros, escribir código y ejecutar comandos (npm, docker, git) con mi autorización. El desarrollo, la auditoría final y la preparación de la entrega se hicieron en una única sesión.

## Cómo dirigí a la IA

Escribí un único prompt inicial largo y estructurado (no una petición genérica) con:

1. **Contexto y objetivo**: leer el PDF del enunciado y el CSV antes de empezar y cumplir fielmente el PDF.
2. **Prioridad**: sencillez, código legible y fácil de explicar en una entrevista; nada de arquitecturas sobredimensionadas.
3. **Tecnologías propuestas**: Node + TypeScript + Express + Prisma, React + Vite, PostgreSQL, Docker Compose, Vitest, sesiones con cookies HttpOnly.
4. **Requisitos detallados** de base de datos, importación (detectar duplicados, formatos de fecha y número, no inventar datos, idempotencia), API, interfaz, histórico (transacciones, no registrar si no hay cambios), Docker y tests.
5. **Reglas de trabajo**: commits pequeños, no subir secretos, no publicar en GitHub sin mi permiso, no modificar nada fuera de la carpeta, **no afirmar que algo funciona sin comprobarlo**.
6. **Fases**: análisis → arquitectura → BD e importador → API → autenticación e histórico → web → Docker → pruebas → documentación → guía de defensa.
7. **Entregables de documentación**: README, este documento y una guía de estudio para la defensa técnica (de uso personal; ver [Cómo se ha comprobado el código generado](#cómo-se-ha-comprobado-el-código-generado)).

### Resumen de los prompts principales

| # | Prompt (resumen) | Resultado |
|---|---|---|
| 1 | "Desarrolla la prueba técnica completa siguiendo el PDF. Lee primero el PDF y el CSV y analiza todos los requisitos. Prioriza sencillez y calidad…" (prompt completo con los 14 apartados descritos arriba) | Todo el proyecto, desarrollado por fases con commits |
| 2 | "Prepara un ZIP del proyecto para una revisión técnica externa, sin node_modules, .git, .env ni datos sensibles; no modifiques nada" | ZIP generado con `git archive` (no forma parte del repositorio) |
| 3 | "Auditoría final: valida estrictamente las fechas de la API, revisa seguridad y autenticación, clasifica las vulnerabilidades de dependencias, comprueba requisito a requisito y los casos especiales, sin rehacer la arquitectura ni borrar datos" | Ver la sección [Auditoría final](#auditoría-final) |
| 4 | "Preparación final: limpia el código como lo haría un sénior (sin cambiar funcionalidad), prepara un usuario privado local fuera del repositorio, separa la documentación pública de la de estudio y deja el repositorio listo para GitHub sin publicarlo" | Ver la sección [Preparación de la entrega](#preparación-de-la-entrega) |
| 5 | "Revisión final: README técnico y conciso, ninguna credencial publicada en el repositorio, eliminar emojis decorativos, limpieza ligera de comentarios, prueba de instalación limpia y revisión del historial de Git, sin añadir funcionalidades ni publicar" | Ver la sección [Revisión final antes de la entrega](#revisión-final-antes-de-la-entrega) |

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

Todas están explicadas en el README (apartado "Decisiones técnicas").

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
| Repositorio recién clonado | `git clone` en una carpeta temporal, sin `.env`: `docker compose up --build`, `npm ci`, `npm test`, `npm run build` (backend y frontend) | Todo correcto (tras corregir el `postinstall`, ver abajo) |
| Importación manual en el contenedor | `docker compose exec api node dist/src/scripts/importar.js` | Funciona; avisa de que el comercial de un cliente difiere y no lo sobrescribe |

### La interfaz: comprobación manual

La IA no tuvo acceso a ningún navegador en ninguna fase. Por su parte, verificó que el frontend compila sin errores de tipos y que todos los endpoints que usa responden correctamente.

**La interfaz la he probado yo manualmente en el navegador**:
- inicio de sesión y listado de clientes;
- creación, consulta, edición y eliminación de clientes;
- gestión completa de contactos e histórico de modificaciones;
- mensajes de validación y detección de CIF duplicado;
- búsquedas y filtros;
- vista móvil.

No consta una prueba manual específica de la **paginación** en el navegador; está cubierta por los tests de la API y por las comprobaciones con curl.

## Correcciones importantes durante el desarrollo

1. **Vulnerabilidades de dependencias**: `npm audit` detectó vulnerabilidades en las versiones que se instalaron al principio (zod, csv-parse, express-rate-limit). Se actualizaron. Queda una en el CLI de Prisma 6 que solo se corrige con Prisma 7 (documentada en el README).
2. **Preparación de la base de datos de tests**: la IA usó primero `prisma migrate reset` (borra y recrea la BD). Prisma lo **bloqueó** al detectar que lo ejecutaba un agente de IA, pidiendo consentimiento explícito. En lugar de saltarse esa protección, se cambió el diseño a uno más seguro: `prisma migrate deploy` (no borra nada) + `TRUNCATE` que se niega a ejecutarse si la base de datos no se llama `*test*`.
3. **Variables de entorno en el `globalSetup` de Vitest**: no recibía la URL de la BD de test (se ejecuta en otro proceso). Corregido fijándola en `vitest.config.mts`.
4. **`vitest.config.ts` → `.mts`**: TypeScript no podía importar Vitest (módulo ES) desde un fichero CommonJS.
5. **Puertos ocupados** (5433 y 8080) en mi equipo: se cambiaron los puertos por defecto.
6. **Finales de línea**: se añadió `.gitattributes` para forzar LF y evitar problemas en los contenedores Linux.
7. **Fallo detectado al probar desde un clon limpio**: tras `git clone` + `npm ci`, los tests fallaban porque el cliente de Prisma no estaba generado (en la carpeta de trabajo sí lo estaba). Se añadió `"postinstall": "prisma generate"` y se reordenó el Dockerfile. Después se repitió la prueba completa desde un clon nuevo: Docker, 40/40 tests y builds correctos.
8. **Ids del ejemplo PUT** en `api/clientes.http`: se comprobaron contra la base de datos real y se corrigió el id de un contacto.

## Cómo se ha comprobado el código generado

- Cada fase se verificó **ejecutando** el código (importador contra PostgreSQL, tests, builds, Docker, curl), no solo leyéndolo.
- Los resultados de la importación se contrastaron con un **análisis manual del CSV** hecho antes de programar.
- Los tests cubren los casos concretos del CSV real (no datos inventados), y comprueban tanto lo que debe funcionar como los errores (401, 400, 404, 409, transacción revertida).
- Para entender y poder modificar el código, la IA generó además una **guía de estudio personal** (`GUIA_DEFENSA_TECNICA.md`). Explica cada parte con referencias a los ficheros reales e incluye preguntas de entrevista y ejercicios. Estuvo en `docs/` durante el desarrollo; al preparar la entrega la saqué del repositorio por ser material de estudio personal, no documentación del proyecto. Sigue visible en el historial de commits.


## Auditoría final

Antes de la entrega se pidió a la IA una auditoría con una restricción explícita: **corregir solo problemas reales**, sin cambiar la arquitectura, el diseño ni las tecnologías, y sin borrar datos (las pruebas destructivas solo en la base de datos de tests).

**Método:** antes de corregir nada, se escribieron tests que reproducían cada sospecha. Solo se corrigió lo que esos tests demostraron que fallaba.

| Hallazgo | ¿Real? | Corrección |
|---|---|---|
| La API validaba `fechaAlta` con `Date.parse()`, que acepta `2026-09-31` y lo convierte en `2026-10-01` | **Sí**: `POST` devolvía 201 y guardaba la fecha equivocada | Se valida con `normalizarFecha()`, la función estricta que ya usaba el importador (que no se ha tocado) |
| Un id mayor que el máximo de `INTEGER` (`/api/clientes/99999999999`, o un `id` de contacto enorme en el PUT) | **Sí**: error 500 de PostgreSQL | Máximo de 2.147.483.647 en `idSchema` y en el id de contacto → 400 |
| Acceso sin sesión a PUT, DELETE, filtros y resumen; cookie inventada; cookie reutilizada tras logout; sesión caducada; exposición del hash de la contraseña | No: ya estaban bien protegidos | Solo se añadieron tests que lo demuestran |
| CSRF / configuración de cookies | No: `HttpOnly`, `SameSite=Strict`, `Secure` configurable, cuerpo JSON obligatorio | — |
| JSON mal formado o cuerpo que no es JSON | No: ya devolvía 400 | Test añadido |
| Borrado lógico coherente con facturas e histórico | Sí era coherente | Tests añadidos: borrar un contacto queda en el histórico; un cliente eliminado no se puede modificar y su CIF sigue reservado (409 con mensaje claro) |
| README no dejaba suficientemente claro que las credenciales demo son solo locales | Documentación | Aviso explícito en el README |

**Dependencias (`npm audit`)**: frontend sin vulnerabilidades. En el backend quedan avisos que solo se corrigen con versiones mayores (Prisma 7, Vitest 5). Están clasificados en el README (apartado "Limitaciones conocidas"). Resumen: `deepmerge-ts` llega a la imagen de producción a través del CLI de Prisma, pero solo se usa en `prisma migrate deploy` al arrancar y nunca con datos de usuario. Los avisos críticos (`tinypool`, `@vitest/mocker`) son de herramientas de test que no están en la imagen Docker; se comprobó listando `node_modules` dentro del contenedor.

**Comprobaciones realizadas en la auditoría:**

- `npm test`: **50/50** (antes 40; se añadieron 10).
- Build de backend y frontend correctos.
- `docker compose config` válido.
- Reconstrucción con `docker compose up -d --build` **sin borrar el volumen**. Los conteos de la base de datos (clientes, contactos, facturas, histórico, importaciones y última modificación) eran idénticos antes y después, y la importación se omitió correctamente.
- Pruebas contra la API en ejecución a través de nginx, solo de lectura o con peticiones que deben rechazarse, para no modificar datos:
  - 401 sin sesión en GET, PUT, DELETE e histórico;
  - 400 con fecha inexistente, comprobando además que no se creó nada;
  - 400 con id enorme o no numérico;
  - 409 con CIF duplicado;
  - búsqueda por empresa, CIF, contacto y email;
  - filtros por estado, país y comercial;
  - paginación.
- **No verificado por la IA:** la interfaz en un navegador (no había ninguno disponible).

## Preparación de la entrega

Petición: revisar el código como lo haría un desarrollador sénior, **sin cambiar funcionalidad, diseño, tecnologías ni la API**, y dejar el repositorio listo para publicar (sin publicarlo).

**Limpieza del código.** Los cambios son pequeños, porque el código ya era consistente:
- Eliminado un tipo exportado sin uso (`ContactoInput`).
- Eliminado un parámetro que nunca se rellenaba (`detalles` en `HttpError`). Las respuestas de error no cambian.
- Retirados los comentarios que repetían el código o comparaban con ASP.NET; ese material de estudio está en la guía personal.
- Corregida una referencia a un fichero renombrado (`vitest.config.mts`).
- Una constante del formulario sale fuera del bucle de renderizado.
- Comprobado con `tsc --noUnusedLocals --noUnusedParameters`: no queda código sin usar.
- Los `console.log` restantes son logs operativos (arranque de la API y resumen de importación), no de depuración.

**Error encontrado en la configuración de credenciales.** `docker-compose.yml` usaba `${DEMO_USER_PASSWORD:-<contraseña demo>}`. En Compose, `:-` aplica el valor por defecto también cuando la variable existe pero está **vacía**. Por tanto, un `.env` con un correo privado y la contraseña todavía sin rellenar habría creado ese usuario con la contraseña pública. Se cambió a `-`, que solo aplica el valor por defecto si la variable no existe. Comprobado con `docker compose config` en los dos casos. En la revisión final se eliminaron por completo los valores por defecto (ver [Revisión final antes de la entrega](#revisión-final-antes-de-la-entrega)).

**Credenciales privadas.** Mi usuario local se configura en un `.env` que git ignora, y yo introduzco la contraseña a mano: la IA no la conoce. Se comprobó que ningún fichero versionado ni ningún commit del historial contiene el correo privado.

**Documentación.** El README se reescribió más conciso, conservando lo que pide el enunciado. La guía de estudio se movió fuera del repositorio tras comprobar que la copia era idéntica (hash SHA-256).

## Revisión final antes de la entrega

Petición: que el repositorio no publique ninguna credencial de acceso (las facilito por separado a los evaluadores), sin cambiar la autenticación, el almacenamiento con bcrypt ni la funcionalidad.

**Cambios:**
- `docker-compose.yml` ya no tiene contraseñas por defecto. `POSTGRES_PASSWORD` es obligatoria (`${POSTGRES_PASSWORD:?...}`): sin ella, Compose no arranca y lo indica. El email y la contraseña del usuario de acceso no tienen valor por defecto; si faltan, `seed.ts` no crea ningún usuario (comportamiento que ya existía).
- `.env.example` deja vacías las contraseñas y el usuario de acceso.
- `vitest.config.mts` construye la URL de la base de datos de test con las variables `POSTGRES_*` del entorno o del `.env` de la raíz (solo lee esas claves), en lugar de llevar la contraseña escrita en el código.
- `api/clientes.http` y `api/ejemplos-curl.md` usan variables para el email y la contraseña.
- README reescrito con el procedimiento de instalación en cinco pasos; eliminado el único emoji del repositorio y algunos comentarios de tono didáctico.

**Comprobaciones:**
- 50/50 tests, `tsc` y build de backend y frontend correctos.
- Instalación limpia en una carpeta temporal con un proyecto Docker y un volumen independientes: sin `.env`, Compose se niega a arrancar; con `.env`, se crea el usuario configurado, se importa el CSV (7 clientes, 8 contactos, 14 facturas), el login funciona y las credenciales demo antiguas devuelven 401; sin email ni contraseña de acceso, no se crea ningún usuario. Los tests también pasan en esa copia leyendo el `.env`.
- Búsqueda de credenciales en los ficheros versionados: no queda ninguna. Mi correo privado no aparece en ningún fichero ni commit.
- **Historial:** las credenciales demo antiguas siguen visibles en commits anteriores. Ya no permiten iniciar sesión en una instalación nueva, porque el usuario solo se crea con las credenciales del `.env`.

## Historial de commits

Se conserva tal cual en el repositorio (`git log`).
