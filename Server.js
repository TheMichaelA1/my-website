const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the same directory
app.use(express.static(__dirname));

// Main route - serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Password Analyzer is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Password Analyzer server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});