# Quant Analyst — Implementation Playbook

Concrete Python snippets for the core quant workflows promised in `SKILL.md`. Use these as starting points; adapt signatures and assumptions to the task at hand.

Stack assumptions: `pandas`, `numpy`, `scipy`. Where a specialized package is expected, it is noted at the top of the section.

---

## 1. Risk Metrics

### 1.1 Value at Risk (historical, parametric, Cornish–Fisher)

```python
import numpy as np
import pandas as pd
from scipy.stats import norm, skew, kurtosis

def var_historical(returns: pd.Series, alpha: float = 0.05) -> float:
    """Empirical VaR from the return distribution. Positive number = loss."""
    return -np.quantile(returns.dropna(), alpha)

def var_parametric(returns: pd.Series, alpha: float = 0.05) -> float:
    """Gaussian VaR assuming normal returns."""
    mu, sigma = returns.mean(), returns.std(ddof=1)
    return -(mu + sigma * norm.ppf(alpha))

def var_cornish_fisher(returns: pd.Series, alpha: float = 0.05) -> float:
    """Cornish–Fisher expansion — adjusts Gaussian VaR for skew/kurtosis."""
    z = norm.ppf(alpha)
    s = skew(returns.dropna())
    k = kurtosis(returns.dropna())  # excess kurtosis
    z_cf = (
        z
        + (z**2 - 1) * s / 6
        + (z**3 - 3 * z) * k / 24
        - (2 * z**3 - 5 * z) * s**2 / 36
    )
    mu, sigma = returns.mean(), returns.std(ddof=1)
    return -(mu + sigma * z_cf)
```

### 1.2 Conditional VaR (Expected Shortfall)

```python
def cvar_historical(returns: pd.Series, alpha: float = 0.05) -> float:
    cutoff = np.quantile(returns.dropna(), alpha)
    return -returns[returns <= cutoff].mean()
```

### 1.3 Sharpe, Sortino, max drawdown

```python
def sharpe_ratio(returns: pd.Series, rf: float = 0.0, periods: int = 252) -> float:
    excess = returns - rf / periods
    return np.sqrt(periods) * excess.mean() / excess.std(ddof=1)

def sortino_ratio(returns: pd.Series, rf: float = 0.0, periods: int = 252) -> float:
    excess = returns - rf / periods
    downside = excess[excess < 0].std(ddof=1)
    return np.sqrt(periods) * excess.mean() / downside

def max_drawdown(equity_curve: pd.Series) -> float:
    peak = equity_curve.cummax()
    dd = (equity_curve - peak) / peak
    return dd.min()
```

---

## 2. Portfolio Optimization

### 2.1 Markowitz mean–variance (minimum-variance subject to target return)

```python
import numpy as np
from scipy.optimize import minimize

def mean_variance_weights(
    expected_returns: np.ndarray,
    cov: np.ndarray,
    target_return: float,
    allow_short: bool = False,
) -> np.ndarray:
    n = len(expected_returns)
    w0 = np.ones(n) / n
    bounds = None if allow_short else [(0.0, 1.0)] * n
    constraints = [
        {"type": "eq", "fun": lambda w: w.sum() - 1},
        {"type": "eq", "fun": lambda w: w @ expected_returns - target_return},
    ]
    res = minimize(
        lambda w: w @ cov @ w,
        w0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
    )
    if not res.success:
        raise RuntimeError(res.message)
    return res.x
```

### 2.2 Efficient frontier sampling

```python
def efficient_frontier(expected_returns, cov, n_points=50, allow_short=False):
    r_min, r_max = expected_returns.min(), expected_returns.max()
    targets = np.linspace(r_min, r_max, n_points)
    frontier = []
    for t in targets:
        try:
            w = mean_variance_weights(expected_returns, cov, t, allow_short)
            frontier.append((t, np.sqrt(w @ cov @ w), w))
        except RuntimeError:
            continue
    return frontier
```

### 2.3 Black–Litterman (views on absolute returns)

```python
def black_litterman(
    cov: np.ndarray,           # prior covariance of asset returns
    w_mkt: np.ndarray,         # market-cap weights
    risk_aversion: float,      # lambda, typ. 2.5
    tau: float,                # scaling of prior (0.025 is common)
    P: np.ndarray,             # picking matrix (k x n)
    Q: np.ndarray,             # view returns (k,)
    Omega: np.ndarray,         # uncertainty of views (k x k diag)
) -> np.ndarray:
    pi = risk_aversion * cov @ w_mkt                      # implied equilibrium
    inv_tau_cov = np.linalg.inv(tau * cov)
    inv_omega = np.linalg.inv(Omega)
    post_cov = np.linalg.inv(inv_tau_cov + P.T @ inv_omega @ P)
    post_mu = post_cov @ (inv_tau_cov @ pi + P.T @ inv_omega @ Q)
    return post_mu
```

---

## 3. Backtesting Skeleton

Vectorized long/short backtest with transaction costs and slippage.

```python
def backtest(
    signals: pd.DataFrame,     # index=dates, cols=tickers, values in [-1, 1]
    prices: pd.DataFrame,      # aligned with signals
    cost_bps: float = 2.0,     # per turn, one-way
    slippage_bps: float = 1.0,
) -> pd.DataFrame:
    rets = prices.pct_change().fillna(0.0)
    positions = signals.shift(1).fillna(0.0)  # avoid lookahead
    turnover = positions.diff().abs().fillna(positions.abs())
    cost = turnover * (cost_bps + slippage_bps) / 1e4
    gross = (positions * rets).sum(axis=1)
    net = gross - cost.sum(axis=1)
    equity = (1 + net).cumprod()
    return pd.DataFrame({"gross": gross, "net": net, "equity": equity})
```

---

## 4. Pairs Trading (Statistical Arbitrage)

Cointegration-based pair identification with z-score entry.

```python
from statsmodels.tsa.stattools import coint

def find_cointegrated_pairs(prices: pd.DataFrame, p_threshold: float = 0.05):
    cols = prices.columns
    pairs = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            _, pvalue, _ = coint(prices[cols[i]], prices[cols[j]])
            if pvalue < p_threshold:
                pairs.append((cols[i], cols[j], pvalue))
    return sorted(pairs, key=lambda x: x[2])

def pair_zscore(a: pd.Series, b: pd.Series, window: int = 60) -> pd.Series:
    hedge = (a.rolling(window).cov(b) / b.rolling(window).var())
    spread = a - hedge * b
    return (spread - spread.rolling(window).mean()) / spread.rolling(window).std()
```

Entry/exit rule (simple): enter short spread when z > 2, long when z < -2, exit when |z| < 0.5.

---

## 5. Options & Greeks (Black–Scholes)

```python
from scipy.stats import norm

def bs_d1d2(S, K, r, sigma, T):
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return d1, d2

def bs_price(S, K, r, sigma, T, option="call"):
    d1, d2 = bs_d1d2(S, K, r, sigma, T)
    if option == "call":
        return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

def bs_greeks(S, K, r, sigma, T, option="call"):
    d1, d2 = bs_d1d2(S, K, r, sigma, T)
    delta = norm.cdf(d1) if option == "call" else norm.cdf(d1) - 1
    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T)
    theta_call = (
        -S * norm.pdf(d1) * sigma / (2 * np.sqrt(T))
        - r * K * np.exp(-r * T) * norm.cdf(d2)
    )
    theta_put = (
        -S * norm.pdf(d1) * sigma / (2 * np.sqrt(T))
        + r * K * np.exp(-r * T) * norm.cdf(-d2)
    )
    rho_call = K * T * np.exp(-r * T) * norm.cdf(d2)
    rho_put = -K * T * np.exp(-r * T) * norm.cdf(-d2)
    return {
        "delta": delta,
        "gamma": gamma,
        "vega": vega,
        "theta": theta_call if option == "call" else theta_put,
        "rho": rho_call if option == "call" else rho_put,
    }
```

---

## Guardrails

- **No lookahead.** Shift signal series by 1 period before multiplying with returns.
- **Transaction costs matter.** A strategy that looks great at 0 bps often dies at 2–5 bps net.
- **Out-of-sample.** Split data into train/test; do not tune on the test set.
- **Regime shifts.** Test across bull, bear, and sideways windows, not just a single backtest.
- **Survivorship bias.** Use a universe that includes delisted tickers for long backtests.
