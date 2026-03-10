const connections = new Map();
export function addConnection(conversationId, res, userId) {
    const existing = connections.get(conversationId) ?? [];
    existing.push({ res, userId });
    connections.set(conversationId, existing);
    // Setup SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);
    // Cleanup on close
    res.on('close', () => {
        clearInterval(heartbeat);
        removeConnection(conversationId, res);
    });
}
export function removeConnection(conversationId, res) {
    const existing = connections.get(conversationId);
    if (!existing)
        return;
    const filtered = existing.filter(c => c.res !== res);
    if (filtered.length === 0) {
        connections.delete(conversationId);
    }
    else {
        connections.set(conversationId, filtered);
    }
}
export function broadcast(conversationId, event) {
    const conns = connections.get(conversationId);
    if (!conns)
        return;
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const conn of conns) {
        try {
            conn.res.write(data);
        }
        catch {
            // Connection broken, will be cleaned up on close
        }
    }
}
//# sourceMappingURL=sse.js.map