const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino1337win';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    login: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 1000 },
    registrationDate: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false },
    totalWagered: { type: Number, default: 0 },
    totalWinnings: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// Game History Schema
const gameHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gameType: { type: String, required: true },
    betAmount: { type: Number, required: true },
    winAmount: { type: Number, default: 0 },
    outcome: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const GameHistory = mongoose.model('GameHistory', gameHistorySchema);

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

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ login }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User with this login or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            login,
            email,
            password: hashedPassword,
            balance: 1000 // Starting balance
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, login: user.login },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
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

        // Find user by login or email
        const user = await User.findOne({
            $or: [{ login }, { email: login }]
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id, login: user.login },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
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
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
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

// Roulette game endpoint
app.post('/api/roulette/bet', authenticateToken, async (req, res) => {
    try {
        const { bets, totalAmount } = req.body;
        const userId = req.user.userId;

        // Validation
        if (totalAmount < 10 || totalAmount > 1000000) {
            return res.status(400).json({ error: 'Bet amount must be between 10 and 1,000,000' });
        }

        const user = await User.findById(userId);
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

        // Add winnings to balance
        if (totalWin > 0) {
            user.balance += totalWin;
            user.totalWinnings += totalWin;
        }

        await user.save();

        // Save game history
        const gameHistory = new GameHistory({
            userId: user._id,
            gameType: 'roulette',
            betAmount: totalAmount,
            winAmount: totalWin,
            outcome: totalWin > 0 ? 'win' : 'loss',
            details: {
                winningNumber,
                winningColor,
                bets,
                winDetails
            }
        });
        await gameHistory.save();

        res.json({
            winningNumber,
            winningColor,
            totalWin,
            winDetails,
            newBalance: user.balance,
            betId: gameHistory._id
        });

    } catch (error) {
        console.error('Roulette bet error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin routes
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 1, login: 1, email: 1, balance: 1, registrationDate: 1, lastLogin: 1 })
            .sort({ registrationDate: -1 });

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

        const user = await User.findByIdAndUpdate(
            userId,
            { balance: newBalance },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Balance updated successfully', user });

    } catch (error) {
        console.error('Admin balance update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Socket.io for real-time features
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_roulette', (userData) => {
        socket.join('roulette');
        socket.emit('roulette_update', { message: 'Joined roulette room' });
    });

    socket.on('place_roulette_bet', (betData) => {
        // Broadcast bet to other players
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

// Utility function
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎰 1337Win Casino Server running on port ${PORT}`);
    console.log(`📍 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔐 Admin password: 7620193658293658201164992485193`);
});

module.exports = app;