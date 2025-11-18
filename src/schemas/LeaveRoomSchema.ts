import { z } from 'zod';

/**
 * Schema de validação para saída de sala
 *
 * Valida que o ID da sala foi fornecido
 */
export const LeaveRoomSchema = z.object({
    /**
     * ID da sala para sair
     */
    roomId: z.string().min(1, 'Room ID is required')
});

/**
 * Tipo TypeScript inferido do schema
 */
export type LeaveRoom = z.infer<typeof LeaveRoomSchema>;