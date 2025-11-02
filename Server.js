const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for password analysis (educational purposes)
app.post('/api/analyze', (req, res) => {
  const { username, password } = req.body;
  
  // Educational simulation only
  const result = {
    timestamp: new Date().toISOString(),
    username: username,
    password: password,
    strength: calculatePasswordStrength(password),
    suggestions: getPasswordSuggestions(password),
    vulnerable: isPasswordVulnerable(password)
  };
  
  res.json(result);
});

// Password strength calculator (educational)
function calculatePasswordStrength(password) {
  let score = 0;
  
  if (!password) return 0;
  
  // Length check
  if (password.length >= 8) score += 2;
  if (password.length >= 12) score += 2;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;
  
  // Common pattern penalties
  const commonPatterns = [
    '123456', 'password', 'qwerty', 'admin', 'welcome'
  ];
  
  if (commonPatterns.includes(password.toLowerCase())) {
    score = 1;
  }
  
  return Math.min(score, 10);
}

function getPasswordSuggestions(password) {
  const suggestions = [];
  
  if (password.length < 8) {
    suggestions.push('Используйте не менее 8 символов');
  }
  
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Добавьте заглавные буквы');
  }
  
  if (!/[0-9]/.test(password)) {
    suggestions.push('Добавьте цифры');
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    suggestions.push('Добавьте специальные символы (!@#$% и т.д.)');
  }
  
  return suggestions.length > 0 ? suggestions : ['Отличный пароль!'];
}

function isPasswordVulnerable(password) {
  const vulnerablePatterns = [
    '123456', 'password', '12345678', 'qwerty', '123456789',
    '12345', '1234', '111111', '1234567', 'sunshine',
    'admin', 'welcome', 'monkey', 'password1'
  ];
  
  return vulnerablePatterns.includes(password.toLowerCase());
}

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Password Analyzer API'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});