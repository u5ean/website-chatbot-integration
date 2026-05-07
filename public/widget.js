(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  const apiUrl = script.getAttribute('data-api-url') || 'https://your-domain.com';

  if (!chatbotId) {
    console.error('AI Chatbot: Missing data-chatbot-id attribute');
    return;
  }

  // Inject styles for the toggle button (outside shadow DOM to position it)
  const style = document.createElement('style');
  style.textContent = `
    #ai-chatbot-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #000;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      transition: transform 0.3s ease;
    }
    #ai-chatbot-bubble:hover { transform: scale(1.05); }
    #ai-chatbot-bubble svg { width: 30px; height: 30px; fill: white; }
    
    #ai-chatbot-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 400px;
      height: 600px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    @media (max-width: 600px) {
      #ai-chatbot-container {
        width: 100%;
        height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Create Bubble
  const bubble = document.createElement('div');
  bubble.id = 'ai-chatbot-bubble';
  bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  document.body.appendChild(bubble);

  // Create Container
  const container = document.createElement('div');
  container.id = 'ai-chatbot-container';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // Add Shadow DOM styles
  const shadowStyle = document.createElement('style');
  shadowStyle.textContent = `
    :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .header { padding: 16px; background: #000; color: white; display: flex; align-items: center; justify-content: space-between; }
    .header .title { font-weight: 600; font-size: 16px; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f9f9f9; }
    .message { max-width: 85%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; }
    .message.user { align-self: flex-end; background: #000; color: white; border-bottom-right-radius: 4px; }
    .message.assistant { align-self: flex-start; background: #e9e9eb; color: #000; border-bottom-left-radius: 4px; }
    .input-area { padding: 16px; border-top: 1px solid #eee; display: flex; gap: 8px; }
    .input-area input { flex: 1; border: 1px solid #ddd; padding: 8px 12px; border-radius: 20px; outline: none; }
    .input-area button { background: #000; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; }
    .typing { font-size: 12px; color: #666; margin-bottom: 8px; display: none; }
  `;
  shadow.appendChild(shadowStyle);

  // Main UI Structure
  const ui = document.createElement('div');
  ui.style.display = 'flex';
  ui.style.flexDirection = 'column';
  ui.style.height = '100%';
  ui.innerHTML = `
    <div class="header">
      <div class="title" id="chat-title">AI Assistant</div>
      <div style="cursor:pointer" id="close-chat">✕</div>
    </div>
    <div class="messages" id="message-list">
      <div class="message assistant">Hi! How can I help you today?</div>
    </div>
    <div id="typing-indicator" class="typing" style="padding: 0 16px;">Assistant is typing...</div>
    <div class="input-area">
      <input type="text" id="user-input" placeholder="Type a message..." autocomplete="off">
      <button id="send-btn">Send</button>
    </div>
  `;
  shadow.appendChild(ui);

  // State
  let isOpen = false;
  let sessionId = null;

  // Event Listeners
  bubble.onclick = () => {
    isOpen = !isOpen;
    container.style.display = isOpen ? 'flex' : 'none';
  };

  shadow.getElementById('close-chat').onclick = () => {
    isOpen = false;
    container.style.display = 'none';
  };

  const input = shadow.getElementById('user-input');
  const sendBtn = shadow.getElementById('send-btn');
  const messageList = shadow.getElementById('message-list');
  const typingIndicator = shadow.getElementById('typing-indicator');

  const addMessage = (content, role) => {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.textContent = content;
    messageList.appendChild(msg);
    messageList.scrollTop = messageList.scrollHeight;
    return msg;
  };

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(text, 'user');
    typingIndicator.style.display = 'block';

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId,
          message: text,
          sessionId
        })
      });

      typingIndicator.style.display = 'none';
      
      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = addMessage('', 'assistant');
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullContent += parsed.text;
                assistantMsg.textContent = fullContent;
                messageList.scrollTop = messageList.scrollHeight;
              }
              if (parsed.sessionId) sessionId = parsed.sessionId;
            } catch (e) {
              // Not JSON
              fullContent += data;
              assistantMsg.textContent = fullContent;
            }
          }
        }
      }
    } catch (error) {
      typingIndicator.style.display = 'none';
      addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }
  };

  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

  // Fetch initial config
  fetch(`${apiUrl}/api/chatbot/config?id=${chatbotId}`)
    .then(r => r.json())
    .then(config => {
      if (config.name) shadow.getElementById('chat-title').textContent = config.name;
      if (config.colors) {
        const header = shadow.querySelector('.header');
        header.style.background = config.colors.primary || '#000';
        bubble.style.background = config.colors.primary || '#000';
        sendBtn.style.background = config.colors.primary || '#000';
      }
      if (config.welcome_message) {
        messageList.innerHTML = `<div class="message assistant">${config.welcome_message}</div>`;
      }
    })
    .catch(err => console.error('AI Chatbot: Failed to load config', err));
})();
