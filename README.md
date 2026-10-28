# Gestión de Clientes

Aplicación web interna para gestionar clientes y sus facturas, que sustituye a un Excel compartido. Importa los datos antiguos (`clientes_antiguos.csv`) a PostgreSQL limpiando duplicados y formatos, los expone en una **API REST protegida** y permite gestionarlos desde una **web en español** con **histórico de modificaciones**.

```bash
docker compose up
```

Web: **http://localhost:8085** · Usuario: `demo@empresa.local` · Contraseña: `Demo1234!` (solo desarrollo local, ver [Credenciales](#credenciales-de-demostración)).

## Funcionalidades

- **Importación del CSV** con normalización de fechas e importes, detección de clientes y facturas duplicados y registro de incidencias. Se puede repetir sin duplicar datos.
- **Listado de clientes** con búsqueda (empresa, contacto, CIF o email), filtros (estado, país, comercial), paginación y facturación acumulada.
- **Ficha del cliente**: datos generales, contactos, facturas (base, IVA y total), facturación acumulada sin IVA e histórico de cambios.
- **Alta, edición y borrado** de clientes y sus contactos, con validación y confirmación.
- **Histórico**: cada cambio en un cliente o contacto guarda campo, valor anterior, valor nuevo, fecha y usuario.
- **Autenticación** por sesión con cookie HttpOnly. Toda la API de clientes requiere sesión.

## Tecnologías

| Capa | Tecnología |
|---|---|
| API | Node.js 22, TypeScript, Express 5, Zod (validación) |
| Datos | PostgreSQL 17, Prisma 6 (ORM y migraciones) |
| Web | React 19, TypeScript, Vite 7, React Router, lucide-react, CSS propio |
| Seguridad | bcryptjs, helmet, express-rate-limit |
| Infraestructura | Docker Compose: `db` (PostgreSQL), `api` (Express), `web` (nginx con la web compilada y proxy de `/api`) |
| Tests | Vitest + Supertest |

## Puesta en marcha

**Requisitos:** Docker con Docker Compose v2. Para ejecutar los tests en local, además Node.js 22.

```bash
git clone <url-del-repositorio>
cd <carpeta>
docker compose up --build
```

No hace falta crear `.env`: sin él se usan valores de desarrollo local. Al arrancar, la API aplica las migraciones, crea el usuario de demostración e importa el CSV **solo si ese fichero no se había importado antes**, así que reiniciar no duplica ni sobrescribe datos.

| Servicio | Dirección |
|---|---|
| Web | http://localhost:8085 |
| API (a través de nginx) | http://localhost:8085/api |
| PostgreSQL | `localhost:55432`, solo accesible desde el propio equipo |

```bash
docker compose logs -f api    # logs (incluye el resumen de la importación)
docker compose down           # parar (los datos se conservan en el volumen pgdata)
docker compose down -v        # parar y BORRAR la base de datos
```

Si un puerto está ocupado, copia `.env.example` a `.env` y cambia `WEB_PORT` o `POSTGRES_PORT`. Todas las variables están documentadas en [`.env.example`](.env.example).

## Credenciales de demostración

| Email | Contraseña |
|---|---|
| `demo@empresa.local` | `Demo1234!` |

> ⚠️ **Solo para desarrollo local.** Estas credenciales son públicas y existen para que la aplicación se pueda probar tras clonar el repositorio. **No son adecuadas para producción.** En cualquier otro entorno, define en `.env` un `DEMO_USER_PASSWORD` y un `POSTGRES_PASSWORD` propios y activa `COOKIE_SECURE=true` con HTTPS.

**Usar un usuario propio:** en `.env` define `DEMO_USER_EMAIL`, `DEMO_USER_NAME` y `DEMO_USER_PASSWORD` (mínimo 8 caracteres) y ejecuta `docker compose up -d`. El usuario se crea o se actualiza en cada arranque y su contraseña se guarda con bcrypt. Si `DEMO_USER_PASSWORD` está vacía, no se crea ningún usuario.

## Tests

Usan una base de datos propia (`clientes_test`) en el mismo PostgreSQL, sin tocar los datos de la aplicación.

```bash
docker compose up -d db
cd backend
npm install
npm test
```

**50 tests** cubren:
- normalización de fechas e importes;
- importación del CSV real (contadores, duplicados, idempotencia, filas erróneas);
- validaciones;
- autenticación (401 en todos los endpoints, logout, sesión caducada);
- búsqueda, filtros y paginación;
- alta con CIF duplicado;
- histórico (incluida la transacción: si algo falla no se guarda nada);
- borrado lógico.

Por seguridad, los tests se niegan a vaciar una base de datos cuyo nombre no contenga `test`.

Compilación: `npm run build` en `backend/` y en `frontend/`.

## API

Ejemplos listos para usar: [`api/clientes.http`](api/clientes.http) (REST Client de VS Code o JetBrains) y [`api/ejemplos-curl.md`](api/ejemplos-curl.md).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | Iniciar y cerrar sesión (cookie `sid`) |
| GET | `/api/auth/me` | Usuario de la sesión |
| GET | `/api/clientes` | Listado. Parámetros: `q`, `estado`, `pais`, `comercial`, `page`, `pageSize` (máx. 100) |
| GET | `/api/clientes/:id` | Cliente con contactos, facturas, `facturacionAcumulada` y `actualizadoEn` |
| POST | `/api/clientes` | Crear (201; 409 si el CIF ya existe) |
| PUT | `/api/clientes/:id` | Actualizar cliente y contactos |
| DELETE | `/api/clientes/:id` | Borrado lógico (204) |
| GET | `/api/clientes/:id/historico` | Histórico de cambios |
| GET | `/api/clientes/filtros` · `/api/clientes/resumen` | Opciones de filtros e indicadores del panel |

- **Errores:** siempre tienen la forma `{ "error": "...", "detalles": [{ "campo": "...", "mensaje": "..." }] }`.
- **Códigos:** 400 (datos no válidos), 401 (sin sesión), 404, 409 (conflicto) y 429 (demasiados intentos de login).

## Estructura

```
├── docker-compose.yml, .env.example
├── api/                    # Ejemplos de peticiones
├── docs/USO_IA.md          # Uso de inteligencia artificial
├── backend/
│   ├── data/               # CSV que se importa al arrancar
│   ├── prisma/             # schema.prisma y migraciones
│   ├── src/
│   │   ├── routes/         # URL → controlador
│   │   ├── controllers/    # Entrada/salida HTTP
│   │   ├── services/       # Lógica de negocio, consultas e histórico
│   │   ├── validation/     # Esquemas Zod
│   │   ├── middleware/     # Autenticación y gestión de errores
│   │   ├── import/         # Normalizadores e importador del CSV
│   │   └── scripts/        # seed (arranque) e importación manual
│   └── tests/
└── frontend/
    ├── nginx.conf
    └── src/
        ├── api/            # Llamadas a la API
        ├── context/        # Sesión y avisos
        ├── components/
        └── pages/          # Login, listado, ficha, formulario
```

## Base de datos

| Tabla | Contenido |
|---|---|
| `clientes` | Empresa, CIF, estado, dirección, ciudad, país, comercial, fechas de alta y de última modificación, `eliminado_en` |
| `contactos` | Nombre, email y teléfono de cada cliente |
| `facturas` | Número, fecha, base imponible, % IVA, cuota de IVA y total |
| `usuarios`, `sesiones` | Credenciales (hash bcrypt) y sesiones (hash SHA-256 del token) |
| `historial_cambios` | Entidad y registro modificados, acción, campo, valor anterior, valor nuevo, usuario y fecha |
| `importaciones` | Resumen de cada importación, con sus incidencias |

- **Restricciones:** `cif`, `numero` de factura y `email` de usuario son UNIQUE.
- **Importes:** `DECIMAL(12,2)`.
- **Claves foráneas:** facturas e histórico usan `ON DELETE RESTRICT`.
- **Facturación acumulada:** es la suma de bases imponibles sin IVA y se calcula al consultar; no se guarda, para que nunca quede desactualizada.

## Importación del CSV

Código en [`backend/src/import/`](backend/src/import/). Cada fila se procesa en su propia transacción, así que una fila errónea no impide importar el resto. La importación nunca inventa datos que falten.

| Anomalía | Decisión |
|---|---|
| Importes `1.250` / `1.875,60` / `640.5` / `980,40 €` | Coma decimal y punto de miles (formato español). Solo puntos en grupos de 3 cifras = miles. Se quita `€` |
| Fechas `14/01/2025`, `5/3/25`, `12-06-2025`, `2025-01-14` | Se aceptan todas, siempre como día/mes |
| Factura `F-2026-0108` con fecha `31/09/2026` | Factura rechazada (la fecha no existe) |
| Factura `F-2026-0113` sin base imponible | Factura rechazada |
| Factura `F-2026-0115` repetida | Se ignora (duplicado) |
| `CONSTRUCCIONES EBRO, S.L.` con CIF `b-50123456` | Mismo cliente: se agrupa por CIF normalizado y se conservan los datos de la primera aparición |
| Emails con mayúsculas o espacios, teléfonos con o sin `+34` | Se normalizan: el contacto no se duplica |
| Fila "Hotel Mar Blau" sin CIF | Se asocia a Hotel Mar Blau SA porque el email del contacto ya es suyo; si no hubiera coincidencia, se rechazaría |
| Países `Spain`, `ESPAÑA`, `PT`, `Italy`; comerciales en minúsculas | Se unifican (España, Portugal, Italia; `Elena Sanz`) |
| Cliente sin facturas, CIF extranjeros | Se importan |

**Resultado:** 18 filas → 7 clientes, 8 contactos, 14 facturas, 1 duplicado y 2 facturas rechazadas. Facturación total: 17.982,05 €.

Importación manual (es idempotente): `docker compose exec api node dist/src/scripts/importar.js`.

## Decisiones técnicas

- **Capas sencillas:** `routes → controllers → services → Prisma`. Sin repositorios ni inyección de dependencias, que no aportan nada a este tamaño de proyecto.
- **Sesiones en base de datos con cookie `HttpOnly` y `SameSite=Strict`** en lugar de JWT: el token no es accesible desde JavaScript, el logout lo invalida de verdad y en la base de datos solo se guarda su hash. El login está limitado a 10 intentos cada 15 minutos por IP.
- **Borrado lógico** (`eliminado_en`): las facturas son documentos fiscales y el histórico es una auditoría, así que se conservan. El cliente eliminado desaparece de la aplicación y su CIF queda reservado (409).
- **PUT reemplaza el cliente completo.** En los contactos: con `id` se actualiza, sin `id` se crea y si no aparece se borra. Si no se envía `contactos`, no se tocan.
- **Histórico:**
  - una fila por campo modificado, en la misma transacción que el cambio;
  - si nada cambia, no se escribe nada;
  - también se registran las altas y bajas de clientes y contactos;
  - la importación no genera histórico porque no hay un usuario responsable; queda registrada en `importaciones`.
- **Validación estricta de fechas:** se comprueba que la fecha exista, con la misma función que usa el importador. `Date.parse` no sirve porque convierte `2026-09-31` en el 1 de octubre.
- **CIF:** validación de formato genérico (8-15 caracteres alfanuméricos), porque hay clientes de Italia, Portugal y Francia.
- **Facturas de solo lectura:** el enunciado pide mostrarlas, no gestionarlas.
- **nginx como proxy de `/api`:** web y API comparten origen, así que no hace falta configurar CORS.
- **Prisma 6 y no 7:** la versión 7 exige *driver adapters* y configuración extra.
- **Puertos 8085 y 55432:** se eligieron para reducir conflictos con otros proyectos.

## Limitaciones conocidas

- **`npm audit`** (frontend: 0 vulnerabilidades). Los avisos del backend solo se corrigen con versiones mayores:
  - **`deepmerge-ts`** (gravedad alta), dependencia del CLI de Prisma 6. Está en la imagen de producción, pero solo se usa en `prisma migrate deploy` al arrancar y nunca con datos de una petición. Riesgo bajo.
  - **`vitest`, `tinypool` y `@vitest/mocker`** (crítica/moderada). Son herramientas de test que no están en la imagen Docker. Sin riesgo en ejecución.
- **Búsqueda:** no ignora tildes (`Lucia` no encuentra `Lucía`).
- **Usuarios:** no hay gestión de usuarios ni roles; el usuario de acceso se configura por variables de entorno.
- **Facturas y clientes eliminados:** las facturas no se editan desde la aplicación, y un cliente eliminado no se puede restaurar desde la web.
- **Concurrencia:** no hay control de concurrencia; si dos personas editan el mismo cliente, gana la última en guardar.
- **Pruebas de la interfaz:** no hay tests automáticos; la interfaz se ha probado manualmente (ver [`docs/USO_IA.md`](docs/USO_IA.md)).

## Mejoras futuras

1. Prisma 7 y Vitest 5 para eliminar los avisos de `npm audit`.
2. Tests end-to-end de la interfaz (Playwright).
3. Búsqueda sin tildes (`unaccent`) y ordenación por columnas.
4. Gestión de usuarios y roles, y control de concurrencia con `actualizado_en`.
5. Alta y edición de facturas, exportación a Excel y papelera para restaurar clientes.
6. CI con GitHub Actions y despliegue con HTTPS.

## Uso de inteligencia artificial

El proyecto se ha desarrollado con ayuda de **Claude Code**. En [`docs/USO_IA.md`](docs/USO_IA.md) se explica cómo: prompts, fases, verificaciones, correcciones y limitaciones.
