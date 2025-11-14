import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const initDatabase = async () => {
  let connection;

  try {
    console.log('🚀 Iniciando creación de base de datos...\n');

    // Conectar sin especificar base de datos (para crearla si no existe)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Conectado a MySQL\n');

    // Crear base de datos si no existe
    const dbName = process.env.DB_NAME || 'diferco_videos';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Base de datos '${dbName}' creada o ya existe\n`);

    // Usar la base de datos
    await connection.query(`USE ${dbName}`);

    // Crear tabla de usuarios
    console.log('📝 Creando tabla de usuarios...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla users creada\n');

    // Crear tabla de videos
    console.log('📝 Creando tabla de videos...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id VARCHAR(36) PRIMARY KEY,
        nog VARCHAR(20) UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        category_color VARCHAR(100),
        public_id VARCHAR(255) NOT NULL,
        views VARCHAR(50) DEFAULT '0',
        likes INT DEFAULT 0,
        date VARCHAR(100),
        duration VARCHAR(50),
        featured BOOLEAN DEFAULT FALSE,
        border_color VARCHAR(100),
        card_color VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nog (nog),
        INDEX idx_category (category),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla videos creada\n');

    // Crear tabla de videos adicionales
    console.log('📝 Creando tabla de videos adicionales...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS additional_videos (
        id VARCHAR(36) PRIMARY KEY,
        video_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        public_id VARCHAR(255) NOT NULL,
        thumbnail VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        INDEX idx_video_id (video_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla additional_videos creada\n');

    // Crear tabla de comentarios
    console.log('📝 Creando tabla de comentarios...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(36) NOT NULL,
        author VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        date VARCHAR(100),
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        INDEX idx_video_id (video_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla comments creada\n');

    // Verificar si ya existe el usuario admin
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@diferco.com']
    );

    if (existingUsers.length === 0) {
      // Crear usuario admin por defecto
      console.log('👤 Creando usuario administrador...');
      const hashedPassword = await bcrypt.hash('diferco2025', 10);
      const adminId = crypto.randomUUID();

      await connection.query(`
        INSERT INTO users (id, email, username, password, role)
        VALUES (?, ?, ?, ?, ?)
      `, [adminId, 'admin@diferco.com', 'admin', hashedPassword, 'admin']);

      console.log('✅ Usuario admin creado\n');
      console.log('📧 Email: admin@diferco.com');
      console.log('🔑 Password: diferco2025\n');
    } else {
      console.log('ℹ️  Usuario admin ya existe\n');
    }

    console.log('🎉 ¡Base de datos inicializada correctamente!\n');
    console.log('📊 Resumen:');
    console.log('   - Base de datos: ' + dbName);
    console.log('   - Tablas: users, videos, additional_videos, comments');
    console.log('   - Usuario admin: admin@diferco.com / diferco2025\n');

  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Ejecutar si se llama directamente
initDatabase();
