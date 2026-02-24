import { describe, it, expect } from 'vitest'
import { topologicalSortGroups, ensureSequentialVisualAgents } from './execution-engine.js'
import type { OrchestratorStep } from './plan-cache.js'

function makeStep(agentId: string, instanceId: string, dependsOn?: string[]): OrchestratorStep {
  return {
    agentId,
    instanceId,
    task: `Task for ${instanceId}`,
    userDescription: `Description for ${instanceId}`,
    dependsOn,
  }
}

describe('topologicalSortGroups', () => {
  it('puts independent steps in a single group (parallel)', () => {
    const steps = [
      makeStep('seo', 'seo-1'),
      makeStep('brand', 'brand-1'),
      makeStep('ads', 'ads-1'),
    ]
    const groups = topologicalSortGroups(steps)
    expect(groups).toHaveLength(1)
    expect(groups[0].instanceIds).toHaveLength(3)
    expect(groups[0].instanceIds).toContain('seo-1')
    expect(groups[0].instanceIds).toContain('brand-1')
    expect(groups[0].instanceIds).toContain('ads-1')
  })

  it('creates sequential groups for linear dependencies', () => {
    const steps = [
      makeStep('web', 'web-1'),
      makeStep('dev', 'dev-1', ['web-1']),
    ]
    const groups = topologicalSortGroups(steps)
    expect(groups).toHaveLength(2)
    expect(groups[0].instanceIds).toEqual(['web-1'])
    expect(groups[1].instanceIds).toEqual(['dev-1'])
  })

  it('handles diamond dependencies correctly', () => {
    // A → B, A → C, B+C → D
    const steps = [
      makeStep('seo', 'a'),
      makeStep('web', 'b', ['a']),
      makeStep('brand', 'c', ['a']),
      makeStep('dev', 'd', ['b', 'c']),
    ]
    const groups = topologicalSortGroups(steps)
    expect(groups).toHaveLength(3)
    expect(groups[0].instanceIds).toEqual(['a'])
    expect(groups[1].instanceIds.sort()).toEqual(['b', 'c'])
    expect(groups[2].instanceIds).toEqual(['d'])
  })

  it('handles single step', () => {
    const steps = [makeStep('seo', 'seo-1')]
    const groups = topologicalSortGroups(steps)
    expect(groups).toHaveLength(1)
    expect(groups[0].instanceIds).toEqual(['seo-1'])
  })

  it('ignores dependsOn references to non-existent steps', () => {
    const steps = [
      makeStep('web', 'web-1', ['nonexistent']),
    ]
    const groups = topologicalSortGroups(steps)
    expect(groups).toHaveLength(1)
    expect(groups[0].instanceIds).toEqual(['web-1'])
  })
})

describe('ensureSequentialVisualAgents', () => {
  it('keeps groups unchanged when 0 or 1 visual agents', () => {
    const steps = [
      makeStep('seo', 'seo-1'),
      makeStep('web', 'web-1'),
    ]
    const groups = [{ instanceIds: ['seo-1', 'web-1'] }]
    const result = ensureSequentialVisualAgents(groups, steps)
    expect(result).toHaveLength(1)
    expect(result[0].instanceIds).toEqual(['seo-1', 'web-1'])
  })

  it('splits multiple visual agents into separate groups', () => {
    const steps = [
      makeStep('web', 'web-1'),
      makeStep('brand', 'brand-1'),
      makeStep('social', 'social-1'),
    ]
    const groups = [{ instanceIds: ['web-1', 'brand-1', 'social-1'] }]
    const result = ensureSequentialVisualAgents(groups, steps)
    // All are visual → should split: first visual in one group, rest separate
    expect(result.length).toBeGreaterThan(1)
  })

  it('non-visual agents stay with the first visual agent', () => {
    const steps = [
      makeStep('seo', 'seo-1'),      // non-visual
      makeStep('web', 'web-1'),       // visual
      makeStep('brand', 'brand-1'),   // visual
    ]
    const groups = [{ instanceIds: ['seo-1', 'web-1', 'brand-1'] }]
    const result = ensureSequentialVisualAgents(groups, steps)
    expect(result).toHaveLength(2)
    expect(result[0].instanceIds).toContain('seo-1')
    expect(result[0].instanceIds).toContain('web-1')
    expect(result[1].instanceIds).toEqual(['brand-1'])
  })
})
