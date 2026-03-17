import { describe, expect, it } from 'vitest'
import { buildProjectAppBootstrap, buildProjectAppExecutionBrief, getProjectAppCatalogItem, inferProjectAppType } from './project-apps.js'

describe('project app catalog', () => {
  it('infers vertical app types from common product descriptions', () => {
    expect(inferProjectAppType('delivery multi restaurante con repartidores')).toBe('delivery')
    expect(inferProjectAppType('builder de chatflow para soporte')).toBe('chatflow')
    expect(inferProjectAppType('plataforma tipo uber para conductores')).toBe('mobility')
  })

  it('builds delivery bootstrap with phased modules and payment hints', () => {
    const bootstrap = buildProjectAppBootstrap('delivery')

    expect(bootstrap.runtime).toBe('realtime')
    expect(bootstrap.modules.some(module => module.id === 'dispatch')).toBe(true)
    expect(bootstrap.phases).toHaveLength(3)
    expect(bootstrap.recommendedPayments).toContain('stripe_connect')
  })

  it('exposes readiness and modules for chatflow in the catalog', () => {
    const catalog = getProjectAppCatalogItem('chatflow')

    expect(catalog).not.toBeUndefined()
    expect(catalog?.readinessScore).toBeGreaterThanOrEqual(50)
    expect(catalog?.modules.some(module => module.id === 'builder')).toBe(true)
  })

  it('builds an execution brief for delivery phase one', () => {
    const brief = buildProjectAppExecutionBrief('delivery', 'Rappi Local', 1)

    expect(brief.phaseIndex).toBe(1)
    expect(brief.phaseTitle).toContain('Marketplace')
    expect(brief.prompt).toContain('Roles: admin, restaurante, repartidor, cliente')
    expect(brief.prompt).toContain('tracking simulado')
    expect(brief.runtime).toBe('realtime')
  })

  it('builds a workflow-first execution brief for chatflow', () => {
    const brief = buildProjectAppExecutionBrief('chatflow', 'FlowDesk', 1)

    expect(brief.phaseIndex).toBe(1)
    expect(brief.runtime).toBe('workflow')
    expect(brief.prompt).toContain('libreria de nodos')
    expect(brief.prompt).toContain('inspector lateral')
  })

  it('builds a dispatch-first execution brief for mobility', () => {
    const brief = buildProjectAppExecutionBrief('mobility', 'RideNow', 2)

    expect(brief.phaseIndex).toBe(2)
    expect(brief.runtime).toBe('realtime')
    expect(brief.prompt).toContain('tracking simulado')
    expect(brief.prompt).toContain('coordenadas mock')
    expect(brief.prompt).toContain('lifecycle del viaje')
  })
})
