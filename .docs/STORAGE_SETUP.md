# Cấu hình lưu trữ file (Storage)

Hệ thống dùng **một lớp trừu tượng `StorageService`** với driver chọn qua `.env` (`STORAGE_DRIVER`).
Đổi nhà cung cấp = đổi env, **không sửa code**.

- Endpoint upload: `POST /api/v1/files/upload` (multipart, field `file`, query `folder_type=images|audio`).
- Trả về `{ url, key, size, mimeType }`. Lấy `url` gán vào `media_url` / `extra_config.image_urls` / `exam_parts.audio_url`.
- Giới hạn: ảnh `UPLOAD_MAX_IMAGE_MB` (mặc định 5MB, jpeg/png/gif/webp); audio `UPLOAD_MAX_AUDIO_MB` (mặc định 20MB, mp3/wav/m4a/ogg).

---

## 1. Dev nhanh — driver `local` (mặc định, không cần đăng ký gì)
```env
STORAGE_DRIVER="local"
STORAGE_PUBLIC_URL="http://localhost:3000/uploads"
```
File lưu ở thư mục `./uploads`, được serve tĩnh tại `/uploads`. Đủ để test luồng upload.

---

## 2. Supabase Storage (ĐANG DÙNG — cùng project DB, S3-compatible)

`.env` đã điền sẵn endpoint/URL theo project `ixlohjwjxxcrvaizndbo` (region `ap-southeast-1`).
Chỉ còn **2 việc** làm trên Supabase Dashboard:

### Bước 1: Tạo bucket public
1. Supabase Dashboard → **Storage** → **New bucket**.
2. Tên: `exam-online` (khớp `S3_BUCKET`).
3. Bật **Public bucket** = ON → **Create**.
   (Public để `STORAGE_PUBLIC_URL` mở ảnh/audio trực tiếp.)

### Bước 2: Tạo S3 access key
1. Storage → **S3 Connection** (hoặc Project Settings → Storage) → **New access key**.
2. Copy **Access Key ID** + **Secret Access Key** (hiện 1 lần).
3. Dán vào `.env`:
   ```env
   S3_ACCESS_KEY_ID="..."
   S3_SECRET_ACCESS_KEY="..."
   ```
4. (Trang S3 Connection cũng hiện sẵn **Endpoint** + **Region** để đối chiếu với `.env` — nếu region khác `ap-southeast-1` thì sửa lại `S3_REGION` cho khớp.)

### Bước 3: Restart & test
`pnpm start:dev` → `POST /files/upload` → url dạng
`https://ixlohjwjxxcrvaizndbo.supabase.co/storage/v1/object/public/exam-online/images/....jpg` → mở được công khai.

> `.env` hiện tại: `STORAGE_DRIVER="s3"`, `S3_FORCE_PATH_STYLE="true"` (Supabase bắt buộc). Upload chỉ chạy sau khi có bucket + 2 key ở trên.

---

## 3. Cloudflare R2 (phương án khác — 10GB free, miễn phí egress)

### Bước 1: Tạo bucket
1. Cloudflare Dashboard → **R2** → **Create bucket** → đặt tên (vd `exam-online`).

### Bước 2: Bật public access
1. Vào bucket → **Settings** → **Public access** → bật **R2.dev subdomain** (hoặc gắn **Custom Domain**).
2. Copy URL công khai, ví dụ `https://pub-xxxxxxxx.r2.dev` → dùng cho `STORAGE_PUBLIC_URL`.

### Bước 3: Tạo API token (Access Key)
1. R2 → **Manage R2 API Tokens** → **Create API token** → quyền **Object Read & Write** cho bucket.
2. Nhận **Access Key ID** + **Secret Access Key**.
3. Endpoint dạng: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

### Bước 4: Điền `.env`
```env
STORAGE_DRIVER="s3"
STORAGE_PUBLIC_URL="https://pub-xxxxxxxx.r2.dev"
S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="exam-online"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_FORCE_PATH_STYLE="false"
```
Restart `pnpm start:dev`. Upload → URL R2 mở công khai được ngay.

---

## 4. Đổi sang MinIO / Backblaze B2 / Wasabi / DO Spaces (cùng driver `s3`)
Chỉ đổi env:
```env
STORAGE_DRIVER="s3"
S3_ENDPOINT="<endpoint của provider>"
S3_BUCKET="<bucket>"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_FORCE_PATH_STYLE="true"        # MinIO / B2 thường cần true
STORAGE_PUBLIC_URL="<base URL công khai của bucket>"
```
- **MinIO** (tự host Docker):
  ```bash
  docker run -d --name minio -p 9000:9000 -p 9001:9001 \
    -e MINIO_ROOT_USER=admin -e MINIO_ROOT_PASSWORD=admin12345 \
    quay.io/minio/minio server /data --console-address ":9001"
  ```
  Tạo bucket + policy public ở console `http://localhost:9001`. `S3_ENDPOINT="http://localhost:9000"`, `STORAGE_PUBLIC_URL="http://localhost:9000/<bucket>"`.

---

## 5. Ghi chú
- `uploads/` đã được `.gitignore`.
- Chưa dùng signed URL (đang để public). Nếu cần bảo mật đề/đáp án sau này → bổ sung `getSignedUrl` (đã ghi trong plan).
