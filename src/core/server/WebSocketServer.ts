import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import { IWebSocketServer } from '../../interfaces/IWebSocketServer';
import { IConnectionManager } from '../../interfaces/IConnectionManager';
import { IRoomManager } from '../../interfaces/IRoomManager';
import { ILogger } from '../../interfaces/ILogger';
import { ValidationError } from '../../errors/ValidationError';
import { IMessageRouter } from '../../interfaces/IMessageRouter';

/**
 * Servidor WebSocket usando Socket.IO
 *
 * Responsabilidade (SRP): Gerenciar conexões WebSocket e roteamento de eventos
 * Injeta dependências (DIP): Depende de abstrações, não de implementações
 */
export class WebSocketServer implements IWebSocketServer {
    private io: SocketIOServer | null = null;

    constructor(
        private connectionManager: IConnectionManager,
        private roomManager: IRoomManager,
        private messageRouter: IMessageRouter,
        private logger: ILogger
    ) {}

    /**
     * Inicia o servidor WebSocket
     */
    start(port: number): void {
        const httpServer = createServer();

        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: '*', // TODO: Configurar adequadamente em produção
                methods: ['GET', 'POST']
            }
        });

        this.setupEventHandlers();

        httpServer.listen(port, () => {
            this.logger.info(`WebSocket server running on port ${port}`);
        });
    }

    /**
     * Configura listeners de eventos do Socket.IO
     */
    private setupEventHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });
    }

    /**
     * Trata nova conexão de cliente
     */
    private handleConnection(socket: Socket): void {
        const userId = socket.handshake.auth.userId || socket.id;

        this.connectionManager.addConnection(socket.id, userId);
        this.logger.info('Client connected', { socketId: socket.id, userId });

        // Escutar todos os eventos
        socket.onAny(async (eventName: string, data: any) => {
            try {
                await this.messageRouter.route(socket.id, eventName, data);

                // Confirmar sucesso
                socket.emit('message:ack', {
                    eventName,
                    status: 'success',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.handleError(socket, eventName, error);
            }
        });

        // Desconexão
        socket.on('disconnect', () => {
            this.handleDisconnect(socket.id);
        });
    }

    /**
     * Trata erros de processamento de mensagens
     */
    private handleError(socket: Socket, eventName: string, error: any): void {
        if (error instanceof ValidationError) {
            socket.emit('validation:error', {
                eventName,
                message: 'Dados inválidos',
                errors: error.getFormattedErrors()
            });
        } else if (error instanceof Error) {
            socket.emit('error', {
                eventName,
                message: error.message
            });
        }
    }

    /**
     * Trata desconexão de cliente
     */
    private handleDisconnect(socketId: string): void {
        const rooms = this.roomManager.getUserRooms(socketId);

        // Sair de todas as salas
        rooms.forEach(roomId => {
            const users = this.roomManager.getRoomUsers(roomId);
            const leavingUser = users.find(u => u.socketId === socketId);

            this.roomManager.leaveRoom(roomId, socketId);

            if (leavingUser) {
                this.broadcastToRoom(roomId, 'room:user_left', {
                    roomId,
                    user: {
                        userId: leavingUser.userId,
                        username: leavingUser.username
                    },
                    users: this.roomManager.getRoomUsers(roomId).map(u => ({
                        userId: u.userId,
                        username: u.username
                    }))
                });
            }
        });

        this.connectionManager.removeConnection(socketId);
        this.logger.info('Client disconnected', { socketId });
    }

    /**
     * Envia mensagem para todos os clientes
     */
    broadcast(eventName: string, data: any): void {
        this.io?.emit(eventName, data);
    }

    /**
     * Envia mensagem para todos em uma sala (com opção de excluir alguém)
     */
    broadcastToRoom(
        roomId: string,
        eventName: string,
        data: any,
        excludeSocketId?: string
    ): void {
        const users = this.roomManager.getRoomUsers(roomId);

        users.forEach(user => {
            if (!excludeSocketId || user.socketId !== excludeSocketId) {
                this.io?.to(user.socketId).emit(eventName, data);
            }
        });
    }

    /**
     * Envia mensagem para um usuário específico (todas suas conexões)
     */
    emitToUser(userId: string, eventName: string, data: any): void {
        const socketIds = this.connectionManager.getConnectionsByUser(userId);

        socketIds.forEach(socketId => {
            this.io?.to(socketId).emit(eventName, data);
        });
    }
}
