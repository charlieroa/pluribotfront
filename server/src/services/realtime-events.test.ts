import { describe, expect, it } from 'vitest'
import { buildRealtimeContract } from './realtime-events.js'

describe('realtime event contracts', () => {
  it('provides delivery channels for orders and dispatch', () => {
    const contract = buildRealtimeContract('delivery')

    expect(contract.runtime).toBe('realtime')
    expect(contract.transport).toBe('sse+http')
    expect(contract.channels.some(channel => channel.key === 'orders')).toBe(true)
    expect(contract.channels.some(channel => channel.key === 'dispatch')).toBe(true)
  })

  it('provides workflow channels for chatflow builder and executions', () => {
    const contract = buildRealtimeContract('chatflow')

    expect(contract.runtime).toBe('workflow')
    expect(contract.transport).toBe('workflow+http')
    expect(contract.channels.some(channel => channel.key === 'builder')).toBe(true)
    expect(contract.channels.some(channel => channel.key === 'executions')).toBe(true)
  })

  it('provides ride lifecycle and location updates for mobility', () => {
    const contract = buildRealtimeContract('mobility')
    const dispatchChannel = contract.channels.find(channel => channel.key === 'dispatch')

    expect(contract.runtime).toBe('realtime')
    expect(dispatchChannel?.events.some(event => event.key === 'driver.location.updated')).toBe(true)
    expect(dispatchChannel?.events.some(event => event.key === 'pricing.updated')).toBe(true)
  })
})
