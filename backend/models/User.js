const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
    constructor(db) {
        this.db = db;
    }
    
    async create(userData) {
        const { email, password, name, phone, role = 'client' } = userData;
        
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        const result = await this.db.run(
            `INSERT INTO users (email, password_hash, name, phone, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [email, password_hash, name, phone, role]
        );
        
        return { id: result.lastID, email, name, phone, role };
    }
    
    async findByEmail(email) {
        return await this.db.get(`SELECT * FROM users WHERE email = ?`, [email]);
    }
    
    async findById(id) {
        return await this.db.get(
            `SELECT id, email, name, phone, role FROM users WHERE id = ?`,
            [id]
        );
    }
    
    async validatePassword(user, password) {
        return await bcrypt.compare(password, user.password_hash);
    }
    
    generateToken(userId) {
        return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    }
}

module.exports = User;