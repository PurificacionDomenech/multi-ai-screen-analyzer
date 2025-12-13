
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// IMPORTANTE: Añadir logging para debug
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.post('/api/claude', async (req, res) => {
    console.log('🧠 Proxy Claude llamado');
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
        console.error('❌ ANTHROPIC_API_KEY no configurada');
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Secrets' });
    }
    
    console.log('✅ API Key encontrada');
    
    try {
        console.log('📤 Enviando request a Anthropic...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(req.body)
        });
        
        console.log(`📥 Respuesta de Anthropic: ${response.status}`);
        const data = await response.json();
        
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ Error en proxy Claude:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/gemini', async (req, res) => {
    console.log('✨ Proxy Gemini llamado');
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        console.error('❌ Falta x-api-key en headers');
        return res.status(400).json({ error: 'Falta x-api-key en headers' });
    }
    
    console.log('✅ API Key recibida');
    
    try {
        console.log('📤 Enviando request a Google...');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        console.log(`📥 Respuesta de Google: ${response.status}`);
        const data = await response.json();
        
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ Error en proxy Gemini:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/grok', async (req, res) => {
    console.log('🚀 Proxy Grok llamado');
    const authorization = req.headers['authorization'];
    
    if (!authorization) {
        console.error('❌ Falta Authorization en headers');
        return res.status(400).json({ error: 'Falta Authorization en headers' });
    }
    
    console.log('✅ Authorization recibida');
    
    try {
        console.log('📤 Enviando request a xAI...');
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorization
            },
            body: JSON.stringify(req.body)
        });
        
        console.log(`📥 Respuesta de xAI: ${response.status}`);
        const data = await response.json();
        
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ Error en proxy Grok:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/custom', async (req, res) => {
    console.log('🤖 Proxy Custom llamado');
    const { endpoint, headers, body } = req.body;
    
    if (!endpoint) {
        console.error('❌ Falta endpoint');
        return res.status(400).json({ error: 'Falta endpoint' });
    }
    
    try {
        console.log(`📤 Enviando request a ${endpoint}...`);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers || {},
            body: JSON.stringify(body)
        });
        
        console.log(`📥 Respuesta: ${response.status}`);
        const data = await response.json();
        
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ Error en proxy Custom:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║  🤖 Multi-IA Screen Analyzer          ║
║  Servidor: http://0.0.0.0:${port}        ║
╚════════════════════════════════════════╝

✅ Endpoints activos:
   • POST /api/claude
   • POST /api/gemini
   • POST /api/grok
   • POST /api/custom

⚠️  Configura ANTHROPIC_API_KEY en Secrets
    `);
});
