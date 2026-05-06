const express = require('express');
const router = express.Router();
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

// Получение доступных дат
router.get('/available', async (req, res) => {
    try {
        const db = await getDb();
        const events = await db.all(`SELECT event_date, status FROM calendar_events`);
        res.json({ events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка' });
    }
});

module.exports = router;