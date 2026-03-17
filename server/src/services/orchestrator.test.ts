import { describe, expect, it } from 'vitest'
import { enrichPhaseMetadata, getFastTrackProjectAppType, getVideoRequestMode } from './orchestrator.js'
import type { OrchestratorStep } from './plan-cache.js'

function makeStep(overrides: Partial<OrchestratorStep>): OrchestratorStep {
  return {
    agentId: 'dev',
    instanceId: 'dev-1',
    task: 'Crear sistema',
    userDescription: 'Crear sistema',
    ...overrides,
  }
}

describe('enrichPhaseMetadata', () => {
  it('preserves explicit phase metadata emitted by the orchestrator', () => {
    const steps = enrichPhaseMetadata([
      makeStep({ instanceId: 'dev-1', phaseIndex: 1, phaseTotal: 3, phaseTitle: 'Base del sistema' }),
      makeStep({ instanceId: 'dev-2', phaseIndex: 2, phaseTotal: 3, phaseTitle: 'Ventas e inventario', dependsOn: ['dev-1'] }),
    ])

    expect(steps[0].phaseIndex).toBe(1)
    expect(steps[0].phaseTotal).toBe(3)
    expect(steps[0].phaseTitle).toBe('Base del sistema')
    expect(steps[1].phaseIndex).toBe(2)
    expect(steps[1].phaseTotal).toBe(3)
    expect(steps[1].phaseTitle).toBe('Ventas e inventario')
  })

  it('infers phase metadata from sequential dependencies when missing', () => {
    const steps = enrichPhaseMetadata([
      makeStep({ instanceId: 'dev-1', userDescription: 'Fase 1/3: Base del sistema' }),
      makeStep({ instanceId: 'dev-2', userDescription: 'Agregar ventas e inventario', dependsOn: ['dev-1'] }),
      makeStep({ instanceId: 'dev-3', userDescription: 'Agregar reportes', dependsOn: ['dev-2'] }),
    ])

    expect(steps.map(step => step.phaseIndex)).toEqual([1, 2, 3])
    expect(steps.map(step => step.phaseTotal)).toEqual([3, 3, 3])
    expect(steps[0].phaseTitle).toBe('Base del sistema')
  })
})

describe('getFastTrackProjectAppType', () => {
  it('fast-tracks a simple delivery request', () => {
    expect(getFastTrackProjectAppType('crea una app de delivery para restaurantes con panel admin, pedidos, repartidores y tracking')).toBe('delivery')
  })

  it('does not fast-track when the prompt asks for a full platform', () => {
    expect(getFastTrackProjectAppType('crea una plataforma saas completa con delivery, chatflow y movilidad por fases')).toBeNull()
  })

  it('does not fast-track follow-ups on existing dev projects', () => {
    expect(getFastTrackProjectAppType('agrega tracking al delivery', true)).toBeNull()
  })
})

describe('getVideoRequestMode', () => {
  it('asks the user to choose between direct delivery and workflow for generic video requests', () => {
    expect(getVideoRequestMode('quiero un video para mi cafeteria')).toBe('prompt')
  })

  it('opens the workflow editor when the user explicitly mentions nodes or workflow', () => {
    expect(getVideoRequestMode('quiero ajustar los nodos de mi video')).toBe('workflow')
  })

  it('sends the request directly to chat delivery when the user asks for direct video output', () => {
    expect(getVideoRequestMode('entregame el video directamente en el chat para mi producto')).toBe('direct')
  })
})
