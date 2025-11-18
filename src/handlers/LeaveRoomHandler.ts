import { BaseMessageHandler } from './BaseMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { IRoomManager } from '../interfaces/IRoomManager';
import { IWebSocketServer } from '../interfaces/IWebSocketServer';
import { LeaveRoomSchema, LeaveRoom } from '../schemas/LeaveRoomSchema';

/**
 * Handler para saída de sala
 *
 * Responsabilidade (SRP): Processar evento de saída de sala
 * Validação automática via BaseMessageHandler
 */
export class LeaveRoomHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, LeaveRoomSchema);
    }

    /**
     * Executa lógica de saída de sala
     */
    protected async execute(
        socketId: string,
        _eventName: string,
        data: LeaveRoom
    ): Promise<void> {
        const users = this.roomManager.getRoomUsers(data.roomId);
        const leavingUser = users.find(u => u.socketId === socketId);

        // Remover usuário da sala
        this.roomManager.leaveRoom(data.roomId, socketId);

        // Notificar sala se usuário foi encontrado
        if (leavingUser) {
            this.server.broadcastToRoom(data.roomId, 'room:user_left', {
                roomId: data.roomId,
                user: {
                    userId: leavingUser.userId,
                    username: leavingUser.username
                },
                users: this.roomManager.getRoomUsers(data.roomId).map(u => ({
                    userId: u.userId,
                    username: u.username
                }))
            });
        }
    }
}
