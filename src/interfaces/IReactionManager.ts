import { Reaction } from '../types/Reaction';

/**
 * Interface para gerenciamento de reações (Single Responsibility Principle)
 *
 * Responsabilidade: Gerenciar reações em mensagens
 * Mantém mapeamento: messageId → emoji → [usuários que reagiram]
 */
export interface IReactionManager {
    /**
     * Adiciona uma reação a uma mensagem
     * @param messageId ID da mensagem
     * @param reaction Dados da reação
     */
    addReaction(messageId: string, reaction: Reaction): void;

    /**
     * Remove uma reação de uma mensagem
     * @param messageId ID da mensagem
     * @param userId ID do usuário
     * @param emoji Emoji da reação
     */
    removeReaction(messageId: string, userId: string, emoji: string): void;

    /**
     * Retorna todas as reações de uma mensagem
     * @param messageId ID da mensagem
     * @returns Map de emoji → array de reações
     */
    getReactions(messageId: string): Map<string, Reaction[]>;

    /**
     * Verifica se um usuário já reagiu com determinado emoji
     * @param messageId ID da mensagem
     * @param userId ID do usuário
     * @param emoji Emoji a verificar
     * @returns true se o usuário já reagiu
     */
    hasUserReacted(messageId: string, userId: string, emoji: string): boolean;
}