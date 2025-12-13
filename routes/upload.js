import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadToGCS, listFiles, deleteFromGCS } from '../services/gcsService.js';

const router = express.Router();

// Configuracion de multer para almacenar en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Limite de 500MB
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
 * Sube un video a Google Cloud Storage y retorna la URL publica
 */
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibio ningun archivo de video'
      });
    }

    const { originalname, buffer, size, mimetype } = req.file;
    const folderName = req.body.folder || 'videos';

    // Generar nombre unico para el archivo
    const timestamp = Date.now();
    const ext = path.extname(originalname);
    const baseName = path.basename(originalname, ext);
    const uniqueName = `${baseName}_${timestamp}${ext}`;

    console.log(`Recibido archivo: ${originalname} (${(size / 1024 / 1024).toFixed(2)} MB)`);

    // Subir a Google Cloud Storage
    const result = await uploadToGCS(buffer, uniqueName, mimetype, folderName);

    res.json({
      success: true,
      message: 'Video subido exitosamente a Google Cloud Storage',
      data: {
        url: result.url,
        fileName: result.fileName,
        originalName: originalname,
        size: result.size,
        sizeFormatted: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
        bucket: result.bucket
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
 * Sube multiples videos a Google Cloud Storage
 */
router.post('/multiple', upload.array('videos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron archivos de video'
      });
    }

    const folderName = req.body.folder || 'videos';
    const results = [];

    for (const file of req.files) {
      const { originalname, buffer, size, mimetype } = file;
      const timestamp = Date.now();
      const ext = path.extname(originalname);
      const baseName = path.basename(originalname, ext);
      const uniqueName = `${baseName}_${timestamp}${ext}`;

      try {
        const result = await uploadToGCS(buffer, uniqueName, mimetype, folderName);
        results.push({
          success: true,
          originalName: originalname,
          url: result.url,
          fileName: result.fileName,
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
 * Lista los archivos en la carpeta de Videos de Google Cloud Storage
 */
router.get('/list', async (req, res) => {
  try {
    const folderName = req.query.folder || 'videos';
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
      message: 'Error al listar archivos de Google Cloud Storage',
      error: error.message
    });
  }
});

/**
 * DELETE /api/upload/:fileName
 * Elimina un archivo de Google Cloud Storage
 * El fileName debe incluir la carpeta (ej: videos/archivo.mp4)
 */
router.delete('/:fileName(*)', async (req, res) => {
  try {
    const { fileName } = req.params;

    const deleted = await deleteFromGCS(fileName);

    if (deleted) {
      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente de Google Cloud Storage'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar archivo de Google Cloud Storage',
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
        message: 'El archivo excede el tamano maximo permitido (500MB)'
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
