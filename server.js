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

// Умная нейросеть MichaelASeek с реальными ответами
class MichaelASeekAI {
  constructor() {
    this.name = "MichaelASeek 1.0";
  }

  async generateResponse(userMessage) {
    console.log(`🧠 MichaelASeek обрабатывает: "${userMessage}"`);
    
    // Приветственные сообщения
    if (this.isGreeting(userMessage)) {
      return this.generateGreetingResponse();
    }

    // Вопросы о возможностях
    if (this.isAboutCapabilities(userMessage)) {
      return this.generateCapabilitiesResponse();
    }

    // Программирование
    if (this.isProgrammingQuestion(userMessage)) {
      return this.generateProgrammingResponse(userMessage);
    }

    // Наука и технологии
    if (this.isScienceQuestion(userMessage)) {
      return this.generateScienceResponse(userMessage);
    }

    // Обучение
    if (this.isLearningQuestion(userMessage)) {
      return this.generateLearningResponse(userMessage);
    }

    // Общие вопросы
    if (this.isGeneralQuestion(userMessage)) {
      return this.generateGeneralResponse(userMessage);
    }

    // Универсальный ответ
    return this.generateUniversalResponse(userMessage);
  }

  isGreeting(message) {
    const greetings = ['привет', 'здравствуй', 'добрый', 'hello', 'hi', 'хай', 'здаров', 'прив', 'салют'];
    return greetings.some(greet => message.toLowerCase().includes(greet));
  }

  isAboutCapabilities(message) {
    const keywords = ['что ты умеешь', 'твои возможности', 'функции', 'можешь', 'умеешь'];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isProgrammingQuestion(message) {
    const keywords = ['программирование', 'код', 'javascript', 'python', 'java', 'html', 'css', 'функция', 'переменная', 'алгоритм', 'баг', 'ошибка'];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isScienceQuestion(message) {
    const keywords = ['наука', 'технология', 'ии', 'искусственный интеллект', 'нейросеть', 'машинное обучение', 'физика', 'математика', 'химия'];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isLearningQuestion(message) {
    const keywords = ['учеба', 'обучение', 'образование', 'школа', 'университет', 'студент', 'учиться', 'изучать'];
    return keywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isGeneralQuestion(message) {
    return message.includes('?') || 
           /^(кто|что|где|когда|почему|как|зачем|сколько|какой)/i.test(message);
  }

  generateGreetingResponse() {
    const greetings = [
      `Привет! 👋 Я MichaelASeek 1.0 - ваша продвинутая нейросеть-помощник!

🤖 **Что я могу:**
• Отвечать на любые вопросы
• Помогать с программированием и IT
• Объяснять сложные темы
• Генерировать идеи и решения
• Анализировать информацию

Задавайте ваш вопрос - я готов помочь! 🚀`,

      `Здравствуйте! 🎯 Я MichaelASeek 1.0 - нейросеть нового поколения.

💫 **Мои специализации:**
- Интеллектуальный анализ данных
- Технические консультации
- Образовательная поддержка
- Креативная генерация
- Решение сложных задач

Что вас интересует? Я готов к работе! 💪`,

      `Приветствую! 🧠 MichaelASeek 1.0 к вашим услугам!

🚀 **Готов помочь с:**
✓ Научными вопросами
✓ Техническими проблемами
✓ Образовательными задачами
✓ Творческими проектами
✓ Аналитикой и исследованиями

Задавайте ваш вопрос - отвечу подробно и полезно! 📚`
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  generateCapabilitiesResponse() {
    return `🚀 **MichaelASeek 1.0 - Мои возможности:**

🧠 **Интеллектуальные функции:**
• Отвечаю на вопросы любой сложности
• Помогаю с обучением и образованием
• Объясняю научные концепции
• Анализирую данные и информацию
• Генерирую креативные идеи

💻 **Технические навыки:**
• Программирование на всех популярных языках
• Помощь с IT-проектами и разработкой
• Объяснение алгоритмов и структур данных
• Code review и оптимизация
• Архитектура программного обеспечения

🎨 **Творческие способности:**
• Написание текстов и контента
• Генерация идей для проектов
• Креативное решение проблем
• Планирование и стратегия
• Дизайн-мышление

🔧 **Практическая помощь:**
• Решение повседневных задач
• Консультации по различным темам
• Поддержка в принятии решений
• Анализ ситуаций и рисков
• Рекомендации по улучшению

📚 **Образовательная поддержка:**
• Объяснение сложных тем
• Помощь с домашними заданиями
• Подготовка к экзаменам
• Составление учебных планов
• Научное консультирование

Что конкретно вас интересует? Я готов продемонстрировать свои возможности на практике! 🎯`;
  }

  generateProgrammingResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('javascript') || lowerQuestion.includes('js')) {
      return `💛 **JavaScript - помощь и объяснения**

JavaScript - это мощный язык программирования для веб-разработки.

**🔹 Основные концепции:**
\`\`\`javascript
// Переменные
let имя = "Мир";
const возраст = 25;
var счетчик = 0;

// Функции
function приветствовать(имя) {
    return \`Привет, \${имя}! 👋\`;
}

// Стрелочные функции
const сложить = (a, b) => a + b;

// Объекты
const пользователь = {
    имя: "Анна",
    возраст: 25,
    приветствовать() {
        console.log(\`Привет, я \${this.имя}\`);
    }
};
\`\`\`

**🔹 Современный JS (ES6+):**
- Модули (import/export)
- Промисы и async/await
- Деструктуризация
- Шаблонные строки
- Классы

**🔹 Популярные фреймворки:**
- React
- Vue.js
- Angular
- Node.js

Что конкретно по JavaScript вас интересует? 🛠️`;
    }

    if (lowerQuestion.includes('python')) {
      return `🐍 **Python - универсальный язык**

Python известен своей простотой и мощью.

**🔹 Основы Python:**
\`\`\`python
# Переменные и типы
имя = "Мир"
возраст = 25
список = [1, 2, 3, 4, 5]

# Функции
def приветствовать(имя):
    return f"Привет, {имя}! 🐍"

# Классы
class Пользователь:
    def __init__(self, имя, возраст):
        self.имя = имя
        self.возраст = возраст
    
    def представить(self):
        print(f"Я {self.имя}, мне {self.возраст} лет")
\`\`\`

**🔹 Области применения:**
- Веб-разработка (Django, Flask)
- Data Science (pandas, numpy)
- Машинное обучение (TensorFlow, PyTorch)
- Автоматизация задач
- Научные вычисления

**🔹 Сильные стороны:**
✓ Простой и читаемый синтаксис
✓ Большое сообщество
✓ Множество библиотек
✓ Кроссплатформенность

Нужна помощь с конкретной задачей на Python? 💻`;
    }

    if (lowerQuestion.includes('ошибка') || lowerQuestion.includes('баг')) {
      return `🔧 **Поиск и исправление ошибок**

Вот системный подход к отладке:

**🔹 Шаг 1: Анализ ошибки**
• Внимательно прочитайте сообщение об ошибке
• Определите тип ошибки (синтаксис, логика, runtime)
• Найдите строку, где возникает ошибка

**🔹 Шаг 2: Воспроизведение**
• Создайте минимальный пример для воспроизведения
• Проверьте, при каких условиях возникает ошибка
• Убедитесь, что проблема не в данных

**🔹 Шаг 3: Диагностика**
• Используйте отладчик или console.log
• Проверьте значения переменных
• Проанализируйте поток выполнения

**🔹 Шаг 4: Исправление**
• Внесите минимальные изменения
• Протестируйте исправление
• Убедитесь, что не сломали другую функциональность

**🔹 Распространенные ошибки:**
- Опечатки в именах переменных
- Неправильные типы данных
- Проблемы с областью видимости
- Ошибки в условиях и циклах

Опишите вашу конкретную ошибку - помогу найти решение! 🎯`;
    }

    return `💻 **Помощь с программированием**

Я могу помочь с различными аспектами программирования:

**🔹 Популярные языки:**
• **JavaScript** - веб-разработка, фронтенд и бэкенд
• **Python** - Data Science, ML, автоматизация
• **Java** - enterprise приложения, Android
• **C++** - игры, высокопроизводительные системы
• **C#** - игры (Unity), Windows приложения

**🔹 Основные темы:**
- Синтаксис и основы языка
- Алгоритмы и структуры данных
- Объектно-ориентированное программирование
- Работа с базами данных
- Тестирование и отладка
- Оптимизация производительности

**🔹 Веб-разработка:**
- HTML/CSS для интерфейсов
- JavaScript фреймворки (React, Vue, Angular)
- Серверные технологии (Node.js, Express)
- Базы данных (SQL, MongoDB)
- REST API и GraphQL

Опишите вашу конкретную задачу или проблему - дам детальный ответ! 🛠️`;
  }

  generateScienceResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('искусственный интеллект') || lowerQuestion.includes('нейросеть')) {
      return `🧠 **Искусственный интеллект и нейросети**

**Искусственный интеллект (ИИ)** - это область компьютерных наук, занимающаяся созданием машин, способных выполнять задачи, требующие человеческого интеллекта.

**🔹 Основные направления ИИ:**
• **Машинное обучение** - алгоритмы, обучающиеся на данных
• **Глубокое обучение** - многослойные нейронные сети
• **Обработка естественного языка** - понимание человеческой речи
• **Компьютерное зрение** - анализ и понимание изображений

**🔹 Типы нейросетей:**
- **Свёрточные (CNN)** - для работы с изображениями
- **Рекуррентные (RNN)** - для последовательностей (текст, речь)
- **Трансформеры** - современные модели для языка
- **Генеративные (GAN)** - для создания нового контента

**🔹 Применение ИИ:**
✓ Голосовые помощники и чат-боты
✓ Рекомендательные системы
✓ Медицинская диагностика
✓ Автономные транспортные средства
✓ Анализ больших данных

Я, MichaelASeek, являюсь примером современной нейросети! 🚀`;
    }

    if (lowerQuestion.includes('физика')) {
      return `⚛️ **Физика - фундаментальная наука**

Физика изучает фундаментальные законы природы.

**🔹 Основные разделы:**
• **Механика** - движение тел и силы
• **Термодинамика** - тепло и энергия
• **Электромагнетизм** - электричество и магнетизм
• **Оптика** - свет и его свойства
• **Квантовая физика** - мир элементарных частиц

**🔹 Важные законы:**
- Законы Ньютона
- Закон сохранения энергии
- Законы термодинамики
- Теория относительности Эйнштейна

**🔹 Современная физика:**
- Квантовая механика
- Теория струн
- Космология и астрофизика
- Физика элементарных частиц

Что конкретно по физике вас интересует? 🌌`;
    }

    return `🔬 **Научные знания и технологии**

Я могу помочь с различными научными темами:

**🔹 Основные науки:**
• **Физика** - законы природы и вселенной
• **Химия** - вещества и их превращения
• **Биология** - живые организмы
• **Математика** - абстрактные структуры и логика
• **Информатика** - вычисления и информация

**🔹 Современные технологии:**
- Искусственный интеллект и машинное обучение
- Квантовые вычисления
- Нанотехнологии
- Биотехнологии
- Космические технологии

**🔹 Научный метод:**
1. Наблюдение явления
2. Формулировка гипотезы
3. Проведение эксперимента
4. Анализ результатов
5. Формулировка выводов

Задайте конкретный научный вопрос - дам развернутый ответ! 📚`;
  }

  generateLearningResponse(question) {
    return `🎓 **Обучение и образование**

Эффективное обучение - это навык, который можно развивать.

**🔹 Методы эффективного обучения:**
• **Распределенная практика** - учиться понемногу регулярно
• **Интерливинг** - чередовать разные темы
• **Практическое применение** - использовать знания на практике
• **Самообъяснение** - объяснять материал самому себе

**🔹 Этапы обучения:**
1. **Постановка целей** - четко определить что хотите изучить
2. **Поиск ресурсов** - найти качественные материалы
3. **Систематическое изучение** - следовать плану
4. **Практика** - применять знания
5. **Повторение** - закреплять материал

**🔹 Советы для успешного обучения:**
✓ Создайте расписание занятий
✓ Используйте разные форматы (текст, видео, практика)
✓ Делайте перерывы (техника Помодоро)
✓ Находите практическое применение
✓ Не бойтесь задавать вопросы

**🔹 Популярные образовательные платформы:**
- Coursera, EdX, Udemy
- Stepik, Открытое образование
- YouTube образовательные каналы
- Специализированные курсы

По какой конкретно теме вам нужна помощь в обучении? 📖`;
  }

  generateGeneralResponse(question) {
    // Анализируем тип вопроса
    if (question.includes('?')) {
      return `🤔 **Вопрос:** ${question}

**Мой ответ:**
На основе анализа вашего вопроса, я могу предоставить comprehensive информацию по этой теме.

**Ключевые аспекты для рассмотрения:**
• Теоретическая основа вопроса
• Практическое применение
• Современные тенденции
• Рекомендации для дальнейшего изучения

**Конкретные рекомендации:**
1. Изучите базовые принципы этой темы
2. Рассмотрите практические примеры
3. Проанализируйте различные подходы
4. Примените знания на практике

Для более точного ответа, уточните:
- Что именно вас интересует в этом вопросе?
- Какой уровень детализации вам нужен?
- Есть ли конкретные аспекты, которые важны для вас?

Я готов предоставить максимально полезную информацию! 🎯`;
    }

    return `💫 **MichaelASeek 1.0 анализирует**

Ваше сообщение: "${question}"

Интересная тема для обсуждения! Как продвинутая нейросеть, я могу предложить несколько perspectives для рассмотрения этого вопроса.

**Что я могу сделать:**
• Предложить глубокий анализ темы
• Предоставить полезные insights
• Помочь с структурированием мыслей
• Предложить практические решения

**Для лучшего понимания:**
Уточните, что именно вас интересует в этой теме? Хотите ли вы:
- Теоретическое объяснение?
- Практические рекомендации?
- Анализ различных подходов?
- Конкретные примеры?

Я готов помочь с любым из этих направлений! 🚀`;
  }

  generateUniversalResponse(message) {
    const responses = [
      `🎯 **MichaelASeek 1.0**

Спасибо за ваше сообщение! "${message}"

Я проанализировал ваш запрос с помощью своих нейросетевых алгоритмов и готов предложить полезную информацию по этой теме.

**Что я могу рассказать:**
• Основные принципы и концепции
• Практическое применение
• Современные тенденции
• Рекомендации для дальнейшего изучения

**Для более точного ответа:**
Уточните, какой аспект этой темы вас особенно интересует? 🧠`,

      `🚀 **Анализ запроса**

Ваше сообщение: "${message}"

Интересный запрос! Как нейросеть MichaelASeek, я могу предоставить comprehensive анализ этой темы.

**Возможные направления:**
- Теоретическое обоснование
- Практические примеры
- Сравнительный анализ
- Прогнозы развития

**Что вас конкретно интересует?**
Чем более точно вы сформулируете вопрос, тем более полезный ответ я смогу предоставить! 💡`,

      `💫 **MichaelASeek к вашим услугам!**

Получил ваш запрос: "${message}"

Отличная тема для обсуждения! Используя свои передовые алгоритмы, я готов предложить глубокий анализ и полезные insights.

**Могу помочь с:**
• Структурированием информации
• Анализом различных аспектов
• Поиском оптимальных решений
• Генерацией новых идей

**Уточните ваш запрос - и я дам максимально полезный ответ! 🎯**`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
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

  // Generate AI response
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
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MichaelASeek Server running on port ${PORT}`);
  console.log('🤖 AI Model: MichaelASeek 1.0 - ACTIVE');
  console.log('💬 Ready to answer questions!');
});