import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { compactNumber } from '@/domain/money';
import { Txt } from '../ui/Txt';

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export interface Slice {
  value: number;
  color: string;
  label?: string;
}

/** Doughnut with a 2px surface gap between slices and an optional centre label. */
export function Doughnut({ slices, size = 128, stroke = 20, centerTop, centerBottom }: { slices: Slice[]; size?: number; stroke?: number; centerTop?: string; centerBottom?: string }) {
  const { colors } = useTheme();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let angle = 0;
  const gapDeg = total > 0 ? (2 / (2 * Math.PI * r)) * 360 : 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {total <= 0 ? (
          <Circle cx={cx} cy={cy} r={r} stroke={colors.surface3} strokeWidth={stroke} fill="none" />
        ) : (
          slices
            .filter((s) => s.value > 0)
            .map((s, i) => {
              const sweep = (s.value / total) * 360;
              const start = angle + gapDeg / 2;
              const end = angle + sweep - gapDeg / 2;
              angle += sweep;
              if (sweep >= 359.9) return <Circle key={i} cx={cx} cy={cy} r={r} stroke={s.color} strokeWidth={stroke} fill="none" />;
              if (end <= start) return null;
              return <Path key={i} d={arcPath(cx, cy, r, start, end)} stroke={s.color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />;
            })
        )}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {centerTop ? <Txt v="caption">{centerTop}</Txt> : null}
        {centerBottom ? <Txt v="h3" tabular>{centerBottom}</Txt> : null}
      </View>
    </View>
  );
}

export function Ring({ value, size = 64, stroke = 8, color, label }: { value: number; size?: number; stroke?: number; color: string; label?: string }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface3} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
      </Svg>
      <Txt v="small" style={{ fontWeight: '800' }}>{label ?? `${Math.round(pct)}%`}</Txt>
    </View>
  );
}

export interface BarGroup {
  label: string;
  values: number[];
  highlight?: boolean;
}

/** Grouped vertical bars with 3 gridlines and compact axis labels. */
export function BarChart({ groups, colors: seriesColors, height = 150, width, valueLabel, indian = true }: { groups: BarGroup[]; colors: string[]; height?: number; width?: number; valueLabel?: (g: BarGroup) => string | undefined; indian?: boolean }) {
  const { colors } = useTheme();
  const [w, setW] = React.useState(width ?? 0);
  const padL = 34;
  const padB = 22;
  const padT = 16;
  const plotH = height - padB - padT;
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const niceMax = niceCeil(max);
  const n = groups.length;
  const plotW = Math.max(0, w - padL);
  const groupW = n > 0 ? plotW / n : 0;
  const series = Math.max(1, ...groups.map((g) => g.values.length));
  const barW = Math.max(4, Math.min(22, (groupW * 0.62) / series));
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  return (
    <View style={{ height }} onLayout={(e) => !width && setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[0, 0.5, 1].map((f) => (
            <G key={f}>
              <Line x1={padL} x2={w} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke={colors.grid} strokeWidth={1} />
              <SvgText x={0} y={y(niceMax * f) + 3.5} fontSize={9.5} fill={colors.ink3} fontWeight="500">{compactNumber(niceMax * f, indian)}</SvgText>
            </G>
          ))}
          {groups.map((g, gi) => {
            const cx = padL + groupW * gi + groupW / 2;
            const totalW = g.values.length * barW + (g.values.length - 1) * 2;
            const label = valueLabel?.(g);
            return (
              <G key={gi}>
                {g.values.map((v, si) => {
                  const x = cx - totalW / 2 + si * (barW + 2);
                  const top = y(v);
                  const h = Math.max(0, padT + plotH - top);
                  return <Rect key={si} x={x} y={top} width={barW} height={h} rx={3} fill={seriesColors[si % seriesColors.length]} opacity={g.highlight === false ? 0.45 : 1} />;
                })}
                {label ? <SvgText x={cx} y={y(Math.max(...g.values)) - 5} fontSize={10} fontWeight="700" fill={colors.ink2} textAnchor="middle">{label}</SvgText> : null}
                <SvgText x={cx} y={height - 6} fontSize={9.5} fill={colors.ink3} textAnchor="middle" fontWeight="500">{g.label}</SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Line with soft area fill; marks and labels the peak. */
export function LineChart({ points, color, height = 140, average, labels, indian = true }: { points: { label: string; value: number }[]; color: string; height?: number; average?: number; labels?: [string, string, string]; indian?: boolean }) {
  const { colors } = useTheme();
  const [w, setW] = React.useState(0);
  const padL = 32;
  const padB = 20;
  const padT = 18;
  const plotH = height - padB - padT;
  const max = Math.max(1, ...points.map((p) => p.value), average ?? 0);
  const niceMax = niceCeil(max);
  const n = points.length;
  const plotW = Math.max(0, w - padL - 6);
  const x = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = n > 0 ? `${d} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z` : '';
  const peakIdx = points.reduce((best, p, i) => (p.value > (points[best]?.value ?? -1) ? i : best), 0);
  const peak = points[peakIdx];
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && n > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.25} />
              <Stop offset="1" stopColor={color} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((f) => (
            <G key={f}>
              <Line x1={padL} x2={w} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke={colors.grid} strokeWidth={1} />
              <SvgText x={0} y={y(niceMax * f) + 3.5} fontSize={9.5} fill={colors.ink3} fontWeight="500">{compactNumber(niceMax * f, indian)}</SvgText>
            </G>
          ))}
          {average !== undefined && average > 0 ? <Line x1={padL} x2={w} y1={y(average)} y2={y(average)} stroke={colors.ink3} strokeDasharray="3 3" strokeWidth={1} /> : null}
          <Path d={area} fill="url(#area)" />
          <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {peak && peak.value > 0 ? (
            <G>
              <Circle cx={x(peakIdx)} cy={y(peak.value)} r={4.5} fill={color} stroke={colors.surface} strokeWidth={2} />
              <SvgText x={Math.min(Math.max(x(peakIdx), padL + 30), w - 30)} y={y(peak.value) - 9} fontSize={10} fontWeight="700" fill={colors.ink2} textAnchor="middle">{`${peak.label} · ${compactNumber(peak.value, indian)}`}</SvgText>
            </G>
          ) : null}
          {labels ? (
            <G>
              <SvgText x={padL} y={height - 4} fontSize={9.5} fill={colors.ink3} fontWeight="500">{labels[0]}</SvgText>
              <SvgText x={padL + plotW / 2} y={height - 4} fontSize={9.5} fill={colors.ink3} textAnchor="middle" fontWeight="500">{labels[1]}</SvgText>
              <SvgText x={padL + plotW} y={height - 4} fontSize={9.5} fill={colors.ink3} textAnchor="end" fontWeight="500">{labels[2]}</SvgText>
            </G>
          ) : null}
        </Svg>
      )}
    </View>
  );
}

/** Horizontal bars with the label on the left and the value at the bar end. */
export function HBarChart({ rows, color, formatValue }: { rows: { label: string; value: number; color?: string }[]; color: string; formatValue: (v: number) => string }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt v="muted" style={{ width: 84 }} numberOfLines={1}>{r.label}</Txt>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, height: 12, borderRadius: 4, backgroundColor: r.color ?? color }} />
            <Txt v="caption" color={colors.ink2} style={{ fontWeight: '700' }} tabular>{formatValue(r.value)}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: it.color }} />
          <Txt v="caption" color={colors.ink2}>{it.label}</Txt>
        </View>
      ))}
    </View>
  );
}

export function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}
