-- Retire the discontinued 9-count pack while preserving past order references.
UPDATE products
SET status = 'INACTIVE', is_featured = 0, deleted_at = COALESCE(deleted_at, NOW())
WHERE sku = 'SR-ANION-09' OR slug = 'sherise-9-count-organic-sanitary-pads';
