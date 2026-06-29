-- Add IP address logging to copilot_conversations so the API can rate-limit
-- anonymous (signed-out) users at 5 messages per 24 hours per IP.

alter table public.copilot_conversations
  add column if not exists ip_address text;

-- Index supports the rate-limit query: count rows where ip_address = $1
-- AND created_at > now() - interval '24 hours'.
create index if not exists copilot_ip_created_idx
  on public.copilot_conversations (ip_address, created_at desc);
