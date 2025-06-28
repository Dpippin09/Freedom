-- Sample products seed data
-- This will populate the products table with sample fashion items

INSERT INTO products (name, description, category, subcategory, brand, gender, colors, sizes, tags, image_url, images, sku, status) VALUES

-- Dresses
('Floral Summer Dress', 'Lightweight floral print dress perfect for summer occasions', 'Dresses', 'Summer Dresses', 'ASOS', 'women', ARRAY['floral', 'white', 'blue'], ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['summer', 'floral', 'casual', 'lightweight'], 'https://images.asos-media.com/products/asos-design-midi-dress-with-short-sleeve-in-vintage-floral/20731913-1-multi', '["https://images.asos-media.com/products/asos-design-midi-dress-with-short-sleeve-in-vintage-floral/20731913-1-multi", "https://images.asos-media.com/products/asos-design-midi-dress-with-short-sleeve-in-vintage-floral/20731913-2-multi"]', 'ASOS-FSD-001', 'active'),

('Black Evening Gown', 'Elegant black evening gown with sequin details', 'Dresses', 'Evening Dresses', 'Zara', 'women', ARRAY['black'], ARRAY['XS', 'S', 'M', 'L'], ARRAY['evening', 'formal', 'sequin', 'elegant'], 'https://static.zara.net/photos///2023/V/0/1/p/7568/144/800/2/w/850/7568144800_6_1_1.jpg', '["https://static.zara.net/photos///2023/V/0/1/p/7568/144/800/2/w/850/7568144800_6_1_1.jpg"]', 'ZARA-BEG-001', 'active'),

-- Tops
('Basic White T-Shirt', 'Essential cotton white t-shirt for everyday wear', 'Tops', 'T-Shirts', 'H&M', 'unisex', ARRAY['white'], ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['basic', 'cotton', 'everyday', 'essential'], 'https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2F5f%2F9f%2F5f9f8a2c8e8c4d0e9f8a2c8e8c4d0e9f8a2c8e.jpg%5D', '["https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2F5f%2F9f%2F5f9f8a2c8e8c4d0e9f8a2c8e8c4d0e9f8a2c8e.jpg%5D"]', 'HM-BWT-001', 'active'),

('Striped Long Sleeve Top', 'Classic striped long sleeve top in navy and white', 'Tops', 'Long Sleeve', 'Uniqlo', 'women', ARRAY['navy', 'white'], ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['striped', 'classic', 'navy', 'long-sleeve'], 'https://uniqlo.scene7.com/is/image/UNIQLO/goods_03_i421520?$detail$', '["https://uniqlo.scene7.com/is/image/UNIQLO/goods_03_i421520?$detail$"]', 'UNI-SLS-001', 'active'),

-- Bottoms
('High-Waisted Jeans', 'Classic high-waisted denim jeans in dark wash', 'Bottoms', 'Jeans', 'ASOS', 'women', ARRAY['dark blue', 'black'], ARRAY['24', '25', '26', '27', '28', '29', '30', '31', '32'], ARRAY['high-waisted', 'denim', 'classic', 'dark-wash'], 'https://images.asos-media.com/products/asos-design-high-rise-farleigh-slim-mom-jeans-in-washed-black/13794031-1-washedblack', '["https://images.asos-media.com/products/asos-design-high-rise-farleigh-slim-mom-jeans-in-washed-black/13794031-1-washedblack"]', 'ASOS-HWJ-001', 'active'),

('Cargo Pants', 'Relaxed fit cargo pants with multiple pockets', 'Bottoms', 'Pants', 'Urban Outfitters', 'unisex', ARRAY['khaki', 'black', 'olive'], ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['cargo', 'relaxed', 'pockets', 'utility'], 'https://images.urbanoutfitters.com/is/image/UrbanOutfitters/61234567_029_b', '["https://images.urbanoutfitters.com/is/image/UrbanOutfitters/61234567_029_b"]', 'UO-CP-001', 'active'),

-- Footwear
('Air Max Sneakers', 'Classic Air Max sneakers with air cushioning', 'Footwear', 'Sneakers', 'Nike', 'unisex', ARRAY['white', 'black', 'red'], ARRAY['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'], ARRAY['air-max', 'sneakers', 'athletic', 'cushioning'], 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/99486859-0ff3-46b4-949b-2d16af2ad421/custom-nike-air-max-90-shoes-by-you.png', '["https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/99486859-0ff3-46b4-949b-2d16af2ad421/custom-nike-air-max-90-shoes-by-you.png"]', 'NIKE-AM-001', 'active'),

('Stan Smith Shoes', 'Iconic white leather tennis shoes with green accents', 'Footwear', 'Sneakers', 'Adidas', 'unisex', ARRAY['white', 'green'], ARRAY['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'], ARRAY['stan-smith', 'tennis', 'leather', 'iconic'], 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/be1b1b2b3b4b5b6b7b8b9/Stan_Smith_Shoes_White_M20324_01_standard.jpg', '["https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/be1b1b2b3b4b5b6b7b8b9/Stan_Smith_Shoes_White_M20324_01_standard.jpg"]', 'ADI-SS-001', 'active'),

-- Accessories
('Leather Crossbody Bag', 'Small leather crossbody bag perfect for everyday use', 'Accessories', 'Bags', 'Mango', 'women', ARRAY['black', 'brown', 'tan'], ARRAY['One Size'], ARRAY['leather', 'crossbody', 'small', 'everyday'], 'https://st.mngbcn.com/rcs/pics/static/T3/fotos/S20/33080754_05_D1.jpg', '["https://st.mngbcn.com/rcs/pics/static/T3/fotos/S20/33080754_05_D1.jpg"]', 'MNG-LCB-001', 'active'),

('Gold Chain Necklace', 'Delicate gold chain necklace with minimal pendant', 'Accessories', 'Jewelry', 'Urban Outfitters', 'women', ARRAY['gold'], ARRAY['One Size'], ARRAY['gold', 'chain', 'delicate', 'minimal'], 'https://images.urbanoutfitters.com/is/image/UrbanOutfitters/58923456_070_b', '["https://images.urbanoutfitters.com/is/image/UrbanOutfitters/58923456_070_b"]', 'UO-GCN-001', 'active'),

-- Outerwear
('Denim Jacket', 'Classic blue denim jacket with button closure', 'Outerwear', 'Jackets', 'H&M', 'unisex', ARRAY['blue', 'black', 'white'], ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['denim', 'classic', 'jacket', 'button'], 'https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2Fdf%2F1a%2Fdf1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p.jpg%5D', '["https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2Fdf%2F1a%2Fdf1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p.jpg%5D"]', 'HM-DJ-001', 'active'),

('Wool Coat', 'Elegant wool coat in camel color for winter', 'Outerwear', 'Coats', 'Zara', 'women', ARRAY['camel', 'black', 'navy'], ARRAY['XS', 'S', 'M', 'L'], ARRAY['wool', 'coat', 'winter', 'elegant'], 'https://static.zara.net/photos///2023/V/0/1/p/2753/144/710/2/w/850/2753144710_6_1_1.jpg', '["https://static.zara.net/photos///2023/V/0/1/p/2753/144/710/2/w/850/2753144710_6_1_1.jpg"]', 'ZARA-WC-001', 'active')

ON CONFLICT (sku) DO NOTHING;
