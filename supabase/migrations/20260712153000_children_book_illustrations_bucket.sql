-- Public cache for AI-generated children's book page illustrations.
INSERT INTO storage.buckets (id, name, public)
VALUES ('children-book-illustrations', 'children-book-illustrations', true)
ON CONFLICT (id) DO NOTHING;
