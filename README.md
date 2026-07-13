# QC KPI Dashboard

Dashboard chạy trên **localhost**, đọc dữ liệu từ Jira để thống kê KPI của QC.
Chỉ **đọc** dữ liệu — không ghi ngược lên Jira.

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend:** React + Vite + TailwindCSS + Recharts
- React **không** gọi Jira trực tiếp — mọi request đi qua backend.

---

## 1. Yêu cầu (Windows / PC)

- **Node.js 18.11 trở lên** (khuyến nghị Node 20 LTS) — tải tại <https://nodejs.org>
- **Git** — tải tại <https://git-scm.com>
- Máy phải vào được mạng nội bộ có `https://jira.vexere.net`

> Kiểm tra sau khi cài, mở **PowerShell** hoặc **Command Prompt**:
> ```
> node -v
> npm -v
> ```

---

## 2. Cài đặt

Mở PowerShell / Command Prompt:

```bat
git clone https://github.com/phong-vo-9/qc-kpi-dashboard.git
cd qc-kpi-dashboard
npm install
```

`npm install` sẽ tự cài cho cả `server` và `web` (npm workspaces).
`better-sqlite3` dùng bản build sẵn nên **không cần** Visual Studio Build Tools.

---

## 3. Cấu hình tài khoản Jira

Tạo file `.env` từ file mẫu:

**PowerShell:**
```powershell
Copy-Item .env.example .env
```
**Command Prompt:**
```bat
copy .env.example .env
```

Mở `.env` và điền tài khoản Jira **của bạn**:

```env
JIRA_URL=https://jira.vexere.net
JIRA_USER=your.name@vexere.com
JIRA_PASS=your_password
JIRA_PROJECT=GOP
JIRA_QC_NAME=Nguyễn Phú Thành
PORT=3001
```

> ⚠️ Không commit file `.env` (đã được `.gitignore` bỏ qua). Không hardcode tài khoản trong code.
> Nếu Jira dùng Personal Access Token, bỏ trống `JIRA_PASS` và điền `JIRA_TOKEN` thay thế.

---

## 4. Chạy

```bat
npm run dev
```

Lệnh này chạy đồng thời:

- Backend → <http://localhost:3001>
- Dashboard → **<http://localhost:5173>**

Mở trình duyệt vào **<http://localhost:5173>**, bấm nút **↻ Refresh** để đồng bộ dữ liệu từ Jira lần đầu.

Dừng: nhấn `Ctrl + C` trong terminal.

---

## 5. Cách hoạt động

```
Jira Server ──REST API──▶ Express (parse + tính KPI) ──▶ SQLite ──▶ React Dashboard
```

- Bấm **Refresh** → backend gọi Jira, lọc Task theo `Assigned QC`, lưu vào SQLite (`server/data.db`).
- Dashboard đọc từ SQLite nên tải nhanh, không phụ thuộc Jira mỗi lần mở.
- Bộ lọc **Project / Year / Quarter** áp dụng ngay trên dữ liệu đã lưu.

**Phạm vi dữ liệu:** Project `GOP`, Issue Type `Task`, trạng thái Todo → Released,
lọc theo `Assigned QC = Nguyễn Phú Thành` (`customfield_10503`), QC Weight = `customfield_13212`.
Bug = số lượng Subtask.

Chi tiết KPI & quy tắc tính: xem [`docs/SPEC.md`](docs/SPEC.md).

---

## 6. Cấu trúc

```
qc-kpi-dashboard/
├─ package.json         # workspaces + script "npm run dev"
├─ .env.example         # mẫu cấu hình (copy thành .env)
├─ server/              # Express API
│  ├─ index.js          # routes /api/*
│  ├─ jira.js           # gọi Jira REST v2
│  ├─ kpi.js            # parse label + tính KPI
│  └─ db.js             # SQLite cache
├─ web/                 # React + Vite dashboard
│  └─ src/App.jsx       # toàn bộ UI (cards, charts, table, filters)
└─ docs/SPEC.md         # tài liệu yêu cầu gốc
```

---

## 7. Xử lý sự cố

| Vấn đề | Cách xử lý |
| --- | --- |
| `npm install` lỗi build `better-sqlite3` | Cài đúng Node LTS (18/20/22), chạy lại. Bản prebuilt sẽ được dùng. |
| Refresh báo `Jira 401` | Sai `JIRA_USER` / `JIRA_PASS` trong `.env`. |
| Refresh báo `Jira 400` | JQL/field sai — kiểm tra `JIRA_PROJECT` và custom field. |
| Dashboard trống sau Refresh | Kiểm tra `JIRA_QC_NAME` khớp tên hiển thị trong Jira. |
| Port bận | Đổi `PORT` trong `.env` (backend) hoặc `server.port` trong `web/vite.config.js`. |
| `Không kết nối được backend` | Đảm bảo đang dùng `npm run dev` (chạy cả 2), mở đúng cổng 5173. |

---

## 8. Mở rộng (đã thiết kế sẵn)

- Nhiều Project (đổi `JIRA_PROJECT` hoặc thêm bộ lọc Project).
- Bug chuyển sang Issue Type = Bug → chỉ sửa hàm đếm trong `server/jira.js`.
- Thêm thống kê theo Sprint / Month / Trend → mở rộng `server/kpi.js`.
