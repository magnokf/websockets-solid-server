import { z } from 'zod';

/**
 * Schema de validação para reações em mensagens
 *
 * Valida que a reação usa apenas emojis permitidos
 */
const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

export const MessageReactionSchema = z.object({
    /**
     * ID da mensagem a reagir
     */
    messageId: z.string().min(1, 'Message ID is required'),

    /**
     * ID da sala onde está a mensagem
     */
    roomId: z.string().min(1, 'Room ID is required'),

    /**
     * Emoji da reação (apenas os permitidos)
     */
    emoji: z.enum(reactionEmojis, {
        message: 'Invalid emoji. Use: 👍, ❤️, 😂, 😮, 😢, 🔥'
    })
});

/**
 * Tipo TypeScript inferido do schema
 */
export type MessageReaction = z.infer<typeof MessageReactionSchema>;
export type ReactionEmoji = (typeof reactionEmojis)[number];
