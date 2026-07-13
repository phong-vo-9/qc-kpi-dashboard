// Load .env from the repo root (this file lives in /server, .env is one level up).
// Imported FIRST in index.js so process.env is populated before other modules read it.
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })
