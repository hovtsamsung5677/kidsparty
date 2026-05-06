const sqlite3 = require('sqlite3').verbose();
const sqlite = require('sqlite');
const path = require('path');

let db;

async function initDatabase() {
    db = await sqlite.open({
        filename: path.join(__dirname, '../database.sqlite'),
        driver: sqlite3.Database
    });
    
    // Создаём таблицы
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            phone TEXT,
            role TEXT DEFAULT 'client',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            age_group TEXT,
            children_count INTEGER,
            gender TEXT,
            theme TEXT,
            animators_count INTEGER,
            extras TEXT,
            total_price INTEGER,
            event_date TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_date TEXT NOT NULL,
            order_id INTEGER,
            status TEXT DEFAULT 'available'
        );
    `);
    
    console.log('✅ База данных создана');
    return db;
}

module.exports = initDatabase;