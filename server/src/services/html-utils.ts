// Extract structured design context from Pixel's HTML output for Logic
export function extractDesignContext(html: string): string {
  const parts: string[] = []

  // Extract tailwind.config block
  const configMatch = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\n\s*\})\s*<\/script>/m)
  if (configMatch) {
    parts.push(`=== TAILWIND CONFIG (usa este EXACTO) ===\ntailwind.config = ${configMatch[1]}`)
  }

  // Extract Google Fonts link
  const fontsMatch = html.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/g)
  if (fontsMatch) {
    parts.push(`=== GOOGLE FONTS ===\n${fontsMatch.join('\n')}`)
  }

  // Extract generated image URLs
  const imgUrls = html.match(/\/uploads\/generated\/[^"'\s)]+/g)
  if (imgUrls && imgUrls.length > 0) {
    const unique = [...new Set(imgUrls)]
    parts.push(`=== IMAGENES GENERADAS (mantener URLs exactas) ===\n${unique.join('\n')}`)
  }

  // Extract Unsplash image URLs
  const unsplashUrls = html.match(/https:\/\/images\.unsplash\.com\/[^"'\s)]+/g)
  if (unsplashUrls && unsplashUrls.length > 0) {
    const unique = [...new Set(unsplashUrls)]
    parts.push(`=== FOTOS UNSPLASH (mantener URLs exactas) ===\n${unique.join('\n')}`)
  }

  // Extract section structure
  const sections: string[] = []
  const sectionRegex = /<(nav|header|section|main|footer)[^>]*(?:class="([^"]*)")?[^>]*>/gi
  let match
  while ((match = sectionRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const classes = match[2] || ''
    sections.push(`<${tag}> ${classes ? `class="${classes.slice(0, 100)}"` : ''}`)
  }
  if (sections.length > 0) {
    parts.push(`=== ESTRUCTURA DE SECCIONES ===\n${sections.join('\n')}`)
  }

  return parts.length > 0 ? parts.join('\n\n') : ''
}

// Visual editor script — injected into HTML deliverables for inline editing
export const VISUAL_EDITOR_SCRIPT = `<script>
(function() {
  var editMode = false;
  var selectedEl = null;
  var hoverEl = null;
  var overlay = null;

  // Intercept link clicks: allow hash scroll, block real navigation
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'A') {
        var href = target.getAttribute('href') || '';
        if (editMode) {
          e.preventDefault();
          e.stopPropagation();
          selectElement(target);
          return;
        }
        // Allow same-page hash links (scroll to section)
        if (href.startsWith('#') && href.length > 1) {
          e.preventDefault();
          var targetId = href.substring(1);
          var section = document.getElementById(targetId);
          if (section) section.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        // Block all other navigation
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      target = target.parentElement;
    }
    // Edit mode: select any element
    if (editMode) {
      e.preventDefault();
      e.stopPropagation();
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== overlay) {
        selectElement(el);
      }
    }
  }, true);

  // Prevent form submissions
  document.addEventListener('submit', function(e) { e.preventDefault(); }, true);

  // Block programmatic navigation
  var origAssign = window.location.assign;
  var origReplace = window.location.replace;
  window.location.assign = function() {};
  window.location.replace = function() {};
  window.open = function() { return null; };

  window.addEventListener('message', function(e) {
    if (e.data.type === 'toggle-edit-mode') {
      editMode = e.data.enabled;
      if (!editMode) cleanup();
    }
    if (e.data.type === 'replace-image' && selectedEl && selectedEl.tagName === 'IMG') {
      selectedEl.src = e.data.url;
      selectedEl.alt = e.data.alt || '';
      notifyContentUpdate();
    }
    if (e.data.type === 'apply-style' && selectedEl) {
      Object.assign(selectedEl.style, e.data.styles);
      notifyContentUpdate();
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!editMode) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== hoverEl && el !== overlay) {
      hoverEl = el;
      showOverlay(el);
    }
  });

  document.addEventListener('dblclick', function(e) {
    if (!editMode) return;
    var el = e.target;
    if (el.tagName === 'IMG' || el.tagName === 'SCRIPT') return;
    el.contentEditable = 'true';
    el.focus();
    el.addEventListener('blur', function handler() {
      el.contentEditable = 'false';
      el.removeEventListener('blur', handler);
      notifyContentUpdate();
    });
  });

  function selectElement(el) {
    selectedEl = el;
    showOverlay(el);
    var rect = el.getBoundingClientRect();
    window.parent.postMessage({
      type: 'element-selected',
      tag: el.tagName.toLowerCase(),
      text: el.textContent ? el.textContent.substring(0, 100) : '',
      isImage: el.tagName === 'IMG',
      imageSrc: el.tagName === 'IMG' ? el.src : null,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      classes: el.className || ''
    }, '*');
  }

  function showOverlay(el) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #3b82f6;border-radius:4px;z-index:99999;transition:all 0.15s ease;';
      document.body.appendChild(overlay);
    }
    var r = el.getBoundingClientRect();
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.style.display = 'block';
  }

  function cleanup() {
    if (overlay) overlay.style.display = 'none';
    if (selectedEl) selectedEl.contentEditable = 'false';
    selectedEl = null;
    hoverEl = null;
  }

  function notifyContentUpdate() {
    var html = document.documentElement.outerHTML;
    window.parent.postMessage({ type: 'content-updated', html: '<!DOCTYPE html>\\n' + html }, '*');
  }
})();
</script>`

// Validate HTML structure and return errors
export function validateHtml(html: string): string[] {
  const errors: string[] = []

  // Check basic structure
  const lower = html.toLowerCase()
  if (!lower.includes('<!doctype html>')) errors.push('Missing <!DOCTYPE html>')
  if (!lower.includes('<html')) errors.push('Missing <html> tag')
  if (!lower.includes('<head')) errors.push('Missing <head> tag')
  if (!lower.includes('<body')) errors.push('Missing <body> tag')

  // Check balanced tags for common structural elements
  const tagsToCheck = ['div', 'section', 'nav', 'main', 'footer', 'header']
  for (const tag of tagsToCheck) {
    const openRegex = new RegExp(`<${tag}[\\s>]`, 'gi')
    const closeRegex = new RegExp(`</${tag}>`, 'gi')
    const opens = (html.match(openRegex) || []).length
    const closes = (html.match(closeRegex) || []).length
    if (opens !== closes) {
      errors.push(`Unbalanced <${tag}> tags: ${opens} opening vs ${closes} closing`)
    }
  }

  // Check for Tailwind CDN presence (required for web/dev agents)
  if (!html.includes('cdn.tailwindcss.com')) {
    errors.push('Missing Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>)')
  }

  return errors
}

// Extract HTML content from agent output
export function extractHtmlBlock(text: string): string | null {
  const docTypeIdx = text.indexOf('<!DOCTYPE')
  const htmlTagIdx = text.indexOf('<html')
  const startIdx = docTypeIdx >= 0 ? docTypeIdx : htmlTagIdx

  if (startIdx >= 0) {
    const endIdx = text.lastIndexOf('</html>')
    if (endIdx > startIdx) {
      const html = text.substring(startIdx, endIdx + 7).trim()
      return html
    }
  }

  return null
}

export const agentColorMap: Record<string, string> = {
  seo: '#3b82f6',
  brand: '#ec4899',
  web: '#a855f7',
  social: '#f97316',
  ads: '#10b981',
  dev: '#f59e0b',
  video: '#ef4444',
}

// Wrap plain text/markdown into a styled HTML document for iframe rendering
export function wrapTextAsHtml(text: string, agentName: string, agentRole: string): string {
  const color = agentColorMap[agentName.toLowerCase()] ?? '#6b7280'
  const bodyHtml = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background: #ffffff;
    padding: 2rem;
    line-height: 1.7;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid ${color}20;
  }
  .header .badge {
    background: ${color}15;
    color: ${color};
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .header .role {
    font-size: 0.8rem;
    color: #64748b;
  }
  h1 { font-size: 1.5rem; color: #0f172a; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 1.25rem; color: #0f172a; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem; }
  h3 { font-size: 1.05rem; color: #334155; margin: 1.25rem 0 0.4rem; }
  p { margin: 0.5rem 0; color: #334155; }
  ul { margin: 0.5rem 0 0.5rem 1.5rem; }
  li { margin: 0.25rem 0; color: #475569; }
  strong { color: #0f172a; }
  code {
    background: #f1f5f9;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85em;
    color: ${color};
  }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.9rem; }
  th { background: #f8fafc; font-weight: 600; color: #0f172a; }
  td { color: #475569; }
</style>
</head>
<body>
  <div class="header">
    <span class="badge">${agentName}</span>
    <span class="role">${agentRole}</span>
  </div>
  <div class="content">
    <p>${bodyHtml}</p>
  </div>
</body>
</html>`
}
