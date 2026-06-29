'use client'

// DiscussionBlock — open-ended response. Enforces min_words. Peer responses
// shown after the learner submits, when peer_visible is true.

import { useEffect, useMemo, useState } from 'react'
import type { BlockRenderProps } from './BlockRegistry'
import type { ContentBlock } from '@/lib/academy'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Props = BlockRenderProps & { block: Extract<ContentBlock, { type: 'discussion' }> }

interface PeerResponse {
  id: string
  user_id: string
  display_name?: string
  content: string
  upvotes: number
  created_at: string
}

export function DiscussionBlock({ block, isCompleted, onComplete }: Props) {
  const data = block.data
  const [text, setText] = useState('')
  const [hindi, setHindi] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [peers, setPeers] = useState<PeerResponse[]>([])
  const [loadingPeers, setLoadingPeers] = useState(false)

  const wordCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text],
  )
  const canSubmit = wordCount >= data.min_words
  const prompt = hindi && data.prompt_hi ? data.prompt_hi : data.prompt

  const submit = async () => {
    if (!canSubmit) return
    setSubmitted(true)
    onComplete({
      score: 100,
      responseData: { content: text, wordCount },
    })
    // Best-effort persist
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.from('discussion_responses').insert({
        block_id: block.id,
        content: text,
        word_count: wordCount,
      })
    } catch {
      /* table may not exist yet — fire-and-forget */
    }
  }

  // Lazily fetch peer responses after submitting
  useEffect(() => {
    if (!submitted || !data.peer_visible) return
    setLoadingPeers(true)
    ;(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: rows } = await supabase
          .from('discussion_responses')
          .select('id, user_id, content, upvotes, created_at, profiles(display_name)')
          .eq('block_id', block.id)
          .order('upvotes', { ascending: false })
          .limit(20)
        const mapped: PeerResponse[] = (rows ?? []).map((r) => {
          const profilesField = (r as { profiles?: unknown }).profiles
          const displayName =
            profilesField && typeof profilesField === 'object' && profilesField !== null && 'display_name' in profilesField
              ? String((profilesField as { display_name?: unknown }).display_name ?? 'Learner')
              : 'Learner'
          return {
            id: (r as { id: string }).id,
            user_id: (r as { user_id: string }).user_id,
            display_name: displayName,
            content: (r as { content: string }).content,
            upvotes: (r as { upvotes: number }).upvotes ?? 0,
            created_at: (r as { created_at: string }).created_at,
          }
        })
        setPeers(mapped)
      } catch {
        setPeers([])
      } finally {
        setLoadingPeers(false)
      }
    })()
  }, [submitted, block.id, data.peer_visible])

  return (
    <div className="db">
      <div className="db-prompt-row">
        <p className="db-prompt">{prompt}</p>
        {data.prompt_hi && (
          <button type="button" onClick={() => setHindi(h => !h)} className="db-lang">
            {hindi ? 'EN' : 'हिन्दी'}
          </button>
        )}
      </div>

      {!submitted ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your response here…"
            rows={5}
            className="db-textarea"
            disabled={isCompleted}
          />
          <div className="db-footer">
            <span className={`db-count ${canSubmit ? 'is-ok' : ''}`}>
              {wordCount} / {data.min_words} words minimum
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="db-submit"
            >
              Submit response →
            </button>
          </div>
        </>
      ) : (
        <div className="db-submitted">
          <p className="db-your-response">
            <strong>Your response:</strong> {text}
          </p>
          {data.peer_visible && (
            <section className="db-peers">
              <h4>What other learners said</h4>
              {loadingPeers && <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</p>}
              {!loadingPeers && peers.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>
                  You&apos;re one of the first to answer. Check back later.
                </p>
              )}
              <ul>
                {peers.map(p => (
                  <li key={p.id}>
                    <div className="db-peer-head">
                      <span className="db-peer-name">{p.display_name ?? 'Learner'}</span>
                      <span className="db-peer-up">👍 {p.upvotes}</span>
                    </div>
                    <p>{p.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <style jsx>{`
        .db { display: flex; flex-direction: column; gap: 10px; }
        .db-prompt-row { display: flex; gap: 10px; align-items: flex-start; }
        .db-prompt { flex: 1; margin: 0; color: #fde047; font-weight: 800; font-size: 15px; line-height: 1.5; }
        .db-lang {
          padding: 4px 12px; border-radius: 999px;
          background: rgba(251,191,36,0.14);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.3);
          font-weight: 800; font-size: 12px; cursor: pointer;
        }
        .db-textarea {
          width: 100%;
          padding: 12px 14px;
          background: rgba(11, 18, 32, 0.6);
          border: 2px solid rgba(255,255,255,0.1);
          color: #f4f4f5;
          font-size: 15px; line-height: 1.5;
          border-radius: 10px;
          resize: vertical;
          font-family: inherit;
        }
        .db-textarea:focus { outline: none; border-color: #00E5FF; }
        .db-footer { display: flex; justify-content: space-between; align-items: center; }
        .db-count { font-size: 12px; color: #94a3b8; font-weight: 700; }
        .db-count.is-ok { color: #10b981; }
        .db-submit {
          min-height: 44px; padding: 0 18px;
          background: linear-gradient(135deg, #00E5FF, #A56BFF);
          color: #0f0a1e;
          border: none; border-radius: 10px;
          font-weight: 900; cursor: pointer;
        }
        .db-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .db-submitted {
          display: flex; flex-direction: column; gap: 14px;
        }
        .db-your-response {
          padding: 12px 14px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 10px;
          color: #c4b5fd;
          margin: 0; line-height: 1.5;
        }
        .db-your-response strong { color: #fde047; }
        .db-peers h4 {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: #94a3b8; font-weight: 800; margin: 0 0 8px;
        }
        .db-peers ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .db-peers li {
          padding: 12px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
        }
        .db-peer-head {
          display: flex; gap: 10px;
          font-size: 12px; font-weight: 800;
          margin-bottom: 4px;
        }
        .db-peer-name { color: #fde047; }
        .db-peer-up { color: #94a3b8; margin-left: auto; }
        .db-peers p { margin: 0; color: #c8d0dc; font-size: 14px; line-height: 1.5; }
      `}</style>
    </div>
  )
}
