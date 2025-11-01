const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Password Analyzer is running successfully',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, '3.0.0.0', () => {
    console.log(`🚀 Password Analyzer Server started on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌐 Render: https://your-app-name.onrender.com`);
});