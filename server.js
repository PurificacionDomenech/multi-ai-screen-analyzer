const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 3000; // Puerto por defecto en Replit

// Middleware para parsear JSON y limitar el tamaño del cuerpo (necesario para la imagen base64)
app.use(express.json({ limit: '50mb' }));

// Servir el archivo index.html y el video estáticamente
app.use(express.static(path.join(__dirname)));

// Endpoint de proxy para Claude (Anthropic)
app.post('/api/claude', async (req, res) => {
    // La clave de API se debe configurar como un Secret en Replit (ANTHROPIC_API_KEY)
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Replit Secrets.' });
    }

    try {
        // Reenviar la petición a la API real de Anthropic
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(req.body )
        });

        const data = await response.json();
        
        // Devolver la respuesta de Anthropic al frontend
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Error en el proxy de Claude:', error);
        res.status(500).json({ error: 'Error interno del servidor al contactar a Anthropic.' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor proxy y estático iniciado en http://localhost:${port}` );
});
