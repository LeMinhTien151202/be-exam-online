import { Role } from '@prisma/client';

// Payload user gắn vào request sau khi JWT được xác thực (req.user).
export interface IUser {
  id: number;
  email: string;
  role: Role;
}
