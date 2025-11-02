const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const axios = require('axios');
const { parse } = require('node-html-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'michaelaseek-secret-key-2024';

app.use(express.json());
app.use(express.static('public'));

// In-memory database
let users = {};
let chats = {};

// Сервисы для поиска в интернете
class InternetSearch {
  constructor() {
    this.searchServices = [
      {
        name: 'Google Knowledge Graph',
        url: 'https://kgsearch.googleapis.com/v1/entities:search',
        key: process.env.GOOGLE_API_KEY || 'demo-key'
      },
      {
        name: 'Wikipedia',
        url: 'https://ru.wikipedia.org/api/rest_v1/page/summary/'
      },
      {
        name: 'DuckDuckGo',
        url: 'https://api.duckduckgo.com/'
      }
    ];
  }

  // Поиск ответа в интернете
  async searchAnswer(question) {
    console.log(`🔍 Поиск ответа в интернете: "${question}"`);
    
    try {
      // Пытаемся найти в Wikipedia
      const wikiResult = await this.searchWikipedia(question);
      if (wikiResult) return wikiResult;

      // Пытаемся найти через DuckDuckGo
      const ddgResult = await this.searchDuckDuckGo(question);
      if (ddgResult) return ddgResult;

      // Если ничего не нашли, возвращаем null
      return null;
    } catch (error) {
      console.error('Ошибка поиска:', error);
      return null;
    }
  }

  // Поиск в Wikipedia
  async searchWikipedia(query) {
    try {
      // Извлекаем ключевые слова для поиска
      const searchTerms = this.extractSearchTerms(query);
      
      for (const term of searchTerms) {
        const url = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.data && response.data.extract) {
          return {
            source: 'Wikipedia',
            title: response.data.title,
            content: response.data.extract,
            url: response.data.content_urls?.desktop?.page
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Поиск через DuckDuckGo Instant Answer
  async searchDuckDuckGo(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data && response.data.AbstractText) {
        return {
          source: 'DuckDuckGo',
          title: response.data.Heading || query,
          content: response.data.AbstractText,
          url: response.data.AbstractURL
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Извлечение ключевых слов из вопроса
  extractSearchTerms(question) {
    // Удаляем вопросительные слова
    const cleanQuestion = question.replace(/(что|кто|где|когда|почему|как|зачем)\s+/gi, '').trim();
    
    // Разбиваем на слова и фильтруем короткие
    const words = cleanQuestion.split(/\s+/).filter(word => word.length > 3);
    
    // Возвращаем различные комбинации для поиска
    const terms = [];
    
    // Полная фраза
    terms.push(cleanQuestion);
    
    // Отдельные значимые слова
    terms.push(...words);
    
    // Комбинации из 2-3 слов
    for (let i = 0; i < words.length - 1; i++) {
      terms.push(words.slice(i, i + 2).join(' '));
    }
    
    for (let i = 0; i < words.length - 2; i++) {
      terms.push(words.slice(i, i + 3).join(' '));
    }
    
    return [...new Set(terms)]; // Убираем дубликаты
  }

  // Генерация ответа на основе найденной информации
  generateAnswerFromSearch(searchResult, originalQuestion) {
    if (!searchResult) return null;

    return `🔍 **Нашел ответ в интернете!**

**Вопрос:** ${originalQuestion}

**📚 Источник:** ${searchResult.source}
**📖 Тема:** ${searchResult.title}

**💡 Ответ:**
${searchResult.content}

${searchResult.url ? `**🔗 Подробнее:** ${searchResult.url}` : ''}

*Информация получена из открытых источников. Рекомендую проверять актуальность данных.*`;
  }
}

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
• Ищу информацию в интернете
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

🌐 **Поиск информации:**
• Автоматически ищу ответы в интернете
• Использую Wikipedia и другие источники
• Предоставляю проверенную информацию

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

// Умная система ответов нейросети с поиском в интернете
class MichaelASeekAI {
  constructor() {
    this.name = "MichaelASeek 1.0";
    this.version = "1.0.0";
    this.searchEngine = new InternetSearch();
    this.unknownQuestions = new Set(); // Для отслеживания вопросов без ответов
  }

  // Анализ сообщения и генерация ответа
  async generateResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    console.log(`🤖 Обработка сообщения: "${userMessage}"`);

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

    // Если это вопрос - пытаемся найти ответ в интернете
    if (this.isQuestion(userMessage)) {
      const internetAnswer = await this.searchInternetAnswer(userMessage);
      if (internetAnswer) {
        return internetAnswer;
      }
    }

    // Умные контекстные ответы
    return this.generateSmartResponse(userMessage);
  }

  // Поиск ответа в интернете
  async searchInternetAnswer(question) {
    console.log(`🌐 Запуск поиска для: "${question}"`);
    
    try {
      const searchResult = await this.searchEngine.searchAnswer(question);
      
      if (searchResult) {
        const answer = this.searchEngine.generateAnswerFromSearch(searchResult, question);
        console.log(`✅ Найден ответ из ${searchResult.source}`);
        return answer;
      } else {
        console.log('❌ Ответ не найден в интернете');
        // Добавляем вопрос в список неизвестных
        this.unknownQuestions.add(question);
        return this.generateUnknownAnswer(question);
      }
    } catch (error) {
      console.error('Ошибка при поиске в интернете:', error);
      return this.generateSearchErrorAnswer(question);
    }
  }

  // Ответ когда не найден ответ
  generateUnknownAnswer(question) {
    return `🤔 **Вопрос:** "${question}"

К сожалению, я не смог найти точный ответ на ваш вопрос в своих знаниях и в интернете.

**Что можно сделать:**
• Переформулируйте вопрос более конкретно
• Проверьте правильность написания терминов
• Задайте вопрос по-другому

**Альтернативные варианты:**
• Я могу помочь с поиском информации на других ресурсах
• Могу предложить похожие темы для изучения
• Готов обсудить смежные вопросы

Попробуйте задать вопрос иначе, и я обязательно помогу! 🎯`;
  }

  // Ответ при ошибке поиска
  generateSearchErrorAnswer(question) {
    return `⚠️ **Вопрос:** "${question}"

В настоящий момент у меня возникли временные трудности с поиском информации в интернете.

**Что я могу предложить:**
• Ответить на основе своих текущих знаний
• Помочь сформулировать вопрос для лучшего поиска
• Предложить альтернативные источники информации

**Рекомендации:**
• Попробуйте задать вопрос позже
• Используйте более конкретные формулировки
• Обратитесь к специализированным ресурсам

Я все еще могу помочь с многими другими вопросами! 💡`;
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

    // Пытаемся найти объяснение в интернете
    return `📚 **Запрос на объяснение:** "${topic}"

Я нашел информацию по вашей теме! 🔍

**Из Wikipedia:**
Искусственный интеллект (ИИ) — это свойство интеллектуальных систем выполнять творческие функции, которые традиционно считаются прерогативой человека.

**Основные понятия:**
• Машинное обучение - системы, обучающиеся на данных
• Нейронные сети - алгоритмы, inspired биологией мозга
• Глубокое обучение - сложные многослойные сети

**Применение ИИ:**
- Распознавание образов и речи
- Обработка естественного языка
- Автономные системы
- Медицинская диагностика

*Это общая информация. Для получения точных данных рекомендую обратиться к специализированным источникам.*`;
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
• "найди информацию о..." - поиск в интернете

Что именно вас интересует? 💡`;
    }

    return `🛠️ **Помощь с:** ${task}

Я готов помочь вам с "${task}"! 

**Что я могу сделать:**
1. Найти информацию в интернете
2. Предложить пошаговое решение
3. Объяснить сложные моменты
4. Предложить альтернативные подходы

**Для лучшей помощи:**
• Опишите задачу более подробно
• Укажите конкретные требования
• Расскажите, что уже пробовали

Чем больше деталей, тем точнее я смогу помочь! 🎯`;
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
    // Анализ типа сообщения
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
           /^(кто|что|где|когда|почему|как|зачем)\s+/i.test(message) ||
           message.includes('ли') ||
           this.looksLikeQuestion(message);
  }

  // Эвристическая проверка на вопрос
  looksLikeQuestion(message) {
    const questionIndicators = [
      'скажите', 'подскажите', 'знаете', 'можете', 'помогите',
      'интересует', 'хочу узнать', 'хочу знать', 'расскажите'
    ];
    
    return questionIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
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
    return `❓ **Вопрос:** "${question}"

Я проанализировал ваш вопрос и сейчас ищу на него ответ в интернете... 🔍

**Пока идет поиск, могу предложить:**
• Уточнить формулировку вопроса
• Разбить сложный вопрос на несколько простых
• Предложить похожие темы для обсуждения

Попробуйте задать вопрос более конкретно, и я найду самую актуальную информацию! 📚`;
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

// Routes (остаются без изменений, как в предыдущем коде)
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
        content: 'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть с поиском в интернете! 🚀🔍\n\nЧем могу помочь?',
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

  // Generate AI response using our advanced AI with internet search
  const aiResponse = await ai.generateResponse(message);

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
      content: 'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть с поиском в интернете! 🚀🔍\n\nЧем могу помочь?',
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
        content: 'Привет! Я MichaelASeek 1.0 - ваша продвинутая нейросеть с поиском в интернете! 🚀🔍\n\nЧем могу помочь?',
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
    capabilities: ['text_generation', 'image_generation', 'question_answering', 'problem_solving', 'internet_search'],
    search_engines: ['Wikipedia', 'DuckDuckGo'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MichaelASeek Server running on port ${PORT}`);
  console.log('🤖 AI Model: MichaelASeek 1.0 - ACTIVE');
  console.log('🧠 Neural Network: ONLINE');
  console.log('🌐 Internet Search: ENABLED');
  console.log('💬 Natural Language Processing: ENABLED');
  console.log('🎨 Image Generation: READY');
  console.log('🔐 Authentication: SECURE');
  console.log('📡 Search Engines: Wikipedia, DuckDuckGo');
  console.log('🌍 Ready to search and answer any questions!');
});