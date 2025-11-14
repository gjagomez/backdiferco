import express from 'express';
import { Video } from '../models/Video.js';

const router = express.Router();

// GET /api/videos - Obtener todos los videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.getAll();
    res.json(videos);
  } catch (error) {
    console.error('Error al obtener videos:', error);
    res.status(500).json({ error: 'Error al obtener videos' });
  }
});

// GET /api/videos/:id - Obtener video por ID
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.getById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(video);
  } catch (error) {
    console.error('Error al obtener video:', error);
    res.status(500).json({ error: 'Error al obtener video' });
  }
});

// GET /api/videos/nog/:nog - Obtener video por NOG
router.get('/nog/:nog', async (req, res) => {
  try {
    const video = await Video.getByNog(req.params.nog);
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(video);
  } catch (error) {
    console.error('Error al obtener video por NOG:', error);
    res.status(500).json({ error: 'Error al obtener video' });
  }
});

// POST /api/videos - Crear nuevo video
router.post('/', async (req, res) => {
  try {
    const video = await Video.create(req.body);
    res.status(201).json(video);
  } catch (error) {
    console.error('Error al crear video:', error);
    res.status(500).json({ error: 'Error al crear video', details: error.message });
  }
});

// PUT /api/videos/:id - Actualizar video
router.put('/:id', async (req, res) => {
  try {
    const video = await Video.update(req.params.id, req.body);
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(video);
  } catch (error) {
    console.error('Error al actualizar video:', error);
    res.status(500).json({ error: 'Error al actualizar video' });
  }
});

// DELETE /api/videos/:id - Eliminar video
router.delete('/:id', async (req, res) => {
  try {
    await Video.delete(req.params.id);
    res.json({ message: 'Video eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar video:', error);
    res.status(500).json({ error: 'Error al eliminar video' });
  }
});

// POST /api/videos/:id/like - Incrementar likes
router.post('/:id/like', async (req, res) => {
  try {
    const likes = await Video.toggleLike(req.params.id);
    if (likes === null) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json({ likes });
  } catch (error) {
    console.error('Error al dar like:', error);
    res.status(500).json({ error: 'Error al dar like' });
  }
});

// POST /api/videos/:id/additional - Agregar video adicional
router.post('/:id/additional', async (req, res) => {
  try {
    await Video.addAdditionalVideo(req.params.id, req.body);
    const video = await Video.getById(req.params.id);
    res.json(video);
  } catch (error) {
    console.error('Error al agregar video adicional:', error);
    res.status(500).json({ error: 'Error al agregar video adicional' });
  }
});

export default router;
