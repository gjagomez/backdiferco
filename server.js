import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import videosRouter from './routes/videos.js';
import authRouter from './routes/auth.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como Postman, curl, etc.)
    if (!origin) return callback(null, true);

    // En desarrollo, permitir cualquier puerto de localhost
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // En producción, usar el origin específico del .env
    if (origin === process.env.CORS_ORIGIN) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
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
      auth: '/api/auth'
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
    // Verificar conexión a la base de datos
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ No se pudo conectar a MySQL');
      console.error('ℹ️  Asegúrate de que MySQL esté corriendo y las credenciales sean correctas');
      console.error('ℹ️  Ejecuta primero: npm run init-db');
      process.exit(1);
    }

    // Iniciar servidor Express
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
      console.log('');
      console.log('💡 Credenciales admin por defecto:');
      console.log('   Email: admin@diferco.com');
      console.log('   Password: diferco2025');
      console.log('');
      console.log('📝 Presiona Ctrl+C para detener el servidor');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
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
