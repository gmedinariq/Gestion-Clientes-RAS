// Configuración leída de variables de entorno (ver .env.example en la raíz del repositorio).

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Duración de la sesión en horas
  sessionHours: Number(process.env.SESSION_HOURS ?? 8),
  // true en producción con HTTPS: el navegador solo enviará la cookie por conexiones seguras
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  csvPath: process.env.CSV_PATH ?? 'data/clientes_antiguos.csv',
  demoUser: {
    email: process.env.DEMO_USER_EMAIL,
    nombre: process.env.DEMO_USER_NAME ?? 'Usuario Demo',
    password: process.env.DEMO_USER_PASSWORD,
  },
};

export const COOKIE_SESION = 'sid';
