import { BaseMessageHandler } from './BaseMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { IRoomManager } from '../interfaces/IRoomManager';
import { IWebSocketServer } from '../interfaces/IWebSocketServer';
import { JoinRoomSchema, JoinRoom } from '../schemas/JoinRoomSchema';
import { RoomUser } from '../types/RoomUser';

/**
 * Handler para entrada em sala
 *
 * Responsabilidade (SRP): Processar evento de entrada em sala
 * Validação automática via BaseMessageHandler
 */
export class JoinRoomHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, JoinRoomSchema);
    }

    /**
     * Executa lógica de entrada em sala
     */
    protected async execute(
        socketId: string,
        _eventName: string,
        data: JoinRoom
    ): Promise<void> {
        const user: RoomUser = {
            socketId,
            userId: socketId, // TODO: Será substituído por JWT userId
            username: data.username,
            joinedAt: new Date()
        };

        // Adicionar usuário na sala
        this.roomManager.joinRoom(data.roomId, user);

        // Notificar todos na sala
        const users = this.roomManager.getRoomUsers(data.roomId);
        this.server.broadcastToRoom(data.roomId, 'room:user_joined', {
            roomId: data.roomId,
            user: {
                userId: user.userId,
                username: user.username
            },
            users: users.map(u => ({
                userId: u.userId,
                username: u.username
            }))
        });
    }
}