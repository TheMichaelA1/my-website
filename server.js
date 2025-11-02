const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const DATA_FILE = './casino_data.json';

// АДМИН ПАРОЛЬ - НЕ МЕНЯТЬ В HTML!
const ADMIN_PASSWORD_HASH = '$2a$10$8K1p/a0dRTlR0.2Z0Q1ZQOQY9QY9QY9QY9QY9QY9QY9QY9QY9QY9QY';

// Initialize data
let casinoData = {
    users: [],
    gameHistory: [],
    adminSessions: {}
};

// Load data from file
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            casinoData = JSON.parse(data);
            console.log('Data loaded from file');
        }
    } catch (error) {
        console.log('No data file found, starting fresh');
    }
}

// Save data to file
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(casinoData, null, 2));
        console.log('Data saved to file');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Initialize data
loadData();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Helper functions
function findUserByLoginOrEmail(login) {
    return casinoData.users.find(u => u.login === login || u.email === login);
}

function generateUserId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateAdminSession() {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (60 * 60 * 1000);
    casinoData.adminSessions[sessionId] = { expiresAt };
    saveData();
    return sessionId;
}

function validateAdminSession(sessionId) {
    const session = casinoData.adminSessions[sessionId];
    if (!session) return false;
    
    if (Date.now() > session.expiresAt) {
        delete casinoData.adminSessions[sessionId];
        saveData();
        return false;
    }
    
    return true;
}

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Admin auth middleware
function authenticateAdmin(req, res, next) {
    const sessionId = req.headers['x-admin-session'];
    
    if (!sessionId || !validateAdminSession(sessionId)) {
        return res.status(403).json({ success: false, error: 'Invalid admin session' });
    }
    next();
}

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    try {
        const { password } = req.body || {};

        if (!password) {
            return res.status(400).json({ success: false, error: 'Password required' });
        }

        const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        
        if (!isValid) {
            return res.status(403).json({ success: false, error: 'Invalid admin password' });
        }

        const sessionId = generateAdminSession();
        
        res.json({
            success: true,
            message: 'Admin access granted',
            sessionId
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { login, password, email } = req.body || {};

        if (!login || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Все поля обязательны для заполнения' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Пароль должен быть не менее 6 символов' 
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный формат email' 
            });
        }

        const existingUserByLogin = casinoData.users.find(u => u.login === login);
        const existingUserByEmail = casinoData.users.find(u => u.email === email);
        
        if (existingUserByLogin) {
            return res.status(400).json({ 
                success: false, 
                error: 'Пользователь с таким логином уже существует' 
            });
        }

        if (existingUserByEmail) {
            return res.status(400).json({ 
                success: false, 
                error: 'Пользователь с такой почтой уже существует' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: generateUserId(),
            login: login.trim(),
            email: email.trim(),
            password: hashedPassword,
            balance: 1000, // Начальный баланс
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            totalWagered: 0,
            totalWinnings: 0
        };

        casinoData.users.push(user);
        saveData();

        const token = jwt.sign(
            { userId: user.id, login: user.login },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Регистрация успешна!',
            token,
            user: {
                id: user.id,
                login: user.login,
                email: user.email,
                balance: user.balance
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера' 
        });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body || {};

        if (!login || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Логин и пароль обязательны' 
            });
        }

        const user = findUserByLoginOrEmail(login.trim());
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Неверный пароль' 
            });
        }

        user.lastLogin = new Date().toISOString();
        saveData();

        const token = jwt.sign(
            { userId: user.id, login: user.login },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Вход выполнен успешно!',
            token,
            user: {
                id: user.id,
                login: user.login,
                email: user.email,
                balance: user.balance
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Внутренняя ошибка сервера' 
        });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    try {
        const user = casinoData.users.find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                login: user.login,
                email: user.email,
                balance: user.balance,
                registrationDate: user.registrationDate,
                totalWagered: user.totalWagered,
                totalWinnings: user.totalWinnings
            }
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Update user balance
app.put('/api/user/balance', authenticateToken, (req, res) => {
    try {
        const { balance } = req.body || {};
        const user = casinoData.users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        user.balance = parseInt(balance) || 0;
        saveData();

        res.json({
            success: true,
            message: 'Баланс обновлен',
            newBalance: user.balance
        });

    } catch (error) {
        console.error('Balance update error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Roulette game
app.post('/api/roulette/bet', authenticateToken, (req, res) => {
    try {
        const { bets, totalAmount } = req.body || {};
        const user = casinoData.users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        const amount = parseInt(totalAmount) || 0;

        if (amount < 10 || amount > 1000000) {
            return res.status(400).json({ success: false, error: 'Ставка должна быть от 10₽ до 1,000,000₽' });
        }

        if (user.balance < amount) {
            return res.status(400).json({ success: false, error: 'Недостаточно средств' });
        }

        user.balance -= amount;
        user.totalWagered += amount;

        const winningNumber = Math.floor(Math.random() * 37);
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(winningNumber);
        const winningColor = winningNumber === 0 ? 'green' : (isRed ? 'red' : 'black');

        let totalWin = 0;
        let winDetails = [];

        if (bets && Array.isArray(bets)) {
            bets.forEach(bet => {
                let winMultiplier = 0;
                
                if (bet.type === 'number' && bet.number === winningNumber) {
                    winMultiplier = 36;
                } else if (bet.type === 'color' && bet.color === winningColor) {
                    winMultiplier = 2;
                }

                if (winMultiplier > 0) {
                    const winAmount = (bet.amount || 0) * winMultiplier;
                    totalWin += winAmount;
                    winDetails.push({
                        type: bet.type,
                        amount: bet.amount,
                        multiplier: winMultiplier,
                        win: winAmount
                    });
                }
            });
        }

        if (totalWin > 0) {
            user.balance += totalWin;
            user.totalWinnings += totalWin;
        }

        const gameRecord = {
            id: generateUserId(),
            userId: user.id,
            userLogin: user.login,
            gameType: 'roulette',
            betAmount: amount,
            winAmount: totalWin,
            outcome: totalWin > 0 ? 'win' : 'loss',
            timestamp: new Date().toISOString(),
            winningNumber,
            winningColor,
            bets: bets
        };

        casinoData.gameHistory.push(gameRecord);
        saveData();

        res.json({
            success: true,
            winningNumber,
            winningColor,
            totalWin,
            winDetails,
            newBalance: user.balance,
            betId: gameRecord.id
        });

    } catch (error) {
        console.error('Roulette bet error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Get user game history
app.get('/api/user/game-history', authenticateToken, (req, res) => {
    try {
        const userHistory = casinoData.gameHistory
            .filter(history => history.userId === req.user.userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);

        res.json({ success: true, history: userHistory });

    } catch (error) {
        console.error('Game history error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    try {
        const usersData = casinoData.users.map(user => ({
            id: user.id,
            login: user.login,
            email: user.email,
            balance: user.balance,
            registrationDate: user.registrationDate,
            lastLogin: user.lastLogin,
            totalWagered: user.totalWagered,
            totalWinnings: user.totalWinnings
        }));

        res.json({ success: true, users: usersData });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

app.put('/api/admin/users/:userId/balance', authenticateAdmin, (req, res) => {
    try {
        const { userId } = req.params;
        const { newBalance } = req.body || {};

        const user = casinoData.users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        user.balance = parseInt(newBalance) || 0;
        saveData();

        res.json({ 
            success: true,
            message: 'Баланс обновлен успешно', 
            user: {
                id: user.id,
                login: user.login,
                balance: user.balance
            }
        });

    } catch (error) {
        console.error('Admin balance update error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'OK', 
        message: '1337Win Casino Server is running',
        usersCount: casinoData.users.length,
        timestamp: new Date().toISOString()
    });
});

// Utility function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Что-то пошло не так!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint не найден: ' + req.url });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎰 1337Win Casino Server запущен на порту ${PORT}`);
    console.log(`📍 API доступен по http://localhost:${PORT}/api`);
    console.log(`🔐 Админ система: ЗАЩИЩЕНА`);
    console.log(`👥 Пользователей: ${casinoData.users.length}`);
    console.log(`💰 Начальный баланс: 1000₽`);
    console.log(`💾 Данные сохраняются в: ${DATA_FILE}`);
});