import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadBufferToMega, listFiles, deleteFromMega, getStreamFromMegaUrl } from '../services/megaService.js';

const router = express.Router();

// Configuración de multer para almacenar en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Límite de 500MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar videos y otros formatos multimedia
    const allowedMimes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/mpeg',
      'application/octet-stream' // Para archivos que no se reconocen
    ];

    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten videos.`), false);
    }
  }
});

/**
 * POST /api/upload/video
 * Sube un video a MEGA y retorna la URL pública
 */
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo de video'
      });
    }

    const { originalname, buffer, size } = req.file;
    const folderName = req.body.folder || 'Videos';

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const ext = path.extname(originalname);
    const baseName = path.basename(originalname, ext);
    const uniqueName = `${baseName}_${timestamp}${ext}`;

    console.log(`Recibido archivo: ${originalname} (${(size / 1024 / 1024).toFixed(2)} MB)`);

    // Subir a MEGA
    const result = await uploadBufferToMega(buffer, uniqueName, size, folderName);

    res.json({
      success: true,
      message: 'Video subido exitosamente a MEGA',
      data: {
        url: result.url,
        fileId: result.fileId,
        fileName: result.name,
        originalName: originalname,
        size: result.size,
        sizeFormatted: `${(result.size / 1024 / 1024).toFixed(2)} MB`
      }
    });

  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir el video',
      error: error.message
    });
  }
});

/**
 * POST /api/upload/multiple
 * Sube múltiples videos a MEGA
 */
router.post('/multiple', upload.array('videos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron archivos de video'
      });
    }

    const folderName = req.body.folder || 'Videos';
    const results = [];

    for (const file of req.files) {
      const { originalname, buffer, size } = file;
      const timestamp = Date.now();
      const ext = path.extname(originalname);
      const baseName = path.basename(originalname, ext);
      const uniqueName = `${baseName}_${timestamp}${ext}`;

      try {
        const result = await uploadBufferToMega(buffer, uniqueName, size, folderName);
        results.push({
          success: true,
          originalName: originalname,
          url: result.url,
          fileId: result.fileId,
          fileName: result.name,
          size: result.size
        });
      } catch (uploadError) {
        results.push({
          success: false,
          originalName: originalname,
          error: uploadError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `${successCount} de ${req.files.length} videos subidos exitosamente`,
      data: results
    });

  } catch (error) {
    console.error('Error en upload multiple:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir los videos',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/list
 * Lista los archivos en la carpeta de Videos de MEGA
 */
router.get('/list', async (req, res) => {
  try {
    const folderName = req.query.folder || 'Videos';
    const files = await listFiles(folderName);

    res.json({
      success: true,
      data: {
        folder: folderName,
        count: files.length,
        files: files.map(f => ({
          ...f,
          sizeFormatted: `${(f.size / 1024 / 1024).toFixed(2)} MB`
        }))
      }
    });

  } catch (error) {
    console.error('Error al listar archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar archivos de MEGA',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/stream
 * Hace streaming de un video desde MEGA (proxy)
 * Query params: url (URL de MEGA codificada)
 */
router.get('/stream', async (req, res) => {
  try {
    const megaUrl = req.query.url;

    if (!megaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el parámetro url'
      });
    }

    // Decodificar la URL
    const decodedUrl = decodeURIComponent(megaUrl);

    console.log(`Iniciando streaming desde MEGA: ${decodedUrl}`);

    // Obtener info del archivo
    const { file, size, name } = await getStreamFromMegaUrl(decodedUrl);

    // Manejar Range requests para seeking en el video
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
      const chunkSize = end - start + 1;

      console.log(`Range request: ${start}-${end}/${size}`);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=3600'
      });

      const stream = file.download({ start, end: end + 1 });
      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('Error en stream:', err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

    } else {
      // Sin range, enviar todo el archivo
      res.writeHead(200, {
        'Content-Length': size,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      });

      const stream = file.download();
      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('Error en stream:', err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
    }

  } catch (error) {
    console.error('Error en streaming:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error al hacer streaming del video',
        error: error.message
      });
    }
  }
});

/**
 * DELETE /api/upload/:fileId
 * Elimina un archivo de MEGA
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    await deleteFromMega(fileId);

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente de MEGA'
    });

  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar archivo de MEGA',
      error: error.message
    });
  }
});

// Middleware para manejar errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo excede el tamaño máximo permitido (500MB)'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error de subida: ${error.message}`
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next();
});

export default router;
