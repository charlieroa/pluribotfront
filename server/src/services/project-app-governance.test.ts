import { describe, expect, it } from 'vitest'
import { getProjectAppQuota, getProjectAppQuotaError } from './project-app-governance.js'

describe('project-app-governance', () => {
  it('returns plan quotas', () => {
    expect(getProjectAppQuota('starter').maxAppsPerProject).toBe(1)
    expect(getProjectAppQuota('agency').maxAppsPerProject).toBe(10)
  })

  it('reports quota exhaustion', () => {
    expect(getProjectAppQuotaError('starter', 1)).toContain('Starter')
    expect(getProjectAppQuotaError('pro', 2)).toBeNull()
  })
})
