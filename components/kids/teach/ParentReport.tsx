// components/kids/teach/ParentReport.tsx — SERVER wrapper for the weekly parent
// report. Reads the (large) Level 1 curriculum on the server and hands the
// client island only what the report needs: each session's title, badge and
// note for families (~10 KB). Mount this one in a server page:
//
//   import { ParentReport } from '@/components/kids/teach/ParentReport'
//   <ParentReport />

import { LEVEL1_SESSIONS } from '@/lib/kids/curriculum/level1'
import { ParentReportClient, type ReportSession } from './ParentReportClient'

export function ParentReport({ className }: { className?: string }) {
  const sessions: ReportSession[] = LEVEL1_SESSIONS.map((s) => ({
    id: s.id,
    number: s.number,
    title: s.title,
    objective: s.objective,
    badgeId: s.badge.id,
    badgeName: s.badge.name,
    badgeIcon: s.badge.icon,
    today: s.parent.today,
    tryAtHome: s.parent.tryAtHome,
    askYourChild: s.parent.askYourChild,
  }))
  return <ParentReportClient sessions={sessions} className={className} />
}

export default ParentReport
