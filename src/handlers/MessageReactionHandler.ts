import { BaseMessageHandler } from './BaseMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { IRoomManager } from '../interfaces/IRoomManager';
import { IReactionManager } from '../interfaces/IReactionManager';
import { IWebSocketServer } from '../interfaces/IWebSocketServer';
import { MessageReactionSchema, MessageReaction } from '../schemas/MessageReactionSchema';
import { Reaction } from '../types/Reaction';

/**
 * Handler para reações em mensagens
 *
 * Responsabilidade (SRP): Processar adição/remoção de reações (toggle)
 * Validação automática via BaseMessageHandler
 */
export class MessageReactionHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private reactionManager: IReactionManager,
        private server: IWebSocketServer
    ) {
        super(logger, MessageReactionSchema);
    }

    /**
     * Executa lógica de reação (toggle: adicionar ou remover)
     */
    protected async execute(
        socketId: string,
        _eventName: string,
        data: MessageReaction
    ): Promise<void> {
        // Verificar se usuário está na sala
        if (!this.roomManager.isUserInRoom(data.roomId, socketId)) {
            throw new Error('User not in room');
        }

        const users = this.roomManager.getRoomUsers(data.roomId);
        const user = users.find(u => u.socketId === socketId);

        if (!user) {
            throw new Error('User not found');
        }

        // Verificar se já reagiu (toggle)
        const hasReacted = this.reactionManager.hasUserReacted(
            data.messageId,
            user.userId,
            data.emoji
        );

        if (hasReacted) {
            // Remover reação
            this.reactionManager.removeReaction(data.messageId, user.userId, data.emoji);
        } else {
            // Adicionar reação
            const reaction: Reaction = {
                userId: user.userId,
                username: user.username,
                emoji: data.emoji,
                timestamp: new Date()
            };
            this.reactionManager.addReaction(data.messageId, reaction);
        }

        // Buscar todas as reações atualizadas
        const messageReactions = this.reactionManager.getReactions(data.messageId);

        // Formatar para enviar ao cliente
        const reactionsFormatted: Record<string, Array<{ userId: string; username: string }>> = {};
        messageReactions.forEach((reactions, emoji) => {
            reactionsFormatted[emoji] = reactions.map(r => ({
                userId: r.userId,
                username: r.username
            }));
        });

        // Broadcast atualização para toda a sala
        this.server.broadcastToRoom(data.roomId, 'message:reaction_updated', {
            messageId: data.messageId,
            roomId: data.roomId,
            reactions: reactionsFormatted
        });
    }
}