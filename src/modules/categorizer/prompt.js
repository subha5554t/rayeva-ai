/**
 * Module 1 — AI Auto-Category & Tag Generator
 * Prompt builder (pure functions, no side effects)
 */

const PRIMARY_CATEGORIES = [
  'Home & Living',
  'Food & Beverage',
  'Personal Care & Beauty',
  'Office & Stationery',
  'Fashion & Accessories',
  'Kids & Baby',
  'Outdoor & Garden',
  'Health & Wellness',
];

const SUSTAINABILITY_FILTERS = [
  'plastic-free',
  'compostable',
  'vegan',
  'recycled-materials',
  'biodegradable',
  'zero-waste',
  'organic',
  'fair-trade',
  'carbon-neutral',
  'locally-sourced',
  'upcycled',
  'cruelty-free',
];

/**
 * Build the system prompt (gives the AI its persona + rules).
 */
function buildSystemPrompt() {
  return `You are an expert sustainable commerce catalog specialist working for Rayeva, 
a platform dedicated to eco-friendly and ethical products. Your job is to analyse 
product information and return precise, SEO-optimised categorisation data.

Rules:
- Always return ONLY valid JSON — no markdown, no code fences, no explanation.
- primary_category MUST be one of the allowed values.
- seo_tags must be lowercase, hyphen-separated, highly searchable, 5–10 items.
- sustainability_filters must only include attributes genuinely supported by the product description.
- confidence_score is a float 0.00–1.00 reflecting how certain you are given the description quality.`;
}

/**
 * Build the user prompt for a specific product.
 * @param {{ name: string, description: string }} product
 */
function buildCategorizerPrompt(product) {
  return `Categorise this product for the Rayeva sustainable commerce platform.

PRODUCT:
Name: ${product.name}
Description: ${product.description}

ALLOWED primary_category values:
${PRIMARY_CATEGORIES.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}

ALLOWED sustainability_filters values (only include those that genuinely apply):
${SUSTAINABILITY_FILTERS.join(', ')}

Return ONLY this JSON structure (no extra text):
{
  "primary_category": "<from allowed list>",
  "sub_category": "<specific sub-category string>",
  "seo_tags": ["tag-one", "tag-two", "..."],
  "sustainability_filters": ["filter-one", "..."],
  "confidence_score": 0.00,
  "reasoning": "<one sentence explaining your categorisation>"
}`;
}

module.exports = { buildSystemPrompt, buildCategorizerPrompt, PRIMARY_CATEGORIES };
