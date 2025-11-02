// Clear existing HAS_FILTER relationships to start fresh
MATCH (p:Product)-[r:HAS_FILTER]->(f:CustomFilter)
DELETE r;

// ===== MEN'S OFFICE WEAR =====

// Assign Oxford Shirts to Dress Shirts (Office Wear)
MATCH (p:Product {name: 'Classic White Oxford Shirt', gender: 'MEN'})
MATCH (f:CustomFilter {name: 'Dress Shirts'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Navy Shirts to Dress Shirts (Office Wear)
MATCH (p:Product {name: 'Slim Fit Navy Blue Shirt', gender: 'MEN'})
MATCH (f:CustomFilter {name: 'Dress Shirts'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Bomber Jackets to Blazers (Office Wear)
MATCH (p:Product {name: 'Leather Bomber Jacket', gender: 'MEN'})
MATCH (f:CustomFilter {name: 'Blazers'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Chinos to Dress Trousers (Office Wear)
MATCH (p:Product {name: 'Slim Fit Chinos', gender: 'MEN'})
MATCH (f:CustomFilter {name: 'Dress Trousers'})
MERGE (p)-[:HAS_FILTER]->(f);

// ===== WOMEN'S OFFICE WEAR =====

// Assign Silk Blouses to Blouses (Office Wear)
MATCH (p:Product {name: 'Silk Blouse', gender: 'WOMEN'})
MATCH (f:CustomFilter {name: 'Blouses'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Evening Dresses to Blouses (Office Wear - closest match)
MATCH (p:Product {name: 'Elegant Black Evening Dress', gender: 'WOMEN'})
MATCH (f:CustomFilter {name: 'Blouses'})
MERGE (p)-[:HAS_FILTER]->(f);

// ===== WOMEN'S CASUAL WEAR =====

// Assign Floral Dresses to Casual Tops
MATCH (p:Product {name: 'Floral Summer Dress', gender: 'WOMEN'})
MATCH (f:CustomFilter {name: 'Casual Tops'})
MERGE (p)-[:HAS_FILTER]->(f);

// ===== UNISEX CASUAL WEAR =====

// Assign Premium T-Shirts to T-Shirts
MATCH (p:Product {name: 'Premium Cotton T-Shirt', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'T-Shirts'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Designer Polo to Casual Shirts
MATCH (p:Product {name: 'Designer Polo Shirt', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'Casual Shirts'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign 'asdf' product to T-Shirts
MATCH (p:Product {name: 'asdf', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'T-Shirts'})
MERGE (p)-[:HAS_FILTER]->(f);

// ===== FOOTWEAR =====

// Assign White Sneakers to Casual Shoes
MATCH (p:Product {name: 'Classic White Sneakers', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'Casual Shoes'})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Running Shoes to Sports Shoes
MATCH (p:Product {name: 'Running Shoes Pro', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'Sports Shoes'})
MERGE (p)-[:HAS_FILTER]->(f);

// ===== PREMIUM ITEMS =====

// Assign Louis Vuitton Bag to Premium Office Wares
MATCH (p:Product {name: 'Louis Vuitton High End Vegan Bags Crossbody Bag Lv Vegan Bag Louis Vuitton Vegan Leather Large', gender: 'WOMEN'})
MATCH (f:CustomFilter {id: 'filter-1761901965824-q86jfjp'})  // Premium Office Wares
MERGE (p)-[:HAS_FILTER]->(f);

// ===== ACCESSORIES (Assign to Level 1 categories) =====

// Assign Leather Belts to Office Wear (Level 1)
MATCH (p:Product {name: 'Leather Belt Classic', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'Office Wear', level: 1})
MERGE (p)-[:HAS_FILTER]->(f);

// Assign Varsity Jacket to Casual Wear (Level 1)
MATCH (p:Product {name: 'Stylish Brown Varsity Jacket', gender: 'UNISEX'})
MATCH (f:CustomFilter {name: 'Casual Wear', level: 1})
MERGE (p)-[:HAS_FILTER]->(f);

// Return summary of assignments
MATCH (p:Product)-[:HAS_FILTER]->(f:CustomFilter)
RETURN f.name as filter, count(p) as productCount
ORDER BY f.level, f.name;
