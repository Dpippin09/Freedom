-- Sample product prices seed data
-- This links products to stores with pricing information

-- Note: This assumes the products and stores were inserted with the IDs in sequence
-- In a real scenario, you'd query for the actual IDs

INSERT INTO product_prices (product_id, store_id, price, original_price, currency, availability, product_url, sizes_available, colors_available) VALUES

-- Floral Summer Dress (product_id: 1) prices across stores
(1, 1, 45.99, 65.99, 'USD', 'in_stock', 'https://www.asos.com/asos-design/floral-summer-dress/prd/20731913', ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['floral', 'white', 'blue']),
(1, 3, 39.99, 59.99, 'USD', 'in_stock', 'https://www2.hm.com/en_us/productpage.0887638001.html', ARRAY['S', 'M', 'L'], ARRAY['floral']),

-- Black Evening Gown (product_id: 2) prices
(2, 2, 89.99, 129.99, 'USD', 'in_stock', 'https://www.zara.com/us/en/black-evening-gown-p07568144.html', ARRAY['XS', 'S', 'M', 'L'], ARRAY['black']),
(2, 10, 145.00, NULL, 'USD', 'in_stock', 'https://www.nordstrom.com/s/black-evening-gown/6234567', ARRAY['XS', 'S', 'M', 'L'], ARRAY['black']),

-- Basic White T-Shirt (product_id: 3) prices
(3, 3, 9.99, NULL, 'USD', 'in_stock', 'https://www2.hm.com/en_us/productpage.0685816001.html', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['white']),
(3, 1, 12.99, NULL, 'USD', 'in_stock', 'https://www.asos.com/asos-design/basic-white-tshirt/prd/12345678', ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['white']),
(3, 6, 14.90, NULL, 'USD', 'in_stock', 'https://www.uniqlo.com/us/en/products/E421520', ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['white']),

-- Striped Long Sleeve Top (product_id: 4) prices
(4, 6, 24.90, NULL, 'USD', 'in_stock', 'https://www.uniqlo.com/us/en/products/E421520', ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['navy', 'white']),
(4, 2, 29.99, 39.99, 'USD', 'in_stock', 'https://www.zara.com/us/en/striped-long-sleeve-top-p01234567.html', ARRAY['S', 'M', 'L'], ARRAY['navy']),

-- High-Waisted Jeans (product_id: 5) prices
(5, 1, 55.99, 75.99, 'USD', 'in_stock', 'https://www.asos.com/asos-design/high-waisted-jeans/prd/13794031', ARRAY['24', '25', '26', '27', '28', '29', '30'], ARRAY['dark blue', 'black']),
(5, 2, 49.99, NULL, 'USD', 'in_stock', 'https://www.zara.com/us/en/high-waisted-jeans-p01234567.html', ARRAY['25', '26', '27', '28', '29'], ARRAY['dark blue']),
(5, 10, 78.00, NULL, 'USD', 'in_stock', 'https://www.nordstrom.com/s/high-waisted-jeans/6234567', ARRAY['24', '25', '26', '27', '28', '29', '30', '31'], ARRAY['dark blue', 'black']),

-- Cargo Pants (product_id: 6) prices
(6, 9, 68.00, NULL, 'USD', 'in_stock', 'https://www.urbanoutfitters.com/shop/cargo-pants', ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['khaki', 'black', 'olive']),
(6, 1, 42.99, 59.99, 'USD', 'in_stock', 'https://www.asos.com/asos-design/cargo-pants/prd/61234567', ARRAY['S', 'M', 'L', 'XL'], ARRAY['khaki', 'black']),

-- Air Max Sneakers (product_id: 7) prices
(7, 4, 120.00, NULL, 'USD', 'in_stock', 'https://www.nike.com/t/air-max-sneakers/99486859', ARRAY['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'], ARRAY['white', 'black', 'red']),
(7, 10, 120.00, NULL, 'USD', 'in_stock', 'https://www.nordstrom.com/s/nike-air-max/6234567', ARRAY['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'], ARRAY['white', 'black']),
(7, 1, 115.99, 120.00, 'USD', 'in_stock', 'https://www.asos.com/nike/air-max-sneakers/prd/99486859', ARRAY['6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'], ARRAY['white', 'red']),

-- Stan Smith Shoes (product_id: 8) prices
(8, 5, 80.00, NULL, 'USD', 'in_stock', 'https://www.adidas.com/us/stan-smith-shoes/M20324.html', ARRAY['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'], ARRAY['white', 'green']),
(8, 1, 75.99, NULL, 'USD', 'in_stock', 'https://www.asos.com/adidas/stan-smith-shoes/prd/M20324', ARRAY['6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'], ARRAY['white']),
(8, 10, 80.00, NULL, 'USD', 'in_stock', 'https://www.nordstrom.com/s/adidas-stan-smith/6234567', ARRAY['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'], ARRAY['white', 'green']),

-- Leather Crossbody Bag (product_id: 9) prices
(9, 8, 45.99, NULL, 'USD', 'in_stock', 'https://shop.mango.com/us/women/bags-crossbody-bags/leather-crossbody-bag_33080754.html', ARRAY['One Size'], ARRAY['black', 'brown', 'tan']),
(9, 2, 39.99, 49.99, 'USD', 'in_stock', 'https://www.zara.com/us/en/leather-crossbody-bag-p01234567.html', ARRAY['One Size'], ARRAY['black', 'brown']),
(9, 10, 65.00, NULL, 'USD', 'in_stock', 'https://www.nordstrom.com/s/leather-crossbody-bag/6234567', ARRAY['One Size'], ARRAY['black', 'brown', 'tan']),

-- Gold Chain Necklace (product_id: 10) prices
(10, 9, 24.00, NULL, 'USD', 'in_stock', 'https://www.urbanoutfitters.com/shop/gold-chain-necklace', ARRAY['One Size'], ARRAY['gold']),
(10, 1, 19.99, NULL, 'USD', 'in_stock', 'https://www.asos.com/asos-design/gold-chain-necklace/prd/58923456', ARRAY['One Size'], ARRAY['gold']),

-- Denim Jacket (product_id: 11) prices
(11, 3, 34.99, 49.99, 'USD', 'in_stock', 'https://www2.hm.com/en_us/productpage.0685816001.html', ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['blue', 'black', 'white']),
(11, 1, 45.99, NULL, 'USD', 'in_stock', 'https://www.asos.com/asos-design/denim-jacket/prd/12345678', ARRAY['S', 'M', 'L', 'XL'], ARRAY['blue', 'black']),
(11, 6, 39.90, NULL, 'USD', 'in_stock', 'https://www.uniqlo.com/us/en/products/E421520', ARRAY['XS', 'S', 'M', 'L'], ARRAY['blue']),

-- Wool Coat (product_id: 12) prices
(12, 2, 149.99, 199.99, 'USD', 'in_stock', 'https://www.zara.com/us/en/wool-coat-p02753144.html', ARRAY['XS', 'S', 'M', 'L'], ARRAY['camel', 'black', 'navy']),
(12, 10, 225.00, NULL, 'USD', 'in_stock', 'https://www.nordstrom.com/s/wool-coat/6234567', ARRAY['XS', 'S', 'M', 'L'], ARRAY['camel', 'black']),
(12, 8, 129.99, 159.99, 'USD', 'in_stock', 'https://shop.mango.com/us/women/coats-coats/wool-coat_12345678.html', ARRAY['S', 'M', 'L'], ARRAY['camel'])

ON CONFLICT (product_id, store_id) DO NOTHING;
