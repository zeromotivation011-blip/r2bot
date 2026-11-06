// Payments are disabled: all R2BOT content is free. Endpoint kept as a stub so old clients get a clear answer.
export const dynamic = 'force-dynamic'

export async function POST() {
  return Response.json({ error: 'Payments are disabled. Everything on R2BOT is free.' }, { status: 410 })
}
