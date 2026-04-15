# AI Matching va Security Notes

Tai lieu nay mo ta:

- AI matching dang dung model nao
- Cac he thong giao tiep voi model nhu the nao
- Frontend luu session/JWT theo cach nao de giam rui ro XSS
- Vai tro cua frontend/backend trong phong chong SQL injection

## 1) AI matching model

Service su dung model LLM qua Ollama:

- Service: `ai-matching-service`
- Model mac dinh: `qwen2.5:3b`
- Base URL: `http://ollama:11434`
- Timeout: `OLLAMA_TIMEOUT_MS` (mac dinh hien tai: `15000`)
- Toggle: `OLLAMA_ENABLED=true|false`

Code tham chieu:

- `services/ai-matching-service/index.js`

## 2) He thong giao tiep voi model

Luong tong quan:

1. `booking-service` phat su kien `BOOKING_CREATED` va `ride_events`.
2. `ai-matching-service` consume su kien, lay danh sach driver gan nhat tu Redis.
3. Service tinh diem candidate va tao prompt chua:
   - booking context
   - danh sach candidate driver
4. Service goi Ollama:
   - `POST {OLLAMA_BASE_URL}/api/generate`
   - `stream: false`
   - `format: "json"`
5. Ollama tra JSON chua `driverId` + `reason`.
6. Service validate `driverId`:
   - phai ton tai trong candidate list
   - neu khong hop le/timeout/error -> fallback sang rule-based.
7. Service phat `driver.assigned.requested` voi metadata:
   - `selectionMode: "ollama"` hoac `"rules"`
   - `selectionReason`

## 3) Frontend luu JWT/session de giam XSS

Trang thai hien tai:

- Frontend (`cab-ui/src/api/api.js`) dung `withCredentials: true`.
- Session duoc giu bang cookie do backend set:
  - `access_token` (HttpOnly)
  - `refresh_token` (HttpOnly)
- Frontend khong can doc JWT trong JavaScript.
- Cac key token cu trong `localStorage` duoc xoa khi app start/logout.

Tai sao cach nay tot hon cho XSS:

- Script bi inject khong doc duoc cookie `HttpOnly`.
- Giam kha nang exfiltrate token qua `localStorage/sessionStorage`.

## 4) SQL injection: frontend va backend

Frontend:

- Khong tao SQL query.
- Chi gui JSON request len API.
- Frontend khong phai diem bao ve chinh cho SQL injection.

Backend:

- Moi service phai validate input server-side.
- Dung ORM/query parameterization (Sequelize/Mongoose patterns).
- Khong noi chuoi raw SQL tu input user.
- Neu can raw query, bat buoc parameter binding.

## 5) Checklist van hanh

1. Xac nhan cookie co `HttpOnly=true` trong browser devtools.
2. Xac nhan khong con key JWT trong `localStorage`.
3. Xac nhan `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_MS` dung moi truong.
4. Theo doi log `ai-matching-service`:
   - neu thay `Ollama selection failed` lien tuc -> kiem tra timeout/model warmup.
5. Theo doi metrics:
   - `ai_preferred_matches`
   - `rule_fallback_matches`

