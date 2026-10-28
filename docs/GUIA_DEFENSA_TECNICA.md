# Guía de defensa técnica

> Objetivo: que entiendas cada parte del proyecto lo bastante bien como para explicarla y modificarla delante de dos desarrolladores. Está escrita pensando en alguien que viene de **C#, ASP.NET Core, Entity Framework y SQL Server**, así que verás muchas comparaciones con ese mundo.
>
> **Cómo estudiarla:** lee la Parte 1 y la Parte 10 (chuleta) primero. Después recorre las Partes 3, 4 y 7 **con el código abierto al lado**. Por último, haz al menos dos ejercicios de la Parte 9 tú solo.

---

## Índice

1. [Explicación general](#parte-1-explicación-general)
2. [Estructura](#parte-2-estructura)
3. [Backend](#parte-3-backend)
4. [Base de datos](#parte-4-base-de-datos)
5. [Frontend](#parte-5-frontend)
6. [Docker](#parte-6-docker)
7. [Histórico paso a paso](#parte-7-histórico-paso-a-paso)
8. [Preguntas de entrevista](#parte-8-preguntas-de-entrevista)
9. [Modificaciones en directo](#parte-9-modificaciones-en-directo)
10. [Chuleta de una página](#parte-10-chuleta-de-una-página)

---

## Parte 1. Explicación general

### Qué problema resuelve

La empresa llevaba los clientes y sus facturas en un **Excel compartido** que rellenaban varias personas a mano. Eso provoca: datos duplicados, formatos distintos (fechas, importes), errores, y ninguna forma de saber quién cambió qué.

La aplicación:

1. **Importa** ese Excel (exportado a CSV) a una base de datos PostgreSQL, **limpiando** los datos.
2. Ofrece una **API REST protegida** para consultar y modificar clientes.
3. Ofrece una **web** en español para usarla sin conocimientos técnicos.
4. Guarda un **histórico** de cada cambio: qué campo, valor anterior, valor nuevo, cuándo y quién.

### Cómo funciona (visión de 30 segundos)

```
 Navegador ──► nginx (contenedor "web", puerto 8085)
                 │  /           → ficheros de React (HTML, JS, CSS)
                 │  /api/...    → reenvía a la API
                 ▼
             API Express (contenedor "api", puerto 3000 interno)
                 │  routes → controllers → services → Prisma
                 ▼
             PostgreSQL (contenedor "db", volumen pgdata)
```

### Tecnologías y por qué

| Tecnología | Para qué | Equivalente en .NET | Por qué esta |
|---|---|---|---|
| Node.js + TypeScript | Lenguaje del backend | C# / .NET runtime | Lo pide la prueba. TypeScript añade tipos, como C#. |
| Express | Framework web | ASP.NET Core (Minimal APIs / Controllers) | El más conocido y sencillo. |
| Prisma | ORM | Entity Framework Core | Esquema en un fichero, migraciones, consultas tipadas. |
| Zod | Validación | DataAnnotations / FluentValidation | Valida y además transforma (normaliza) los datos. |
| PostgreSQL | Base de datos | SQL Server | Lo pide la prueba. |
| React + Vite | Web | Blazor / Razor | Estándar del mercado. Vite compila muy rápido. |
| nginx | Servidor web / proxy | IIS / Kestrel detrás de un proxy | Sirve la web y redirige `/api` a la API. |
| Docker Compose | Arranque de todo | — | Un solo comando: `docker compose up`. |
| Vitest + Supertest | Tests | xUnit + WebApplicationFactory | Rápido; Supertest prueba la API sin abrir puerto. |

### Cómo se comunican los componentes

1. El navegador pide `http://localhost:8085/clientes` → nginx devuelve `index.html` + el JavaScript de React.
2. React se ejecuta en el navegador y pide datos: `fetch('/api/clientes?page=1')`.
3. Como la URL empieza por `/api/`, nginx la reenvía a `http://api:3000/api/clientes` (`api` es el nombre del servicio en Docker Compose, que funciona como nombre DNS).
4. Express comprueba la cookie de sesión, consulta PostgreSQL con Prisma y responde JSON.
5. React pinta la tabla con ese JSON.

**Clave:** navegador, web y API están en el **mismo origen** (`localhost:8085`). Por eso la cookie de sesión viaja sola y no hace falta configurar CORS.

---

## Parte 2. Estructura

```
.
├── docker-compose.yml   ← orquesta los 3 contenedores
├── .env.example         ← variables documentadas
├── api/                 ← ejemplos para probar la API
├── docs/                ← esta guía y el uso de IA
├── backend/             ← API (Node + Express + Prisma)
└── frontend/            ← web (React + Vite) + nginx
```

### Backend (`backend/`)

| Fichero / carpeta | Responsabilidad | Equivalente .NET |
|---|---|---|
| `prisma/schema.prisma` | Define tablas, columnas, relaciones y restricciones | Clases entidad + `DbContext.OnModelCreating` |
| `prisma/migrations/` | SQL generado para crear/alterar tablas | Carpeta `Migrations` de EF |
| `src/server.ts` | Arranca el servidor en el puerto 3000 | `app.Run()` en `Program.cs` |
| `src/app.ts` | Crea la app: middlewares (helmet, json, cookies), rutas y gestor de errores | La parte de `Program.cs` con `app.Use...` y `app.MapControllers()` |
| `src/config.ts` | Lee variables de entorno | `appsettings.json` + `IConfiguration` |
| `src/db.ts` | Instancia única de `PrismaClient` | `DbContext` registrado en DI |
| `src/routes/` | Asocia URL + método HTTP a un controlador | Atributos `[HttpGet("...")]` / `[Route]` |
| `src/controllers/` | Lee la petición, valida, llama al servicio, responde | Controllers |
| `src/services/` | Lógica de negocio y consultas | Services |
| `src/validation/cliente.schema.ts` | Esquemas Zod: qué datos son válidos | DTOs con DataAnnotations |
| `src/middleware/auth.ts` | `requireAuth`: exige sesión | `[Authorize]` |
| `src/middleware/errorHandler.ts` | Convierte cualquier error en una respuesta JSON | Middleware de excepciones / `ProblemDetails` |
| `src/import/normalizers.ts` | Funciones puras para limpiar valores del CSV | Clase estática de utilidades |
| `src/import/csvImporter.ts` | Proceso de importación | Servicio de importación |
| `src/import/ejecutarImportacion.ts` | Lee el fichero, importa, guarda el resumen | — |
| `src/scripts/seed.ts` | Al arrancar: usuario demo + importación inicial | `DbInitializer` / *seeding* |
| `src/scripts/importar.ts` | Importación manual | Herramienta de consola |
| `src/utils/HttpError.ts` | Error con código HTTP | Excepción personalizada |
| `tests/` | Tests | Proyecto de tests xUnit |

### Frontend (`frontend/`)

| Fichero / carpeta | Responsabilidad |
|---|---|
| `src/main.tsx` | Punto de entrada: monta React con el router y los contextos |
| `src/App.tsx` | Rutas (`/login`, `/clientes`, `/clientes/:id`…) y protección de rutas privadas |
| `src/api/http.ts` | Envoltorio de `fetch`: gestiona errores y el 401 |
| `src/api/clientes.ts` | Una función por endpoint (`clientesApi.listar`, `crear`…) |
| `src/context/AuthContext.tsx` | Quién ha iniciado sesión; `login()` y `logout()` |
| `src/context/ToastContext.tsx` | Mensajes emergentes de éxito/error |
| `src/pages/` | Una página por pantalla: `LoginPage`, `ClientesPage`, `ClienteDetallePage`, `ClienteFormPage` |
| `src/components/` | Piezas reutilizables: `Layout`, `ConfirmDialog`, `EstadoBadge`, `Paginacion`… |
| `src/utils/formato.ts` | Formato de euros y fechas en español |
| `src/types.ts` | Tipos de los datos de la API |
| `src/styles.css` | Todos los estilos |
| `nginx.conf` | Configuración del servidor web en Docker |

---

## Parte 3. Backend

### Qué es Express

Una librería mínima para crear servidores HTTP en Node. Tú registras **funciones** que se ejecutan cuando llega una petición:

```ts
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok' });
});
```

- `req` (request) = la petición: `req.params`, `req.query`, `req.body`, `req.cookies`.
- `res` (response) = la respuesta: `res.status(201).json(...)`.

En ASP.NET Core sería un `MapGet("/api/health", () => Results.Ok(...))`.

### Qué es un middleware

Una función que se ejecuta **antes** (o después) de las rutas, en cadena. Recibe `(req, res, next)` y llama a `next()` para pasar al siguiente. En `src/app.ts`:

```ts
app.use(helmet());            // 1. añade cabeceras de seguridad
app.use(express.json());      // 2. convierte el cuerpo JSON en req.body
app.use(cookieParser());      // 3. convierte las cookies en req.cookies
app.use('/api/auth', authRouter);
app.use('/api/clientes', clientesRouter);
app.use(rutaNoEncontrada);    // 4. si ninguna ruta respondió → 404
app.use(errorHandler);        // 5. si algo lanzó un error → respuesta de error
```

Es exactamente el *pipeline* de middlewares de ASP.NET Core (`app.UseAuthentication()`, etc.). **El orden importa.**

### Qué es una API REST

Una forma de diseñar APIs HTTP donde:

- Las URL representan **recursos** (`/api/clientes`, `/api/clientes/5`).
- El **método HTTP** indica la acción: `GET` leer, `POST` crear, `PUT` reemplazar, `DELETE` borrar.
- Los **códigos de estado** indican el resultado: `200` OK, `201` creado, `204` sin contenido, `400` datos mal, `401` sin sesión, `404` no existe, `409` conflicto, `500` error interno.
- Sin estado en el servidor entre peticiones (la sesión se identifica en cada petición con la cookie).

### Cómo funcionan las rutas

`src/routes/clientes.routes.ts`:

```ts
clientesRouter.use(requireAuth);                 // todas las rutas exigen sesión
clientesRouter.get('/filtros', clientes.filtros);
clientesRouter.get('/resumen', clientes.resumen);
clientesRouter.get('/', clientes.listar);        // GET  /api/clientes
clientesRouter.post('/', clientes.crear);        // POST /api/clientes
clientesRouter.get('/:id', clientes.obtener);    // GET  /api/clientes/5
...
```

- `:id` es un **parámetro de ruta** → `req.params.id`.
- `/filtros` y `/resumen` van **antes** de `/:id`; si no, Express pensaría que "filtros" es un id.

### Qué son los controladores

`src/controllers/clientes.controller.ts`. Hacen **solo** tres cosas: leer y validar la entrada, llamar al servicio y devolver la respuesta HTTP.

```ts
export async function crear(req: Request, res: Response) {
  const datos = clienteSchema.parse(req.body);                       // 1. validar
  const cliente = await clientesService.crearCliente(datos, req.usuario!.id); // 2. servicio
  res.status(201).location(`/api/clientes/${cliente.id}`).json(cliente);      // 3. responder
}
```

No tienen `try/catch`: **Express 5** captura automáticamente los errores de funciones `async` y los manda al `errorHandler`.

### Qué son los servicios

`src/services/`. Contienen la **lógica de negocio** y el acceso a datos. No saben nada de HTTP (no usan `req` ni `res`), así que se pueden reutilizar y probar.

- `clientes.service.ts`: `listarClientes`, `obtenerCliente`, `crearCliente`, `actualizarCliente`, `eliminarCliente`, `obtenerHistorial`, `opcionesFiltro`, `resumen`, `sumarBases`.
- `auth.service.ts`: `login`, `logout`, `usuarioDeSesion`, `hashPassword`.
- `historial.service.ts`: `calcularCambios`, `valorComoTexto`, `historialDeCliente`.

Cuando un servicio detecta un problema, **lanza** un error: `throw noEncontrado('Cliente no encontrado')` o `throw new HttpError(409, 'Ya existe…')`.

### Cómo se gestionan los errores

Todo error acaba en `src/middleware/errorHandler.ts`, que decide la respuesta:

| Tipo de error | Respuesta |
|---|---|
| `ZodError` (validación) | `400` + lista de `{ campo, mensaje }` |
| `HttpError` (lanzado por nuestro código) | Su código (`404`, `409`…) + mensaje |
| Prisma `P2002` (violación de UNIQUE) | `409` |
| JSON mal formado | `400` |
| Cualquier otro | `500` "Error interno del servidor" (el detalle va al log, **nunca** al cliente) |

Ventaja: los controladores y servicios no repiten código de errores; está en un solo sitio. Es como un `UseExceptionHandler` de ASP.NET.

### Cómo se validan los datos

Con **Zod**, en `src/validation/cliente.schema.ts`. Un esquema describe qué es válido:

```ts
export const clienteSchema = z.object({
  empresa: z.string().trim().min(1, 'La empresa es obligatoria').max(200),
  cif: z.string()
    .transform((v) => normalizarCif(v) ?? '')                       // "b-50123456" → "B50123456"
    .pipe(z.string().regex(/^[A-Z0-9]{8,15}$/, 'CIF no válido')),
  estado: z.enum(['Activo', 'Inactivo']),
  ...
});
```

- `clienteSchema.parse(req.body)` devuelve los datos **ya limpios** o lanza `ZodError`.
- Zod no solo valida, también **transforma**: recorta espacios, normaliza el CIF y el país, convierte `""` en `null`.
- `z.infer<typeof clienteSchema>` genera el tipo TypeScript (`ClienteInput`) a partir del esquema: no hay que escribir el DTO dos veces.
- El frontend también valida (`validar()` en `ClienteFormPage.tsx`) para dar respuesta inmediata, pero **la validación que cuenta es la del servidor**: nunca hay que fiarse del navegador.

### Cómo funciona la autenticación

Ficheros: `services/auth.service.ts`, `controllers/auth.controller.ts`, `middleware/auth.ts`.

**Login** (`POST /api/auth/login`):

1. Se busca el usuario por email.
2. `bcrypt.compare(password, usuario.passwordHash)` comprueba la contraseña. bcrypt es un hash **lento a propósito** y con *salt*: aunque roben la BD, no se pueden recuperar las contraseñas.
3. Si el email no existe, se compara igualmente contra un hash ficticio (`HASH_FICTICIO`) para que la respuesta tarde lo mismo y no se pueda averiguar qué emails existen.
4. Se genera un token aleatorio de 32 bytes (`randomBytes`).
5. En la tabla `sesiones` se guarda **el hash SHA-256 del token**, no el token.
6. El token se envía en una cookie `sid` con:
   - `HttpOnly`: JavaScript no puede leerla → si hubiera un XSS, no podría robarla.
   - `SameSite=Strict`: el navegador no la envía desde otras webs → protección CSRF.
   - `Secure` (si `COOKIE_SECURE=true`): solo por HTTPS.
   - `Expires`: caduca a las `SESSION_HOURS` horas.

**En cada petición** (`requireAuth`):

1. Lee `req.cookies.sid`.
2. Calcula su hash y busca la sesión. Si no existe o ha caducado → `401`.
3. Guarda el usuario en `req.usuario` para que los controladores sepan quién hace el cambio (necesario para el histórico).

**Logout**: borra la sesión de la tabla y la cookie. A partir de ahí el token no vale.

**Límite de intentos**: `express-rate-limit` permite 10 logins cada 15 minutos por IP (en `routes/auth.routes.ts`).

> **¿Por qué no JWT?** Un JWT no se puede invalidar antes de que caduque (el logout no lo anula sin una lista negra) y suele guardarse en `localStorage`, accesible a JavaScript. Para una web propia, sesión + cookie HttpOnly es más simple y más segura.

**Comparación ASP.NET:** es lo mismo que `AddAuthentication().AddCookie()` + `[Authorize]`, pero hecho a mano en ~60 líneas, lo que permite explicarlo entero.

---

## Parte 4. Base de datos

### Cómo se relacionan las tablas

```
usuarios 1───* sesiones
usuarios 1───* historial_cambios *───1 clientes
                                        clientes 1───* contactos
                                        clientes 1───* facturas
importaciones   (sin relaciones: resumen de cada importación)
```

- Un **cliente** tiene muchos **contactos** y muchas **facturas** (1:N).
- Cada **entrada del histórico** pertenece a un cliente y a un usuario (quién hizo el cambio).
- Un **usuario** puede tener varias **sesiones** abiertas (p. ej. dos navegadores).

### Claves primarias y foráneas

- **Clave primaria (PK)**: identifica una fila de forma única. Aquí todas son `id SERIAL` (entero autoincremental), como `IDENTITY(1,1)` en SQL Server. En Prisma: `id Int @id @default(autoincrement())`.
- **Clave foránea (FK)**: columna que apunta a la PK de otra tabla y garantiza que exista. `facturas.cliente_id → clientes.id`: no puede haber una factura de un cliente que no existe.
- **Qué pasa al borrar** (`onDelete`):
  - `contactos`: `Cascade` (si se borrara físicamente el cliente, se borran sus contactos).
  - `facturas` e `historial_cambios`: `Restrict` (la BD **impide** borrar físicamente un cliente con facturas o histórico). Es una red de seguridad del borrado lógico.
- **UNIQUE**: `clientes.cif`, `facturas.numero`, `usuarios.email`, `sesiones.token_hash`. Es la **garantía final** contra duplicados, aunque el código falle.

### Cómo funciona PostgreSQL (comparado con SQL Server)

| Concepto | PostgreSQL | SQL Server |
|---|---|---|
| Autoincremento | `SERIAL` / `GENERATED AS IDENTITY` | `IDENTITY(1,1)` |
| Texto | `VARCHAR(n)`, `TEXT` | `NVARCHAR(n)`, `NVARCHAR(MAX)` |
| Decimales exactos | `DECIMAL(12,2)` / `NUMERIC` | `DECIMAL(12,2)` |
| Fecha sin hora | `DATE` | `DATE` |
| Fecha y hora | `TIMESTAMP(3)` | `DATETIME2` |
| Enumerados | `CREATE TYPE ... AS ENUM` (nativo) | No hay; se usa `CHECK` o tabla |
| JSON | `JSONB` (indexable) | `NVARCHAR` + funciones JSON |
| Búsqueda sin mayúsculas | `ILIKE` | Depende de la *collation* (normalmente ya es insensible) |
| Paginación | `LIMIT ... OFFSET ...` | `OFFSET ... FETCH NEXT ...` |
| Identificadores | En minúsculas (`snake_case`) | Normalmente `PascalCase` |

Detalle importante: en PostgreSQL las comparaciones de texto **distinguen mayúsculas** por defecto; por eso Prisma usa `mode: 'insensitive'` (que genera `ILIKE`).

### Qué hace Prisma

Prisma es el ORM (como Entity Framework):

1. **`schema.prisma`**: defines los modelos. `@@map("clientes")` y `@map("fecha_alta")` traducen nombres de TypeScript (`fechaAlta`) a nombres de PostgreSQL (`fecha_alta`).
2. **`prisma migrate dev --name x`**: compara el esquema con la BD y genera un fichero SQL en `prisma/migrations/` (como `Add-Migration`).
3. **`prisma migrate deploy`**: aplica las migraciones pendientes (como `Update-Database`). Lo hace el contenedor al arrancar.
4. **`prisma generate`**: genera el cliente tipado. Si escribes `prisma.cliente.findMany({ where: { empresaa: … } })` con una errata, **no compila**.

Ejemplos reales:

```ts
// SELECT ... FROM clientes WHERE id = $1 AND eliminado_en IS NULL
prisma.cliente.findFirst({ where: { id, eliminadoEn: null }, include: { contactos: true } });

// SELECT cliente_id, SUM(base_imponible) FROM facturas WHERE cliente_id IN (...) GROUP BY cliente_id
prisma.factura.groupBy({ by: ['clienteId'], where: { clienteId: { in: ids } }, _sum: { baseImponible: true } });
```

**Consultas seguras:** Prisma siempre usa **parámetros** (`$1`, `$2`), nunca concatena texto. Es imposible hacer inyección SQL con `?q='; DROP TABLE clientes;--`. El único SQL "a mano" del proyecto es el `TRUNCATE` de los tests, que no lleva datos del usuario.

**Transacciones:** `prisma.$transaction(async (tx) => { ... })` — todo lo que se haga con `tx` se confirma junto o se deshace junto. Es el `BeginTransaction()` / `Commit()` de EF.

### Cómo se importan los datos

Código: `src/import/csvImporter.ts` → función `importarCsv(prisma, contenido)`.

1. **Leer**: `leerCsv()` usa `csv-parse` con `delimiter: ';'` y `columns: true` → cada fila es un objeto `{ empresa: '...', cif: '...' }`. Maneja comillas (la fila con `" Lucia@ClinicaSonrisa.es"`).
2. **Normalizar**: `normalizarFila()` aplica las funciones de `normalizers.ts` a cada campo. Es una **función pura** (no toca la BD), por eso es fácil de testear.
3. **Guardar fila a fila**, cada una en **su propia transacción** (`procesarFila`):
   - `resolverCliente`: busca por CIF; si no existe, lo crea (si tiene empresa, estado y fecha de alta válidos). Sin CIF → intenta asociarlo por el email del contacto.
   - `asegurarContacto`: busca el contacto por email dentro del cliente; si no existe, lo crea.
   - Factura: si el número ya existe → duplicado; si tiene datos inválidos → rechazada; si no → se crea.
4. Si una fila lanza un error inesperado, el `catch` la cuenta como rechazada y **sigue con la siguiente**.
5. Devuelve un **resumen** con contadores e incidencias (con número de línea), que `ejecutarImportacion.ts` guarda en la tabla `importaciones`.

**Funciones de normalización** (`src/import/normalizers.ts`):

| Función | Ejemplo |
|---|---|
| `normalizarFecha` | `5/3/25` → 2025-03-05; `31/09/2026` → `null` |
| `normalizarImporte` | `1.250` → `1250.00`; `640.5` → `640.50`; `980,40 €` → `980.40` |
| `normalizarIva` | `21%` / `21` → `21.00` |
| `normalizarCif` | `b-50123456` → `B50123456` |
| `normalizarEmail` | `" Lucia@X.es"` → `lucia@x.es` |
| `normalizarPais` | `Spain`, `ESPAÑA` → `España`; `PT` → `Portugal` |
| `capitalizarPalabras` | `elena  sanz` → `Elena Sanz` |
| `calcularImportesFactura` | base 1875.60, IVA 21 → cuota 393.88, total 2269.48 |

**Truco de la fecha imposible:** `new Date(Date.UTC(2026, 8, 31))` (31 de septiembre) **no da error**: JavaScript lo convierte en 1 de octubre. Por eso `normalizarFecha` comprueba que el día, mes y año resultantes sean los mismos que se pidieron.

### Cómo se evitan los duplicados (tres niveles)

1. **Normalización**: `b-50123456` y `B50123456` se convierten en el mismo CIF antes de comparar.
2. **Comprobación en código**: antes de crear, se busca (`findUnique({ where: { cif } })`, `findUnique({ where: { numero } })`).
3. **Restricción UNIQUE en la BD**: si todo lo anterior fallara, PostgreSQL rechaza el duplicado.

Y para repetir la importación sin problemas:

- La importación es **idempotente**: lo que ya existe se cuenta como duplicado y no se toca.
- Al arrancar el contenedor, `seed.ts` llama a `ejecutarImportacion(..., soloSiEsNuevo = true)`, que calcula el **hash SHA-256 del fichero** y, si ya está en `importaciones`, no hace nada. Así un cliente borrado por un usuario no "resucita" al reiniciar.

### Cómo se calcula la facturación

**Facturación acumulada = suma de las bases imponibles (sin IVA)** de las facturas del cliente.

- **No se guarda** en la tabla de clientes: se calcula al consultar. Si se guardara, habría que mantenerla sincronizada y podría quedar mal.
- En la **ficha**: `sumarBases(cliente.facturas)` en `clientes.service.ts`.
- En el **listado**: una sola consulta `groupBy` para los clientes de la página (evita hacer una consulta por cliente, el famoso problema **N+1**).
- **Precisión**: los importes son `DECIMAL(12,2)` en PostgreSQL y `Prisma.Decimal` en el código. Con `number` de JavaScript, `0.1 + 0.2 = 0.30000000000000004`; con Decimal es `0.30`. El test `sumarBases` lo comprueba.
- La API devuelve los importes como **texto** (`"4175.90"`) para no perder precisión en el JSON; el frontend los formatea con `formatoEuros()` → `4175,90 €`.

---

## Parte 5. Frontend

### Cómo funciona React

React construye la interfaz a partir de **componentes**: funciones que reciben datos y devuelven lo que hay que pintar (JSX, una sintaxis parecida a HTML). Cuando los datos (**estado**) cambian, React vuelve a ejecutar el componente y actualiza solo lo que ha cambiado en la página.

Es una **SPA** (*Single Page Application*): el navegador carga una sola página y React cambia el contenido sin recargar. Las "páginas" son rutas de React Router (`App.tsx`).

### Qué son los componentes

```tsx
export function EstadoBadge({ estado }: { estado: Estado }) {
  return <span className={`badge ${estado === 'Activo' ? 'badge-activo' : 'badge-inactivo'}`}>{estado}</span>;
}
```

Se usa como una etiqueta: `<EstadoBadge estado={c.estado} />`. Lo que va entre llaves son **props** (parámetros). Es parecido a un componente de Blazor o a una vista parcial de Razor.

### Cómo se gestionan los estados

- **`useState`**: estado local de un componente.
  ```tsx
  const [busqueda, setBusqueda] = useState('');
  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
  ```
  Llamar a `setBusqueda` provoca que React vuelva a pintar el componente.
- **`useEffect`**: ejecutar algo cuando cambia un valor (p. ej. cargar datos). En `ClientesPage.tsx`, el listado se recarga cada vez que cambian los parámetros de la URL:
  ```tsx
  useEffect(() => { clientesApi.listar(...).then(setPagina) }, [params.toString(), recargar]);
  ```
- **Contexto (`createContext` + `useContext`)**: estado global sin pasarlo por props. `AuthContext` guarda el usuario conectado; cualquier componente hace `const { usuario, logout } = useAuth()`. Es parecido a un servicio *singleton* inyectado.
- **Estado en la URL**: los filtros del listado se guardan en la URL (`?q=ebro&estado=Activo&page=2`) con `useSearchParams`. Ventaja: al volver atrás desde la ficha, los filtros siguen ahí, y la URL se puede compartir.

### Cómo se llama a la API

Dos capas:

1. `src/api/http.ts` → función `http()`: envoltorio de `fetch` que añade `Content-Type: application/json`, convierte la respuesta en JSON y, si hay error, lanza un `ApiError` con el mensaje y los detalles. Si la respuesta es **401**, emite el evento `sesion-caducada` y `AuthContext` devuelve al usuario al login.
2. `src/api/clientes.ts` → `clientesApi.listar()`, `.crear()`, etc. Los componentes **nunca** usan `fetch` directamente.

La cookie de sesión **no se toca desde JavaScript** (es HttpOnly): el navegador la envía sola.

### Rutas protegidas

`App.tsx`:

```tsx
function RutaPrivada() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando texto="Comprobando sesión…" />;
  return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}
```

Al abrir la web, `AuthContext` llama a `/api/auth/me`. Si hay sesión válida, se muestran las páginas; si no, se redirige a `/login`. **Ojo:** esto es solo comodidad visual; la seguridad real está en la API (aunque alguien manipule el JavaScript, la API responde 401).

### Cómo funcionan los formularios

`src/pages/ClienteFormPage.tsx` sirve para **crear** (`/clientes/nuevo`) y **editar** (`/clientes/:id/editar`): si hay `id` en la URL, carga el cliente y rellena el formulario.

1. Todo el formulario es un único estado `datos` (tipo `ClienteFormData`). Cada input es **controlado**: `value={datos.empresa}` + `onChange`.
2. Los contactos son un array; `anadirContacto` y `quitarContacto` añaden o quitan elementos.
3. Al enviar (`guardar`):
   - `validar(datos)` comprueba en el navegador. Si hay errores, se pintan en rojo y no se envía.
   - Se llama a `clientesApi.crear` o `actualizar`.
   - Éxito → toast "Cliente creado correctamente" y navegación a la ficha.
   - Error de la API → se muestra el mensaje general y los `detalles` se asocian a cada campo (`contactos.0.email` → debajo del email del primer contacto).
4. Mientras guarda, el botón muestra "Guardando…" y se desactiva (evita doble envío).

### Cómo se muestran los errores

| Situación | Cómo se ve |
|---|---|
| Error de un campo | Texto rojo bajo el campo y borde rojo (`campo-error`) |
| Error general (409 CIF repetido, etc.) | Caja roja arriba del formulario (`MensajeError`) |
| Error al cargar datos | `MensajeError` en la página |
| Error al eliminar | Toast rojo |
| Éxito | Toast verde (`useToast().mostrar(...)`) |
| Cargando | `Cargando` con icono giratorio; en el listado la tabla se atenúa mientras recarga |
| Sesión caducada | Vuelta automática al login |

---

## Parte 6. Docker

### Qué es Docker

Una herramienta para ejecutar aplicaciones en **contenedores**: entornos aislados que llevan dentro todo lo que necesita la aplicación (Node, librerías, sistema operativo mínimo). "Si funciona en mi máquina, funciona en la tuya".

### Imagen y contenedor

- **Imagen**: plantilla de solo lectura. Se construye con un `Dockerfile`. Es como una **clase**.
- **Contenedor**: una imagen en ejecución. Es como un **objeto** (instancia).
- **Volumen**: almacenamiento que sobrevive al contenedor. `pgdata` guarda los datos de PostgreSQL; si borras el contenedor, los datos siguen.

### Los Dockerfile del proyecto (multi-stage)

`backend/Dockerfile`:

1. **Etapa `build`**: instala todas las dependencias (`npm ci`), genera el cliente Prisma y compila TypeScript a JavaScript (`npm run build`). Después quita las dependencias de desarrollo (`npm prune --omit=dev`).
2. **Etapa final**: copia solo `node_modules` de producción, `dist/`, `prisma/` y `data/`. Ejecuta como usuario `node` (no root). Imagen más pequeña y segura.

`frontend/Dockerfile`:

1. **Etapa `build`**: `npm run build` genera HTML/JS/CSS estáticos en `dist/`.
2. **Etapa final**: imagen de **nginx** con esos ficheros y `nginx.conf`. Node ya no hace falta.

### Qué hace Docker Compose

Define y arranca **varios contenedores** juntos desde `docker-compose.yml`:

| Servicio | Imagen | Qué hace |
|---|---|---|
| `db` | `postgres:17-alpine` | Base de datos, volumen `pgdata`, *healthcheck* con `pg_isready` |
| `api` | `./backend` | API; espera a que `db` esté sana (`depends_on: condition: service_healthy`) |
| `web` | `./frontend` | nginx; espera a que `api` esté sana; publica el puerto 8085 |

`${POSTGRES_PASSWORD:-clientes_dev}` significa "usa la variable del `.env` y, si no existe, `clientes_dev`". Por eso arranca sin crear `.env`.

### Cómo se comunican los servicios

Compose crea una **red interna** en la que cada servicio es accesible **por su nombre**:

- La API conecta con `postgresql://...@db:5432/clientes` (`db` = nombre del servicio).
- nginx reenvía a `http://api:3000`.
- Desde tu equipo solo están publicados el **8085** (web) y el **55432** (PostgreSQL, solo en `127.0.0.1`). El puerto 3000 de la API **no** se publica: solo se llega a ella a través de nginx.

### Qué ocurre al ejecutar `docker compose up`

1. Construye las imágenes (`backend/Dockerfile`, `frontend/Dockerfile`) si no existen.
2. Crea la red y el volumen `pgdata` (si no existe).
3. Arranca `db`. La primera vez, PostgreSQL crea la base de datos y el usuario con `POSTGRES_*`.
4. Espera a que el *healthcheck* de `db` diga que está lista.
5. Arranca `api`, que ejecuta `npm run start:docker`:
   1. `prisma migrate deploy` → crea/actualiza las tablas.
   2. `seed.js` → crea/actualiza el usuario demo e importa el CSV si es nuevo.
   3. `server.js` → la API escucha en el puerto 3000.
6. Cuando `/api/health` responde, arranca `web` (nginx).
7. Abres http://localhost:8085.

**Al reiniciar** (`docker compose down` + `up`): el volumen se conserva, las migraciones ya están aplicadas (no hace nada), el usuario demo se actualiza y la importación se **omite**.

---

## Parte 7. Histórico paso a paso

Ejemplo: el usuario cambia la ciudad de "Huesca" a "Zaragoza" y el teléfono de un contacto en la web.

**1. Navegador** — `ClienteFormPage.tsx`, función `guardar`:
- `validar(datos)` comprueba los campos.
- `clientesApi.actualizar(id, datos)` envía `PUT /api/clientes/12` con el cliente completo y sus contactos (cada contacto existente con su `id`).

**2. nginx** reenvía la petición a `api:3000`.

**3. Middleware `requireAuth`** (`middleware/auth.ts`): lee la cookie, encuentra la sesión y pone `req.usuario = { id: 1, nombre: 'Usuario Demo', ... }`.

**4. Controlador** `actualizar` (`controllers/clientes.controller.ts`):
- `idSchema.parse(req.params.id)` → `12` (o 400 si no es un número).
- `clienteSchema.parse(req.body)` → datos validados y normalizados (o 400).
- Llama a `actualizarCliente(12, datos, req.usuario.id)`.

**5. Servicio** `actualizarCliente` (`services/clientes.service.ts`). **Todo dentro de `prisma.$transaction`**:

1. Lee el cliente actual con sus contactos (si no existe o está eliminado → 404).
2. Si el CIF ha cambiado, comprueba que no lo tenga otro cliente (→ 409).
3. `calcularCambios(actual, nuevos, CAMPOS_CLIENTE)` compara campo a campo, **convirtiendo todo a texto** con `valorComoTexto` (fechas como `AAAA-MM-DD`, `null` y `""` como "sin valor"). Devuelve solo lo que cambió:
   ```js
   [{ campo: 'ciudad', valorAnterior: 'Huesca', valorNuevo: 'Zaragoza' }]
   ```
4. Para cada contacto recibido:
   - Sin `id` → se crea y se apunta `accion: 'CREAR'`.
   - Con `id` → `calcularCambios(previo, contacto, ['nombre','email','telefono'])`; si hay cambios, `UPDATE` y se apunta cada campo con `accion: 'MODIFICAR'`.
   - Un `id` que no es de este cliente → `HttpError(400)` → **la transacción se deshace entera**.
5. Contactos que existían y no se han enviado → se borran y se apunta `accion: 'ELIMINAR'`.
6. **Si la lista de cambios está vacía → `return`**: no se hace ningún `UPDATE` ni se escribe histórico (ni cambia la fecha de última modificación).
7. Si hay cambios:
   - `UPDATE clientes SET ..., actualizado_en = now()`.
   - `INSERT INTO historial_cambios` con todas las entradas (`createMany`), cada una con `cliente_id`, `entidad` (`cliente`/`contacto`), `registro_id`, `campo`, `valor_anterior`, `valor_nuevo`, `usuario_id` y `fecha` (por defecto `now()`).
8. Fin del callback → **COMMIT**. Si algo lanzó un error en cualquier punto → **ROLLBACK**: ni el cliente cambia ni se guarda histórico.

**6. Respuesta**: el controlador devuelve `200` con la ficha actualizada (`obtenerCliente`).

**7. Navegador**: toast "Cambios guardados correctamente" y navegación a la ficha, que llama a `GET /api/clientes/12/historico` y muestra la tabla con fecha, usuario, acción, registro, campo, valor anterior (rojo, tachado) y valor nuevo (verde).

En la base de datos queda:

| entidad | registro_id | accion | campo | valor_anterior | valor_nuevo | usuario_id | fecha |
|---|---|---|---|---|---|---|---|
| cliente | 12 | MODIFICAR | ciudad | Huesca | Zaragoza | 1 | 2026-10-28 14:05 |
| contacto | 31 | MODIFICAR | telefono | 974 000 000 | 974 111 111 | 1 | 2026-10-28 14:05 |

**¿Por qué una fila por campo?** Porque el enunciado pide "campo modificado, valor anterior, valor nuevo": con una fila por campo es directo de consultar y de mostrar. Alternativa: guardar un JSON con todo el antes/después en una fila (más compacto, más difícil de leer).

**Tests que lo demuestran** (`tests/api.test.ts`): "registra en el histórico cada campo modificado…", "no registra nada si no cambia ningún valor", "si algo falla, no se guarda ni el cambio ni el histórico (transacción)". Y `tests/logica.test.ts` prueba `calcularCambios` aislada.

---

## Parte 8. Preguntas de entrevista

### 1. ¿Cómo está organizado el backend?
- **Respuesta sencilla:** en capas: rutas → controladores → servicios → Prisma.
- **Técnica:** las rutas asocian URL y método a un controlador; el controlador valida con Zod y traduce HTTP; el servicio tiene la lógica y las consultas; Prisma habla con PostgreSQL. Los errores se lanzan y los captura un middleware central. Es la misma separación que Controller/Service/DbContext en ASP.NET, sin repositorios porque Prisma ya abstrae el acceso a datos.
- **Archivos:** `src/routes/`, `src/controllers/`, `src/services/`, `src/app.ts`.

### 2. ¿Por qué Express y no NestJS?
- **Sencilla:** porque la prueba valora la sencillez y Express se entiende en minutos.
- **Técnica:** NestJS añade decoradores, módulos e inyección de dependencias (muy parecido a ASP.NET), útil en proyectos grandes, pero aquí sería sobredimensionado. Express 5 además gestiona errores `async` sin código extra.
- **Archivo:** `src/app.ts`.

### 3. ¿Cómo proteges la API?
- **Sencilla:** todas las rutas de clientes pasan por `requireAuth`; sin una sesión válida devuelven 401.
- **Técnica:** `clientesRouter.use(requireAuth)` lee la cookie `sid`, busca el hash del token en `sesiones` y comprueba la caducidad. Además: helmet (cabeceras), límite de intentos de login, validación de entrada, consultas parametrizadas y errores 500 sin detalles internos.
- **Archivos:** `src/middleware/auth.ts`, `src/routes/clientes.routes.ts`.

### 4. ¿Cómo se guardan las contraseñas?
- **Sencilla:** con un hash bcrypt, nunca en claro.
- **Técnica:** `bcrypt.hash(password, 12)` genera un hash con *salt* aleatorio y coste 12 (2¹² iteraciones). Es lento a propósito para dificultar ataques de fuerza bruta. Para comprobar se usa `bcrypt.compare`.
- **Archivo:** `src/services/auth.service.ts` (`hashPassword`, `login`).

### 5. ¿Por qué cookies HttpOnly y no JWT en localStorage?
- **Sencilla:** porque JavaScript no puede leer una cookie HttpOnly, así que no se puede robar con un XSS, y porque al hacer logout la sesión se invalida de verdad.
- **Técnica:** `SameSite=Strict` evita CSRF; el token es aleatorio (32 bytes) y en BD solo está su SHA-256. Un JWT no se puede revocar sin una lista negra.
- **Archivos:** `src/controllers/auth.controller.ts` (`opcionesCookie`), `src/services/auth.service.ts`.

### 6. ¿Qué pasa si alguien intenta adivinar contraseñas?
- **Sencilla:** tras 10 intentos en 15 minutos desde la misma IP, el login responde 429.
- **Técnica:** `express-rate-limit` en la ruta de login. Además, bcrypt hace cada intento lento y la respuesta es igual tanto si el email existe como si no (`HASH_FICTICIO`).
- **Archivo:** `src/routes/auth.routes.ts`.

### 7. ¿Cómo validas los datos?
- **Sencilla:** con Zod, en el servidor; el navegador también valida para avisar antes.
- **Técnica:** `clienteSchema.parse(req.body)` valida tipos, obligatorios, longitudes, formato de email/teléfono/CIF y además normaliza. Si falla lanza `ZodError` → 400 con `detalles` por campo, que el formulario pinta debajo de cada input.
- **Archivos:** `src/validation/cliente.schema.ts`, `frontend/src/pages/ClienteFormPage.tsx` (`validar`).

### 8. ¿Cómo gestionas los errores?
- **Sencilla:** en un único middleware que convierte cualquier error en una respuesta JSON con el código correcto.
- **Técnica:** `ZodError`→400, `HttpError`→su código, Prisma `P2002`→409, JSON malformado→400, resto→500 con log. Express 5 propaga los errores de funciones `async` automáticamente.
- **Archivo:** `src/middleware/errorHandler.ts`.

### 9. ¿Qué códigos HTTP devuelve la API y cuándo?
- **Sencilla:** 200 OK, 201 creado, 204 borrado/logout, 400 datos inválidos, 401 sin sesión, 404 no existe, 409 CIF repetido, 429 demasiados logins, 500 error interno.
- **Técnica:** el POST devuelve además la cabecera `Location` con la URL del nuevo cliente.
- **Archivos:** `src/controllers/clientes.controller.ts`, README apartado 9.

### 10. ¿Cómo evitas la inyección SQL?
- **Sencilla:** Prisma siempre usa consultas parametrizadas.
- **Técnica:** el texto del usuario nunca se concatena en el SQL; viaja como parámetro (`$1`). Lo mismo que hace EF Core con LINQ. El único SQL manual es el `TRUNCATE` de los tests, sin datos externos.
- **Archivo:** `src/services/clientes.service.ts` (`construirFiltro`).

### 11. ¿Cómo funciona la búsqueda y los filtros?
- **Sencilla:** se construye un `where` de Prisma con lo que llegue en la URL.
- **Técnica:** `q` busca con `contains` + `mode: 'insensitive'` (ILIKE) en empresa, CIF (sin guiones), y en nombre o email de cualquier contacto (`contactos: { some: … }`, que genera un `EXISTS`). Estado, país y comercial son filtros exactos combinados con AND.
- **Archivo:** `src/services/clientes.service.ts` (`construirFiltro`, `listarClientes`).

### 12. ¿Cómo funciona la paginación?
- **Sencilla:** con `page` y `pageSize`; la API devuelve también el total y el número de páginas.
- **Técnica:** `skip: (page-1)*pageSize, take: pageSize` (OFFSET/LIMIT). El `count` y el `findMany` van en la misma transacción para que el total sea coherente. `pageSize` está limitado a 100 para evitar consultas enormes.
- **Archivos:** `src/services/clientes.service.ts`, `src/validation/cliente.schema.ts` (`listadoSchema`).

### 13. ¿Cómo calculas la facturación acumulada? ¿Por qué no la guardas?
- **Sencilla:** sumando las bases imponibles de las facturas, sin IVA, en el momento de consultar.
- **Técnica:** en la ficha con `sumarBases()` (Decimal); en el listado con un `groupBy` + `_sum` para todos los clientes de la página en una sola consulta (evita N+1). No se guarda porque sería un dato derivado que podría desincronizarse.
- **Archivo:** `src/services/clientes.service.ts`.

### 14. ¿Por qué DECIMAL y no float?
- **Sencilla:** porque los float no representan bien los céntimos.
- **Técnica:** `0.1 + 0.2` en coma flotante da `0.30000000000000004`. `DECIMAL(12,2)` en PostgreSQL y `Prisma.Decimal` en el código son exactos. La API devuelve importes como string para no perder precisión en JSON.
- **Archivos:** `prisma/schema.prisma` (`@db.Decimal(12, 2)`), `tests/logica.test.ts`.

### 15. ¿Qué anomalías tenía el CSV?
- **Sencilla:** clientes repetidos con distinto formato, una factura duplicada, una fecha imposible, una factura sin importe, una fila sin CIF y formatos distintos de fechas, importes, países y emails.
- **Técnica:** ver la tabla del README apartado 11. Resultado: 18 filas → 7 clientes, 8 contactos, 14 facturas, 1 duplicado, 2 rechazadas.
- **Archivos:** `backend/data/clientes_antiguos.csv`, `src/import/`.

### 16. ¿Cómo distingues `1.250` (mil doscientos cincuenta) de `640.5`?
- **Sencilla:** si solo hay puntos y separan grupos de 3 cifras, son miles; si no, es decimal.
- **Técnica:** si hay coma, la coma es decimal y los puntos se quitan (formato español). Si solo hay puntos y cumplen `/^\d{1,3}(\.\d{3})+$/`, son miles. En otro caso, el punto es decimal. Está documentado porque es una decisión ante un dato ambiguo.
- **Archivo:** `src/import/normalizers.ts` (`normalizarImporte`).

### 17. ¿Qué hiciste con la fila sin CIF?
- **Sencilla:** la asocié a "Hotel Mar Blau SA" porque el email del contacto ya pertenecía a ese cliente, y lo dejé registrado como aviso.
- **Técnica:** `resolverCliente` busca un contacto con ese email en un cliente no eliminado. Si no lo encuentra, rechaza la fila: no se crea un cliente sin CIF ni se inventa.
- **Archivo:** `src/import/csvImporter.ts` (`resolverCliente`).

### 18. ¿Qué pasa si una fila del CSV está mal?
- **Sencilla:** solo se pierde esa fila (o solo su factura) y se apunta en el resumen; el resto se importa.
- **Técnica:** cada fila va en su propia transacción y hay un `try/catch` por fila. Si la factura es inválida pero el cliente no, el cliente sí se guarda.
- **Archivo:** `src/import/csvImporter.ts` (`importarCsv`), test "una fila incorrecta no impide importar el resto".

### 19. ¿Qué pasa si reinicio los contenedores? ¿Se duplican los datos?
- **Sencilla:** no. La importación se salta si ese fichero ya se importó, y aunque se ejecutara, no duplicaría.
- **Técnica:** hash SHA-256 del fichero en la tabla `importaciones` + búsqueda por CIF y número de factura antes de crear + UNIQUE en la BD.
- **Archivos:** `src/import/ejecutarImportacion.ts`, `src/scripts/seed.ts`.

### 20. ¿Cómo funciona el histórico?
- **Sencilla:** al guardar, se compara el cliente y sus contactos antes y después y se guarda una fila por cada campo que cambió, con el usuario y la fecha.
- **Técnica:** `calcularCambios` + `createMany` dentro de la misma transacción que el `UPDATE`. Ver Parte 7.
- **Archivos:** `src/services/clientes.service.ts` (`actualizarCliente`), `src/services/historial.service.ts`.

### 21. ¿Por qué usas una transacción al actualizar?
- **Sencilla:** para que nunca haya un cambio sin su histórico, ni un histórico de un cambio que no se guardó.
- **Técnica:** `prisma.$transaction(async (tx) => …)`: si cualquier paso lanza un error, PostgreSQL hace ROLLBACK de todo. Hay un test que fuerza un error a mitad y comprueba que la ciudad no cambió y no hay histórico.
- **Archivo:** `tests/api.test.ts` ("si algo falla…").

### 22. ¿Cómo evitas guardar histórico si no ha cambiado nada?
- **Sencilla:** comparando los valores; si no hay diferencias, no se escribe nada.
- **Técnica:** `valorComoTexto` normaliza (fechas a `AAAA-MM-DD`, `""` y `null` iguales) para no detectar falsos cambios (dos objetos `Date` iguales son distintos con `!==`). Si la lista de cambios está vacía, se hace `return` sin `UPDATE`.
- **Archivo:** `src/services/historial.service.ts`.

### 23. ¿Qué estrategia de borrado usaste y por qué?
- **Sencilla:** borrado lógico: el cliente se marca como eliminado y desaparece de la aplicación, pero sus facturas y su histórico se conservan.
- **Técnica:** `eliminado_en = now()` + entrada `ELIMINAR` en el histórico, en una transacción. Todas las consultas filtran `eliminadoEn: null`. La FK de facturas es `RESTRICT` para impedir borrados físicos. Las facturas son documentos fiscales que hay que conservar.
- **Archivo:** `src/services/clientes.service.ts` (`eliminarCliente`).

### 24. ¿Cómo se comunica el frontend con la API? ¿Hay CORS?
- **Sencilla:** con `fetch` a `/api/...`; nginx lo reenvía a la API. No hay CORS porque todo está en el mismo origen.
- **Técnica:** `nginx.conf` tiene `location /api/ { proxy_pass http://api:3000; }`. En desarrollo, Vite hace lo mismo con `server.proxy`.
- **Archivos:** `frontend/nginx.conf`, `frontend/vite.config.ts`, `frontend/src/api/http.ts`.

### 25. ¿Cómo sabe la web si el usuario ha iniciado sesión?
- **Sencilla:** al arrancar pregunta a `/api/auth/me`; si responde con un usuario, hay sesión.
- **Técnica:** `AuthContext` guarda el usuario. Si cualquier llamada devuelve 401, `http.ts` emite un evento y `AuthContext` pone el usuario a `null`, lo que lleva al login. La protección real está en la API.
- **Archivos:** `frontend/src/context/AuthContext.tsx`, `frontend/src/App.tsx`.

### 26. ¿Qué es `useEffect` y para qué lo usas?
- **Sencilla:** para ejecutar código cuando un componente aparece o cuando cambia un valor, como cargar datos.
- **Técnica:** en `ClientesPage` hay tres: búsqueda con *debounce* de 300 ms, carga de opciones de filtros y carga del listado cuando cambia la URL. El de carga usa una variable `cancelado` para ignorar respuestas antiguas si llegan desordenadas.
- **Archivo:** `frontend/src/pages/ClientesPage.tsx`.

### 27. ¿Qué hace `docker compose up` exactamente?
- **Sencilla:** construye las imágenes y arranca base de datos, API y web en orden.
- **Técnica:** ver Parte 6. Healthchecks + `depends_on: condition: service_healthy`; la API aplica migraciones, seed e importación antes de escuchar.
- **Archivo:** `docker-compose.yml`, `backend/package.json` (`start:docker`).

### 28. ¿Por qué el Dockerfile tiene dos etapas?
- **Sencilla:** para que la imagen final no lleve compiladores ni dependencias de desarrollo.
- **Técnica:** *multi-stage build*: la etapa `build` compila; la final copia solo `dist/` y dependencias de producción y ejecuta como usuario no root.
- **Archivos:** `backend/Dockerfile`, `frontend/Dockerfile`.

### 29. ¿Dónde están las credenciales? ¿Has subido algún secreto?
- **Sencilla:** en variables de entorno; el `.env` no se sube. En el repositorio solo hay valores de desarrollo documentados.
- **Técnica:** `.gitignore` excluye `.env`. `docker-compose.yml` usa `${VAR:-defecto}` para que el proyecto arranque sin configuración, y `.env.example` explica cómo cambiarlos. La contraseña demo se guarda con bcrypt.
- **Archivos:** `.env.example`, `.gitignore`, `docker-compose.yml`.

### 30. ¿Cómo están hechos los tests?
- **Sencilla:** con Vitest; hay tests unitarios de funciones puras y tests de integración que llaman a la API con Supertest contra una base de datos de test.
- **Técnica:** `globalSetup` aplica migraciones a `clientes_test`; `beforeEach` vacía tablas (`TRUNCATE`, solo si la BD se llama `*test*`), crea un usuario e importa el CSV real. `request.agent(app)` conserva la cookie entre peticiones. 40 tests.
- **Archivos:** `backend/tests/`, `backend/vitest.config.mts`.

### 31. ¿Qué mejorarías con más tiempo?
- **Sencilla:** tests de la interfaz, búsqueda sin tildes, roles, gestión de facturas y pasar a Prisma 7.
- **Técnica:** ver README apartado 15. También control de concurrencia optimista comparando `actualizado_en`.

### 32. ¿Cómo has usado la IA y cómo te aseguras de que el código es correcto?
- **Sencilla:** usé Claude Code con un prompt detallado por fases; cada parte se comprobó ejecutándola (tests, Docker, curl), y la guía me sirve para entender todo el código.
- **Técnica:** ver `docs/USO_IA.md`: validaciones hechas y correcciones (p. ej. Prisma bloqueó un comando destructivo y se rediseñó el setup de tests).
- **Archivo:** `docs/USO_IA.md`.

---

## Parte 9. Modificaciones en directo

Consejo general para la entrevista: **piensa en voz alta** siguiendo el recorrido de los datos: *base de datos → validación → servicio → tipos del frontend → interfaz*. Después de cambiar, ejecuta `npm test` (backend) y `npm run build` (frontend), y reconstruye con `docker compose up --build`.

### Ejercicio 1 — Añadir un filtro por ciudad

**Backend**

1. `backend/src/validation/cliente.schema.ts`, en `listadoSchema`:
   ```ts
   ciudad: z.string().trim().max(100).optional(),
   ```
2. `backend/src/services/clientes.service.ts`, en `construirFiltro`:
   ```ts
   function construirFiltro({ q, estado, pais, comercial, ciudad }: FiltrosListado) {
     ...
     if (ciudad) where.ciudad = { equals: ciudad, mode: 'insensitive' };
   ```

**Frontend**

3. `frontend/src/api/clientes.ts`, interfaz `FiltrosClientes`: añadir `ciudad?: string;`.
4. `frontend/src/pages/ClientesPage.tsx`:
   - En `filtros`: `ciudad: params.get('ciudad') ?? '',`
   - En el JSX, junto a los otros `select`:
     ```tsx
     <input placeholder="Ciudad" value={filtros.ciudad}
            onChange={(e) => cambiarFiltros({ ciudad: e.target.value })} aria-label="Ciudad" />
     ```
   - En `hayFiltros`, añadir `|| filtros.ciudad`.

**Probar:** `GET /api/clientes?ciudad=zaragoza` debe devolver Construcciones Ebro. Opcional: añadir un `expect` en el test "filtra por estado, país y comercial".

### Ejercicio 2 — Añadir un campo "web" al cliente

1. **BD** — `backend/prisma/schema.prisma`, en `model Cliente`:
   ```prisma
   web String? @db.VarChar(200)
   ```
   Generar la migración (con `docker compose up -d db` arrancado):
   ```bash
   cd backend
   export DATABASE_URL=postgresql://clientes:clientes_dev@localhost:55432/clientes   # PowerShell: $env:DATABASE_URL="..."
   npx prisma migrate dev --name cliente_web
   ```
   Se crea `prisma/migrations/xxxx_cliente_web/migration.sql` con `ALTER TABLE "clientes" ADD COLUMN "web" VARCHAR(200);`.
2. **Validación** — `cliente.schema.ts`, en `clienteSchema`:
   ```ts
   web: textoOpcional(200),
   ```
3. **Histórico** — `clientes.service.ts`: añadir `'web'` a `CAMPOS_CLIENTE` (si no, sus cambios no se registran).
4. **Frontend**:
   - `types.ts`: `web: string | null;` en `Cliente` y `web: string;` en `ClienteFormData`.
   - `ClienteFormPage.tsx`: `web: ''` en `VACIO`, `web: c.web ?? ''` en `aFormulario`, y `{campoTexto('web', 'Página web')}` en el formulario.
   - `api/clientes.ts`, en `aPayload`: `web: vacioANull(datos.web),`.
   - `ClienteDetallePage.tsx`: `<dt>Web</dt><dd>{cliente.web ?? '—'}</dd>` y `web: 'Web'` en `NOMBRES_CAMPO`.
5. Reconstruir: `docker compose up --build` (la API aplica la migración al arrancar).

### Ejercicio 3 — Modificar una validación (ciudad obligatoria)

1. `backend/src/validation/cliente.schema.ts`:
   ```ts
   ciudad: z.string().trim().min(1, 'La ciudad es obligatoria').max(100),
   ```
2. `frontend/src/pages/ClienteFormPage.tsx`, en `validar`:
   ```ts
   if (!datos.ciudad.trim()) errores.ciudad = 'La ciudad es obligatoria';
   ```
   y marcar el campo: `{campoTexto('ciudad', 'Ciudad', { obligatorio: true })}`.
3. Ejecutar `npm test`: puede que algún test cree clientes sin ciudad y falle → **es lo esperado**; adaptar el test (p. ej. el de "rechaza datos obligatorios" puede comprobar también `ciudad`).

Variante: exigir mínimo 3 caracteres en la empresa → `.min(3, 'Mínimo 3 caracteres')`.

### Ejercicio 4 — Añadir una columna "Fecha de alta" en la tabla del listado

La API ya devuelve `fechaAlta`, así que **solo cambia el frontend**:

`frontend/src/pages/ClientesPage.tsx`:
1. Importar: `import { formatoEuros, formatoFecha } from '../utils/formato';`
2. En `<thead>`, antes de "Facturación": `<th>Alta</th>`
3. En cada fila, en la misma posición: `<td>{formatoFecha(c.fechaAlta)}</td>`
4. Cambiar `colSpan={9}` por `colSpan={10}` en la fila "No hay clientes…".

### Ejercicio 5 — Cambiar el orden de los resultados

Ordenar por la última modificación (más recientes primero):

`backend/src/services/clientes.service.ts`, en `listarClientes`:
```ts
orderBy: [{ actualizadoEn: 'desc' }, { id: 'asc' }],
```
El `id` como segundo criterio garantiza un orden estable entre páginas.

Variante con parámetro (`?orden=empresa|reciente`):
1. `listadoSchema`: `orden: z.enum(['empresa', 'reciente']).default('empresa'),`
2. En `listarClientes`:
   ```ts
   const orderBy = filtros.orden === 'reciente'
     ? [{ actualizadoEn: 'desc' as const }, { id: 'asc' as const }]
     : [{ empresa: 'asc' as const }, { id: 'asc' as const }];
   ```
3. Frontend: añadir `orden` a `FiltrosClientes`, a `filtros` en `ClientesPage` y un `select` más.

### Ejercicio 6 — Cambiar el tamaño de página a 20

`frontend/src/pages/ClientesPage.tsx`: `const TAMANO_PAGINA = 20;`. (El backend admite hasta 100; el valor por defecto de la API, 10, está en `listadoSchema`.)

### Ejercicio 7 — Mostrar el número de facturas en el listado

`clientes.service.ts`, en `listarClientes`, dentro del `findMany`:
```ts
include: {
  contactos: { orderBy: { id: 'asc' }, take: 1 },
  _count: { select: { facturas: true } },
},
```
El resultado trae `_count.facturas`. En el frontend: añadir `_count: { facturas: number }` a `ClienteListado` en `types.ts` y una columna `<td className="num">{c._count.facturas}</td>`.

### Ejercicio 8 — Añadir un estado nuevo ("Potencial")

Más delicado, porque es un ENUM de PostgreSQL:
1. `schema.prisma`: añadir `Potencial` a `enum EstadoCliente` y `npx prisma migrate dev --name estado_potencial` (genera `ALTER TYPE ... ADD VALUE`).
2. `cliente.schema.ts`: `z.enum(['Activo', 'Inactivo', 'Potencial'])` en `clienteSchema` y en `listadoSchema`.
3. `normalizers.ts`: `normalizarEstado` si debe aceptarse en el CSV.
4. Frontend: `types.ts` (`Estado`), opciones en los `select` de `ClientesPage` y `ClienteFormPage`, y un estilo para el badge en `Comunes.tsx` / `styles.css`.

---

## Parte 10. Chuleta de una página

**Arranque:** `docker compose up` → http://localhost:8085 → `demo@empresa.local` / `Demo1234!` · Tests: `docker compose up -d db && cd backend && npm test` (40 ✓)

**Arquitectura:** Navegador → **nginx** (web + proxy `/api`) → **Express** (`routes → controllers → services`) → **Prisma** → **PostgreSQL**. Mismo origen → cookie sin CORS.

**Ficheros clave**

| Qué | Dónde |
|---|---|
| Modelo de datos | `backend/prisma/schema.prisma` |
| Rutas | `backend/src/routes/clientes.routes.ts` |
| Lógica de clientes + histórico | `backend/src/services/clientes.service.ts` |
| Comparar cambios | `backend/src/services/historial.service.ts` (`calcularCambios`) |
| Validación | `backend/src/validation/cliente.schema.ts` |
| Autenticación | `backend/src/services/auth.service.ts`, `middleware/auth.ts` |
| Errores | `backend/src/middleware/errorHandler.ts` |
| Importación | `backend/src/import/csvImporter.ts`, `normalizers.ts` |
| Arranque (seed) | `backend/src/scripts/seed.ts` |
| Listado web | `frontend/src/pages/ClientesPage.tsx` |
| Formulario | `frontend/src/pages/ClienteFormPage.tsx` |
| Llamadas a la API | `frontend/src/api/clientes.ts`, `http.ts` |

**Conceptos en una línea**

- **Middleware**: función en cadena antes de las rutas (`requireAuth`, `errorHandler`). = pipeline de ASP.NET.
- **Controlador**: HTTP ↔ servicio. **Servicio**: lógica + BD. **Zod**: valida y normaliza.
- **Sesión**: token aleatorio en cookie `HttpOnly; SameSite=Strict`; en BD solo su SHA-256. Contraseñas con **bcrypt**.
- **Transacción**: cambio + histórico juntos o nada (`prisma.$transaction`).
- **Histórico**: una fila por campo cambiado; nada si no cambia nada; también altas/bajas de clientes y contactos.
- **Borrado lógico**: `eliminado_en`; se conservan facturas e histórico; FK `RESTRICT`.
- **Facturación**: `SUM(base_imponible)` sin IVA, calculada al consultar, `DECIMAL(12,2)`.
- **Duplicados**: normalizar → buscar → UNIQUE. Importación idempotente + hash del fichero al arrancar.
- **CSV**: 18 filas → 7 clientes, 8 contactos, 14 facturas, 1 duplicada (0115), 2 rechazadas (0108 fecha 31/09, 0113 sin base), 1 fila sin CIF asociada por email.
- **Importes**: coma = decimal; `1.250` = miles; `640.5` = decimal; `€` fuera.
- **Fechas**: siempre día/mes; `aa` → 20aa; se rechazan fechas imposibles.
- **Docker**: imagen = clase, contenedor = objeto, volumen = datos persistentes. Compose espera con healthchecks. API al arrancar: `migrate deploy` → `seed` → `server`.
- **React**: componente = función que devuelve JSX; `useState` = estado; `useEffect` = efectos (cargar datos); Context = estado global (`useAuth`, `useToast`). Filtros en la URL.

**Códigos HTTP:** 200 · 201 (+Location) · 204 · 400 (Zod) · 401 (sin sesión) · 404 · 409 (CIF) · 429 (login) · 500

**Decisiones que defender:** Express (sencillez) · Prisma 6 (no 7: menos configuración) · sesiones vs JWT · borrado lógico · facturas solo lectura · importación sin histórico (no hay usuario) · CIF con validación genérica (clientes extranjeros) · puertos 8085/55432.

**Limitaciones honestas:** búsqueda sensible a tildes · sin roles · sin tests de UI · aviso de `npm audit` en el CLI de Prisma 6 · sin control de concurrencia.
