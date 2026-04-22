# Value Trap Indicator (Reference)

## Value Trap Indicator

### What It Is
A Value Trap is when a stock appears undervalued (low P/E, low P/B) but is actually cheap for valid fundamental reasons. The stock keeps declining despite appearing "cheap."

### Value Trap Score Calculation (0-100, LOWER = more genuine, HIGHER = more trap)

**Components to evaluate (ADD points for trap indicators):**

**1. Price Momentum (25 points max)**
- 6-month price change vs market: If underperforming by >20%, ADD 15-25 points
- 12-month price change: Sustained decline = ADD 10-20 points
- If price momentum is POSITIVE: ADD 0 points

**2. Earnings Quality (25 points max)**
- EPS trend (3 years): Declining = ADD 10-25 points
- Revenue trend: Declining = ADD 5-15 points
- Margin trend: Compressing = ADD 5-10 points
- If earnings quality is STRONG: ADD 0 points

**3. Balance Sheet Health (25 points max)**
- Debt levels increasing? ADD 5-15 points
- Cash flow negative or declining? ADD 10-20 points
- Working capital deteriorating? ADD 5-10 points
- If balance sheet is HEALTHY: ADD 0 points

**4. Valuation Context (25 points max)**
- Is low multiple justified by declining fundamentals? ADD 10-25 points
- Compare current fundamentals to when multiple was higher
- If fundamentals justify valuation: ADD 0 points

### Scoring Formula
```
Value Trap Score = Momentum Penalty + Quality Penalty + Balance Sheet Penalty + Valuation Penalty
```
(Score ranges from 0 to 100, where 0 = definitely genuine value, 100 = definite value trap)

### Score Interpretation
- **0-19**: Genuine Value (likely undervalued, fundamentals intact) - GREEN
- **20-39**: Probably Genuine (minor concerns, monitor) - LIGHT GREEN
- **40-59**: Caution Zone (mixed signals, proceed carefully) - YELLOW
- **60-79**: Likely Trap (multiple red flags) - ORANGE
- **80-100**: Strong Trap Signal (avoid) - RED

### Display Format
```
Value Trap: 21 (Genuine)
```
Color coding: green <40, yellow 40-60, red >60

