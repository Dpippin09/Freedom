-- Initial stores seed data
-- This will populate the stores table with popular fashion retailers

INSERT INTO stores (name, website_url, logo_url, description, rating, total_reviews, shipping_info, return_policy, status) VALUES
('ASOS', 'https://www.asos.com', 'https://images.asos-media.com/navigation/asos-logo', 'Global online fashion and cosmetic retailer', 4.2, 15420, '{"free_shipping_threshold": 35, "express_available": true, "international": true}', '30-day return policy', 'active'),

('Zara', 'https://www.zara.com', 'https://static.zara.net/photos///contents/mkt/spots/aw22-north-woman-new/subhome-xmedia-23//w/1920/IMAGE-landscape-fill-90a5e454-8b6f-4db3-97e9-e62b78b2a6f2-default_0.jpg', 'Spanish multinational clothing retailer', 4.0, 8930, '{"free_shipping_threshold": 50, "express_available": true, "international": true}', '30-day return policy', 'active'),

('H&M', 'https://www2.hm.com', 'https://upload.wikimedia.org/wikipedia/commons/5/53/H%26M-Logo.svg', 'Swedish multinational clothing retailer', 3.8, 12650, '{"free_shipping_threshold": 40, "express_available": true, "international": true}', '30-day return policy', 'active'),

('Nike', 'https://www.nike.com', 'https://logoeps.com/wp-content/uploads/2013/03/nike-vector-logo.png', 'American multinational corporation engaged in design and manufacturing of footwear and apparel', 4.5, 25890, '{"free_shipping_threshold": 50, "express_available": true, "international": true}', '60-day return policy', 'active'),

('Adidas', 'https://www.adidas.com', 'https://logoeps.com/wp-content/uploads/2013/03/adidas-vector-logo.png', 'German multinational corporation that designs and manufactures shoes, clothing and accessories', 4.3, 19760, '{"free_shipping_threshold": 50, "express_available": true, "international": true}', '30-day return policy', 'active'),

('Uniqlo', 'https://www.uniqlo.com', 'https://upload.wikimedia.org/wikipedia/commons/9/92/UNIQLO_logo.svg', 'Japanese casual wear designer and retailer', 4.1, 7820, '{"free_shipping_threshold": 75, "express_available": false, "international": false}', '30-day return policy', 'active'),

('Forever 21', 'https://www.forever21.com', 'https://upload.wikimedia.org/wikipedia/commons/4/44/Forever_21_logo.svg', 'American fast fashion retailer', 3.5, 6540, '{"free_shipping_threshold": 50, "express_available": true, "international": true}', '30-day return policy', 'active'),

('Mango', 'https://shop.mango.com', 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Mango_Logo.svg', 'Spanish clothing design and manufacturing company', 4.0, 5430, '{"free_shipping_threshold": 50, "express_available": true, "international": true}', '30-day return policy', 'active'),

('Urban Outfitters', 'https://www.urbanoutfitters.com', 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Urban_Outfitters_logo.svg', 'American multinational clothing retailer', 3.9, 4210, '{"free_shipping_threshold": 50, "express_available": true, "international": true}', '30-day return policy', 'active'),

('Nordstrom', 'https://www.nordstrom.com', 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Nordstrom_Logo.png', 'American luxury department store chain', 4.7, 18950, '{"free_shipping_threshold": 0, "express_available": true, "international": false}', '365-day return policy', 'active')

ON CONFLICT (name) DO NOTHING;
