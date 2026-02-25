import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { EvaluationRun } from "../../types";

const COLORS = ["#818cf8", "#34d399", "#f59e0b", "#f472b6", "#22d3ee"];

interface MetricsComparisonChartProps {
  runs: EvaluationRun[];
}

export function MetricsComparisonChart({ runs }: MetricsComparisonChartProps) {
  // Radar chart data — normalized metrics (0-1 scale)
  const radarMetrics = ["precision", "recall", "mrr"];
  const radarData = radarMetrics.map((metric) => {
    const item: Record<string, unknown> = { metric: metric.toUpperCase() };
    runs.forEach((run, i) => {
      item[`run${i}`] = (run.metrics as any)[metric];
    });
    return item;
  });

  // Bar chart data — non-normalized metrics
  const barData = runs.map((run, i) => ({
    name: `${run.systemName.slice(0, 16)}${run.id.slice(-4)}`,
    latency: run.metrics.latencyMs,
    tokens: run.metrics.tokenUsage,
    cost: run.metrics.costUsd * 1000, // scale for visibility
    hallucination: run.metrics.hallucinationScore * 100,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Radar: Quality Metrics */}
      <div>
        <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-3">
          Quality Metrics
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#21262d" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#8b949e", fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fill: "#484f58", fontSize: 10 }} />
            {runs.map((run, i) => (
              <Radar
                key={run.id}
                name={`${run.systemName} (${run.id.slice(-4)})`}
                dataKey={`run${i}`}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar: Performance Metrics */}
      <div>
        <div className="text-[11px] text-[#8b949e] uppercase tracking-wider mb-3">
          Performance & Cost
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#8b949e", fontSize: 10 }}
              axisLine={{ stroke: "#21262d" }}
            />
            <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} axisLine={{ stroke: "#21262d" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 8,
                fontSize: 11,
                color: "#c9d1d9",
              }}
            />
            <Bar dataKey="latency" name="Latency (ms)" fill="#818cf8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="hallucination" name="Halluc. (%)" fill="#f472b6" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
