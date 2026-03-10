import type { Response } from 'express';
import type { SSEEvent } from '../../../shared/types.js';
interface BufferedEvent {
    id: number;
    event: SSEEvent;
    timestamp: number;
}
/** Get buffered events after a given event ID */
export declare function getBufferedEvents(conversationId: string, afterId: number): BufferedEvent[];
export declare function addConnection(conversationId: string, res: Response, userId: string, lastEventId?: number): void;
export declare function removeConnection(conversationId: string, res: Response): void;
export declare function broadcast(conversationId: string, event: SSEEvent): void;
export {};
//# sourceMappingURL=sse.d.ts.map