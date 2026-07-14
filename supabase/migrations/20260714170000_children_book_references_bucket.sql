-- Approved character/studio reference model sheets used as identity + style
-- anchors for children's-book illustration generation. Public read; the edge
-- function downloads bytes server-side and only ever fetches allow-listed paths.
INSERT INTO storage.buckets (id, name, public)
VALUES ('children-book-references', 'children-book-references', true)
ON CONFLICT (id) DO NOTHING;
