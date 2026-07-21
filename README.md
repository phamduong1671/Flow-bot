# Flow Bot Builder

Ứng dụng React + Vite + TypeScript để thiết kế và thực thi workflow thật. Backend giữ API key, cung cấp CRUD flow theo owner, DAG runner, OpenAI, RAG/web search và Langfuse tracing.

## Chạy local

```bash
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173/Flow-bot/`, API tại `http://localhost:3001`.

## Cấu hình

Sao chép `.env.example` thành `.env`, sau đó thay `JWT_SECRET` bằng chuỗi bí mật dài. Email/mật khẩu hoạt động ngay.

Để bật Google Sign-In, tạo OAuth 2.0 Web Client trong Google Cloud Console, thêm `http://localhost:5173` vào Authorized JavaScript origins, rồi đặt cùng Client ID vào:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Dữ liệu phát triển nằm ở `server/data/db.json` và không được commit. Khi deploy production nên thay file store bằng database có transaction và luôn cấu hình `JWT_SECRET`, `CLIENT_ORIGIN`.

### LLM, RAG và web search

Các secret chỉ được đọc ở backend; không dùng tiền tố `VITE_`:

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6-terra
OPENAI_VECTOR_STORE_ID=vs_...
TAVILY_API_KEY=tvly-...
```

RAG Search gọi trực tiếp OpenAI Vector Store Search và chuẩn hóa các chunk thành `{ title, url, content, score? }`. Tạo một Vector Store trong OpenAI Platform, tải/attach tài liệu vào store rồi sao chép ID dạng `vs_...` vào `OPENAI_VECTOR_STORE_ID`. Web search dùng Tavily Search API. Cả hai adapter có timeout qua `SEARCH_TIMEOUT_MS`.

Node LLM gọi OpenAI Responses API từ backend. Prompt hỗ trợ biến như `{{query}}`, `{{rag_results.results}}` hoặc `{{web_results.results.0.content}}`; object/array được serialize JSON trước khi chèn.

### Langfuse

Đặt `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` và tùy chọn `LANGFUSE_BASE_URL`. Mỗi run tạo một trace; mỗi node tạo một observation, riêng LLM là generation có model, input/output, token usage, latency và cost (Langfuse suy ra từ model/usage, hoặc dùng giá cấu hình tùy chọn). Export dùng timeout ngắn và fail-open: Langfuse lỗi không làm workflow lỗi. Secret không nằm trong payload trace hoặc log.

### API flow

- `GET /api/flows`, `POST /api/flows`
- `GET /api/flows/:id`, `PUT /api/flows/:id`, `DELETE /api/flows/:id`
- `POST /api/flows/:id/runs` với body `{ "input": "...", "variables": {} }`

Tất cả endpoint yêu cầu Bearer token và trả `404` khi flow không thuộc user hiện tại. `/api/flow` cũ vẫn được giữ làm compatibility alias.

Engine validate toàn bộ graph trước khi chạy: đúng một node entry (`start` hoặc `input`), edge không dangling, node reachable, nhánh xác định và DAG không cycle. Kết quả run gồm thứ tự topo, thứ tự node thực thi, variables, output và lỗi có `nodeId/code`.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploy backend lên Render

Repository có Blueprint [render.yaml](./render.yaml) để tạo một Node web service tại Singapore. Cấu hình dùng gói `starter` và persistent disk 1 GB tại `/var/data`, vì filesystem mặc định của Render là tạm thời và không phù hợp với file database hiện tại.

1. Push repository lên GitHub.
2. Trong Render Dashboard, chọn **New → Blueprint**, kết nối repository và dùng file `render.yaml`.
3. Nhập các biến được Render yêu cầu:
   - `CLIENT_ORIGIN`: origin GitHub Pages, ví dụ `https://your-account.github.io` (không thêm `/Flow-bot/`).
   - `OPENAI_API_KEY`: API key backend.
   - `OPENAI_VECTOR_STORE_ID`: ID dạng `vs_...`.
   - `TAVILY_API_KEY`: API key web search.
4. Sau khi deploy, kiểm tra `https://<service>.onrender.com/api/health` trả về `{ "ok": true }`.
5. Trong GitHub repository, mở **Settings → Secrets and variables → Actions → Variables** và thêm:
   - `VITE_API_URL=https://<service>.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` nếu dùng Google Sign-In.
6. Chạy lại workflow **Deploy to GitHub Pages** để frontend build với URL backend.

Để bật Google Sign-In và Langfuse, thêm thủ công `GOOGLE_CLIENT_ID`, `LANGFUSE_PUBLIC_KEY` và `LANGFUSE_SECRET_KEY` trong phần Environment của Render. Không đưa các secret này vào GitHub variables có tiền tố `VITE_`.

`server/data/db.json` local không tự động được tải lên persistent disk. Deployment mới sẽ tạo database rỗng tại `/var/data/db.json` khi có lần ghi đầu tiên.

Chạy flow mẫu thật sau khi cấu hình provider keys:

```bash
npm run sample:run -- "Retrieval-augmented generation là gì?"
```

## Tính năng

- Node cơ bản và thực thi: Start, Input, Message, Question, Condition, Action, RAG Search, Web Search, LLM, Output.
- Kéo thả, nối node, chỉnh cấu hình, chạy thử và xuất scenario JSON.
- Đăng ký/đăng nhập email và mật khẩu (bcrypt + JWT).
- Đăng nhập Google, với ID token được xác minh ở backend.
- CRUD nhiều flow theo owner; guest vẫn lưu tạm bằng localStorage.
- Flow mẫu `Input → RAG Search → Web Search → LLM → Output` ở `examples/sample-flow.json`.
- Runner backend xử lý biến, lỗi provider, timeout, cycle và graph validation.
