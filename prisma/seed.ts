import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Dữ liệu tĩnh theo DATABASE_DESIGN 4.md (Reading = 5 parts đã chốt).
const SKILLS = [
  { id: 1, name: 'Grammar & Vocabulary', totalParts: 2 },
  { id: 2, name: 'Listening', totalParts: 4 },
  { id: 3, name: 'Reading', totalParts: 5 },
  { id: 4, name: 'Writing', totalParts: 4 },
  { id: 5, name: 'Speaking', totalParts: 4 },
];

const SETTINGS: [string, string][] = [
  ['MOCK_TEST_DURATION_GRAMMAR', '25'],
  ['MOCK_TEST_DURATION_LISTENING', '30'],
  ['MOCK_TEST_DURATION_READING', '30'],
  ['MOCK_TEST_DURATION_WRITING', '30'],
  ['MOCK_TEST_DURATION_SPEAKING', '15'],
];

async function main() {
  // Skills
  for (const s of SKILLS) {
    await prisma.skill.upsert({
      where: { id: s.id },
      update: { name: s.name, totalParts: s.totalParts },
      create: s,
    });
  }

  // System settings
  for (const [settingKey, settingValue] of SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { settingKey },
      update: { settingValue },
      create: { settingKey, settingValue },
    });
  }

  // Tài khoản ADMIN mặc định (đổi mật khẩu sau khi seed!)
  const adminEmail = 'admin@test.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        profile: { create: { fullName: 'Administrator' } },
      },
    });
    console.log(`Đã tạo ADMIN: ${adminEmail} / 123456`);
  } else {
    console.log(`ADMIN ${adminEmail} đã tồn tại, bỏ qua.`);
  }

  console.log(
    `Seed xong: ${SKILLS.length} skills, ${SETTINGS.length} settings.`,
  );
}

main()
  .catch((e) => {
    console.error('Seed lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
