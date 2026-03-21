require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5010;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Routing logic
const services = [
    {
        route: '/api/auth',
        target: process.env.AUTH_SERVICE_URL || 'http://localhost:5001'
    },
    {
        route: '/api/tracking',
        target: process.env.TRACKING_SERVICE_URL || 'http://localhost:5002'
    },
    {
        route: '/api/categories',
        target: process.env.TRACKING_SERVICE_URL || 'http://localhost:5002'
    },
    {
        route: '/api/focus',
        target: process.env.TRACKING_SERVICE_URL || 'http://localhost:5002'
    },
    {
        route: '/api/goals',
        target: process.env.TRACKING_SERVICE_URL || 'http://localhost:5002'
    },
    {
        route: '/api/deepwork',
        target: process.env.TRACKING_SERVICE_URL || 'http://localhost:5002'
    },
    {
        route: '/api/insights',
        target: process.env.TRACKING_SERVICE_URL || 'http://localhost:5002'
    },
    {
        route: '/api/ai',
        target: process.env.AI_SERVICE_URL || 'http://localhost:8000'
    },
    {
        route: '/api/notifications',
        target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004'
    },
    {
        route: '/socket.io',
        target: process.env.REALTIME_SERVICE_URL || 'http://localhost:5003'
    }
];

services.forEach(({ route, target }) => {
    app.use(route, createProxyMiddleware({
        target,
        changeOrigin: true,
        ws: true, // proxy websockets
        pathRewrite: (path, req) => path, // keep the original path
    }));
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'API Gateway' });
});

app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
});
