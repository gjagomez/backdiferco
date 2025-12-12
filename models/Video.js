import { createPool } from '../config/database.js';

const pool = createPool();

// Helper para convertir snake_case a camelCase
const formatVideoForFrontend = (video) => {
  return {
    id: video.id,
    nog: video.nog,
    title: video.nog ? `NOG: ${video.nog}` : video.title, // Formato: "NOG: 27436365"
    description: video.description,
    category: video.category,
    categoryColor: video.category_color,
    publicId: video.public_id, // Convertir a camelCase
    megaUrl: video.mega_url, // URL del video en MEGA
    megaFileId: video.mega_file_id, // ID del archivo en MEGA
    views: video.views,
    likes: video.likes,
    date: video.date,
    duration: video.duration,
    featured: video.featured,
    borderColor: video.border_color,
    cardColor: video.card_color,
    createdAt: video.created_at,
    updatedAt: video.updated_at,
    additionalVideos: video.additionalVideos || [],
    comments: video.comments || []
  };
};

const formatAdditionalVideo = (video) => {
  return {
    id: video.id,
    videoId: video.video_id,
    title: video.title,
    publicId: video.public_id, // Convertir a camelCase
    megaUrl: video.mega_url, // URL del video adicional en MEGA
    megaFileId: video.mega_file_id, // ID del archivo en MEGA
    thumbnail: video.thumbnail,
    createdAt: video.created_at
  };
};

export const Video = {
  // Obtener todos los videos con sus videos adicionales
  async getAll() {
    const connection = await pool.getConnection();
    try {
      const [videos] = await connection.query(`
        SELECT * FROM videos
        ORDER BY created_at DESC
      `);

      // Obtener videos adicionales y comentarios para cada video
      for (let video of videos) {
        // Videos adicionales
        const [additionalVideos] = await connection.query(
          'SELECT * FROM additional_videos WHERE video_id = ?',
          [video.id]
        );
        video.additionalVideos = additionalVideos.map(formatAdditionalVideo);

        // Comentarios
        const [comments] = await connection.query(
          'SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC',
          [video.id]
        );
        video.comments = comments;
      }

      return videos.map(formatVideoForFrontend);
    } finally {
      connection.release();
    }
  },

  // Obtener video por ID
  async getById(id) {
    const connection = await pool.getConnection();
    try {
      const [videos] = await connection.query(
        'SELECT * FROM videos WHERE id = ?',
        [id]
      );

      if (videos.length === 0) return null;

      const video = videos[0];

      // Videos adicionales
      const [additionalVideos] = await connection.query(
        'SELECT * FROM additional_videos WHERE video_id = ?',
        [video.id]
      );
      video.additionalVideos = additionalVideos.map(formatAdditionalVideo);

      // Comentarios
      const [comments] = await connection.query(
        'SELECT * FROM comments WHERE video_id = ?',
        [video.id]
      );
      video.comments = comments;

      return formatVideoForFrontend(video);
    } finally {
      connection.release();
    }
  },

  // Obtener video por NOG
  async getByNog(nog) {
    const connection = await pool.getConnection();
    try {
      const [videos] = await connection.query(
        'SELECT * FROM videos WHERE nog = ?',
        [nog]
      );

      if (videos.length === 0) {
        // Intentar buscar por ID como fallback
        return await this.getById(nog);
      }

      const video = videos[0];

      // Videos adicionales
      const [additionalVideos] = await connection.query(
        'SELECT * FROM additional_videos WHERE video_id = ?',
        [video.id]
      );
      video.additionalVideos = additionalVideos.map(formatAdditionalVideo);

      // Comentarios
      const [comments] = await connection.query(
        'SELECT * FROM comments WHERE video_id = ?',
        [video.id]
      );
      video.comments = comments;

      return formatVideoForFrontend(video);
    } finally {
      connection.release();
    }
  },

  // Crear nuevo video
  async create(videoData) {
    const connection = await pool.getConnection();
    try {
      const id = crypto.randomUUID();

      // Generar NOG si no se proporciona
      const nog = videoData.nog || this.generateNog();

      await connection.query(`
        INSERT INTO videos (
          id, nog, title, description, category, category_color,
          public_id, mega_url, mega_file_id, views, likes, date, duration, featured,
          border_color, card_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        nog,
        videoData.title,
        videoData.description,
        videoData.category,
        videoData.categoryColor || videoData.category_color,
        videoData.publicId || null,
        videoData.megaUrl || null,
        videoData.megaFileId || null,
        videoData.views || '0',
        videoData.likes || 0,
        videoData.date || 'Hace unos momentos',
        videoData.duration || '',
        videoData.featured || false,
        videoData.border_color || 'border-red-400',
        videoData.card_color || 'bg-gradient-to-br from-red-500 to-red-600'
      ]);

      return await this.getById(id);
    } finally {
      connection.release();
    }
  },

  // Actualizar video
  async update(id, updates) {
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      // Construir query dinámicamente
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.category !== undefined) {
        fields.push('category = ?');
        values.push(updates.category);
      }
      if (updates.categoryColor !== undefined || updates.category_color !== undefined) {
        fields.push('category_color = ?');
        values.push(updates.categoryColor || updates.category_color);
      }
      if (updates.publicId !== undefined) {
        fields.push('public_id = ?');
        values.push(updates.publicId);
      }
      if (updates.megaUrl !== undefined) {
        fields.push('mega_url = ?');
        values.push(updates.megaUrl);
      }
      if (updates.megaFileId !== undefined) {
        fields.push('mega_file_id = ?');
        values.push(updates.megaFileId);
      }
      if (updates.nog !== undefined) {
        fields.push('nog = ?');
        values.push(updates.nog);
      }
      if (updates.likes !== undefined) {
        fields.push('likes = ?');
        values.push(updates.likes);
      }
      if (updates.border_color !== undefined) {
        fields.push('border_color = ?');
        values.push(updates.border_color);
      }
      if (updates.card_color !== undefined) {
        fields.push('card_color = ?');
        values.push(updates.card_color);
      }

      if (fields.length === 0) {
        return await this.getById(id);
      }

      values.push(id);

      await connection.query(
        `UPDATE videos SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return await this.getById(id);
    } finally {
      connection.release();
    }
  },

  // Eliminar video
  async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM videos WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  },

  // Incrementar likes
  async toggleLike(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE videos SET likes = likes + 1 WHERE id = ?',
        [id]
      );

      const video = await this.getById(id);
      return video ? video.likes : null;
    } finally {
      connection.release();
    }
  },

  // Agregar video adicional
  async addAdditionalVideo(videoId, additionalVideo) {
    const connection = await pool.getConnection();
    try {
      const id = crypto.randomUUID();

      await connection.query(`
        INSERT INTO additional_videos (id, video_id, title, public_id, mega_url, mega_file_id, thumbnail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        videoId,
        additionalVideo.title,
        additionalVideo.publicId || null,
        additionalVideo.megaUrl || null,
        additionalVideo.megaFileId || null,
        additionalVideo.thumbnail || null
      ]);

      return true;
    } finally {
      connection.release();
    }
  },

  // Generar NOG único
  generateNog() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return (timestamp.slice(-4) + random).slice(0, 8);
  }
};
