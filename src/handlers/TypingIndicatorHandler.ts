import { BaseMessageHandler } from './BaseMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { IRoomManager } from '../interfaces/IRoomManager';
import { IWebSocketServer } from '../interfaces/IWebSocketServer';
import { TypingSchema, TypingIndicator } from '../schemas/TypingSchema';

/**
 * Handler para indicador de digitação
 *
 * Responsabilidade (SRP): Processar e distribuir eventos de digitação
 * Broadcast exclui o remetente (não ver "Você está digitando...")
 * Validação automática via BaseMessageHandler
 */
export class TypingIndicatorHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, TypingSchema);
    }

    /**
     * Executa lógica de typing indicator
     */
    protected async execute(
        socketId: string,
        _eventName: string,
        data: TypingIndicator
    ): Promise<void> {
        // Verificar se usuário está na sala
        if (!this.roomManager.isUserInRoom(data.roomId, socketId)) {
            throw new Error('User not in room');
        }

        const users = this.roomManager.getRoomUsers(data.roomId);
        const typer = users.find(u => u.socketId === socketId);

        if (!typer) {
            throw new Error('Typer not found');
        }

        // Broadcast para todos EXCETO quem está digitando
        this.server.broadcastToRoom(data.roomId, 'room:typing', {
            roomId: data.roomId,
            userId: typer.userId,
            username: typer.username,
            isTyping: data.isTyping
        }, socketId); // ← excludeSocketId
    }
}