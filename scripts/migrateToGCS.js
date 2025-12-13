// Script para migrar la base de datos de MEGA a Google Cloud Storage
import { createPool } from '../config/database.js';

const pool = createPool();

async function migrateToGCS() {
  const connection = await pool.getConnection();

  try {
    console.log('Iniciando migracion a Google Cloud Storage...\n');

    // 1. Agregar columnas de GCS a la tabla videos
    console.log('1. Agregando columnas de GCS a la tabla videos...');
    try {
      await connection.query(`
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS gcs_url VARCHAR(500) NULL,
        ADD COLUMN IF NOT EXISTS gcs_file_name VARCHAR(255) NULL
      `);
      console.log('   Columnas gcs_url y gcs_file_name agregadas a videos\n');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   Las columnas ya existen en videos\n');
      } else {
        // Intentar agregar una por una
        try {
          await connection.query(`ALTER TABLE videos ADD COLUMN gcs_url VARCHAR(500) NULL`);
        } catch (e) { /* columna ya existe */ }
        try {
          await connection.query(`ALTER TABLE videos ADD COLUMN gcs_file_name VARCHAR(255) NULL`);
        } catch (e) { /* columna ya existe */ }
        console.log('   Columnas agregadas (o ya existian)\n');
      }
    }

    // 2. Agregar columnas de GCS a la tabla additional_videos
    console.log('2. Agregando columnas de GCS a la tabla additional_videos...');
    try {
      await connection.query(`
        ALTER TABLE additional_videos
        ADD COLUMN IF NOT EXISTS gcs_url VARCHAR(500) NULL,
        ADD COLUMN IF NOT EXISTS gcs_file_name VARCHAR(255) NULL
      `);
      console.log('   Columnas gcs_url y gcs_file_name agregadas a additional_videos\n');
    } catch (error) {
      // Intentar agregar una por una
      try {
        await connection.query(`ALTER TABLE additional_videos ADD COLUMN gcs_url VARCHAR(500) NULL`);
      } catch (e) { /* columna ya existe */ }
      try {
        await connection.query(`ALTER TABLE additional_videos ADD COLUMN gcs_file_name VARCHAR(255) NULL`);
      } catch (e) { /* columna ya existe */ }
      console.log('   Columnas agregadas (o ya existian)\n');
    }

    // 3. Mostrar estado actual de las tablas
    console.log('3. Estado actual de las tablas:\n');

    const [videosColumns] = await connection.query(`DESCRIBE videos`);
    console.log('   Columnas de videos:');
    videosColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    console.log('');

    const [additionalColumns] = await connection.query(`DESCRIBE additional_videos`);
    console.log('   Columnas de additional_videos:');
    additionalColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    console.log('\n========================================');
    console.log('Migracion completada exitosamente!');
    console.log('========================================\n');
    console.log('Proximos pasos:');
    console.log('1. Coloca tu archivo de credenciales de GCS en: backend/gcs-credentials.json');
    console.log('2. Configura las variables de entorno en backend/.env');
    console.log('3. Reinicia el servidor backend');
    console.log('');

  } catch (error) {
    console.error('Error durante la migracion:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateToGCS().catch(console.error);
