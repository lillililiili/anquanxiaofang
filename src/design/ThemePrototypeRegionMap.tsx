import { useId, useState } from "react";
import { MapPin } from "lucide-react";
import boundary from "../data/shandong-cities.json";
import { regionalRiskSamples, type RegionalRiskLevel } from "../data/mockData";
import "./theme-prototype-region-map.css";

// Offline administrative boundaries: https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json
// Project longitude / Mercator latitude to one shared viewport, preserving relative geography.
const viewWidth = 640;
const viewHeight = 340;
const toMercator = ([lon, lat]: number[]) => [lon * Math.PI / 180, -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
const projectedPoints = boundary.features.flatMap(feature => feature.geometry.coordinates.flat(2).map(toMercator));
const xs = projectedPoints.map(point => point[0]);
const ys = projectedPoints.map(point => point[1]);
const bounds = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
const scale = Math.min((viewWidth - 36) / (bounds.right - bounds.left), (viewHeight - 32) / (bounds.bottom - bounds.top));
const project = (position: number[]) => {
  const [x, y] = toMercator(position);
  return [viewWidth / 2 + (x - (bounds.left + bounds.right) / 2) * scale, viewHeight / 2 + (y - (bounds.top + bounds.bottom) / 2) * scale];
};
const cities = boundary.features.map(feature => ({
  name: feature.properties.name,
  center: project(feature.properties.centroid),
  path: feature.geometry.coordinates.map(polygon => polygon.map(ring => ring.map((position, index) => {
    const [x, y] = project(position);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + "Z").join(" ")).join(" "),
}));

const riskTones: Record<RegionalRiskLevel, { fill: string; ink: string }> = {
  高风险: { fill: "#f6b9be", ink: "#a83d49" },
  较高风险: { fill: "#f8cba9", ink: "#a35b20" },
  中风险: { fill: "#f8e1af", ink: "#8c681c" },
  低风险: { fill: "#c4e2d5", ink: "#287654" },
};
const counts = ["#e0efee", "#acd6d2", "#68b5b3", "#287f91"];
const countBand = (value: number) => value <= 3 ? 0 : value <= 6 ? 1 : value <= 9 ? 2 : 3;
const byCity = new Map(regionalRiskSamples.map(row => [row.name, row]));
const total = regionalRiskSamples.reduce((sum, row) => sum + row.count, 0);

export default function ThemePrototypeRegionMap() {
  const [metric, setMetric] = useState<"risk" | "count">("risk");
  const [selectedCity, setSelectedCity] = useState("济南市");
  const id = useId();
  const selected = byCity.get(selectedCity);

  return <section className="section-card region-risk-card" aria-labelledby={`${id}-title`}>
    <header className="section-card-head">
      <div><div className="eyebrow">REGIONAL RISK</div><h2 id={`${id}-title`}>山东省地市风险分布</h2></div>
      <span className="region-demo-label">演示数据</span>
    </header>
    <div className="region-map-toolbar">
      <p><strong>{regionalRiskSamples.length}</strong> 个地市有数据<span>·</span><strong>{total}</strong> 项疑似隐患</p>
      <div className="region-metric-switch" role="group" aria-label="地图展示指标">
        <button type="button" aria-pressed={metric === "risk"} onClick={() => setMetric("risk")}>风险等级</button>
        <button type="button" aria-pressed={metric === "count"} onClick={() => setMetric("count")}>隐患数量</button>
      </div>
    </div>
    <div className="region-map-canvas">
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="group" aria-label={`山东省地市风险地图，按${metric === "risk" ? "风险等级" : "疑似隐患数量"}着色`}>
        <text className="region-sea-label" x="180" y="25" aria-hidden="true">渤 海</text>
        <text className="region-sea-label" x="552" y="278" aria-hidden="true">黄 海</text>
        {cities.map(city => {
          const sample = byCity.get(city.name);
          const fill = sample ? metric === "risk" ? riskTones[sample.risk].fill : counts[countBand(sample.count)] : "#e5ecef";
          const isSelected = selectedCity === city.name;
          return <g key={city.name}>
            <path d={city.path} fill={fill} fillRule="evenodd" className={`region-city ${isSelected ? "is-selected" : ""}`} role="button" tabIndex={0}
              aria-pressed={isSelected} aria-label={`${city.name}，${sample ? `${sample.count} 项疑似隐患，${sample.risk}` : "暂无数据"}`}
              onClick={() => setSelectedCity(city.name)} onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCity(city.name); }
              }}>
              <title>{city.name} · {sample ? `${sample.risk} · ${sample.count} 项疑似隐患` : "暂无数据"}</title>
            </path>
          </g>;
        })}
        <g className="region-map-labels" aria-hidden="true">
          {cities.map(city => {
            const sample = byCity.get(city.name);
            const lightText = metric === "count" && sample && sample.count > 9;
            return <text key={city.name} x={city.center[0]} y={city.center[1] - 3} textAnchor="middle" className={lightText ? "on-dark" : sample ? "" : "no-data"}>
              <tspan x={city.center[0]}>{city.name.replace(/市$/, "")}</tspan>
              <tspan className="region-map-count" x={city.center[0]} dy="15">{sample ? `${sample.count} 项` : "—"}</tspan>
            </text>;
          })}
        </g>
      </svg>
    </div>
    <div className="region-map-legend" aria-label="地图图例">
      {metric === "risk" ? Object.entries(riskTones).map(([name, tone]) => <span key={name}><i style={{ background: tone.fill }} />{name}</span>) :
        ["1–3 项", "4–6 项", "7–9 项", "10 项及以上"].map((label, index) => <span key={label}><i style={{ background: counts[index] }} />{label}</span>)}
      <span><i className="region-no-data-key" />暂无数据</span>
    </div>
    <div className="region-map-detail" aria-live="polite" aria-atomic="true">
      <div className="region-city-picker"><MapPin size={16} aria-hidden="true" /><select aria-label="查看地市风险" value={selectedCity} onChange={event => setSelectedCity(event.target.value)}>
        {cities.map(city => <option key={city.name}>{city.name}</option>)}
      </select></div>
      {selected ? <><span className="region-selected-risk" style={{ color: riskTones[selected.risk].ink, background: riskTones[selected.risk].fill }}>{selected.risk}</span>
        <span className="region-selected-count"><strong>{selected.count}</strong> 项<span>占样例总量 {(selected.count / total * 100).toFixed(1)}%</span></span></> :
        <span className="region-empty-detail">暂无该地市样例数据，暂不评定风险。</span>}
    </div>
    <p className="region-map-note">点击地市查看详情 · 按既有区域样例统计，灰色表示暂无数据</p>
  </section>;
}
