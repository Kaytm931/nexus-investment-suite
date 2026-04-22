# Quant-Style Dashboard Artifact (Reference)

## Quant-Style Dashboard Artifact

**MANDATORY**: After completing the full text analysis, create a React dashboard artifact using the standardized quant-style template format.

### Dashboard Template Structure

The dashboard uses a specific institutional-grade format with:

**1. Header Section** (Orange background)
- Format: `TICKER - Company Name`

**2. Eight Metric Sections** (2-column grid)

| Left Column | Right Column |
|-------------|--------------|
| Price & Valuation (blue) | Financial Performance (green) |
| Growth Metrics (emerald) | Risk Indicators (red) |
| Liquidity & FCF (cyan) | Insider & Sentiment (purple) |
| Quality Scores (orange) | Moat & Other (gray) |

Each section: 6 metric boxes with values, labels, benchmarks, color coding

**3. Charts Section** (3-column grid)

- **Left**: Linear Price Chart + MACD
  - Price, Intrinsic Value, Market Value lines
  - 5-year historical data
  - MACD indicator below

- **Center**: Radar Chart + 1-Year Forecast
  - 12-point radar (normalized 0-100)
  - Consolidated advice badge
  - 1-year price + 6-month forecast

- **Right**: Log Price Chart + RSI
  - Log-scale price history
  - Intrinsic value comparison
  - RSI (14) indicator below

**4. Key Notes Section** (Expandable accordion)
- 3-column layout: Bull Case | Bear Case | Entry/Exit Strategy
- Click to expand/collapse

**5. Footer**
- Analysis date, data sources, recommendation

### Required Metrics by Section

**Price & Valuation** (6 metrics):
- Price, Market Cap, Trailing P/E, Forward P/E, Subsector Typical P/E, PEG Ratio

**Financial Performance** (6 metrics):
- ROE, ROA, Profit Margin, Operating Margin, Gross Margin, ROIC

**Growth Metrics** (6 metrics):
- Revenue Growth (5Y), Earnings Growth, EPS (TTM), Forward EPS, Analyst Rec, Target Price

**Risk Indicators** (6 metrics):
- Debt/Equity, Consolidated Risk, F-Score, Z-Score, M-Score, Max Drawdown (5Y)

**Liquidity & FCF** (6 metrics):
- Current Ratio, Total Cash, Total Debt, FCF Growth 5Y, FCF Yield, Payout Ratio

**Insider & Sentiment** (6 metrics):
- Insider Buys (12M), Insider Sells (12M), Net Shares (12M), RSI (14D), Stock Type, Sector

**Quality Scores** (6 metrics):
- CQVS, Label, Valuation Score, Quality Score, Strength Score, Integrity Score

**Moat & Other** (6 metrics):
- Moat Score (0-10), Beta, Predictability, Data Quality, Completeness, Dividend Yield

### Radar Chart Metrics (12 points, normalized 0-100)
1. Revenue Growth (normalize: X% growth → scale to 100 for 20%+)
2. Operating Margin (normalize: X% → 100 for 30%+)
3. Gross Margin (normalize: X% → 100 for 60%+)
4. Profit Margin (normalize: X% → 100 for 25%+)
5. ROE (normalize: X% → 100 for 30%+)
6. Risk Score (inverse of consolidated risk: 100 - risk*100)
7. Beta Score (inverse: 100 for beta=0.5, 50 for beta=1.5, 0 for beta=2.5+)
8. P/Market Discount (100 = deeply undervalued, 50 = fair, 0 = overvalued)
9. Moat Score (moat rating * 10)
10. FCF Yield (X% → 100 for 8%+)
11. ROA (X% → 100 for 20%+)
12. Earnings Growth (X% → 100 for 25%+)

### Color Coding Rules

```javascript
// Green (isGood: true) - Positive indicators
ROE > 20%, ROA > 10%, Margins > 20%, ROIC > 15%
Revenue Growth > 10%, Current Ratio 1-2, Z-Score > 3
M-Score < -1.78, FCF Growth > 0%, Payout < 50%
F-Score >= 7, Quality >= 70, Strength >= 70

// Red (isGood: false) - Warning indicators  
Max Drawdown < -50%, Beta > 2, Consolidated Risk > 0.6
Predictability < 50%, F-Score <= 3, Z-Score < 1.81
M-Score > -1.78, Quality < 50

// Yellow (isGood: 'neutral') - Monitor
F-Score 4-6, RSI 30-70, Moat 5-7, Quality 50-70
Beta 1.5-2.0, Predictability 50-70%
```

### Complete Template Code

Use this exact template structure:

```jsx
import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, ReferenceLine, Area, ComposedChart, Scatter
} from 'recharts';

const QuantDashboard = () => {
  const [showKeyNotes, setShowKeyNotes] = useState(false);

  // ============================================================
  // POPULATE WITH STOCK-SPECIFIC DATA FROM ANALYSIS
  // ============================================================
  
  const ticker = "TICKER";  // Replace
  const companyName = "Company Name";  // Replace
  const recommendation = "BUY";  // BUY, HOLD, SELL, SPECULATIVE BUY
  const analysisDate = "December 6, 2025";  // Current date

  const metrics = {
    // Price & Valuation - from analysis
    price: 100.00,
    marketCap: '€10B',
    trailingPE: 20.0,
    forwardPE: 18.0,
    subsectorTypicalPE: 25.0,
    peg1Y: 1.2,           // NEW: 1-Year Forward PEG
    peg5Y: 2.5,           // NEW: 5-Year PEG
    
    // Financial Performance - from 5-10 year analysis
    roe: 25.0,
    roa: 12.0,
    profitMargin: 20.0,
    opMargin: 25.0,
    grossMargin: 50.0,
    roic: 18.0,
    
    // Growth Metrics - from historical trends (USE REPORTED, not underlying)
    revGrowth: 15.0,      // REPORTED revenue growth YoY
    earnGrowth: 20.0,     // REPORTED earnings growth YoY
    epsTTM: 5.00,
    forwardEPS: 5.50,
    growthCapped: 10.0,   // NEW: Capped sustainable growth estimate
    growthUncapped: 22.0, // NEW: Headline analyst growth estimate
    analystTarget: 120.00,
    
    // Risk Indicators - from advanced metrics section
    crs: 0.40,            // Consolidated Risk Score (0-1 scale)
    debtEquity: 0.50,
    fScore: 7,            // Piotroski F-Score
    zScore: 4.0,          // Altman Z-Score
    mScore: -2.5,         // Beneish M-Score
    valueTrapScore: 25,   // NEW: 0-100, LOWER = genuine, HIGHER = trap
    valueTrapLabel: 'Genuine', // NEW: Genuine/Caution/Trap
    maxDrawdown: -30.0,   // 5-year max drawdown %
    
    // Liquidity & FCF - from cash flow analysis
    currentRatio: 1.5,
    totalCash: '€2B',
    totalDebt: '€1B',
    fcfGrowth5Y: 12.0,    // 5-year smoothed growth
    fcfYield: 5.0,
    fcfMargin: 18.5,      // NEW: FCF / Revenue %
    payoutRatio: 30.0,
    
    // Insider & Sentiment - from SEC Form 4 or use "N/A" if unavailable
    insBuys: 0,           // From SEC Form 4 - use actual count or "N/A"
    insSells: 0,          // From SEC Form 4 - use actual count or "N/A"
    netShares: 'N/A',     // From SEC Form 4 - use actual or "N/A"
    shortInterest: 2.5,   // From FINRA/exchange - use actual or "N/A"
    newsSentiment: 0.25,  // -1 to +1 scale
    newsArticleCount: 15, // Recent article count
    
    // Beta & Volatility
    beta: 1.0,            // Stock beta
    vol1Y: 25.0,          // 1-Year volatility %
    
    // Quality Scores - from consolidated scoring
    cqvs: 75.0,           // Consolidated Quality & Valuation Score
    label: 'Quality Growth', // Elite/Compounder/Quality Growth/etc
    valuation: 70.0,      // 0-100
    quality: 80.0,        // 0-100
    strength: 75.0,       // 0-100
    integrity: 85.0,      // 0-100
    
    // Moat & Other
    buffettMoat: 8,       // 0-10 scale (renamed from moat)
    greenblattEY: 6.5,    // NEW: Earnings Yield %
    greenblattROC: 22.0,  // NEW: Return on Capital %
    earningsPredict: 70,  // Earnings Predictability 0-100
    completeness: 85,     // Data completeness 0-100
    dataQuality: 'High',  // High/Medium/Low
    divYield: 1.5,
    stockType: 'Growth',  // Growth/Value/Cyclical/Defensive
    sector: 'Technology',
    industry: 'Software',
    
    // NEW: Investor Persona Scores (0-10 scale each)
    buffettScore: 7.5,    // Durable competitive advantage seeker
    mungerScore: 6.8,     // Inversion thinker, risk avoider
    dalioScore: 7.2,      // All-weather, cycle resilient
    lynchScore: 8.0,      // GARP - Growth at Reasonable Price
    grahamScore: 5.5,     // Deep value, margin of safety
    greenblattScore: 6.0, // Magic Formula (EY + ROC)
    templetonScore: 4.5,  // Contrarian, global value
    sorosScore: 3.0,      // Reflexivity, macro trends
    
    // NEW: Valuation Lines for Charts
    marketValueCurrent: 95.00,
    intrinsicValueCurrent: 110.00,
    marketValueNextYear: 105.00,
    intrinsicValueNextYear: 120.00,
    unrestrictedMarketValueCurrent: 125.00,
    unrestrictedMarketValueNextYear: 140.00,
    
    // Valuation Assessment (for indicator below forecast)
    valuationPercent: 15,       // Positive = undervalued, negative = overvalued
    valuationLabel: 'Undervalued', // Undervalued/Fairly Valued/Overvalued
  };

  // TOP NEWS Headlines - Format: pipe-separated with dates at END in brackets
  const topNews = [
    { headline: 'Company announces Q4 guidance above expectations', date: '05 Dec 2025' },
    { headline: 'New product launch receives positive analyst coverage', date: '28 Nov 2025' },
    { headline: 'Strategic partnership announced with major cloud provider', date: '15 Nov 2025' },
    { headline: 'Q3 earnings beat estimates, revenue up 18% YoY', date: '02 Nov 2025' },
    { headline: 'Management presents at investor conference, reaffirms outlook', date: '20 Oct 2025' },
  ];
  
  // Format TOP NEWS as pipe-separated string with dates at END
  const topNewsString = topNews.map(n => `${n.headline} [${n.date}]`).join(' | ');

  // Historical Price Data (10 years with multiple valuation lines)
  const priceHistory = [
    { date: '2016', price: 25, totalReturn: 28, marketValueCurrent: 27, intrinsicValueCurrent: 30, marketValueNextYear: 29, intrinsicValueNextYear: 32, analystTarget: 30, unrestrictedCurrent: 28, unrestrictedNextYear: 31 },
    { date: '2017', price: 35, totalReturn: 40, marketValueCurrent: 38, intrinsicValueCurrent: 42, marketValueNextYear: 40, intrinsicValueNextYear: 45, analystTarget: 42, unrestrictedCurrent: 40, unrestrictedNextYear: 44 },
    { date: '2018', price: 45, totalReturn: 52, marketValueCurrent: 48, intrinsicValueCurrent: 55, marketValueNextYear: 52, intrinsicValueNextYear: 60, analystTarget: 55, unrestrictedCurrent: 52, unrestrictedNextYear: 58 },
    { date: '2019', price: 55, totalReturn: 65, marketValueCurrent: 58, intrinsicValueCurrent: 68, marketValueNextYear: 62, intrinsicValueNextYear: 72, analystTarget: 65, unrestrictedCurrent: 65, unrestrictedNextYear: 72 },
    { date: '2020', price: 50, totalReturn: 62, marketValueCurrent: 55, intrinsicValueCurrent: 65, marketValueNextYear: 60, intrinsicValueNextYear: 70, analystTarget: 62, unrestrictedCurrent: 62, unrestrictedNextYear: 70 },
    { date: '2021', price: 75, totalReturn: 95, marketValueCurrent: 80, intrinsicValueCurrent: 90, marketValueNextYear: 85, intrinsicValueNextYear: 98, analystTarget: 90, unrestrictedCurrent: 92, unrestrictedNextYear: 105 },
    { date: '2022', price: 65, totalReturn: 85, marketValueCurrent: 72, intrinsicValueCurrent: 85, marketValueNextYear: 78, intrinsicValueNextYear: 92, analystTarget: 82, unrestrictedCurrent: 85, unrestrictedNextYear: 95 },
    { date: '2023', price: 80, totalReturn: 105, marketValueCurrent: 85, intrinsicValueCurrent: 100, marketValueNextYear: 92, intrinsicValueNextYear: 108, analystTarget: 98, unrestrictedCurrent: 100, unrestrictedNextYear: 115 },
    { date: '2024', price: 95, totalReturn: 125, marketValueCurrent: 100, intrinsicValueCurrent: 115, marketValueNextYear: 108, intrinsicValueNextYear: 125, analystTarget: 115, unrestrictedCurrent: 120, unrestrictedNextYear: 135 },
    { date: '2025', price: 100, totalReturn: 135, marketValueCurrent: 105, intrinsicValueCurrent: 120, marketValueNextYear: 115, intrinsicValueNextYear: 132, analystTarget: 125, unrestrictedCurrent: 130, unrestrictedNextYear: 145 },
  ];

  // 1 Year Price with 6-Month Forecast, MAs, and Bollinger Bands
  const oneYearData = [
    { date: "Jan'25", price: 90, ma50: 88, ma200: 85, upperBand: 98, lowerBand: 82, forecast: null, ci95Upper: null, ci95Lower: null },
    { date: "Mar'25", price: 88, ma50: 89, ma200: 86, upperBand: 96, lowerBand: 80, forecast: null, ci95Upper: null, ci95Lower: null },
    { date: "May'25", price: 95, ma50: 91, ma200: 87, upperBand: 102, lowerBand: 84, forecast: null, ci95Upper: null, ci95Lower: null },
    { date: "Jul'25", price: 92, ma50: 92, ma200: 88, upperBand: 100, lowerBand: 84, forecast: null, ci95Upper: null, ci95Lower: null },
    { date: "Sep'25", price: 98, ma50: 94, ma200: 90, upperBand: 106, lowerBand: 86, forecast: null, ci95Upper: null, ci95Lower: null },
    { date: "Nov'25", price: 100, ma50: 96, ma200: 92, upperBand: 108, lowerBand: 88, forecast: 100, ci95Upper: 108, ci95Lower: 92 },
    { date: "Jan'26", price: null, ma50: null, ma200: null, upperBand: null, lowerBand: null, forecast: 108, ci95Upper: 120, ci95Lower: 96 },
    { date: "Mar'26", price: null, ma50: null, ma200: null, upperBand: null, lowerBand: null, forecast: 115, ci95Upper: 130, ci95Lower: 100 },
  ];

  // NEW: Ichimoku Cloud Data (6-month view with signal markers)
  const ichimokuData = [
    { date: 'Jun', price: 88, tenkan: 87, kijun: 85, senkouA: 84, senkouB: 82, chikou: 85, tkCrossMarker: null, kumoTwistMarker: null },
    { date: 'Jul', price: 92, tenkan: 90, kijun: 87, senkouA: 86, senkouB: 84, chikou: 90, tkCrossMarker: 92, kumoTwistMarker: null }, // TK Bullish Cross
    { date: 'Aug', price: 95, tenkan: 93, kijun: 90, senkouA: 89, senkouB: 86, chikou: 93, tkCrossMarker: null, kumoTwistMarker: null },
    { date: 'Sep', price: 98, tenkan: 96, kijun: 93, senkouA: 92, senkouB: 88, chikou: 96, tkCrossMarker: null, kumoTwistMarker: 92 }, // Kumo Twist Bullish
    { date: 'Oct', price: 96, tenkan: 97, kijun: 95, senkouA: 94, senkouB: 90, chikou: 94, tkCrossMarker: null, kumoTwistMarker: null },
    { date: 'Nov', price: 100, tenkan: 98, kijun: 96, senkouA: 95, senkouB: 92, chikou: 98, tkCrossMarker: null, kumoTwistMarker: null },
  ];

  // NEW: Ichimoku Signals Summary
  const ichimokuSignals = {
    tkCross: 'TK Bullish Cross',
    kumoTwist: 'Kumo Twist Bullish',
    priceVsCloud: 'Above Cloud (Bullish)',
  };

  // MACD Data (recent 6 months)
  const macdData = [
    { date: 'Jun', macd: 0.5, signal: 0.3, histogram: 0.2 },
    { date: 'Jul', macd: 1.2, signal: 0.6, histogram: 0.6 },
    { date: 'Aug', macd: 1.5, signal: 1.0, histogram: 0.5 },
    { date: 'Sep', macd: 1.8, signal: 1.3, histogram: 0.5 },
    { date: 'Oct', macd: 1.2, signal: 1.4, histogram: -0.2 },
    { date: 'Nov', macd: 0.8, signal: 1.2, histogram: -0.4 },
  ];

  // RSI Data (recent 6 months)
  const rsiData = [
    { date: 'Jun', rsi: 45 },
    { date: 'Jul', rsi: 55 },
    { date: 'Aug', rsi: 62 },
    { date: 'Sep', rsi: 68 },
    { date: 'Oct', rsi: 58 },
    { date: 'Nov', rsi: 55 },
  ];

  // Radar Chart Data (normalize all to 0-100 scale)
  const radarData = [
    { metric: 'Rev Growth', value: 70, fullMark: 100 },
    { metric: 'Op Margin', value: 75, fullMark: 100 },
    { metric: 'Gross Margin', value: 65, fullMark: 100 },
    { metric: 'Profit Margin', value: 60, fullMark: 100 },
    { metric: 'ROE', value: 70, fullMark: 100 },
    { metric: 'Risk (CRS)', value: 60, fullMark: 100 },
    { metric: 'Beta Score', value: 70, fullMark: 100 },
    { metric: 'P/Market Disc', value: 50, fullMark: 100 },
    { metric: 'Moat', value: 80, fullMark: 100 },
    { metric: 'FCF Growth', value: 55, fullMark: 100 },
    { metric: 'ROA', value: 65, fullMark: 100 },
    { metric: 'Earn Growth', value: 75, fullMark: 100 },
  ];

  // Key Notes Content - from Bull/Bear case analysis
  const bullCase = {
    target: "€130-150",  // Bull case price target
    points: [
      "Strong revenue growth momentum",
      "Expanding margins",
      "Market leadership position",
      "Favorable industry tailwinds",
      "Strong balance sheet"
    ]
  };

  const bearCase = {
    target: "€70-80",  // Bear case price target
    points: [
      "Valuation compression risk",
      "Competitive pressures",
      "Macro sensitivity",
      "Execution risks",
      "Key person dependency"
    ]
  };

  const entryStrategy = {
    idealEntry: "€90-95",  // From Entry Strategy section
    currentEntry: "€100 acceptable",
    target: "€120 (+20%)",  // 12-month target
    stopLoss: "€85 (-15%)",  // Stop loss
    positionSize: "2-3%"  // Recommended allocation
  };

  // ============================================================
  // COMPONENT CODE (Standard - use as-is)
  // ============================================================

  // Helper: Value Trap color (LOWER = genuine = green, HIGHER = trap = red)
  const getValueTrapColor = (score) => {
    if (score < 40) return 'bg-green-100 border-green-400 text-green-800';
    if (score < 60) return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    return 'bg-red-100 border-red-400 text-red-800';
  };

  // Helper: Get label for Value Trap score
  const getValueTrapLabel = (score) => {
    if (score < 20) return 'Genuine';
    if (score < 40) return 'Probably Genuine';
    if (score < 60) return 'Caution';
    if (score < 80) return 'Likely Trap';
    return 'Strong Trap';
  };

  // Helper: Persona score color
  const getPersonaColor = (score) => {
    if (score >= 7) return 'bg-green-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Helper: News sentiment color
  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.3) return 'text-green-600';
    if (sentiment > 0) return 'text-green-500';
    if (sentiment > -0.3) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Persona Badge Component
  const PersonaBadge = ({ name, score, position }) => (
    <div className={`absolute ${position} flex flex-col items-center`}>
      <div className={`w-6 h-6 rounded-full ${getPersonaColor(score)} flex items-center justify-center text-white text-[8px] font-bold`}>
        {score.toFixed(1)}
      </div>
      <div className="text-[7px] text-gray-600 mt-0.5">{name}</div>
    </div>
  );

  const MetricBox = ({ label, value, benchmark, isGood, size = 'normal' }) => {
    let bgColor = 'bg-gray-50';
    if (isGood === true) bgColor = 'bg-green-50 border-green-200';
    if (isGood === false) bgColor = 'bg-red-50 border-red-200';
    if (isGood === 'neutral') bgColor = 'bg-yellow-50 border-yellow-200';
    
    return (
      <div className={`${bgColor} border p-1.5 flex flex-col justify-center items-center`}>
        <div className="text-base font-bold text-gray-900">{value}</div>
        <div className="text-[9px] text-gray-600 text-center leading-tight">{label}</div>
        {benchmark && <div className="text-[8px] text-gray-400">{benchmark}</div>}
      </div>
    );
  };

  const SectionHeader = ({ title, bgColor }) => (
    <div className={`${bgColor} px-2 py-1 text-[10px] font-bold text-gray-700`}>
      {title}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-3 bg-white text-xs">
      {/* Header */}
      <div className="bg-orange-500 text-white px-3 py-2 mb-1 text-lg font-bold text-center">
        {ticker} - {companyName}
      </div>

      {/* TOP NEWS - Pipe separated with dates at END */}
      <div className="border border-gray-300 rounded p-2 mb-3 bg-gray-50">
        <span className="font-bold text-[10px]">TOP NEWS:</span>
        <div className="text-[9px] mt-1">{topNewsString}</div>
      </div>

      {/* Top 4 sections */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Price & Valuation - Updated with dual PEG */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="PRICE & VALUATION" bgColor="bg-blue-100" />
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            <MetricBox label="Price:" value={`€${metrics.price}`} />
            <MetricBox label="Market Cap:" value={metrics.marketCap} />
            <MetricBox label="Trailing P/E:" value={metrics.trailingPE} />
            <MetricBox label="Forward P/E:" value={metrics.forwardPE} benchmark={`(${metrics.subsectorTypicalPE})`} isGood={metrics.forwardPE < metrics.subsectorTypicalPE} />
            <MetricBox label="Subsector P/E:" value={metrics.subsectorTypicalPE} />
            <MetricBox label="PEG (1Y):" value={metrics.peg1Y} benchmark="(<1.5)" isGood={metrics.peg1Y < 1.5 ? true : metrics.peg1Y < 2 ? 'neutral' : false} />
            <MetricBox label="PEG (5Y):" value={metrics.peg5Y} benchmark="(<2)" isGood={metrics.peg5Y < 2 ? true : metrics.peg5Y < 3 ? 'neutral' : false} />
          </div>
        </div>

        {/* Financial Performance */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="FINANCIAL PERFORMANCE" bgColor="bg-green-100" />
          <div className="grid grid-cols-6 gap-px bg-gray-200">
            <MetricBox label="ROE:" value={`${metrics.roe}%`} benchmark="(>20%)" isGood={metrics.roe >= 20 ? true : metrics.roe >= 10 ? 'neutral' : false} />
            <MetricBox label="ROA:" value={`${metrics.roa}%`} benchmark="(>10%)" isGood={metrics.roa >= 10} />
            <MetricBox label="Profit Margin:" value={`${metrics.profitMargin}%`} benchmark="(>20%)" isGood={metrics.profitMargin >= 20 ? true : metrics.profitMargin >= 10 ? 'neutral' : false} />
            <MetricBox label="Operative Margin:" value={`${metrics.opMargin}%`} benchmark="(>20%)" isGood={metrics.opMargin >= 20} />
            <MetricBox label="Gross Margin:" value={`${metrics.grossMargin}%`} benchmark="(>40%)" isGood={metrics.grossMargin >= 40} />
            <MetricBox label="ROIC:" value={`${metrics.roic}%`} benchmark="(>15%)" isGood={metrics.roic >= 15} />
          </div>
        </div>
      </div>

      {/* Next 4 sections */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Growth Metrics */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="GROWTH METRICS" bgColor="bg-emerald-100" />
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            <MetricBox label="Revenue (YoY):" value={`${metrics.revGrowth}%`} benchmark="(>10%)" isGood={metrics.revGrowth >= 10} />
            <MetricBox label="Earning (YoY):" value={`${metrics.earnGrowth}%`} benchmark="(>0%)" isGood={metrics.earnGrowth >= 0} />
            <MetricBox label="EPS (TTM):" value={`€${metrics.epsTTM}`} />
            <MetricBox label="Forward EPS:" value={`€${metrics.forwardEPS}`} isGood={metrics.forwardEPS > metrics.epsTTM} />
            <MetricBox label="Growth Rates:" value={`Capped: ${metrics.growthCapped}%`} benchmark={`Uncapped: ${metrics.growthUncapped}%`} />
            <MetricBox label="Analyst Target:" value={`€${metrics.analystTarget}`} />
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="RISK INDICATORS" bgColor="bg-red-100" />
          <div className="grid grid-cols-6 gap-px bg-gray-200">
            <MetricBox label="CRS (0-1):" value={metrics.crs.toFixed(2)} benchmark="(Medium)" isGood={metrics.crs < 0.4 ? true : metrics.crs < 0.6 ? 'neutral' : false} />
            <MetricBox label="Debt/Equity (mrq):" value={metrics.debtEquity} benchmark="(0.5-1)" isGood={metrics.debtEquity < 1 ? true : metrics.debtEquity < 2 ? 'neutral' : false} />
            <MetricBox label="Piotroski F:" value={metrics.fScore} benchmark="(≥7)" isGood={metrics.fScore >= 7 ? true : metrics.fScore >= 4 ? 'neutral' : false} />
            <MetricBox label="Altman Z:" value={metrics.zScore.toFixed(2)} benchmark="(>3)" isGood={metrics.zScore >= 2.99 ? true : metrics.zScore >= 1.81 ? 'neutral' : false} />
            <MetricBox label="Beneish M:" value={metrics.mScore.toFixed(2)} benchmark="(<-1.78)" isGood={metrics.mScore < -1.78} />
            <MetricBox label="Value Trap:" value={`${metrics.valueTrapScore} (${metrics.valueTrapLabel})`} isGood={metrics.valueTrapScore < 40 ? true : metrics.valueTrapScore < 60 ? 'neutral' : false} />
          </div>
        </div>
      </div>

      {/* Next 4 sections */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Liquidity & Free Cash Flow */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="LIQUIDITY & FREE CASH FLOW" bgColor="bg-cyan-100" />
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            <MetricBox label="Current Ratio:" value={metrics.currentRatio.toFixed(2)} benchmark="(1-2)" isGood={metrics.currentRatio >= 1 && metrics.currentRatio <= 2 ? true : 'neutral'} />
            <MetricBox label="Cash:" value={metrics.totalCash} />
            <MetricBox label="Debt:" value={metrics.totalDebt} />
            <MetricBox label="FCF Growth 5Y:" value={`${metrics.fcfGrowth5Y}%`} benchmark="(>5%)" isGood={metrics.fcfGrowth5Y >= 5} />
            <MetricBox label="FCF Yield:" value={`${metrics.fcfYield}%`} benchmark="(>4%)" isGood={metrics.fcfYield >= 4} />
            <MetricBox label="FCF Margin:" value={`${metrics.fcfMargin}%`} benchmark="(>15%)" isGood={metrics.fcfMargin >= 15 ? true : metrics.fcfMargin >= 10 ? 'neutral' : false} />
            <MetricBox label="Payout Ratio:" value={`${metrics.payoutRatio}%`} benchmark="(<50%)" isGood={metrics.payoutRatio < 50} />
          </div>
        </div>

        {/* Insider & Sentiment & Class */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="INSIDER & SENTIMENT & CLASS" bgColor="bg-purple-100" />
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            <MetricBox label="Buys (12M):" value={metrics.insBuys} isGood={metrics.insBuys > metrics.insSells} />
            <MetricBox label="Sells (12M):" value={metrics.insSells} />
            <MetricBox label="Net Shares (12M):" value={metrics.netShares} />
            <MetricBox label="Short Int (%):" value={`${metrics.shortInterest}%`} isGood={metrics.shortInterest < 5 ? true : metrics.shortInterest < 10 ? 'neutral' : false} />
            <MetricBox label="Sentiment / Articles:" value={`${metrics.newsSentiment > 0 ? '+' : ''}${metrics.newsSentiment.toFixed(3)} / ${metrics.newsArticleCount}`} benchmark={metrics.newsSentiment > 0 ? '(Positive)' : '(Negative)'} isGood={metrics.newsSentiment > 0} />
            <MetricBox label={`Stock: ${metrics.stockType}`} value={`Div Yield: ${metrics.divYield}%`} />
            <MetricBox label="Sector/Industry:" value={`${metrics.sector} /`} benchmark={metrics.industry} />
          </div>
        </div>
      </div>

      {/* Last 2 sections */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Quality Scores */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="QUALITY SCORES" bgColor="bg-orange-100" />
          <div className="grid grid-cols-6 gap-px bg-gray-200">
            <MetricBox label="CQVS:" value={metrics.cqvs.toFixed(1)} benchmark="(>70)" isGood={metrics.cqvs >= 70 ? true : metrics.cqvs >= 50 ? 'neutral' : false} />
            <MetricBox label="Label:" value={metrics.label} />
            <MetricBox label="Valuation:" value={metrics.valuation} isGood={metrics.valuation >= 70} />
            <MetricBox label="Quality:" value={metrics.quality} isGood={metrics.quality >= 70 ? true : metrics.quality >= 50 ? 'neutral' : false} />
            <MetricBox label="Strength:" value={metrics.strength} isGood={metrics.strength >= 70} />
            <MetricBox label="Integrity:" value={metrics.integrity} isGood={metrics.integrity >= 70 ? true : metrics.integrity >= 50 ? 'neutral' : false} />
          </div>
        </div>

        {/* Moat & Other */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <SectionHeader title="MOAT & OTHER" bgColor="bg-gray-200" />
          <div className="grid grid-cols-6 gap-px bg-gray-200">
            <MetricBox label="Buffett Moat:" value={metrics.buffettMoat} benchmark="(4-7)" isGood={metrics.buffettMoat >= 7 ? true : metrics.buffettMoat >= 4 ? 'neutral' : false} />
            <MetricBox label="Greenblatt (MF):" value={`EY: ${metrics.greenblattEY}%`} benchmark={metrics.greenblattROC ? `ROC: ${metrics.greenblattROC}%` : 'ROC: N/A'} isGood={metrics.greenblattEY >= 8 ? true : metrics.greenblattEY >= 4 ? 'neutral' : false} />
            <MetricBox label={`Beta: ${metrics.beta}`} value={`Vol 1Y: ${metrics.vol1Y}%`} isGood={metrics.beta < 1 ? true : metrics.beta < 1.5 ? 'neutral' : false} />
            <MetricBox label="Earnings Predict.:" value={`${metrics.earningsPredict}%`} benchmark="(>80%)" isGood={metrics.earningsPredict >= 80 ? true : metrics.earningsPredict >= 60 ? 'neutral' : false} />
            <MetricBox label="Drawdown (5Y):" value={`${metrics.maxDrawdown}%`} benchmark={metrics.maxDrawdown > -30 ? '(Low)' : metrics.maxDrawdown > -50 ? '(Mid)' : '(High)'} isGood={metrics.maxDrawdown > -30 ? true : metrics.maxDrawdown > -50 ? 'neutral' : false} />
            <MetricBox label={`Completeness: ${metrics.completeness}%`} value={`Data Quality: ${metrics.dataQuality}`} isGood={metrics.dataQuality === 'High' ? true : metrics.dataQuality === 'Medium' ? 'neutral' : false} />
          </div>
        </div>
      </div>

      {/* Charts Section - Enhanced with Legends */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Linear Price Chart + MACD */}
        <div className="border border-gray-300 rounded p-2">
          <div className="text-sm font-bold mb-1 text-center">LINEAR PRICE CHART (10Y)</div>
          <div className="text-[7px] text-gray-500 mb-1 pl-1">
            — Close Price — Total Return<br/>
            - - Market Value (Current): €{metrics.marketValueCurrent}<br/>
            - - Intrinsic Value (Current): €{metrics.intrinsicValueCurrent}<br/>
            - - Analyst Target: €{metrics.analystTarget}
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 7 }} />
              <YAxis tick={{ fontSize: 7 }} />
              <Tooltip contentStyle={{ fontSize: 8 }} />
              <Line type="monotone" dataKey="price" stroke="#1f2937" strokeWidth={1.5} dot={false} name="Close" />
              <Line type="monotone" dataKey="totalReturn" stroke="#6b7280" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Total Return" />
              <Line type="monotone" dataKey="intrinsicValueCurrent" stroke="#16a34a" strokeWidth={1} strokeDasharray="5 5" dot={false} name="IV Current" />
              <Line type="monotone" dataKey="analystTarget" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Target" />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs font-bold mt-1 mb-1 text-center">MACD</div>
          <ResponsiveContainer width="100%" height={55}>
            <LineChart data={macdData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 6 }} />
              <YAxis tick={{ fontSize: 6 }} />
              <ReferenceLine y={0} stroke="#666" />
              <Tooltip contentStyle={{ fontSize: 7 }} />
              <Line type="monotone" dataKey="macd" stroke="#2563eb" strokeWidth={1} dot={false} name="MACD" />
              <Line type="monotone" dataKey="signal" stroke="#dc2626" strokeWidth={1} dot={false} name="Signal" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar + Investor Personas + Forecast */}
        <div className="border border-gray-300 rounded p-2">
          <div className="relative">
            <ResponsiveContainer width="100%" height={140}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 6 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 6 }} />
                <Radar name={ticker} dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
            {/* Investor Persona Badges */}
            <PersonaBadge name="Buffett" score={metrics.buffettScore} position="top-0 left-1/4" />
            <PersonaBadge name="Lynch" score={metrics.lynchScore} position="top-0 right-1/4" />
            <PersonaBadge name="Munger" score={metrics.mungerScore} position="top-1/4 -left-2" />
            <PersonaBadge name="Greenblatt" score={metrics.greenblattScore} position="top-1/4 -right-2" />
            <PersonaBadge name="Dalio" score={metrics.dalioScore} position="bottom-1/4 -left-2" />
            <PersonaBadge name="Graham" score={metrics.grahamScore} position="bottom-1/4 -right-2" />
            <PersonaBadge name="Templeton" score={metrics.templetonScore} position="bottom-0 left-1/4" />
            <PersonaBadge name="Soros" score={metrics.sorosScore} position="bottom-0 right-1/4" />
          </div>
          <div className="text-center my-1">
            <span className="bg-green-200 px-2 py-0.5 text-[10px] font-bold rounded border border-green-400">
              Advice: {recommendation} (CQVS: {metrics.cqvs.toFixed(1)})
            </span>
          </div>
          <div className="text-[8px] font-bold mb-0.5 text-center">1Y PRICE + 6-MONTH FORECAST</div>
          <div className="text-[6px] text-gray-500 mb-0.5 text-center">— Close — 50-Day MA — 200-Day MA ▒ Bollinger Bands - - Forecast</div>
          <ResponsiveContainer width="100%" height={70}>
            <ComposedChart data={oneYearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 6 }} />
              <YAxis tick={{ fontSize: 6 }} />
              <Tooltip contentStyle={{ fontSize: 7 }} />
              <Area type="monotone" dataKey="upperBand" stroke="none" fill="#e0e0e0" fillOpacity={0.5} />
              <Area type="monotone" dataKey="ci95Upper" stroke="none" fill="#dbeafe" fillOpacity={0.5} />
              <Line type="monotone" dataKey="price" stroke="#1f2937" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="ma50" stroke="#f59e0b" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="ma200" stroke="#ef4444" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="#16a34a" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          {/* Valuation Indicator */}
          <div className={`text-center text-[10px] font-bold mt-1 ${metrics.valuationPercent > 10 ? 'text-green-600' : metrics.valuationPercent < -10 ? 'text-red-600' : 'text-yellow-600'}`}>
            {metrics.valuationLabel} ({metrics.valuationPercent > 0 ? '+' : ''}{metrics.valuationPercent}%)
          </div>
        </div>

        {/* Log Price + RSI */}
        <div className="border border-gray-300 rounded p-2">
          <div className="text-sm font-bold mb-1 text-center">LOG PRICE CHART (10Y)</div>
          <div className="text-[7px] text-gray-500 mb-1 pl-1">
            — Close Price — Total Return<br/>
            - - Unrestr. Market Value (Current): €{metrics.unrestrictedMarketValueCurrent}<br/>
            - - Unrestr. Market Value (Next Year): €{metrics.unrestrictedMarketValueNextYear}
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 7 }} />
              <YAxis tick={{ fontSize: 7 }} scale="log" domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ fontSize: 8 }} />
              <Line type="monotone" dataKey="price" stroke="#1f2937" strokeWidth={1.5} dot={false} name="Close" />
              <Line type="monotone" dataKey="totalReturn" stroke="#6b7280" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Total Return" />
              <Line type="monotone" dataKey="unrestrictedCurrent" stroke="#dc2626" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Unrestr Current" />
              <Line type="monotone" dataKey="unrestrictedNextYear" stroke="#f97316" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Unrestr Next" />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs font-bold mt-1 mb-1 text-center">RSI (14) = {rsiData[rsiData.length - 1].rsi}</div>
          <ResponsiveContainer width="100%" height={55}>
            <LineChart data={rsiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 6 }} />
              <YAxis tick={{ fontSize: 6 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 7 }} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW: Ichimoku Cloud Chart */}
      <div className="border border-gray-300 rounded p-2 mb-3">
        <div className="text-sm font-bold mb-1 text-center">ICHIMOKU CLOUD</div>
        <div className="flex gap-4 text-[7px] justify-center mb-1">
          <span>— Close Price</span>
          <span className="text-blue-500">— Tenkan-sen (9)</span>
          <span className="text-red-500">— Kijun-sen (26)</span>
          <span className="text-gray-400">— Chikou Span</span>
          <span className="text-green-500">▒ Senkou Span A/B (Cloud)</span>
          <span className="ml-2 font-bold text-yellow-600">◆ TK Cross</span>
          <span className="text-purple-600">◆ Kumo Twist</span>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={ichimokuData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" tick={{ fontSize: 7 }} />
            <YAxis tick={{ fontSize: 7 }} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ fontSize: 8 }} />
            <Area type="monotone" dataKey="senkouA" stroke="none" fill="#86efac" fillOpacity={0.3} />
            <Area type="monotone" dataKey="senkouB" stroke="none" fill="#fca5a5" fillOpacity={0.3} />
            <Line type="monotone" dataKey="price" stroke="#1f2937" strokeWidth={2} dot={false} name="Price" />
            <Line type="monotone" dataKey="tenkan" stroke="#3b82f6" strokeWidth={1} dot={false} name="Tenkan" />
            <Line type="monotone" dataKey="kijun" stroke="#dc2626" strokeWidth={1} dot={false} name="Kijun" />
            <Line type="monotone" dataKey="chikou" stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Chikou" />
            <Scatter dataKey="tkCrossMarker" fill="#9333ea" shape="diamond" name="TK Cross" />
            <Scatter dataKey="kumoTwistMarker" fill="#dc2626" shape="diamond" name="Kumo Twist" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-4 text-[8px] justify-center mt-1">
          <span className="bg-green-100 px-2 rounded">{ichimokuSignals.tkCross}</span>
          <span className="bg-green-100 px-2 rounded">{ichimokuSignals.kumoTwist}</span>
          <span className="bg-green-100 px-2 rounded">{ichimokuSignals.priceVsCloud}</span>
        </div>
      </div>

      {/* Key Notes (Expandable) */}
      <div className="border border-gray-300 rounded overflow-hidden">
        <button 
          onClick={() => setShowKeyNotes(!showKeyNotes)}
          className="w-full bg-gray-100 px-3 py-2 text-left text-sm font-bold flex items-center hover:bg-gray-200"
        >
          <span className="mr-2">{showKeyNotes ? '▼' : '▶'}</span> Key Notes (Click to Expand)
        </button>
        {showKeyNotes && (
          <div className="p-3 bg-gray-50">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Bull Case */}
              <div>
                <div className="font-bold text-green-700 mb-2 text-sm">BULL CASE ({bullCase.target})</div>
                <ul className="list-disc list-inside space-y-1">
                  {bullCase.points.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </div>
              {/* Bear Case */}
              <div>
                <div className="font-bold text-red-700 mb-2 text-sm">BEAR CASE ({bearCase.target})</div>
                <ul className="list-disc list-inside space-y-1">
                  {bearCase.points.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </div>
              {/* Entry/Exit Strategy */}
              <div>
                <div className="font-bold text-blue-700 mb-2 text-sm">ENTRY/EXIT STRATEGY</div>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Ideal Entry:</strong> {entryStrategy.idealEntry}</li>
                  <li><strong>Current:</strong> {entryStrategy.currentEntry}</li>
                  <li><strong>Target:</strong> {entryStrategy.target}</li>
                  <li><strong>Stop Loss:</strong> {entryStrategy.stopLoss}</li>
                  <li><strong>Position Size:</strong> {entryStrategy.positionSize}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center mt-3">
        Analysis Date: {analysisDate} | Sources: SEC Filings, Company Reports | 
        <span className="font-bold text-blue-600 ml-1">{recommendation}</span>
      </div>
    </div>
  );
};

export default QuantDashboard;
```

### Implementation Instructions

**CRITICAL STEPS:**

1. **Calculate all metrics** during the comprehensive text analysis
2. **Store metrics in variables** as you calculate them
3. **After completing full text analysis**, create the React artifact
4. **Replace ALL placeholder values** in the template with actual calculated data
5. **Use the EXACT template structure** - do not modify the component code
6. **Populate these specific data arrays**:
   - `metrics` object (60+ values including investor persona scores)
   - `topNews` array (5 recent headlines with dates)
   - `priceHistory` array (10-year data with multiple valuation lines)
   - `oneYearData` array (with MAs, Bollinger Bands, forecast)
   - `ichimokuData` array (6-month with signal markers)
   - `ichimokuSignals` object (TK cross, Kumo twist, price vs cloud)
   - `macdData` array (6 recent points with histogram)
   - `rsiData` array (6 recent points)
   - `radarData` array (12 metrics, normalized 0-100)
   - `bullCase.points` (5 points from bull case analysis)
   - `bearCase.points` (5 points from bear case analysis)
   - `entryStrategy` (5 values from entry/exit strategy)

6. **Normalize radar chart values** properly:
   - Each metric on 0-100 scale
   - Higher is always better (invert risk/beta if needed)
   - Use scaling formulas provided above

7. **Format values correctly**:
   - Currency: `"€100.00"` (Euro is the default - use € not $)
   - Large numbers: `"€10B"`, `"€2.5M"`
   - Percentages: `15.0` (number, not string with %)
   - Ratios: `1.25` (number)
   - Scores: `7` (integer) or `75.0` (float)

8. **Growth metrics**:
   - Use REPORTED revenue growth (not underlying/organic)
   - Use REPORTED earnings growth (not adjusted EPS growth)

9. **DO NOT**:
   - Leave placeholder values
   - Modify the component structure
   - Skip any sections
   - Use estimated/guessed data

**This is the ONLY accepted dashboard format. All other dashboard styles are deprecated.**

---
