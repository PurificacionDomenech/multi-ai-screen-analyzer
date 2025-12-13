
let lastCapture = null;
let lastResponses = [];
let customAIs = {};

// Cargar IAs personalizadas al iniciar
window.addEventListener('DOMContentLoaded', () => {
  loadCustomAIs();
  renderCustomAIConfigs();
  renderCustomAICheckboxes();
  loadKeysStatus();

  // Lógica para el video de introducción
  const video = document.getElementById('intro-video');
  const overlay = document.getElementById('video-overlay');

  video.onended = () => {
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
  };

  video.onerror = () => {
    console.error("Error al cargar o reproducir el video. Ocultando overlay.");
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
  };

  document.body.style.overflow = 'hidden';
});

function loadCustomAIs() {
  const stored = localStorage.getItem('custom_ais');
  if (stored) {
    customAIs = JSON.parse(stored);
  }
}

function saveCustomAIs() {
  localStorage.setItem('custom_ais', JSON.stringify(customAIs));
}

function renderCustomAIConfigs() {
  const container = document.getElementById('custom-ai-configs');
  container.innerHTML = '';

  Object.keys(customAIs).forEach(aiKey => {
    const ai = customAIs[aiKey];
    container.innerHTML += `
      <div class="ai-item custom" id="${aiKey}-config">
        <button class="delete-btn" onclick="deleteCustomAI('${aiKey}')">🗑️ Eliminar</button>
        <div class="ai-header">
          <div class="ai-name">
            ${ai.icon} ${ai.name}
            <span class="custom-badge">PERSONALIZADA</span>
            <span class="status-badge disconnected" id="${aiKey}-status">No configurado</span>
          </div>
        </div>
        <form onsubmit="event.preventDefault(); saveKey('${aiKey}');">
          <div class="input-group">
            <label for="${aiKey}-key">API Key:</label>
            <input type="password" id="${aiKey}-key" placeholder="Tu API key..." autocomplete="off">
            <p class="help-text">Endpoint: ${ai.endpoint}</p>
          </div>
          <div class="ai-actions">
            <button type="submit">💾 Guardar</button>
            <button type="button" onclick="testCustomConnection('${aiKey}')" class="success">🔍 Probar</button>
            <button type="button" onclick="clearKey('${aiKey}')" class="secondary">🗑️ Borrar Key</button>
          </div>
        </form>
      </div>
    `;
  });
}

function renderCustomAICheckboxes() {
  const container = document.getElementById('custom-ai-checkboxes');
  const chatContainer = document.getElementById('chat-custom-ai-checkboxes');
  
  container.innerHTML = '';
  if (chatContainer) chatContainer.innerHTML = '';

  Object.keys(customAIs).forEach(aiKey => {
    const ai = customAIs[aiKey];
    const checkbox = `
      <label class="checkbox-item">
        <input type="checkbox" id="use-${aiKey}">
        <span>${ai.icon} ${ai.name}</span>
      </label>
    `;
    const chatCheckbox = `
      <label class="checkbox-item">
        <input type="checkbox" id="chat-${aiKey}">
        <span>${ai.icon} ${ai.name}</span>
      </label>
    `;
    
    container.innerHTML += checkbox;
    if (chatContainer) chatContainer.innerHTML += chatCheckbox;
  });
}

let currentChatImage = null;

function handleChatImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    currentChatImage = e.target.result.split(',')[1];
    const preview = document.getElementById('chat-image-preview');
    preview.innerHTML = `
      <img src="${e.target.result}">
      <button onclick="removeChatImage()">✕ Quitar</button>
    `;
    preview.classList.add('active');
  };
  reader.readAsDataURL(file);
}

function removeChatImage() {
  currentChatImage = null;
  document.getElementById('chat-image-preview').classList.remove('active');
  document.getElementById('chat-image').value = '';
}

async function captureToChatImage() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ 
      video: { mediaSource: 'screen' }
    });
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    stream.getTracks().forEach(track => track.stop());
    
    const imageData = canvas.toDataURL('image/png').split(',')[1];
    currentChatImage = imageData;
    
    const preview = document.getElementById('chat-image-preview');
    preview.innerHTML = `
      <img src="data:image/png;base64,${imageData}">
      <button onclick="removeChatImage()">✕ Quitar</button>
    `;
    preview.classList.add('active');
    
  } catch (error) {
    console.error('Error al capturar:', error);
    alert(`❌ Error al capturar pantalla: ${error.message}`);
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message && !currentChatImage) {
    alert('⚠️ Escribe un mensaje o adjunta una imagen');
    return;
  }

  const useClaude = document.getElementById('chat-claude').checked;
  const useGemini = document.getElementById('chat-gemini').checked;
  const useGrok = document.getElementById('chat-grok').checked;
  const useLocal = document.getElementById('chat-local').checked;
  
  const customChecked = Object.keys(customAIs).filter(aiKey => {
    const checkbox = document.getElementById(`chat-${aiKey}`);
    return checkbox && checkbox.checked;
  });
  
  if (!useClaude && !useGemini && !useGrok && !useLocal && customChecked.length === 0) {
    alert('⚠️ Debes seleccionar al menos una IA');
    return;
  }

  const missingKeys = [];
  if (useGemini && !localStorage.getItem('gemini_api_key')) missingKeys.push('Gemini');
  if (useGrok && !localStorage.getItem('grok_api_key')) missingKeys.push('Grok');
  if (useLocal && !localStorage.getItem('local_endpoint')) missingKeys.push('Mi IA Local (configura el endpoint)');
  
  customChecked.forEach(aiKey => {
    if (!localStorage.getItem(`${aiKey}_api_key`)) {
      missingKeys.push(customAIs[aiKey].name);
    }
  });
  
  if (missingKeys.length > 0) {
    alert(`⚠️ Faltan API keys para: ${missingKeys.join(', ')}`);
    return;
  }

  const chatMessages = document.getElementById('chat-messages');
  
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'chat-message user';
  userMessageDiv.innerHTML = `
    <div class="chat-bubble user">
      ${message ? message : ''}
      ${currentChatImage ? `<img src="data:image/png;base64,${currentChatImage}">` : ''}
    </div>
  `;
  chatMessages.appendChild(userMessageDiv);

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-loading';
  loadingDiv.innerHTML = '⏳ Las IAs están pensando...';
  chatMessages.appendChild(loadingDiv);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;

  input.value = '';
  const imageToSend = currentChatImage;
  removeChatImage();

  const promises = [];
  if (useClaude) promises.push(chatWithClaude(message, imageToSend));
  if (useGemini) promises.push(chatWithGemini(message, imageToSend));
  if (useGrok) promises.push(chatWithGrok(message, imageToSend));
  if (useLocal) promises.push(chatWithLocal(message, imageToSend));
  
  customChecked.forEach(aiKey => {
    promises.push(chatWithCustomAI(aiKey, message, imageToSend));
  });

  const results = await Promise.all(promises);
  loadingDiv.remove();

  // Si hay imagen, mostrarla grande arriba
  if (imageToSend) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'main-image-container';
    imageContainer.innerHTML = `
      <h3>📸 Imagen Compartida</h3>
      <img src="data:image/png;base64,${imageToSend}" alt="Imagen adjunta">
    `;
    chatMessages.appendChild(imageContainer);
  }

  // Si hay múltiples IAs (2+), usar layout columnar
  if (results.length > 1) {
    const columnsWrapper = document.createElement('div');
    columnsWrapper.className = 'chat-message';
    columnsWrapper.style.maxWidth = '100%';
    columnsWrapper.style.alignSelf = 'stretch';
    
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'responses-columns';
    columnsContainer.setAttribute('data-ai-count', results.length);
    
    results.forEach(result => {
      const column = document.createElement('div');
      column.className = 'ai-column';
      
      const aiType = result.ai.toLowerCase().includes('claude') ? 'claude' :
                     result.ai.toLowerCase().includes('gemini') ? 'gemini' :
                     result.ai.toLowerCase().includes('grok') ? 'grok' :
                     result.ai.toLowerCase().includes('local') ? 'local' : 'custom';
      column.setAttribute('data-ai', aiType);
      
      const header = document.createElement('div');
      header.className = 'ai-column-header';
      header.innerHTML = `${result.icon} ${result.ai}`;
      
      const content = document.createElement('div');
      content.className = 'ai-column-content';
      
      if (result.success) {
        content.textContent = result.content;
      } else {
        content.className += ' error';
        content.textContent = `❌ ERROR: ${result.content}`;
      }
      
      column.appendChild(header);
      column.appendChild(content);
      columnsContainer.appendChild(column);
    });
    
    columnsWrapper.appendChild(columnsContainer);
    chatMessages.appendChild(columnsWrapper);
  } else {
    // Vista tradicional para 1 sola IA
    results.forEach(result => {
      const aiMessageDiv = document.createElement('div');
      aiMessageDiv.className = 'chat-message ai';
      aiMessageDiv.innerHTML = `
        <div class="chat-bubble ai">
          <div class="ai-name">${result.icon} ${result.ai}</div>
          ${result.success ? result.content : `<span style="color: #f44336;">❌ Error: ${result.content}</span>`}
        </div>
      `;
      chatMessages.appendChild(aiMessageDiv);
    });
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function chatWithClaude(message, imageBase64) {
  const key = localStorage.getItem('claude_api_key');
  
  try {
    const content = [];
    if (message) content.push({ type: 'text', text: message });
    if (imageBase64) {
      content.push({ 
        type: 'image', 
        source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content }]
      })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    
    return {
      ai: 'Claude',
      icon: '🧠',
      content: data.content[0].text,
      success: true
    };
  } catch (error) {
    return { ai: 'Claude', icon: '🧠', content: error.message, success: false };
  }
}

async function chatWithGemini(message, imageBase64) {
  const key = localStorage.getItem('gemini_api_key');
  
  try {
    const parts = [];
    if (message) parts.push({ text: message });
    if (imageBase64) {
      parts.push({ inline_data: { mime_type: 'image/png', data: imageBase64 }});
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    
    return {
      ai: 'Gemini',
      icon: '✨',
      content: data.candidates[0].content.parts[0].text,
      success: true
    };
  } catch (error) {
    return { ai: 'Gemini', icon: '✨', content: error.message, success: false };
  }
}

async function chatWithGrok(message, imageBase64) {
  const key = localStorage.getItem('grok_api_key');
  
  try {
    const content = [];
    if (message) content.push({ type: 'text', text: message });
    if (imageBase64) {
      content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` }});
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'grok-vision-beta',
        messages: [{ role: 'user', content }],
        max_tokens: 2048
      })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    
    return {
      ai: 'Grok',
      icon: '🚀',
      content: data.choices[0].message.content,
      success: true
    };
  } catch (error) {
    return { ai: 'Grok', icon: '🚀', content: error.message, success: false };
  }
}

async function chatWithLocal(message, imageBase64) {
  const endpoint = localStorage.getItem('local_endpoint');
  const model = localStorage.getItem('local_model') || 'local-model';
  
  try {
    const content = [];
    if (message) content.push({ type: 'text', text: message });
    if (imageBase64) {
      content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` }});
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content }],
        max_tokens: 2048
      })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    
    return {
      ai: 'Mi IA Local',
      icon: '🖥️',
      content: data.choices[0].message.content,
      success: true
    };
  } catch (error) {
    return { ai: 'Mi IA Local', icon: '🖥️', content: error.message, success: false };
  }
}

async function chatWithCustomAI(aiKey, message, imageBase64) {
  const key = localStorage.getItem(`${aiKey}_api_key`);
  const ai = customAIs[aiKey];
  
  try {
    let response, body;
    const headers = { 'Content-Type': 'application/json' };

    if (ai.type === 'openai') {
      headers['Authorization'] = `Bearer ${key}`;
      const content = [];
      if (message) content.push({ type: 'text', text: message });
      if (imageBase64) {
        content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` }});
      }
      body = JSON.stringify({
        model: ai.model,
        messages: [{ role: 'user', content }],
        max_tokens: 2048
      });
    } else if (ai.type === 'anthropic') {
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      const content = [];
      if (message) content.push({ type: 'text', text: message });
      if (imageBase64) {
        content.push({ 
          type: 'image', 
          source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
        });
      }
      body = JSON.stringify({
        model: ai.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content }]
      });
    } else if (ai.type === 'google') {
      const parts = [];
      if (message) parts.push({ text: message });
      if (imageBase64) {
        parts.push({ inline_data: { mime_type: 'image/png', data: imageBase64 }});
      }
      body = JSON.stringify({ contents: [{ parts }] });
      ai.endpoint = `${ai.endpoint}?key=${key}`;
    }

    response = await fetch(ai.endpoint, {
      method: 'POST',
      headers,
      body
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const data = await response.json();
    
    let content = 'Respuesta no parseada';
    if (ai.type === 'openai') content = data.choices[0].message.content;
    else if (ai.type === 'anthropic') content = data.content[0].text;
    else if (ai.type === 'google') content = data.candidates[0].content.parts[0].text;

    return { ai: ai.name, icon: ai.icon, content, success: true };
  } catch (error) {
    return { ai: ai.name, icon: ai.icon, content: error.message, success: false };
  }
}

function toggleTheme() {
  document.body.classList.toggle('light');
  document.body.classList.toggle('dark');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

function openAddAIModal() {
  document.getElementById('add-ai-modal').classList.add('active');
}

function closeAddAIModal() {
  document.getElementById('add-ai-modal').classList.remove('active');
  document.getElementById('new-ai-name').value = '';
  document.getElementById('new-ai-icon').value = '';
  document.getElementById('new-ai-endpoint').value = '';
  document.getElementById('new-ai-model').value = '';
}

function addCustomAI() {
  const name = document.getElementById('new-ai-name').value.trim();
  const icon = document.getElementById('new-ai-icon').value.trim() || '🤖';
  const type = document.getElementById('new-ai-type').value;
  const endpoint = document.getElementById('new-ai-endpoint').value.trim();
  const model = document.getElementById('new-ai-model').value.trim();

  if (!name || !endpoint || !model) {
    alert('❌ Debes completar: Nombre, Endpoint y Modelo');
    return;
  }

  const aiKey = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (customAIs[aiKey]) {
    alert('❌ Ya existe una IA con ese nombre');
    return;
  }

  customAIs[aiKey] = { name, icon, type, endpoint, model };
  saveCustomAIs();
  renderCustomAIConfigs();
  renderCustomAICheckboxes();
  closeAddAIModal();

  alert(`✅ IA "${name}" añadida correctamente. Ve a Configuración para añadir tu API key.`);
}

function deleteCustomAI(aiKey) {
  if (!confirm(`¿Seguro que quieres eliminar "${customAIs[aiKey].name}"?`)) return;

  delete customAIs[aiKey];
  localStorage.removeItem(`${aiKey}_api_key`);
  saveCustomAIs();
  renderCustomAIConfigs();
  renderCustomAICheckboxes();

  alert('🗑️ IA eliminada correctamente');
}

function saveKey(aiKey) {
  const keyInput = document.getElementById(`${aiKey}-key`);
  const key = keyInput.value.trim();
  
  if (!key) {
    alert('Por favor ingresa una API key válida');
    return;
  }
  
  localStorage.setItem(`${aiKey}_api_key`, key);
  updateStatus(aiKey, 'connected', 'Guardado');
  alert(`✅ API key guardada correctamente`);
}

function clearKey(aiKey) {
  if (confirm(`¿Seguro que quieres borrar la API key?`)) {
    localStorage.removeItem(`${aiKey}_api_key`);
    document.getElementById(`${aiKey}-key`).value = '';
    updateStatus(aiKey, 'disconnected', 'No configurado');
    alert(`🗑️ API key borrada`);
  }
}

function saveLocalConfig() {
  const endpoint = document.getElementById('local-endpoint').value.trim();
  const model = document.getElementById('local-model').value.trim();
  
  if (!endpoint) {
    alert('⚠️ Por favor ingresa un endpoint válido');
    return;
  }
  
  localStorage.setItem('local_endpoint', endpoint);
  localStorage.setItem('local_model', model || 'local-model');
  updateStatus('local', 'connected', 'Configurado');
  alert('✅ Configuración de IA Local guardada correctamente');
}

function clearLocalConfig() {
  if (confirm('¿Seguro que quieres borrar la configuración de IA Local?')) {
    localStorage.removeItem('local_endpoint');
    localStorage.removeItem('local_model');
    document.getElementById('local-endpoint').value = 'http://localhost:1234/v1/chat/completions';
    document.getElementById('local-model').value = 'local-model';
    updateStatus('local', 'disconnected', 'No configurado');
    alert('🗑️ Configuración borrada');
  }
}

function loadKeysStatus() {
  ['claude', 'gemini', 'grok'].forEach(aiKey => {
    const key = localStorage.getItem(`${aiKey}_api_key`);
    const input = document.getElementById(`${aiKey}-key`);
    
    if (key && input) {
      input.value = key;
      updateStatus(aiKey, 'connected', 'Configurado');
    }
  });

  // Cargar configuración de IA Local
  const localEndpoint = localStorage.getItem('local_endpoint');
  const localModel = localStorage.getItem('local_model');
  if (localEndpoint) {
    document.getElementById('local-endpoint').value = localEndpoint;
    document.getElementById('local-model').value = localModel || 'local-model';
    updateStatus('local', 'connected', 'Configurado');
  }

  Object.keys(customAIs).forEach(aiKey => {
    const key = localStorage.getItem(`${aiKey}_api_key`);
    const input = document.getElementById(`${aiKey}-key`);
    
    if (key && input) {
      input.value = key;
      updateStatus(aiKey, 'connected', 'Configurado');
    }
  });
}

function updateStatus(aiKey, statusClass, text) {
  const badge = document.getElementById(`${aiKey}-status`);
  const container = document.getElementById(`${aiKey}-config`);
  
  if (!badge || !container) return;
  
  badge.className = `status-badge ${statusClass}`;
  badge.textContent = text;
  
  container.classList.remove('connected', 'error');
  if (statusClass === 'connected') {
    container.classList.add('connected');
  } else if (statusClass === 'disconnected') {
    container.classList.add('error');
  }
}

async function testConnection(aiName) {
  if (aiName === 'local') {
    const endpoint = localStorage.getItem('local_endpoint');
    
    if (!endpoint) {
      alert('❌ Primero debes guardar la configuración de IA Local');
      return;
    }
    
    updateStatus('local', 'testing', 'Probando...');
    
    try {
      const model = localStorage.getItem('local_model') || 'local-model';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });
      
      if (response.ok) {
        updateStatus('local', 'connected', '✅ Conectado');
        alert('✅ Conexión exitosa con IA Local');
      } else {
        const error = await response.text();
        updateStatus('local', 'disconnected', '❌ Error');
        alert(`❌ Error de conexión: ${error.substring(0, 200)}\n\n¿Está el servidor corriendo en ${endpoint}?`);
      }
    } catch (error) {
      updateStatus('local', 'disconnected', '❌ Error');
      alert(`❌ Error: ${error.message}\n\nAsegúrate de que LM Studio o Ollama esté corriendo con el servidor API activado.`);
    }
    return;
  }
  
  const key = localStorage.getItem(`${aiName}_api_key`);
  
  if (!key) {
    alert('❌ Primero debes guardar una API key');
    return;
  }
  
  updateStatus(aiName, 'testing', 'Probando...');
  
  try {
    let response;
    
    if (aiName === 'claude') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
    } else if (aiName === 'gemini') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'test' }] }]
          })
        }
      );
    } else if (aiName === 'grok') {
      response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });
    }
    
    if (response.ok) {
      updateStatus(aiName, 'connected', '✅ Conectado');
      alert(`✅ Conexión exitosa con ${aiName}`);
    } else {
      const error = await response.text();
      updateStatus(aiName, 'disconnected', '❌ Error');
      alert(`❌ Error de conexión: ${error.substring(0, 200)}`);
    }
  } catch (error) {
    updateStatus(aiName, 'disconnected', '❌ Error');
    alert(`❌ Error: ${error.message}`);
  }
}

async function testCustomConnection(aiKey) {
  const key = localStorage.getItem(`${aiKey}_api_key`);
  const ai = customAIs[aiKey];
  
  if (!key) {
    alert('❌ Primero debes guardar una API key');
    return;
  }
  
  updateStatus(aiKey, 'testing', 'Probando...');
  
  try {
    let response;
    
    if (ai.type === 'openai') {
      response = await fetch(ai.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: ai.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10
        })
      });
    } else if (ai.type === 'anthropic') {
      response = await fetch(ai.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: ai.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
    } else if (ai.type === 'google') {
      response = await fetch(`${ai.endpoint}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        })
      });
    }
    
    if (response.ok) {
      updateStatus(aiKey, 'connected', '✅ Conectado');
      alert(`✅ Conexión exitosa con ${ai.name}`);
    } else {
      const error = await response.text();
      updateStatus(aiKey, 'disconnected', '❌ Error');
      alert(`❌ Error: ${error.substring(0, 200)}`);
    }
  } catch (error) {
    updateStatus(aiKey, 'disconnected', '❌ Error');
    alert(`❌ Error: ${error.message}`);
  }
}

async function captureAndAnalyze() {
  const useClaude = document.getElementById('use-claude').checked;
  const useGemini = document.getElementById('use-gemini').checked;
  const useGrok = document.getElementById('use-grok').checked;
  const useLocal = document.getElementById('use-local').checked;
  
  const customChecked = Object.keys(customAIs).filter(aiKey => {
    const checkbox = document.getElementById(`use-${aiKey}`);
    return checkbox && checkbox.checked;
  });
  
  if (!useClaude && !useGemini && !useGrok && !useLocal && customChecked.length === 0) {
    alert('⚠️ Debes seleccionar al menos una IA');
    return;
  }
  
  const missingKeys = [];
  if (useGemini && !localStorage.getItem('gemini_api_key')) missingKeys.push('Gemini');
  if (useGrok && !localStorage.getItem('grok_api_key')) missingKeys.push('Grok');
  if (useLocal && !localStorage.getItem('local_endpoint')) missingKeys.push('Mi IA Local (configura el endpoint)');
  
  customChecked.forEach(aiKey => {
    if (!localStorage.getItem(`${aiKey}_api_key`)) {
      missingKeys.push(customAIs[aiKey].name);
    }
  });
  
  if (missingKeys.length > 0) {
    alert(`⚠️ Faltan configuraciones para: ${missingKeys.join(', ')}\n\nVe a Configuración para añadirlas.`);
    return;
  }
  
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ 
      video: { mediaSource: 'screen' }
    });
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    stream.getTracks().forEach(track => track.stop());
    
    const imageData = canvas.toDataURL('image/png').split(',')[1];
    lastCapture = imageData;
    
    const preview = document.getElementById('preview');
    preview.innerHTML = `
      <h3>📸 Captura realizada</h3>
      <img src="data:image/png;base64,${imageData}" style="max-width: 100%; border-radius: 10px; margin-top: 10px;">
    `;
    
    const container = document.getElementById('responses-container');
    container.innerHTML = '<div class="loading">⏳ Analizando con las IAs seleccionadas...</div>';
    
    const promises = [];
    if (useClaude) promises.push(analyzeWithClaude(imageData));
    if (useGemini) promises.push(analyzeWithGemini(imageData));
    if (useGrok) promises.push(analyzeWithGrok(imageData));
    if (useLocal) promises.push(analyzeWithLocal(imageData));
    
    customChecked.forEach(aiKey => {
      promises.push(analyzeWithCustomAI(aiKey, imageData));
    });
    
    const results = await Promise.all(promises);
    lastResponses = results;
    
    displayResponses(results);
    
  } catch (error) {
    console.error('Error:', error);
    alert(`❌ Error al capturar: ${error.message}`);
  }
}

async function analyzeWithClaude(imageBase64) {
  const key = localStorage.getItem('claude_api_key');
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' 
            },
            { 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: imageBase64 
              }
            }
          ]
        }]
      })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return {
      ai: 'Claude',
      icon: '🧠',
      content: data.content[0].text,
      success: true
    };
  } catch (error) {
    return {
      ai: 'Claude',
      icon: '🧠',
      content: `Error: ${error.message}`,
      success: false
    };
  }
}

async function analyzeWithGemini(imageBase64) {
  const key = localStorage.getItem('gemini_api_key');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' },
              { inline_data: { mime_type: 'image/png', data: imageBase64 }}
            ]
          }]
        })
      }
    );
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return {
      ai: 'Gemini',
      icon: '✨',
      content: data.candidates[0].content.parts[0].text,
      success: true
    };
  } catch (error) {
    return {
      ai: 'Gemini',
      icon: '✨',
      content: `Error: ${error.message}`,
      success: false
    };
  }
}

async function analyzeWithGrok(imageBase64) {
  const key = localStorage.getItem('grok_api_key');
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'grok-vision-beta',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` }}
          ]
        }],
        max_tokens: 1024
      })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return {
      ai: 'Grok',
      icon: '🚀',
      content: data.choices[0].message.content,
      success: true
    };
  } catch (error) {
    return {
      ai: 'Grok',
      icon: '🚀',
      content: `Error: ${error.message}`,
      success: false
    };
  }
}

async function analyzeWithLocal(imageBase64) {
  const endpoint = localStorage.getItem('local_endpoint');
  const model = localStorage.getItem('local_model') || 'local-model';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` }}
          ]
        }],
        max_tokens: 1024
      })
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    return {
      ai: 'Mi IA Local',
      icon: '🖥️',
      content: data.choices[0].message.content,
      success: true
    };
  } catch (error) {
    return {
      ai: 'Mi IA Local',
      icon: '🖥️',
      content: `Error: ${error.message}`,
      success: false
    };
  }
}

async function analyzeWithCustomAI(aiKey, imageBase64) {
  const key = localStorage.getItem(`${aiKey}_api_key`);
  const ai = customAIs[aiKey];
  
  try {
    let response;
    let body;
    let headers = { 'Content-Type': 'application/json' };

    if (ai.type === 'openai') {
      headers['Authorization'] = `Bearer ${key}`;
      body = JSON.stringify({
        model: ai.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` }}
          ]
        }],
        max_tokens: 1024
      });
    } else if (ai.type === 'anthropic') {
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: ai.model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' 
            },
            { 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: imageBase64 
              }
            }
          ]
        }]
      });
    } else if (ai.type === 'google') {
      body = JSON.stringify({
        contents: [{
          parts: [
            { text: 'Analiza esta pantalla en detalle. Si ves código, identifica posibles errores, bugs o mejoras. Si es una UI, sugiere mejoras de diseño. Si es otra cosa, describe lo que ves y da recomendaciones útiles.' },
            { inline_data: { mime_type: 'image/png', data: imageBase64 }}
          ]
        }]
      });
      ai.endpoint = `${ai.endpoint}?key=${key}`;
    }

    response = await fetch(ai.endpoint, {
      method: 'POST',
      headers: headers,
      body: body
    });
    
    if (!response.ok) throw new Error(`Error ${response.status}`);
    
    const data = await response.json();
    let content = 'Respuesta no parseada';

    if (ai.type === 'openai') {
      content = data.choices[0].message.content;
    } else if (ai.type === 'anthropic') {
      content = data.content[0].text;
    } else if (ai.type === 'google') {
      content = data.candidates[0].content.parts[0].text;
    }

    return {
      ai: ai.name,
      icon: ai.icon,
      content: content,
      success: true
    };
  } catch (error) {
    return {
      ai: ai.name,
      icon: ai.icon,
      content: `Error: ${error.message}`,
      success: false
    };
  }
}

function displayResponses(results) {
  const container = document.getElementById('responses-container');
  container.innerHTML = '<h2>Resultados del Análisis</h2>';
  
  // Si hay captura, mostrarla grande arriba
  if (lastCapture) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'main-image-container';
    imageContainer.innerHTML = `
      <h3>📸 Captura Analizada</h3>
      <img src="data:image/png;base64,${lastCapture}" alt="Captura de pantalla">
    `;
    container.appendChild(imageContainer);
  }
  
  // Si hay múltiples IAs (2+), usar layout columnar
  if (results.length > 1) {
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'responses-columns';
    columnsContainer.setAttribute('data-ai-count', results.length);
    
    results.forEach(result => {
      const column = document.createElement('div');
      column.className = 'ai-column';
      
      // Asignar tipo de IA para colores distintivos
      const aiType = result.ai.toLowerCase().includes('claude') ? 'claude' :
                     result.ai.toLowerCase().includes('gemini') ? 'gemini' :
                     result.ai.toLowerCase().includes('grok') ? 'grok' :
                     result.ai.toLowerCase().includes('local') ? 'local' : 'custom';
      column.setAttribute('data-ai', aiType);
      
      const header = document.createElement('div');
      header.className = 'ai-column-header';
      header.innerHTML = `${result.icon} ${result.ai}`;
      
      const content = document.createElement('div');
      content.className = 'ai-column-content';
      
      if (result.success) {
        content.textContent = result.content;
      } else {
        content.className += ' error';
        content.textContent = `❌ ERROR: ${result.content}`;
      }
      
      column.appendChild(header);
      column.appendChild(content);
      columnsContainer.appendChild(column);
    });
    
    container.appendChild(columnsContainer);
  } else {
    // Vista tradicional para 1 sola IA
    const grid = document.createElement('div');
    grid.className = 'responses-grid';
    
    results.forEach(result => {
      const card = document.createElement('div');
      card.className = 'response-card';
      
      const header = document.createElement('div');
      header.className = 'response-header';
      header.innerHTML = `${result.icon} ${result.ai}`;
      
      const content = document.createElement('div');
      content.className = 'response-content';
      
      if (result.success) {
        content.innerHTML = result.content;
      } else {
        content.className += ' error-message';
        content.textContent = `❌ ERROR: ${result.content}`;
      }
      
      card.appendChild(header);
      card.appendChild(content);
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
  }
}

function exportResults() {
  if (!lastCapture || lastResponses.length === 0) {
    alert('⚠️ Primero debes realizar una captura y análisis.');
    return;
  }

  let exportText = `# Análisis Multi-IA de Pantalla\n\n`;
  exportText += `## 📸 Captura de Pantalla\n\n`;
  exportText += `![Captura de Pantalla](data:image/png;base64,${lastCapture})\n\n`;
  exportText += `## 📝 Resultados del Análisis\n\n`;

  lastResponses.forEach(result => {
    exportText += `### ${result.icon} ${result.ai}\n\n`;
    exportText += `\`\`\`markdown\n${result.content}\n\`\`\`\n\n`;
  });

  const blob = new Blob([exportText], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'multi-ai-analysis.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
