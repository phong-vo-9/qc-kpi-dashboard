import './env.js'

async function run() {
  const url = process.env.JIRA_URL || 'https://jira.vexere.net'
  const token = process.env.JIRA_TOKEN
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  
  const jql = `project = "AW" AND issuetype = Bug AND ("Assigned QC" = "phuthanh.nguyen@vexere.com" OR "Assigned QC" = currentUser())`
  console.log('JQL:', jql)
  const res = await fetch(`${url}/rest/api/2/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jql,
      fields: ['summary', 'status', 'assignee', 'customfield_10503', 'customfield_10107', 'issuetype'],
      maxResults: 100
    })
  })
  const data = await res.json()
  console.log('Bugs found:', data.total)
  if (data.issues) {
    for (const issue of data.issues) {
      console.log(`- ${issue.key}: summary="${issue.fields.summary}"`)
    }
  }
}

run().catch(console.error)
