USE sherise_db;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

INSERT INTO admin_roles (code, name, description, is_system)
VALUES
  ('SUPER_ADMIN', 'Super Admin', 'Full access to all admin modules.', 1),
  ('ORDER_MANAGER', 'Order Manager', 'Access to orders, customers, payments, returns and refunds.', 1),
  ('CONTENT_MANAGER', 'Content Manager', 'Access to blogs, FAQs, banners and website CMS.', 1),
  ('INVENTORY_MANAGER', 'Inventory Manager', 'Access to products, categories and inventory.', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_system = VALUES(is_system);

INSERT INTO admin_permissions (code, module, action, description)
VALUES
  ('dashboard.read', 'dashboard', 'read', 'View admin dashboard metrics.'),
  ('products.manage', 'products', 'manage', 'Create, update, delete and publish products.'),
  ('categories.manage', 'categories', 'manage', 'Manage product categories.'),
  ('inventory.manage', 'inventory', 'manage', 'Adjust stock and view inventory history.'),
  ('orders.manage', 'orders', 'manage', 'View and update orders.'),
  ('customers.read', 'customers', 'read', 'View customer profiles and history.'),
  ('payments.read', 'payments', 'read', 'View payment records.'),
  ('coupons.manage', 'coupons', 'manage', 'Create and update coupons.'),
  ('reviews.moderate', 'reviews', 'moderate', 'Approve or reject customer reviews.'),
  ('blogs.manage', 'blogs', 'manage', 'Create and publish blog posts.'),
  ('faqs.manage', 'faqs', 'manage', 'Manage FAQs.'),
  ('cms.manage', 'cms', 'manage', 'Manage homepage and website CMS content.'),
  ('leads.manage', 'leads', 'manage', 'Manage popup leads and enquiries.'),
  ('newsletter.manage', 'newsletter', 'manage', 'Manage newsletter subscribers.'),
  ('returns.manage', 'returns', 'manage', 'Manage cancellations, returns and refunds.'),
  ('notifications.read', 'notifications', 'read', 'View admin notifications.'),
  ('settings.manage', 'settings', 'manage', 'Manage business, shipping and social settings.'),
  ('admins.manage', 'admins', 'manage', 'Manage admin users, roles and permissions.'),
  ('audit.read', 'audit', 'read', 'View audit logs.'),
  ('reports.read', 'reports', 'read', 'View reports and analytics.')
ON DUPLICATE KEY UPDATE
  module = VALUES(module),
  action = VALUES(action),
  description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p
WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
  'dashboard.read',
  'orders.manage',
  'customers.read',
  'payments.read',
  'reviews.moderate',
  'returns.manage',
  'notifications.read',
  'reports.read'
)
WHERE r.code = 'ORDER_MANAGER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
  'dashboard.read',
  'blogs.manage',
  'faqs.manage',
  'cms.manage',
  'leads.manage',
  'newsletter.manage',
  'notifications.read'
)
WHERE r.code = 'CONTENT_MANAGER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
  'dashboard.read',
  'products.manage',
  'categories.manage',
  'inventory.manage',
  'notifications.read',
  'reports.read'
)
WHERE r.code = 'INVENTORY_MANAGER';

INSERT INTO product_categories (name, slug, description, display_in_navigation, status, sort_order)
VALUES
  ('Sanitary Pads', 'sanitary-pads', 'SheRise sanitary pad products.', 1, 'ACTIVE', 10),
  ('Period Care', 'period-care', 'Period care essentials and bundles.', 1, 'ACTIVE', 20),
  ('Day Pads', 'day-pads', 'Day-use sanitary pad formats.', 1, 'ACTIVE', 30),
  ('Night / Overnight Pads', 'night-overnight-pads', 'Extended coverage night and overnight pads.', 1, 'ACTIVE', 40),
  ('Combo Packs', 'combo-packs', 'Value packs, trial packs and combos.', 1, 'ACTIVE', 50)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  display_in_navigation = VALUES(display_in_navigation),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO products (
  category_id,
  name,
  slug,
  sku,
  short_description,
  description,
  mrp,
  selling_price,
  discount_amount,
  discount_percent,
  pack_quantity,
  flow_type,
  material_composition,
  product_dimensions,
  pad_length,
  front_pack_content,
  anion_strip_notes,
  brand_message,
  storage_instruction,
  features,
  usage_instructions,
  disposal_instructions,
  safety_information,
  manufacturer_details,
  marketer_details,
  product_contact,
  product_email,
  product_website,
  country_of_origin,
  shelf_life,
  meta_title,
  meta_description,
  is_featured,
  is_bestseller,
  status
)
SELECT
  c.id,
  'SheRise 20 Count Organic Sanitary Pads With Anion Strip',
  'sherise-20-count-organic-sanitary-pads',
  'SR-ANION-20',
  '20-count pack with 12 Regular and 8 XXL pads plus disposable bag.',
  'A SheRise 20-count sanitary pad pack for normal and heavy flow routines. Includes 12 Regular pads at 290 mm and 8 XXL pads at 320 mm, with disposable bag.',
  400.00,
  329.00,
  71.00,
  17.75,
  'Total 20 Count',
  'MEDIUM,HEAVY',
  'Organic Sanitary Pads With Anion Strip; Soft Cotton Top Layer; Breathable Back Sheet',
  '12 Count Regular - 290 mm; 8 Count XXL - 320 mm',
  'Regular 290 mm; XXL 320 mm',
  'SheRise | Release. Renew & Rise | Organic Sanitary Pads With Anion Strip | 12 Count Regular - 290 mm | 8 Count XXL - 320 mm | Total 20 Count | With Disposable Bag',
  'Packaging mentions anion strip advantages including balance, energy, immunity, metabolism, circulation, mood, stress and sleep support. Verify these claims before using them as medical or wellness claims on the website.',
  'With every cycle, She Releases, Renews, and Rises. Inspired by the natural rhythm of the body, SheRise celebrates strength, balance, and renewal. RELEASE - RENEW - RISE. Menstruation is a gentle reminder of your inner strength, the importance of self-care and the beauty of being a woman.',
  'Store in a clean, dry and sealed place.',
  JSON_ARRAY('Soft Cotton Top Layer', 'Super Absorbent Core', 'Breathable Back Sheet', 'Leak Guard Protection', 'Dry & Comfortable Feel', 'Individually Wrapped for Hygiene'),
  JSON_ARRAY('Peel off back paper.', 'Place on underwear and press.', 'Remove wing strips.', 'Fold wings and secure.'),
  JSON_ARRAY('Roll the used pad.', 'Place it into the disposable bag.', 'Do not flush it.', 'Dispose of it in a dustbin.'),
  'For external use only. Stop use if persistent irritation occurs and consult a qualified healthcare professional if symptoms continue.',
  'Kollisto Hygiene Pvt Ltd',
  'S3 Enterprises, Prabhadevi, Mumbai 400 013.',
  '95942 41666',
  'hellosherise.in@gmail.com',
  'hellosherise.com',
  'India',
  '36 Months from DOM',
  'SheRise 20 Count Organic Sanitary Pads With Anion Strip',
  'Shop SheRise 20 Count organic sanitary pads with anion strip, disposable bag, Regular and XXL sizes.',
  1,
  0,
  'ACTIVE'
FROM product_categories c
WHERE c.slug = 'sanitary-pads'
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  short_description = VALUES(short_description),
  description = VALUES(description),
  mrp = VALUES(mrp),
  selling_price = VALUES(selling_price),
  discount_amount = VALUES(discount_amount),
  discount_percent = VALUES(discount_percent),
  pack_quantity = VALUES(pack_quantity),
  flow_type = VALUES(flow_type),
  material_composition = VALUES(material_composition),
  product_dimensions = VALUES(product_dimensions),
  pad_length = VALUES(pad_length),
  front_pack_content = VALUES(front_pack_content),
  anion_strip_notes = VALUES(anion_strip_notes),
  brand_message = VALUES(brand_message),
  storage_instruction = VALUES(storage_instruction),
  features = VALUES(features),
  usage_instructions = VALUES(usage_instructions),
  disposal_instructions = VALUES(disposal_instructions),
  safety_information = VALUES(safety_information),
  manufacturer_details = VALUES(manufacturer_details),
  marketer_details = VALUES(marketer_details),
  product_contact = VALUES(product_contact),
  product_email = VALUES(product_email),
  product_website = VALUES(product_website),
  shelf_life = VALUES(shelf_life),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  is_featured = VALUES(is_featured),
  status = VALUES(status);

INSERT INTO product_variants (
  product_id,
  sku,
  size,
  pack_quantity,
  variant_name,
  mrp,
  selling_price,
  discount_amount,
  discount_percent,
  low_stock_threshold,
  status,
  sort_order
)
SELECT
  p.id,
  'SR-ANION-20-PACK',
  'Regular + XXL',
  '20 Count',
  '20 Count - 12 Regular + 8 XXL',
  400.00,
  329.00,
  71.00,
  17.75,
  5,
  'ACTIVE',
  10
FROM products p
WHERE p.sku = 'SR-ANION-20'
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  size = VALUES(size),
  pack_quantity = VALUES(pack_quantity),
  variant_name = VALUES(variant_name),
  mrp = VALUES(mrp),
  selling_price = VALUES(selling_price),
  discount_amount = VALUES(discount_amount),
  discount_percent = VALUES(discount_percent),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO inventory (product_id, variant_id, inventory_level, current_stock, reserved_stock, low_stock_threshold)
SELECT p.id, v.id, 'VARIANT', 12, 0, 5
FROM products p
JOIN product_variants v ON v.product_id = p.id AND v.sku = 'SR-ANION-20-PACK'
WHERE p.sku = 'SR-ANION-20'
ON DUPLICATE KEY UPDATE
  current_stock = VALUES(current_stock),
  reserved_stock = VALUES(reserved_stock),
  low_stock_threshold = VALUES(low_stock_threshold);

INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order, is_featured)
SELECT
  p.id,
  'FEATURED',
  '/uploads/products/sherise-20-count-organic-sanitary-pads.jpg',
  'SheRise 20 Count Organic Sanitary Pads With Anion Strip',
  10,
  1
FROM products p
WHERE p.sku = 'SR-ANION-20'
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
      AND pi.image_url = '/uploads/products/sherise-20-count-organic-sanitary-pads.jpg'
  );

INSERT INTO products (
  category_id,
  name,
  slug,
  sku,
  short_description,
  description,
  mrp,
  selling_price,
  discount_amount,
  discount_percent,
  pack_quantity,
  flow_type,
  material_composition,
  product_dimensions,
  pad_length,
  front_pack_content,
  anion_strip_notes,
  brand_message,
  storage_instruction,
  features,
  usage_instructions,
  disposal_instructions,
  safety_information,
  manufacturer_details,
  marketer_details,
  product_contact,
  product_email,
  product_website,
  country_of_origin,
  shelf_life,
  meta_title,
  meta_description,
  is_featured,
  is_bestseller,
  status
)
SELECT
  c.id,
  'SheRise 9 Count Organic Sanitary Pads With Anion Strip',
  'sherise-9-count-organic-sanitary-pads',
  'SR-ANION-09',
  'Medium 9-count pack with disposable bag.',
  'A SheRise 9-count sanitary pad pack for everyday period care. The pack is marked Medium and includes a disposable bag.',
  180.00,
  149.00,
  31.00,
  17.22,
  'Total 9 Count - Medium',
  'MEDIUM',
  'Organic Sanitary Pads With Anion Strip; Soft Cotton Top Layer; Breathable Back Sheet',
  'Total 9 Count - Medium',
  'Medium',
  'SheRise | Release. Renew & Rise | Organic Sanitary Pads With Anion Strip | With Disposable Bag | Total 9 Count | Medium',
  'Packaging references an anion strip. Additional small-print pack details should be verified from a clearer image before using as final product claims.',
  'With every cycle, She Releases, Renews, and Rises. Inspired by the natural rhythm of the body, SheRise celebrates strength, balance, and renewal. Menstruation is a gentle reminder of your inner strength, the importance of self-care and the beauty of being a woman.',
  'Storage instructions, MRP and best-before information are shown on the pack and should be verified from final artwork before launch.',
  JSON_ARRAY('Organic Sanitary Pads With Anion Strip', 'With Disposable Bag', 'Medium Pack', 'Total 9 Count', 'Designed for everyday comfort', 'Individually Wrapped for Hygiene'),
  JSON_ARRAY('Peel off back paper.', 'Place on underwear and press.', 'Remove wing strips.', 'Fold wings and secure.'),
  JSON_ARRAY('Roll the used pad.', 'Place it into the disposable bag.', 'Do not flush it.', 'Dispose of it in a dustbin.'),
  'For external use only. Stop use if persistent irritation occurs and consult a qualified healthcare professional if symptoms continue.',
  'Kallisto Hygiene Pvt Ltd',
  'S3 Enterprises, Prabhadevi, Mumbai 400 013.',
  '95942 41666',
  'hellosherise.in@gmail.com',
  'hellosherise.com',
  'India',
  'Best-before information shown on pack; verify from final artwork.',
  'SheRise 9 Count Organic Sanitary Pads With Anion Strip',
  'Shop SheRise 9 Count Medium organic sanitary pads with anion strip and disposable bag.',
  1,
  0,
  'ACTIVE'
FROM product_categories c
WHERE c.slug = 'sanitary-pads'
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  short_description = VALUES(short_description),
  description = VALUES(description),
  mrp = VALUES(mrp),
  selling_price = VALUES(selling_price),
  discount_amount = VALUES(discount_amount),
  discount_percent = VALUES(discount_percent),
  pack_quantity = VALUES(pack_quantity),
  flow_type = VALUES(flow_type),
  material_composition = VALUES(material_composition),
  product_dimensions = VALUES(product_dimensions),
  pad_length = VALUES(pad_length),
  front_pack_content = VALUES(front_pack_content),
  anion_strip_notes = VALUES(anion_strip_notes),
  brand_message = VALUES(brand_message),
  storage_instruction = VALUES(storage_instruction),
  features = VALUES(features),
  usage_instructions = VALUES(usage_instructions),
  disposal_instructions = VALUES(disposal_instructions),
  safety_information = VALUES(safety_information),
  manufacturer_details = VALUES(manufacturer_details),
  marketer_details = VALUES(marketer_details),
  product_contact = VALUES(product_contact),
  product_email = VALUES(product_email),
  product_website = VALUES(product_website),
  shelf_life = VALUES(shelf_life),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  is_featured = VALUES(is_featured),
  status = VALUES(status);

INSERT INTO product_variants (
  product_id,
  sku,
  size,
  pack_quantity,
  variant_name,
  mrp,
  selling_price,
  discount_amount,
  discount_percent,
  low_stock_threshold,
  status,
  sort_order
)
SELECT
  p.id,
  'SR-ANION-09-MEDIUM',
  'Medium',
  '9 Count',
  '9 Count Medium',
  180.00,
  149.00,
  31.00,
  17.22,
  5,
  'ACTIVE',
  10
FROM products p
WHERE p.sku = 'SR-ANION-09'
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  size = VALUES(size),
  pack_quantity = VALUES(pack_quantity),
  variant_name = VALUES(variant_name),
  mrp = VALUES(mrp),
  selling_price = VALUES(selling_price),
  discount_amount = VALUES(discount_amount),
  discount_percent = VALUES(discount_percent),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO inventory (product_id, variant_id, inventory_level, current_stock, reserved_stock, low_stock_threshold)
SELECT p.id, v.id, 'VARIANT', 14, 0, 5
FROM products p
JOIN product_variants v ON v.product_id = p.id AND v.sku = 'SR-ANION-09-MEDIUM'
WHERE p.sku = 'SR-ANION-09'
ON DUPLICATE KEY UPDATE
  current_stock = VALUES(current_stock),
  reserved_stock = VALUES(reserved_stock),
  low_stock_threshold = VALUES(low_stock_threshold);

INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order, is_featured)
SELECT
  p.id,
  'FEATURED',
  '/uploads/products/sherise-9-count-organic-sanitary-pads.jpg',
  'SheRise 9 Count Organic Sanitary Pads With Anion Strip',
  10,
  1
FROM products p
WHERE p.sku = 'SR-ANION-09'
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
      AND pi.image_url = '/uploads/products/sherise-9-count-organic-sanitary-pads.jpg'
  );

INSERT INTO products (
  category_id,
  name,
  slug,
  sku,
  short_description,
  description,
  mrp,
  selling_price,
  discount_amount,
  discount_percent,
  pack_quantity,
  flow_type,
  material_composition,
  product_dimensions,
  pad_length,
  front_pack_content,
  anion_strip_notes,
  brand_message,
  storage_instruction,
  features,
  usage_instructions,
  disposal_instructions,
  safety_information,
  manufacturer_details,
  marketer_details,
  product_contact,
  product_email,
  product_website,
  country_of_origin,
  shelf_life,
  meta_title,
  meta_description,
  is_featured,
  is_bestseller,
  status
)
SELECT
  c.id,
  'SheRise 7 Count Organic Sanitary Pads With Anion Strip',
  'sherise-7-count-organic-sanitary-pads',
  'SR-ANION-07',
  'Medium 7-count pack with Regular and XXL pads plus disposable bag.',
  'A compact 7-count SheRise pack for normal and heavy flow routines. Includes 4 Regular pads at 290 mm and 3 XXL pads at 320 mm, with disposable bag.',
  145.00,
  119.00,
  26.00,
  17.93,
  'Total 7 Count - Medium',
  'MEDIUM,HEAVY',
  'Organic Sanitary Pads With Anion Strip; Soft Cotton Top Layer; Breathable Back Sheet',
  '4 Count Regular - 290 mm; 3 Count XXL - 320 mm',
  'Regular 290 mm; XXL 320 mm',
  'SheRise | Release. Renew & Rise | Organic Sanitary Pads With Anion Strip | Total 7 Count | Medium | With Disposable Bag',
  'Packaging mentions anion strip advantages including balance, energy, immunity, metabolism, circulation, mood, stress and sleep support. Verify these claims before using them as medical or wellness claims on the website.',
  'With every cycle, She Releases, Renews, and Rises. Inspired by the natural rhythm of the body, SheRise celebrates strength, balance, and renewal. RELEASE - RENEW - RISE. Menstruation is a gentle reminder of your inner strength, the importance of self-care and the beauty of being a woman.',
  'Store in a clean, dry and sealed place.',
  JSON_ARRAY('Soft Cotton Top Layer', 'Super Absorbent Core', 'Breathable Back Sheet', 'Leak Guard Protection', 'Dry & Comfortable Feel', 'Individually Wrapped for Hygiene'),
  JSON_ARRAY('Peel off back paper.', 'Place on underwear and press.', 'Remove wing strips.', 'Fold wings and secure.'),
  JSON_ARRAY('Roll the used pad.', 'Place it into the disposable bag.', 'Do not flush it.', 'Dispose of it in a dustbin.'),
  'For external use only. Stop use if persistent irritation occurs and consult a qualified healthcare professional if symptoms continue.',
  'Kallisto Hygiene Pvt Ltd',
  'S3 Enterprises, Prabhadevi, Mumbai 400 013.',
  '95942 41666',
  'hellosherise.in@gmail.com',
  'hellosherise.com',
  'India',
  '36 Months from DOM',
  'SheRise 7 Count Organic Sanitary Pads With Anion Strip',
  'Shop SheRise 7 Count Medium organic sanitary pads with anion strip, disposable bag, Regular and XXL sizes.',
  1,
  0,
  'ACTIVE'
FROM product_categories c
WHERE c.slug = 'sanitary-pads'
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  name = VALUES(name),
  short_description = VALUES(short_description),
  description = VALUES(description),
  mrp = VALUES(mrp),
  selling_price = VALUES(selling_price),
  discount_amount = VALUES(discount_amount),
  discount_percent = VALUES(discount_percent),
  pack_quantity = VALUES(pack_quantity),
  flow_type = VALUES(flow_type),
  material_composition = VALUES(material_composition),
  product_dimensions = VALUES(product_dimensions),
  pad_length = VALUES(pad_length),
  front_pack_content = VALUES(front_pack_content),
  anion_strip_notes = VALUES(anion_strip_notes),
  brand_message = VALUES(brand_message),
  storage_instruction = VALUES(storage_instruction),
  features = VALUES(features),
  usage_instructions = VALUES(usage_instructions),
  disposal_instructions = VALUES(disposal_instructions),
  safety_information = VALUES(safety_information),
  manufacturer_details = VALUES(manufacturer_details),
  marketer_details = VALUES(marketer_details),
  product_contact = VALUES(product_contact),
  product_email = VALUES(product_email),
  product_website = VALUES(product_website),
  shelf_life = VALUES(shelf_life),
  meta_title = VALUES(meta_title),
  meta_description = VALUES(meta_description),
  is_featured = VALUES(is_featured),
  status = VALUES(status);

INSERT INTO product_variants (
  product_id,
  sku,
  size,
  pack_quantity,
  variant_name,
  mrp,
  selling_price,
  discount_amount,
  discount_percent,
  low_stock_threshold,
  status,
  sort_order
)
SELECT
  p.id,
  'SR-ANION-07-MEDIUM',
  'Regular + XXL',
  '7 Count',
  '7 Count Medium',
  145.00,
  119.00,
  26.00,
  17.93,
  5,
  'ACTIVE',
  10
FROM products p
WHERE p.sku = 'SR-ANION-07'
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  size = VALUES(size),
  pack_quantity = VALUES(pack_quantity),
  variant_name = VALUES(variant_name),
  mrp = VALUES(mrp),
  selling_price = VALUES(selling_price),
  discount_amount = VALUES(discount_amount),
  discount_percent = VALUES(discount_percent),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO inventory (product_id, variant_id, inventory_level, current_stock, reserved_stock, low_stock_threshold)
SELECT p.id, v.id, 'VARIANT', 15, 0, 5
FROM products p
JOIN product_variants v ON v.product_id = p.id AND v.sku = 'SR-ANION-07-MEDIUM'
WHERE p.sku = 'SR-ANION-07'
ON DUPLICATE KEY UPDATE
  current_stock = VALUES(current_stock),
  reserved_stock = VALUES(reserved_stock),
  low_stock_threshold = VALUES(low_stock_threshold);

INSERT INTO product_images (product_id, image_type, image_url, alt_text, sort_order, is_featured)
SELECT
  p.id,
  'FEATURED',
  '/uploads/products/sherise-7-count-organic-sanitary-pads.jpg',
  'SheRise 7 Count Organic Sanitary Pads With Anion Strip',
  10,
  1
FROM products p
WHERE p.sku = 'SR-ANION-07'
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
      AND pi.image_url = '/uploads/products/sherise-7-count-organic-sanitary-pads.jpg'
  );

INSERT INTO blog_categories (name, slug, description, status, sort_order)
VALUES
  ('Cycle Basics', 'cycle-basics', 'Educational content about menstrual cycle basics.', 'ACTIVE', 10),
  ('Period Guide', 'period-guide', 'Guides for choosing and using period care products.', 'ACTIVE', 20),
  ('Everyday Care', 'everyday-care', 'Practical period care tips for daily routines.', 'ACTIVE', 30)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO shipping_settings (
  coverage_type,
  shipping_charge,
  free_shipping_threshold,
  cod_enabled,
  cod_charge,
  expected_delivery_min_days,
  expected_delivery_max_days,
  is_active
)
SELECT 'ALL_INDIA', 0.00, 499.00, 1, 0.00, 3, 7, 1
WHERE NOT EXISTS (SELECT 1 FROM shipping_settings WHERE is_active = 1);

INSERT INTO business_settings (
  business_name,
  support_mobile,
  whatsapp_number,
  support_email,
  business_email,
  working_hours,
  is_active
)
SELECT
  'SheRise',
  NULL,
  NULL,
  'support@sherise.example',
  'hello@sherise.example',
  'Monday to Saturday, 10:00 AM to 6:00 PM',
  1
WHERE NOT EXISTS (SELECT 1 FROM business_settings WHERE is_active = 1);

INSERT INTO social_links (platform, label, url, status, sort_order)
VALUES
  ('INSTAGRAM', 'Instagram', 'https://instagram.com/', 'INACTIVE', 10),
  ('FACEBOOK', 'Facebook', 'https://facebook.com/', 'INACTIVE', 20),
  ('LINKEDIN', 'LinkedIn', 'https://linkedin.com/', 'INACTIVE', 30),
  ('YOUTUBE', 'YouTube', 'https://youtube.com/', 'INACTIVE', 40)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  url = VALUES(url),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO homepage_sections (section_key, section_type, title, subtitle, body, status, sort_order)
VALUES
  ('hero', 'HERO', 'SheRise', 'Period care made for everyday comfort.', NULL, 'ACTIVE', 10),
  ('featured_products', 'FEATURED_PRODUCTS', 'Featured Products', NULL, NULL, 'ACTIVE', 20),
  ('bestseller_products', 'BESTSELLER_PRODUCTS', 'Bestsellers', NULL, NULL, 'ACTIVE', 30),
  ('why_sherise', 'WHY_SHERISE', 'Why SheRise', NULL, NULL, 'ACTIVE', 40)
ON DUPLICATE KEY UPDATE
  section_type = VALUES(section_type),
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  body = VALUES(body),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT INTO cms_pages (page_key, title, slug, content, status)
VALUES
  ('about_us', 'About Us', 'about', NULL, 'DRAFT'),
  ('sherise_story', 'SheRise Story', 'why-sherise', NULL, 'DRAFT'),
  ('period_guide', 'Period Guide', 'period-guide', NULL, 'DRAFT'),
  ('contact_information', 'Contact Information', 'contact', NULL, 'DRAFT'),
  ('footer_information', 'Footer Information', 'footer-information', NULL, 'DRAFT')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  slug = VALUES(slug);
