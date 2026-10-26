import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dns from 'node:dns'

// Prioritize IPv4 over IPv6 to prevent fetch failed / ECONNRESET on Windows & local Vietnam ISP networks
try {
  dns.setDefaultResultOrder('ipv4first')
} catch (e) {}

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })

