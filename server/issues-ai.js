// AI Issue Parser & Refiner for Issues Management
import { getAiConfig } from './release.js'

// Heuristic fallback parser when AI is unavailable or fails
export function parseIssueFallback(rawText = '') {
  const text = String(rawText || '').trim()
  if (!text) {
    return {
      title: '',
      content: '',
      links: [],
      solution: '',
      priority: 'medium',
      status: 'open',
    }
  }

  // Extract all URLs
  const urlRegex = /(https?:\/\/[^\s\)\],]+)/gi
  const urls = []
  let match
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[1])
  }

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)]
  const images = []
  const links = []

  uniqueUrls.forEach((u) => {
    const lower = u.toLowerCase()
    const isImage = /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(u) ||
      lower.includes('imgur.com') || lower.includes('prnt.sc') || lower.includes('/attachments/')

    if (isImage) {
      images.push({ url: u, name: 'Ảnh đính kèm' })
    }

    let title = 'Link tài liệu'
    if (lower.includes('slack.com')) title = 'Thread Slack'
    else if (lower.includes('jira') || lower.includes('/browse/')) {
      const issueKey = u.match(/[A-Z0-9]+-\d+/i)
      title = issueKey ? `Task Jira ${issueKey[0]}` : 'Jira Link'
    } else if (lower.includes('docs.google') || lower.includes('confluence') || lower.includes('wiki')) {
      title = 'Tài liệu liên quan'
    } else if (lower.includes('sheets.google')) title = 'Google Sheets'
    else if (lower.includes('figma.com')) title = 'Figma UI'
    else if (lower.includes('github.com') || lower.includes('gitlab.com')) title = 'Git Repository'

    links.push({ title, url: u })
  })

  // Extract title and content
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let title = lines[0] || 'Vấn đề phát sinh'
  if (title.length > 90) {
    title = title.substring(0, 87) + '...'
  }

  // Detect priority
  const lowerText = text.toLowerCase()
  let priority = 'medium'
  if (lowerText.includes('critical') || lowerText.includes('sập') || lowerText.includes('crash') || lowerText.includes('blocker') || lowerText.includes('mất tiền')) {
    priority = 'critical'
  } else if (lowerText.includes('gấp') || lowerText.includes('high') || lowerText.includes('nghiêm trọng') || lowerText.includes('500') || lowerText.includes('502') || lowerText.includes('rollback')) {
    priority = 'high'
  } else if (lowerText.includes('minor') || lowerText.includes('low') || lowerText.includes('nhẹ') || lowerText.includes('ui nhỏ')) {
    priority = 'low'
  }

  // Detect status
  let status = 'open'
  if (lowerText.includes('đã xử lý') || lowerText.includes('đã giải quyết') || lowerText.includes('đã fix') || lowerText.includes('resolved') || lowerText.includes('đã rollback') || lowerText.includes('hoàn tất')) {
    status = 'resolved'
  }

  // Detect solution
  let solution = ''
  const solMatch = text.match(/(?:hướng giải quyết|giải pháp|cách xử lý|phương án|kết luận|solution)[\s:]+([^\n]+(?:\n[^\n]+)*)/i)
  if (solMatch) {
    solution = solMatch[1].trim()
  }

  return {
    title,
    content: text,
    images,
    links,
    solution,
    priority,
    status,
    isFallback: true,
  }
}

export async function parseIssueWithAI(rawText = '', customPrompt = '') {
  const text = String(rawText || '').trim()
  if (!text) {
    throw new Error('Vui lòng nhập nội dung vấn đề để AI phân tích')
  }

  const config = getAiConfig()
  if (!config.hasApiKey) {
    console.log('Chưa cấu hình API Key, sử dụng bộ phân tích dự phòng.')
    return parseIssueFallback(text)
  }

  const prompt = `Bạn là một Chuyên viên Quản lý Chất lượng Phần mềm (Senior QC/QA Lead) giàu kinh nghiệm.
Nhiệm vụ của bạn là đọc nội dung ghi chú thô, đoạn chat trao đổi (Slack, Jira, ghi chép nhanh của QC) và CHUYỂN ĐỔI / HOÀN THIỆN thành một Bản ghi Vấn đề (Issue) chuyên nghiệp, chuẩn xác và đầy đủ cấu trúc.

VĂN BẢN ĐẦU VÀO TỪ NGƯỜI DÙNG:
"""
${text}
"""
${customPrompt ? `YÊU CẦU BỔ SUNG CỦA NGƯỜI DÙNG: ${customPrompt}\n` : ''}

QUY TẮC PHÂN TÍCH VÀ CẤU TRÚC HÓA:
1. "title": Tiêu đề súc tích, tóm tắt chính xác bản chất vấn đề (dưới 90 ký tự). Tránh mơ hồ. Ví dụ: "Lỗi 502 khi gọi API tính giá vé nâng cấp trên Staging".
2. "content": Viết lại nội dung vấn đề một cách mạch lạc, dễ hiểu, chuyên nghiệp. Nêu rõ: Hiện tượng phát sinh, Nguyên nhân sơ bộ (nếu có trong dữ liệu), và Phạm vi ảnh hưởng. Giữ lại các mã lỗi, tên biến, tên service nếu có.
3. "links": Trích xuất TOÀN BỘ các đường link (URL http:// hoặc https://) xuất hiện trong văn bản. Với mỗi link, hãy đặt "title" phù hợp ngữ cảnh (VD: "Thread Slack trao đổi với Dev", "Task Jira GOP-1234", "Tài liệu Confluence", "Log Datadog", "Link thiết kế Figma"...).
4. "solution": Hướng giải quyết vấn đề.
   - Nếu trong văn bản đã có phương án giải quyết / thỏa thuận chốt giữa các bên: Hãy tóm tắt lại thật rõ ràng, mạch lạc các bước thực hiện.
   - Nếu chưa có: Hãy đề xuất 1-2 bước xử lý hoặc hành động tiếp theo hợp lý cho QC/Dev (VD: "Phối hợp với Backend kiểm tra log dịch vụ X, retest lại luồng thanh toán sau khi fix").
5. "priority": Suy luận mức độ ưu tiên theo chuẩn:
   - "critical": Lỗi chặn luồng chính, sập hệ thống, rủi ro tiền bạc / dữ liệu, blocker release.
   - "high": Lỗi tính năng quan trọng, lỗi môi trường Staging/Prod ảnh hưởng nhiều người.
   - "medium": Lỗi tính năng phụ, thiếu tài liệu BRD, sai sót logic có thể khắc phục tạm.
   - "low": Lỗi giao diện nhỏ, văn phong hiển thị, cải tiến trải nghiệm.
6. "status":
   - "resolved": Nếu vấn đề đã được khắc phục xong (đã rollback, đã fix, đã chốt xong).
   - "open": Nếu vấn đề mới phát sinh, đang bàn bạc hoặc cần tiếp tục theo dõi.

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON THUẦN (Không bao gồm markdown code fence):
{
  "title": "Tiêu đề vấn đề",
  "content": "Nội dung chi tiết được trau chuốt",
  "links": [
    { "title": "Tên mô tả link", "url": "https://..." }
  ],
  "solution": "Hướng giải quyết rõ ràng",
  "priority": "critical" | "high" | "medium" | "low",
  "status": "open" | "resolved"
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
            console.warn(`[Issues AI] Model ${mName} gặp sự cố (${res.status}), thử model thay thế tiếp theo...`)
            continue
          } else {
            throw new Error(lastErrMsg)
          }
        } catch (fetchErr) {
          lastErrMsg = fetchErr.message
          console.warn(`[Issues AI] Không thể gọi model ${mName}: ${fetchErr.message}`)
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
            { role: 'system', content: 'You are a professional QC assistant. Always output JSON.' },
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

    const cleaned = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      title: (parsed.title || '').trim(),
      content: (parsed.content || '').trim(),
      images: Array.isArray(parsed.images) ? parsed.images : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
      solution: (parsed.solution || '').trim(),
      priority: ['critical', 'high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
      status: ['open', 'resolved', 'closed'].includes(parsed.status) ? parsed.status : 'open',
      isFallback: false,
    }
  } catch (err) {
    console.error('Lỗi khi gọi AI phân tích vấn đề:', err.message)
    const fallback = parseIssueFallback(text)
    return {
      ...fallback,
      warning: `AI trả về lỗi (${err.message}). Đã sử dụng bộ phân tích cục bộ.`,
    }
  }
}
