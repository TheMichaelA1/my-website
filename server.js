const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'casino1337win_secret_2024_secure_key';
const ADMIN_PASSWORD = '7620193658293658201164992485193';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory database (in production use real database)
let users = [];
let gameHistory = [];

// Helper functions
function findUserByLoginOrEmail(login) {
    return users.find(u => u.login === login || u.email === login);
}

function generateUserId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { login, password, email } = req.body;

        console.log('Registration attempt:', { login, email });

        // Validation
        if (!login || !password || !email) {
            return res.status(400).json({ success: false, error: 'Все поля обязательны для заполнения' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Пароль должен быть не менее 6 символов' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, error: 'Неверный формат email' });
        }

        // Check if user exists
        if (findUserByLoginOrEmail(login) || users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, error: 'Пользователь с таким логином или email уже существует' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: generateUserId(),
            login,
            email,
            password: hashedPassword,
            balance: 1000,
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            totalWagered: 0,
            totalWinnings: 0
        };

        users.push(user);
        console.log('User registered successfully:', user.login);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, login: user.login },
            JWT_SECRET,
            { expiresIn: '24h' }
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
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        console.log('Login attempt:', { login });

        if (!login || !password) {
            return res.status(400).json({ success: false, error: 'Логин и пароль обязательны' });
        }

        // Find user
        const user = findUserByLoginOrEmail(login);
        if (!user) {
            return res.status(400).json({ success: false, error: 'Пользователь не найден' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, error: 'Неверный пароль' });
        }

        // Update last login
        user.lastLogin = new Date().toISOString();

        // Generate token
        const token = jwt.sign(
            { userId: user.id, login: user.login },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('User logged in successfully:', user.login);

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
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.userId);
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
        const { balance } = req.body;
        const user = users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        user.balance = balance;

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
        const { bets, totalAmount } = req.body;
        const user = users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        // Validation
        if (totalAmount < 10 || totalAmount > 1000000) {
            return res.status(400).json({ success: false, error: 'Ставка должна быть от 10₽ до 1,000,000₽' });
        }

        if (user.balance < totalAmount) {
            return res.status(400).json({ success: false, error: 'Недостаточно средств' });
        }

        // Deduct bet amount
        user.balance -= totalAmount;
        user.totalWagered += totalAmount;

        // Generate winning number (0-36)
        const winningNumber = Math.floor(Math.random() * 37);
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(winningNumber);
        const winningColor = winningNumber === 0 ? 'green' : (isRed ? 'red' : 'black');

        // Calculate winnings
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
                    const winAmount = bet.amount * winMultiplier;
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

        // Add winnings to balance
        if (totalWin > 0) {
            user.balance += totalWin;
            user.totalWinnings += totalWin;
        }

        // Save game history
        const gameRecord = {
            id: generateUserId(),
            userId: user.id,
            userLogin: user.login,
            gameType: 'roulette',
            betAmount: totalAmount,
            winAmount: totalWin,
            outcome: totalWin > 0 ? 'win' : 'loss',
            timestamp: new Date().toISOString(),
            winningNumber,
            winningColor,
            bets: bets
        };

        gameHistory.push(gameRecord);

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

// Admin routes
app.get('/api/admin/users', (req, res) => {
    try {
        const adminPassword = req.headers['x-admin-password'];
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(403).json({ success: false, error: 'Неверный пароль администратора' });
        }

        const usersData = users.map(user => ({
            id: user.id,
            login: user.login,
            email: user.email,
            balance: user.balance,
            password: user.password, // In real app, don't send passwords
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

app.put('/api/admin/users/:userId/balance', (req, res) => {
    try {
        const adminPassword = req.headers['x-admin-password'];
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(403).json({ success: false, error: 'Неверный пароль администратора' });
        }

        const { userId } = req.params;
        const { newBalance } = req.body;

        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        user.balance = newBalance;

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

// Get game history
app.get('/api/game-history', authenticateToken, (req, res) => {
    try {
        const userHistory = gameHistory
            .filter(history => history.userId === req.user.userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50);

        res.json({ success: true, history: userHistory });

    } catch (error) {
        console.error('Game history error:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'OK', 
        message: '1337Win Casino Server is running',
        usersCount: users.length,
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
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Что-то пошло не так!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint не найден' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎰 1337Win Casino Server запущен на порту ${PORT}`);
    console.log(`📍 API доступен по http://localhost:${PORT}/api`);
    console.log(`🔐 Админ пароль: ${ADMIN_PASSWORD}`);
    console.log(`👥 Пользователей в памяти: ${users.length}`);
});

// Add some test users for development
users.push({
    id: generateUserId(),
    login: 'test',
    email: 'test@test.ru',
    password: '$2a$10$8K1p/a0dRTlR0.2Z0Q1ZQOQY9QY9QY9QY9QY9QY9QY9QY9QY9QY9QY', // password: test123
    balance: 5000,
    registrationDate: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    totalWagered: 0,
    totalWinnings: 0
});

console.log('Тестовый пользователь создан: test / test123');