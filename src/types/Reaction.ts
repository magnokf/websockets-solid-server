/**
 * Representa uma reação em uma mensagem
 *
 * Contém informações sobre quem reagiu, qual emoji e quando
 */
export interface Reaction {
    /**
     * ID do usuário que reagiu
     */
    userId: string;

    /**
     * Nome de exibição do usuário
     */
    username: string;

    /**
     * Emoji da reação
     * Exemplos: 👍, ❤️, 😂, 😮, 😢, 🔥
     */
    emoji: string;

    /**
     * Data/hora da reação
     */
    timestamp: Date;
}