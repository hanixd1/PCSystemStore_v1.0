-- Normalize existing public product slugs from product names only.
-- Legacy UUID links remain supported by the frontend compatibility route.
DROP INDEX IF EXISTS "Product_slug_key";

WITH source AS (
  SELECT
    id,
    "createdAt",
    NULLIF(
      regexp_replace(
        regexp_replace(
          replace(
            replace(
              replace(
                lower(name),
                '.',
                ''
              ),
              '&',
              ' y '
            ),
            '+',
            ' plus '
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '(^-+|-+$)',
        '',
        'g'
      ),
      ''
    ) AS base_slug
  FROM "Product"
),
numbered AS (
  SELECT
    id,
    COALESCE(base_slug, 'producto') AS base_slug,
    row_number() OVER (
      PARTITION BY LEFT(COALESCE(base_slug, 'producto'), 120)
      ORDER BY "createdAt", id
    ) AS duplicate_index
  FROM source
)
UPDATE "Product" AS product
SET slug = CASE
  WHEN numbered.duplicate_index = 1 THEN LEFT(numbered.base_slug, 120)
  ELSE
    LEFT(
      numbered.base_slug,
      GREATEST(1, 120 - LENGTH('-' || numbered.duplicate_index::text))
    ) || '-' || numbered.duplicate_index::text
  END
FROM numbered
WHERE product.id = numbered.id;

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
