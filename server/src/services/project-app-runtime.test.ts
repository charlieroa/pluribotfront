import { describe, expect, it } from 'vitest'
import { buildProjectAppRuntimeExecution, listProjectAppRuntimeScenarios } from './project-app-runtime.js'

describe('project-app-runtime', () => {
  it('builds a chatflow runtime execution sequence', () => {
    const events = buildProjectAppRuntimeExecution('chatflow', [], { trigger: 'webhook_test' })
    expect(events.length).toBe(4)
    expect(events[0]?.eventKey).toBe('execution.started')
    expect(events[3]?.eventKey).toBe('execution.completed')
  })

  it('builds runtime events for saas apps', () => {
    const events = buildProjectAppRuntimeExecution('saas', [], { scenario: 'workspace_onboarding' })
    expect(events).toHaveLength(4)
    expect(events.some(event => event.eventKey === 'workspace.created')).toBe(true)
    expect(events.some(event => event.eventKey === 'subscription.updated')).toBe(true)
  })

  it('returns empty events for unsupported apps', () => {
    expect(buildProjectAppRuntimeExecution('delivery', [], {})).toEqual([])
  })

  it('lists runtime scenarios for chatflow', () => {
    expect(listProjectAppRuntimeScenarios('chatflow').map(item => item.key)).toContain('support_triage')
    expect(listProjectAppRuntimeScenarios('delivery')).toEqual([])
  })

  it('lists runtime scenarios for saas and ecommerce', () => {
    expect(listProjectAppRuntimeScenarios('saas').map(item => item.key)).toContain('workspace_onboarding')
    expect(listProjectAppRuntimeScenarios('ecommerce').map(item => item.key)).toContain('order_checkout')
  })
})
