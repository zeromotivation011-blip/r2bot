// Sober, mobile-friendly email layout shared by every automated email.
// Navy header, white card, orange button. No images, so it loads everywhere.
export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://www.r2bot.in'

const NAVY = '#0B2540'
const ORANGE = '#FC6818'

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function button(label: string, href: string): string {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:${ORANGE};color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${esc(label)}</a></p>`
}

export function renderEmail(opts: { preheader: string; heading: string; bodyHtml: string; unsubscribeUrl: string }): string {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b">
<span style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${NAVY};padding:18px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em">R<span style="color:${ORANGE}">2</span>BOT</td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:${NAVY}">${esc(opts.heading)}</h1>
<div style="font-size:16px;line-height:1.65">${opts.bodyHtml}</div>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b">
You get this because you joined R2BOT (free robotics learning). We never share your email.<br>
<a href="${esc(opts.unsubscribeUrl)}" style="color:#64748b">Unsubscribe</a> &middot; <a href="${BASE_URL}" style="color:#64748b">r2bot.in</a>
</td></tr></table></td></tr></table></body></html>`
}
