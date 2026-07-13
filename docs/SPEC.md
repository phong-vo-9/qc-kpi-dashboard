# QC KPI Dashboard

> Version: 1.0  
> Author: Nguyễn Phú Thành  
> Dashboard chạy localhost, đồng bộ dữ liệu từ Jira để thống kê KPI của QC.

---

# 1. Mục tiêu

## 1.1 Mục tiêu

Xây dựng Dashboard chạy trên localhost nhằm thống kê KPI của QC dựa trên dữ liệu từ Jira.

Dashboard chỉ có chức năng **đọc dữ liệu**, không chỉnh sửa hoặc ghi dữ liệu ngược lên Jira.

---

## 1.2 Đối tượng sử dụng

- QC

---

# 2. Kiến trúc hệ thống

```
                 Jira Server
                      │
                REST API
                      │
             NodeJS / Express
                      │
        Parse dữ liệu + Tính KPI
                      │
            SQLite Database
                      │
              React Dashboard
```

> Không để React gọi trực tiếp Jira API.

---

# 3. Công nghệ đề xuất

## Backend

- NodeJS
- Express

## Frontend

- React
- Vite
- TailwindCSS
- Recharts

## Database

- SQLite

---

# 4. Cấu hình kết nối Jira

## Jira URL

```
https://jira.vexere.net
```

## Authentication

Người dùng tự nhập trong file `.env` (xem `.env.example`):

- Username: `<Jira email của bạn>`
- Password: `<Jira password của bạn>`

Không hardcode account. Không commit tài khoản thật lên Git.

---

# 5. Phạm vi dữ liệu

## Project

Hiện tại:

```
GOP
```

Thiết kế để có thể mở rộng nhiều Project trong tương lai.

Ví dụ:

- GOP
- ITS
- CRM
- ...

---

## Assigned QC

Chỉ lấy những Task có:

```
Assigned QC = Nguyễn Phú Thành
```

Custom Field:

```
customfield_10503
```

---

# 6. Trạng thái Task cần lấy

Dashboard phải lấy toàn bộ Task đang ở các trạng thái sau:

- Todo
- In Progress
- Ready to Test
- Testing
- Done
- Released

Không được chỉ lấy Released.

---

# 7. Loại Issue

Hiện tại chỉ lấy:

```
Task
```

Không lấy:

- Epic
- Story
- Spike
- Improvement
- ...

---

# 8. Dữ liệu cần lấy từ Jira

Mỗi Task cần lấy các thông tin sau:

| Field        | Ghi chú         |
| ------------ | --------------- |
| Key          | GOP-4053        |
| Summary      | Tiêu đề         |
| Status       | Trạng thái      |
| Priority     | Priority        |
| Assignee     | Dev             |
| Assigned QC  | QC phụ trách    |
| QC Weight    | Custom Field    |
| Labels       | Phân loại KPI   |
| Sprint       | Sprint          |
| Project      | Project         |
| Component    | Module          |
| Created Date |                 |
| Updated Date |                 |
| Due Date     |                 |
| End Date     |                 |
| Subtasks     | Đếm Bug         |
| Attachments  | Có thể dùng sau |
| Comments     | Có thể dùng sau |

---

# 9. Custom Field

## Assigned QC

```
customfield_10503
```

## QC Weight

```
customfield_13212
```

---

# 10. Quy tắc đọc Label

## Quarter

| Label   | Quarter |
| ------- | ------- |
| Q1-2026 | Q1      |
| Q2-2026 | Q2      |
| Q3-2026 | Q3      |
| Q4-2026 | Q4      |

---

## Review

| Label   | Level    |
| ------- | -------- |
| Review1 | Review 1 |
| Review2 | Review 2 |
| Review3 | Review 3 |

---

## Test Case

| Label     | Level |
| --------- | ----- |
| TestCase1 | TC1   |
| TestCase2 | TC2   |
| TestCase3 | TC3   |

---

## Test Design

| Label       | Level |
| ----------- | ----- |
| TestDesign1 | TD1   |
| TestDesign2 | TD2   |
| TestDesign3 | TD3   |

---

# 11. Quy tắc tính KPI

## Tổng Task

```
Total Task = COUNT(Task)
```

---

## Review

```
Review1 = COUNT(Task có Review1)

Review2 = COUNT(Task có Review2)

Review3 = COUNT(Task có Review3)
```

---

## Test Case

```
TC1 = COUNT(Task có TestCase1)

TC2 = COUNT(Task có TestCase2)

TC3 = COUNT(Task có TestCase3)
```

---

## Test Design

```
TD1 = COUNT(Task có TestDesign1)

TD2 = COUNT(Task có TestDesign2)

TD3 = COUNT(Task có TestDesign3)
```

---

## Review / Task

```
Review1 / Task = Review1Count / TotalTask

Review2 / Task = Review2Count / TotalTask

Review3 / Task = Review3Count / TotalTask
```

Ví dụ

```
22 / 25 = 0.88
```

---

## TestCase / Task

```
TC1 / Task = TC1Count / TotalTask

TC2 / Task = TC2Count / TotalTask

TC3 / Task = TC3Count / TotalTask
```

---

## TestDesign / Task

```
TD1 / Task = TD1Count / TotalTask

TD2 / Task = TD2Count / TotalTask

TD3 / Task = TD3Count / TotalTask
```

---

# 12. QC Weight

QC Weight được lấy từ:

```
customfield_13212
```

Dashboard cần thống kê thêm:

## Tổng QC Weight

```
SUM(QC Weight)
```

Ví dụ

```
Task A = 5

Task B = 3

Task C = 8

Total QC Weight = 16
```

---

## QC Weight trung bình

```
Average QC Weight =

SUM(QC Weight)

/ Total Task
```

---

## QC Weight theo từng Task

Hiển thị trong bảng Task.

---

## Top Task có QC Weight cao nhất

Top 5 Task có QC Weight lớn nhất.

---

## QC Weight theo Quarter

Ví dụ

Q1

120

Q2

98

Q3

145

---

# 13. Bug

Hiện tại Bug được tính bằng:

```
COUNT(Subtask)
```

Ví dụ

Task

├── Bug

├── Bug

├── Bug

↓

Bug = 3

Trong tương lai nếu Bug chuyển sang Issue Type = Bug thì chỉ cần thay đổi hàm tính.

---

# 14. Dashboard Overview

Dashboard gồm các Card sau

## Tổng Task

## Tổng Review

## Tổng Test Case

## Tổng Test Design

## Tổng QC Weight

## Tổng Bug

---

# 15. Dashboard Chi tiết

## Review

- Review1
- Review2
- Review3

---

## Test Case

- TC1
- TC2
- TC3

---

## Test Design

- TD1
- TD2
- TD3

---

## QC Weight

Hiển thị

- Total QC Weight
- Average QC Weight

---

# 16. Biểu đồ

## Pie Chart

### Review

Review1

Review2

Review3

---

### Test Case

TC1

TC2

TC3

---

### Test Design

TD1

TD2

TD3

---

## Bar Chart

Top 5 Task có nhiều Bug nhất.

---

## Bar Chart

Top 5 Task có QC Weight cao nhất.

---

## Bar Chart

QC Weight theo Quarter.

---

# 17. Danh sách Task

Các cột

- Task
- Summary
- Status
- Review
- Test Case
- Test Design
- QC Weight
- Bug

Review/TestCase/TestDesign hiển thị bằng icon ✔ hoặc ✖.

---

# 18. Bộ lọc

Dashboard cần hỗ trợ:

- Project
- Year
- Quarter

Có thể mở rộng:

- Sprint
- Status
- Component

---

# 19. Refresh

Có nút Refresh để đồng bộ lại dữ liệu từ Jira.

---

# 20. Khả năng mở rộng

Thiết kế để có thể mở rộng:

- Nhiều Project
- Thống kê theo Sprint
- Thống kê theo Month
- Trend KPI
- Trend Bug
- Trend QC Weight
