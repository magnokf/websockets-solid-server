import { z } from 'zod';

/**
 * Schema de validação para entrada em sala
 *
 * Valida que o usuário forneceu nome e sala
 */
export const JoinRoomSchema = z.object({
    /**
     * ID da sala para entrar
     */
    roomId: z.string().min(1, 'Room ID is required'),

    /**
     * Nome de usuário
     * - Mínimo: 1 caractere
     * - Máximo: 50 caracteres
     */
    username: z.string()
        .min(1, 'Username is required')
        .max(50, 'Username too long')
        .trim()
});

/**
 * Tipo TypeScript inferido do schema
 */
export type JoinRoom = z.infer<typeof JoinRoomSchema>;