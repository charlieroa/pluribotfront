// Auto-injected API client SDK for dev agent projects
// Placeholders %%API_BASE%% and %%PROJECT_ID%% are replaced by the execution engine

export const DEV_API_CLIENT = `let _token = localStorage.getItem('plury_project_token')
let _user = null
const _authListeners = []

const API_BASE = '%%API_BASE%%'
const PROJECT_ID = '%%PROJECT_ID%%'

async function _fetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (_token) headers['Authorization'] = 'Bearer ' + _token
  if (options.body instanceof FormData) delete headers['Content-Type']
  try {
    const res = await fetch(API_BASE + '/api/project/' + PROJECT_ID + path, { ...options, headers })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data.error || 'Error desconocido' }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: 'Error de conexion' }
  }
}

function _ensureToastContainer() {
  let container = document.getElementById('__plury_project_toasts')
  if (container) return container
  container = document.createElement('div')
  container.id = '__plury_project_toasts'
  container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2147483647;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:min(92vw,380px);'
  document.body.appendChild(container)
  return container
}

function _ensureNotifyStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('__plury_notify_styles')) return
  const style = document.createElement('style')
  style.id = '__plury_notify_styles'
  style.textContent = [
    '#__plury_notify_overlay { position: fixed; inset: 0; z-index: 2147483646; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; }',
    '#__plury_notify_overlay[hidden] { display: none; }',
    '.__plury_notify_modal { width: min(100%, 440px); border-radius: 24px; background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.98)); box-shadow: 0 30px 80px rgba(15, 23, 42, .28); color: #0f172a; overflow: hidden; border: 1px solid rgba(148, 163, 184, .18); font-family: Inter, system-ui, sans-serif; }',
    '.__plury_notify_modal_header { padding: 22px 24px 8px; display: flex; align-items: center; gap: 14px; }',
    '.__plury_notify_modal_icon { width: 42px; height: 42px; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 800; flex: 0 0 auto; }',
    '.__plury_notify_modal_body { padding: 0 24px 20px; }',
    '.__plury_notify_modal_title { margin: 0; font-size: 20px; line-height: 1.15; font-weight: 800; }',
    '.__plury_notify_modal_message { margin: 8px 0 0; font-size: 14px; line-height: 1.55; color: #475569; }',
    '.__plury_notify_modal_input { width: 100%; margin-top: 18px; border: 1px solid rgba(148, 163, 184, .45); border-radius: 14px; padding: 12px 14px; font-size: 14px; outline: none; transition: box-shadow .15s ease, border-color .15s ease; background: white; color: #0f172a; }',
    '.__plury_notify_modal_input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, .14); }',
    '.__plury_notify_modal_actions { display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px; }',
    '.__plury_notify_btn { border: 0; border-radius: 999px; padding: 11px 16px; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform .15s ease, opacity .15s ease, background .15s ease; }',
    '.__plury_notify_btn:hover { transform: translateY(-1px); }',
    '.__plury_notify_btn_secondary { background: #e2e8f0; color: #0f172a; }',
    '.__plury_notify_btn_primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; }',
    '.__plury_notify_btn_danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }'
  ].join('\\n')
  document.head.appendChild(style)
}

function showToast(message, type = 'info') {
  if (typeof document === 'undefined') return
  const container = _ensureToastContainer()
  const toast = document.createElement('div')
  const palette = type === 'error'
    ? { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '!' }
    : type === 'success'
      ? { bg: 'linear-gradient(135deg,#10b981,#059669)', icon: '✓' }
      : { bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', icon: 'i' }

  toast.style.cssText = 'pointer-events:auto;display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:16px;color:#fff;font-size:14px;line-height:1.4;font-family:Inter,system-ui,sans-serif;box-shadow:0 18px 45px rgba(2,6,23,.28);transform:translateY(-8px) scale(.98);opacity:0;transition:transform .22s ease,opacity .22s ease;backdrop-filter:blur(10px);background:' + palette.bg + ';'
  toast.innerHTML = '<div style="width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:800;flex:0 0 auto;">' + palette.icon + '</div><div style="padding-top:1px;">' + String(message) + '</div>'
  container.appendChild(toast)

  requestAnimationFrame(function() {
    toast.style.transform = 'translateY(0) scale(1)'
    toast.style.opacity = '1'
  })

  setTimeout(function() {
    toast.style.transform = 'translateY(-8px) scale(.98)'
    toast.style.opacity = '0'
    setTimeout(function() { toast.remove() }, 220)
  }, 3600)
}

function _getNotifyPalette(type) {
  if (type === 'danger' || type === 'error') return { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '!', buttonClass: '__plury_notify_btn_danger' }
  if (type === 'success') return { bg: 'linear-gradient(135deg,#10b981,#059669)', icon: '✓', buttonClass: '__plury_notify_btn_primary' }
  if (type === 'warning') return { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '!', buttonClass: '__plury_notify_btn_primary' }
  return { bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', icon: 'i', buttonClass: '__plury_notify_btn_primary' }
}

function _showModal(options) {
  if (typeof document === 'undefined') return Promise.resolve(options.mode === 'prompt' ? '' : true)
  _ensureNotifyStyles()

  return new Promise(function(resolve) {
    const palette = _getNotifyPalette(options.type || 'info')
    const overlay = document.createElement('div')
    overlay.id = '__plury_notify_overlay'

    const wrapper = document.createElement('div')
    wrapper.className = '__plury_notify_modal'

    const safeTitle = String(options.title || 'Confirmar')
    const safeMessage = String(options.message || '')
    const isPrompt = options.mode === 'prompt'

    const promptField = isPrompt
      ? '<input class="__plury_notify_modal_input" value="' + String(options.defaultValue || '').replace(/"/g, '&quot;') + '" placeholder="' + String(options.placeholder || '').replace(/"/g, '&quot;') + '" />'
      : ''

    wrapper.innerHTML =
      '<div class="__plury_notify_modal_header">' +
        '<div class="__plury_notify_modal_icon" style="background:' + palette.bg + ';">' + palette.icon + '</div>' +
        '<div>' +
          '<h3 class="__plury_notify_modal_title">' + safeTitle + '</h3>' +
          '<p class="__plury_notify_modal_message">' + safeMessage + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="__plury_notify_modal_body">' + promptField + '</div>' +
      '<div class="__plury_notify_modal_actions">' +
        '<button type="button" class="__plury_notify_btn __plury_notify_btn_secondary" data-role="cancel">' + (options.cancelText || 'Cancelar') + '</button>' +
        '<button type="button" class="__plury_notify_btn ' + palette.buttonClass + '" data-role="confirm">' + (options.confirmText || 'Aceptar') + '</button>' +
      '</div>'

    overlay.appendChild(wrapper)
    document.body.appendChild(overlay)

    const input = overlay.querySelector('.__plury_notify_modal_input')
    const close = function(result) {
      overlay.remove()
      resolve(result)
    }

    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) close(isPrompt ? null : false)
    })

    const cancelButton = overlay.querySelector('[data-role="cancel"]')
    const confirmButton = overlay.querySelector('[data-role="confirm"]')
    if (cancelButton) cancelButton.addEventListener('click', function() { close(isPrompt ? null : false) })
    if (confirmButton) confirmButton.addEventListener('click', function() {
      close(isPrompt ? (input ? input.value : '') : true)
    })

    overlay.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') close(isPrompt ? null : false)
      if (event.key === 'Enter') close(isPrompt ? (input ? input.value : '') : true)
    })

    if (input) input.focus()
    else if (confirmButton) confirmButton.focus()
  })
}

function showConfirm(message, options = {}) {
  return _showModal({
    mode: 'confirm',
    title: options.title || 'Confirmar accion',
    message,
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
    type: options.type || 'warning',
  })
}

function showPrompt(message, options = {}) {
  return _showModal({
    mode: 'prompt',
    title: options.title || 'Ingresa un valor',
    message,
    confirmText: options.confirmText || 'Aceptar',
    cancelText: options.cancelText || 'Cancelar',
    placeholder: options.placeholder || '',
    defaultValue: options.defaultValue || '',
    type: options.type || 'info',
  })
}

const api = {
  // ─── AUTH ───
  async register(email, password, displayName) {
    const result = await _fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
    if (result.data && result.data.token) {
      _token = result.data.token
      _user = result.data.user
      localStorage.setItem('plury_project_token', _token)
      _authListeners.forEach(function(cb) { cb(_user) })
    }
    return result
  },

  async login(email, password) {
    const result = await _fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (result.data && result.data.token) {
      _token = result.data.token
      _user = result.data.user
      localStorage.setItem('plury_project_token', _token)
      _authListeners.forEach(function(cb) { cb(_user) })
    }
    return result
  },

  logout() {
    _token = null
    _user = null
    localStorage.removeItem('plury_project_token')
    _authListeners.forEach(function(cb) { cb(null) })
  },

  async getUser() {
    if (!_token) return { data: null, error: 'No autenticado' }
    const result = await _fetch('/auth/me')
    if (result.data) _user = result.data
    return result
  },

  onAuthChange(callback) {
    _authListeners.push(callback)
    return function() {
      const i = _authListeners.indexOf(callback)
      if (i >= 0) _authListeners.splice(i, 1)
    }
  },

  // ─── ADMIN ───
  async listUsers() {
    return _fetch('/auth/users')
  },

  async setUserRole(userId, role) {
    return _fetch('/auth/users/' + userId + '/role', {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  },

  // ─── CRUD ───
  from(table) {
    return {
      async select(filters, options) {
        var opts = options || {}
        var params = new URLSearchParams()
        if (filters) Object.entries(filters).forEach(function(e) { params.set(e[0], String(e[1])) })
        if (opts.mine) params.set('_mine', 'true')
        if (opts.sort) params.set('_sort', opts.sort)
        if (opts.order) params.set('_order', opts.order)
        if (opts.limit) params.set('_limit', String(opts.limit))
        if (opts.offset) params.set('_offset', String(opts.offset))
        if (opts.expand) params.set('_expand', opts.expand)
        var qs = params.toString() ? '?' + params.toString() : ''
        return _fetch('/data/' + table + qs)
      },
      async selectById(id) {
        return _fetch('/data/' + table + '/' + id)
      },
      async insert(data) {
        return _fetch('/data/' + table, {
          method: 'POST',
          body: JSON.stringify(data),
        })
      },
      async update(id, data) {
        return _fetch('/data/' + table + '/' + id, {
          method: 'PUT',
          body: JSON.stringify(data),
        })
      },
      async delete(id) {
        return _fetch('/data/' + table + '/' + id, {
          method: 'DELETE',
        })
      },
      async count(filters) {
        var params = new URLSearchParams()
        if (filters) Object.entries(filters).forEach(function(e) { params.set(e[0], String(e[1])) })
        var qs = params.toString() ? '?' + params.toString() : ''
        return _fetch('/data/' + table + '/count' + qs)
      },
      async aggregate(field, op, filters) {
        var params = new URLSearchParams({ _field: field, _op: op })
        if (filters) Object.entries(filters).forEach(function(e) { params.set(e[0], String(e[1])) })
        return _fetch('/data/' + table + '/aggregate?' + params.toString())
      },
    }
  },

  // ─── FILE UPLOAD ───
  async uploadFile(file) {
    var formData = new FormData()
    formData.append('file', file)
    var headers = {}
    if (_token) headers['Authorization'] = 'Bearer ' + _token
    try {
      var res = await fetch(API_BASE + '/api/project/' + PROJECT_ID + '/upload', {
        method: 'POST',
        headers: headers,
        body: formData,
      })
      var data = await res.json()
      if (!res.ok) return { data: null, error: data.error || 'Error al subir archivo' }
      return { data, error: null }
    } catch (err) {
      return { data: null, error: 'Error de conexion' }
    }
  },

  showToast,
  confirm: showConfirm,
  prompt: showPrompt,
}

if (typeof window !== 'undefined') {
  window.__PLURY_SHOW_TOAST__ = showToast
  window.__PLURY_SHOW_CONFIRM__ = showConfirm
  window.__PLURY_SHOW_PROMPT__ = showPrompt
  window.__PLURY_NOTIFY__ = {
    toast: showToast,
    success: function(message) { showToast(message, 'success') },
    error: function(message) { showToast(message, 'error') },
    info: function(message) { showToast(message, 'info') },
    confirm: showConfirm,
    prompt: showPrompt,
  }
}

export default api
`
