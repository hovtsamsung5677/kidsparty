const express = require('express');
const router = express.Router();
const User = require('../models/User');
const sqlite = require('sqlite');
const path = require('path');

let db;

async function getDb() {
    if (!db) {
        db = await sqlite.open({
            filename: path.join(__dirname, '../database.sqlite'),
            driver: require('sqlite3').Database
        });
    }
    return db;
}

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const db = await getDb();
        const userModel = new User(db);
        const { email, password, name, phone, role } = req.body;
        
        const existingUser = await userModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        const user = await userModel.create({ email, password, name, phone, role });
        const token = userModel.generateToken(user.id);
        
        res.json({ success: true, token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const db = await getDb();
        const userModel = new User(db);
        const { email, password } = req.body;
        
        const user = await userModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const isValid = await userModel.validatePassword(user, password);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const token = userModel.generateToken(user.id);
        
        res.json({
            success: true,
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

module.exports = router;