import { IRoomManager } from '../../interfaces/IRoomManager';
import { ILogger } from '../../interfaces/ILogger';
import { RoomUser } from '../../types/RoomUser';
import { Room } from '../../types/Room';

/**
 * Gerenciador de salas de chat
 *
 * Responsabilidade (SRP): Gerenciar salas e seus membros
 * Mantém mapeamento de quem está em cada sala
 */
export class RoomManager implements IRoomManager {
    /**
     * Mapa: roomId → Room
     * Armazena todas as salas ativas
     */
    private rooms: Map<string, Room> = new Map();

    /**
     * Mapa: socketId → Set<roomId>
     * Permite encontrar todas as salas de um usuário
     */
    private socketToRooms: Map<string, Set<string>> = new Map();

    constructor(private logger: ILogger) {}

    /**
     * Cria uma nova sala
     */
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

    /**
     * Adiciona usuário a uma sala
     */
    joinRoom(roomId: string, user: RoomUser): void {
        // Criar sala se não existir
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId);
        }

        const room = this.rooms.get(roomId)!;
        room.users.set(user.socketId, user);

        // Adicionar no mapa socketId → roomIds
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

    /**
     * Remove usuário de uma sala
     */
    leaveRoom(roomId: string, socketId: string): void {
        const room = this.rooms.get(roomId);

        if (room) {
            room.users.delete(socketId);
            this.logger.info('User left room', { roomId, socketId });

            // Se a sala ficou vazia, deletar
            if (room.users.size === 0) {
                this.rooms.delete(roomId);
                this.logger.info('Room deleted (empty)', { roomId });
            }
        }

        // Remover do mapa socketId → roomIds
        this.socketToRooms.get(socketId)?.delete(roomId);
    }

    /**
     * Remove usuário de todas as salas
     * Usado quando o usuário desconecta
     */
    leaveAllRooms(socketId: string): void {
        const rooms = this.socketToRooms.get(socketId);

        if (rooms) {
            rooms.forEach(roomId => {
                this.leaveRoom(roomId, socketId);
            });
            this.socketToRooms.delete(socketId);
        }
    }

    /**
     * Retorna todos os usuários de uma sala
     */
    getRoomUsers(roomId: string): RoomUser[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.users.values()) : [];
    }

    /**
     * Retorna todas as salas que um usuário está
     */
    getUserRooms(socketId: string): string[] {
        return Array.from(this.socketToRooms.get(socketId) || []);
    }

    /**
     * Verifica se uma sala existe
     */
    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    /**
     * Verifica se um usuário está em uma sala
     */
    isUserInRoom(roomId: string, socketId: string): boolean {
        return this.rooms.get(roomId)?.users.has(socketId) || false;
    }
}