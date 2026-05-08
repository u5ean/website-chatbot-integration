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
      width: min(480px, calc(100vw - 40px));
      height: min(720px, calc(100vh - 140px));
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
    .message.assistant a { color: inherit; text-decoration: underline; word-break: break-word; }
    .message.assistant p { margin: 0; }
    .message.assistant p + p { margin-top: 8px; }
    .message.assistant ul, .message.assistant ol { margin: 8px 0 0 18px; padding: 0; }
    .message.assistant li { margin: 4px 0; }
    .message.assistant pre { margin: 10px 0 0; padding: 10px 12px; background: rgba(0,0,0,0.08); border-radius: 10px; overflow: auto; }
    .message.assistant code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
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

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const linkify = (s) => {
    const isInsideHtmlTag = (full, offset) => {
      const lastLt = full.lastIndexOf('<', offset);
      const lastGt = full.lastIndexOf('>', offset);
      return lastLt > lastGt;
    };

    const mdLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const withMd = s.replace(mdLink, (_m, text, url) => {
      const safeText = escapeHtml(text);
      const safeUrl = escapeHtml(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
    });

    const bareUrl = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g;
    return withMd.replace(bareUrl, (url, offset, full) => {
      if (isInsideHtmlTag(full, offset)) return url;
      const safeUrl = escapeHtml(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
    });
  };

  const renderMarkdownLite = (markdown) => {
    const text = String(markdown || '').replace(/\r\n/g, '\n');
    const blocks = [];
    let i = 0;

    while (i < text.length) {
      const fenceStart = text.indexOf('```', i);
      if (fenceStart === -1) {
        blocks.push({ type: 'text', value: text.slice(i) });
        break;
      }

      if (fenceStart > i) blocks.push({ type: 'text', value: text.slice(i, fenceStart) });

      const fenceEnd = text.indexOf('```', fenceStart + 3);
      if (fenceEnd === -1) {
        blocks.push({ type: 'text', value: text.slice(fenceStart) });
        break;
      }

      const codeRaw = text.slice(fenceStart + 3, fenceEnd);
      const code = codeRaw.replace(/^\w+\n/, '');
      blocks.push({ type: 'code', value: code });
      i = fenceEnd + 3;
    }

    const htmlParts = [];
    for (const b of blocks) {
      if (b.type === 'code') {
        htmlParts.push(`<pre><code>${escapeHtml(b.value)}</code></pre>`);
        continue;
      }

      const lines = b.value.split('\n');
      let ul = null;
      let ol = null;

      const flushLists = () => {
        if (ul) {
          htmlParts.push(`<ul>${ul.join('')}</ul>`);
          ul = null;
        }
        if (ol) {
          htmlParts.push(`<ol>${ol.join('')}</ol>`);
          ol = null;
        }
      };

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          flushLists();
          continue;
        }

        const bullet = line.match(/^\s*-\s+(.*)$/);
        if (bullet) {
          ol = null;
          ul = ul || [];
          ul.push(`<li>${linkify(escapeHtml(bullet[1]))}</li>`);
          continue;
        }

        const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
        if (numbered) {
          ul = null;
          ol = ol || [];
          ol.push(`<li>${linkify(escapeHtml(numbered[1]))}</li>`);
          continue;
        }

        flushLists();
        const inlineCode = escapeHtml(line).replace(/`([^`]+)`/g, (_m, c) => `<code>${escapeHtml(c)}</code>`);
        htmlParts.push(`<p>${linkify(inlineCode)}</p>`);
      }

      flushLists();
    }

    return htmlParts.join('');
  };

  const addMessage = (content, role) => {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    if (role === 'assistant') {
      msg.innerHTML = renderMarkdownLite(content);
    } else {
      msg.textContent = content;
    }
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
      
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(errText || 'Failed to send message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = addMessage('', 'assistant');
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const lines = rawEvent.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            if (!data) continue;

            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            if (parsed && parsed.sessionId) sessionId = parsed.sessionId;
            if (parsed && parsed.text) {
              fullContent += parsed.text;
              assistantMsg.innerHTML = renderMarkdownLite(fullContent);
              messageList.scrollTop = messageList.scrollHeight;
            }
          }
        }
      }
    } catch (error) {
      typingIndicator.style.display = 'none';
      console.error('AI Chatbot: sendMessage failed', error);
      addMessage(`Sorry, I encountered an error. ${error?.message ? `(${error.message})` : ''}`.trim(), 'assistant');
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
