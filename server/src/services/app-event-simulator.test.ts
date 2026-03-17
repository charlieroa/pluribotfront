import { describe, expect, it } from 'vitest'
import { buildSimulatedEvents } from './app-event-simulator.js'

describe('app event simulator', () => {
  it('builds delivery simulation events with order and tracking flow', () => {
    const events = buildSimulatedEvents('delivery', 3)

    expect(events).toHaveLength(3)
    expect(events[0].eventKey).toBe('order.created')
    expect(events.some(event => event.eventKey === 'tracking.updated')).toBe(true)
  })

  it('builds chatflow simulation events for save and execution logs', () => {
    const events = buildSimulatedEvents('chatflow', 3)

    expect(events).toHaveLength(3)
    expect(events.some(event => event.eventKey === 'flow.saved')).toBe(true)
    expect(events.some(event => event.eventKey === 'execution.log')).toBe(true)
  })

  it('builds mobility simulation events with assignment and pricing', () => {
    const events = buildSimulatedEvents('mobility', 4)

    expect(events).toHaveLength(4)
    expect(events.some(event => event.eventKey === 'driver.assigned')).toBe(true)
    expect(events.some(event => event.eventKey === 'pricing.updated')).toBe(true)
  })
})
