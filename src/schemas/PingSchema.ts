import { z } from 'zod';

/**
 * Schema de validação para ping/pong (health check)
 *
 * Valida que o timestamp está em formato ISO 8601
 */
export const PingSchema = z.object({
    /**
     * Timestamp ISO 8601
     * Exemplo: "2024-01-15T10:30:00Z"
     */
    timestamp: z.string().datetime('Invalid timestamp format')
});

/**
 * Tipo TypeScript inferido do schema
 */
export type PingMessage = z.infer<typeof PingSchema>;