/**
 * Standalone embeddable visual editor
 * GET  /editor?token=xxx&id=deliverableId   — Serve editor page
 * POST /editor/save                          — Persist edited HTML to DB
 *
 * Agencies can iframe the editor URL so their clients can edit visually.
 * All editor operations are FREE (no token consumption).
 */
import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import type { Request, Response } from 'express'
import { prisma } from '../db/client.js'
import { VISUAL_EDITOR_SCRIPT } from '../services/html-utils.js'
import { deployProject } from '../services/deploy.js'
import { getNextVersionInfo } from '../services/deliverable-versioning.js'

const router = Router()

// Rate limit for editor save — 30 saves per minute per token
const saveRateMap = new Map<string, { count: number; resetAt: number }>()
function checkSaveRate(token: string): boolean {
  const now = Date.now()
  const entry = saveRateMap.get(token)
  if (!entry || now > entry.resetAt) {
    saveRateMap.set(token, { count: 1, resetAt: now + 60_000 })
    return true
  }
  entry.count++
  return entry.count <= 30
}

// Helper: validate editor token and return conversation + deliverable
async function validateEditorToken(token: string, deliverableId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { editorToken: token },
    include: {
      deliverables: {
        where: { id: deliverableId },
        take: 1,
      },
    },
  })

  if (!conversation) return null

  // Check expiration
  if (conversation.editorTokenExpiresAt && conversation.editorTokenExpiresAt < new Date()) {
    return null
  }

  if (conversation.deliverables.length === 0) return null

  return { conversation, deliverable: conversation.deliverables[0] }
}

// ─── GET / ─── Serve editor page
router.get('/', async (req: Request, res: Response) => {
  const { token, id } = req.query as { token?: string; id?: string }

  if (!token || !id) {
    res.status(400).send(errorPage('Missing token or id parameter'))
    return
  }

  try {
    const result = await validateEditorToken(token, id)

    if (!result) {
      res.status(403).send(errorPage('Invalid or expired editor token'))
      return
    }

    const { deliverable, conversation } = result
    if (!deliverable.content) {
      res.status(400).send(errorPage('No content to edit'))
      return
    }

    const APP_DOMAIN = process.env.APP_DOMAIN || 'plury.co'
    const saveEndpoint = `https://${APP_DOMAIN}/editor/save`

    res.setHeader('Content-Type', 'text/html')
    res.send(buildEditorPage(deliverable.content, deliverable.id, conversation.id, token, saveEndpoint, deliverable.title))
  } catch (err) {
    console.error('[Editor] Error:', err)
    res.status(500).send(errorPage('Internal error'))
  }
})

// ─── POST /save ─── Persist edited HTML to DB (no tokens consumed)
router.post('/save', async (req: Request, res: Response) => {
  const { token, deliverable_id, html } = req.body as {
    token?: string
    deliverable_id?: string
    html?: string
  }

  if (!token || !deliverable_id || !html) {
    res.status(400).json({ error: 'token, deliverable_id, and html are required' })
    return
  }

  if (typeof html !== 'string' || html.length < 50) {
    res.status(400).json({ error: 'Invalid HTML content' })
    return
  }

  // Max 5MB of HTML
  if (html.length > 5 * 1024 * 1024) {
    res.status(413).json({ error: 'HTML content too large (max 5MB)' })
    return
  }

  if (!checkSaveRate(token)) {
    res.status(429).json({ error: 'Too many saves. Max 30 per minute.' })
    return
  }

  try {
    const result = await validateEditorToken(token, deliverable_id)

    if (!result) {
      res.status(403).json({ error: 'Invalid or expired editor token' })
      return
    }

    const { deliverable, conversation } = result

    // Save as new version
    const { parentId, version } = await getNextVersionInfo(conversation.id, deliverable.instanceId)
    const newId = uuid()
    await prisma.deliverable.create({
      data: {
        id: newId,
        conversationId: conversation.id,
        title: deliverable.title,
        type: deliverable.type,
        content: html,
        agent: deliverable.agent,
        botType: deliverable.botType,
        instanceId: deliverable.instanceId,
        version,
        parentId,
        publishSlug: deliverable.publishSlug,
        createdAt: new Date(),
      },
    })

    // If published, re-deploy
    if (deliverable.publishSlug) {
      await deployProject(newId, html)
    }

    // Update the editor token to point to the new deliverable
    // (so subsequent saves work on the latest version)
    res.json({
      deliverable_id: newId,
      version,
      published_url: deliverable.publishSlug
        ? `https://${deliverable.publishSlug}.${process.env.APP_DOMAIN || 'plury.co'}`
        : null,
      message: 'Saved successfully',
    })
  } catch (err) {
    console.error('[Editor] Save error:', err)
    res.status(500).json({ error: 'Internal error saving changes' })
  }
})

function errorPage(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Plury Editor</title></head>
<body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;">
<div style="text-align:center;"><h2>Error</h2><p>${message}</p></div></body></html>`
}

function buildEditorPage(html: string, deliverableId: string, conversationId: string, editorToken: string, saveEndpoint: string, title: string): string {
  // Inject the visual editor script if not already present
  let content = html
  if (!content.includes('toggle-edit-mode')) {
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${VISUAL_EDITOR_SCRIPT}\n</body>`)
    } else {
      content += VISUAL_EDITOR_SCRIPT
    }
  }

  // Encode HTML for safe embedding in srcdoc
  const encodedHtml = content
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')

  // Escape values for safe JS embedding
  const safeDeliverableId = deliverableId.replace(/'/g, "\\'")
  const safeConvId = conversationId.replace(/'/g, "\\'")
  const safeToken = editorToken.replace(/'/g, "\\'")
  const safeSaveEndpoint = saveEndpoint.replace(/'/g, "\\'")
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plury Editor — ${safeTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Raleway:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Nunito:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; }

    .editor-header { height: 48px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; flex-shrink: 0; }
    .editor-header-left { display: flex; align-items: center; gap: 12px; }
    .editor-title { font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .editor-badge { font-size: 10px; font-weight: 600; background: #6366f1; color: white; padding: 2px 8px; border-radius: 9999px; }
    .editor-actions { display: flex; gap: 6px; }
    .editor-btn { padding: 6px 14px; font-size: 12px; font-weight: 500; border: none; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
    .editor-btn-secondary { background: #334155; color: #e2e8f0; }
    .editor-btn-secondary:hover { background: #475569; }
    .editor-btn-primary { background: #6366f1; color: white; }
    .editor-btn-primary:hover { background: #4f46e5; }
    .editor-btn-success { background: #22c55e; color: white; }

    .editor-body { flex: 1; display: flex; overflow: hidden; }

    .editor-sidebar { width: 280px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0; }
    .sidebar-section { padding: 12px; border-bottom: 1px solid #334155; }
    .sidebar-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
    .sidebar-info { font-size: 11px; color: #94a3b8; padding: 8px; background: #0f172a; border-radius: 6px; text-align: center; }

    .font-btn { display: inline-block; padding: 4px 8px; margin: 2px; font-size: 11px; background: #334155; color: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; transition: all 0.15s; }
    .font-btn:hover { background: #475569; }
    .color-btn { width: 24px; height: 24px; border-radius: 6px; border: 1px solid #475569; cursor: pointer; transition: transform 0.15s; display: inline-block; margin: 2px; }
    .color-btn:hover { transform: scale(1.15); }
    .size-btn { padding: 3px 6px; font-size: 10px; background: #334155; color: #94a3b8; border: none; border-radius: 4px; cursor: pointer; margin: 1px; }
    .size-btn:hover { background: #475569; color: #e2e8f0; }

    .editor-preview { flex: 1; background: white; position: relative; }
    .editor-preview iframe { width: 100%; height: 100%; border: none; }

    .editor-status { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: #1e293b; color: #94a3b8; padding: 6px 16px; border-radius: 9999px; font-size: 11px; display: none; z-index: 10; border: 1px solid #334155; }

    .selected-info { padding: 8px; background: #6366f1/10; border: 1px solid rgba(99,102,241,0.3); border-radius: 6px; margin-bottom: 8px; }
    .selected-info .tag { font-size: 9px; font-weight: 700; background: #6366f1; color: white; padding: 1px 6px; border-radius: 4px; display: inline-block; }
    .selected-info .text { font-size: 10px; color: #94a3b8; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    @media (max-width: 768px) {
      .editor-sidebar { display: none; }
    }
  </style>
</head>
<body>
  <div class="editor-header">
    <div class="editor-header-left">
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="#6366f1"/><path d="M10 16l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="editor-title">${safeTitle}</span>
      <span class="editor-badge">Editor</span>
    </div>
    <div class="editor-actions">
      <button class="editor-btn editor-btn-secondary" id="btn-undo" title="Deshacer">&#8630; Undo</button>
      <button class="editor-btn editor-btn-secondary" id="btn-redo" title="Rehacer">&#8631; Redo</button>
      <button class="editor-btn editor-btn-primary" id="btn-save">Save Changes</button>
    </div>
  </div>

  <div class="editor-body">
    <div class="editor-sidebar">
      <div class="sidebar-section" id="element-section">
        <div class="sidebar-label">Selected Element</div>
        <div class="sidebar-info" id="no-selection">Click any element in the preview to select it. Double-click to edit text.</div>
        <div id="selection-tools" style="display:none;">
          <div class="selected-info">
            <span class="tag" id="sel-tag"></span>
            <div class="text" id="sel-text"></div>
          </div>
        </div>
      </div>
      <div class="sidebar-section" id="font-section" style="display:none;">
        <div class="sidebar-label">Font</div>
        <div id="font-buttons"></div>
      </div>
      <div class="sidebar-section" id="size-section" style="display:none;">
        <div class="sidebar-label">Size</div>
        <div id="size-buttons"></div>
      </div>
      <div class="sidebar-section" id="textcolor-section" style="display:none;">
        <div class="sidebar-label">Text Color</div>
        <div id="textcolor-buttons"></div>
      </div>
      <div class="sidebar-section" id="bgcolor-section" style="display:none;">
        <div class="sidebar-label">Background</div>
        <div id="bgcolor-buttons"></div>
      </div>
    </div>

    <div class="editor-preview">
      <iframe id="preview-iframe" srcdoc="${encodedHtml}" sandbox="allow-scripts allow-same-origin"></iframe>
      <div class="editor-status" id="status-bar"></div>
    </div>
  </div>

  <script>
  (function() {
    var iframe = document.getElementById('preview-iframe');
    var statusBar = document.getElementById('status-bar');
    var saveBtn = document.getElementById('btn-save');
    var selectedElement = null;
    var hasChanges = false;
    var currentDeliverableId = '${safeDeliverableId}';
    var saving = false;

    var FONTS = [
      { label: 'Poppins', value: "'Poppins', sans-serif" },
      { label: 'Inter', value: "'Inter', sans-serif" },
      { label: 'Roboto', value: "'Roboto', sans-serif" },
      { label: 'Open Sans', value: "'Open Sans', sans-serif" },
      { label: 'Montserrat', value: "'Montserrat', sans-serif" },
      { label: 'Lato', value: "'Lato', sans-serif" },
      { label: 'Playfair', value: "'Playfair Display', serif" },
      { label: 'Merriweather', value: "'Merriweather', serif" },
      { label: 'Raleway', value: "'Raleway', sans-serif" },
      { label: 'Nunito', value: "'Nunito', sans-serif" },
      { label: 'DM Sans', value: "'DM Sans', sans-serif" },
      { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif" },
    ];
    var SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px','36px','48px','64px'];
    var COLORS = ['#000000','#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a78bfa','#ec4899','#6b7280','#0f172a','#1e40af','#15803d','#b91c1c','#db2777','#0891b2'];

    var fontContainer = document.getElementById('font-buttons');
    FONTS.forEach(function(f) {
      var btn = document.createElement('button');
      btn.className = 'font-btn';
      btn.textContent = f.label;
      btn.style.fontFamily = f.value;
      btn.onclick = function() {
        applyStyle({ fontFamily: f.value });
        var fontName = f.label.replace(/ /g, '+');
        iframe.contentWindow.postMessage({ type: 'inject-font', fontName: fontName }, '*');
      };
      fontContainer.appendChild(btn);
    });

    var sizeContainer = document.getElementById('size-buttons');
    SIZES.forEach(function(s) {
      var btn = document.createElement('button');
      btn.className = 'size-btn';
      btn.textContent = parseInt(s);
      btn.onclick = function() { applyStyle({ fontSize: s }); };
      sizeContainer.appendChild(btn);
    });

    function buildColorBtns(containerId, prop) {
      var container = document.getElementById(containerId);
      COLORS.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'color-btn';
        btn.style.backgroundColor = c;
        btn.title = c;
        btn.onclick = function() {
          var styles = {};
          styles[prop] = c;
          applyStyle(styles);
        };
        container.appendChild(btn);
      });
    }
    buildColorBtns('textcolor-buttons', 'color');
    buildColorBtns('bgcolor-buttons', 'backgroundColor');

    iframe.onload = function() {
      setTimeout(function() {
        iframe.contentWindow.postMessage({ type: 'toggle-edit-mode', enabled: true }, '*');
      }, 300);
    };

    function applyStyle(styles) {
      iframe.contentWindow.postMessage({ type: 'apply-style', styles: styles }, '*');
      hasChanges = true;
    }

    function showStatus(text, isError) {
      statusBar.textContent = text;
      statusBar.style.display = 'block';
      statusBar.style.borderColor = isError ? '#ef4444' : '#334155';
      statusBar.style.color = isError ? '#fca5a5' : '#94a3b8';
      setTimeout(function() { statusBar.style.display = 'none'; }, 3000);
    }

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'element-selected') {
        selectedElement = e.data;
        document.getElementById('no-selection').style.display = 'none';
        document.getElementById('selection-tools').style.display = 'block';
        document.getElementById('sel-tag').textContent = e.data.elementLabel || e.data.tag;
        document.getElementById('sel-text').textContent = e.data.text || '';
        var isImg = e.data.isImage;
        document.getElementById('font-section').style.display = isImg ? 'none' : 'block';
        document.getElementById('size-section').style.display = isImg ? 'none' : 'block';
        document.getElementById('textcolor-section').style.display = isImg ? 'none' : 'block';
        document.getElementById('bgcolor-section').style.display = 'block';
      }
      if (e.data && e.data.type === 'element-deselected') {
        selectedElement = null;
        document.getElementById('no-selection').style.display = 'block';
        document.getElementById('selection-tools').style.display = 'none';
        document.getElementById('font-section').style.display = 'none';
        document.getElementById('size-section').style.display = 'none';
        document.getElementById('textcolor-section').style.display = 'none';
        document.getElementById('bgcolor-section').style.display = 'none';
      }
      if (e.data && e.data.type === 'content-updated') {
        hasChanges = true;
      }
    });

    document.getElementById('btn-undo').onclick = function() {
      iframe.contentWindow.postMessage({ type: 'undo' }, '*');
    };
    document.getElementById('btn-redo').onclick = function() {
      iframe.contentWindow.postMessage({ type: 'redo' }, '*');
    };

    // Save: get HTML from iframe, then POST to /editor/save
    saveBtn.onclick = function() {
      if (saving) return;
      iframe.contentWindow.postMessage({ type: 'get-content' }, '*');
      showStatus('Saving...');
    };

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'content-html' && !saving) {
        doSave(e.data.html);
      }
      // Fallback for older visual editor that sends content-updated with html
      if (e.data && e.data.type === 'content-updated' && e.data.html && !saving && hasChanges) {
        doSave(e.data.html);
      }
    });

    function doSave(htmlContent) {
      if (!htmlContent || saving) return;
      saving = true;
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      fetch('${safeSaveEndpoint}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: '${safeToken}',
          deliverable_id: currentDeliverableId,
          html: htmlContent,
        }),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        saving = false;
        saveBtn.disabled = false;
        if (data.error) {
          saveBtn.textContent = 'Save Changes';
          showStatus('Error: ' + data.error, true);
        } else {
          // Update deliverable ID for next save
          currentDeliverableId = data.deliverable_id;
          hasChanges = false;
          saveBtn.textContent = 'Saved!';
          saveBtn.className = 'editor-btn editor-btn-success';
          showStatus('Saved — v' + data.version + (data.published_url ? ' (live)' : ''));
          // Also notify parent window for agency integration
          window.parent.postMessage({
            type: 'plury:editor-save',
            deliverableId: data.deliverable_id,
            conversationId: '${safeConvId}',
            version: data.version,
            published_url: data.published_url,
          }, '*');
          setTimeout(function() {
            saveBtn.textContent = 'Save Changes';
            saveBtn.className = 'editor-btn editor-btn-primary';
          }, 2000);
        }
      })
      .catch(function(err) {
        saving = false;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
        showStatus('Save failed — check connection', true);
      });
    }
  })();
  </script>
</body>
</html>`
}

export default router
