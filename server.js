import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import videosRouter from './routes/videos.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import { initMega } from './services/megaService.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permitir cualquier origen
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'DIFERCO Videos API',
    version: '1.0.0',
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
      console.error('❌ No se pudo conectar a MySQL');
      console.error('ℹ️  Asegúrate de que MySQL esté corriendo y las credenciales sean correctas');
      console.error('ℹ️  Ejecuta primero: npm run init-db');
      process.exit(1);
    }

    // Inicializar conexión con MEGA (opcional al inicio)
    let megaStatus = '⚠️  MEGA: No conectado (configura MEGA_EMAIL y MEGA_PASSWORD en .env)';
    try {
      await initMega();
      megaStatus = '☁️  MEGA: Conectado';
    } catch (megaError) {
      // MEGA no configurado, continuar sin él
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║                                                        ║');
      console.log('║       🚀 DIFERCO Videos API Server Running! 🚀        ║');
      console.log('║                                                        ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
      console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📡 Endpoints disponibles:');
      console.log(`   → Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   → Videos API:   http://localhost:${PORT}/api/videos`);
      console.log(`   → Auth API:     http://localhost:${PORT}/api/auth`);
      console.log(`   → Upload API:   http://localhost:${PORT}/api/upload`);
      console.log('');
      console.log(megaStatus);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Cerrando servidor...');
  process.exit(0);
});

// Iniciar
startServer();
