import { RoomUser } from '../types/RoomUser';

/**
 * Interface para gerenciamento de salas (Single Responsibility Principle)
 *
 * Responsabilidade: Gerenciar salas de chat e seus membros
 * Mantém mapeamento de usuários em cada sala
 */
export interface IRoomManager {
    /**
     * Cria uma nova sala
     * @param roomId ID da sala a ser criada
     */
    createRoom(roomId: string): void;

    /**
     * Adiciona usuário a uma sala
     * @param roomId ID da sala
     * @param user Dados do usuário
     */
    joinRoom(roomId: string, user: RoomUser): void;

    /**
     * Remove usuário de uma sala
     * @param roomId ID da sala
     * @param socketId ID do socket do usuário
     */
    leaveRoom(roomId: string, socketId: string): void;

    /**
     * Remove usuário de todas as salas
     * @param socketId ID do socket do usuário
     */
    leaveAllRooms(socketId: string): void;

    /**
     * Retorna todos os usuários de uma sala
     * @param roomId ID da sala
     * @returns Array de usuários na sala
     */
    getRoomUsers(roomId: string): RoomUser[];

    /**
     * Retorna todas as salas que um usuário está
     * @param socketId ID do socket do usuário
     * @returns Array de roomIds
     */
    getUserRooms(socketId: string): string[];

    /**
     * Verifica se uma sala existe
     * @param roomId ID da sala
     * @returns true se a sala existe
     */
    roomExists(roomId: string): boolean;

    /**
     * Verifica se um usuário está em uma sala
     * @param roomId ID da sala
     * @param socketId ID do socket do usuário
     * @returns true se o usuário está na sala
     */
    isUserInRoom(roomId: string, socketId: string): boolean;
}