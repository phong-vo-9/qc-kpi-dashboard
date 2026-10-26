// Service xử lý Release: Fetch Jira issue details + Gọi AI tóm tắt In Scope / Out of Scope
import { getMeta, setMeta } from './db.js'

function getJiraConfig() {
  return {
    url: (process.env.JIRA_URL || 'https://jira.vexere.net').replace(/\/$/, ''),
    token: process.env.JIRA_TOKEN,
    user: process.env.JIRA_USER,
    pass: process.env.JIRA_PASS,
  }
}

function getJiraAuthHeader(cfg) {
  if (cfg.token) return `Bearer ${cfg.token}`
  if (cfg.user && cfg.pass) return `Basic ${Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64')}`
  throw new Error('Thiếu thông tin đăng nhập Jira (JIRA_TOKEN hoặc JIRA_USER/PASS)')
}

// Bóc tách danh sách mã task từ chuỗi text (hỗ trợ nhập cách nhau dấu phẩy, khoảng trắng, xuống dòng, link Jira)
export function parseTaskKeys(rawInput) {
  if (!rawInput) return []
  const matches = String(rawInput).toUpperCase().match(/\b[A-Z][A-Z0-9]+-\d+\b/g)
  if (!matches) return []
  return Array.from(new Set(matches))
}

// Làm sạch text description từ Jira
function cleanJiraDescription(desc) {
  if (!desc) return ''
  if (typeof desc === 'object') {
    return JSON.stringify(desc).slice(0, 3000)
  }
  return String(desc)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .slice(0, 2500)
    .trim()
}

// Trích xuất QC Scope và các thảo luận phạm vi quan trọng từ Comments trên Jira
function extractQcScopeFromComments(comments = []) {
  let qcScope = ''
  const scopeDiscussions = []

  for (const c of comments) {
    const body = String(c.body || '')
    const author = c.author?.displayName || 'Unknown'

    // Phát hiện comment có cấu trúc QC scope (do VXR AI hoặc QC tạo)
    if (body.toLowerCase().includes('in scope') || body.toLowerCase().includes('qc scope') || body.toLowerCase().includes('out of scope')) {
      qcScope += `\n[Scope từ ${author}]:\n${body}\n`
    } else if (
      body.toLowerCase().includes('phím tắt') ||
      body.toLowerCase().includes('áp dụng') ||
      body.toLowerCase().includes('chỉ effect') ||
      body.toLowerCase().includes('bổ sung evidence') ||
      body.toLowerCase().includes('confirm') ||
      body.toLowerCase().includes('nghiệm thu')
    ) {
      // Các thảo luận chỉnh sửa scope hoặc chốt nghiệp vụ giữa QC và PO
      scopeDiscussions.push(`[${author}]: ${body.slice(0, 500)}`)
    }
  }

  return {
    qcScope: qcScope.trim(),
    discussions: scopeDiscussions.slice(-5).join('\n---\n'),
  }
}

// Fetch chi tiết từng Jira issue phục vụ release (Bao gồm Description, Subtasks, Comments)
export async function fetchJiraIssuesForRelease(taskKeys) {
  const cfg = getJiraConfig()
  const auth = getJiraAuthHeader(cfg)

  const results = []
  const errors = []

  for (const key of taskKeys) {
    try {
      // Quan trọng: Phải lấy comment và subtasks để đọc được In Scope / Out Scope từ Jira
      const apiUrl = `${cfg.url}/rest/api/2/issue/${encodeURIComponent(key)}?fields=summary,description,components,labels,subtasks,issuetype,status,assignee,priority,comment,issuelinks`
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: auth,
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        if (res.status === 404) {
          errors.push({ key, error: `Không tìm thấy task ${key} trên Jira` })
        } else {
          errors.push({ key, error: `Lỗi Jira HTTP ${res.status} khi lấy ${key}` })
        }
        continue
      }

      const data = await res.json()
      const fields = data.fields || {}
      const rawComments = fields.comment?.comments || []
      const { qcScope, discussions } = extractQcScopeFromComments(rawComments)

      results.push({
        key,
        summary: fields.summary || '',
        description: cleanJiraDescription(fields.description),
        qcScope,
        discussions,
        subtasks: Array.isArray(fields.subtasks)
          ? fields.subtasks.map((s) => ({
              key: s.key,
              summary: s.fields?.summary || '',
              status: s.fields?.status?.name || '',
            }))
          : [],
        components: Array.isArray(fields.components) ? fields.components.map((c) => c.name).filter(Boolean) : [],
        labels: Array.isArray(fields.labels) ? fields.labels : [],
        status: fields.status?.name || '',
        priority: fields.priority?.name || '',
        assignee: fields.assignee?.displayName || '',
        jiraUrl: `${cfg.url}/browse/${key}`,
      })
    } catch (err) {
      errors.push({ key, error: err.message })
    }
  }

  return { issues: results, errors }
}

// Lấy cấu hình AI từ DB hoặc .env
export function getAiConfig() {
  const saved = getMeta('release_ai_config')
  let parsed = {}
  try {
    if (saved) parsed = JSON.parse(saved)
  } catch (e) {}

  const provider = parsed.provider || process.env.AI_PROVIDER || 'gemini'
  const apiKey = parsed.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || ''
  
  // Nâng cấp model mặc định lên gemini-3.5-flash (nhanh, ổn định, tránh lỗi 503/404)
  let model = parsed.model
  if (!model || model === 'gemini-2.5-flash') {
    model = provider === 'gemini' ? 'gemini-3.5-flash' : provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'
  }

  const teamName = parsed.teamName || 'Team GMS'
  const headerTitle = parsed.headerTitle !== undefined ? parsed.headerTitle : 'GMS RELEASED PROD'
  const mentionTag = parsed.mentionTag !== undefined ? parsed.mentionTag : '@channel'

  return {
    provider,
    apiKey,
    model,
    teamName,
    headerTitle,
    mentionTag,
    hasApiKey: Boolean(apiKey),
  }
}

// Lưu cấu hình AI vào DB
export function saveAiConfig(cfg) {
  const current = getAiConfig()
  let targetModel = cfg.model || current.model
  if (targetModel === 'gemini-2.5-flash') {
    targetModel = 'gemini-3.5-flash'
  }

  const updated = {
    provider: cfg.provider || current.provider,
    apiKey: cfg.apiKey !== undefined ? cfg.apiKey : current.apiKey,
    model: targetModel,
    teamName: cfg.teamName || current.teamName,
    headerTitle: cfg.headerTitle !== undefined ? cfg.headerTitle : current.headerTitle,
    mentionTag: cfg.mentionTag !== undefined ? cfg.mentionTag : current.mentionTag,
  }
  setMeta('release_ai_config', JSON.stringify(updated))
  return {
    ...updated,
    hasApiKey: Boolean(updated.apiKey),
    apiKey: updated.apiKey ? '••••••••' + updated.apiKey.slice(-4) : '',
  }
}

// Tạo chuỗi thông báo chuẩn theo hình mẫu (Header in đậm + xuống dòng rõ ràng)
export function buildNotificationMessage({ issues, headerTitle = 'GMS RELEASED PROD', teamName = 'Team GMS', mentionTag = '@channel' }) {
  const jiraUrl = (process.env.JIRA_URL || 'https://jira.vexere.net').replace(/\/$/, '')
  const mentionSuffix = mentionTag ? ` ${mentionTag}` : ''
  const headerPart = headerTitle && headerTitle.trim() ? `*${headerTitle.trim()}*\n\n` : ''

  const taskBullets = issues
    .map((t) => `• [${t.key}](${t.jiraUrl || `${jiraUrl}/browse/${t.key}`}) — ${t.summary}`)
    .join('\n')

  return `${headerPart}Gửi mọi người, ${teamName} đã release các task sau:\n${taskBullets}\n\nNhờ mọi người hỗ trợ theo dõi và phản hồi nếu phát sinh bất thường trên Production. Team cảm ơn mọi người ạ!${mentionSuffix}`
}

// Tạo thông báo mặc định (Fallback không AI hoặc khi chưa cấu hình Key)
export function generateFallbackRelease(issues, teamName = 'Team GMS', mentionTag = '@channel', headerTitle = 'GMS RELEASED PROD') {
  const notificationMessage = buildNotificationMessage({ issues, headerTitle, teamName, mentionTag })

  // Nếu có qcScope lấy được trực tiếp từ Jira thì ưu tiên trích xuất
  const inScopeBullets = issues
    .map((t) => {
      if (t.qcScope && t.qcScope.includes('*In scope*')) {
        const inMatch = t.qcScope.match(/\*In scope\*([\s\S]*?)(?=\*Out of scope\*|$)/i)
        if (inMatch) {
          const lines = inMatch[1].replace(/[*•]/g, '').trim().split('\n').map((l) => l.trim()).filter(Boolean)
          return `• ${t.key}: ${lines.join('; ')}`
        }
      }
      return `• ${t.key}: ${t.summary}`
    })
    .join('\n')

  const outScopeBullets = issues
    .map((t) => {
      if (t.qcScope && t.qcScope.includes('*Out of scope*')) {
        const outMatch = t.qcScope.match(/\*Out of scope\*([\s\S]*?)$/i)
        if (outMatch) {
          const lines = outMatch[1].replace(/[*•]/g, '').trim().split('\n').map((l) => l.trim()).filter(Boolean)
          return `• ${t.key}: ${lines.join('; ')}`
        }
      }
      return `• ${t.key}: Cấu hình màn hình liên quan khác và các nghiệp vụ ngoài phạm vi.`
    })
    .join('\n')

  const scopeMessage = `In scope\n${inScopeBullets}\n\nOut of scope\n${outScopeBullets}`

  return {
    notificationMessage,
    scopeMessage,
    isFallback: true,
  }
}

// Gọi LLM AI tạo thông báo Release
export async function generateReleaseWithAI({
  issues,
  headerTitle = 'GMS RELEASED PROD',
  teamName = 'Team GMS',
  mentionTag = '@channel',
  customInstructions = '',
}) {
  const config = getAiConfig()

  // Luôn tạo phần notificationMessage chuẩn xác 100% theo format người dùng
  const exactNotificationMessage = buildNotificationMessage({
    issues,
    headerTitle: headerTitle !== undefined ? headerTitle : config.headerTitle,
    teamName,
    mentionTag,
  })

  if (!config.hasApiKey) {
    return {
      ...generateFallbackRelease(issues, teamName, mentionTag, headerTitle),
      message: 'Chưa cấu hình API Key cho AI. Đã tạo khung mẫu dựa trên dữ liệu Jira.',
    }
  }

  // Chuẩn bị context thực tế từ Jira (Summary, Specs, QC Scope, Thảo luận PO/QC, Subtasks)
  const taskContexts = issues.map((t) => {
    return `=== TASK: ${t.key} ===
Tiêu đề (Summary): ${t.summary}
Thành phần (Components): ${t.components.join(', ') || 'Không có'}
Mô tả chi tiết / Tài liệu: ${t.description || 'Không có'}

${t.qcScope ? `[THÔNG TIN QC SCOPE GHI NHẬN TRÊN JIRA]:\n${t.qcScope}\n` : ''}
${t.discussions ? `[THẢO LUẬN / CẬP NHẬT SCOPE GIỮA QC & PO TRÊN JIRA]:\n${t.discussions}\n` : ''}
Subtasks / Bugs liên quan: ${t.subtasks.map((s) => `[${s.key}] ${s.summary}`).join('; ') || 'Không có'}
--------------------------------------------------`
  }).join('\n\n')

  const prompt = `Bạn là một Chuyên viên Kiểm thử Phần mềm (QC/QA) và Release Manager cấp cao.
Nhiệm vụ của bạn là đọc toàn bộ thông tin các task Jira (gồm Tiêu đề, QC Scope, Thảo luận chốt phạm vi của QC và PO, Subtasks) và viết phần "In scope" và "Out of scope" chuẩn xác, súc tích và đúng định dạng yêu cầu.

DỮ LIỆU THỰC TẾ ĐỌC TỪ JIRA:
${taskContexts}

${customInstructions ? `GHI CHÚ BỔ SUNG TỪ NGƯỜI DÙNG: ${customInstructions}\n` : ''}

QUY TẮC SUY LUẬN IN SCOPE VÀ OUT OF SCOPE:
1. ĐỌC KỸ phần "QC Scope" và các thảo luận, cập nhật scope trong Jira comments của từng task.
2. In scope: Tóm tắt súc tích, ngắn gọn những tính năng thực tế được áp dụng, quyền hạn, trạng thái form, thao tác phím tắt, hỗ trợ Windows/macOS...
3. Out of scope: Những gì KHÔNG nằm trong lần release này (ví dụ: màn hình cấu hình BMS, phím tắt ở màn hình khác, kiểm tra máy in vật lý, nghiệp vụ khác không thay đổi...).

ĐỊNH DẠNG BẮT BUỘC (Mỗi task đúng 1 gạch đầu dòng bullet "• {KEY}: ..."):
In scope
• {KEY_1}: ...
• {KEY_2}: ...

Out of scope
• {KEY_1}: ...
• {KEY_2}: ...

VÍ DỤ MẪU CHUẨN CỦA DỰ ÁN:
In scope
• GOP-4351: Mở danh sách phím tắt và mở/focus thanh tìm kiếm trên GMS; áp dụng đúng cấu hình, hoạt động trên Windows/macOS và không kích hoạt lặp.
• GOP-3647: Áp dụng phím tắt tạo, mở, lưu, đóng, in và hủy đơn đúng quyền, cấu hình và trạng thái form. In được khi chọn đơn hoặc đang chỉnh sửa; dùng chung tác vụ Hủy đơn cho hai vị trí.

Out of scope
• GOP-4351: Màn cấu hình BMS, phím tắt Form Hàng và thay đổi nghiệp vụ tìm kiếm.
• GOP-3647: Màn cấu hình BMS, phím tắt chung; thay đổi nghiệp vụ tạo/lưu/in/hủy đơn và kiểm tra máy in vật lý.

YÊU CẦU ĐẦU RA:
- BẮT BUỘC TRẢ VỀ JSON THUẦN (không kèm code fence \`\`\` bên ngoài):
{
  "scopeMessage": "In scope\\n• ...\\n\\nOut of scope\\n• ..."
}
`

  try {
    let rawOutput = ''

    if (config.provider === 'gemini') {
      const candidateModels = Array.from(new Set([
        config.model,
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
      ])).filter(Boolean)

      const callGemini = async (mName) => {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mName)}:generateContent?key=${config.apiKey}`
        return fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        })
      }

      let response = null
      let lastErrMsg = ''

      for (const mName of candidateModels) {
        try {
          const res = await callGemini(mName)
          if (res.ok) {
            response = res
            break
          }
          const errBody = await res.text()
          lastErrMsg = `Gemini API lỗi (${res.status}): ${errBody}`
          if (res.status === 404 || res.status === 503) {
            console.warn(`Model ${mName} gặp sự cố (${res.status}), thử model thay thế tiếp theo...`)
            continue
          } else {
            throw new Error(lastErrMsg)
          }
        } catch (fetchErr) {
          lastErrMsg = fetchErr.message
          console.warn(`Không thể gọi model ${mName}: ${fetchErr.message}`)
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastErrMsg || 'Không thể kết nối đến Gemini API')
      }

      const resData = await response.json()
      rawOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else {
      // OpenAI / DeepSeek
      const baseUrl = config.provider === 'deepseek'
        ? 'https://api.deepseek.com/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions'

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
          messages: [
            { role: 'system', content: 'You are a professional QC Release Assistant. Always output JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`${config.provider} API lỗi (${response.status}): ${errText}`)
      }

      const resData = await response.json()
      rawOutput = resData.choices?.[0]?.message?.content || ''
    }

    let parsedResult = {}
    try {
      parsedResult = JSON.parse(rawOutput.replace(/```json/g, '').replace(/```/g, '').trim())
    } catch (e) {
      parsedResult = { scopeMessage: rawOutput }
    }

    const scopeMessage = parsedResult.scopeMessage || parsedResult.scope_message || ''

    return {
      notificationMessage: exactNotificationMessage,
      scopeMessage: scopeMessage || generateFallbackRelease(issues, teamName, mentionTag).scopeMessage,
      isFallback: false,
    }
  } catch (err) {
    console.error('Lỗi khi gọi AI sinh release notes:', err)
    const fallback = generateFallbackRelease(issues, teamName, mentionTag)
    return {
      ...fallback,
      error: `Lỗi AI: ${err.message}. Đã tạo khung dự phòng từ dữ liệu Jira.`,
    }
  }
}
