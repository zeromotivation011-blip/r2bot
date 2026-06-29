'use client'

// HandsOnBlock — checklist with hardware list, step-by-step, and photo upload.

import { useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'hands-on' }> }

export function HandsOnBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [done, setDone] = useState<Record<number, boolean>>({})
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggle = (order: number) => {
    setDone(d => ({ ...d, [order]: !d[order] }))
  }

  const allSteps = data.steps.every(s => done[s.order])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `handson/${block.id}-${Date.now()}.${ext}`
      const { data: up, error } = await supabase.storage
        .from('public-uploads')
        .upload(filePath, file, { upsert: false })
      if (error) {
        // Fallback: use object URL so the user still sees the photo locally
        setPhotoUrl(URL.createObjectURL(file))
      } else {
        const { data: pub } = supabase.storage
          .from('public-uploads')
          .getPublicUrl(up.path)
        setPhotoUrl(pub.publicUrl)
      }
    } catch {
      setPhotoUrl(URL.createObjectURL(file))
    } finally {
      setUploading(false)
    }
  }

  const submit = () => {
    const rubricMax = data.rubric.reduce((s, r) => s + r.max_points, 0)
    const stepsMaxPoints = Math.round((rubricMax || data.points) * 0.7)
    const submissionMaxPoints = (rubricMax || data.points) - stepsMaxPoints
    const stepsScore = stepsMaxPoints * (Object.values(done).filter(Boolean).length / data.steps.length)
    const submissionScore = photoUrl ? submissionMaxPoints : 0
    const totalPoints = stepsScore + submissionScore
    const score = rubricMax > 0 ? Math.round((totalPoints / rubricMax) * 100) : 100
    setSubmitted(true)
    onComplete({ score, responseData: { done, photoUrl } })
  }

  return (
    <div className="ho">
      <header className="ho-head">
        <p className="ho-title">{data.title}</p>
        <p className="ho-meta">
          {data.difficulty} · ~{data.time_estimate_minutes} min
        </p>
      </header>

      {data.hardware_required.length > 0 && (
        <section className="ho-hardware">
          <h4>Hardware needed</h4>
          <ul>
            {data.hardware_required.map((h, i) => (
              <li key={i}>
                {h.buy_url_india ? (
                  <a href={h.buy_url_india} target="_blank" rel="noreferrer">
                    {h.name}
                  </a>
                ) : (
                  <span>{h.name}</span>
                )}
                {typeof h.price_inr === 'number' && (
                  <span className="ho-price"> · ₹{h.price_inr}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="ho-steps">
        {data.steps.map(step => {
          const isDone = Boolean(done[step.order])
          return (
            <li key={step.order} className={isDone ? 'is-done' : ''}>
              <label className="ho-step">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(step.order)}
                />
                <div className="ho-step-body">
                  <p className="ho-step-instruction">{step.instruction}</p>
                  {step.image && <img src={step.image} alt="" className="ho-step-image" />}
                  {step.video_url && (
                    <video src={step.video_url} controls playsInline className="ho-step-video" />
                  )}
                  <p className="ho-checkpoint">🔎 Check: {step.checkpoint}</p>
                </div>
              </label>
            </li>
          )
        })}
      </ol>

      <section className="ho-submit">
        <h4>Submit your work</h4>
        <p className="ho-submit-hint">{data.submission_type === 'photo' ? 'Upload a photo of your finished circuit.' : 'Upload a photo, video, or description of your result.'}</p>
        <input
          type="file"
          accept={data.submission_type === 'video' ? 'video/*' : 'image/*'}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
          }}
          disabled={uploading || submitted}
        />
        {uploading && <p className="ho-uploading">Uploading…</p>}
        {photoUrl && (
          <img src={photoUrl} alt="Submitted work" className="ho-preview" />
        )}
      </section>

      <button
        type="button"
        onClick={submit}
        disabled={!allSteps || submitted}
        className="ho-finish"
      >
        {submitted ? 'Submitted ✓' : 'Submit my project →'}
      </button>

      <style jsx>{`
        .ho { display: flex; flex-direction: column; gap: 14px; }
        .ho-head { display: flex; align-items: center; gap: 12px; }
        .ho-title { font-size: 17px; font-weight: 800; color: #fde047; margin: 0; flex: 1; }
        .ho-meta {
          font-size: 12px; color: #94a3b8;
          background: rgba(255,255,255,0.04);
          padding: 4px 10px; border-radius: 999px;
          margin: 0;
        }
        .ho-hardware { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 12px 14px; }
        .ho-hardware h4 {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800; margin: 0 0 6px;
        }
        .ho-hardware ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .ho-hardware a { color: #00E5FF; text-decoration: underline; }
        .ho-price { color: #fbbf24; font-weight: 800; }
        .ho-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .ho-step {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          cursor: pointer;
        }
        .ho-steps li.is-done .ho-step {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.35);
        }
        .ho-step input[type="checkbox"] {
          margin-top: 3px;
          width: 18px; height: 18px;
          accent-color: #10b981;
          cursor: pointer;
        }
        .ho-step-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .ho-step-instruction { color: #f4f4f5; margin: 0; line-height: 1.5; }
        .ho-step-image, .ho-step-video {
          max-width: 100%; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .ho-checkpoint {
          font-size: 12px; color: #fbbf24; font-weight: 700; margin: 0;
        }
        .ho-submit {
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.15);
          border-radius: 12px; padding: 14px;
        }
        .ho-submit h4 {
          font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800; margin: 0 0 6px;
        }
        .ho-submit-hint { font-size: 13px; color: #c4b5fd; margin: 0 0 10px; }
        .ho-uploading { color: #fde047; font-weight: 800; margin: 8px 0 0; font-size: 12px; }
        .ho-preview { margin-top: 10px; max-width: 200px; border-radius: 8px; }
        .ho-finish {
          min-height: 52px; padding: 0 22px;
          background: linear-gradient(135deg, #00E5FF, #A56BFF);
          color: #0f0a1e;
          border: none; border-radius: 12px;
          font-weight: 900; font-size: 15px;
          cursor: pointer;
          align-self: flex-start;
        }
        .ho-finish:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
