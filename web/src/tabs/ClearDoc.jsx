// Entry point for Clear Doc tab (delegated to modular cleardoc component directory)
export { default } from './cleardoc/index.jsx'
export {
  SAMPLE_USER_TEXT,
  extractIssueCount,
  parseClearDocText,
  isRegressionTask,
  parseContentIssues,
  getStatusBadgeClasses,
  detectPlatform,
  formatBscTsv,
  formatMarkdownReport
} from './cleardoc/cleardoc-utils.js'
export {
  JiraStatusBadge,
  TaskTypeBadge,
  PlatformBadge,
  TaskPillGroup
} from './cleardoc/ClearDocBadges.jsx'
