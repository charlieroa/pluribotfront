/**
 * Embed routes — serves the embeddable builder for third-party platforms
 * GET /embed — returns minimal HTML shell that loads the React embed app
 */
import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const apiKey = _req.query.apiKey as string || ''
  const theme = _req.query.theme as string || '{}'
  const locale = _req.query.locale as string || 'es'

  res.setHeader('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plury Builder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
    #plury-embed { width: 100%; height: 100vh; display: flex; flex-direction: column; }
    .plury-header { padding: 12px 16px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 8px; }
    .plury-header img { height: 24px; }
    .plury-main { flex: 1; display: flex; overflow: hidden; }
    .plury-chat { width: 380px; border-right: 1px solid #1e293b; display: flex; flex-direction: column; }
    .plury-preview { flex: 1; background: #fff; position: relative; }
    .plury-preview iframe { width: 100%; height: 100%; border: none; }
    .plury-input-area { padding: 12px; border-top: 1px solid #1e293b; }
    .plury-input { width: 100%; padding: 10px 14px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; font-size: 14px; outline: none; resize: none; }
    .plury-input:focus { border-color: #6366f1; }
    .plury-input::placeholder { color: #64748b; }
    .plury-messages { flex: 1; overflow-y: auto; padding: 16px; }
    .plury-msg { margin-bottom: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.5; max-width: 90%; }
    .plury-msg-user { background: #6366f1; color: white; margin-left: auto; }
    .plury-msg-bot { background: #1e293b; color: #e2e8f0; }
    .plury-status { padding: 8px 16px; font-size: 11px; color: #64748b; text-align: center; }
    .plury-btn { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
    .plury-btn:hover { background: #4f46e5; }
    .plury-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 768px) {
      .plury-main { flex-direction: column; }
      .plury-chat { width: 100%; height: 50%; border-right: none; border-bottom: 1px solid #1e293b; }
    }
  </style>
</head>
<body>
  <div id="plury-embed">
    <div class="plury-header">
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="#6366f1"/><path d="M10 16l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-weight:600;font-size:15px;" id="plury-brand">Plury Builder</span>
    </div>
    <div class="plury-main">
      <div class="plury-chat">
        <div class="plury-messages" id="plury-messages">
          <div class="plury-msg plury-msg-bot">
            Describe what you want to build and I'll create it for you.
          </div>
        </div>
        <div id="plury-status" class="plury-status" style="display:none;"></div>
        <div class="plury-input-area">
          <textarea class="plury-input" id="plury-input" rows="2" placeholder="Describe your website or app..."></textarea>
          <button class="plury-btn" id="plury-send" style="margin-top:8px;width:100%;">Generate</button>
        </div>
      </div>
      <div class="plury-preview">
        <div id="plury-empty" style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;">
          Your creation will appear here
        </div>
        <iframe id="plury-iframe" style="display:none;"></iframe>
      </div>
    </div>
  </div>

  <script>
  (function() {
    var API_KEY = ${JSON.stringify(apiKey)};
    var API_BASE = window.location.origin + '/api/v1';
    var THEME = {};
    try { THEME = JSON.parse(${JSON.stringify(theme)}); } catch(e) {}

    // Apply theme
    if (THEME.primaryColor) {
      document.querySelectorAll('.plury-btn').forEach(function(b) { b.style.background = THEME.primaryColor; });
      document.querySelector('.plury-input:focus') && (document.querySelector('.plury-input').style.borderColor = THEME.primaryColor);
    }
    if (THEME.brandName) {
      document.getElementById('plury-brand').textContent = THEME.brandName;
    }

    var messagesEl = document.getElementById('plury-messages');
    var inputEl = document.getElementById('plury-input');
    var sendBtn = document.getElementById('plury-send');
    var statusEl = document.getElementById('plury-status');
    var iframeEl = document.getElementById('plury-iframe');
    var emptyEl = document.getElementById('plury-empty');
    var generating = false;

    function addMessage(text, isUser) {
      var div = document.createElement('div');
      div.className = 'plury-msg ' + (isUser ? 'plury-msg-user' : 'plury-msg-bot');
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setStatus(text) {
      statusEl.style.display = text ? 'block' : 'none';
      statusEl.textContent = text;
    }

    function showPreview(html) {
      emptyEl.style.display = 'none';
      iframeEl.style.display = 'block';
      iframeEl.srcdoc = html;
      // Enable edit mode after a short delay so the iframe loads
      setTimeout(function() {
        iframeEl.contentWindow.postMessage({ type: 'toggle-edit-mode', enabled: true }, '*');
        addMessage('You can now click any element in the preview to edit it visually. Double-click text to edit inline.', false);
      }, 1000);
    }

    async function generate(prompt) {
      if (!API_KEY) { addMessage('Error: No API key configured.', false); return; }
      generating = true;
      sendBtn.disabled = true;
      addMessage(prompt, true);
      setStatus('Generating...');

      try {
        var res = await fetch(API_BASE + '/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
          body: JSON.stringify({ prompt: prompt, agent: 'dev' })
        });
        var data = await res.json();
        if (!res.ok) { addMessage('Error: ' + (data.error || 'Unknown error'), false); return; }

        var genId = data.id;
        setStatus('Processing... This may take a minute.');

        // Poll for results
        var maxPolls = 120;
        for (var i = 0; i < maxPolls; i++) {
          await new Promise(function(r) { setTimeout(r, 3000); });
          var pollRes = await fetch(API_BASE + '/generations/' + genId, {
            headers: { 'X-API-Key': API_KEY }
          });
          var pollData = await pollRes.json();

          if (pollData.status === 'completed' && pollData.results && pollData.results.length > 0) {
            var result = pollData.results[0];
            setStatus('');
            addMessage('Done! Your creation is ready.', false);
            if (result.html) showPreview(result.html);
            if (result.published_url) addMessage('Published: ' + result.published_url, false);

            // Notify parent window
            window.parent.postMessage({
              type: 'plury:complete',
              id: genId,
              result: result
            }, '*');
            break;
          }
          setStatus('Processing... (' + (i + 1) + ')');
        }
      } catch (err) {
        addMessage('Error: ' + err.message, false);
        setStatus('');
      } finally {
        generating = false;
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener('click', function() {
      var val = inputEl.value.trim();
      if (!val || generating) return;
      inputEl.value = '';
      generate(val);
    });

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    // Listen for parent messages
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'plury:generate') {
        generate(e.data.prompt);
      }
      if (e.data && e.data.type === 'plury:setApiKey') {
        API_KEY = e.data.apiKey;
      }
      // Forward visual editor events to parent
      if (e.data && e.data.type === 'element-selected') {
        window.parent.postMessage({ type: 'plury:element-selected', element: e.data }, '*');
      }
      if (e.data && e.data.type === 'content-updated') {
        window.parent.postMessage({ type: 'plury:content-updated', html: e.data.html }, '*');
      }
    });
  })();
  </script>
</body>
</html>`)
})

export default router
