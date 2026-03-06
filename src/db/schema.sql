-- ============================================================
-- Rayeva AI Database Schema
-- ============================================================

-- Products table (source data for Module 1)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product categories (Module 1 output)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  primary_category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  seo_tags TEXT[] NOT NULL DEFAULT '{}',
  sustainability_filters TEXT[] NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(4,3),
  raw_ai_output JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- B2B clients (source data for Module 2)
CREATE TABLE IF NOT EXISTS b2b_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  contact_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- B2B proposals (Module 2 output)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES b2b_clients(id) ON DELETE SET NULL,
  company_name VARCHAR(255) NOT NULL,
  budget NUMERIC(12,2) NOT NULL,
  proposal_data JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI prompt + response audit log (all modules)
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  reference_id UUID,
  prompt TEXT NOT NULL,
  raw_response TEXT NOT NULL,
  parsed_output JSONB,
  model VARCHAR(100),
  prompt_tokens INT,
  completion_tokens INT,
  duration_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_module ON ai_logs(module);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);

-- Seed: sample products
INSERT INTO products (name, description) VALUES
  ('Bamboo Cutlery Set', 'A reusable bamboo cutlery set including fork, spoon, knife, and chopsticks. Comes in a cotton carry pouch. No plastic components.'),
  ('Organic Cotton Tote Bag', 'Large capacity tote bag made from 100% GOTS-certified organic cotton. Naturally dyed with plant-based pigments. Machine washable.'),
  ('Recycled Glass Water Bottle', '750ml water bottle made from 80% post-consumer recycled glass. BPA-free silicone sleeve. Dishwasher safe.')
ON CONFLICT DO NOTHING;

-- Seed: sample B2B client
INSERT INTO b2b_clients (company_name, industry, contact_email) VALUES
  ('GreenTech Offices', 'Technology', 'procurement@greentech.com')
ON CONFLICT DO NOTHING;
