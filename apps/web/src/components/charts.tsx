"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { compact, number } from "@/lib/format";
import type { MarketOverview, Property } from "@/lib/types";
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  borderColor: "var(--border)",
  borderRadius: "10px",
  fontSize: "12px",
  boxShadow: "0 4px 16px #00000010",
};
export function PriceBars({
  data,
  height = 240,
}: {
  data: { name: string; price: number }[];
  height?: number;
}) {
  return (
    <div
      style={{ height }}
      className="min-w-0 w-full"
      role="img"
      aria-label={data
        .map((item) => `${item.name}: ${number(item.price)} source price units`)
        .join(". ")}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
          barSize={46}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tickMargin={12}
          />
          <YAxis tickFormatter={compact} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            formatter={(value) => [number(Number(value)), "Price"]}
          />
          <Bar dataKey="price" radius={[5, 5, 0, 0]}>
            {data.map((item, i) => (
              <Cell key={item.name} fill={`var(--chart-${(i % 4) + 1})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AreaPriceChart({ properties }: { properties: Property[] }) {
  return (
    <div
      className="h-[255px] min-w-0 w-full"
      role="img"
      aria-label="Scatter chart of floor area versus observed price, grouped by bedroom count"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ScatterChart margin={{ top: 15, right: 15, bottom: 18, left: -15 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="square_footage"
            name="Floor area"
            unit=" sq ft"
            domain={["dataMin - 100", "dataMax + 100"]}
            tickFormatter={(v) => number(Number(v))}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Observed price"
            tickFormatter={compact}
            domain={["dataMin - 15000", "dataMax + 15000"]}
            axisLine={false}
            tickLine={false}
          />
          <ZAxis range={[38, 38]} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name) => [number(Number(value)), name]}
          />
          {[...new Set(properties.map((p) => p.bedrooms))]
            .sort()
            .map((bedrooms, index) => (
              <Scatter
                key={bedrooms}
                name={`${bedrooms} bedrooms`}
                data={properties.filter((p) => p.bedrooms === bedrooms)}
                fill={`var(--chart-${index + 1})`}
                fillOpacity={0.85}
              />
            ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
export function DistributionChart({
  data,
}: {
  data: MarketOverview["distribution"];
}) {
  return (
    <div
      className="h-[230px] min-w-0 w-full"
      role="img"
      aria-label={`Property price distribution: ${data.map((item) => `${item.label}: ${item.count} properties`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ left: -28, right: 5, bottom: 0, top: 12 }}
          barCategoryGap="24%"
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={12}
          />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--muted)" }}
            formatter={(value) => [number(Number(value)), "Properties"]}
          />
          <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
