import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const addMegaColumns = async () => {
  let connection;

  try {
    console.log('🚀 Agregando columnas para MEGA...\n');

    const dbName = process.env.DB_NAME || 'diferco_videos';

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin',
      port: process.env.DB_PORT || 3306,
      database: dbName
    });

    console.log('✅ Conectado a MySQL\n');

    // Agregar columnas a la tabla videos
    console.log('📝 Actualizando tabla videos...');

    // Verificar si la columna mega_url ya existe
    const [videosColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'videos' AND COLUMN_NAME = 'mega_url'
    `, [dbName]);

    if (videosColumns.length === 0) {
      // Hacer que public_id sea nullable
      await connection.query(`
        ALTER TABLE videos
        MODIFY COLUMN public_id VARCHAR(255) NULL
      `);

      // Agregar columnas de MEGA
      await connection.query(`
        ALTER TABLE videos
        ADD COLUMN mega_url VARCHAR(500) NULL AFTER public_id,
        ADD COLUMN mega_file_id VARCHAR(100) NULL AFTER mega_url
      `);
      console.log('✅ Columnas mega_url y mega_file_id agregadas a videos\n');
    } else {
      console.log('ℹ️  Columnas de MEGA ya existen en videos\n');
    }

    // Agregar columnas a la tabla additional_videos
    console.log('📝 Actualizando tabla additional_videos...');

    const [additionalColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'additional_videos' AND COLUMN_NAME = 'mega_url'
    `, [dbName]);

    if (additionalColumns.length === 0) {
      // Hacer que public_id sea nullable
      await connection.query(`
        ALTER TABLE additional_videos
        MODIFY COLUMN public_id VARCHAR(255) NULL
      `);

      // Agregar columnas de MEGA
      await connection.query(`
        ALTER TABLE additional_videos
        ADD COLUMN mega_url VARCHAR(500) NULL AFTER public_id,
        ADD COLUMN mega_file_id VARCHAR(100) NULL AFTER mega_url
      `);
      console.log('✅ Columnas mega_url y mega_file_id agregadas a additional_videos\n');
    } else {
      console.log('ℹ️  Columnas de MEGA ya existen en additional_videos\n');
    }

    console.log('🎉 ¡Migración completada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log('   - Tabla videos: mega_url, mega_file_id agregadas');
    console.log('   - Tabla additional_videos: mega_url, mega_file_id agregadas');
    console.log('   - Los campos public_id ahora son opcionales\n');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Ejecutar si se llama directamente
addMegaColumns();
