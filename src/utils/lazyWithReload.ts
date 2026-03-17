const RELOAD_KEY_PREFIX = 'plury:lazy-reload:'

function shouldReloadOnce(key: string) {
  try {
    if (sessionStorage.getItem(key) === '1') return false
    sessionStorage.setItem(key, '1')
    return true
  } catch {
    return false
  }
}

function clearReloadFlag(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Ignore session storage access errors.
  }
}

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)
}

export function lazyWithReload<TModule>(
  importer: () => Promise<TModule>,
  key: string
) {
  const reloadKey = `${RELOAD_KEY_PREFIX}${key}`

  return async () => {
    try {
      const module = await importer()
      clearReloadFlag(reloadKey)
      return module
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error) && shouldReloadOnce(reloadKey)) {
        window.location.reload()
        return new Promise<TModule>(() => {})
      }
      clearReloadFlag(reloadKey)
      throw error
    }
  }
}
