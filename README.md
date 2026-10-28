# Gestión de Clientes

Aplicación web interna para gestionar clientes y sus facturas. Sustituye al Excel compartido que se rellenaba a mano: importa los datos antiguos (`clientes_antiguos.csv`) a PostgreSQL, los expone en una **API REST protegida** y los gestiona desde una **web en español**, guardando un **histórico de todas las modificaciones**.

```bash
docker compose up
```

Abre **http://localhost:8085** y entra con `demo@empresa.local` / `Demo1234!`.

---

## Índice

1. [Descripción](#1-descripción)
2. [Tecnologías](#2-tecnologías)
3. [Estructura de carpetas](#3-estructura-de-carpetas)
4. [Cómo arrancar](#4-cómo-arrancar)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Acceso a la aplicación](#6-acceso-a-la-aplicación)
7. [Usuario de demostración](#7-usuario-de-demostración)
8. [Tests](#8-tests)
9. [Cómo probar la API](#9-cómo-probar-la-api)
10. [Base de datos](#10-base-de-datos)
11. [Importación del CSV](#11-importación-del-csv)
12. [Decisiones técnicas](#12-decisiones-técnicas)
13. [Problemas encontrados y soluciones](#13-problemas-encontrados-y-soluciones)
14. [Limitaciones conocidas](#14-limitaciones-conocidas)
15. [Mejoras futuras](#15-mejoras-futuras)

Documentación adicional: [uso de IA](docs/USO_IA.md) · [guía de defensa técnica](docs/GUIA_DEFENSA_TECNICA.md)

---

## 1. Descripción

| Requisito | Qué hace la aplicación |
|---|---|
| A · Base de datos | PostgreSQL con clientes, contactos, facturas, usuarios, sesiones, histórico e importaciones. Los datos del CSV se importan al arrancar. |
| B · API REST | `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id`, `GET /api/clientes/:id/historico`. Todas exigen sesión. |
| C · Interfaz web | Login, listado con buscador, filtros y paginación, ficha del cliente, formularios de alta y edición, confirmación al eliminar. |
| D · Histórico | Cada cambio en un cliente o en sus contactos guarda registro, campo, valor anterior, valor nuevo, fecha y usuario. |
| E · Puesta en marcha | `docker compose up` levanta base de datos, API y web. Tests con `npm test`. |

## 2. Tecnologías

| Capa | Tecnología | Por qué |
|---|---|---|
| API | **Node.js 22 + TypeScript + Express 5** | Express es el framework más conocido y sencillo de Node. Express 5 captura los errores de funciones `async` sin `try/catch`. TypeScript evita errores de tipos. |
| Acceso a datos | **Prisma 6** | Esquema legible en un solo fichero, migraciones automáticas y consultas tipadas (parecido a Entity Framework). Las consultas son parametrizadas: sin riesgo de inyección SQL. |
| Base de datos | **PostgreSQL 17** | Requisito de la prueba. |
| Validación | **Zod** | Define en un sitio qué datos son válidos y genera mensajes de error por campo. |
| Seguridad | **bcryptjs**, **helmet**, **express-rate-limit**, cookies HttpOnly | Contraseñas con hash, cabeceras de seguridad y límite de intentos de login. |
| Web | **React 19 + TypeScript + Vite 7**, React Router, iconos **lucide-react** | Estándar actual, compilación rápida. CSS propio, sin framework de estilos. |
| Servidor web | **nginx** | Sirve la web compilada y redirige `/api` a la API (mismo origen → la cookie funciona sin CORS). |
| Infraestructura | **Docker + Docker Compose** | Arranque con un solo comando. |
| Tests | **Vitest + Supertest** | Rápido, sintaxis tipo Jest, prueba los endpoints sin abrir un puerto. |

Se eligió **Prisma 6** y no la 7 porque la 7 obliga a configurar *driver adapters* y un fichero de configuración extra: más piezas sin ventaja para este proyecto.

## 3. Estructura de carpetas

```
.
├── docker-compose.yml        # Orquesta db + api + web
├── .env.example              # Variables de entorno documentadas
├── api/                      # Ejemplos para probar la API (.http y curl)
├── docs/                     # Uso de IA y guía de defensa técnica
├── backend/
│   ├── Dockerfile
│   ├── data/clientes_antiguos.csv   # CSV que se importa al arrancar
│   ├── prisma/
│   │   ├── schema.prisma     # Modelo de datos (tablas, relaciones, restricciones)
│   │   └── migrations/       # SQL generado por Prisma
│   ├── src/
│   │   ├── server.ts         # Arranca el servidor HTTP
│   │   ├── app.ts            # Crea la app Express: middlewares y rutas
│   │   ├── config.ts         # Lectura de variables de entorno
│   │   ├── db.ts             # Instancia única de PrismaClient
│   │   ├── routes/           # URL -> controlador
│   │   ├── controllers/      # HTTP: valida la entrada, llama al servicio, responde
│   │   ├── services/         # Lógica de negocio y acceso a datos
│   │   ├── validation/       # Esquemas Zod
│   │   ├── middleware/       # Autenticación y gestión de errores
│   │   ├── import/           # Normalizadores + importador del CSV
│   │   ├── scripts/          # seed.ts (arranque) e importar.ts (manual)
│   │   └── utils/HttpError.ts
│   └── tests/                # Tests con Vitest
└── frontend/
    ├── Dockerfile, nginx.conf
    └── src/
        ├── main.tsx, App.tsx # Punto de entrada y rutas
        ├── api/              # Llamadas a la API (fetch)
        ├── context/          # Sesión (AuthContext) y avisos (ToastContext)
        ├── components/       # Layout, diálogo de confirmación, componentes comunes
        ├── pages/            # Login, listado, ficha, formulario
        ├── utils/formato.ts  # Formato de euros y fechas en español
        └── styles.css
```

## 4. Cómo arrancar

**Requisito:** Docker con Docker Compose v2.

```bash
git clone <url-del-repositorio>
cd <carpeta>
docker compose up --build
```

No hace falta crear `.env`: si no existe se usan valores por defecto de desarrollo (ver siguiente apartado).

Al arrancar ocurre, por este orden:

1. Se levanta **PostgreSQL** y Compose espera a que esté *healthy*.
2. Arranca la **API**: aplica las migraciones (`prisma migrate deploy`), crea/actualiza el usuario de demostración, importa el CSV **solo si ese fichero no se había importado ya**, y empieza a escuchar.
3. Cuando la API responde a `/api/health`, arranca **nginx** con la web.

Comandos útiles:

```bash
docker compose up -d          # en segundo plano
docker compose logs -f api    # ver logs (incluye el resumen de la importación)
docker compose down           # parar (los datos se conservan en el volumen pgdata)
docker compose down -v        # parar y BORRAR la base de datos (vuelve a importar al arrancar)
```

**Si un puerto está ocupado** (8085 para la web o 55432 para PostgreSQL), cambia `WEB_PORT` o `POSTGRES_PORT` en un `.env`.

### Desarrollo sin Docker (opcional)

```bash
docker compose up -d db                       # solo la base de datos
cd backend && npm install
export DATABASE_URL=postgresql://clientes:clientes_dev@localhost:55432/clientes   # PowerShell: $env:DATABASE_URL="..."
npx prisma migrate deploy && npm run seed && npm run dev    # API en :3000
cd ../frontend && npm install && npm run dev                # Web en :5173 (redirige /api a :3000)
```

## 5. Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Para personalizarlas: `cp .env.example .env`.

| Variable | Por defecto | Uso |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | `clientes` / `clientes` / `clientes_dev` | Base de datos que crea el contenedor. |
| `POSTGRES_PORT` | `55432` | Puerto del equipo (solo `127.0.0.1`) para tests y clientes SQL. |
| `WEB_PORT` | `8085` | Puerto de la web. |
| `SESSION_HOURS` | `8` | Duración de la sesión. |
| `COOKIE_SECURE` | `false` | `true` si se sirve por HTTPS. |
| `DEMO_USER_EMAIL`, `DEMO_USER_NAME`, `DEMO_USER_PASSWORD` | `demo@empresa.local` / `Usuario Demo` / `Demo1234!` | Usuario de demostración. |

La API recibe además `DATABASE_URL`, que `docker-compose.yml` construye a partir de las variables de PostgreSQL.

> Los valores por defecto existen para que `docker compose up` funcione sin pasos previos en un repositorio recién clonado. **No son secretos**: son credenciales de desarrollo local. En cualquier otro entorno hay que definir un `.env` propio.

## 6. Acceso a la aplicación

| Qué | Dirección |
|---|---|
| Web | http://localhost:8085 |
| API (a través de nginx) | http://localhost:8085/api |
| PostgreSQL | `localhost:55432` (usuario/contraseña de `.env`) |

## 7. Usuario de demostración

- Email: `demo@empresa.local`
- Contraseña: `Demo1234!`

Se crea en cada arranque con los valores de `DEMO_USER_EMAIL`, `DEMO_USER_NAME` y `DEMO_USER_PASSWORD` (`backend/src/scripts/seed.ts`). Si cambias la contraseña en `.env` y reinicias (`docker compose up -d`), se actualiza. La contraseña se guarda con **bcrypt** (nunca en claro) y debe tener al menos 8 caracteres. Si no se definen email o contraseña, no se crea ningún usuario.

## 8. Tests

Los tests usan una base de datos propia, **`clientes_test`**, dentro del mismo PostgreSQL de Docker (no tocan los datos de la aplicación).

```bash
docker compose up -d db        # si no está ya arrancada
cd backend
npm install                    # solo la primera vez
npm test
```

Resultado actual: **40 tests, 4 ficheros, todos en verde.**

| Fichero | Qué comprueba |
|---|---|
| `tests/normalizers.test.ts` | Fechas en todos los formatos del CSV, fechas imposibles (31/09), importes (`1.250`, `1.875,60`, `640.5`, `980,40 €`), IVA, CIF, email, país, comercial, cálculo de IVA y total. |
| `tests/logica.test.ts` | Detección de cambios para el histórico (sin cambios → nada), suma exacta de la facturación, validaciones de cliente y contactos. |
| `tests/importacion.test.ts` | Importa el CSV real: 7 clientes, 8 contactos, 14 facturas, 1 duplicado, 2 rechazadas; fila sin CIF; repetir la importación no duplica; una fila mala no detiene el resto. |
| `tests/api.test.ts` | 401 sin sesión, login/logout y cookie HttpOnly, paginación, búsqueda (empresa, contacto, CIF, email), filtros, ficha, alta, CIF duplicado (409), validación (400), histórico con usuario y valores, no registrar si no cambia nada, transacción (si falla no se guarda nada), borrado lógico. |

Para usar otra base de datos de tests: variable `TEST_DATABASE_URL`. Por seguridad, los tests se niegan a vaciar una base de datos cuyo nombre no contenga `test`.

Comprobaciones de compilación: `cd backend && npm run build` y `cd frontend && npm run build`.

## 9. Cómo probar la API

- **[`api/clientes.http`](api/clientes.http)**: colección de peticiones para la extensión *REST Client* de VS Code o el cliente HTTP de JetBrains. Empieza por el login; la cookie se reutiliza en las siguientes.
- **[`api/ejemplos-curl.md`](api/ejemplos-curl.md)**: los mismos ejemplos con curl.

### Endpoints

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| POST | `/api/auth/login` | Inicia sesión `{ email, password }` y devuelve la cookie `sid` | 200, 400, 401, 429 |
| POST | `/api/auth/logout` | Cierra la sesión | 204 |
| GET | `/api/auth/me` | Usuario de la sesión actual | 200, 401 |
| GET | `/api/clientes` | Listado paginado. Parámetros: `q` (empresa, contacto, CIF o email), `estado`, `pais`, `comercial`, `page`, `pageSize` (máx. 100) | 200, 400, 401 |
| GET | `/api/clientes/:id` | Cliente con contactos, facturas, `facturacionAcumulada` y `actualizadoEn` | 200, 400, 401, 404 |
| POST | `/api/clientes` | Crear cliente (con contactos opcionales) | 201, 400, 401, 409 |
| PUT | `/api/clientes/:id` | Actualizar cliente y contactos | 200, 400, 401, 404, 409 |
| DELETE | `/api/clientes/:id` | Borrado lógico | 204, 401, 404 |
| GET | `/api/clientes/:id/historico` | Histórico de cambios (más reciente primero) | 200, 401, 404 |
| GET | `/api/clientes/filtros` | Países y comerciales existentes (para los desplegables) | 200, 401 |
| GET | `/api/clientes/resumen` | Total de clientes, activos y facturación total | 200, 401 |
| GET | `/api/health` | Comprobación de estado (público) | 200 |

Los errores siempre tienen la forma `{ "error": "mensaje", "detalles": [{ "campo": "cif", "mensaje": "..." }] }`.

## 10. Base de datos

```
usuarios 1───* sesiones
usuarios 1───* historial_cambios *───1 clientes
                                        clientes 1───* contactos
                                        clientes 1───* facturas
importaciones (independiente: un registro por ejecución del importador)
```

| Tabla | Campos principales | Restricciones |
|---|---|---|
| `clientes` | id, empresa, cif, estado (`Activo`/`Inactivo`), direccion, cp, ciudad, pais, comercial, fecha_alta, creado_en, **actualizado_en**, eliminado_en | `cif` UNIQUE; `estado` es un ENUM; índices en estado, país y comercial |
| `contactos` | id, cliente_id, nombre, email, telefono | FK → clientes |
| `facturas` | id, cliente_id, numero, fecha, base_imponible, iva_porcentaje, iva_importe, total | `numero` UNIQUE; importes `DECIMAL(12,2)`; FK → clientes con `ON DELETE RESTRICT` |
| `usuarios` | id, email, nombre, password_hash | `email` UNIQUE |
| `sesiones` | id, token_hash, usuario_id, expira_en | `token_hash` UNIQUE; FK → usuarios |
| `historial_cambios` | id, cliente_id, entidad (`cliente`/`contacto`), registro_id, accion (`CREAR`/`MODIFICAR`/`ELIMINAR`), campo, valor_anterior, valor_nuevo, usuario_id, fecha | FK → clientes y usuarios |
| `importaciones` | id, archivo, hash_archivo, fecha, filas_leidas, clientes_creados, contactos_creados, facturas_creadas, duplicados, rechazadas, incidencias (JSON) | — |

- **Facturación acumulada**: no se guarda; se calcula al consultar con `SUM(base_imponible)` (sin IVA). Así nunca puede quedar desactualizada.
- **Importes**: `DECIMAL(12,2)` en la base de datos y `Prisma.Decimal` en el código: sin errores de coma flotante (`0.1 + 0.2 = 0.30`).
- **Fecha de última modificación**: `actualizado_en`, que Prisma actualiza en cada `UPDATE` del cliente (y que la API actualiza también cuando solo cambian sus contactos).

El esquema completo está en [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) y el SQL generado en `backend/prisma/migrations/`.

## 11. Importación del CSV

Código: [`backend/src/import/`](backend/src/import/) (`normalizers.ts` = limpieza de valores, `csvImporter.ts` = proceso).

### Proceso

1. Se lee el CSV con `csv-parse` (separador `;`, UTF-8, admite comillas).
2. Cada fila se **normaliza** con funciones puras (fáciles de testear).
3. Cada fila se guarda en **su propia transacción**: si una fila falla, solo se pierde esa fila.
4. **Clientes** se identifican por **CIF normalizado**; **facturas** por **número** (UNIQUE en la BD); **contactos** por **email** dentro del cliente (o nombre si no hay email).
5. Lo que ya existe **no se duplica ni se sobrescribe** → la importación se puede repetir.
6. El resumen (contadores + lista de incidencias con su número de línea) se guarda en la tabla `importaciones` y se muestra en el log.

Al arrancar el contenedor se importa solo si **ese mismo fichero** (mismo hash SHA-256) no se había importado. Así, reiniciar no vuelve a crear clientes que un usuario haya borrado. Para forzar una importación manual: `docker compose exec api node dist/src/scripts/importar.js` (o `npm run importar` en local).

### Anomalías encontradas en el CSV y cómo se tratan

| Línea | Problema | Decisión |
|---|---|---|
| 2, 7, 12 | `base_imponible` = `1.250`, `2.300`, `2.150`: el punto es separador de **miles** | Un número con solo puntos en grupos de 3 cifras se interpreta como miles → 1250,00 |
| 4 | `640.5`: el punto es **decimal** | Si tras el punto no hay exactamente 3 cifras, es decimal → 640,50 |
| 3, 5, 13 | `1.875,60`, `3.420,00`: formato español | La coma es el decimal y los puntos se eliminan |
| 11 | `980,40 €`: con símbolo de moneda | Se elimina `€` y espacios |
| 3, 11, 13 | IVA `21` o `0` sin `%` | Se acepta con o sin `%` |
| 4, 5, 10 | Fechas `5/3/25`, `12-06-2025`, `2025-01-14` | Se aceptan `d/m/aa`, `dd-mm-aaaa`, `aaaa-mm-dd`. Siempre **día/mes** (España). Año de 2 cifras → 20xx |
| 9 | Factura `F-2026-0108` con fecha **`31/09/2026`** (no existe) | **Factura rechazada** (no se inventa la fecha). El cliente sí se mantiene |
| 15 | Factura `F-2026-0113` **sin base imponible** | **Factura rechazada** (no se inventa el importe) |
| 18 | Factura `F-2026-0115` **repetida** (fila idéntica a la 17) | Se ignora y se cuenta como duplicado |
| 10 | `CONSTRUCCIONES EBRO, S.L.`, CIF `b-50123456`, `ZARAGOZA`, `ESPAÑA`, `elena sanz`, `ACTIVO` | Mismo cliente (CIF normalizado `B50123456`). Se conservan los datos de la primera aparición. **Pablo Ruiz** se añade como segundo contacto |
| 11 | Email `" Lucia@ClinicaSonrisa.es"` (espacio y mayúsculas), teléfono `+34915551234` | Emails en minúsculas y sin espacios → mismo contacto que la línea 4. No se duplica |
| 15 | `RAUL@LOGISTICADUERO.ES`, teléfono `+34 983 445 566` | Mismo contacto. Los teléfonos se comparan por dígitos sin prefijo `+34` |
| 16 | `Hotel Mar Blau` **sin CIF** | **Caso ambiguo.** El email del contacto (`toni.ferrer@hotelmarblau.com`) pertenece a *Hotel Mar Blau SA* (A07123987) → se asocia a ese cliente y se registra un aviso. Si un registro sin CIF no puede asociarse por email, se rechaza |
| 5, 8, 9, 10, 13 | Países `Spain`, `ESPAÑA`, `PT`, `Portugal`, `Italy`, `Italia` | Se unifican: España, Portugal, Italia, Francia |
| 10, 11, 13 | Comercial `elena sanz`, `jordi puig`, `Elena  Sanz` (doble espacio) | Espacios colapsados y mayúscula inicial: `Elena Sanz` |
| 14 | `Atelier Lumière SARL` **sin factura** | Se importa el cliente y su contacto; aviso informativo |
| 7, 8, 14 | CIF extranjeros (`IT…`, `PT…`, `FR…`) | Se aceptan: se valida formato genérico (8-15 letras/números), no el algoritmo del CIF español |

### Resultado

```
Filas leídas: 18 · Clientes: 7 · Contactos: 8 · Facturas: 14 · Duplicados: 1 · Rechazadas: 2
Facturación total importada (sin IVA): 17.982,05 €
```

## 12. Decisiones técnicas

Decisiones tomadas porque el enunciado no las especificaba:

- **Arquitectura en capas sencilla**: `routes → controllers → services → Prisma`. Equivale a Controller → Service → DbContext de ASP.NET. Sin repositorios ni inyección de dependencias: no aportan nada en una aplicación de este tamaño.
- **Autenticación con sesiones en BD + cookie HttpOnly** (no JWT). Más simple y más segura para una web: el token no es accesible desde JavaScript, se puede invalidar en el logout y en la tabla solo se guarda su hash SHA-256. `SameSite=Strict` protege frente a CSRF. Límite de 10 intentos de login cada 15 minutos por IP.
- **Sin roles**: todos los usuarios autenticados pueden hacer todo (no se pedía).
- **Eliminación = borrado lógico** (`eliminado_en`). Las facturas son documentos fiscales y el histórico es una auditoría: no deben perderse. El cliente desaparece del listado, de la ficha y de los filtros, pero su histórico sigue consultable por API y se registra la baja. La FK de facturas es `RESTRICT` para impedir borrados físicos accidentales. Consecuencia: no se puede crear otro cliente con el CIF de un cliente eliminado (la API lo explica con un 409).
- **PUT reemplaza el cliente completo**: los campos opcionales que no se envían quedan vacíos. Los contactos se gestionan en el mismo PUT (con `id` = actualizar; sin `id` = crear; ausentes = borrar). Si no se envía `contactos`, no se tocan.
- **Histórico**: una fila por campo modificado. Se registran también altas/bajas de clientes y de contactos (`accion` = CREAR/ELIMINAR). Si una petición no cambia nada, no se escribe nada (ni se cambia la fecha de modificación). El cambio y su histórico van en la **misma transacción**.
- **La importación no genera histórico**: no hay un usuario responsable; su trazabilidad está en la tabla `importaciones`.
- **Contacto principal** = el primer contacto del cliente (el más antiguo).
- **Normalización también en la API**: el CIF se guarda sin guiones ni espacios y en mayúsculas; el país se unifica (`spain` → `España`); los emails en minúsculas. Así los filtros y la detección de duplicados son coherentes.
- **CIF**: validación de formato genérico (8-15 caracteres alfanuméricos) porque hay clientes de Italia, Portugal y Francia.
- **Facturas solo de lectura**: el enunciado pide ver las facturas en la ficha, no gestionarlas. Solo entran por la importación.
- **nginx como proxy** de `/api`: web y API comparten origen, sin configurar CORS.
- **Puertos por defecto poco habituales** (8085 y 55432) para reducir conflictos con otros proyectos en el equipo del evaluador.
- **Panel de indicadores** (total, activos, facturación): opcional, se añadió porque era muy pequeño (un endpoint con 3 consultas).

## 13. Problemas encontrados y soluciones

| Problema | Solución |
|---|---|
| `1.250` (miles) frente a `640.5` (decimal): mismo símbolo, distinto significado | Regla explícita (grupos de 3 cifras = miles) documentada y cubierta por tests |
| Fecha imposible `31/09/2026`: `new Date` de JavaScript la convierte silenciosamente en 01/10 | Se comprueba que día, mes y año no cambian tras crear la fecha |
| Fila sin CIF | Asociación por email del contacto, con aviso; si no es posible, se rechaza |
| Reiniciar los contenedores no debe reimportar | Hash del fichero guardado en `importaciones`; además la importación es idempotente |
| `prisma migrate reset` (usado inicialmente para preparar la BD de tests) está bloqueado por Prisma cuando lo ejecuta un agente de IA, porque borra datos | Se sustituyó por `prisma migrate deploy` (no destructivo) + `TRUNCATE` protegido para que solo actúe sobre una BD cuyo nombre contenga `test` |
| `csv-parse` 7 solo publica `csv-parse/sync` mediante `exports` | `moduleResolution: node16` en el `tsconfig` del backend |
| Puertos 5433 y 8080 ocupados en el equipo de desarrollo | Puertos por defecto 55432 y 8085, configurables |
| Ficheros con finales de línea CRLF en Windows | `.gitattributes` fuerza LF (los contenedores son Linux) |
| Vulnerabilidades de `npm audit` en versiones iniciales de zod, csv-parse y express-rate-limit | Actualizadas a versiones corregidas |

## 14. Limitaciones conocidas

- **`npm audit` en el backend** avisa de una vulnerabilidad *high* en `deepmerge-ts`, dependencia del **CLI** de Prisma 6 (`@prisma/config`). Afecta a la lectura de ficheros de configuración del propio CLI, no a la API en ejecución. La única corrección es pasar a Prisma 7 (cambio mayor); se dejó para más adelante.
- La búsqueda no ignora tildes: `Lucia` encuentra el email `lucia@…`, pero no el nombre `Lucía`. (Se resolvería con la extensión `unaccent` de PostgreSQL.)
- No hay gestión de usuarios desde la web: solo el usuario de demostración, configurado por variables de entorno.
- Las facturas no se pueden crear ni editar desde la aplicación (no se pedía).
- No se puede reactivar un cliente eliminado desde la web (solo en la BD poniendo `eliminado_en = NULL`).
- Si dos usuarios editan el mismo cliente a la vez, gana el último en guardar (no hay control de concurrencia optimista).
- La interfaz no tiene tests automáticos; se ha comprobado que compila y que todas las llamadas que hace a la API funcionan, pero **la navegación y los formularios no se han probado de forma automatizada en un navegador** (ver `docs/USO_IA.md`).
- Los tests necesitan el PostgreSQL de Docker arrancado.

## 15. Mejoras futuras

1. Pasar a Prisma 7 para eliminar el aviso de `npm audit`.
2. Tests end-to-end de la interfaz (Playwright) y tests de componentes (React Testing Library).
3. Búsqueda sin tildes (`unaccent`) y ordenación por columnas en la tabla.
4. Gestión de usuarios y roles (p. ej. solo administración puede eliminar).
5. Control de concurrencia (comparar `actualizado_en` antes de guardar).
6. Alta y edición de facturas, y exportación del listado a CSV/Excel.
7. Papelera para restaurar clientes eliminados.
8. Subir CSV desde la web y ver el informe de importación.
9. CI (GitHub Actions) que ejecute build y tests en cada push.
10. Logs estructurados y despliegue con HTTPS (`COOKIE_SECURE=true`).
