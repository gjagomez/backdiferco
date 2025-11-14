import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Función para extraer NOG del título
const extractNog = (title) => {
  // Intentar extraer NOG del formato "NOG:26205823" o "NOG: 27436365"
  const nogMatch = title.match(/NOG:\s*(\d+)/i);
  if (nogMatch) {
    return nogMatch[1];
  }

  // Si no encuentra, intentar extraer números del título
  const numbersMatch = title.match(/\d{7,8}/);
  if (numbersMatch) {
    return numbersMatch[0];
  }

  return null;
};

// Función para limpiar y normalizar el título
const cleanTitle = (title, description) => {
  // Si el título solo tiene el NOG, usar la descripción como título
  if (title.match(/^NOG:\s*\d+$/i)) {
    return description.substring(0, 100); // Primeros 100 caracteres de la descripción
  }
  return title;
};

// Función para convertir fecha de PostgreSQL a MySQL
const convertDate = (pgDate) => {
  if (!pgDate) return new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Convertir fecha de PostgreSQL (2025-10-06 01:51:52.714714+00) a MySQL (2025-10-06 01:51:52)
    const date = new Date(pgDate);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
};

const migrateVideos = async () => {
  let connection;

  try {
    console.log('🚀 Iniciando migración de videos desde Supabase...\n');

    // Leer JSON
    const jsonPath = join(__dirname, '..', 'data', 'videos-supabase.json');
    const videosData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    console.log(`📦 Encontrados ${videosData.length} videos para migrar\n`);

    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'admin',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'diferco_videos'
    });

    console.log('✅ Conectado a MySQL\n');

    let successCount = 0;
    let errorCount = 0;

    for (const video of videosData) {
      try {
        // Extraer NOG del título
        const nog = extractNog(video.title);

        // Limpiar título
        const title = cleanTitle(video.title, video.description);

        // Determinar categoría basada en la descripción
        let category = 'General';
        const desc = video.description.toUpperCase();
        if (desc.includes('AGUA') || desc.includes('POTABLE')) {
          category = 'Sistema de Agua';
        } else if (desc.includes('CAMINO') || desc.includes('CALLE')) {
          category = 'Caminos';
        } else if (desc.includes('TRATAMIENTO')) {
          category = 'Tratamiento';
        } else if (desc.includes('CONSTRUCCION')) {
          category = 'Construcción';
        }

        console.log(`📝 Migrando: ${title}`);
        console.log(`   NOG: ${nog || 'No especificado'}`);

        // Insertar video
        await connection.query(`
          INSERT INTO videos (
            id, nog, title, description, category, category_color,
            public_id, views, likes, date, duration, featured,
            border_color, card_color, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nog = VALUES(nog),
            title = VALUES(title),
            description = VALUES(description),
            category = VALUES(category)
        `, [
          video.id,
          nog,
          title,
          video.description,
          category,
          video.categoryColor || 'bg-blue-100 text-blue-800',
          video.publicId,
          video.views || '0',
          video.likes || 0,
          video.date || 'Hace unos momentos',
          video.duration || '0',
          video.featured || false,
          'border-blue-400',
          'bg-gradient-to-br from-blue-500 to-blue-600',
          convertDate(video.created_at)
        ]);

        // Insertar videos adicionales si existen
        if (video.additionalVideos && video.additionalVideos.length > 0) {
          console.log(`   📹 Migrando ${video.additionalVideos.length} videos adicionales...`);

          for (const addVideo of video.additionalVideos) {
            await connection.query(`
              INSERT INTO additional_videos (id, video_id, title, public_id)
              VALUES (?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                public_id = VALUES(public_id)
            `, [
              addVideo.id,
              video.id,
              addVideo.title,
              addVideo.publicId
            ]);
          }
        }

        console.log(`   ✅ Migrado exitosamente\n`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error al migrar video ${video.id}:`, error.message);
        console.error(`   Detalles:`, error);
        errorCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Videos migrados exitosamente: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total procesados: ${videosData.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    // Mostrar algunos datos migrados
    const [migratedVideos] = await connection.query(`
      SELECT id, nog, title, category,
             (SELECT COUNT(*) FROM additional_videos WHERE video_id = videos.id) as additional_count
      FROM videos
      ORDER BY created_at DESC
    `);

    console.log('📹 Videos en la base de datos:\n');
    migratedVideos.forEach((v, i) => {
      console.log(`${i + 1}. NOG:${v.nog || 'N/A'} - ${v.title.substring(0, 50)}...`);
      console.log(`   Categoría: ${v.category} | Videos adicionales: ${v.additional_count}`);
      console.log('');
    });

    console.log('🎉 ¡Migración completada exitosamente!\n');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Ejecutar migración
migrateVideos();
