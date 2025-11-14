import { createPool } from '../config/database.js';
import bcrypt from 'bcryptjs';

const pool = createPool();

export const User = {
  // Buscar usuario por email
  async findByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return users.length > 0 ? users[0] : null;
    } finally {
      connection.release();
    }
  },

  // Buscar usuario por username
  async findByUsername(username) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      return users.length > 0 ? users[0] : null;
    } finally {
      connection.release();
    }
  },

  // Buscar usuario por ID
  async findById(id) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return users.length > 0 ? users[0] : null;
    } finally {
      connection.release();
    }
  },

  // Crear nuevo usuario
  async create(userData) {
    const connection = await pool.getConnection();
    try {
      const id = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await connection.query(`
        INSERT INTO users (id, email, username, password, role)
        VALUES (?, ?, ?, ?, ?)
      `, [
        id,
        userData.email,
        userData.username,
        hashedPassword,
        userData.role || 'user'
      ]);

      return await this.findById(id);
    } finally {
      connection.release();
    }
  },

  // Verificar contraseña
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};
