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
  0: '#ff4d6d',
  1: '#ff4d6d',
  2: '#ff6b7a',
  3: '#f97316',
  4: '#eab308',
  5: '#7cffcb',
  6: '#4ae6b0',
  7: '#22d3a0',
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
 */
export default function ConvictionGauge({ score = 0, size = 160 }) {
  const clampedScore = Math.max(0, Math.min(7, Math.round(score)))
  const color   = SCORE_COLORS[clampedScore]
  const label   = SCORE_LABELS[clampedScore]
  const posSize = POSITION_SIZES[clampedScore]

  const arcRef = useRef(null)
  const [displayScore, setDisplayScore] = useState(0)

  const r          = 45
  const cx         = size / 2
  const cy         = size / 2 + 10
  const startAngle = -210
  const endAngle   = 30
  const totalArc   = 240

  const toRad = (deg) => (deg * Math.PI) / 180
  const arcPoint = (angle) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  })
  const makeArc = (fromAngle, toAngle) => {
    const start    = arcPoint(fromAngle)
    const end      = arcPoint(toAngle)
    const largeArc = toAngle - fromAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  const totalLength = r * toRad(totalArc)
  const fillLength  = (clampedScore / 7) * totalLength

  useEffect(() => {
    setDisplayScore(0)
    const ctx = gsap.context(() => {
      if (arcRef.current && clampedScore > 0) {
        gsap.fromTo(
          arcRef.current,
          { strokeDashoffset: totalLength },
          { strokeDashoffset: totalLength - fillLength, duration: 1.2, ease: 'power3.out', delay: 0.2 }
        )
      }
      const counter = { val: 0 }
      gsap.to(counter, {
        val: clampedScore,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.2,
        onUpdate() { setDisplayScore(Math.round(counter.val)) },
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
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Animated fill arc */}
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
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        )}
        {/* Score number */}
        <text
          x={cx} y={cy - 6}
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
          x={cx} y={cy + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fontWeight="500"
          fill="#6b7599"
          fontFamily="Satoshi, system-ui, sans-serif"
        >
          VON 7
        </text>
        {/* Min / Max labels */}
        <text x={cx - r - 4} y={cy + 22} textAnchor="middle" fontSize="9" fill="#6b7599" fontFamily="Satoshi, sans-serif">0</text>
        <text x={cx + r + 4} y={cy + 22} textAnchor="middle" fontSize="9" fill="#6b7599" fontFamily="Satoshi, sans-serif">7</text>
      </svg>

      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Empfohlene Positionsgröße: <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{posSize}</span>
        </p>
      </div>
    </div>
  )
}
