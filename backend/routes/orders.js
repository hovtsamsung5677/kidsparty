const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Order = require('../models/Order');
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

// Создание заказа
router.post('/', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const orderModel = new Order(db);
        
        const orderData = {
            userId: req.userId,
            ...req.body
        };
        
        const order = await orderModel.create(orderData);
        res.json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при создании заказа' });
    }
});

// Получение заказов пользователя
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const db = await getDb();
        const orderModel = new Order(db);
        const orders = await orderModel.getUserOrders(req.userId);
        res.json({ orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при получении заказов' });
    }
});

module.exports = router;