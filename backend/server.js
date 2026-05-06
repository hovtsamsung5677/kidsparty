const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const sqlite = require('sqlite');
const authMiddleware = require('./middleware/auth');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function initDatabase() {
    try {
        db = await sqlite.open({
            filename: path.join(__dirname, 'database.sqlite'),
            driver: sqlite3.Database
        });
        
        // Удаляем старые таблицы, если есть (для чистой установки)
        await db.exec(`
            DROP TABLE IF EXISTS bookings;
            DROP TABLE IF EXISTS orders;
            DROP TABLE IF EXISTS themes;
            DROP TABLE IF EXISTS animators;
            DROP TABLE IF EXISTS extras;
            DROP TABLE IF EXISTS age_groups;
            DROP TABLE IF EXISTS users;
        `);
        
        // Создаём таблицы заново
        await db.exec(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                phone TEXT,
                role TEXT DEFAULT 'client',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE themes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                name_ru TEXT NOT NULL,
                icon TEXT,
                description TEXT,
                price_min INTEGER DEFAULT 5000,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE animators (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                name_ru TEXT NOT NULL,
                icon TEXT,
                description TEXT,
                price_per_hour INTEGER DEFAULT 3000,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE extras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                name_ru TEXT NOT NULL,
                icon TEXT,
                description TEXT,
                price INTEGER DEFAULT 1000,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE age_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name_ru TEXT NOT NULL,
                min_age INTEGER,
                max_age INTEGER
            );
            
            CREATE TABLE bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                user_name TEXT,
                user_phone TEXT,
                user_email TEXT,
                event_date TEXT NOT NULL,
                event_time TEXT DEFAULT '12:00',
                children_count INTEGER DEFAULT 10,
                age_group TEXT,
                theme_id INTEGER,
                theme_name TEXT,
                animator_id INTEGER,
                animator_name TEXT,
                extras TEXT,
                total_price INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);
        
        // Добавляем возрастные группы (только уникальные)
        const ageGroupsData = [
            { code: '1-3', name: '1-3 года', min: 1, max: 3 },
            { code: '4-6', name: '4-6 лет', min: 4, max: 6 },
            { code: '7-10', name: '7-10 лет', min: 7, max: 10 },
            { code: '11-14', name: '11-14 лет', min: 11, max: 14 }
        ];
        
        for (const group of ageGroupsData) {
            await db.run(`INSERT INTO age_groups (code, name_ru, min_age, max_age) VALUES (?, ?, ?, ?)`,
                [group.code, group.name, group.min, group.max]);
        }
        
        // Добавляем тематики (только уникальные, без дублей)
        const themesData = [
            { name: 'superheroes', name_ru: 'Супергерои', icon: '🦸', desc: 'Марвел, DC и другие герои', price: 5000 },
            { name: 'princesses', name_ru: 'Принцессы', icon: '👸', desc: 'Диснеевские принцессы и феи', price: 5000 },
            { name: 'dinosaurs', name_ru: 'Динозавры', icon: '🦖', desc: 'Мир древних гигантов', price: 6000 },
            { name: 'space', name_ru: 'Космос', icon: '🚀', desc: 'Путешествие к звёздам', price: 6000 },
            { name: 'unicorns', name_ru: 'Единороги', icon: '🦄', desc: 'Волшебный мир', price: 5500 },
            { name: 'pirates', name_ru: 'Пираты', icon: '🏴‍☠️', desc: 'Морские приключения', price: 5500 }
        ];
        
        for (const theme of themesData) {
            await db.run(`INSERT INTO themes (name, name_ru, icon, description, price_min) VALUES (?, ?, ?, ?, ?)`,
                [theme.name, theme.name_ru, theme.icon, theme.desc, theme.price]);
        }
        
        // Добавляем аниматоров (только уникальные)
        const animatorsData = [
            { name: 'clown', name_ru: 'Клоун', icon: '🤡', desc: 'Весёлый клоун с фокусами', price: 3000 },
            { name: 'magician', name_ru: 'Фокусник', icon: '🎩', desc: 'Профессиональный иллюзионист', price: 4000 },
            { name: 'superhero', name_ru: 'Супергерой', icon: '🦸‍♂️', desc: 'Настоящий защитник', price: 3500 },
            { name: 'fairy', name_ru: 'Фея', icon: '🧚', desc: 'Волшебная фея', price: 3500 }
        ];
        
        for (const animator of animatorsData) {
            await db.run(`INSERT INTO animators (name, name_ru, icon, description, price_per_hour) VALUES (?, ?, ?, ?, ?)`,
                [animator.name, animator.name_ru, animator.icon, animator.desc, animator.price]);
        }
        
        // Добавляем дополнительные услуги (только уникальные)
        const extrasData = [
            { name: 'bubbles', name_ru: 'Шоу мыльных пузырей', icon: '🌀', desc: 'Гигантские мыльные пузыри', price: 2000 },
            { name: 'cryo', name_ru: 'Крио-шоу', icon: '❄️', desc: 'Шоу с жидким азотом', price: 3500 },
            { name: 'animals', name_ru: 'Угадай что в коробке', icon: '🐰', desc: 'Интерактив с животными', price: 4000 },
            { name: 'facepaint', name_ru: 'Аквагрим', icon: '🎨', desc: 'Рисунки на лице', price: 1500 },
            { name: 'balloons', name_ru: 'Твистинг', icon: '🎈', desc: 'Фигуры из шаров', price: 1200 },
            { name: 'photographer', name_ru: 'Фотограф', icon: '📸', desc: 'Профессиональная фотосъёмка', price: 5000 }
        ];
        
        for (const extra of extrasData) {
            await db.run(`INSERT INTO extras (name, name_ru, icon, description, price) VALUES (?, ?, ?, ?, ?)`,
                [extra.name, extra.name_ru, extra.icon, extra.desc, extra.price]);
        }
        
        // Создаём админа
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const adminPasswordHash = await bcrypt.hash('admin123', salt);
        
        await db.run(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`,
            ['admin@kidsparty.ru', adminPasswordHash, 'Администратор', 'admin']);
        
        console.log('✅ База данных создана заново (без дублей)');
        console.log('📊 Статистика:');
        
        const themesCount = await db.get('SELECT COUNT(*) as count FROM themes');
        const animatorsCount = await db.get('SELECT COUNT(*) as count FROM animators');
        const extrasCount = await db.get('SELECT COUNT(*) as count FROM extras');
        
        console.log(`   - Тематик: ${themesCount.count}`);
        console.log(`   - Аниматоров: ${animatorsCount.count}`);
        console.log(`   - Услуг: ${extrasCount.count}`);
        console.log('\n📧 Админ: admin@kidsparty.ru');
        console.log('🔑 Пароль: admin123');
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка базы данных:', error);
        return false;
    }
}

// Middleware для проверки прав администратора
async function adminMiddleware(req, res, next) {
    try {
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.userId]);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Ошибка проверки прав' });
    }
}

// РЕГИСТРАЦИЯ
app.post('/api/register', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { email, password, name, phone } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }
        
        const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        const result = await db.run(
            'INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)',
            [email, password_hash, name || '', phone || '']
        );
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ userId: result.lastID }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            success: true, 
            message: 'Регистрация успешна!',
            token, 
            user: { id: result.lastID, email, name: name || email, phone: phone || '', role: 'client' }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// ВХОД
app.post('/api/login', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { email, password } = req.body;
        
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            success: true, 
            token, 
            user: { id: user.id, email: user.email, name: user.name || user.email, phone: user.phone || '', role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// ПРОВЕРКА ТОКЕНА
app.get('/api/me', async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Нет токена' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.get('SELECT id, email, name, phone, role FROM users WHERE id = ?', [decoded.userId]);
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Неверный токен' });
    }
});

// API ДЛЯ АДМИНА
app.get('/api/admin/themes', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const themes = await db.all('SELECT * FROM themes WHERE is_active = 1 ORDER BY id');
        res.json({ success: true, themes });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения тематик' });
    }
});

app.post('/api/admin/themes', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { name, name_ru, icon, description, price_min } = req.body;
        const result = await db.run(
            'INSERT INTO themes (name, name_ru, icon, description, price_min) VALUES (?, ?, ?, ?, ?)',
            [name, name_ru, icon, description, price_min]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка добавления тематики' });
    }
});

app.delete('/api/admin/themes/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await db.run('UPDATE themes SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});

app.get('/api/admin/animators', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const animators = await db.all('SELECT * FROM animators WHERE is_active = 1 ORDER BY id');
        res.json({ success: true, animators });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения аниматоров' });
    }
});

app.post('/api/admin/animators', async (req, res) => {
    try {
        const { name, name_ru, icon, description, price_per_hour } = req.body;
        const result = await db.run(
            'INSERT INTO animators (name, name_ru, icon, description, price_per_hour) VALUES (?, ?, ?, ?, ?)',
            [name, name_ru, icon, description, price_per_hour]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка добавления аниматора' });
    }
});

app.get('/api/admin/extras', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const extras = await db.all('SELECT * FROM extras WHERE is_active = 1 ORDER BY id');
        res.json({ success: true, extras });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения услуг' });
    }
});

app.post('/api/admin/extras', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { name, name_ru, icon, description, price } = req.body;
        const result = await db.run(
            'INSERT INTO extras (name, name_ru, icon, description, price) VALUES (?, ?, ?, ?, ?)',
            [name, name_ru, icon, description, price]
        );
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка добавления услуги' });
    }
});

// API ДЛЯ КОНСТРУКТОРА
app.get('/api/age-groups', async (req, res) => {
    try {
        const groups = await db.all('SELECT * FROM age_groups ORDER BY min_age');
        res.json({ success: true, groups });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения возрастных групп' });
    }
});

app.get('/api/constructor-data', async (req, res) => {
    try {
        const themes = await db.all('SELECT * FROM themes WHERE is_active = 1');
        const animators = await db.all('SELECT * FROM animators WHERE is_active = 1');
        const extras = await db.all('SELECT * FROM extras WHERE is_active = 1');
        const ageGroups = await db.all('SELECT * FROM age_groups');
        
        res.json({ success: true, data: { themes, animators, extras, ageGroups } });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения данных' });
    }
});

// API ДЛЯ БРОНИРОВАНИЙ
app.get('/api/bookings/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const bookings = await db.all('SELECT * FROM bookings ORDER BY event_date DESC');
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения бронирований' });
    }
});

app.get('/api/bookings/user/:userId', authMiddleware, async (req, res) => {
    try {
        // Проверяем, что запрашивающий либо админ, либо сам пользователь
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.userId]);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        if (user.role !== 'admin' && req.userId != req.params.userId) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        const bookings = await db.all('SELECT * FROM bookings WHERE user_id = ? ORDER BY event_date DESC', [req.params.userId]);
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения бронирований' });
    }
});

app.get('/api/bookings/dates', async (req, res) => {
    try {
        const bookings = await db.all('SELECT event_date, status FROM bookings WHERE status != "cancelled"');
        const bookedDates = bookings.map(b => b.event_date);
        res.json({ success: true, bookedDates });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения дат' });
    }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
    try {
        const { 
            userName, userPhone, userEmail,
            eventDate, eventTime, childrenCount, ageGroup,
            themeId, themeName, animatorId, animatorName,
            extras, totalPrice, comment
        } = req.body;
        
        // Используем ID из токена
        const userId = req.userId;
        
        const existingBooking = await db.get('SELECT * FROM bookings WHERE event_date = ? AND status != "cancelled"', [eventDate]);
        
        if (existingBooking) {
            return res.status(400).json({ error: 'Эта дата уже занята' });
        }
        
        const result = await db.run(
            `INSERT INTO bookings (user_id, user_name, user_phone, user_email, event_date, event_time, children_count, age_group, theme_id, theme_name, animator_id, animator_name, extras, total_price, comment, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [userId, userName, userPhone, userEmail, eventDate, eventTime, childrenCount, ageGroup, themeId, themeName, animatorId, animatorName, JSON.stringify(extras), totalPrice, comment]
        );
        
        res.json({ success: true, bookingId: result.lastID, message: 'Бронирование создано!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при создании бронирования' });
    }
});

app.put('/api/bookings/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        await db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
});

app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
    try {
        // Проверяем, существует ли бронирование и принадлежит ли оно пользователю или является ли пользователь админом
        const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
        if (!booking) {
            return res.status(404).json({ error: 'Бронирование не найдено' });
        }
        // Получаем пользователя
        const user = await db.get('SELECT role FROM users WHERE id = ?', [req.userId]);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        // Проверяем права: админ или владелец бронирования
        if (user.role !== 'admin' && booking.user_id !== req.userId) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        await db.run('UPDATE bookings SET status = "cancelled" WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка отмены' });
    }
});

// СТАТИЧЕСКИЕ ФАЙЛЫ
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ЗАПУСК
async function start() {
    const dbReady = await initDatabase();
    if (!dbReady) {
        console.error('❌ Не удалось инициализировать базу данных');
        process.exit(1);
    }
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Сервер запущен!`);
        console.log(`📍 http://localhost:${PORT}\n`);
    });
}

start();