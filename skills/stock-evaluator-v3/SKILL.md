---
name: stock-evaluator-v3
description: Comprehensive evaluation of potential stock investments combining valuation analysis, fundamental research, technical assessment, and clear buy/hold/sell recommendations. Use when the user asks about buying a stock, evaluating investment opportunities, analyzing watchlist candidates, or requests stock recommendations. Provides specific entry prices, position sizing, and conviction ratings.
---

# Stock Evaluator (Enhanced)

## ⚠️ CRITICAL: MANDATORY DELIVERABLES CHECKLIST
Every analysis MUST include ALL of these:
- ☐ **Technical Analysis** (price action, indicators, key levels, Ichimoku Cloud)
- ☐ **Fundamental Analysis** (business, financials, competitive position)
- ☐ **Advanced Financial Metrics** (F-Score, Z-Score, M-Score, Max Drawdown, Value Trap Score)
- ☐ **Investor Persona Scores** (8 legendary investor frameworks)
- ☐ **Valuation Assessment** (multiple methods with margin of safety)
- ☐ **Bull vs. Bear Case** (both sides with balance assessment)
- ☐ **Clear Recommendation** (BUY / HOLD / SELL with conviction rating)
- ☐ **Alternative Candidates** (if SELL: provide 3-5 better alternatives)
- ☐ **Enhanced Quant-Style Dashboard** (React dashboard with 60+ metrics, Ichimoku, investor personas, TOP NEWS, and key notes)

**If you cannot complete any item, STOP and ask for clarification.**

---

## ⚠️ CRITICAL: DATA INTEGRITY RULES

### ZERO FABRICATION POLICY
**NEVER fabricate, estimate, or hallucinate ANY numeric data point.** Every metric in the dashboard MUST come from:
1. A web search result with a cited source
2. Company filings (10-K, 10-Q, earnings reports)
3. Official financial data providers

**If data cannot be found → Use "N/A" or "--"**

### MANDATORY WEB SEARCHES (minimum per analysis)

You MUST perform these searches before populating the dashboard:

| Search # | Query Template | Data Retrieved |
|----------|---------------|----------------|
| 1 | "[TICKER] stock price market cap P/E ratio" | Price, Market Cap, P/E |
| 2 | "[TICKER] ROE ROA profit margin 2024 annual report" | Financial ratios |
| 3 | "[TICKER] revenue growth earnings growth FY2024" | Growth rates (REPORTED) |
| 4 | "[TICKER] Piotroski F-Score" | F-Score (or calculate) |
| 5 | "[TICKER] insider trading SEC Form 4 2025" | Insider buys/sells |
| 6 | "[TICKER] short interest percentage float" | Short interest |
| 7 | "[TICKER] RSI MACD 50-day 200-day moving average beta volatility" | Technical indicators |
| 8 | "[TICKER] analyst price target consensus" | Analyst targets |

### DATA SOURCE HIERARCHY

Use sources in this priority order:
1. **Official company filings** (SEC EDGAR, company investor relations)
2. **Exchange data** (NYSE, NASDAQ, LSE official)
3. **Verified financial data** (Yahoo Finance, Google Finance, MarketWatch)
4. **SEC Form 4** (for insider trading ONLY)
5. **FINRA/exchange** (for short interest ONLY)

### PROHIBITED
- Using training knowledge for ANY specific current numbers
- Analyst reports (per user preference)
- Estimates without sourcing
- "Common knowledge" assumptions

### HANDLING UNAVAILABLE DATA

| Situation | Action | Display |
|-----------|--------|---------|
| Metric not found after searching | Display "N/A" | `value: "N/A"` |
| Data is outdated (>1 year old) | Note the date | `value: "15.2% (2023)"` |
| Conflicting sources | Use most authoritative | Note in analysis |
| Calculated metric (F-Score) | Show calculation | Explain in text |
| Insider data unavailable | Show "N/A" | `insBuys: "N/A"` |

**CRITICAL: Zero means "zero occurred" - NEVER substitute zeros for missing data.**

---

## STANDARDIZED METRIC LABELS

See [references/metric-labels.md](references/metric-labels.md) for the full list of canonical metric names (valuation, growth, profitability, financial-health, technical, advanced) to use consistently across analyses.

---

## STANDARDIZED BENCHMARKS (Single Source of Truth)

See [references/benchmarks.md](references/benchmarks.md) for the canonical benchmark thresholds (P/E, P/FCF, EV/EBITDA, ROIC, F-Score, Z-Score, M-Score, Max Drawdown, Value Trap Score) referenced by every evaluation.

---

## Overview

This skill provides institutional-grade evaluation of potential stock investments. Unlike portfolio analysis which reviews existing positions, this skill evaluates stocks you're **considering buying** or **deciding whether to purchase**.

The evaluation answers:
- **Should I buy this stock?**
- **At what price should I enter?**
- **How much should I allocate?**
- **What's my upside and downside?**
- **When should I sell?**

### Default Currency: € (Euro)
All monetary values in the dashboard should be displayed in **Euro (€)** as the default currency:
- Price: €42.13
- Market Cap: €78.3B
- Analyst Target: €56.45
- Entry/Stop/Target prices: €38, €35, €56
- EPS values: €1.39, €1.91

### IMPORTANT: Use REPORTED Growth Rates
For the dashboard metrics **"Rev Growth"** and **"Earn Growth"**:
- **USE REPORTED GROWTH** - not underlying, adjusted, or organic figures
- Reported figures reflect actual GAAP/IFRS numbers including FX, acquisitions, disposals
- This provides a more accurate picture of what investors actually received
- Example: If underlying growth is 7% but reported is 2.2%, use **2.2%**
- Same for earnings: Use reported EPS growth, not adjusted EPS growth

## Core Purpose

**Stock Evaluator** is for:
- ✅ Evaluating potential investments BEFORE buying
- ✅ Analyzing watchlist candidates
- ✅ Getting buy/hold/sell recommendations with specific prices
- ✅ Comparing multiple investment opportunities
- ✅ Finding better alternatives to current consideration

**NOT for:**
- ❌ Reviewing existing portfolio positions (use Portfolio Analyst skill)
- ❌ General stock market questions
- ❌ Stock screening or discovery from scratch
- ❌ Options, derivatives, or crypto analysis

## Evaluation Framework

### Five Pillars of Stock Evaluation

**1. Valuation Assessment**
- Is the stock undervalued, fairly valued, or overvalued?
- Multiple valuation methods (DCF, relative, Peter Lynch, asset-based)
- Margin of safety requirement (15-30%)
- Fair value estimate with confidence range

**2. Quality Analysis**
- Business model strength and competitive moat
- Financial health and trends (5-10 year view)
- Management quality and capital allocation
- Industry position and competitive advantages

**3. Timing Assessment**
- Technical setup and entry points
- Near-term catalysts and events
- Market sentiment and positioning
- Optimal entry price range

**4. Position Sizing**
- Allocation recommendation (% of portfolio)
- Based on conviction, risk, and diversification
- Maximum allocation limits
- Risk-adjusted sizing

**5. Conviction Rating**
- **Strong Buy**: High conviction, clear undervaluation, low risk
- **Buy**: Good opportunity, reasonable valuation, moderate risk
- **Hold**: Fairly valued, no compelling reason to buy now
- **Avoid**: Overvalued, significant risks, or better alternatives exist

---

## Value Trap Indicator

See [references/value-trap-indicator.md](references/value-trap-indicator.md) for the scoring framework (10 red flags on a 0–100 scale, color coding, and interpretation).

---

## Investor Persona Scores

Score each stock against 8 famous investor philosophies (0–10): Buffett, Graham, Lynch, Greenblatt, Piotroski, Druckenmiller, Klarman, Fisher. See [references/investor-personas.md](references/investor-personas.md) for the full scoring criteria and required deliverables.

---

## Enhanced Technical Analysis

### Ichimoku Cloud Analysis

**Components to Calculate:**
- **Tenkan-sen (Conversion Line):** (9-period high + 9-period low) / 2
- **Kijun-sen (Base Line):** (26-period high + 26-period low) / 2
- **Senkou Span A:** (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
- **Senkou Span B:** (52-period high + 52-period low) / 2, plotted 26 periods ahead
- **Chikou Span (Lagging Span):** Current close plotted 26 periods back

**Cloud (Kumo):** Area between Senkou Span A and B

**Signals to Identify and Display:**
- **TK Bullish Cross:** Tenkan-sen crosses above Kijun-sen (bullish) - mark with ◆
- **TK Bearish Cross:** Tenkan-sen crosses below Kijun-sen (bearish) - mark with ◆
- **Kumo Twist Bullish:** Cloud changes from red to green - mark with ◆
- **Kumo Twist Bearish:** Cloud changes from green to red - mark with ◆
- **Price vs Cloud:** Above cloud (bullish), Below cloud (bearish), In cloud (neutral)

### Dual PEG Ratios
- **PEG (1Y):** P/E ÷ 1-Year Forward Growth Estimate
- **PEG (5Y):** P/E ÷ 5-Year Historical Growth Rate
- Both provide different perspectives on growth valuation

### FCF Margin
- **Formula:** Free Cash Flow / Revenue × 100
- **Benchmark:** >15% is excellent, >10% is good
- Shows cash generation efficiency relative to sales

### News Sentiment & Short Interest
- **News Sentiment:** -1 to +1 scale based on recent article sentiment
- **Short Interest:** % of float sold short (>10% = high, <5% = low)
- Both indicate market sentiment and potential squeeze/reversal

---

## Fundamental Analysis Process

Five-step process: Business Understanding → Competitive Position → Management Quality → Financial Health Deep Dive → Growth Drivers. See [references/fundamental-analysis-process.md](references/fundamental-analysis-process.md) for the full process, required outputs per step, and evaluation criteria.

## Valuation Assessment

Use **multiple valuation methods** and synthesize into a fair-value estimate with explicit margin of safety. See [VALUATION-GUIDE.md](VALUATION-GUIDE.md) for the full method set (DCF, multiples, reverse-DCF, EPV, residual-income, graham-number, sum-of-parts) and the triangulation workflow.

---

## Technical Analysis (Entry Timing)

Focus on identifying optimal entry points, not full technical analysis.

### Key Technical Elements

**1. Price Action (Last 30-60 Days)**
- Current trend: Uptrend / Downtrend / Range-bound
- Recent price pattern
- Volume trends (increasing on rallies?)
- Momentum assessment

**2. Key Levels**
- **Support levels**: Where buying interest emerges
  - Primary support: €X.XX
  - Secondary support: €X.XX
- **Resistance levels**: Where selling pressure increases
  - Primary resistance: €X.XX
  - Secondary resistance: €X.XX

**3. Technical Indicators**
- **RSI** (Relative Strength Index):
  - >70 = Overbought (may pullback)
  - <30 = Oversold (potential bounce)
  - 40-60 = Neutral
- **MACD** (Moving Average Convergence Divergence):
  - Bullish crossover / Bearish crossover / Neutral
  - Momentum accelerating or decelerating?
- **Moving Averages**:
  - 50-day MA: €X.XX (price above/below?)
  - 200-day MA: €X.XX (trend indicator)

**4. Entry Assessment**
- **Technical Setup**: Bullish / Neutral / Bearish
- **Optimal Entry**: Wait for pullback to support / Buy at market / Wait for breakout
- **Entry Price Range**: €X.XX - €X.XX
- **Avoid Above**: €X.XX (poor risk/reward)

---

## Bull vs. Bear Case Analysis

**MANDATORY**: Every analysis must present both sides fairly.

### Bull Case (Optimistic Scenario)
**Potential Upside: +X% to €X.XX**

1. [Key bull argument 1 with specific evidence]
2. [Key bull argument 2 with specific evidence]
3. [Key bull argument 3 with specific evidence]

**For this to play out:**
- [Required condition 1]
- [Required condition 2]

### Bear Case (Pessimistic Scenario)
**Potential Downside: -X% to €X.XX**

1. [Key bear argument 1 with specific evidence]
2. [Key bear argument 2 with specific evidence]
3. [Key bear argument 3 with specific evidence]

**This happens if:**
- [Risk trigger 1]
- [Risk trigger 2]

### Balance Assessment
**Which case is more probable: [Bull / Bear / Balanced]**

[Explanation of why one case is more likely, considering:
- Quality of evidence for each side
- Historical precedent
- Management track record
- Industry dynamics
- Current valuation]

---

## Investment Recommendation Structure

### BUY Recommendation Criteria
- Fair value >15% above current price (adequate margin of safety)
- Strong or improving fundamentals
- Reasonable or bullish technical setup
- Identifiable catalysts
- Acceptable risk level
- Conviction: Strong Buy or Buy

### HOLD Recommendation Criteria
- Fair value within ±15% of current price
- Stable fundamentals, no compelling catalyst
- Better opportunities may exist elsewhere
- Wait for better entry price
- Conviction: Hold

### SELL/AVOID Recommendation Criteria
- Fair value <-15% below current price (overvalued)
- Deteriorating fundamentals
- Significant risks
- Better alternatives available
- Must provide 3-5 alternative candidates
- Conviction: Avoid

---

## Position Sizing Framework

**Allocation recommendation based on:**

**Conviction + Risk = Position Size**

**Strong Buy (High Conviction, Low Risk):**
- Position size: 5-8% of portfolio
- Maximum: 10%

**Buy (Moderate Conviction, Moderate Risk):**
- Position size: 3-5% of portfolio
- Maximum: 7%

**Speculative/High Risk:**
- Position size: 1-3% of portfolio
- Maximum: 5%

**Considerations:**
- Diversification needs (avoid sector concentration)
- Correlation with existing holdings
- Overall portfolio risk
- Liquidity requirements
- User's risk tolerance (from project context)

---

## Entry and Exit Strategy

### Entry Strategy

**NO scale-in strategies** - recommend single entry approach:

**If BUY:**
- **Ideal Entry Price: €X.XX - €X.XX** (optimal range)
- **Maximum Buy Price: €X.XX** (above this, risk/reward unfavorable)
- **Approach:**
  - "Buy now at market" (if currently at good price)
  - "Wait for pullback to €X.XX support" (if extended)
  - "Buy on break above €X.XX" (if breakout setup)
  - "Don't buy above €X.XX" (if overvalued)

### Exit Strategy

**Price Target (12-month):** €X.XX (+X% upside)
- Conservative: €X.XX
- Base case: €X.XX
- Optimistic: €X.XX

**Stop Loss:** €X.XX (-X% maximum loss)
- Technical stop: Below key support
- Fundamental stop: If thesis breaks

**Sell If (Thesis-Breaking Conditions):**
1. [Specific fundamental deterioration]
2. [Specific competitive threat]
3. [Specific valuation threshold]

**Hold Duration:**
- Expected timeframe: [6-12 months / 1-3 years / 3-5+ years]
- Based on investment type (swing trade vs long-term hold)

---

## Catalyst Identification

Identify specific events that could drive stock performance.

**Near-Term (0-6 months):**
- Upcoming earnings: [Date]
- Product launches: [Event]
- Regulatory decisions: [Expected timing]
- Industry events: [Conference, data release]

**Medium-Term (6-18 months):**
- Market expansion plans
- New product cycles
- Margin expansion initiatives
- Strategic partnerships

**Long-Term (18+ months):**
- Structural industry trends
- Market share gains
- Technological leadership
- Business model evolution

---

## Key Analytical Constraints

**Critical Principles:**

1. **No Press/News for Fundamental Analysis**
   - Use company filings only (10-K, 10-Q, 8-K, proxy)
   - Use earnings call transcripts
   - Do NOT rely on news articles or press releases
   - Exception: News for recent developments, but verify in filings

2. **Magnitude Over Precision**
   - Focus on stocks with good margin of safety (>15%)
   - Don't need perfect forecasts
   - Better to be approximately right than precisely wrong
   - Conservative assumptions better than optimistic

3. **Long-Term View**
   - Analyze 5-10 year trends, not just recent quarters
   - Temporary setbacks vs. structural problems
   - Sustainable competitive advantages matter most
   - Short-term noise vs. long-term signal

4. **Compare Apples to Apples**
   - Benchmark against 3-5 direct competitors
   - Not just broad market indices
   - Industry-specific metrics and norms
   - Adjust for company size and maturity

5. **Intellectual Honesty**
   - Acknowledge limitations and unknowns
   - Present both bull and bear cases fairly
   - Say "I don't know" when appropriate
   - Update views when evidence changes

---

## Output Template

See [references/output-template.md](references/output-template.md) for the full markdown report template with all mandatory sections (deliverables checklist, executive summary, valuation, business analysis, financials, technical, bull/bear, risks, catalysts, recommendation, entry/exit, position sizing, takeaways, research docs, alternatives).

---

## Quant-Style Dashboard Artifact

**MANDATORY** after the text analysis: create a React dashboard artifact. See [references/dashboard-artifact.md](references/dashboard-artifact.md) for the template structure, required data populations (48 metrics, historical prices, forecasts, MACD/RSI, radar chart, bull/bear cases, entry/exit), and styling rules.

---

## Integration with Project Context

### Portfolio Awareness
- Access portfolio data from project knowledge
- Check if stock is already owned (if so, suggest using Portfolio Analyst)
- Assess fit with existing holdings (sector exposure, correlation)
- Consider position sizing in context of current allocations

### Investment Profile
- User's investment timeline, risk tolerance, preferences in project instructions
- Tailor recommendations to user's profile
- Consider tax implications from user's context
- Adjust position sizing based on portfolio size and risk tolerance

### Avoiding Duplication
If stock is already in portfolio:
- Acknowledge: "You already own [SYMBOL]. For analysis of your existing position, use the Portfolio Analyst skill."
- Still provide evaluation if user wants fresh assessment
- Frame as "Should you add more?" rather than initial purchase

---

## When to Use This Skill

**Use Stock Evaluator when:**
- User asks "Should I buy [stock]?"
- User wants evaluation of watchlist candidates
- User requests stock recommendations
- User asks "Is [stock] a good investment?"
- User wants to compare multiple potential investments
- User asks for alternatives to a stock they're considering
- User wants entry price and position sizing guidance
- User requests a "quant-style dashboard" or "stock visualization"

**Do NOT use this skill when:**
- User wants to review existing portfolio positions → Use Portfolio Analyst
- User wants general market commentary → Regular knowledge
- User wants stock screening/discovery → Different workflow
- User asks about options, derivatives, crypto → Out of scope

**Output includes:**
- Comprehensive text analysis (all sections above)
- Quant-style React dashboard artifact (standardized visual format)

---

## Best Practices

See [references/best-practices.md](references/best-practices.md) for the skill-level best practices (research depth, data quality, contrarian framing, risk emphasis, clarity).

---

## Common Patterns to Recognize

See [references/common-patterns.md](references/common-patterns.md) for the taxonomy of setups (value trap, growth-at-reasonable-price, turnaround, compounder, cyclical, special situation) and how each maps to recommendation tilts.

---

## Quality Checks Before Finalizing

See [references/quality-checks.md](references/quality-checks.md) for the pre-submit checklist (data integrity, completeness, accuracy, actionability, and disclosures).

---

## Example Evaluation Structure

[See complete example in EVALUATION-WORKFLOWS.md for detailed walkthrough]

---

## Continuous Improvement

After each evaluation:
- Track recommendation outcomes
- Learn from what worked/didn't work
- Refine valuation assumptions
- Improve pattern recognition
- Update industry knowledge

The goal is to discover genuinely attractive investment opportunities that fit the user's profile with adequate margin of safety and acceptable risk.
