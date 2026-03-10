// Extract structured design context from Pixel's HTML output
export function extractDesignContext(html) {
    const parts = [];
    // Extract tailwind.config block
    const configMatch = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\n\s*\})\s*<\/script>/m);
    if (configMatch) {
        parts.push(`=== TAILWIND CONFIG (usa este EXACTO) ===\ntailwind.config = ${configMatch[1]}`);
    }
    // Extract Google Fonts link
    const fontsMatch = html.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/g);
    if (fontsMatch) {
        parts.push(`=== GOOGLE FONTS ===\n${fontsMatch.join('\n')}`);
    }
    // Extract generated image URLs
    const imgUrls = html.match(/\/uploads\/generated\/[^"'\s)]+/g);
    if (imgUrls && imgUrls.length > 0) {
        const unique = [...new Set(imgUrls)];
        parts.push(`=== IMAGENES GENERADAS (mantener URLs exactas) ===\n${unique.join('\n')}`);
    }
    // Extract Unsplash image URLs
    const unsplashUrls = html.match(/https:\/\/images\.unsplash\.com\/[^"'\s)]+/g);
    if (unsplashUrls && unsplashUrls.length > 0) {
        const unique = [...new Set(unsplashUrls)];
        parts.push(`=== FOTOS UNSPLASH (mantener URLs exactas) ===\n${unique.join('\n')}`);
    }
    // Extract section structure
    const sections = [];
    const sectionRegex = /<(nav|header|section|main|footer)[^>]*(?:class="([^"]*)")?[^>]*>/gi;
    let match;
    while ((match = sectionRegex.exec(html)) !== null) {
        const tag = match[1].toLowerCase();
        const classes = match[2] || '';
        sections.push(`<${tag}> ${classes ? `class="${classes.slice(0, 100)}"` : ''}`);
    }
    if (sections.length > 0) {
        parts.push(`=== ESTRUCTURA DE SECCIONES ===\n${sections.join('\n')}`);
    }
    return parts.length > 0 ? parts.join('\n\n') : '';
}
// Visual editor script — injected into HTML deliverables for inline editing
export const VISUAL_EDITOR_SCRIPT = `<script>
(function() {
  var editMode = false;
  var selectedEl = null;
  var hoverEl = null;
  var overlay = null;
  var undoStack = [];
  var redoStack = [];

  function saveState() {
    undoStack.push(document.body.innerHTML);
    redoStack = [];
    if (undoStack.length > 50) undoStack.shift();
    window.parent.postMessage({ type: 'undo-state', canUndo: undoStack.length > 0, canRedo: false }, '*');
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(document.body.innerHTML);
    document.body.innerHTML = undoStack.pop();
    selectedEl = null;
    cleanup();
    notifyContentUpdate();
    window.parent.postMessage({ type: 'element-deselected' }, '*');
    window.parent.postMessage({ type: 'undo-state', canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }, '*');
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(document.body.innerHTML);
    document.body.innerHTML = redoStack.pop();
    selectedEl = null;
    cleanup();
    notifyContentUpdate();
    window.parent.postMessage({ type: 'element-deselected' }, '*');
    window.parent.postMessage({ type: 'undo-state', canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }, '*');
  }

  // Find the deepest (most specific) visible element at a given point
  function findDeepestElement(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el || el === overlay) return null;
    var found = el;
    while (true) {
      var children = found.children;
      var deeper = null;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child === overlay || child.tagName === 'SCRIPT') continue;
        var r = child.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          deeper = child;
        }
      }
      if (deeper) { found = deeper; } else { break; }
    }
    return found;
  }

  // Media elements that should always be selected over their wrappers
  function isMediaElement(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'IMG' || tag === 'VIDEO' || tag === 'PICTURE' || tag === 'CANVAS' ||
           tag === 'svg' || tag === 'SVG' || (el.closest && el.closest('svg'));
  }

  // Click handler: edit mode selects elements, normal mode handles links
  document.addEventListener('click', function(e) {
    if (editMode) {
      e.preventDefault();
      e.stopPropagation();
      if (isMediaElement(e.target)) {
        selectElement(e.target);
        return;
      }
      var deep = findDeepestElement(e.clientX, e.clientY);
      if (deep && deep !== overlay) {
        selectElement(deep);
      }
      return;
    }
    var link = e.target;
    while (link && link !== document.body) {
      if (link.tagName === 'A') {
        var href = link.getAttribute('href') || '';
        if (href.startsWith('#') && href.length > 1) {
          e.preventDefault();
          var section = document.getElementById(href.substring(1));
          if (section) section.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      link = link.parentElement;
    }
  }, true);

  // Prevent form submissions
  document.addEventListener('submit', function(e) { e.preventDefault(); }, true);

  // Block programmatic navigation
  window.location.assign = function() {};
  window.location.replace = function() {};
  window.open = function() { return null; };

  window.addEventListener('message', function(e) {
    if (e.data.type === 'toggle-edit-mode') {
      editMode = e.data.enabled;
      if (!editMode) cleanup();
    }
    if (e.data.type === 'replace-image' && selectedEl && selectedEl.tagName === 'IMG') {
      saveState();
      selectedEl.src = e.data.url;
      selectedEl.alt = e.data.alt || '';
      notifyContentUpdate();
    }
    if (e.data.type === 'apply-style' && selectedEl) {
      saveState();
      Object.assign(selectedEl.style, e.data.styles);
      notifyContentUpdate();
    }
    if (e.data.type === 'delete-element' && selectedEl) {
      saveState();
      selectedEl.remove();
      selectedEl = null;
      cleanup();
      notifyContentUpdate();
      window.parent.postMessage({ type: 'element-deselected' }, '*');
    }
    if (e.data.type === 'duplicate-element' && selectedEl) {
      saveState();
      var clone = selectedEl.cloneNode(true);
      selectedEl.parentNode.insertBefore(clone, selectedEl.nextSibling);
      selectElement(clone);
      notifyContentUpdate();
    }
    if (e.data.type === 'move-element-up' && selectedEl) {
      var prev = selectedEl.previousElementSibling;
      if (prev && prev !== overlay) {
        saveState();
        selectedEl.parentNode.insertBefore(selectedEl, prev);
        showOverlay(selectedEl);
        notifyContentUpdate();
      }
    }
    if (e.data.type === 'move-element-down' && selectedEl) {
      var next = selectedEl.nextElementSibling;
      if (next && next !== overlay) {
        saveState();
        selectedEl.parentNode.insertBefore(next, selectedEl);
        showOverlay(selectedEl);
        notifyContentUpdate();
      }
    }
    if (e.data.type === 'hide-element' && selectedEl) {
      saveState();
      selectedEl.style.display = 'none';
      selectedEl = null;
      cleanup();
      notifyContentUpdate();
      window.parent.postMessage({ type: 'element-deselected' }, '*');
    }
    if (e.data.type === 'undo') { undo(); }
    if (e.data.type === 'redo') { redo(); }
  });

  // Keyboard shortcuts inside iframe
  document.addEventListener('keydown', function(e) {
    if (!editMode) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl && document.activeElement !== selectedEl) {
      e.preventDefault();
      saveState();
      selectedEl.remove();
      selectedEl = null;
      cleanup();
      notifyContentUpdate();
      window.parent.postMessage({ type: 'element-deselected' }, '*');
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!editMode) return;
    var el = findDeepestElement(e.clientX, e.clientY);
    if (el && el !== hoverEl && el !== overlay) {
      hoverEl = el;
      showOverlay(el);
    }
  });

  document.addEventListener('dblclick', function(e) {
    if (!editMode) return;
    var el = e.target;
    if (el.tagName === 'IMG' || el.tagName === 'SCRIPT') return;
    saveState();
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
    var isSvg = el.tagName === 'svg' || el.tagName === 'SVG' || (el.closest && el.closest('svg'));
    window.parent.postMessage({
      type: 'element-selected',
      tag: el.tagName.toLowerCase(),
      text: el.textContent ? el.textContent.substring(0, 100) : '',
      isImage: el.tagName === 'IMG',
      isSvg: !!isSvg,
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
</script>`;
// Logo selection script — injected into brand/logo deliverables for selecting one of multiple logo options
export const LOGO_SELECTION_SCRIPT = `<script>
(function() {
  function initLogoSelection() {
    // Find logo grid: look for img elements inside card-like containers
    var cards = [];
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function(img, idx) {
      // Heuristic: logo grids typically have 2-6 images in a grid/flex container
      var parent = img.closest('[class*="grid"], [class*="flex"], [class*="gap"]');
      if (parent && parent.querySelectorAll('img').length >= 2) {
        var card = img.closest('[class*="rounded"], [class*="border"], [class*="shadow"], [class*="p-"]') || img.parentElement;
        if (card && cards.indexOf(card) === -1) {
          cards.push(card);
          card.dataset.logoIndex = String(cards.length - 1);
          card.style.cursor = 'pointer';
          card.style.transition = 'all 0.2s ease';
          card.style.position = 'relative';

          card.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Deselect all
            cards.forEach(function(c) {
              c.style.outline = '';
              c.style.outlineOffset = '';
              c.style.boxShadow = '';
              var badge = c.querySelector('.logo-check-badge');
              if (badge) badge.remove();
            });
            // Select this one
            card.style.outline = '3px solid #3b82f6';
            card.style.outlineOffset = '2px';
            card.style.boxShadow = '0 0 20px rgba(59,130,246,0.3)';
            // Add check badge
            var badge = document.createElement('div');
            badge.className = 'logo-check-badge';
            badge.style.cssText = 'position:absolute;top:8px;right:8px;width:24px;height:24px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            card.appendChild(badge);

            var logoImg = card.querySelector('img');
            var logoSrc = logoImg ? logoImg.src : '';
            var logoStyle = card.querySelector('h3,h4,p,span');
            var logoStyleText = logoStyle ? logoStyle.textContent : '';

            window.__selectedLogo = {
              index: parseInt(card.dataset.logoIndex),
              src: logoSrc,
              style: logoStyleText
            };

            window.parent.postMessage({
              type: 'logo-selected',
              logoIndex: parseInt(card.dataset.logoIndex),
              logoSrc: logoSrc,
              logoStyle: logoStyleText
            }, '*');
          });
        }
      }
    });

    if (cards.length >= 2) {
      // Add hint text
      var hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:8px 16px;border-radius:8px;font-size:12px;z-index:9999;backdrop-filter:blur(8px);';
      hint.textContent = 'Haz clic en un logo para seleccionarlo';
      document.body.appendChild(hint);
      setTimeout(function() { hint.style.opacity = '0'; hint.style.transition = 'opacity 0.5s'; }, 4000);
      setTimeout(function() { hint.remove(); }, 4500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogoSelection);
  } else {
    setTimeout(initLogoSelection, 300);
  }
})();
</script>`;
// Auto-fix unbalanced HTML tags by closing any that remain open
export function sanitizeHtml(html) {
    // Strip <script> content to avoid counting JSX tags inside babel scripts
    const scriptRanges = [];
    const scriptRegex = /<script[\s\S]*?<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        scriptRanges.push({ start: scriptMatch.index, end: scriptMatch.index + scriptMatch[0].length });
    }
    const isInsideScript = (pos) => scriptRanges.some(r => pos >= r.start && pos < r.end);
    const tagsToFix = ['div', 'section', 'nav', 'main', 'footer', 'header', 'aside', 'article'];
    let result = html;
    for (const tag of tagsToFix) {
        // Count opens and closes outside of scripts
        const openRegex = new RegExp(`<${tag}[\\s>]`, 'gi');
        const closeRegex = new RegExp(`</${tag}>`, 'gi');
        let opens = 0;
        let closes = 0;
        let m;
        while ((m = openRegex.exec(result)) !== null) {
            if (!isInsideScript(m.index))
                opens++;
        }
        while ((m = closeRegex.exec(result)) !== null) {
            if (!isInsideScript(m.index))
                closes++;
        }
        const missing = opens - closes;
        if (missing > 0) {
            // Insert missing closing tags before </body> or at the end
            const closingTags = `</${tag}>`.repeat(missing);
            const bodyCloseIdx = result.lastIndexOf('</body>');
            if (bodyCloseIdx > 0) {
                result = result.slice(0, bodyCloseIdx) + closingTags + '\n' + result.slice(bodyCloseIdx);
            }
            else {
                result += closingTags;
            }
        }
    }
    return result;
}
// Validate HTML structure and return errors
export function validateHtml(html) {
    const errors = [];
    // Check basic structure
    const lower = html.toLowerCase();
    if (!lower.includes('<!doctype html>'))
        errors.push('Missing <!DOCTYPE html>');
    if (!lower.includes('<html'))
        errors.push('Missing <html> tag');
    if (!lower.includes('<head'))
        errors.push('Missing <head> tag');
    if (!lower.includes('<body'))
        errors.push('Missing <body> tag');
    // Strip <script> content before checking tag balance (JSX inside babel scripts confuses counting)
    const htmlWithoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Check balanced tags for common structural elements
    const tagsToCheck = ['div', 'section', 'nav', 'main', 'footer', 'header'];
    for (const tag of tagsToCheck) {
        const openRegex = new RegExp(`<${tag}[\\s>]`, 'gi');
        const closeRegex = new RegExp(`</${tag}>`, 'gi');
        const opens = (htmlWithoutScripts.match(openRegex) || []).length;
        const closes = (htmlWithoutScripts.match(closeRegex) || []).length;
        if (opens !== closes) {
            errors.push(`Unbalanced <${tag}> tags: ${opens} opening vs ${closes} closing`);
        }
    }
    // Check for Tailwind CDN presence (required for web/dev agents)
    if (!html.includes('cdn.tailwindcss.com')) {
        errors.push('Missing Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>)');
    }
    return errors;
}
// Extract HTML content from agent output
export function extractHtmlBlock(text) {
    const docTypeIdx = text.indexOf('<!DOCTYPE');
    const htmlTagIdx = text.indexOf('<html');
    const startIdx = docTypeIdx >= 0 ? docTypeIdx : htmlTagIdx;
    if (startIdx < 0)
        return null;
    const endIdx = text.lastIndexOf('</html>');
    if (endIdx > startIdx) {
        return text.substring(startIdx, endIdx + 7).trim();
    }
    // Truncated HTML — the model hit output limit before closing tags
    // Try to salvage by closing open tags
    let html = text.substring(startIdx).trim();
    // Find if we have at least <head> and some <body> content
    const hasHead = html.includes('<head');
    const hasBody = html.includes('<body');
    if (!hasHead && !hasBody)
        return null;
    // Close any unclosed script/style tags first
    const lastOpenScript = html.lastIndexOf('<script');
    const lastCloseScript = html.lastIndexOf('</script>');
    if (lastOpenScript > lastCloseScript) {
        // Truncated inside a script — remove the incomplete script block
        html = html.substring(0, lastOpenScript);
    }
    const lastOpenStyle = html.lastIndexOf('<style');
    const lastCloseStyle = html.lastIndexOf('</style>');
    if (lastOpenStyle > lastCloseStyle) {
        html = html.substring(0, lastOpenStyle);
    }
    // Append closing tags
    if (!html.includes('</body>'))
        html += '\n</body>';
    if (!html.includes('</html>'))
        html += '\n</html>';
    console.warn(`[extractHtmlBlock] Recovered truncated HTML (${html.length} chars)`);
    return html;
}
// UI component library — injected into dev agent deliverables
// Provides window.__UI with shadcn-style React components
export const DEV_UI_LIBRARY_SCRIPT = `<script>
(function() {
  if (typeof React === 'undefined') return;
  var e = React.createElement;
  var cn = function() {
    var classes = [];
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (arg) classes.push(arg);
    }
    return classes.join(' ');
  };

  // Button
  var Button = React.forwardRef(function(props, ref) {
    var variant = props.variant || 'default';
    var size = props.size || 'default';
    var className = props.className || '';
    var rest = Object.assign({}, props);
    delete rest.variant; delete rest.size; delete rest.className; delete rest.asChild;
    var base = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    var variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline'
    };
    var sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10'
    };
    return e('button', Object.assign({ ref: ref, className: cn(base, variants[variant], sizes[size], className) }, rest));
  });

  // Card
  var Card = function(p) { return e('div', { className: cn('rounded-lg border bg-card text-card-foreground shadow-sm', p.className) }, p.children); };
  var CardHeader = function(p) { return e('div', { className: cn('flex flex-col space-y-1.5 p-6', p.className) }, p.children); };
  var CardTitle = function(p) { return e('h3', { className: cn('text-2xl font-semibold leading-none tracking-tight', p.className) }, p.children); };
  var CardDescription = function(p) { return e('p', { className: cn('text-sm text-muted-foreground', p.className) }, p.children); };
  var CardContent = function(p) { return e('div', { className: cn('p-6 pt-0', p.className) }, p.children); };
  var CardFooter = function(p) { return e('div', { className: cn('flex items-center p-6 pt-0', p.className) }, p.children); };

  // Input
  var Input = React.forwardRef(function(p, ref) {
    var rest = Object.assign({}, p); delete rest.className;
    return e('input', Object.assign({ ref: ref, className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', p.className) }, rest));
  });

  // Label
  var Label = function(p) { return e('label', { htmlFor: p.htmlFor, className: cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', p.className) }, p.children); };

  // Badge
  var Badge = function(p) {
    var variant = p.variant || 'default';
    var variants = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground'
    };
    return e('div', { className: cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], p.className) }, p.children);
  };

  // Tabs
  var TabsContext = React.createContext({ value: '', onChange: function() {} });
  var Tabs = function(p) {
    var st = React.useState(p.defaultValue || p.value || '');
    var val = p.value !== undefined ? p.value : st[0];
    var setVal = function(v) { st[1](v); if (p.onValueChange) p.onValueChange(v); };
    return e(TabsContext.Provider, { value: { value: val, onChange: setVal } }, e('div', { className: cn('', p.className) }, p.children));
  };
  var TabsList = function(p) { return e('div', { className: cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', p.className) }, p.children); };
  var TabsTrigger = function(p) {
    var ctx = React.useContext(TabsContext);
    var active = ctx.value === p.value;
    return e('button', { onClick: function() { ctx.onChange(p.value); }, className: cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all', active ? 'bg-background text-foreground shadow-sm' : '', p.className) }, p.children);
  };
  var TabsContent = function(p) {
    var ctx = React.useContext(TabsContext);
    if (ctx.value !== p.value) return null;
    return e('div', { className: cn('mt-2', p.className) }, p.children);
  };

  // Dialog
  var Dialog = function(p) {
    var st = React.useState(false);
    var open = p.open !== undefined ? p.open : st[0];
    var setOpen = p.onOpenChange || st[1];
    return e(React.Fragment, null, React.Children.map(p.children, function(child) {
      if (!child) return null;
      if (child.type === DialogTrigger) return React.cloneElement(child, { onClick: function() { setOpen(true); } });
      if (child.type === DialogContent && open) return React.cloneElement(child, { onClose: function() { setOpen(false); } });
      return child;
    }));
  };
  var DialogTrigger = function(p) { return e('span', { onClick: p.onClick, className: 'cursor-pointer' }, p.children); };
  var DialogContent = function(p) {
    return e('div', { className: 'fixed inset-0 z-50 flex items-center justify-center' },
      e('div', { className: 'fixed inset-0 bg-black/50', onClick: p.onClose }),
      e('div', { className: cn('relative bg-background rounded-lg shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-auto', p.className) }, p.children)
    );
  };
  var DialogHeader = function(p) { return e('div', { className: cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', p.className) }, p.children); };
  var DialogTitle = function(p) { return e('h2', { className: cn('text-lg font-semibold leading-none tracking-tight', p.className) }, p.children); };
  var DialogDescription = function(p) { return e('p', { className: cn('text-sm text-muted-foreground', p.className) }, p.children); };
  var DialogFooter = function(p) { return e('div', { className: cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', p.className) }, p.children); };

  // Select
  var Select = function(p) {
    var st = React.useState(false);
    var val = p.value || '';
    return e('div', { className: 'relative' }, React.Children.map(p.children, function(child) {
      if (!child) return null;
      if (child.type === SelectTrigger) return React.cloneElement(child, { onClick: function() { st[1](!st[0]); }, value: val });
      if (child.type === SelectContent && st[0]) return React.cloneElement(child, { onSelect: function(v) { if (p.onValueChange) p.onValueChange(v); st[1](false); } });
      return child;
    }));
  };
  var SelectTrigger = function(p) { return e('button', { onClick: p.onClick, className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm', p.className) }, p.children); };
  var SelectValue = function(p) { return e('span', { className: 'text-sm' }, p.placeholder || ''); };
  var SelectContent = function(p) { return e('div', { className: 'absolute top-full left-0 w-full mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-auto' }, React.Children.map(p.children, function(child) { if (child && child.type === SelectItem) return React.cloneElement(child, { onSelect: p.onSelect }); return child; })); };
  var SelectItem = function(p) { return e('div', { onClick: function() { if (p.onSelect) p.onSelect(p.value); }, className: 'px-3 py-2 text-sm cursor-pointer hover:bg-accent' }, p.children); };

  // Table
  var Table = function(p) { return e('div', { className: 'relative w-full overflow-auto' }, e('table', { className: cn('w-full caption-bottom text-sm', p.className) }, p.children)); };
  var TableHeader = function(p) { return e('thead', { className: cn('[&_tr]:border-b', p.className) }, p.children); };
  var TableBody = function(p) { return e('tbody', { className: cn('[&_tr:last-child]:border-0', p.className) }, p.children); };
  var TableRow = function(p) { return e('tr', { className: cn('border-b transition-colors hover:bg-muted/50', p.className), onClick: p.onClick }, p.children); };
  var TableHead = function(p) { return e('th', { className: cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', p.className) }, p.children); };
  var TableCell = function(p) { return e('td', { className: cn('p-4 align-middle', p.className), colSpan: p.colSpan }, p.children); };

  // Switch
  var Switch = function(p) {
    return e('button', {
      role: 'switch',
      'aria-checked': !!p.checked,
      onClick: function() { if (p.onCheckedChange) p.onCheckedChange(!p.checked); },
      className: cn('peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors', p.checked ? 'bg-primary' : 'bg-input')
    }, e('span', { className: cn('pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform', p.checked ? 'translate-x-5' : 'translate-x-0') }));
  };

  // Simple components
  var Separator = function(p) { return e('div', { className: cn('shrink-0 bg-border', p.orientation === 'vertical' ? 'w-[1px] h-full' : 'h-[1px] w-full', p.className) }); };
  var ScrollArea = function(p) { return e('div', { className: cn('overflow-auto', p.className) }, p.children); };
  var Avatar = function(p) { return e('span', { className: cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', p.className) }, p.children); };
  var AvatarImage = function(p) { return e('img', { src: p.src, alt: p.alt || '', className: 'aspect-square h-full w-full object-cover' }); };
  var AvatarFallback = function(p) { return e('span', { className: cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium', p.className) }, p.children); };
  var Progress = function(p) { return e('div', { className: cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', p.className) }, e('div', { className: 'h-full bg-primary transition-all', style: { width: (p.value || 0) + '%' } })); };
  var Textarea = React.forwardRef(function(p, ref) {
    var rest = Object.assign({}, p); delete rest.className;
    return e('textarea', Object.assign({ ref: ref, className: cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', p.className) }, rest));
  });

  // Tooltip
  var TooltipProvider = function(p) { return e(React.Fragment, null, p.children); };
  var Tooltip = function(p) {
    var st = React.useState(false);
    return e('div', { className: 'relative inline-flex', onMouseEnter: function() { st[1](true); }, onMouseLeave: function() { st[1](false); } },
      React.Children.map(p.children, function(child) {
        if (!child) return null;
        if (child.type === TooltipContent && !st[0]) return null;
        return child;
      })
    );
  };
  var TooltipTrigger = function(p) { return e('span', { className: 'cursor-pointer' }, p.children); };
  var TooltipContent = function(p) { return e('div', { className: cn('absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md shadow-md whitespace-nowrap z-50', p.className) }, p.children); };

  // DropdownMenu
  var DropdownMenu = function(p) {
    var st = React.useState(false);
    var ref = React.useRef(null);
    React.useEffect(function() {
      var handler = function(ev) { if (ref.current && !ref.current.contains(ev.target)) st[1](false); };
      document.addEventListener('mousedown', handler);
      return function() { document.removeEventListener('mousedown', handler); };
    }, []);
    return e('div', { ref: ref, className: 'relative inline-block' }, React.Children.map(p.children, function(child) {
      if (!child) return null;
      if (child.type === DropdownMenuTrigger) return React.cloneElement(child, { onClick: function() { st[1](!st[0]); } });
      if (child.type === DropdownMenuContent) return st[0] ? React.cloneElement(child, { onClose: function() { st[1](false); } }) : null;
      return child;
    }));
  };
  var DropdownMenuTrigger = function(p) { return e('span', { onClick: p.onClick, className: 'cursor-pointer' }, p.children); };
  var DropdownMenuContent = function(p) { return e('div', { className: cn('absolute right-0 top-full mt-1 min-w-[8rem] bg-background border rounded-md shadow-lg z-50 p-1', p.className) }, React.Children.map(p.children, function(child) { if (child && child.type === DropdownMenuItem) return React.cloneElement(child, { parentOnClose: p.onClose }); return child; })); };
  var DropdownMenuItem = function(p) { return e('div', { onClick: function() { if (p.onClick) p.onClick(); if (p.parentOnClose) p.parentOnClose(); }, className: cn('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent', p.className) }, p.children); };
  var DropdownMenuSeparator = function() { return e('div', { className: '-mx-1 my-1 h-px bg-border' }); };

  // Expose to window
  window.__UI = {
    Button: Button, Card: Card, CardHeader: CardHeader, CardTitle: CardTitle, CardDescription: CardDescription, CardContent: CardContent, CardFooter: CardFooter,
    Input: Input, Label: Label, Badge: Badge, Textarea: Textarea,
    Tabs: Tabs, TabsList: TabsList, TabsTrigger: TabsTrigger, TabsContent: TabsContent,
    Dialog: Dialog, DialogTrigger: DialogTrigger, DialogContent: DialogContent, DialogHeader: DialogHeader, DialogTitle: DialogTitle, DialogDescription: DialogDescription, DialogFooter: DialogFooter,
    Select: Select, SelectTrigger: SelectTrigger, SelectValue: SelectValue, SelectContent: SelectContent, SelectItem: SelectItem,
    Table: Table, TableHeader: TableHeader, TableBody: TableBody, TableRow: TableRow, TableHead: TableHead, TableCell: TableCell,
    Switch: Switch, Separator: Separator, ScrollArea: ScrollArea,
    Avatar: Avatar, AvatarImage: AvatarImage, AvatarFallback: AvatarFallback, Progress: Progress,
    Tooltip: Tooltip, TooltipTrigger: TooltipTrigger, TooltipContent: TooltipContent, TooltipProvider: TooltipProvider,
    DropdownMenu: DropdownMenu, DropdownMenuTrigger: DropdownMenuTrigger, DropdownMenuContent: DropdownMenuContent, DropdownMenuItem: DropdownMenuItem, DropdownMenuSeparator: DropdownMenuSeparator
  };
})();
</script>`;
// Theme listener script — injected into dev agent deliverables for zero-cost customization
export const DEV_THEME_LISTENER_SCRIPT = `<script>
(function() {
  window.addEventListener('message', function(e) {
    if (e.data.type === 'apply-theme') {
      var theme = e.data.theme;
      // Update Tailwind config colors
      if (theme.colors && typeof tailwind !== 'undefined') {
        var cfg = tailwind.config || {};
        cfg.theme = cfg.theme || {};
        cfg.theme.extend = cfg.theme.extend || {};
        cfg.theme.extend.colors = Object.assign(cfg.theme.extend.colors || {}, theme.colors);
        tailwind.config = cfg;
      }
      // Update Google Fonts
      if (theme.fontFamily) {
        var link = document.querySelector('link[href*="fonts.googleapis.com"]');
        if (link) link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(theme.fontFamily) + ':wght@300;400;500;600;700;800;900&display=swap';
        document.body.style.fontFamily = theme.fontFamily + ', system-ui, sans-serif';
      }
      // Update data-brand-* elements
      if (theme.brand) {
        Object.keys(theme.brand).forEach(function(key) {
          var els = document.querySelectorAll('[data-brand-' + key + ']');
          els.forEach(function(el) {
            if (key === 'logo' && el.tagName === 'IMG') el.src = theme.brand[key];
            else el.textContent = theme.brand[key];
          });
        });
      }
      // Notify parent with updated HTML
      var html = document.documentElement.outerHTML;
      window.parent.postMessage({ type: 'content-updated', html: '<!DOCTYPE html>\\n' + html }, '*');
    }
  });
})();
</script>`;
// Injectable API client for project backend — Supabase-like interface
export function getProjectApiScript(baseUrl, projectId) {
    return `<script>
(function() {
  var BASE = "${baseUrl}/api/project/${projectId}";
  var TOKEN_KEY = "__pb_token_${projectId}";
  var authListeners = [];

  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; } }
  function setToken(t) { try { if(t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch(e) {} }

  function headers(extra) {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return Object.assign(h, extra || {});
  }

  function notifyAuth(user) { authListeners.forEach(function(fn) { try { fn(user); } catch(e) {} }); }

  async function apiFetch(path, opts) {
    var res = await fetch(BASE + path, opts);
    var json = await res.json();
    if (!res.ok) return { data: null, error: json.error || 'Error ' + res.status };
    return { data: json, error: null };
  }

  // Auth
  async function register(email, password, displayName) {
    var r = await apiFetch('/auth/register', { method: 'POST', headers: headers(), body: JSON.stringify({ email: email, password: password, displayName: displayName }) });
    if (r.data && r.data.token) { setToken(r.data.token); notifyAuth(r.data.user); }
    return r;
  }

  async function login(email, password) {
    var r = await apiFetch('/auth/login', { method: 'POST', headers: headers(), body: JSON.stringify({ email: email, password: password }) });
    if (r.data && r.data.token) { setToken(r.data.token); notifyAuth(r.data.user); }
    return r;
  }

  function logout() { setToken(null); notifyAuth(null); }

  async function getUser() {
    var t = getToken();
    if (!t) return { data: null, error: null };
    return await apiFetch('/auth/me', { headers: headers() });
  }

  function onAuthChange(fn) { authListeners.push(fn); return function() { authListeners = authListeners.filter(function(f) { return f !== fn; }); }; }

  // CRUD builder (Supabase-like chaining)
  function from(table) {
    return {
      select: async function(filters, opts) {
        var qs = '';
        var parts = [];
        if (filters) {
          Object.keys(filters).forEach(function(k) { parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(filters[k])); });
        }
        if (opts) {
          if (opts.expand) parts.push('_expand=' + encodeURIComponent(opts.expand));
          if (opts.sort) parts.push('_sort=' + encodeURIComponent(opts.sort));
          if (opts.order) parts.push('_order=' + encodeURIComponent(opts.order));
          if (opts.limit) parts.push('_limit=' + opts.limit);
          if (opts.offset) parts.push('_offset=' + opts.offset);
          if (opts.mine) parts.push('_mine=true');
        }
        if (parts.length) qs = '?' + parts.join('&');
        return await apiFetch('/data/' + table + qs, { headers: headers() });
      },
      selectById: async function(id) {
        return await apiFetch('/data/' + table + '/' + id, { headers: headers() });
      },
      count: async function(filters) {
        var qs = '';
        if (filters) {
          var parts = [];
          Object.keys(filters).forEach(function(k) { parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(filters[k])); });
          if (parts.length) qs = '?' + parts.join('&');
        }
        return await apiFetch('/data/' + table + '/count' + qs, { headers: headers() });
      },
      aggregate: async function(field, op, filters) {
        var parts = ['_field=' + encodeURIComponent(field), '_op=' + encodeURIComponent(op)];
        if (filters) {
          Object.keys(filters).forEach(function(k) { parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(filters[k])); });
        }
        return await apiFetch('/data/' + table + '/aggregate?' + parts.join('&'), { headers: headers() });
      },
      insert: async function(row) {
        return await apiFetch('/data/' + table, { method: 'POST', headers: headers(), body: JSON.stringify(row) });
      },
      update: async function(id, changes) {
        return await apiFetch('/data/' + table + '/' + id, { method: 'PUT', headers: headers(), body: JSON.stringify(changes) });
      },
      delete: async function(id) {
        return await apiFetch('/data/' + table + '/' + id, { method: 'DELETE', headers: headers() });
      }
    };
  }

  // File upload
  async function uploadFile(file) {
    var formData = new FormData();
    formData.append('file', file);
    var h = {};
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    var res = await fetch(BASE + '/upload', { method: 'POST', headers: h, body: formData });
    var json = await res.json();
    if (!res.ok) return { data: null, error: json.error || 'Error ' + res.status };
    return { data: json, error: null };
  }

  // Admin: list users
  async function listUsers() {
    return await apiFetch('/auth/users', { headers: headers() });
  }

  // Admin: update user role
  async function setUserRole(userId, role) {
    return await apiFetch('/auth/users/' + userId + '/role', { method: 'PUT', headers: headers(), body: JSON.stringify({ role: role }) });
  }

  // Toast notification system
  var toastContainer = null;
  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = '__plury_toasts';
    toastContainer.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message, type) {
    var container = ensureToastContainer();
    var toast = document.createElement('div');
    var bg = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    var icon = type === 'error' ? '&#10007;' : type === 'success' ? '&#10003;' : '&#8505;';
    toast.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:12px;color:white;font-size:14px;font-family:system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.2);transform:translateX(120%);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s;opacity:0;max-width:360px;background:' + bg + ';';
    toast.innerHTML = '<span style="font-size:16px;font-weight:bold;">' + icon + '</span><span>' + message + '</span>';
    container.appendChild(toast);
    requestAnimationFrame(function() {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });
    setTimeout(function() {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
  }

  window.__PROJECT_API = {
    register: register,
    login: login,
    logout: logout,
    getUser: getUser,
    onAuthChange: onAuthChange,
    from: from,
    uploadFile: uploadFile,
    listUsers: listUsers,
    setUserRole: setUserRole,
    showToast: showToast,
    projectId: "${projectId}",
    baseUrl: BASE
  };

  // Auto-check auth on load
  getUser().then(function(r) { if (r.data) notifyAuth(r.data); });
})();
</script>`;
}
export const agentColorMap = {
    seo: '#3b82f6',
    brand: '#ec4899',
    web: '#a855f7',
    social: '#f97316',
    ads: '#10b981',
    dev: '#f59e0b',
    video: '#ef4444',
};
// Wrap plain text/markdown into a styled HTML document for iframe rendering
export function wrapTextAsHtml(text, agentName, agentRole) {
    const color = agentColorMap[agentName.toLowerCase()] ?? '#6b7280';
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
        .replace(/\n/g, '<br>');
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
</html>`;
}
//# sourceMappingURL=html-utils.js.map