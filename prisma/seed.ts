import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { seedReadingSets } from './reading-seed';

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

  // FAQs
  const FAQS = [
    // 1. Danh mục: Kỳ thi Aptis
    {
      category: 'Kỳ thi Aptis',
      sortOrder: 0,
      question: 'Aptis ESOL là gì?',
      answer:
        'Aptis ESOL là bài thi đánh giá trình độ tiếng Anh của Hội đồng Anh, kiểm tra 4 kỹ năng Nghe, Nói, Đọc, Viết cùng phần Ngữ pháp & Từ vựng. Kết quả được quy đổi theo khung CEFR từ A1 đến C.',
    },
    {
      category: 'Kỳ thi Aptis',
      sortOrder: 1,
      question: 'Cấu trúc bài thi Aptis gồm những phần nào?',
      answer:
        'Bài thi có 5 học phần: Ngữ pháp & Từ vựng (2 phần), Nghe (4 phần), Đọc (5 phần), Viết (4 phần) và Nói (4 phần). Trên hệ thống bạn có thể luyện từng phần riêng hoặc làm trọn bộ theo kỹ năng.',
    },
    {
      category: 'Kỳ thi Aptis',
      sortOrder: 2,
      question: 'Phần Ngữ pháp & Từ vựng có tính vào điểm không?',
      answer:
        'Phần này đóng vai trò điểm tham chiếu. Khi điểm của bạn nằm ở ranh giới giữa hai cấp độ, kết quả phần Ngữ pháp & Từ vựng sẽ quyết định bạn thuộc cấp độ cao hơn hay thấp hơn.',
    },
    {
      category: 'Kỳ thi Aptis',
      sortOrder: 3,
      question: 'Thang điểm của Aptis được tính thế nào?',
      answer:
        'Mỗi kỹ năng được chấm và quy đổi riêng theo khung CEFR (A1, A2, B1, B2, C). Bạn xem điểm từng kỹ năng và điểm tổng ngay sau khi hoàn thành bài thi thử.',
    },
    // 2. Danh mục: Bắt đầu & Luyện tập
    {
      category: 'Bắt đầu & Luyện tập',
      sortOrder: 0,
      question: 'Tôi bắt đầu luyện tập như thế nào?',
      answer:
        'Chọn kỹ năng muốn luyện ở thanh điều hướng bên trái hoặc tại Bảng điều khiển, sau đó chọn phần cụ thể và bấm bắt đầu. Bạn có thể luyện lẻ từng phần trước khi làm trọn bộ.',
    },
    {
      category: 'Bắt đầu & Luyện tập',
      sortOrder: 1,
      question: 'Luyện theo phần khác luyện theo bộ đề ở điểm nào?',
      answer:
        'Luyện theo phần giúp bạn tập trung vào một dạng câu hỏi cụ thể (ví dụ Đọc Phần 1). Luyện theo bộ đề cho bạn làm đủ các phần của một kỹ năng liền mạch, sát với trải nghiệm thi thật hơn.',
    },
    {
      category: 'Bắt đầu & Luyện tập',
      sortOrder: 2,
      question: 'Tôi có cần đăng nhập mới luyện tập được không?',
      answer:
        'Bạn có thể luyện tập ngay mà không cần đăng nhập. Tuy nhiên khi đăng nhập, hệ thống sẽ lưu tiến độ, chuỗi ngày học và kết quả để bạn theo dõi sự tiến bộ.',
    },
    {
      category: 'Bắt đầu & Luyện tập',
      sortOrder: 3,
      question: 'Chuỗi ngày học tập được tính như thế nào?',
      answer:
        'Mỗi ngày bạn có hoạt động luyện tập, chuỗi ngày học sẽ tăng thêm một. Duy trì chuỗi đều đặn giúp bạn giữ nhịp ôn thi ổn định.',
    },
    // 3. Danh mục: Thi thử
    {
      category: 'Thi thử',
      sortOrder: 0,
      question: 'Thi thử khác luyện tập ở điểm nào?',
      answer:
        'Bài thi thử mô phỏng kỳ thi thật với đủ 5 kỹ năng và có tính giờ. Kết quả bài thi thử được lưu lại để bạn so sánh qua từng lần, còn luyện tập thì không lưu điểm.',
    },
    {
      category: 'Thi thử',
      sortOrder: 1,
      question: 'Tôi làm lại bài thi thử được không?',
      answer:
        'Bạn được làm lại bài thi thử không giới hạn số lần. Hệ thống lưu lịch sử các lần thi để bạn theo dõi tiến bộ.',
    },
    {
      category: 'Thi thử',
      sortOrder: 2,
      question: 'Thời gian làm bài thi thử là bao lâu?',
      answer:
        'Mỗi kỹ năng có thời gian riêng do trung tâm cấu hình, hiển thị ngay trên màn hình khi bạn bắt đầu. Đồng hồ đếm ngược giúp bạn tập làm quen với áp lực thời gian như thi thật.',
    },
    // 4. Danh mục: Chấm điểm & Kết quả
    {
      category: 'Chấm điểm & Kết quả',
      sortOrder: 0,
      question: 'Bài Nói và Viết được chấm như thế nào?',
      answer:
        'Phần Nói và Viết được chấm tự động bằng AI và trả kết quả ngay sau khi nộp. Bạn nhận được điểm cùng nhận xét để biết cần cải thiện chỗ nào.',
    },
    {
      category: 'Chấm điểm & Kết quả',
      sortOrder: 1,
      question: 'Khi nào tôi có kết quả bài thi thử?',
      answer:
        'Phần trắc nghiệm được chấm tức thời, phần tự luận do AI chấm và trả về ngay trong màn hình kết quả. Bạn không phải chờ đợi sau khi nộp bài.',
    },
    {
      category: 'Chấm điểm & Kết quả',
      sortOrder: 2,
      question: 'Tôi xem lại kết quả và tiến độ ở đâu?',
      answer:
        'Vào Bảng điều khiển để xem tiến độ tổng quan và điểm dự đoán. Bạn cần đăng nhập để dữ liệu này được lưu và hiển thị.',
    },
    // 5. Danh mục: Tài khoản
    {
      category: 'Tài khoản',
      sortOrder: 0,
      question: 'Làm sao để đăng ký tài khoản?',
      answer:
        'Vào trang Đăng ký, nhập họ tên, email và mật khẩu rồi hoàn tất. Sau khi đăng ký, bạn đăng nhập bằng email và mật khẩu vừa tạo.',
    },
    {
      category: 'Tài khoản',
      sortOrder: 1,
      question: 'Tôi đăng nhập bằng Google được không?',
      answer:
        'Có. Tại trang Đăng nhập, chọn "Tiếp tục với Google" và chọn tài khoản của bạn. Hệ thống sẽ tự tạo phiên đăng nhập cho bạn.',
    },
    {
      category: 'Tài khoản',
      sortOrder: 2,
      question: 'Làm thế nào để đổi mật khẩu?',
      answer:
        'Vào Hồ sơ cá nhân, chọn "Đổi mật khẩu", nhập mật khẩu hiện tại và mật khẩu mới rồi lưu lại.',
    },
    {
      category: 'Tài khoản',
      sortOrder: 3,
      question: 'Tôi cập nhật thông tin cá nhân ở đâu?',
      answer:
        'Vào Hồ sơ cá nhân để chỉnh họ tên, trường học, mục tiêu Aptis và ngày thi dự kiến, sau đó bấm lưu thay đổi.',
    },
    // 6. Danh mục: Tài liệu học tập
    {
      category: 'Tài liệu học tập',
      sortOrder: 0,
      question: 'Trung tâm có những tài liệu học tập nào?',
      answer:
        'Kho tài liệu gồm file PDF và video bài giảng, phân loại theo từng kỹ năng. Bạn vào mục Tài liệu học tập để duyệt và mở tài liệu.',
    },
    {
      category: 'Tài liệu học tập',
      sortOrder: 1,
      question: 'Làm sao để xem hoặc tải tài liệu?',
      answer:
        'Mở mục Tài liệu học tập, tìm theo kỹ năng, rồi bấm vào tài liệu để mở trong tab mới.',
    },
  ];

  let adminId = existingAdmin?.id;
  if (!adminId) {
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    adminId = admin?.id;
  }

  if (adminId) {
    console.log('Đang seed danh sách FAQ...');
    for (const faq of FAQS) {
      const existingFaq = await prisma.faq.findFirst({
        where: {
          question: faq.question,
          category: faq.category,
          deletedAt: null,
        },
      });
      if (!existingFaq) {
        await prisma.faq.create({
          data: {
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            sortOrder: faq.sortOrder,
            isActive: true,
            createdBy: adminId,
          },
        });
      } else {
        await prisma.faq.update({
          where: { id: existingFaq.id },
          data: {
            answer: faq.answer,
            sortOrder: faq.sortOrder,
            isActive: true,
          },
        });
      }
    }

    console.log('Đang seed 5 bộ đề Reading từ tài liệu Word...');
    const readingResult = await seedReadingSets(prisma, adminId);
    console.log(
      `Đã seed ${readingResult.examCount} bộ đề Reading và ${readingResult.questionCount} câu hỏi theo part.`,
    );
  }

  console.log(
    `Seed xong: ${SKILLS.length} skills, ${SETTINGS.length} settings, ${FAQS.length} FAQs.`,
  );
}

main()
  .catch((e) => {
    console.error('Seed lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
