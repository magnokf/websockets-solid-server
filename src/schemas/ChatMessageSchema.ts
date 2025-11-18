import { z } from 'zod';

/**
 * Schema de validação para mensagens de chat
 *
 * Valida que a mensagem tem formato correto antes de processar
 */
export const ChatMessageSchema = z.object({
    /**
     * Conteúdo da mensagem
     * - Mínimo: 1 caractere
     * - Máximo: 500 caracteres
     */
    message: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long'),

    /**
     * ID da sala onde a mensagem será enviada
     */
    roomId: z.string().min(1, 'Room ID is required'),

    /**
     * ID único da mensagem (gerado pelo cliente)
     */
    messageId: z.string().min(1, 'Message ID is required'),

    /**
     * Timestamp ISO 8601 (opcional)
     * Exemplo: "2024-01-15T10:30:00Z"
     */
    timestamp: z.string().datetime().optional()
});

/**
 * Tipo TypeScript inferido do schema
 */
export type ChatMessage = z.infer<typeof ChatMessageSchema>;