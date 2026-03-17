import { describe, expect, it } from 'vitest'
import { buildProjectAppSnapshot } from './project-app-snapshots.js'

describe('project-app-snapshots', () => {
  it('builds delivery snapshot metrics', () => {
    const snapshot = buildProjectAppSnapshot('delivery', [
      { id: '1', projectAppId: 'app_1', channelKey: 'orders', eventKey: 'order.created', direction: 'emit', payloadJson: JSON.stringify({ orderId: 'ord_1', total: 20 }), source: 'test', createdAt: new Date() },
      { id: '2', projectAppId: 'app_1', channelKey: 'dispatch', eventKey: 'dispatch.assigned', direction: 'emit', payloadJson: JSON.stringify({ orderId: 'ord_1', driverName: 'Ana' }), source: 'test', createdAt: new Date() },
      { id: '3', projectAppId: 'app_1', channelKey: 'orders', eventKey: 'order.status.changed', direction: 'bi', payloadJson: JSON.stringify({ orderId: 'ord_1', status: 'delivered' }), source: 'test', createdAt: new Date() },
    ])

    expect(snapshot.kind).toBe('delivery')
    if (snapshot.kind === 'delivery') {
      expect(snapshot.metrics.totalOrders).toBe(1)
      expect(snapshot.metrics.deliveredOrders).toBe(1)
    }
  })

  it('builds chatflow snapshot metrics', () => {
    const snapshot = buildProjectAppSnapshot('chatflow', [
      { id: '1', projectAppId: 'app_1', channelKey: 'builder', eventKey: 'flow.saved', direction: 'emit', payloadJson: JSON.stringify({ flowId: 'flow_1', version: 2, nodeCount: 7 }), source: 'test', createdAt: new Date() },
      { id: '2', projectAppId: 'app_1', channelKey: 'executions', eventKey: 'execution.started', direction: 'emit', payloadJson: JSON.stringify({ executionId: 'exec_1', flowId: 'flow_1', trigger: 'manual' }), source: 'test', createdAt: new Date() },
      { id: '3', projectAppId: 'app_1', channelKey: 'executions', eventKey: 'execution.log', direction: 'emit', payloadJson: JSON.stringify({ executionId: 'exec_1', level: 'info', message: 'ok' }), source: 'test', createdAt: new Date() },
    ])

    expect(snapshot.kind).toBe('chatflow')
    if (snapshot.kind === 'chatflow') {
      expect(snapshot.metrics.totalFlows).toBe(1)
      expect(snapshot.metrics.executionLogs).toBe(1)
    }
  })

  it('builds saas snapshot metrics', () => {
    const snapshot = buildProjectAppSnapshot('saas', [
      { id: '1', projectAppId: 'app_1', channelKey: 'workspace', eventKey: 'workspace.created', direction: 'emit', payloadJson: JSON.stringify({ workspaceId: 'ws_1', companyName: 'Acme', status: 'active' }), source: 'test', createdAt: new Date() },
      { id: '2', projectAppId: 'app_1', channelKey: 'billing', eventKey: 'subscription.updated', direction: 'bi', payloadJson: JSON.stringify({ workspaceId: 'ws_1', planId: 'pro', status: 'active', mrr: 49 }), source: 'test', createdAt: new Date() },
      { id: '3', projectAppId: 'app_1', channelKey: 'support', eventKey: 'ticket.resolved', direction: 'emit', payloadJson: JSON.stringify({ workspaceId: 'ws_1', ticketId: 'tic_1', status: 'resolved' }), source: 'test', createdAt: new Date() },
    ])

    expect(snapshot.kind).toBe('saas')
    if (snapshot.kind === 'saas') {
      expect(snapshot.metrics.totalWorkspaces).toBe(1)
      expect(snapshot.metrics.activeSubscriptions).toBe(1)
      expect(snapshot.metrics.resolvedTickets).toBe(1)
    }
  })

  it('builds ecommerce snapshot metrics', () => {
    const snapshot = buildProjectAppSnapshot('ecommerce', [
      { id: '1', projectAppId: 'app_1', channelKey: 'catalog', eventKey: 'product.created', direction: 'emit', payloadJson: JSON.stringify({ productId: 'prd_1', title: 'Demo' }), source: 'test', createdAt: new Date() },
      { id: '2', projectAppId: 'app_1', channelKey: 'orders', eventKey: 'checkout.completed', direction: 'emit', payloadJson: JSON.stringify({ orderId: 'ord_1', paymentStatus: 'paid', total: 99 }), source: 'test', createdAt: new Date() },
      { id: '3', projectAppId: 'app_1', channelKey: 'orders', eventKey: 'order.fulfilled', direction: 'bi', payloadJson: JSON.stringify({ orderId: 'ord_1', fulfillmentStatus: 'fulfilled' }), source: 'test', createdAt: new Date() },
    ])

    expect(snapshot.kind).toBe('ecommerce')
    if (snapshot.kind === 'ecommerce') {
      expect(snapshot.metrics.totalProducts).toBe(1)
      expect(snapshot.metrics.paidOrders).toBe(1)
      expect(snapshot.metrics.fulfilledOrders).toBe(1)
    }
  })
})
