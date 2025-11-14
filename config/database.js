import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión a MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'diferco_videos',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
let pool;

export const createPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Pool de conexiones MySQL creado');
  }
  return pool;
};

export const getConnection = async () => {
  if (!pool) {
    pool = createPool();
  }
  return pool.getConnection();
};

// Función para verificar la conexión
export const testConnection = async () => {
  try {
    if (!pool) {
      pool = createPool();
    }
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
    console.log(`🖥️  Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a MySQL:', error.message);
    return false;
  }
};

export default pool;
