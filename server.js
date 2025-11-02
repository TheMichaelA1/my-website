const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'michaelaseek-secret-key-2024';

app.use(express.json());
app.use(express.static('public'));

// In-memory database (in production use real database)
let users = {};
let chats = {};

// AI Response function - улучшенная версия
function generateAIResponse(message) {
    const responses = {
        'привет': 'Привет! Я MichaelASeek 1.0 - продвинутая нейросеть. Чем могу помочь? 🚀',
        'как дела': 'Отлично! Готов помочь вам с любыми вопросами. А у вас как дела?',
        'что ты умеешь': 'Я могу:\n• Отвечать на вопросы\n• Генерировать тексты\n• Помогать с задачами\n• Создавать изображения по описанию\n• Общаться на различные темы\n• Анализировать информацию',
        'спасибо': 'Пожалуйста! Всегда рад помочь! 😊',
        'пока': 'До свидания! Буду рад помочь снова! 👋',
        'нейросеть': 'Я - MichaelASeek 1.0, продвинутая нейросеть для решения различных задач с искусственным интеллектом.',
        'создай изображение': 'Для генерации изображения используйте команду: "генерация изображения: [ваше описание]" или просто опишите что хотите увидеть! 🎨',
        'помощь': 'Доступные команды:\n• "генерация изображения: описание" - создание изображения\n• "расскажи о..." - получить информацию\n• "помоги с..." - помощь с задачами\n• Любые вопросы и беседы!'
    };

    const lowerMessage = message.toLowerCase();
    
    // Check for exact matches
    if (responses[lowerMessage]) {
        return responses[lowerMessage];
    }

    // Smart responses based on keywords
    if (lowerMessage.includes('погода')) {
        return '🌤️ К сожалению, я не могу получить актуальные данные о погоде. Рекомендую проверить специализированные сервисы погоды.';
    }
    
    if (lowerMessage.includes('время')) {
        return `🕐 Сейчас примерно ${new Date().toLocaleTimeString('ru-RU')}. Точное время лучше уточнить в вашей системе.`;
    }
    
    if (lowerMessage.includes('помощь') || lowerMessage.includes('help')) {
        return responses['помощь'];
    }

    if (lowerMessage.includes('искусственный интеллект') || lowerMessage.includes('ии')) {
        return '🤖 Искусственный интеллект - это область компьютерных наук, занимающаяся созданием машин, способных выполнять задачи, требующие человеческого интеллекта. Я являюсь примером такой системы!';
    }

    if (lowerMessage.includes('генерация изображения') || lowerMessage.includes('создай картинку') || lowerMessage.includes('нарисуй')) {
        const prompt = message.replace(/генерация изображения:|создай картинку:|нарисуй/i, '').trim();
        if (prompt) {
            return `🖼️ ГЕНЕРАЦИЯ_ИЗОБРАЖЕНИЯ:${prompt}`;
        }
        return '🎨 Пожалуйста, укажите описание для генерации изображения. Например: "генерация изображения: красивый закат над морем" или "нарисуй космонавта с котом"';
    }

    // Contextual responses
    if (lowerMessage.includes('как') && lowerMessage.includes('сделать')) {
        return 'Интересный вопрос! Могу предложить пошаговую инструкцию. Уточните, что именно вас интересует?';
    }

    if (lowerMessage.includes('почему')) {
        return 'Хороший вопрос! Давайте разберем причины этого явления. Что конкретно вас интересует?';
    }

    if (lowerMessage.includes('что такое')) {
        const topic = message.replace('что такое', '').trim();
        return `Отличный вопрос про "${topic}"! Это интересная тема, которую стоит изучить подробнее.`;
    }

    // Creative responses for different topics
    const creativeResponses = [
        'Интересный вопрос! 💡 Могу предложить несколько идей по этой теме.',
        'Отличный вопрос! 🎯 Давайте разберем его подробнее.',
        'Понимаю ваш интерес к этой теме. Что именно вас интересует? 🤔',
        'Это важный вопрос. 🎓 Я готов помочь вам с его решением.',
        'Благодарю за вопрос! 😊 Я с радостью помогу вам разобраться.',
        'Отличная тема для обсуждения! 💬 Что вы думаете об этом?',
        'Интересная постановка вопроса! 🌟 Давайте рассмотрим разные варианты.',
        'Спасибо за обращение! 🚀 Я готов предоставить вам полезную информацию.',
        'Прекрасный вопрос! 📚 Это позволяет нам углубиться в интересную тему.',
        'Замечательно! 🎨 Давайте вместе исследуем этот вопрос.'
    ];

    return creativeResponses[Math.floor(Math.random() * creativeResponses.length)];
}

// Fake image generation 
function generateFakeImage(prompt) {
    const imageThemes = {
        'пейзаж': '🌄', 'закат': '🌅', 'море': '🌊', 'горы': '⛰️',
        'лес': '🌲', 'город': '🏙️', 'космос': '🚀', 'животные': '🐯',
        'портрет': '👤', 'абстракция': '🎨', 'технологии': '💻',
        'кошка': '🐱', 'собака': '🐶', 'космонавт': '👨‍🚀', 'робот': '🤖',
        'дом': '🏠', 'машина': '🚗', 'цветы': '💐', 'еда': '🍕'
    };

    let emoji = '🖼️';
    for (const [theme, symbol] of Object.entries(imageThemes)) {
        if (prompt.toLowerCase().includes(theme)) {
            emoji = symbol;
            break;
        }
    }

    return {
        success: true,
        image: `
🎨 СГЕНЕРИРОВАНО ИЗОБРАЖЕНИЕ:
══════════════════════════════════════
${emoji.repeat(3)}   ${emoji.repeat(3)}   ${emoji.repeat(3)}
${emoji.repeat(3)}   ${emoji.repeat(3)}   ${emoji.repeat(3)}
${emoji.repeat(3)}   ${emoji.repeat(3)}   ${emoji.repeat(3)}
══════════════════════════════════════
📝 Запрос: "${prompt}"
🎯 Тема: ${Object.keys(imageThemes).find(theme => prompt.toLowerCase().includes(theme)) || 'разное'}
⏰ Время генерации: ${new Date().toLocaleTimeString('ru-RU')}
        `.trim(),
        prompt: prompt,
        timestamp: new Date().toISOString()
    };
}

// Routes
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    if (users[username]) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Логин должен быть не менее 3 символов' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = {
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        // Create initial chat for user
        chats[username] = [{
            id: 'default_' + Date.now(),
            title: 'Мой первый чат',
            messages: [
                {
                    role: 'assistant',
                    content: 'Привет! Я MichaelASeek 1.0 - продвинутая нейросеть. Чем могу помочь? 🚀',
                    timestamp: new Date().toISOString()
                }
            ],
            createdAt: new Date().toISOString()
        }];

        const token = jwt.sign({ username }, JWT_SECRET);
        res.json({ 
            success: true, 
            token, 
            username,
            message: 'Регистрация успешна! Добро пожаловать в MichaelASeek!'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const user = users[username];
    if (!user) {
        return res.status(400).json({ error: 'Пользователь не найден' });
    }

    try {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }

        const token = jwt.sign({ username }, JWT_SECRET);
        res.json({ 
            success: true, 
            token, 
            username,
            message: 'Вход выполнен успешно!'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

app.post('/api/chat', authenticateToken, (req, res) => {
    const { message, chatId } = req.body;
    const username = req.user.username;

    if (!message) {
        return res.status(400).json({ error: 'Сообщение обязательно' });
    }

    if (!chats[username]) {
        chats[username] = [{
            id: 'default_' + Date.now(),
            title: 'Новый чат',
            messages: [],
            createdAt: new Date().toISOString()
        }];
    }

    let chat = chats[username].find(c => c.id === chatId);
    if (!chat) {
        chat = {
            id: chatId || 'chat_' + Date.now(),
            title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
            messages: [],
            createdAt: new Date().toISOString()
        };
        chats[username].push(chat);
    }

    // Add user message
    chat.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });

    // Generate AI response
    let aiResponse;
    if (message.toLowerCase().includes('генерация изображения') || 
        message.toLowerCase().includes('создай картинку') ||
        message.toLowerCase().includes('нарисуй')) {
        const prompt = message.replace(/генерация изображения:|создай картинку:|нарисуй/i, '').trim();
        const imageResult = generateFakeImage(prompt);
        aiResponse = imageResult.image;
    } else {
        aiResponse = generateAIResponse(message);
    }

    // Add AI response
    chat.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
    });

    // Update chat title if it's the first message
    if (chat.messages.length === 2) {
        chat.title = message.substring(0, 25) + (message.length > 25 ? '...' : '');
    }

    res.json({
        success: true,
        response: aiResponse,
        chatId: chat.id,
        chats: chats[username]
    });
});

app.get('/api/chats', authenticateToken, (req, res) => {
    const username = req.user.username;
    res.json({ chats: chats[username] || [] });
});

app.post('/api/chats/new', authenticateToken, (req, res) => {
    const username = req.user.username;
    
    if (!chats[username]) {
        chats[username] = [];
    }

    const newChat = {
        id: 'chat_' + Date.now(),
        title: 'Новый чат',
        messages: [{
            role: 'assistant',
            content: 'Привет! Я MichaelASeek 1.0. Чем могу помочь? 🚀',
            timestamp: new Date().toISOString()
        }],
        createdAt: new Date().toISOString()
    };

    chats[username].unshift(newChat);
    res.json({ success: true, chat: newChat, chats: chats[username] });
});

app.delete('/api/chats/:chatId', authenticateToken, (req, res) => {
    const username = req.user.username;
    const { chatId } = req.params;

    if (chats[username]) {
        chats[username] = chats[username].filter(chat => chat.id !== chatId);
    }

    // If no chats left, create a new one
    if (chats[username].length === 0) {
        chats[username].push({
            id: 'default_' + Date.now(),
            title: 'Новый чат',
            messages: [{
                role: 'assistant',
                content: 'Привет! Я MichaelASeek 1.0. Чем могу помочь? 🚀',
                timestamp: new Date().toISOString()
            }],
            createdAt: new Date().toISOString()
        });
    }

    res.json({ success: true, chats: chats[username] || [] });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'MichaelASeek AI', 
        version: '1.0',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 MichaelASeek Server running on port ${PORT}`);
    console.log('🤖 AI Model: MichaelASeek 1.0');
    console.log('🔐 Authentication: Enabled');
    console.log('🖼️ Image Generation: Enabled');
    console.log('🌐 Ready to serve AI requests!');
});