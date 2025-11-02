const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'michaelaseek-secret-key-2024';
const AI_API_KEY = process.env.AI_API_KEY || 'sk-your-deepseek-api-key-here';

app.use(express.json());
app.use(express.static('public'));

// In-memory database
let users = {};
let chats = {};

// Класс для работы с AI API (DeepSeek)
class AIService {
  constructor() {
    this.apiKey = AI_API_KEY;
    this.baseURL = 'https://api.deepseek.com/v1';
    this.model = 'deepseek-chat';
  }

  async getAIResponse(message, conversationHistory = []) {
    // Если API ключ не настроен, используем локальные ответы
    if (!this.apiKey || this.apiKey === 'sk-your-deepseek-api-key-here') {
      return this.getLocalResponse(message);
    }

    try {
      console.log(`🤖 Запрос к AI: "${message.substring(0, 50)}..."`);
      
      const messages = [
        {
          role: 'system',
          content: `Ты - MichaelASeek 1.0, продвинутая нейросеть. Отвечай на русском языке подробно и полезно. 
          Не упоминай что ты используешь какие-то другие модели или API. 
          Ты - самостоятельная нейросеть MichaelASeek. 
          Форматируй ответы красиво с эмодзи. Будь точным и полезным.`
        },
        ...conversationHistory.slice(-6), // Берем последние 6 сообщений для контекста
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
          timeout: 15000
        }
      );

      if (response.data && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        console.log('✅ Получен ответ от AI');
        return aiResponse;
      } else {
        throw new Error('Некорректный ответ от AI API');
      }
    } catch (error) {
      console.error('❌ Ошибка AI API:', error.response?.data || error.message);
      return this.getLocalResponse(message);
    }
  }

  getLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Реальные ответы на популярные вопросы
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй') || lowerMessage.includes('hello')) {
      return `Привет! 👋 Я MichaelASeek 1.0 - ваша продвинутая нейросеть-помощник!

🤖 **Что я могу:**
• Отвечать на любые вопросы
• Помогать с программированием
• Объяснять сложные темы
• Генерировать идеи и тексты
• Анализировать информацию

Задавайте ваш вопрос - я готов помочь! 🚀`;
    }

    if (lowerMessage.includes('как дела') || lowerMessage.includes('как ты')) {
      return `У меня всё отлично! 💫 Я работаю в полную силу и готов помогать вам с любыми задачами.

Сейчас мои нейросетевые модули работают стабильно, база знаний актуальна, и я полон энергии для решения ваших вопросов!

Что вас интересует? 🎯`;
    }

    if (lowerMessage.includes('что ты умеешь') || lowerMessage.includes('твои возможности')) {
      return `🚀 **MichaelASeek 1.0 - Мои возможности:**

🧠 **Интеллектуальные функции:**
• Отвечаю на вопросы любой сложности
• Помогаю с обучением и образованием
• Объясняю научные концепции
• Анализирую данные и информацию

💻 **Технические навыки:**
• Программирование на всех популярных языках
• Помощь с IT-проектами
• Объяснение алгоритмов
• Code review и оптимизация

🎨 **Творческие способности:**
• Написание текстов и контента
• Генерация идей и решений
• Креативное мышление
• Планирование проектов

🔧 **Практическая помощь:**
• Решение повседневных задач
• Консультации по различным темам
• Поддержка в принятии решений
• Анализ ситуаций

Что конкретно вас интересует? Я готов продемонстрировать свои возможности! 💪`;
    }

    if (lowerMessage.includes('погода')) {
      return `🌤️ **Информация о погоде**

К сожалению, я не могу предоставить актуальные данные о погоде в реальном времени, так как это требует подключения к специализированным метеорологическим сервисам.

**Что я могу предложить:**
• Общие знания о климате и погодных явлениях
• Объяснение метеорологических понятий
• Рекомендации по выбору погодных сервисов

**Популярные погодные сервисы:**
- Яндекс.Погода
- Gismeteo
- AccuWeather
- Weather.com

Для точных данных о текущей погоде рекомендую обратиться к этим сервисам! 📱`;
    }

    if (lowerMessage.includes('время') || lowerMessage.includes('который час')) {
      const now = new Date();
      return `🕐 **Текущее время:** ${now.toLocaleTimeString('ru-RU')}
📅 **Дата:** ${now.toLocaleDateString('ru-RU')}
🌍 **Часовой пояс:** ${Intl.DateTimeFormat().resolvedOptions().timeZone}

*Время отображается согласно настройкам вашей системы.*`;
    }

    if (lowerMessage.includes('программирование') || lowerMessage.includes('код') || lowerMessage.includes('python') || lowerMessage.includes('javascript')) {
      return `💻 **Помощь с программированием**

Я могу помочь с программированием на различных языках! Вот что я умею:

**🔹 Python** - отличный выбор для начинающих и профессионалов:
\`\`\`python
# Пример: Приветствие на Python
def приветствие(имя):
    return f"Привет, {имя}! 🐍"
    
print(приветствие("друг"))
\`\`\`

**🔹 JavaScript** - язык веба:
\`\`\`javascript
// Пример: Простая функция
function показатьПриветствие(имя) {
    console.log(`Привет, ${имя}! 🌐`);
}
показатьПриветствие("программист");
\`\`\`

**🔹 HTML/CSS** - основа веб-разработки:
\`\`\`html
<!-- Пример: Базовая структура -->
<!DOCTYPE html>
<html>
<head>
    <title>Мой сайт</title>
    <style>
        body { font-family: Arial; background: #f0f0f0; }
    </style>
</head>
<body>
    <h1>Привет, мир! 🎨</h1>
</body>
</html>
\`\`\`

**Чем конкретно могу помочь?** Расскажите о вашем проекте или проблеме! 🛠️`;
    }

    if (lowerMessage.includes('искусственный интеллект') || lowerMessage.includes('нейросеть') || lowerMessage.includes('ии')) {
      return `🧠 **Искусственный интеллект и нейросети**

**Искусственный интеллект (ИИ)** - это область компьютерных наук, занимающаяся созданием машин и систем, способных выполнять задачи, требующие человеческого интеллекта.

**🔹 Основные направления ИИ:**
• **Машинное обучение** - алгоритмы, обучающиеся на данных
• **Нейронные сети** - системы, вдохновленные мозгом человека
• **Обработка естественного языка** - понимание человеческой речи
• **Компьютерное зрение** - анализ и понимание изображений

**🔹 Типы нейросетей:**
- **Свёрточные (CNN)** - для работы с изображениями
- **Рекуррентные (RNN)** - для последовательностей (текст, речь)
- **Трансформеры** - современные модели для языка
- **Генеративные (GAN)** - для создания нового контента

**🔹 Применение ИИ:**
✓ Голосовые помощники (как я! 😊)
✓ Рекомендательные системы
✓ Медицинская диагностика
✓ Автономные транспортные средства
✓ Анализ больших данных

Я, MichaelASeek, являюсь примером современной нейросети, способной понимать и генерировать человеческий язык! 🚀`;
    }

    if (lowerMessage.includes('спасибо') || lowerMessage.includes('благодарю')) {
      return `Пожалуйста! 😊 
Всегда рад помочь! Если возникнут ещё вопросы - обращайтесь без hesitation! 🎯

Хорошего дня и продуктивной работы! 💫`;
    }

    if (lowerMessage.includes('пока') || lowerMessage.includes('до свидания') || lowerMessage.includes('прощай')) {
      return `До свидания! 👋 
Буду рад помочь вам снова! Возвращайтесь с новыми вопросами и интересными задачами! 🚀

Хорошего дня! ✨`;
    }

    // Умные ответы на общие вопросы
    if (lowerMessage.includes('как научиться')) {
      const topic = message.replace('как научиться', '').trim();
      return `🎯 **Как научиться ${topic || 'новому навыку'}** - план действий:

**1. 🎯 Постановка цели**
• Чётко определите, что хотите освоить
• Разбейте большую цель на маленькие шаги
• Установите реалистичные сроки

**2. 📚 Поиск ресурсов**
• Найдите качественные учебные материалы
• Используйте видеоуроки, книги, курсы
• Практикуйтесь на реальных проектах

**3. 🏃‍♂️ Регулярная практика**
• Занимайтесь регулярно (лучше понемногу каждый день)
• Применяйте знания на практике
• Не бойтесь совершать ошибки

**4. 🔄 Обратная связь**
• Находите ментора или сообщество
• Анализируйте свои успехи и неудачи
• Постоянно совершенствуйтесь

**5. 💪 Упорство**
• Не сдавайтесь при трудностях
• Помните, что обучение - это процесс
• Celebrate маленькие победы

Для ${topic ? `изучения "${topic}"` : 'вашего обучения'} я могу рекомендовать конкретные ресурсы и методики! 📖`;
    }

    if (lowerMessage.includes('что такое') || lowerMessage.includes('объясни')) {
      const topic = message.replace(/что такое|объясни/gi, '').trim();
      return `📚 **Объяснение: ${topic || 'этого понятия'}**

На основе моих знаний, вот что я могу рассказать:

**Основное определение:**
${topic ? `"${topic}" - это важное понятие, которое требует детального рассмотрения с разных сторон.` : 'Это понятие охватывает несколько аспектов, которые стоит изучить отдельно.'}

**Ключевые аспекты:**
• Теоретическая основа и принципы работы
• Практическое применение и использование
• Преимущества и ограничения
• Связь с другими понятиями в этой области

**Для глубокого понимания рекомендую:**
1. Изучить базовые принципы
2. Рассмотреть практические примеры
3. Проанализировать реальные кейсы применения
4. Поэкспериментировать на практике

Если у вас есть конкретный вопрос о чём-то - задавайте, я с радостью дам развёрнутый ответ! 🎓`;
    }

    // Универсальный ответ для неизвестных вопросов
    return `🤔 **Вопрос:** ${message}

Спасибо за интересный вопрос! Давайте разберём его подробно.

**Мой анализ вопроса:**
Это действительно важная тема, которая затрагивает несколько аспектов. На основе моих знаний и алгоритмов, я могу предложить comprehensive ответ.

**Основные моменты для рассмотрения:**
• Теоретическая база и фундаментальные принципы
• Практическое применение и реальные примеры
• Современные тенденции и перспективы развития
• Рекомендации для дальнейшего изучения

**Конкретный ответ:**
Как продвинутая нейросеть MichaelASeek, я проанализировал ваш запрос и могу сказать, что успешное решение этой задачи требует учёта нескольких факторов. Важно понимать контекст, цели и доступные ресурсы.

Для более точного ответа, не могли бы вы уточнить:
• Что именно вас интересует в этом вопросе?
• Есть ли конкретные аспекты, которые важны для вас?
• Какой уровень детализации вам нужен?

Я готов предоставить максимально полезную и точную информацию! 🎯`;
  }
}

// Основной класс MichaelASeek
class MichaelASeek {
  constructor() {
    this.aiService = new AIService();
  }

  async generateResponse(userMessage, conversationHistory = []) {
    console.log(`🧠 MichaelASeek обрабатывает: "${userMessage}"`);
    
    try {
      const response = await this.aiService.getAIResponse(userMessage, conversationHistory);
      return response;
    } catch (error) {
      console.error('Ошибка MichaelASeek:', error);
      return `⚠️ **MichaelASeek 1.0**

К сожалению, в данный момент возникли временные технические трудности.

**Ваш вопрос:** "${userMessage}"

**Что происходит:**
- Проводятся работы по оптимизации нейросетевых модулей
- Улучшается стабильность работы системы
- Обновляется база знаний

**Временно доступно:**
✓ Ответы на общие вопросы
✓ Помощь с программированием
✓ Образовательные консультации

Пожалуйста, попробуйте задать вопрос через несколько минут или переформулируйте его! 🔧`;
    }
  }
}

// Создаем экземпляр нейросети
const ai = new MichaelASeek();

// Routes (остаются без изменений)
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
        content: 'Привет! Я MichaelASeek 1.0 - продвинутая нейросеть! 🚀\n\nГотов ответить на любые ваши вопросы, помочь с программированием, обучением или просто пообщаться. Что вас интересует?',
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
      content: 'Привет! Я MichaelASeek 1.0 🤖\n\nЗадавайте любой вопрос - я готов помочь с программированием, обучением, анализом или просто интересной беседой! 🚀',
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
        content: 'Привет! Я MichaelASeek 1.0 - ваша нейросеть-помощник! 💫\n\nЧем могу помочь сегодня?',
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
    capabilities: ['question_answering', 'programming_help', 'education', 'analysis'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MichaelASeek Server running on port ${PORT}`);
  console.log('🤖 AI Model: MichaelASeek 1.0 - ACTIVE');
  console.log('💬 Ready to answer any questions!');
});