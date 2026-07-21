import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const SEED_ADMIN_EMAIL =
  process.env.SEED_ADMIN_EMAIL || 'admin@test.com';

export function createSeedPrisma() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function requireSeedAdmin(prisma: PrismaClient) {
  const admin = await prisma.user.findUnique({
    where: { email: SEED_ADMIN_EMAIL },
  });
  if (!admin) {
    throw new Error(
      `Không tìm thấy ADMIN ${SEED_ADMIN_EMAIL}. Hãy chạy db:seed:core trước.`,
    );
  }
  return admin;
}
