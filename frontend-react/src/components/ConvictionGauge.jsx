import React, { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'

const SCORE_LABELS = {
  0: 'Nicht kaufen',
  1: 'Nicht kaufen',
  2: 'Sehr schwach',
  3: 'Schwach',
  4: 'Moderat',
  5: 'Stark',
  6: 'Sehr stark',
  7: 'Maximale Überzeugung',
}

const SCORE_COLORS = {
  0: '#dc2626',
  1: '#dc2626',
  2: '#ef4444',
  3: '#f97316',
  4: '#eab308',
  5: '#22c55e',
  6: '#16a34a',
  7: '#15803d',
}

const POSITION_SIZES = {
  0: 'Nicht kaufen',
  1: 'Nicht kaufen',
  2: '1–3%',
  3: '1–3%',
  4: '4–7%',
  5: '4–7%',
  6: '8–12%',
  7: '8–12%',
}

/**
 * ConvictionGauge — SVG arc gauge with GSAP entrance animation
 * Arc fills from left to right; score counts up from 0.
 */
export default function ConvictionGauge({ score = 0, size = 160 }) {
  const clampedScore = Math.max(0, Math.min(7, Math.round(score)))
  const color = SCORE_COLORS[clampedScore]
  const label = SCORE_LABELS[clampedScore]
  const posSize = POSITION_SIZES[clampedScore]

  const arcRef = useRef(null)
  const [displayScore, setDisplayScore] = useState(0)

  // Arc geometry
  const r = 45
  const cx = size / 2
  const cy = size / 2 + 10
  const startAngle = -210
  const endAngle = 30
  const totalArc = 240 // degrees

  const toRad = (deg) => (deg * Math.PI) / 180

  const arcPoint = (angle) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  })

  const makeArc = (fromAngle, toAngle) => {
    const start = arcPoint(fromAngle)
    const end = arcPoint(toAngle)
    const largeArc = toAngle - fromAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  // Arc lengths for strokeDasharray animation
  const totalLength = r * toRad(totalArc)          // ≈ 188.5
  const fillLength = (clampedScore / 7) * totalLength

  useEffect(() => {
    setDisplayScore(0)

    const ctx = gsap.context(() => {
      // Animate the arc strokeDashoffset: starts hidden, fills to target
      if (arcRef.current && clampedScore > 0) {
        gsap.fromTo(
          arcRef.current,
          { strokeDashoffset: totalLength },
          {
            strokeDashoffset: totalLength - fillLength,
            duration: 1.2,
            ease: 'power3.out',
            delay: 0.2,
          }
        )
      }

      // Count-up animation for the score number
      const counter = { val: 0 }
      gsap.to(counter, {
        val: clampedScore,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.2,
        onUpdate() {
          setDisplayScore(Math.round(counter.val))
        },
      })
    })

    return () => ctx.revert()
  }, [clampedScore]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
        {/* Background track */}
        <path
          d={makeArc(startAngle, endAngle)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Animated fill arc — uses full-arc path + dashoffset reveal */}
        {clampedScore > 0 && (
          <path
            ref={arcRef}
            d={makeArc(startAngle, endAngle)}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={totalLength}
            strokeDashoffset={totalLength}
          />
        )}
        {/* Score number */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          fill={color}
        >
          {displayScore}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fontWeight="500"
          fill="#64748b"
          fontFamily="Inter, system-ui, sans-serif"
        >
          VON 7
        </text>
        {/* Min / Max labels */}
        <text x={cx - r - 4} y={cy + 22} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter, sans-serif">0</text>
        <text x={cx + r + 4} y={cy + 22} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter, sans-serif">7</text>
      </svg>

      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">Empfohlene Positionsgröße: <span className="font-mono font-medium">{posSize}</span></p>
      </div>
    </div>
  )
}
