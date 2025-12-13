import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import videosRouter from './routes/videos.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import { initGCS } from './services/gcsService.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares - CORS permitir todos los origenes
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Headers adicionales para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rutas
app.use('/api/videos', videosRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raiz
app.get('/', (req, res) => {
  res.json({
    message: 'DIFERCO Videos API',
    version: '2.0.0',
    storage: 'Google Cloud Storage',
    endpoints: {
      health: '/api/health',
      videos: '/api/videos',
      auth: '/api/auth',
      upload: '/api/upload'
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.url
  });
});

// Manejo de errores general
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('No se pudo conectar a MySQL');
      console.error('Asegurate de que MySQL este corriendo y las credenciales sean correctas');
      console.error('Ejecuta primero: npm run init-db');
      process.exit(1);
    }

    // Inicializar conexion con Google Cloud Storage
    let gcsStatus = 'Google Cloud Storage: No conectado (configura GCS_BUCKET_NAME y credenciales)';
    try {
      await initGCS();
      gcsStatus = 'Google Cloud Storage: Conectado';
    } catch (gcsError) {
      console.warn('Google Cloud Storage no configurado:', gcsError.message);
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('========================================================');
      console.log('                                                        ');
      console.log('       DIFERCO Videos API Server Running!               ');
      console.log('                                                        ');
      console.log('========================================================');
      console.log('');
      console.log(`Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`Base de datos: ${process.env.DB_NAME}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('Endpoints disponibles:');
      console.log(`   -> Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   -> Videos API:   http://localhost:${PORT}/api/videos`);
      console.log(`   -> Auth API:     http://localhost:${PORT}/api/auth`);
      console.log(`   -> Upload API:   http://localhost:${PORT}/api/upload`);
      console.log('');
      console.log(gcsStatus);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de senales
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nCerrando servidor...');
  process.exit(0);
});

// Iniciar
startServer();
