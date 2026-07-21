import 'dotenv/config';
// Standalone API sample for uploading and seeding one Speaking Part 2 item.
import { readFile } from 'fs/promises';
import { basename, resolve } from 'path';

interface ApiEnvelope<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

interface LoginData {
  access_token: string;
}

interface UploadData {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

interface QuestionData {
  id: number;
  skillId: number;
  partNumber: number;
  questionType: string;
  content: string | null;
  extraConfig: Record<string, unknown> | null;
}

const API_BASE_URL = (
  process.env.SEED_API_BASE_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '123456';
const IMAGE_PATH = resolve(
  process.cwd(),
  process.env.SPEAKING_P2_IMAGE || 'Picture1.png',
);
const QUESTION_CONTENT =
  'Look at the picture showing two outdoor adventure activities and answer the questions.';

async function readResponse<T>(response: globalThis.Response) {
  const raw: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${JSON.stringify(raw, null, 2)}`);
  }
  return raw as ApiEnvelope<T>;
}

async function login() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  return readResponse<LoginData>(response);
}

async function uploadPicture(accessToken: string) {
  const image = await readFile(IMAGE_PATH);
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(image)], { type: 'image/png' }),
    basename(IMAGE_PATH),
  );

  const response = await fetch(
    `${API_BASE_URL}/files/upload?folder_type=images&prefix=speaking/p2`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );
  return readResponse<UploadData>(response);
}

export function buildQuestionBody(imageUrl: string) {
  return {
    skillId: 5,
    partNumber: 2,
    content: QUESTION_CONTENT,
    extraConfig: {
      response_time_seconds: 45,
      prep_time_seconds: 0,
      image_count: 1,
      image_urls: [imageUrl],
      questions: [
        {
          question: 'Describe the two outdoor activities shown in the picture.',
        },
        {
          question: 'Which activity would you prefer to try, and why?',
        },
        {
          question:
            'What skills and safety precautions are needed for these activities?',
        },
      ],
    },
  };
}

async function findExistingQuestion(accessToken: string) {
  const query = new URLSearchParams({
    skillId: '5',
    partNumber: '2',
    search: QUESTION_CONTENT,
    page: '1',
    limit: '10',
  });
  const response = await fetch(`${API_BASE_URL}/questions?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await readResponse<QuestionData[]>(response);
  return result.data.find((question) => question.content === QUESTION_CONTENT);
}

async function saveQuestion(
  accessToken: string,
  imageUrl: string,
  existing?: QuestionData,
) {
  const body = buildQuestionBody(imageUrl);
  const endpoint = existing
    ? `${API_BASE_URL}/questions/${existing.id}`
    : `${API_BASE_URL}/questions`;

  const response = await fetch(endpoint, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      existing
        ? { content: body.content, extraConfig: body.extraConfig }
        : body,
    ),
  });
  return readResponse<QuestionData>(response);
}

async function main() {
  console.log(`Ảnh nguồn: ${IMAGE_PATH}`);
  console.log(`API: ${API_BASE_URL}`);

  const loginResult = await login();
  const existing = await findExistingQuestion(loginResult.data.access_token);
  const existingImageUrls = existing?.extraConfig?.image_urls;
  const existingImageUrl =
    Array.isArray(existingImageUrls) && typeof existingImageUrls[0] === 'string'
      ? existingImageUrls[0]
      : null;
  const uploadResult = existingImageUrl
    ? null
    : await uploadPicture(loginResult.data.access_token);
  const imageUrl = existingImageUrl || uploadResult?.data.url;
  if (!imageUrl) {
    throw new Error('Không nhận được URL ảnh sau khi upload');
  }
  const questionResult = await saveQuestion(
    loginResult.data.access_token,
    imageUrl,
    existing,
  );

  console.log(
    JSON.stringify(
      {
        uploadedFile: uploadResult?.data ?? {
          reusedUrl: imageUrl,
          message: 'Câu hỏi đã tồn tại, tái sử dụng ảnh đã upload.',
        },
        question: questionResult.data,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      'Seed Speaking Part 2 thất bại:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
