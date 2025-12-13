import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let storage = null;
let bucket = null;

// Nombre del bucket de Google Cloud Storage
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'macgenesis-9c5a2fcb246f';

/**
 * Inicializa la conexion con Google Cloud Storage
 */
export async function initGCS() {
  if (storage && bucket) return { storage, bucket };

  try {
    // Opcion 1: Credenciales desde variable de entorno (JSON en base64 o string)
    if (process.env.GCS_CREDENTIALS) {
      let credentials;
      try {
        // Intentar decodificar base64 primero
        const decoded = Buffer.from(process.env.GCS_CREDENTIALS, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
      } catch (e) {
        // Si falla, intentar parsear directamente como JSON
        credentials = JSON.parse(process.env.GCS_CREDENTIALS);
      }

      storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id || process.env.GCS_PROJECT_ID
      });
      console.log('Usando credenciales de GCS desde variable de entorno');
    }
    // Opcion 2: Archivo de credenciales local (desarrollo)
    else {
      const keyFilePath = process.env.GCS_KEY_FILE || path.join(__dirname, '..', 'gcs-credentials.json');

      storage = new Storage({
        keyFilename: keyFilePath,
        projectId: process.env.GCS_PROJECT_ID
      });
      console.log('Usando credenciales de GCS desde archivo local');
    }

    bucket = storage.bucket(BUCKET_NAME);

    // Verificar que el bucket existe
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error(`El bucket ${BUCKET_NAME} no existe`);
    }

    console.log(`Conectado a Google Cloud Storage - Bucket: ${BUCKET_NAME}`);
    return { storage, bucket };
  } catch (error) {
    console.error('Error al conectar con Google Cloud Storage:', error.message);
    throw error;
  }
}

/**
 * Sube un archivo a Google Cloud Storage
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folderName - Carpeta destino (default: 'videos')
 * @returns {Promise<{url: string, fileName: string, size: number}>}
 */
export async function uploadToGCS(buffer, fileName, mimeType, folderName = 'videos') {
  try {
    await initGCS();

    const destination = `${folderName}/${fileName}`;
    const file = bucket.file(destination);

    console.log(`Subiendo archivo: ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Subir el archivo (el acceso publico se configura a nivel de bucket)
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
      resumable: buffer.length > 5 * 1024 * 1024, // Usar resumable para archivos > 5MB
    });

    // Obtener URL publica
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;

    console.log(`Archivo subido exitosamente: ${fileName}`);
    console.log(`URL: ${publicUrl}`);

    return {
      url: publicUrl,
      fileName: destination,
      originalName: fileName,
      size: buffer.length,
      bucket: BUCKET_NAME
    };
  } catch (error) {
    console.error('Error al subir archivo a GCS:', error.message);
    throw error;
  }
}

/**
 * Lista los archivos en una carpeta de GCS
 * @param {string} folderName - Nombre de la carpeta
 * @returns {Promise<Array>}
 */
export async function listFiles(folderName = 'videos') {
  try {
    await initGCS();

    const [files] = await bucket.getFiles({
      prefix: `${folderName}/`,
    });

    return files.map(file => ({
      name: file.name,
      size: parseInt(file.metadata.size) || 0,
      url: `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
      contentType: file.metadata.contentType,
      updated: file.metadata.updated
    }));
  } catch (error) {
    console.error('Error al listar archivos:', error.message);
    throw error;
  }
}

/**
 * Elimina un archivo de GCS
 * @param {string} fileName - Nombre completo del archivo (incluye carpeta)
 * @returns {Promise<boolean>}
 */
export async function deleteFromGCS(fileName) {
  try {
    await initGCS();

    const file = bucket.file(fileName);
    const [exists] = await file.exists();

    if (!exists) {
      console.log(`Archivo no encontrado: ${fileName}`);
      return false;
    }

    await file.delete();
    console.log(`Archivo eliminado de GCS: ${fileName}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar archivo de GCS:', error.message);
    throw error;
  }
}

/**
 * Genera una URL firmada para acceso temporal
 * @param {string} fileName - Nombre del archivo
 * @param {number} expiresInMinutes - Tiempo de expiracion en minutos
 * @returns {Promise<string>}
 */
export async function getSignedUrl(fileName, expiresInMinutes = 60) {
  try {
    await initGCS();

    const file = bucket.file(fileName);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('Error al generar URL firmada:', error.message);
    throw error;
  }
}

/**
 * Obtiene informacion de un archivo
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<Object>}
 */
export async function getFileInfo(fileName) {
  try {
    await initGCS();

    const file = bucket.file(fileName);
    const [metadata] = await file.getMetadata();

    return {
      name: metadata.name,
      size: parseInt(metadata.size) || 0,
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      updated: metadata.updated,
      url: `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`
    };
  } catch (error) {
    console.error('Error al obtener info del archivo:', error.message);
    throw error;
  }
}

export default {
  initGCS,
  uploadToGCS,
  listFiles,
  deleteFromGCS,
  getSignedUrl,
  getFileInfo,
  BUCKET_NAME
};
