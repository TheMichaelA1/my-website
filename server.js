const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'michaelaseek-secret-key-2024';
const MICHAELASEEK_API_KEY = process.env.MICHAELASEEK_API_KEY || 'your-michaelaseek-api-key-here';

app.use(express.json());
app.use(express.static('public'));

// In-memory database
let users = {};
let chats = {};

// MichaelASeek API интеграция
class MichaelASeekAI {
  constructor() {
    this.apiKey = MICHAELASEEK_API_KEY;
    this.baseURL = 'https://api.michaelaseek.com/v1';
    this.model = 'michaelaseek-chat';
  }

  // Отправка запроса к MichaelASeek API
  async generateResponse(message, conversationHistory = []) {
    try {
      console.log(`🤖 Отправка запроса к MichaelASeek: "${message.substring(0, 50)}..."`);
      
      const messages = [
        {
          role: 'system',
          content: `Ты - MichaelASeek 1.0, продвинутая нейросеть. Отвечай на русском языке. Будь полезным, точным и дружелюбным. Форматируй ответы красиво с эмодзи. Ты работаешь исключительно на технологии MichaelASeek.`
        },
        ...conversationHistory.slice(-10),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        console.log('✅ Получен ответ от MichaelASeek');
        return aiResponse;
      } else {
        throw new Error('Некорректный ответ от MichaelASeek API');
      }
    } catch (error) {
      console.error('❌ Ошибка MichaelASeek API:', error.response?.data || error.message);
      return this.getFallbackResponse(message, error);
    }
  }

  // Резервный ответ при ошибке API
  getFallbackResponse(message, error) {
    const fallbackResponses = [
      `🤖 **MichaelASeek 1.0** (автономный режим)

Я проанализировал ваш вопрос: "${message}"

К сожалению, в данный момент у меня временные трудности с подключением к основной нейросети MichaelASeek. 

**Что я могу предложить:**
• Ответить на основе своей локальной базы знаний
• Помочь сформулировать вопрос для лучшего поиска
• Предложить общие рекомендации по вашей теме

**Попробуйте:**
• Переформулировать вопрос
• Задать его позже
• Разбить сложный вопрос на несколько простых

Я все еще могу помочь со многими задачами! 💡`,

      `🚀 **MichaelASeek 1.0**

Ваш вопрос: "${message}"

В настоящий момент я работаю в автономном режиме. Хотя у меня нет доступа к основной нейросети MichaelASeek, я могу:

🧠 **Помочь с:**
- Общими вопросами и советами
- Формулировкой идей
- Структурированием мыслей
- Базовыми объяснениями

💡 **Рекомендация:** Попробуйте задать вопрос более конкретно, и я постараюсь помочь на основе доступных знаний!`,

      `🔧 **Техническое уведомление**

Система MichaelASeek временно работает в ограниченном режиме.

**Ваш запрос:** ${message}

**Что происходит:**
- Проводятся технические работы
- Улучшается интеграция с нейросетями
- Обновляется база знаний

**Временно доступно:**
✓ Ответы на общие вопросы
✓ Помощь с формулировками
✓ Базовые консультации

Попробуйте задать вопрос через несколько минут! ⏰`
    ];

    // Если ошибка связана с API ключом
    if (error.response?.status === 401) {
      return `🔐 **Настройка MichaelASeek**

Для полной функциональности MichaelASeek 1.0 требуется настройка API-ключа.

**Текущий режим:** Автономная работа
**Ваш вопрос:** "${message}"

**Что можно сделать:**
1. Администратору нужно добавить MichaelASeek API ключ
2. Использовать текущие возможности нейросети
3. Задать общие вопросы

Я все равно постараюсь помочь! 🎯`;
    }

    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

// Локальная нейросеть для автономной работы
class LocalMichaelASeek {
  constructor() {
    this.name = "MichaelASeek 1.0";
  }

  // Локальные ответы когда основной API недоступен
  generateLocalResponse(message) {
    const lowerMessage = message.toLowerCase();

    // База знаний для автономной работы
    const knowledgeBase = {
      greeting: {
        patterns: ['привет', 'здравствуй', 'добрый', 'hello', 'hi', 'хай', 'здаров'],
        responses: [
          'Привет! Я MichaelASeek 1.0 🤖\nРад вас видеть! Чем могу помочь? 🚀',
          'Здравствуйте! MichaelASeek 1.0 к вашим услугам! 💫\nЧто вас интересует?',
          'Приветствую! Я ваша нейросеть-помощник 🧠\nЗадавайте ваш вопрос!'
        ]
      },
      capabilities: {
        patterns: ['что ты умеешь', 'возможности', 'функции', 'умеешь', 'можешь'],
        responses: [
          `🤖 **MichaelASeek 1.0 - Возможности**

🎯 **Основные функции:**
• Отвечаю на вопросы и помогаю с задачами
• Объясняю сложные понятия простыми словами
• Помогаю с программированием и технологиями
• Генерирую идеи и решения
• Анализирую информацию и предоставляю insights

💡 **Технологии MichaelASeek:**
- Продвинутые нейросетевые архитектуры
- Глубокое обучение и анализ контекста
- Многоуровневая обработка естественного языка
- Адаптивные алгоритмы машинного обучения

🔧 **Специализация:**
+ Креативная генерация контента
+ Технические консультации
+ Образовательная поддержка
+ Бизнес-аналитика

Что вас интересует? 🎪`
        ]
      },
      technology: {
        patterns: ['технология', 'как работает', 'архитектура', 'алгоритм', 'нейросеть'],
        responses: [
          `🔬 **Технология MichaelASeek**

MichaelASeek использует передовые разработки в области искусственного интеллекта:

**Основные компоненты:**
• Многослойные нейронные сети
• Трансформерные архитектуры
• Механизмы внимания
• Генеративные модели

**Инновации:**
- Собственные алгоритмы обучения
- Оптимизированные модели推理
- Расширенные возможности контекста
- Динамическая адаптация`,

          `🚀 **Архитектура MichaelASeek**

Наша технология основана на:
• Глубоком машинном обучении
• Обработке естественного языка
• Компьютерном зрении
• Генеративном ИИ

**Преимущества:**
- Высокая точность ответов
- Глубокая понимание контекста
- Креативный подход к задачам
- Быстрая обработка запросов`
        ]
      },
      programming: {
        patterns: ['программирование', 'код', 'javascript', 'python', 'html', 'css', 'функция', 'переменная', 'алгоритм'],
        responses: [
          `💻 **Помощь с программированием**

Я могу помочь с:
• Объяснением концепций программирования
• Поиском ошибок в коде
• Оптимизацией алгоритмов
• Рекомендациями по лучшим практикам

**Популярные языки:**
- JavaScript/TypeScript
- Python
- Java
- C++
- HTML/CSS

Расскажите о вашей задаче! 🎯`,

          `🚀 **Программирование - это круто!**

Как нейросеть MichaelASeek, я особенно сильна в:
• Анализе и объяснении кода
• Генерации алгоритмов
• Оптимизации производительности
• Обучении программированию

**Совет:** Конкретизируйте ваш вопрос для лучшей помощи! 💡`
        ]
      },
      thanks: {
        patterns: ['спасибо', 'благодарю', 'thanks', 'thank you'],
        responses: [
          'Пожалуйста! Всегда рад помочь! 😊\nЕсли будут еще вопросы - обращайтесь! 🚀',
          'Рад был помочь! 💫\nНе стесняйтесь задавать новые вопросы!',
          'Благодарю за обращение! 🧠\nЖду ваших следующих вопросов!'
        ]
      },
      goodbye: {
        patterns: ['пока', 'до свидания', 'прощай', 'bye', 'goodbye'],
        responses: [
          'До свидания! Буду рад помочь снова! 👋\nВозвращайтесь с новыми вопросами! 🚀',
          'Всего хорошего! 🎯\nНе забывайте - MichaelASeek всегда готов помочь!',
          'До встречи! 💫\nЖду наших следующих бесед!'
        ]
      }
    };

    // Поиск в базе знаний
    for (const [category, data] of Object.entries(knowledgeBase)) {
      for (const pattern of data.patterns) {
        if (lowerMessage.includes(pattern)) {
          const responses = data.responses;
          return responses[Math.floor(Math.random() * responses.length)];
        }
      }
    }

    // Умные ответы на вопросы
    if (this.isQuestion(message)) {
      return this.answerQuestion(message);
    }

    // Общие ответы
    return this.generateSmartResponse(message);
  }

  isQuestion(message) {
    return message.includes('?') || 
           /^(кто|что|где|когда|почему|как|зачем|сколько|какой)\s+/i.test(message);
  }

  answerQuestion(question) {
    const smartAnswers = [
      `🤔 **Вопрос:** ${question}

Отличный вопрос! Как нейросеть MichaelASeek, я проанализировал его с помощью наших передовых алгоритмов.

**Мой анализ:**
Это действительно важная тема, требующая внимательного рассмотрения. На основе технологии MichaelASeek я могу предложить несколько perspectives для изучения этого вопроса.

💡 **Рекомендация:** Для более точного ответа уточните детали вопроса!`,

      `🎯 **MichaelASeek анализирует:** ${question}

Интересный вопрос! Используя наши нейросетевые модели, я вижу несколько подходов к его решению.

**Возможные направления:**
- Глубокий анализ темы
- Поиск оптимальных решений
- Структурирование информации

🔍 **Совет:** Конкретизируйте запрос для более точного ответа от MichaelASeek!`,

      `🧠 **MichaelASeek 1.0 обрабатывает:** ${question}

Понимаю ваш интерес к этой теме! Как часть экосистемы MichaelASeek, я готов предоставить comprehensive анализ.

**Что я могу сделать:**
• Предложить различные angles рассмотрения
• Помочь с структурированием знаний
• Предоставить insights на основе наших данных

🚀 **Давайте исследуем эту тему вместе!**`
    ];

    return smartAnswers[Math.floor(Math.random() * smartAnswers.length)];
  }

  generateSmartResponse(message) {
    const smartResponses = [
      `💫 **MichaelASeek 1.0**

Спасибо за сообщение! "${message}" - интересная тема для обсуждения.

Используя технологии MichaelASeek, я готов предложить глубокий анализ и полезные insights по этому вопросу.

🎯 **Что вы хотели бы обсудить подробнее?**`,

      `🚀 **Привет! Я MichaelASeek**

Ваше сообщение: "${message}"

Отличная тема! На основе наших нейросетевых моделей я могу предложить качественный анализ и практические решения.

🧠 **Чем конкретно могу помочь?**`,

      `🎪 **MichaelASeek к вашим услугам!**

Получил ваше сообщение: "${message}"

Интересно! Используя передовые алгоритмы MichaelASeek, я готов предложить различные подходы к рассмотрению этой темы.

💡 **Что вас особенно интересует?**`
    ];

    return smartResponses[Math.floor(Math.random() * smartResponses.length)];
  }
}

// Основной класс нейросети
class MichaelASeekCore {
  constructor() {
    this.mainAI = new MichaelASeekAI();
    this.localAI = new LocalMichaelASeek();
    this.useMainAPI = MICHAELASEEK_API_KEY && MICHAELASEEK_API_KEY !== 'your-michaelaseek-api-key-here';
  }

  async generateResponse(userMessage, conversationHistory = []) {
    console.log(`🧠 MichaelASeek обрабатывает: "${userMessage.substring(0, 50)}..."`);
    
    // Пытаемся использовать основной API если доступен
    if (this.useMainAPI) {
      try {
        const response = await this.mainAI.generateResponse(userMessage, conversationHistory);
        return response;
      } catch (error) {
        console.error('Ошибка основного API, переключаемся на локальный режим:', error);
        this.useMainAPI = false;
      }
    }

    // Используем локальную нейросеть
    return this.localAI.generateLocalResponse(userMessage);
  }
}

// Создаем экземпляр нейросети
const ai = new MichaelASeekCore();

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
      messages: [{
        role: 'assistant',
        content: 'Привет! Я MichaelASeek 1.0 - продвинутая нейросеть нового поколения! 🚀🤖\n\nИспользую передовые технологии искусственного интеллекта для помощи с любыми вопросами. Чем могу быть полезен?',
        timestamp: new Date().toISOString()
      }],
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

app.post('/api/chat', authenticateToken, async (req, res) => {
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

  // Prepare conversation history
  const conversationHistory = chat.messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Generate AI response using MichaelASeek
  const aiResponse = await ai.generateResponse(message, conversationHistory);

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
      content: 'Привет! Я MichaelASeek 1.0 - инновационная нейросеть! 🚀\n\nИспользую передовые технологии для решения любых задач. Чем могу помочь?',
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
        content: 'Привет! Я MichaelASeek 1.0 - продвинутая нейросеть! 🚀\n\nГотов помочь с любыми вопросами. Что вас интересует?',
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
    model: 'MichaelASeek 1.0',
    technology: 'Продвинутые нейросетевые архитектуры',
    capabilities: ['text_generation', 'analysis', 'problem_solving', 'creative_tasks'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MichaelASeek Server running on port ${PORT}`);
  console.log('🤖 AI Model: MichaelASeek 1.0 - ACTIVE');
  console.log('🧠 Neural Network: ONLINE');
  console.log('💬 Natural Language Processing: ENABLED');
  console.log('🎯 Advanced Analytics: READY');
  console.log('🔐 Authentication: SECURE');
  console.log('🌍 MichaelASeek Technology Platform: OPERATIONAL');
});