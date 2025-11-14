const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Инициализация базы данных
const db = new sqlite3.Database(':memory:');

// Создание таблиц
db.serialize(() => {
    // Пользователи
    db.run(`CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        display_name TEXT,
        avatar TEXT,
        status TEXT DEFAULT 'в сети',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Чаты
    db.run(`CREATE TABLE chats (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        avatar TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
    )`);

    // Участники чатов
    db.run(`CREATE TABLE chat_participants (
        chat_id TEXT,
        user_id TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(chat_id, user_id),
        FOREIGN KEY(chat_id) REFERENCES chats(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Сообщения
    db.run(`CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        user_id TEXT,
        text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(chat_id) REFERENCES chats(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Создаем тестовых пользователей
    const testUsers = [
        {
            id: 'user_1',
            username: 'alice',
            password: bcrypt.hashSync('password123', 10),
            display_name: 'Alice',
            status: 'в сети'
        },
        {
            id: 'user_2', 
            username: 'bob',
            password: bcrypt.hashSync('password123', 10),
            display_name: 'Bob',
            status: 'в сети'
        },
        {
            id: 'user_3',
            username: 'charlie',
            password: bcrypt.hashSync('password123', 10),
            display_name: 'Charlie',
            status: 'в сети'
        }
    ];

    const insertUser = db.prepare(`INSERT INTO users (id, username, password, display_name, status) 
                                   VALUES (?, ?, ?, ?, ?)`);
    testUsers.forEach(user => {
        insertUser.run(user.id, user.username, user.password, user.display_name, user.status);
    });
    insertUser.finalize();

    // Создаем тестовые чаты
    db.run(`INSERT INTO chats (id, name, type, created_by) 
            VALUES ('chat_1', 'Alice & Bob', 'private', 'user_1')`);
    db.run(`INSERT INTO chats (id, name, type, created_by) 
            VALUES ('chat_2', 'Тестовая группа', 'group', 'user_1')`);

    // Добавляем участников в чаты
    db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES ('chat_1', 'user_1')`);
    db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES ('chat_1', 'user_2')`);
    db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES ('chat_2', 'user_1')`);
    db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES ('chat_2', 'user_2')`);
    db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES ('chat_2', 'user_3')`);

    // Тестовые сообщения
    const testMessages = [
        { id: 'msg_1', chat_id: 'chat_1', user_id: 'user_1', text: 'Привет, Боб!' },
        { id: 'msg_2', chat_id: 'chat_1', user_id: 'user_2', text: 'Привет, Алиса! Как дела?' },
        { id: 'msg_3', chat_id: 'chat_2', user_id: 'user_1', text: 'Добро пожаловать в группу!' }
    ];

    const insertMessage = db.prepare(`INSERT INTO messages (id, chat_id, user_id, text) 
                                      VALUES (?, ?, ?, ?)`);
    testMessages.forEach(msg => {
        insertMessage.run(msg.id, msg.chat_id, msg.user_id, msg.text);
    });
    insertMessage.finalize();
});

// API Routes

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (row) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = 'user_' + Date.now();

        db.run(
            'INSERT INTO users (id, username, password, display_name) VALUES (?, ?, ?, ?)',
            [userId, username, hashedPassword, username],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания пользователя' });
                }

                res.json({
                    id: userId,
                    username,
                    display_name: username,
                    avatar: '',
                    status: 'в сети'
                });
            }
        );
    });
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }

        // Убираем пароль из ответа
        delete user.password;
        res.json(user);
    });
});

// Получение пользователей
app.get('/api/users', (req, res) => {
    const { search } = req.query;

    let query = `SELECT id, username, display_name, avatar, status FROM users WHERE 1=1`;
    let params = [];

    if (search) {
        query += ` AND (username LIKE ? OR display_name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    db.all(query, params, (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(users);
    });
});

// Получение чатов пользователя
app.get('/api/chats/:userId', (req, res) => {
    const { userId } = req.params;

    const query = `
        SELECT 
            c.*,
            (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
            COUNT(DISTINCT cp.user_id) as participant_count
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chat_id
        WHERE cp.user_id = ?
        GROUP BY c.id
        ORDER BY last_message_time DESC
    `;

    db.all(query, [userId], (err, chats) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        // Для приватных чатов получаем информацию о втором участнике
        Promise.all(chats.map(chat => {
            return new Promise((resolve) => {
                if (chat.type === 'private') {
                    db.get(`
                        SELECT u.id, u.username, u.display_name, u.avatar, u.status
                        FROM chat_participants cp
                        JOIN users u ON cp.user_id = u.id
                        WHERE cp.chat_id = ? AND cp.user_id != ?
                    `, [chat.id, userId], (err, otherUser) => {
                        if (otherUser) {
                            chat.name = otherUser.display_name || otherUser.username;
                            chat.avatar = otherUser.avatar;
                        }
                        resolve(chat);
                    });
                } else {
                    resolve(chat);
                }
            });
        })).then(chatsWithUsers => {
            res.json(chatsWithUsers);
        });
    });
});

// Получение сообщений чата
app.get('/api/messages/:chatId', (req, res) => {
    const { chatId } = req.params;

    const query = `
        SELECT m.*, u.username, u.display_name, u.avatar
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
    `;

    db.all(query, [chatId], (err, messages) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(messages);
    });
});

// Создание чата
app.post('/api/chats', (req, res) => {
    const { name, type, participants, createdBy } = req.body;

    if (!participants || !participants.includes(createdBy)) {
        return res.status(400).json({ error: 'Участники обязательны' });
    }

    const chatId = 'chat_' + Date.now();

    db.serialize(() => {
        db.run(
            'INSERT INTO chats (id, name, type, created_by) VALUES (?, ?, ?, ?)',
            [chatId, name, type, createdBy],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка создания чата' });
                }

                // Добавляем участников
                const insertParticipant = db.prepare(
                    'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)'
                );

                participants.forEach(userId => {
                    insertParticipant.run(chatId, userId);
                });

                insertParticipant.finalize();

                res.json({ id: chatId, name, type, participants });
            }
        );
    });
});

// Отправка сообщения
app.post('/api/messages', (req, res) => {
    const { chatId, userId, text } = req.body;

    if (!chatId || !userId || !text) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const messageId = 'msg_' + Date.now();

    db.run(
        'INSERT INTO messages (id, chat_id, user_id, text) VALUES (?, ?, ?, ?)',
        [messageId, chatId, userId, text],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка отправки сообщения' });
            }

            // Получаем полную информацию о сообщении
            db.get(`
                SELECT m.*, u.username, u.display_name, u.avatar
                FROM messages m
                JOIN users u ON m.user_id = u.id
                WHERE m.id = ?
            `, [messageId], (err, message) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка получения сообщения' });
                }

                // Отправляем сообщение через WebSocket всем участникам чата
                db.all(
                    'SELECT user_id FROM chat_participants WHERE chat_id = ?',
                    [chatId],
                    (err, participants) => {
                        participants.forEach(participant => {
                            io.to(participant.user_id).emit('new_message', {
                                chatId,
                                message
                            });
                        });
                    }
                );

                res.json(message);
            });
        }
    );
});

// Загрузка аватарки
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
    const { userId } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    db.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatarUrl, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка обновления аватарки' });
            }

            res.json({ avatar: avatarUrl });
        }
    );
});

// Обновление профиля
app.put('/api/profile', (req, res) => {
    const { userId, display_name, status } = req.body;

    db.run(
        'UPDATE users SET display_name = ?, status = ? WHERE id = ?',
        [display_name, status, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Ошибка обновления профиля' });
            }

            res.json({ success: true });
        }
    );
});

// WebSocket соединения
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('Новое соединение:', socket.id);

    // Пользователь присоединяется
    socket.on('user_connected', (userId) => {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(userId);
        
        // Обновляем статус пользователя
        db.run(
            'UPDATE users SET status = ? WHERE id = ?',
            ['в сети', userId]
        );

        // Уведомляем других пользователей
        socket.broadcast.emit('user_status_changed', {
            userId,
            status: 'в сети'
        });
    });

    // Пользователь отключается
    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
            
            // Обновляем статус пользователя
            db.run(
                'UPDATE users SET status = ? WHERE id = ?',
                ['не в сети', socket.userId]
            );

            // Уведомляем других пользователей
            socket.broadcast.emit('user_status_changed', {
                userId: socket.userId,
                status: 'не в сети'
            });
        }
    });

    // Прослушивание набора сообщения
    socket.on('typing', (data) => {
        socket.to(data.chatId).emit('user_typing', {
            userId: data.userId,
            userName: data.userName,
            chatId: data.chatId
        });
    });

    socket.on('stop_typing', (data) => {
        socket.to(data.chatId).emit('user_stop_typing', {
            userId: data.userId,
            chatId: data.chatId
        });
    });
});

// Serve the main HTML file for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Wylow Messenger BETA 1.0 running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the app`);
});