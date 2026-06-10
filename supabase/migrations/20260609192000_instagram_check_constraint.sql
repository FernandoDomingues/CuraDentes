ALTER TABLE public.curadentespro
DROP CONSTRAINT IF EXISTS curadentespro_instagram_check;

ALTER TABLE public.curadentespro
ADD CONSTRAINT curadentespro_instagram_check
CHECK (
  instagram IS NULL OR
  instagram ~ '^https://(www\.)?instagram\.com/[a-zA-Z0-9_.-]+(/|\?[a-zA-Z0-9=&%._-]*)?$'
);
