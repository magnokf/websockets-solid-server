/**
 * Interface para gerenciamento de conexões (Single Responsibility Principle)
 *
 * Responsabilidade: Mapear socketId ↔ userId
 * Permite que um usuário tenha múltiplas conexões (desktop + mobile)
 */
export interface IConnectionManager {
    /**
     * Adiciona uma nova conexão
     * @param socketId ID do socket
     * @param userId ID do usuário
     */
    addConnection(socketId: string, userId: string): void;

    /**
     * Remove uma conexão
     * @param socketId ID do socket a ser removido
     */
    removeConnection(socketId: string): void;

    /**
     * Retorna todos os sockets de um usuário
     * @param userId ID do usuário
     * @returns Array de socketIds
     */
    getConnectionsByUser(userId: string): string[];

    /**
     * Retorna o userId de um socket
     * @param socketId ID do socket
     * @returns userId ou undefined se não encontrado
     */
    getUserBySocket(socketId: string): string | undefined;
}