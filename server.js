const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// File-based database
const DATA_FILE = path.join(__dirname, 'data', 'casino-data.json');

// Initialize data storage
async function initializeData() {
    try {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        try {
            await fs.access(DATA_FILE);
        } catch {
            // File doesn't exist, create with default data
            const defaultData = {
                users: [],
                gameHistory: [],
                settings: { version: '2.0.0' }
            };
            await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
            console.log('✅ Data file created successfully');
        }
    } catch (error) {
        console.error('❌ Data initialization error:', error);
    }
}

// Data management functions
async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading data:', error);
        return { users: [], gameHistory: [], settings: {} };
    }
}

async function saveData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        // Create backup
        const backupFile = DATA_FILE + '.backup';
        await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving data:', error);
        return false;
    }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'casino1337win_secret_key_2024';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin authentication
const authenticateAdmin = (req, res, next) => {
    const adminPassword = req.headers['x-admin-password'];
    
    if (adminPassword === '7620193658293658201164992485193') {
        next();
    } else {
        res.status(403).json({ error: 'Invalid admin password' });
    }
};

// Utility function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Routes

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { login, password, email } = req.body;

        // Validation
        if (!login || !password || !email) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const data = await loadData();

        // Check if user exists
        const existingUser = data.users.find(u => u.login === login || u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this login or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = {
            id: Date.now().toString(),
            login,
            email,
            password: hashedPassword,
            balance: 1000,
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            totalWagered: 0,
            totalWinnings: 0
        };

        data.users.push(user);
        await saveData(data);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, login: user.login },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Registration successful',
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Login and password required' });
        }

        const data = await loadData();

        // Find user by login or email
        const user = data.users.find(u => u.login === login || u.email === login);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        await saveData(data);

        // Generate token
        const token = jwt.sign(
            { userId: user.id, login: user.login },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const data = await loadData();
        const user = data.users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user balance
app.put('/api/user/balance', authenticateToken, async (req, res) => {
    try {
        const { balance } = req.body;
        const userId = req.user.userId;

        const data = await loadData();
        const user = data.users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.balance = balance;
        await saveData(data);

        res.json({
            message: 'Balance updated successfully',
            newBalance: user.balance
        });

    } catch (error) {
        console.error('Balance update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Roulette game endpoint
app.post('/api/roulette/bet', authenticateToken, async (req, res) => {
    try {
        const { bets, totalAmount } = req.body;
        const userId = req.user.userId;

        // Validation
        if (totalAmount < 10 || totalAmount > 1000000) {
            return res.status(400).json({ error: 'Bet amount must be between 10 and 1,000,000' });
        }

        const data = await loadData();
        const user = data.users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.balance < totalAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
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
                } else if (bet.type === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) {
                    winMultiplier = 2;
                } else if (bet.type === 'odd' && winningNumber !== 0 && winningNumber % 2 === 1) {
                    winMultiplier = 2;
                }

                if (winMultiplier > 0) {
                    const winAmount = bet.amount * winMultiplier;
                    totalWin += winAmount;
                    winDetails.push({
                        bet: bet.type,
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
        const gameHistory = {
            id: Date.now().toString(),
            userId: user.id,
            gameType: 'roulette',
            betAmount: totalAmount,
            winAmount: totalWin,
            outcome: totalWin > 0 ? 'win' : 'loss',
            timestamp: new Date().toISOString(),
            details: {
                winningNumber,
                winningColor,
                bets,
                winDetails
            }
        };

        data.gameHistory.push(gameHistory);
        await saveData(data);

        res.json({
            winningNumber,
            winningColor,
            totalWin,
            winDetails,
            newBalance: user.balance,
            betId: gameHistory.id
        });

    } catch (error) {
        console.error('Roulette bet error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const data = await loadData();
        const users = data.users.map(user => ({
            id: user.id,
            login: user.login,
            email: user.email,
            balance: user.balance,
            password: user.password,
            registrationDate: user.registrationDate,
            lastLogin: user.lastLogin,
            totalWagered: user.totalWagered,
            totalWinnings: user.totalWinnings
        }));

        res.json({ users });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/admin/users/:userId/balance', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { newBalance } = req.body;

        const data = await loadData();
        const user = data.users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.balance = newBalance;
        await saveData(data);

        res.json({ 
            message: 'Balance updated successfully', 
            user: {
                id: user.id,
                login: user.login,
                balance: user.balance
            }
        });

    } catch (error) {
        console.error('Admin balance update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user game history
app.get('/api/game-history', authenticateToken, async (req, res) => {
    try {
        const data = await loadData();
        const userHistory = data.gameHistory
            .filter(history => history.userId === req.user.userId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50);

        res.json({ history: userHistory });

    } catch (error) {
        console.error('Game history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: '1337Win Casino Server is running',
        timestamp: new Date().toISOString()
    });
});

// Socket.io for real-time features
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_roulette', (userData) => {
        socket.join('roulette');
        socket.emit('roulette_update', { message: 'Joined roulette room' });
    });

    socket.on('place_roulette_bet', (betData) => {
        socket.to('roulette').emit('new_bet', {
            user: betData.user,
            bet: betData.bet,
            amount: betData.amount
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize and start server
async function startServer() {
    await initializeData();
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`🎰 1337Win Casino Server running on port ${PORT}`);
        console.log(`📍 API: http://localhost:${PORT}/api`);
        console.log(`🔐 Admin password: 7620193658293658201164992485193`);
        console.log(`💾 Data storage: file-based (no MongoDB required)`);
        console.log(`⚡ Socket.IO: Enabled for real-time features`);
    });
}

startServer().catch(console.error);

module.exports = app;