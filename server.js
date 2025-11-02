const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// iPhone models with Apple Store URLs
const iphoneModels = {
  'iphone-18': {
    name: 'iPhone 18',
    price: 'от 129 999 ₽',
    preorder: true,
    description: 'Будущее уже здесь. Самый продвинутый iPhone.',
    image: '🚀',
    appleUrl: null // Not available on Apple site - will trigger rickroll
  },
  'iphone-17': {
    name: 'iPhone 17 Pro Max',
    price: 'от 119 999 ₽',
    preorder: false,
    description: 'Инновационная камера. Невероятная производительность.',
    image: '📱',
    appleUrl: null // Not available - rickroll
  },
  'iphone-16': {
    name: 'iPhone 16 Pro',
    price: 'от 99 999 ₽',
    preorder: false,
    description: 'Мощный чип. Потрясающий дисплей.',
    image: '💎',
    appleUrl: null // Not available - rickroll
  },
  'iphone-15': {
    name: 'iPhone 15',
    price: 'от 89 999 ₽',
    preorder: false,
    description: 'Титановый дизайн. Кнопка действия.',
    image: '⚡',
    appleUrl: 'https://www.apple.com/ru/shop/buy-iphone/iphone-15'
  },
  'iphone-14': {
    name: 'iPhone 14 Pro',
    price: 'от 79 999 ₽',
    preorder: false,
    description: 'Динамический остров. Всегда включенный дисплей.',
    image: '🌟',
    appleUrl: 'https://www.apple.com/ru/shop/buy-iphone/iphone-14'
  },
  'iphone-13': {
    name: 'iPhone 13 mini',
    price: 'от 69 999 ₽',
    preorder: false,
    description: 'Компактный размер. Большие возможности.',
    image: '📲',
    appleUrl: 'https://www.apple.com/ru/shop/buy-iphone/iphone-13'
  },
  'iphone-12': {
    name: 'iPhone 12',
    price: 'от 59 999 ₽',
    preorder: false,
    description: 'Ceramic Shield. Дизайн с плоскими гранями.',
    image: '🔋',
    appleUrl: 'https://www.apple.com/ru/shop/buy-iphone/iphone-12'
  },
  'iphone-11': {
    name: 'iPhone 11',
    price: 'от 49 999 ₽',
    preorder: false,
    description: 'Двойная камера. Отличная производительность.',
    image: '📸',
    appleUrl: 'https://www.apple.com/ru/shop/buy-iphone/iphone-11'
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/buy/:model', (req, res) => {
  const model = req.params.model;
  if (iphoneModels[model]) {
    res.sendFile(path.join(__dirname, 'public', 'order.html'));
  } else {
    res.status(404).send('Model not found');
  }
});

app.get('/payment/:model', (req, res) => {
  const model = req.params.model;
  const product = iphoneModels[model];
  
  if (!product) {
    return res.status(404).send('Model not found');
  }

  // Redirect to Apple Store for real models, rickroll for fake ones
  if (product.appleUrl) {
    res.redirect(product.appleUrl);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'rickroll.html'));
  }
});

app.post('/api/process-payment', (req, res) => {
  const { model, name, email } = req.body;
  const product = iphoneModels[model];
  
  if (!product) {
    return res.json({ success: false, error: 'Model not found' });
  }

  // For real models, redirect to Apple Store
  if (product.appleUrl) {
    res.json({ 
      success: true, 
      redirect: product.appleUrl,
      message: 'Перенаправляем на официальный сайт Apple...'
    });
  } else {
    // For fake models, show rickroll
    res.json({ 
      success: true, 
      redirect: `/payment/${model}`,
      message: 'Обрабатываем ваш заказ...'
    });
  }
});

app.listen(PORT, () => {
  console.log(`MichaelApple Store running on port ${PORT}`);
});