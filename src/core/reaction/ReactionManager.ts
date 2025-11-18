import { IReactionManager } from '../../interfaces/IReactionManager';
import { ILogger } from '../../interfaces/ILogger';
import { Reaction } from '../../types/Reaction';

/**
 * Gerenciador de reações em mensagens
 *
 * Responsabilidade (SRP): Gerenciar reações (adicionar, remover, listar)
 * Estrutura: messageId → emoji → [Reaction]
 */
export class ReactionManager implements IReactionManager {
    /**
     * Mapa: messageId → (emoji → [Reaction])
     * Permite agrupar reações por mensagem e emoji
     */
    private reactions: Map<string, Map<string, Reaction[]>> = new Map();

    constructor(private logger: ILogger) {}

    /**
     * Adiciona uma reação a uma mensagem
     */
    addReaction(messageId: string, reaction: Reaction): void {
        // Criar estrutura se não existir
        if (!this.reactions.has(messageId)) {
            this.reactions.set(messageId, new Map());
        }

        const messageReactions = this.reactions.get(messageId)!;

        if (!messageReactions.has(reaction.emoji)) {
            messageReactions.set(reaction.emoji, []);
        }

        const emojiReactions = messageReactions.get(reaction.emoji)!;

        // Verificar se usuário já reagiu com esse emoji
        const existingIndex = emojiReactions.findIndex(r => r.userId === reaction.userId);

        if (existingIndex === -1) {
            emojiReactions.push(reaction);
            this.logger.info('Reaction added', {
                messageId,
                userId: reaction.userId,
                emoji: reaction.emoji
            });
        }
    }

    /**
     * Remove uma reação de uma mensagem (toggle)
     */
    removeReaction(messageId: string, userId: string, emoji: string): void {
        const messageReactions = this.reactions.get(messageId);
        if (!messageReactions) return;

        const emojiReactions = messageReactions.get(emoji);
        if (!emojiReactions) return;

        const index = emojiReactions.findIndex(r => r.userId === userId);

        if (index !== -1) {
            emojiReactions.splice(index, 1);
            this.logger.info('Reaction removed', { messageId, userId, emoji });

            // Limpar estrutura vazia
            if (emojiReactions.length === 0) {
                messageReactions.delete(emoji);
            }

            if (messageReactions.size === 0) {
                this.reactions.delete(messageId);
            }
        }
    }

    /**
     * Retorna todas as reações de uma mensagem
     */
    getReactions(messageId: string): Map<string, Reaction[]> {
        return this.reactions.get(messageId) || new Map();
    }

    /**
     * Verifica se um usuário já reagiu com determinado emoji
     */
    hasUserReacted(messageId: string, userId: string, emoji: string): boolean {
        const messageReactions = this.reactions.get(messageId);
        if (!messageReactions) return false;

        const emojiReactions = messageReactions.get(emoji);
        if (!emojiReactions) return false;

        return emojiReactions.some(r => r.userId === userId);
    }
}