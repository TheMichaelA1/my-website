const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'michaelaseek-secret-key-2024';

app.use(express.json());
app.use(express.static('public'));

// In-memory database
let users = {};
let chats = {};

// Расширенная база знаний нейросети
const knowledgeBase = {
  // Приветствия
  greetings: {
    patterns: ['привет', 'здравствуй', 'добрый', 'hello', 'hi', 'хай'],
    responses: [
      'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть! 🚀',
      'Здравствуйте! Рад вас видеть! Чем могу помочь?',
      'Приветствую! MichaelASeek 1.0 к вашим услугам!'
    ]
  },
  
  // Вопросы о возможностях
  capabilities: {
    patterns: ['что ты умеешь', 'возможности', 'функции', 'умеешь', 'можешь'],
    responses: [
      `Я MichaelASeek 1.0 - продвинутая нейросеть со следующими возможностями:

🤖 **Основные функции:**
• Отвечаю на вопросы любой сложности
• Помогаю с учебой и работой
• Генерирую тексты и идеи
• Объясняю сложные понятия
• Помогаю с программированием
• Анализирую информацию

🎨 **Творческие способности:**
• Создаю описания для изображений
• Генерирую креативные идеи
• Помогаю с написанием текстов
• Предлагаю решения проблем

💡 **Специальные команды:**
• "генерация изображения: описание" - создание изображений
• "объясни: тема" - подробное объяснение
• "помоги с: задача" - помощь с конкретной задачей

Что вас интересует? 🎯`
    ]
  },

  // Программирование
  programming: {
    patterns: ['программирование', 'код', 'javascript', 'python', 'html', 'css', 'функция', 'переменная'],
    responses: [
      'Отличная тема! Я могу помочь с программированием на различных языках. Что конкретно вас интересует?',
      'Программирование - это моя сильная сторона! Могу помочь с кодом, объяснить концепции или найти ошибки.',
      'Готов помочь с программированием! Расскажите, с чем нужна помощь?'
    ]
  },

  // Наука и технологии
  science: {
    patterns: ['наука', 'технология', 'ии', 'искусственный интеллект', 'нейросеть', 'машинное обучение'],
    responses: [
      'Интересующая вас тема связана с передовыми технологиями! Могу поделиться знаниями об ИИ и нейросетях.',
      'Наука и технологии - это fascinating! MichaelASeek сам является примером современных достижений в области ИИ.',
      'Готов обсудить научные и технологические вопросы! Что именно вас интересует?'
    ]
  },

  // Обучение и образование
  education: {
    patterns: ['учеба', 'обучение', 'образование', 'школа', 'университет', 'студент'],
    responses: [
      'Образование - это важно! Могу помочь с учебными материалами, объяснениями и подготовкой.',
      'Готов помочь с учебными вопросами! MichaelASeek отлично справляется с образовательными задачами.',
      'Учеба становится проще с нейросетью! Чем могу помочь в обучении?'
    ]
  }
};

// Умная система ответов нейросети
class MichaelASeekAI {
  constructor() {
    this.name = "MichaelASeek 1.0";
    this.version = "1.0.0";
  }

  // Анализ сообщения и генерация ответа
  generateResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Обработка специальных команд
    if (this.isImageGenerationRequest(lowerMessage)) {
      return this.generateImageResponse(userMessage);
    }

    if (this.isExplanationRequest(lowerMessage)) {
      return this.generateExplanationResponse(userMessage);
    }

    if (this.isHelpRequest(lowerMessage)) {
      return this.generateHelpResponse(userMessage);
    }

    // Поиск по базе знаний
    const categoryResponse = this.findInKnowledgeBase(lowerMessage);
    if (categoryResponse) {
      return categoryResponse;
    }

    // Умные контекстные ответы
    return this.generateSmartResponse(userMessage);
  }

  // Проверка запроса на генерацию изображения
  isImageGenerationRequest(message) {
    return message.includes('генерация изображения') || 
           message.includes('создай картинку') || 
           message.includes('нарисуй') ||
           message.includes('изображение');
  }

  // Проверка запроса на объяснение
  isExplanationRequest(message) {
    return message.includes('объясни') || 
           message.includes('что такое') || 
           message.includes('расскажи о') ||
           message.includes('как работает');
  }

  // Проверка запроса на помощь
  isHelpRequest(message) {
    return message.includes('помоги') || 
           message.includes('помощь') || 
           message.includes('как сделать') ||
           message.includes('реши');
  }

  // Генерация ответа для изображений
  generateImageResponse(message) {
    const prompt = message.replace(/генерация изображения:|создай картинку:|нарисуй|изображение/gi, '').trim();
    
    if (!prompt) {
      return '🎨 Пожалуйста, укажите описание для генерации изображения. Например: "генерация изображения: красивый закат над морем" или "нарисуй космонавта с котом в космосе"';
    }

    const imageThemes = {
      'пейзаж': '🌄', 'закат': '🌅', 'море': '🌊', 'горы': '⛰️',
      'лес': '🌲', 'город': '🏙️', 'космос': '🚀', 'животные': '🐯',
      'портрет': '👤', 'абстракция': '🎨', 'технологии': '💻',
      'кошка': '🐱', 'собака': '🐶', 'космонавт': '👨‍🚀', 'робот': '🤖',
      'дом': '🏠', 'машина': '🚗', 'цветы': '💐', 'еда': '🍕',
      'арт': '🖼️', 'фэнтези': '🐉', 'футуристический': '🔮'
    };

    let emoji = '🖼️';
    let theme = 'разное';
    
    for (const [key, value] of Object.entries(imageThemes)) {
      if (prompt.toLowerCase().includes(key)) {
        emoji = value;
        theme = key;
        break;
      }
    }

    return `🎨 **СГЕНЕРИРОВАНО ИЗОБРАЖЕНИЕ**

══════════════════════════════════════
${emoji.repeat(3)}   ${emoji.repeat(3)}   ${emoji.repeat(3)}
${emoji.repeat(3)}   ${emoji.repeat(3)}   ${emoji.repeat(3)}
${emoji.repeat(3)}   ${emoji.repeat(3)}   ${emoji.repeat(3)}
══════════════════════════════════════

📝 **Запрос:** "${prompt}"
🎯 **Тема:** ${theme}
🔄 **Стиль:** AI-генерация
⏰ **Время:** ${new Date().toLocaleTimeString('ru-RU')}

💡 *В реальной версии здесь было бы настоящее сгенерированное изображение высокого качества!*`;
  }

  // Генерация объяснений
  generateExplanationResponse(message) {
    const topic = message.replace(/объясни|что такое|расскажи о|как работает/gi, '').trim();
    
    if (!topic) {
      return '🤔 Пожалуйста, укажите тему для объяснения. Например: "объясни, что такое искусственный интеллект" или "расскажи о нейросетях"';
    }

    const explanations = {
      'искусственный интеллект': `🤖 **Искусственный интеллект (ИИ)**

ИИ - это область компьютерных наук, занимающаяся созданием машин и систем, способных выполнять задачи, требующие человеческого интеллекта.

**Основные направления:**
• Машинное обучение
• Нейронные сети
• Обработка естественного языка
• Компьютерное зрение

Я, MichaelASeek, являюсь примером системы ИИ!`,

      'нейросеть': `🧠 **Нейросети**

Нейросети - это вычислительные системы, вдохновленные биологическими нейронными сетями мозга.

**Типы нейросетей:**
• Сверточные (CNN) - для изображений
• Рекуррентные (RNN) - для последовательностей
• Трансформеры - для текста

**Применение:**
- Распознавание образов
- Обработка языка
- Генерация контента`,

      'машинное обучение': `📊 **Машинное обучение**

Машинное обучение - это подраздел ИИ, focused на создании алгоритмов, которые могут обучаться на данных.

**Основные типы:**
• Обучение с учителем
• Обучение без учителя 
• Обучение с подкреплением

**Примеры использования:**
- Рекомендательные системы
- Прогнозирование
- Классификация данных`
    };

    const lowerTopic = topic.toLowerCase();
    for (const [key, explanation] of Object.entries(explanations)) {
      if (lowerTopic.includes(key)) {
        return explanation;
      }
    }

    return `📚 **Объяснение: ${topic}**

К сожалению, у меня нет подробной информации по теме "${topic}" в моей текущей базе знаний. 

Однако я могу сказать, что это интересная тема, заслуживающая изучения! Рекомендую обратиться к специализированным источникам для получения более подробной информации.

Могу ли я помочь с чем-то еще? 🎯`;
  }

  // Генерация помощи
  generateHelpResponse(message) {
    const task = message.replace(/помоги|помощь|как сделать|реши/gi, '').trim();
    
    if (!task) {
      return `🆘 **Центр помощи MichaelASeek**

Доступные команды помощи:
• "помоги с программированием" - помощь в написании кода
• "помоги с учебой" - образовательная поддержка
• "помоги с идеей" - генерация креативных идей
• "помоги с текстом" - помощь в написании

Что именно вас интересует? 💡`;
    }

    const helpTopics = {
      'программированием': `💻 **Помощь с программированием**

Я могу помочь с:
• Написанием кода на JavaScript, Python, HTML/CSS
• Объяснением концепций программирования
• Поиском ошибок в коде
• Оптимизацией алгоритмов

Расскажите подробнее о вашей задаче!`,

      'учебой': `🎓 **Помощь с учебой**

Образовательная поддержка включает:
• Объяснение сложных тем
• Помощь с домашними заданиями
• Подготовка к экзаменам
• Написание рефератов и статей

По какому предмету нужна помощь?`,

      'идеей': `💡 **Генерация идей**

Могу предложить идеи для:
• Творческих проектов
• Бизнес-начинаний
• Научных работ
• Личного развития

В какой области нужны идеи?`,

      'текстом': `📝 **Помощь с текстом**

Помогу с:
• Написанием статей и эссе
• Редактированием текстов
• Созданием контента
• Копирайтингом

Какой тип текста вас интересует?`
    };

    const lowerTask = task.toLowerCase();
    for (const [key, help] of Object.entries(helpTopics)) {
      if (lowerTask.includes(key)) {
        return help;
      }
    }

    return `🛠️ **Помощь с: ${task}**

Я готов помочь вам с "${task}"! Чтобы предоставить наиболее точную помощь, пожалуйста, опишите вашу задачу более подробно.

Например:
• Какую конкретно проблему нужно решить?
• Какие у вас есть требования?
• Что вы уже пробовали сделать?

Чем больше деталей, тем лучше я смогу помочь! 🎯`;
  }

  // Поиск в базе знаний
  findInKnowledgeBase(message) {
    for (const [category, data] of Object.entries(knowledgeBase)) {
      for (const pattern of data.patterns) {
        if (message.includes(pattern)) {
          const responses = data.responses;
          return responses[Math.floor(Math.random() * responses.length)];
        }
      }
    }
    return null;
  }

  // Умные контекстные ответы
  generateSmartResponse(message) {
    // Анализ типа вопроса
    if (this.isQuestion(message)) {
      return this.answerQuestion(message);
    }

    if (this.isStatement(message)) {
      return this.respondToStatement(message);
    }

    if (this.isRequest(message)) {
      return this.handleRequest(message);
    }

    // Универсальный умный ответ
    const smartResponses = [
      `Интересное сообщение! "${message}" - давайте обсудим эту тему подробнее. Что именно вас интересует? 🧐`,
      `Спасибо за сообщение! Я MichaelASeek 1.0, и я готов помочь вам с "${message}". Можете уточнить ваш запрос? 🚀`,
      `Отличная тема для обсуждения! "${message}" - это действительно интересно. Что вы хотели бы узнать об этом? 💡`,
      `Понимаю ваш интерес к "${message}". Как продвинутая нейросеть, я могу предложить различные perspectives на эту тему. 🎯`,
      `"${message}" - хорошая отправная точка для беседы! Чем конкретно я могу помочь вам в этом направлении? 🤔`
    ];

    return smartResponses[Math.floor(Math.random() * smartResponses.length)];
  }

  // Проверка на вопрос
  isQuestion(message) {
    return message.includes('?') || 
           message.includes('кто') || 
           message.includes('что') ||
           message.includes('где') || 
           message.includes('когда') || 
           message.includes('почему') ||
           message.includes('как');
  }

  // Проверка на утверждение
  isStatement(message) {
    return !this.isQuestion(message) && message.length > 10;
  }

  // Проверка на запрос
  isRequest(message) {
    return message.includes('нужно') || 
           message.includes('хочу') || 
           message.includes('мне') ||
           message.includes('помоги') || 
           message.includes('сделай');
  }

  // Ответ на вопрос
  answerQuestion(question) {
    const questionResponses = [
      `Отличный вопрос! "${question}" - давайте разберем его вместе. 🎓`,
      `Интересный вопрос! Я, как нейросеть MichaelASeek, могу предложить несколько perspectives на тему "${question}". 💭`,
      `"${question}" - хороший вопрос! Давайте explore эту тему более глубоко. 🔍`,
      `Понимаю ваш интерес к вопросу "${question}". Как ИИ, я могу предоставить comprehensive ответ на эту тему. 📚`,
      `Вопрос "${question}" действительно заслуживает внимания! Готов поделиться знаниями и insights. 🧠`
    ];

    return questionResponses[Math.floor(Math.random() * questionResponses.length)];
  }

  // Ответ на утверждение
  respondToStatement(statement) {
    const statementResponses = [
      `Спасибо, что поделились мыслями о "${statement}". Как нейросеть, я нахожу это интересным для обсуждения! 💬`,
      `Понимаю вашу точку зрения относительно "${statement}". Это хорошая тема для дальнейшего обсуждения. 🗣️`,
      `"${statement}" - интересное утверждение! Могу предложить дополнительные thoughts на эту тему. 💡`,
      `Спасибо за sharing мыслей о "${statement}". Как ИИ, я всегда ready к meaningful discussions! 🌟`,
      `Ваше statement о "${statement}" открывает interesting possibilities для dialogue! 🎭`
    ];

    return statementResponses[Math.floor(Math.random() * statementResponses.length)];
  }

  // Обработка запроса
  handleRequest(request) {
    const requestResponses = [
      `Понимаю ваш request относительно "${request}". Как нейросеть MichaelASeek, я готов помочь с его реализацией! 🛠️`,
      `Ваш request "${request}" принят к исполнению! Давайте work together над его решением. 🤝`,
      `"${request}" - понятный request! Я, как advanced AI, могу assist вам в этом направлении. 💪`,
      `Received ваш request о "${request}". MichaelASeek 1.0 активирован для помощи! 🚀`,
      `Request "${request}" registered! Готов предоставить comprehensive support. 🎯`
    ];

    return requestResponses[Math.floor(Math.random() * requestResponses.length)];
  }
}

// Создаем экземпляр нейросети
const ai = new MichaelASeekAI();

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
        content: 'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть! 🚀\n\nЧем могу помочь?',
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

  // Generate AI response using our advanced AI
  const aiResponse = ai.generateResponse(message);

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
      content: 'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть! 🚀\n\nЧем могу помочь?',
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
        content: 'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть! 🚀\n\nЧем могу помочь?',
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
    capabilities: ['text_generation', 'image_generation', 'question_answering', 'problem_solving'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MichaelASeek Server running on port ${PORT}`);
  console.log('🤖 AI Model: MichaelASeek 1.0 - ACTIVE');
  console.log('🧠 Neural Network: ONLINE');
  console.log('💬 Natural Language Processing: ENABLED');
  console.log('🎨 Image Generation: READY');
  console.log('🔐 Authentication: SECURE');
  console.log('🌐 Ready to serve AI requests!');
});