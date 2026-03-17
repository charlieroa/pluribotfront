import { describe, expect, it } from 'vitest'
import { buildProjectAppActionEvents, listProjectAppActions } from './project-app-actions.js'

describe('project-app-actions', () => {
  it('lists delivery actions', () => {
    const actions = listProjectAppActions('delivery')
    expect(actions.map(action => action.key)).toContain('create-order')
    expect(actions.map(action => action.key)).toContain('accept-order')
    expect(actions.map(action => action.key)).toContain('assign-driver')
    expect(actions.map(action => action.key)).toContain('pickup-order')
    expect(actions.map(action => action.key)).toContain('complete-order')
  })

  it('builds chatflow publish event', () => {
    const events = buildProjectAppActionEvents('chatflow', 'publish-flow', [])
    expect(events).toHaveLength(1)
    expect(events[0]?.eventKey).toBe('flow.published')
  })

  it('builds mobility assignment events', () => {
    const events = buildProjectAppActionEvents('mobility', 'assign-driver', [])
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events.some(event => event.eventKey === 'driver.assigned')).toBe(true)
    expect(events.some(event => event.eventKey === 'ride.status.changed')).toBe(true)
  })

  it('builds delivery completion event', () => {
    const events = buildProjectAppActionEvents('delivery', 'complete-order', [])
    expect(events).toHaveLength(1)
    expect(events[0]?.eventKey).toBe('order.status.changed')
    expect(events[0]?.payload.status).toBe('delivered')
  })

  it('builds mobility arrival event', () => {
    const events = buildProjectAppActionEvents('mobility', 'driver-arrived', [])
    expect(events).toHaveLength(1)
    expect(events[0]?.payload.status).toBe('driver_arrived')
  })

  it('builds saas upgrade events', () => {
    const events = buildProjectAppActionEvents('saas', 'upgrade-subscription', [])
    expect(events).toHaveLength(1)
    expect(events[0]?.eventKey).toBe('subscription.updated')
  })

  it('lists ecommerce actions', () => {
    const actions = listProjectAppActions('ecommerce')
    expect(actions.map(action => action.key)).toContain('checkout-order')
    expect(actions.map(action => action.key)).toContain('fulfill-order')
  })
})
