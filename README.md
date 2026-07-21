# Flow Bot Builder

Ứng dụng React + Vite + TypeScript để thiết kế và thực thi workflow thật. Backend giữ API key, cung cấp CRUD flow theo owner, DAG runner, OpenAI, RAG/web search và Langfuse tracing.

## Chạy local

```bash
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173/Flow-bot/`, API tại `http://localhost:3001`.

## Cấu hình

Sao chép `.env.example` thành `.env`, sau đó thay `JWT_SECRET` bằng chuỗi bí mật dài và đặt `DATABASE_URL` tới PostgreSQL. Chạy `npm run db:init` để kiểm tra kết nối và tạo các bảng `users`, `flows` cùng index cần thiết; API cũng tự bảo đảm schema khi khởi động. Email/mật khẩu hoạt động ngay.

Để bật Google Sign-In, tạo OAuth 2.0 Web Client trong Google Cloud Console, thêm `http://localhost:5173` vào Authorized JavaScript origins, rồi đặt cùng Client ID vào:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Dữ liệu tài khoản và flow được lưu trong PostgreSQL. Có thể dùng PostgreSQL local với database `flow_bot`, hoặc thay `DATABASE_URL` bằng connection string của database phát triển.

### LLM, RAG và web search

Các secret chỉ được đọc ở backend; không dùng tiền tố `VITE_`:

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
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
- `POST /api/runs/anonymous` với body `{ "input": "...", "flow": { "nodes": [], "edges": [] } }`

Các endpoint CRUD và `/api/flows/:id/runs` yêu cầu Bearer token, đồng thời trả `404` khi flow không thuộc user hiện tại. Endpoint anonymous không lưu flow, áp dụng rate limit, giới hạn kích thước/node/edge, chỉ nhận field node hiện có và chỉ cho phép model trong `ANONYMOUS_ALLOWED_MODELS`. API key, provider URL, secret và `variables` không được nhận từ client. `/api/flow` cũ vẫn được giữ làm compatibility alias.

Engine validate toàn bộ graph trước khi chạy: đúng một node entry (`start` hoặc `input`), edge không dangling, node reachable, nhánh xác định và DAG không cycle. Kết quả run gồm thứ tự topo, thứ tự node thực thi, variables, output và lỗi có `nodeId/code`.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploy backend lên Railway

Repository có [railway.json](./railway.json) dùng Railpack, chạy `npm run db:init` trước deploy, khởi động API bằng `npm run start:api`, kiểm tra `/api/health` và tự khởi động lại khi process lỗi.

1. Push repository lên GitHub.
2. Trong Railway, chọn **New Project → Deploy from GitHub repo** và chọn repository này.
3. Trên Project Canvas, chọn **+ New → Database → PostgreSQL**.
4. Trong service API, mở **Variables → Add Reference Variable**, thêm `DATABASE_URL` tham chiếu tới `Postgres.DATABASE_URL` (giá trị tương đương `${{Postgres.DATABASE_URL}}`).
5. Trong service API, thêm:
   - `CLIENT_ORIGIN`: origin GitHub Pages, ví dụ `https://your-account.github.io` (không thêm `/Flow-bot/`).
   - `JWT_SECRET`: chuỗi bí mật dài, ngẫu nhiên.
   - `OPENAI_API_KEY`: API key backend.
   - `OPENAI_MODEL`: ví dụ `gpt-4o-mini`.
   - `OPENAI_VECTOR_STORE_ID`: ID dạng `vs_...`.
   - `TAVILY_API_KEY`: API key web search.
   - `GOOGLE_CLIENT_ID`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` nếu dùng các tính năng tương ứng.
   - `ANONYMOUS_ALLOWED_MODELS`: danh sách model guest được phép dùng, phân tách bằng dấu phẩy.
   - Các giới hạn `ANONYMOUS_*` nếu muốn thay giá trị mặc định trong `.env.example`.
6. Không cần gắn Volume vào API service; dữ liệu bền vững nằm trong PostgreSQL.
7. Mở **Settings → Networking → Generate Domain**, sau đó kiểm tra `https://<service>.up.railway.app/api/health` trả về `{ "ok": true, "database": "postgresql" }`.
8. Trong GitHub repository, mở **Settings → Secrets and variables → Actions → Variables** và thêm:
   - `VITE_API_URL=https://<service>.up.railway.app`
   - `VITE_GOOGLE_CLIENT_ID` nếu dùng Google Sign-In.
9. Chạy lại workflow **Deploy to GitHub Pages** để frontend build với URL backend.

Không đưa API key hoặc secret vào biến frontend có tiền tố `VITE_`. File `server/data/db.json` cũ không được nhập tự động vào PostgreSQL; deployment đầu tiên khởi tạo database rỗng.

Chạy flow mẫu thật sau khi cấu hình provider keys:

```bash
npm run sample:run -- "Retrieval-augmented generation là gì?"
```

## Tính năng

- Node cơ bản và thực thi: Start, Input, Message, Question, Condition, Action, RAG Search, Web Search, LLM, Output.
- Kéo thả, nối node, chỉnh cấu hình, chạy thử và xuất scenario JSON.
- Đăng ký/đăng nhập email và mật khẩu (bcrypt + JWT).
- Đăng nhập Google, với ID token được xác minh ở backend.
- CRUD nhiều flow theo owner trong PostgreSQL; guest lưu tạm bằng localStorage và có thể chạy JSON mà không đăng nhập.
- Khi guest đăng nhập, ứng dụng hỏi có muốn lưu flow đang vẽ vào tài khoản hay không.
- Flow mẫu `Input → RAG Search → Web Search → LLM → Output` ở `examples/sample-flow.json`.
- Runner backend xử lý biến, lỗi provider, timeout, cycle và graph validation.
