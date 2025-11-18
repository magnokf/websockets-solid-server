/**
 * Representa um usuário em uma sala de chat
 *
 * Contém informações sobre a conexão e identidade do usuário
 */
export interface RoomUser {
    /**
     * ID único do socket (conexão WebSocket)
     */
    socketId: string;

    /**
     * ID único do usuário (após autenticação JWT será o ID do banco)
     */
    userId: string;

    /**
     * Nome de exibição do usuário
     */
    username: string;

    /**
     * Data/hora em que o usuário entrou na sala
     */
    joinedAt: Date;
}