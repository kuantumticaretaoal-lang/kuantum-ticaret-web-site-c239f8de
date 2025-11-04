-- Add stock status and promotion badges to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_status text DEFAULT 'in_stock',
ADD COLUMN IF NOT EXISTS promotion_badges text[] DEFAULT '{}';

-- Add constraint for stock_status
ALTER TABLE products 
ADD CONSTRAINT products_stock_status_check 
CHECK (stock_status IN ('in_stock', 'limited_stock', 'out_of_stock'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_promotion_badges ON products USING GIN(promotion_badges);