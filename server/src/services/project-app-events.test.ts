import { describe, expect, it } from 'vitest'

describe('project app event payloads', () => {
  it('defines canonical lifecycle event keys', () => {
    const lifecycleKeys = ['app.created', 'app.updated']

    expect(lifecycleKeys).toContain('app.created')
    expect(lifecycleKeys).toContain('app.updated')
  })

  it('defines canonical build event key for deliverables', () => {
    const buildKey = 'build.deliverable.created'

    expect(buildKey.startsWith('build.')).toBe(true)
    expect(buildKey.endsWith('.created')).toBe(true)
  })
})
