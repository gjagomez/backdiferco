import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function exportDatabase() {
  let connection;

  try {
    console.log('🔌 Conectando a la base de datos local...');

    // Conectar a la base de datos local
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin',
      database: process.env.DB_NAME || 'diferco_videos',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Conectado a la base de datos local');

    // Array para almacenar los comandos SQL
    const sqlCommands = [];

    const dbName = process.env.DB_NAME || 'diferco_videos';

    // Agregar encabezado
    sqlCommands.push('-- Exportación de Base de Datos DIFERCO Videos');
    sqlCommands.push(`-- Fecha: ${new Date().toISOString()}`);
    sqlCommands.push('-- ');
    sqlCommands.push('');
    sqlCommands.push('-- Crear base de datos si no existe');
    sqlCommands.push(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    sqlCommands.push(`USE \`${dbName}\`;`);
    sqlCommands.push('');
    sqlCommands.push('SET FOREIGN_KEY_CHECKS=0;');
    sqlCommands.push('');

    // Obtener lista de tablas
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    console.log(`📋 Tablas encontradas: ${tableNames.join(', ')}`);

    // Para cada tabla, generar CREATE TABLE y INSERT
    for (const tableName of tableNames) {
      console.log(`\n📦 Exportando tabla: ${tableName}`);

      // Obtener CREATE TABLE
      const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSQL = createTableResult[0]['Create Table'];

      sqlCommands.push(`-- Tabla: ${tableName}`);
      sqlCommands.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      sqlCommands.push(createTableSQL + ';');
      sqlCommands.push('');

      // Obtener datos
      const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);

      if (rows.length > 0) {
        console.log(`   └─ ${rows.length} registros encontrados`);

        // Generar INSERTs
        const columns = Object.keys(rows[0]);
        const columnNames = columns.map(col => `\`${col}\``).join(', ');

        sqlCommands.push(`-- Datos de ${tableName}`);

        for (const row of rows) {
          const values = columns.map(col => {
            const value = row[col];

            if (value === null) {
              return 'NULL';
            } else if (typeof value === 'number') {
              return value;
            } else if (value instanceof Date) {
              return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
            } else {
              // Escapar comillas simples
              const escapedValue = String(value).replace(/'/g, "''");
              return `'${escapedValue}'`;
            }
          }).join(', ');

          sqlCommands.push(`INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${values});`);
        }

        sqlCommands.push('');
      } else {
        console.log(`   └─ Sin registros`);
      }
    }

    sqlCommands.push('SET FOREIGN_KEY_CHECKS=1;');
    sqlCommands.push('');
    sqlCommands.push('-- Exportación completada');

    // Guardar en archivo
    const outputPath = path.join(__dirname, '..', 'diferco_videos_export.sql');
    fs.writeFileSync(outputPath, sqlCommands.join('\n'), 'utf8');

    console.log('\n✅ Exportación completada exitosamente!');
    console.log(`📄 Archivo guardado en: ${outputPath}`);
    console.log(`📊 Total de comandos SQL: ${sqlCommands.length}`);

    return outputPath;

  } catch (error) {
    console.error('❌ Error durante la exportación:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar exportación
exportDatabase()
  .then((filepath) => {
    console.log('\n🎉 ¡Proceso completado!');
    console.log(`\nAhora puedes subir el archivo ${path.basename(filepath)} al servidor.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
