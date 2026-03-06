/**
 * Module 2 — AI B2B Proposal Generator
 * Prompt builder (pure functions, no side effects)
 */

const INDUSTRY_PERSONAS = {
  'Technology':     'tech companies value modern, minimalist, and functional sustainable products',
  'Hospitality':    'hotels and restaurants need high-volume durable eco-alternatives to single-use',
  'Retail':         'retail clients want brandable, visually appealing sustainable packaging',
  'Healthcare':     'healthcare clients prioritise hygiene-safe, compostable, and vegan-certified items',
  'Education':      'schools and universities focus on bulk, affordable, long-lasting eco stationery and food-ware',
  'Finance':        'finance sector values premium, discreet sustainable gifting and office supplies',
  'Default':        'this client values quality, sustainability, and cost-effectiveness',
};

function getIndustryContext(industry) {
  return INDUSTRY_PERSONAS[industry] || INDUSTRY_PERSONAS['Default'];
}

function buildProposalSystemPrompt() {
  return `You are a senior B2B sustainable procurement consultant at Rayeva.
You create detailed, realistic product procurement proposals for corporate clients.

Rules:
- Return ONLY valid JSON — no markdown, no code fences, no explanation.
- Total cost of all products MUST NOT exceed the client's budget. This is a hard constraint.
- Suggest 3–6 distinct sustainable product lines that fit the client's industry and preferences.
- unit_price must be realistic for sustainable/eco products (typically $2–$150 per unit).
- All quantities and prices must be whole numbers or 2-decimal floats.
- impact_summary values must use logical estimates (not random numbers).
- Every product must include at least 2 sustainability_highlights.`;
}

/**
 * Build the user prompt for a B2B proposal request.
 * @param {object} clientRequest
 */
function buildProposalPrompt(clientRequest) {
  const industryContext = getIndustryContext(clientRequest.industry);
  const budgetFormatted = clientRequest.budget.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return `Create a detailed B2B sustainable procurement proposal for the following client.

CLIENT BRIEF:
Company:     ${clientRequest.company}
Industry:    ${clientRequest.industry}
Budget:      ${budgetFormatted} (HARD LIMIT — do not exceed)
Quantity:    Approximately ${clientRequest.quantity} total units needed
Preferences: ${clientRequest.preferences || 'No specific preferences stated'}
Notes:       ${industryContext}

Return ONLY this exact JSON structure (no extra text):
{
  "proposal_id": "<generate a realistic proposal reference like RVP-2024-XXXX>",
  "client": {
    "company": "${clientRequest.company}",
    "industry": "${clientRequest.industry}"
  },
  "executive_summary": "<2-3 sentence summary of this proposal>",
  "product_mix": [
    {
      "product_name": "<specific product name>",
      "category": "<product category>",
      "quantity": <integer>,
      "unit_price": <float>,
      "total_price": <float — must equal quantity × unit_price>,
      "sustainability_highlights": ["<highlight 1>", "<highlight 2>"],
      "supplier_notes": "<sourcing or MOQ note>"
    }
  ],
  "budget_allocation": {
    "total_budget": ${clientRequest.budget},
    "total_allocated": <sum of all total_price values>,
    "remaining_budget": <total_budget minus total_allocated>,
    "utilisation_percent": <percentage as float>,
    "breakdown_by_category": {
      "<category name>": <amount>
    }
  },
  "impact_summary": {
    "plastic_avoided_kg": <realistic estimate>,
    "carbon_saved_kg": <realistic estimate>,
    "trees_equivalent": <realistic estimate>,
    "local_sourcing_percent": <integer 0-100>,
    "impact_statement": "<compelling 2-3 sentence human-readable impact story for this specific client>"
  },
  "recommended_positioning": "<how Rayeva recommends the client communicates this to their stakeholders>",
  "next_steps": ["<step 1>", "<step 2>", "<step 3>"]
}`;
}

module.exports = { buildProposalSystemPrompt, buildProposalPrompt };
