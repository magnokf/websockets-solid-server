import { BaseMessageHandler } from './BaseMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { IRoomManager } from '../interfaces/IRoomManager';
import { IWebSocketServer } from '../interfaces/IWebSocketServer';
import { ChatMessageSchema, ChatMessage } from '../schemas/ChatMessageSchema';

/**
 * Handler para mensagens de chat
 *
 * Responsabilidade (SRP): Processar e distribuir mensagens de chat
 * Validação automática via BaseMessageHandler
 */
export class ChatMessageHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, ChatMessageSchema);
    }

    /**
     * Executa lógica de envio de mensagem
     */
    protected async execute(
        socketId: string,
        _eventName: string,
        data: ChatMessage
    ): Promise<void> {
        // Verificar se usuário está na sala
        if (!this.roomManager.isUserInRoom(data.roomId, socketId)) {
            throw new Error('User not in room');
        }

        const users = this.roomManager.getRoomUsers(data.roomId);
        const sender = users.find(u => u.socketId === socketId);

        if (!sender) {
            throw new Error('Sender not found');
        }

        this.logger.info('Chat message in room', {
            roomId: data.roomId,
            messageId: data.messageId,
            username: sender.username,
            message: data.message
        });

        // Broadcast para toda a sala (incluindo o remetente)
        this.server.broadcastToRoom(data.roomId, 'chat:message', {
            messageId: data.messageId,
            roomId: data.roomId,
            sender: {
                userId: sender.userId,
                username: sender.username
            },
            message: data.message,
            timestamp: new Date().toISOString(),
            reactions: {} // Inicialmente sem reações
        });
    }
}