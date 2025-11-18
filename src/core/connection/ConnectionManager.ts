import { IConnectionManager } from '../../interfaces/IConnectionManager';

/**
 * Gerenciador de conexões WebSocket
 *
 * Responsabilidade (SRP): Mapear socketId ↔ userId
 * Permite que um usuário tenha múltiplas conexões simultâneas
 */
export class ConnectionManager implements IConnectionManager {
    /**
     * Mapa: socketId → userId
     * Permite encontrar o userId de uma conexão
     */
    private socketToUser: Map<string, string> = new Map();

    /**
     * Mapa: userId → Set<socketId>
     * Permite encontrar todas as conexões de um usuário
     */
    private userToSockets: Map<string, Set<string>> = new Map();

    /**
     * Adiciona uma nova conexão
     */
    addConnection(socketId: string, userId: string): void {
        // Adicionar no mapa socketId → userId
        this.socketToUser.set(socketId, userId);

        // Adicionar no mapa userId → socketIds
        if (!this.userToSockets.has(userId)) {
            this.userToSockets.set(userId, new Set());
        }
        this.userToSockets.get(userId)!.add(socketId);
    }

    /**
     * Remove uma conexão
     */
    removeConnection(socketId: string): void {
        const userId = this.socketToUser.get(socketId);

        if (userId) {
            // Remover do Set de sockets do usuário
            this.userToSockets.get(userId)?.delete(socketId);

            // Se não tem mais conexões, remover o usuário
            if (this.userToSockets.get(userId)?.size === 0) {
                this.userToSockets.delete(userId);
            }
        }

        // Remover do mapa socketId → userId
        this.socketToUser.delete(socketId);
    }

    /**
     * Retorna todos os sockets de um usuário
     * Útil para enviar mensagem para todas as conexões do usuário
     */
    getConnectionsByUser(userId: string): string[] {
        return Array.from(this.userToSockets.get(userId) || []);
    }

    /**
     * Retorna o userId de um socket
     */
    getUserBySocket(socketId: string): string | undefined {
        return this.socketToUser.get(socketId);
    }
}