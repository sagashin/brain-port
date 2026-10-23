'use client';

import React from 'react';
import { RadarStats } from '@/lib/brain-logic';

interface RadarChartProps {
  stats: RadarStats;
}

const AXES: { key: keyof RadarStats; label: string; shortDesc: string }[] = [
  { key: 'calculation', label: '計算力', shortDesc: '暗算・お釣り瞬発力' },
  { key: 'memory', label: '記憶力', shortDesc: 'ワーキングメモリ' },
  { key: 'attention', label: '注意力', shortDesc: 'ストループ抑制・集中' },
  { key: 'vocabulary', label: '漢字・語彙', shortDesc: '難読語・四字熟語' },
  { key: 'knowledge', label: '教養・知識', shortDesc: '科学・歴史・時事' },
];

export default function RadarChart({ stats }: RadarChartProps) {
  const size = 280;
  const center = size / 2;
  const radius = 92;

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const levels = [25, 50, 75, 100];

  const dataPoints = AXES.map((axis, i) => getCoordinates(i, stats[axis.key]));
  const polygonPoints = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const totalScore = Math.round(
    (stats.calculation + stats.memory + stats.attention + stats.vocabulary + stats.knowledge) / 5
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`脳力ステータス レーダーチャート 総合指数 ${totalScore}`}
          className="overflow-visible"
        >
          {/* Background pentagonal rings */}
          {levels.map((lvl) => {
            const pts = AXES.map((_, i) => {
              const p = getCoordinates(i, lvl);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(' ');
            return (
              <polygon
                key={lvl}
                points={pts}
                fill="none"
                stroke="rgba(148, 163, 184, 0.16)"
                strokeWidth="1"
              />
            );
          })}

          {/* Axis spokes */}
          {AXES.map((axis, i) => {
            const end = getCoordinates(i, 100);
            return (
              <line
                key={axis.key}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="1"
              />
            );
          })}

          {/* Active stat polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(245, 158, 11, 0.22)"
            stroke="#F59E0B"
            strokeWidth="2.2"
          />

          {/* Vertex nodes & labels */}
          {AXES.map((axis, i) => {
            const pt = dataPoints[i];
            const labelPos = getCoordinates(i, 126);
            return (
              <g key={axis.key}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#F59E0B"
                  stroke="#0B0F17"
                  strokeWidth="1.5"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-200 text-[12px] font-medium"
                >
                  {axis.label}
                </text>
                <text
                  x={labelPos.x}
                  y={labelPos.y + 11}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-amber-400 text-[12px] font-mono font-bold tabular-nums"
                >
                  {stats[axis.key]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stat breakdown list */}
      <div className="w-full space-y-3">
        <div className="flex items-baseline justify-between border-b border-slate-800 pb-2">
          <span className="text-xs text-slate-400">総合ブレイン指数</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">
            {totalScore}
            <span className="text-xs text-slate-500 font-normal ml-1">/ 100</span>
          </span>
        </div>

        <div className="space-y-2.5">
          {AXES.map((axis) => {
            const val = stats[axis.key];
            return (
              <div key={axis.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">
                    {axis.label}
                    <span className="text-slate-500 ml-2 font-normal">{axis.shortDesc}</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-200 font-semibold">
                    {val}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800/90 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, val))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
