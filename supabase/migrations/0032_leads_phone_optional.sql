-- 0032: Make lead phone optional.
-- Email stays required; phone becomes optional so we capture more leads
-- (email required, phone nice-to-have). Existing rows are unaffected.

ALTER TABLE public.leads ALTER COLUMN phone DROP NOT NULL;
