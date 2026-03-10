import type { Response } from 'express';
import type { SSEEvent } from '../../../shared/types.js';
export declare function addConnection(conversationId: string, res: Response, userId: string): void;
export declare function removeConnection(conversationId: string, res: Response): void;
export declare function broadcast(conversationId: string, event: SSEEvent): void;
//# sourceMappingURL=sse.d.ts.map