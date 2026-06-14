const DATA_URL = "./data/export_data.json";

const state = {
  grain: "monthly",
  metric: "quantity_mkg",
  mode: "raw",
  selected: null,
  selectedYears: new Set(),
  data: null,
};

const metricOptions = [
  { id: "quantity_mkg", label: "ปริมาณ", unit: "ล้านกก.", raw: "quantity_kg" },
  { id: "value_mbaht", label: "มูลค่า", unit: "ล้านบาท", raw: "value_baht" },
  { id: "asp_baht_per_kg", label: "ASP", unit: "บาท/กก.", raw: null },
];

const grainOptions = [
  { id: "monthly", label: "รายเดือน" },
  { id: "quarterly", label: "รายไตรมาส" },
  { id: "yearly", label: "รายปี" },
];

const modeByGrain = {
  monthly: [
    { id: "raw", label: "Raw" },
    { id: "mom", label: "MoM" },
    { id: "yoy", label: "YoY" },
  ],
  quarterly: [
    { id: "raw", label: "Raw" },
    { id: "qoq", label: "QoQ" },
    { id: "yoy", label: "YoY" },
  ],
  yearly: [{ id: "yoy", label: "YoY" }],
};

const colors = [
  "#2864c8",
  "#16835b",
  "#b87400",
  "#6b55c7",
  "#c04b7a",
  "#127c8c",
  "#8a6a2d",
  "#506070",
];

const el = {
  freshness: document.getElementById("freshness"),
  sourceChip: document.getElementById("sourceChip"),
  grainControls: document.getElementById("grainControls"),
  yearControls: document.getElementById("yearControls"),
  metricControls: document.getElementById("metricControls"),
  modeControls: document.getElementById("modeControls"),
  kpis: document.getElementById("kpis"),
  chartTitle: document.getElementById("chartTitle"),
  chartSubtitle: document.getElementById("chartSubtitle"),
  chart: document.getElementById("chart"),
  legend: document.getElementById("legend"),
  tooltip: document.getElementById("tooltip"),
  pointDetail: document.getElementById("pointDetail"),
  tableTitle: document.getElementById("tableTitle"),
  tableSubtitle: document.getElementById("tableSubtitle"),
  dataTable: document.getElementById("dataTable"),
  methodText: document.getElementById("methodText"),
  downloadCsv: document.getElementById("downloadCsv"),
};

function fmtNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtCompact(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  const cls = value >= 0 ? "positive" : "negative";
  return `<span class="${cls}">${(value * 100).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%</span>`;
}

function textPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function metric() {
  return metricOptions.find((item) => item.id === state.metric);
}

function availableYears() {
  if (!state.data) return [];
  return [...new Set(state.data.monthly.map((row) => Number(row.year_be)))].sort((a, b) => a - b);
}

function selectedYearsSorted() {
  return [...state.selectedYears].sort((a, b) => a - b);
}

function selectedYearLabel() {
  const years = availableYears();
  const selected = selectedYearsSorted();
  if (selected.length === years.length) return "ทุกปี";
  if (selected.length === 1) return `ปี ${selected[0]}`;
  return `ปี ${selected.join(", ")}`;
}

function ensureSelectedYears() {
  const years = availableYears();
  const valid = new Set(years);
  const current = selectedYearsSorted().filter((year) => valid.has(year));
  state.selectedYears = new Set(current.length ? current : years);
}

function rowsForGrain(options = {}) {
  const { filtered = true } = options;
  const rows = state.data[state.grain] || [];
  if (!filtered) return rows;
  return rows.filter((row) => state.selectedYears.has(Number(row.year_be)));
}

function valueField() {
  return state.mode === "raw" ? state.metric : `${state.metric}_${state.mode}`;
}

function valueLabel() {
  const m = metric();
  if (state.mode === "raw") return `${m.label} (${m.unit})`;
  return `${m.label} ${state.mode.toUpperCase()}`;
}

function renderControls() {
  renderSegment(el.grainControls, grainOptions, state.grain, (id) => {
    state.grain = id;
    const allowed = modeByGrain[id].map((item) => item.id);
    state.mode = allowed.includes(state.mode) ? state.mode : allowed[0];
    state.selected = null;
    render();
  });

  renderYearControls();

  renderSegment(el.metricControls, metricOptions, state.metric, (id) => {
    state.metric = id;
    state.selected = null;
    render();
  });

  renderSegment(el.modeControls, modeByGrain[state.grain], state.mode, (id) => {
    state.mode = id;
    state.selected = null;
    render();
  });
}

function renderYearControls() {
  const years = availableYears();
  const selected = state.selectedYears;
  const allSelected = years.length > 0 && selected.size === years.length;
  el.yearControls.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.className = "segment";
  allButton.type = "button";
  allButton.textContent = "All";
  allButton.title = "แสดงทุกปี";
  allButton.setAttribute("aria-pressed", String(allSelected));
  allButton.addEventListener("click", () => {
    state.selectedYears = new Set(years);
    state.selected = null;
    render();
  });
  el.yearControls.appendChild(allButton);

  years.forEach((year) => {
    const button = document.createElement("button");
    button.className = "segment";
    button.type = "button";
    button.textContent = String(year);
    button.title = `แสดง/ซ่อนปี ${year}`;
    button.setAttribute("aria-pressed", String(selected.has(year)));
    button.addEventListener("click", () => {
      const next = new Set(state.selectedYears);
      if (next.size === years.length && next.has(year)) {
        next.clear();
        next.add(year);
      } else if (next.has(year)) {
        if (next.size === 1) return;
        next.delete(year);
      } else {
        next.add(year);
      }
      state.selectedYears = next;
      state.selected = null;
      render();
    });
    el.yearControls.appendChild(button);
  });
}

function renderSegment(container, options, active, handler) {
  container.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "segment";
    button.type = "button";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(option.id === active));
    button.addEventListener("click", () => handler(option.id));
    container.appendChild(button);
  });
}

function renderFreshness() {
  const meta = state.data.metadata;
  el.freshness.textContent = `ข้อมูลล่าสุด ${meta.latest_month_name_th} ${meta.latest_year_be} · coverage ${meta.coverage}`;
  el.sourceChip.textContent = `MOC HS ${meta.hscode}`;
}

function renderKpis() {
  const monthly = state.data.monthly;
  const latestMonth = monthly[monthly.length - 1];
  const completeQuarter = [...state.data.quarterly].reverse().find((row) => row.is_complete);
  const completeYear = [...state.data.yearly].reverse().find((row) => row.is_complete);
  const latestQuarter = state.data.quarterly[state.data.quarterly.length - 1];

  const cards = [
    {
      label: `เดือนล่าสุด ${latestMonth.period_label}`,
      value: `${fmtNumber(latestMonth.quantity_mkg, 1)} ล้านกก.`,
      sub: `มูลค่า ${fmtNumber(latestMonth.value_mbaht, 1)} ล้านบาท · YoY ${textPct(latestMonth.quantity_mkg_yoy)}`,
    },
    {
      label: `ASP เดือนล่าสุด`,
      value: `${fmtNumber(latestMonth.asp_baht_per_kg, 2)} บาท/กก.`,
      sub: `MoM ${textPct(latestMonth.asp_baht_per_kg_mom)} · YoY ${textPct(latestMonth.asp_baht_per_kg_yoy)}`,
    },
    {
      label: `ไตรมาสล่าสุด ${latestQuarter.period_label}`,
      value: `${fmtNumber(latestQuarter.value_mbaht, 1)} ล้านบาท`,
      sub: latestQuarter.is_complete
        ? `ครบไตรมาส · QoQ ${textPct(latestQuarter.value_mbaht_qoq)}`
        : `partial: ${latestQuarter.months_in_period.map((m) => monthName(m)).join(", ")}`,
    },
    {
      label: `ปีล่าสุดครบ ${completeYear.period_label}`,
      value: `${fmtNumber(completeYear.value_mbaht, 0)} ล้านบาท`,
      sub: `YoY ${textPct(completeYear.value_mbaht_yoy)} · ${completeQuarter.period_label} complete`,
    },
  ];

  el.kpis.innerHTML = cards
    .map(
      (card) => `
        <article class="kpi">
          <div class="kpi-label">${card.label}</div>
          <div class="kpi-value">${card.value}</div>
          <div class="kpi-sub">${card.sub}</div>
        </article>
      `,
    )
    .join("");
}

function monthName(month) {
  const names = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return names[month - 1];
}

function xValue(row) {
  if (state.grain === "monthly") return Number(row.month);
  if (state.grain === "quarterly") return Number(row.quarter);
  return Number(row.year_ce);
}

function xLabel(row) {
  if (state.grain === "monthly") return row.month_name_th;
  if (state.grain === "quarterly") return row.quarter_label;
  return String(row.year_be);
}

function seriesKey(row) {
  return state.grain === "yearly" ? "YoY" : String(row.year_be);
}

function buildSeries() {
  const field = valueField();
  const bySeries = new Map();
  rowsForGrain().forEach((row) => {
    const y = row[field];
    if (y === null || y === undefined || Number.isNaN(Number(y))) return;
    const key = seriesKey(row);
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push({ row, x: xValue(row), y: Number(y) });
  });
  return [...bySeries.entries()].map(([key, points], index) => ({
    key,
    color: colors[index % colors.length],
    points: points.sort((a, b) => a.x - b.x),
  }));
}

function renderChart() {
  const series = buildSeries();
  const visibleRows = rowsForGrain();
  el.chartTitle.textContent = `${grainOptions.find((g) => g.id === state.grain).label} · ${valueLabel()}`;
  el.chartSubtitle.textContent =
    state.grain === "monthly"
      ? `หนึ่งเส้นแทนหนึ่งปี · Raw / MoM / YoY · ${selectedYearLabel()}`
      : state.grain === "quarterly"
        ? `หนึ่งเส้นแทนหนึ่งปี · Raw / QoQ / YoY · ${selectedYearLabel()}`
        : `YoY by year · ${selectedYearLabel()}`;

  el.legend.innerHTML = series
    .map(
      (item) => `<span class="legend-item"><span class="legend-swatch" style="background:${item.color}"></span>${item.key}</span>`,
    )
    .join("");

  if (!series.length) {
    el.chart.innerHTML = `<div class="empty-state">No non-null chart values for ${selectedYearLabel()}</div>`;
    const fallbackRow = visibleRows[visibleRows.length - 1] || null;
    state.selected = fallbackRow;
    renderPointDetail(fallbackRow);
    return;
  }

  const rect = el.chart.getBoundingClientRect();
  const width = Math.max(rect.width, 680);
  const height = rect.height || 460;
  const margin = { top: 18, right: 24, bottom: 42, left: 72 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const allPoints = series.flatMap((item) => item.points);
  const yValues = allPoints.map((item) => item.y);
  let minY = Math.min(...yValues);
  let maxY = Math.max(...yValues);
  if (state.mode !== "raw") {
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const pad = (maxY - minY) * 0.12;
  minY -= pad;
  maxY += pad;

  const xDomain =
    state.grain === "monthly"
      ? [1, 12]
      : state.grain === "quarterly"
        ? [1, 4]
        : [Math.min(...allPoints.map((p) => p.x)), Math.max(...allPoints.map((p) => p.x))];

  const xScale = (x) => margin.left + ((x - xDomain[0]) / Math.max(1, xDomain[1] - xDomain[0])) * plotW;
  const yScale = (y) => margin.top + (1 - (y - minY) / (maxY - minY)) * plotH;

  const xTicks =
    state.grain === "monthly"
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : state.grain === "quarterly"
        ? [1, 2, 3, 4]
        : [...new Set(allPoints.map((p) => p.x))].sort((a, b) => a - b);
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) / 4) * i);

  const svgParts = [
    `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`,
    `<g class="axis">`,
    ...yTicks.map((tick) => {
      const y = yScale(tick);
      return `<line class="grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line>
        <text x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${state.mode === "raw" ? fmtCompact(tick) : textPct(tick)}</text>`;
    }),
    `<line class="axis-line" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}"></line>`,
    ...xTicks.map((tick) => {
      const x = xScale(tick);
      const label =
        state.grain === "monthly" ? monthName(tick) : state.grain === "quarterly" ? `Q${tick}` : String(tick + 543);
      return `<text x="${x}" y="${height - margin.bottom + 24}" text-anchor="middle">${label}</text>`;
    }),
    `</g>`,
  ];

  series.forEach((item) => {
    const path = item.points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.x).toFixed(2)} ${yScale(point.y).toFixed(2)}`)
      .join(" ");
    svgParts.push(`<path class="series-line" d="${path}" stroke="${item.color}"></path>`);
    item.points.forEach((point) => {
      const id = point.row.period;
      svgParts.push(
        `<circle class="point ${point.row.is_complete ? "" : "partial"}" data-period="${id}" cx="${xScale(point.x).toFixed(2)}" cy="${yScale(point.y).toFixed(2)}" r="5.5" fill="${item.color}"></circle>`,
      );
    });
  });

  svgParts.push(`</svg>`);
  el.chart.innerHTML = svgParts.join("");
  el.chart.querySelectorAll(".point").forEach((node) => {
    node.addEventListener("mouseenter", showTooltip);
    node.addEventListener("mouseleave", hideTooltip);
    node.addEventListener("mousemove", moveTooltip);
    node.addEventListener("click", () => {
      const row = rowsForGrain().find((item) => item.period === node.dataset.period);
      state.selected = row;
      renderPointDetail(row);
    });
  });

  const selectedVisible = state.selected && visibleRows.some((row) => row.period === state.selected.period);
  const defaultRow = selectedVisible ? state.selected : allPoints[allPoints.length - 1].row;
  state.selected = defaultRow;
  renderPointDetail(defaultRow);
}

function showTooltip(event) {
  const row = rowsForGrain().find((item) => item.period === event.target.dataset.period);
  if (!row) return;
  el.tooltip.innerHTML = `<strong>${row.period_label}</strong><br>${metric().label}: ${
    state.mode === "raw" ? fmtNumber(row[state.metric], 2) + " " + metric().unit : textPct(row[valueField()])
  }<br>ปริมาณ ${fmtNumber(row.quantity_mkg, 2)} ล้านกก.<br>มูลค่า ${fmtNumber(row.value_mbaht, 2)} ล้านบาท`;
  el.tooltip.hidden = false;
  moveTooltip(event);
}

function moveTooltip(event) {
  el.tooltip.style.left = `${event.clientX + 14}px`;
  el.tooltip.style.top = `${event.clientY + 14}px`;
}

function hideTooltip() {
  el.tooltip.hidden = true;
}

function renderPointDetail(row) {
  if (!row) {
    el.pointDetail.innerHTML = "";
    return;
  }
  const status = row.is_complete ? "ครบช่วงเวลา" : `partial: ${row.months_in_period.map((m) => monthName(m)).join(", ")}`;
  const growthRows =
    state.grain === "monthly"
      ? [
          ["MoM", row[`${state.metric}_mom`]],
          ["YoY", row[`${state.metric}_yoy`]],
        ]
      : state.grain === "quarterly"
        ? [
            ["QoQ", row[`${state.metric}_qoq`]],
            ["YoY", row[`${state.metric}_yoy`]],
          ]
        : [["YoY", row[`${state.metric}_yoy`]]];

  el.pointDetail.innerHTML = `
    <div class="status ${row.is_complete ? "" : "partial"}">${status}</div>
    ${detailRow("Period", row.period_label)}
    ${detailRow("ปริมาณ", `${fmtNumber(row.quantity_mkg, 3)} ล้านกก. (${fmtNumber(row.quantity_kg, 0)} kg)`)}
    ${detailRow("มูลค่า", `${fmtNumber(row.value_mbaht, 3)} ล้านบาท (${fmtNumber(row.value_baht, 0)} บาท)`)}
    ${detailRow("ASP", `${fmtNumber(row.asp_baht_per_kg, 2)} บาท/กก.`)}
    ${growthRows.map(([label, value]) => detailRow(`${metric().label} ${label}`, textPct(value))).join("")}
    ${detailRow("Source", row.source_country || "โลก")}
  `;
}

function detailRow(label, value) {
  return `<div class="detail-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function visibleGrowthColumns() {
  if (state.grain === "monthly") return ["mom", "yoy"];
  if (state.grain === "quarterly") return ["qoq", "yoy"];
  return ["yoy"];
}

function renderTable() {
  const rows = [...rowsForGrain()].sort((a, b) => {
    if (state.grain === "monthly") return b.year_ce - a.year_ce || b.month - a.month;
    if (state.grain === "quarterly") return b.year_ce - a.year_ce || b.quarter - a.quarter;
    return b.year_ce - a.year_ce;
  });
  const growthCols = visibleGrowthColumns();
  el.tableTitle.textContent = `${grainOptions.find((g) => g.id === state.grain).label} data`;
  el.tableSubtitle.textContent =
    state.grain === "monthly"
      ? `Raw · MoM · YoY · ${selectedYearLabel()}`
      : state.grain === "quarterly"
        ? `Raw · QoQ · YoY · ${selectedYearLabel()}`
        : `Raw · YoY · ${selectedYearLabel()}`;

  const headers = ["Period", "Status", "ปริมาณ (ล้านกก.)", "มูลค่า (ล้านบาท)", "ASP (บาท/กก.)"].concat(
    growthCols.map((g) => `${metric().label} ${g.toUpperCase()}`),
  );
  const body = rows
    .map((row) => {
      const cells = [
        row.period_label,
        row.is_complete ? "complete" : "partial",
        fmtNumber(row.quantity_mkg, 3),
        fmtNumber(row.value_mbaht, 3),
        fmtNumber(row.asp_baht_per_kg, 2),
        ...growthCols.map((g) => fmtPct(row[`${state.metric}_${g}`])),
      ];
      return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
    })
    .join("");
  el.dataTable.innerHTML = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}

function renderMethod() {
  const meta = state.data.metadata;
  el.methodText.innerHTML = `
    <ul>
      <li>Source: <a href="${meta.source_url}" target="_blank" rel="noreferrer">Thailand Ministry of Commerce Trade Report</a>, HS ${meta.hscode}, country scope ${meta.country_scope}, latest period ${meta.latest_month_name_th} ${meta.latest_year_be}.</li>
      <li>Generated: ${new Date(meta.generated_at).toLocaleString("th-TH")}.</li>
      <li>Monthly model: raw, MoM, YoY. QoQ is stored as null and is not rendered.</li>
      <li>Quarterly model: raw, QoQ, YoY. MoM is stored as null and is not rendered. Incomplete quarters keep QoQ/YoY null.</li>
      <li>Yearly model: chart mode is YoY only. MoM and QoQ are stored as null and are not rendered; incomplete years keep YoY null.</li>
      <li>Year filter: All resets the view to every available year; clicking a year isolates it from the all-years view and then toggles years on/off.</li>
      <li>Workbook reconciliation uses ${meta.workbook_reference || "no workbook reference found"}; MOC live values control the dashboard.</li>
    </ul>
  `;
}

function render() {
  if (!state.data) return;
  ensureSelectedYears();
  if (state.grain === "yearly") state.mode = "yoy";
  renderControls();
  renderFreshness();
  renderKpis();
  renderChart();
  renderTable();
  renderMethod();
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv() {
  const rows = rowsForGrain();
  const growthCols = visibleGrowthColumns();
  const headers = ["period", "period_label", "is_complete", "quantity_mkg", "value_mbaht", "asp_baht_per_kg"].concat(
    growthCols.map((g) => `${state.metric}_${g}`),
  );
  const lines = [headers.join(",")].concat(
    rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sta_rubber_${state.grain}_${state.metric}_${selectedYearsSorted().join("-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener("resize", () => renderChart());
el.downloadCsv.addEventListener("click", downloadCsv);

fetch(DATA_URL)
  .then((response) => response.json())
  .then((data) => {
    state.data = data;
    state.selectedYears = new Set(availableYears());
    render();
  })
  .catch((error) => {
    el.chart.innerHTML = `<div class="empty-state">Could not load data: ${error.message}</div>`;
  });
