import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import { z } from 'zod';

// ============================================
// 1. SCHEMAS DE VALIDAÇÃO (Zod)
// ============================================

const ChatMessageSchema = z.object({
    message: z.string().min(1).max(500),
    roomId: z.string().min(1),
    timestamp: z.string().datetime().optional()
});

const JoinRoomSchema = z.object({
    roomId: z.string().min(1),
    username: z.string().min(1).max(50)
});

const LeaveRoomSchema = z.object({
    roomId: z.string().min(1)
});

const PingSchema = z.object({
    timestamp: z.string().datetime()
});

// Tipos TypeScript
type ChatMessage = z.infer<typeof ChatMessageSchema>;
type JoinRoom = z.infer<typeof JoinRoomSchema>;
type LeaveRoom = z.infer<typeof LeaveRoomSchema>;
type PingMessage = z.infer<typeof PingSchema>;

// ============================================
// 2. TYPES E INTERFACES DE DOMÍNIO
// ============================================

interface RoomUser {
    socketId: string;
    userId: string;
    username: string;
    joinedAt: Date;
}

interface Room {
    id: string;
    users: Map<string, RoomUser>;
    createdAt: Date;
}

class ValidationError extends Error {
    constructor(
        message: string,
        public zodError: z.ZodError
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

// ============================================
// 3. INTERFACES (DIP)
// ============================================

interface ILogger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
}

interface IConnectionManager {
    addConnection(socketId: string, userId: string): void;
    removeConnection(socketId: string): void;
    getConnectionsByUser(userId: string): string[];
    getUserBySocket(socketId: string): string | undefined;
}

interface IRoomManager {
    createRoom(roomId: string): void;
    joinRoom(roomId: string, user: RoomUser): void;
    leaveRoom(roomId: string, socketId: string): void;
    leaveAllRooms(socketId: string): void;
    getRoomUsers(roomId: string): RoomUser[];
    getUserRooms(socketId: string): string[];
    roomExists(roomId: string): boolean;
    isUserInRoom(roomId: string, socketId: string): boolean;
}

interface IMessageHandler {
    handle(socketId: string, eventName: string, data: any): Promise<void>;
}

interface IWebSocketServer {
    start(port: number): void;
    broadcast(eventName: string, data: any): void;
    broadcastToRoom(roomId: string, eventName: string, data: any): void;
    emitToUser(userId: string, eventName: string, data: any): void;
}

// ============================================
// 4. IMPLEMENTAÇÕES CORE
// ============================================

class ConsoleLogger implements ILogger {
    info(message: string, meta?: any): void {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    error(message: string, meta?: any): void {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    warn(message: string, meta?: any): void {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }
}

class ConnectionManager implements IConnectionManager {
    private socketToUser: Map<string, string> = new Map();
    private userToSockets: Map<string, Set<string>> = new Map();

    addConnection(socketId: string, userId: string): void {
        this.socketToUser.set(socketId, userId);

        if (!this.userToSockets.has(userId)) {
            this.userToSockets.set(userId, new Set());
        }
        this.userToSockets.get(userId)!.add(socketId);
    }

    removeConnection(socketId: string): void {
        const userId = this.socketToUser.get(socketId);
        if (userId) {
            this.userToSockets.get(userId)?.delete(socketId);
            if (this.userToSockets.get(userId)?.size === 0) {
                this.userToSockets.delete(userId);
            }
        }
        this.socketToUser.delete(socketId);
    }

    getConnectionsByUser(userId: string): string[] {
        return Array.from(this.userToSockets.get(userId) || []);
    }

    getUserBySocket(socketId: string): string | undefined {
        return this.socketToUser.get(socketId);
    }
}

// Gerenciador de Salas (SRP - Single Responsibility)
class RoomManager implements IRoomManager {
    private rooms: Map<string, Room> = new Map();
    private socketToRooms: Map<string, Set<string>> = new Map();

    constructor(private logger: ILogger) {}

    createRoom(roomId: string): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                users: new Map(),
                createdAt: new Date()
            });
            this.logger.info('Room created', { roomId });
        }
    }

    joinRoom(roomId: string, user: RoomUser): void {
        // Criar sala se não existir
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId);
        }

        const room = this.rooms.get(roomId)!;
        room.users.set(user.socketId, user);

        // Mapear socket -> rooms
        if (!this.socketToRooms.has(user.socketId)) {
            this.socketToRooms.set(user.socketId, new Set());
        }
        this.socketToRooms.get(user.socketId)!.add(roomId);

        this.logger.info('User joined room', {
            roomId,
            socketId: user.socketId,
            username: user.username
        });
    }

    leaveRoom(roomId: string, socketId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.users.delete(socketId);
            this.logger.info('User left room', { roomId, socketId });

            // Remover sala se vazia
            if (room.users.size === 0) {
                this.rooms.delete(roomId);
                this.logger.info('Room deleted (empty)', { roomId });
            }
        }

        this.socketToRooms.get(socketId)?.delete(roomId);
    }

    leaveAllRooms(socketId: string): void {
        const rooms = this.socketToRooms.get(socketId);
        if (rooms) {
            rooms.forEach(roomId => {
                this.leaveRoom(roomId, socketId);
            });
            this.socketToRooms.delete(socketId);
        }
    }

    getRoomUsers(roomId: string): RoomUser[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.users.values()) : [];
    }

    getUserRooms(socketId: string): string[] {
        return Array.from(this.socketToRooms.get(socketId) || []);
    }

    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    isUserInRoom(roomId: string, socketId: string): boolean {
        return this.rooms.get(roomId)?.users.has(socketId) || false;
    }
}

// ============================================
// 5. HANDLERS COM VALIDAÇÃO (OCP + SRP)
// ============================================

abstract class BaseMessageHandler implements IMessageHandler {
    constructor(
        protected logger: ILogger,
        protected schema?: z.ZodSchema
    ) {}

    async handle(socketId: string, eventName: string, data: any): Promise<void> {
        if (this.schema) {
            const result = this.schema.safeParse(data);

            if (!result.success) {
                this.logger.warn('Validation failed', {
                    socketId,
                    eventName,
                    errors: result.error.issues
                });
                throw new ValidationError('Invalid data format', result.error);
            }

            return this.execute(socketId, eventName, result.data);
        }

        return this.execute(socketId, eventName, data);
    }

    protected abstract execute(
        socketId: string,
        eventName: string,
        data: any
    ): Promise<void>;
}

// Handler: Entrar em Sala
class JoinRoomHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, JoinRoomSchema);
    }

    protected async execute(
        socketId: string,
        eventName: string,
        data: JoinRoom
    ): Promise<void> {
        const user: RoomUser = {
            socketId,
            userId: socketId, // Pode ser trocado por JWT userId
            username: data.username,
            joinedAt: new Date()
        };

        this.roomManager.joinRoom(data.roomId, user);

        // Notificar todos da sala
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

// Handler: Sair de Sala
class LeaveRoomHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, LeaveRoomSchema);
    }

    protected async execute(
        socketId: string,
        eventName: string,
        data: LeaveRoom
    ): Promise<void> {
        const users = this.roomManager.getRoomUsers(data.roomId);
        const leavingUser = users.find(u => u.socketId === socketId);

        this.roomManager.leaveRoom(data.roomId, socketId);

        // Notificar sala
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

// Handler: Mensagem de Chat
class ChatMessageHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, ChatMessageSchema);
    }

    protected async execute(
        socketId: string,
        eventName: string,
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
            username: sender.username,
            message: data.message
        });

        // Broadcast para toda a sala
        this.server.broadcastToRoom(data.roomId, 'chat:message', {
            roomId: data.roomId,
            sender: {
                userId: sender.userId,
                username: sender.username
            },
            message: data.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Handler: Ping
class PingMessageHandler extends BaseMessageHandler {
    constructor(logger: ILogger) {
        super(logger, PingSchema);
    }

    protected async execute(
        socketId: string,
        eventName: string,
        data: PingMessage
    ): Promise<void> {
        this.logger.info('Ping received', { socketId, timestamp: data.timestamp });
    }
}

// ============================================
// 6. MESSAGE ROUTER (OCP)
// ============================================

class MessageRouter {
    private handlers: Map<string, IMessageHandler> = new Map();

    constructor(private logger: ILogger) {}

    registerHandler(eventName: string, handler: IMessageHandler): void {
        this.handlers.set(eventName, handler);
    }

    async route(socketId: string, eventName: string, data: any): Promise<void> {
        const handler = this.handlers.get(eventName);

        if (!handler) {
            this.logger.warn('No handler found for event', { eventName });
            throw new Error(`No handler registered for event: ${eventName}`);
        }

        try {
            await handler.handle(socketId, eventName, data);
        } catch (error) {
            this.logger.error('Handler error', { eventName, error });
            throw error;
        }
    }
}

// ============================================
// 7. WEBSOCKET SERVER
// ============================================

class WebSocketServer implements IWebSocketServer {
    private io: SocketIOServer | null = null;

    constructor(
        private connectionManager: IConnectionManager,
        private roomManager: IRoomManager,
        private messageRouter: MessageRouter,
        private logger: ILogger
    ) {}

    start(port: number): void {
        const httpServer = createServer();
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.setupEventHandlers();

        httpServer.listen(port, () => {
            this.logger.info(`WebSocket server running on port ${port}`);
        });
    }

    private setupEventHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });
    }

    private handleConnection(socket: Socket): void {
        const userId = socket.handshake.auth.userId || socket.id;

        this.connectionManager.addConnection(socket.id, userId);
        this.logger.info('Client connected', { socketId: socket.id, userId });

        socket.onAny(async (eventName: string, data: any) => {
            try {
                await this.messageRouter.route(socket.id, eventName, data);

                socket.emit('message:ack', {
                    eventName,
                    status: 'success',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                if (error instanceof ValidationError) {
                    socket.emit('validation:error', {
                        eventName,
                        message: 'Dados inválidos',
                        errors: error.zodError.issues.map(err => ({
                            field: err.path.join('.'),
                            message: err.message
                        }))
                    });
                } else if (error instanceof Error) {
                    socket.emit('error', {
                        eventName,
                        message: error.message
                    });
                }
            }
        });

        socket.on('disconnect', () => {
            // Sair de todas as salas
            const rooms = this.roomManager.getUserRooms(socket.id);
            rooms.forEach(roomId => {
                const users = this.roomManager.getRoomUsers(roomId);
                const leavingUser = users.find(u => u.socketId === socket.id);

                this.roomManager.leaveRoom(roomId, socket.id);

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

            this.connectionManager.removeConnection(socket.id);
            this.logger.info('Client disconnected', { socketId: socket.id });
        });
    }

    broadcast(eventName: string, data: any): void {
        this.io?.emit(eventName, data);
    }

    broadcastToRoom(roomId: string, eventName: string, data: any): void {
        const users = this.roomManager.getRoomUsers(roomId);
        users.forEach(user => {
            this.io?.to(user.socketId).emit(eventName, data);
        });
    }

    emitToUser(userId: string, eventName: string, data: any): void {
        const socketIds = this.connectionManager.getConnectionsByUser(userId);
        socketIds.forEach(socketId => {
            this.io?.to(socketId).emit(eventName, data);
        });
    }
}

// ============================================
// 8. APPLICATION (DI Container)
// ============================================

class Application {
    private server: IWebSocketServer;

    constructor() {
        const logger = new ConsoleLogger();
        const connectionManager = new ConnectionManager();
        const roomManager = new RoomManager(logger);
        const messageRouter = new MessageRouter(logger);

        // Criar server (precisa injetar antes de registrar handlers)
        const server = new WebSocketServer(
            connectionManager,
            roomManager,
            messageRouter,
            logger
        );

        // Registrar handlers
        messageRouter.registerHandler('join:room', new JoinRoomHandler(logger, roomManager, server));
        messageRouter.registerHandler('leave:room', new LeaveRoomHandler(logger, roomManager, server));
        messageRouter.registerHandler('chat:message', new ChatMessageHandler(logger, roomManager, server));
        messageRouter.registerHandler('ping', new PingMessageHandler(logger));

        this.server = server;
    }

    start(port: number = 3000): void {
        this.server.start(port);
    }
}

// ============================================
// 9. INICIALIZAÇÃO
// ============================================

const app = new Application();
app.start(3000);