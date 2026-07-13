import './env.js' // Loads .env
import { fetchTasks } from './jira.js'
async function run() {
    console.log('Fetching tasks via fetchTasks() with the updated filtering logic...')
    try {
        const tasks = await fetchTasks()
        console.log(`Successfully fetched ${tasks.length} tasks!`)
        for (const t of tasks) {
            console.log(`- ${t.key}: ${t.summary} (QC: ${t.assignedQC})`)
        }
    } catch (error) {
        console.error('Error:', error)
    }
}
run()