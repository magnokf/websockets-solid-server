import { RoomUser } from './RoomUser';

/**
 * Representa uma sala de chat
 *
 * Mantém informações sobre a sala e seus membros
 */
export interface Room {
    /**
     * ID único da sala
     */
    id: string;

    /**
     * Mapa de usuários na sala
     * Key: socketId
     * Value: RoomUser
     */
    users: Map<string, RoomUser>;

    /**
     * Data/hora de criação da sala
     */
    createdAt: Date;
}