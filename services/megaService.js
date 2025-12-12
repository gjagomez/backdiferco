import { Storage, File } from 'megajs';
import fs from 'fs';
import path from 'path';

let storage = null;

/**
 * Inicializa la conexión con MEGA
 */
export async function initMega() {
  if (storage) return storage;

  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    throw new Error('MEGA_EMAIL y MEGA_PASSWORD deben estar configurados en .env');
  }

  try {
    storage = await new Storage({
      email,
      password
    }).ready;

    console.log('Conectado a MEGA exitosamente');
    return storage;
  } catch (error) {
    console.error('Error al conectar con MEGA:', error.message);
    throw error;
  }
}

/**
 * Obtiene o crea una carpeta para los videos
 */
async function getOrCreateFolder(folderName = 'Videos') {
  const mega = await initMega();

  // Buscar si ya existe la carpeta
  const existingFolder = mega.root.children?.find(
    child => child.name === folderName && child.directory
  );

  if (existingFolder) {
    return existingFolder;
  }

  // Crear la carpeta si no existe
  const folder = await mega.root.mkdir(folderName);
  console.log(`Carpeta '${folderName}' creada en MEGA`);
  return folder;
}

/**
 * Sube un archivo a MEGA y retorna la URL pública
 * @param {string} filePath - Ruta del archivo local a subir
 * @param {string} fileName - Nombre que tendrá el archivo en MEGA
 * @param {string} folderName - Carpeta destino en MEGA (default: 'Videos')
 * @returns {Promise<{url: string, fileId: string, name: string}>}
 */
export async function uploadToMega(filePath, fileName, folderName = 'Videos') {
  try {
    const folder = await getOrCreateFolder(folderName);

    // Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fs.statSync(filePath).size;

    console.log(`Subiendo archivo: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Subir el archivo a la carpeta
    const uploadedFile = await folder.upload({
      name: fileName,
      size: fileSize
    }, fileBuffer).complete;

    // Generar link público
    const link = await uploadedFile.link();

    console.log(`Archivo subido exitosamente: ${fileName}`);
    console.log(`URL: ${link}`);

    return {
      url: link,
      fileId: uploadedFile.nodeId,
      name: fileName,
      size: fileSize
    };
  } catch (error) {
    console.error('Error al subir archivo a MEGA:', error.message);
    throw error;
  }
}

/**
 * Sube un archivo desde un buffer (para usar con multer)
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {number} fileSize - Tamaño del archivo
 * @param {string} folderName - Carpeta destino
 * @returns {Promise<{url: string, fileId: string, name: string}>}
 */
export async function uploadBufferToMega(buffer, fileName, fileSize, folderName = 'Videos') {
  try {
    const folder = await getOrCreateFolder(folderName);

    console.log(`Subiendo archivo: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Subir el buffer directamente
    const uploadedFile = await folder.upload({
      name: fileName,
      size: fileSize
    }, buffer).complete;

    // Generar link público
    const link = await uploadedFile.link();

    console.log(`Archivo subido exitosamente: ${fileName}`);
    console.log(`URL: ${link}`);

    return {
      url: link,
      fileId: uploadedFile.nodeId,
      name: fileName,
      size: fileSize
    };
  } catch (error) {
    console.error('Error al subir archivo a MEGA:', error.message);
    throw error;
  }
}

/**
 * Lista los archivos en una carpeta de MEGA
 * @param {string} folderName - Nombre de la carpeta
 * @returns {Promise<Array>}
 */
export async function listFiles(folderName = 'Videos') {
  try {
    const folder = await getOrCreateFolder(folderName);

    const files = folder.children?.filter(child => !child.directory) || [];

    return files.map(file => ({
      name: file.name,
      size: file.size,
      nodeId: file.nodeId
    }));
  } catch (error) {
    console.error('Error al listar archivos:', error.message);
    throw error;
  }
}

/**
 * Elimina un archivo de MEGA por su nodeId
 * @param {string} nodeId - ID del nodo en MEGA
 * @returns {Promise<boolean>}
 */
export async function deleteFromMega(nodeId) {
  try {
    const mega = await initMega();

    // Buscar el archivo en todo el storage
    const findFile = (node) => {
      if (node.nodeId === nodeId) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findFile(child);
          if (found) return found;
        }
      }
      return null;
    };

    const file = findFile(mega.root);

    if (!file) {
      throw new Error('Archivo no encontrado en MEGA');
    }

    await file.delete();
    console.log(`Archivo eliminado de MEGA: ${nodeId}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar archivo de MEGA:', error.message);
    throw error;
  }
}

/**
 * Obtiene un stream de descarga de un archivo de MEGA usando su URL pública
 * @param {string} megaUrl - URL pública de MEGA (ej: https://mega.nz/file/xxx#yyy)
 * @returns {Promise<{stream: ReadableStream, size: number, name: string}>}
 */
export async function getStreamFromMegaUrl(megaUrl) {
  try {
    // Crear objeto File desde la URL pública
    const file = File.fromURL(megaUrl);

    // Cargar los atributos del archivo
    await file.loadAttributes();

    console.log(`Streaming archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      file,
      size: file.size,
      name: file.name
    };
  } catch (error) {
    console.error('Error al obtener stream de MEGA:', error.message);
    throw error;
  }
}

/**
 * Descarga un rango de bytes de un archivo de MEGA
 * @param {string} megaUrl - URL pública de MEGA
 * @param {number} start - Byte inicial
 * @param {number} end - Byte final
 * @returns {Promise<{stream: ReadableStream, size: number}>}
 */
export async function getStreamRange(megaUrl, start, end) {
  try {
    const file = File.fromURL(megaUrl);
    await file.loadAttributes();

    const stream = file.download({ start, end });

    return {
      stream,
      size: file.size,
      name: file.name
    };
  } catch (error) {
    console.error('Error al obtener rango de MEGA:', error.message);
    throw error;
  }
}

export default {
  initMega,
  uploadToMega,
  uploadBufferToMega,
  listFiles,
  deleteFromMega,
  getStreamFromMegaUrl,
  getStreamRange
};
