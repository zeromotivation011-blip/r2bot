'use client'

// ScormBlock — embed a SCORM 1.2 / 2004 package. Implements a minimal SCORM
// API bridge so the package can call LMSInitialize/LMSSetValue/LMSCommit/LMSFinish
// (or the SCORM 2004 equivalents) without throwing.

import { useEffect, useRef, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'scorm' }> }

interface ScormBridge {
  data: Record<string, string>
  initialized: boolean
}

// Minimal SCORM 1.2 + 2004 surface — enough to capture completion + score.
function makeBridge(onUpdate: () => void): { api12: object; api2004: object; state: ScormBridge } {
  const state: ScormBridge = { data: {}, initialized: false }

  const api12 = {
    LMSInitialize: () => { state.initialized = true; return 'true' },
    LMSFinish:     () => { state.initialized = false; onUpdate(); return 'true' },
    LMSGetValue:   (k: string) => state.data[k] ?? '',
    LMSSetValue:   (k: string, v: string) => { state.data[k] = v; onUpdate(); return 'true' },
    LMSCommit:     () => { onUpdate(); return 'true' },
    LMSGetLastError:      () => '0',
    LMSGetErrorString:    () => '',
    LMSGetDiagnostic:     () => '',
  }
  const api2004 = {
    Initialize: () => { state.initialized = true; return 'true' },
    Terminate:  () => { state.initialized = false; onUpdate(); return 'true' },
    GetValue:   (k: string) => state.data[k] ?? '',
    SetValue:   (k: string, v: string) => { state.data[k] = v; onUpdate(); return 'true' },
    Commit:     () => { onUpdate(); return 'true' },
    GetLastError:      () => '0',
    GetErrorString:    () => '',
    GetDiagnostic:     () => '',
  }
  return { api12, api2004, state }
}

interface WindowScorm {
  API?: object
  API_1484_11?: object
}

export function ScormBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [status, setStatus] = useState<{ score?: number; completion?: string; success?: string }>({})
  const completeRef = useRef(false)

  useEffect(() => {
    const handleUpdate = () => {
      const { state } = bridge
      const completion =
        state.data['cmi.completion_status'] ??
        state.data['cmi.core.lesson_status'] ??
        ''
      const success = state.data['cmi.success_status'] ?? ''
      const rawScore =
        state.data['cmi.score.scaled'] ??
        state.data['cmi.score.raw'] ??
        state.data['cmi.core.score.raw']
      const score = typeof rawScore === 'string' && rawScore !== ''
        ? Number(rawScore) > 1 ? Number(rawScore) : Number(rawScore) * 100
        : undefined

      setStatus({ score, completion, success })

      if (completeRef.current) return
      const completed = ['completed', 'passed'].includes(completion) ||
                        ['passed'].includes(success)
      const passed = success === 'passed' || completion === 'passed'
      const criterion = data.completion_criteria
      const shouldComplete =
        (criterion === 'completed' && completion === 'completed') ||
        (criterion === 'passed' && passed) ||
        (criterion === 'passed_or_completed' && (passed || completed))
      if (shouldComplete) {
        completeRef.current = true
        onComplete({ score: typeof score === 'number' ? Math.round(score) : 100, responseData: state.data })
      }
    }

    const bridge = makeBridge(handleUpdate)
    const win = window as unknown as WindowScorm
    win.API = bridge.api12         // SCORM 1.2 expects window.API
    win.API_1484_11 = bridge.api2004 // SCORM 2004 expects window.API_1484_11
    return () => {
      try {
        delete (window as unknown as { API?: unknown }).API
        delete (window as unknown as { API_1484_11?: unknown }).API_1484_11
      } catch { /* noop */ }
    }
  }, [block.id, data.completion_criteria, onComplete])

  return (
    <div className="sc">
      <iframe
        ref={iframeRef}
        src={data.package_url}
        title="SCORM package"
        style={{ width: data.width, height: data.height, maxWidth: '100%' }}
      />
      <p className="sc-status">
        {status.completion && <span>Status: <strong>{status.completion}</strong></span>}
        {typeof status.score === 'number' && <span> · Score: <strong>{Math.round(status.score)}</strong></span>}
        {isCompleted && <span> · ✓ Complete</span>}
      </p>
      <style jsx>{`
        .sc { display: flex; flex-direction: column; gap: 8px; }
        .sc iframe {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: #fff;
        }
        .sc-status {
          font-size: 12px; color: #94a3b8; font-weight: 700; margin: 0;
        }
      `}</style>
    </div>
  )
}
