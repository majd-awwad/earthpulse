const tag = "earthpulse.decode/2";
const relations = new Set(["SAME_DATA", "SAME_MODEL_DIFFERENT_RUN", "RELATED_CONTEXT"]);
const behaviors = { dust: "continuous", smoke: "continuous", lightning: "intermittent", fires: "intermittent" };
const text = value => typeof value === "string" && value.trim().length > 0;
const finite = value => typeof value === "number" && Number.isFinite(value);
const close = (a, b) => Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(b));
const url = value => typeof value === "string" && URL.canParse(value) && new URL(value).protocol === "https:";

function require(ok, field) {
  if (!ok) throw new TypeError(`Invalid DecodeCase v2: ${field}`);
}

function utc(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace(".000Z", "Z") === value.replace(".000Z", "Z");
}

function validateGrid(grid, level, bounds, behavior) {
  const rows = level === "quick" ? 3 : 6;
  const cols = level === "quick" ? 4 : 8;
  require(grid?.rows === rows && grid.cols === cols && Array.isArray(grid.cells) &&
    grid.cells.length === rows * cols, `levels.${level} dimensions`);
  const prefix = `levels.${level}`;
  const truth = grid.truth;
  require(truth?.rule === "value >= threshold" && finite(truth.threshold) && truth.threshold >= 0 &&
    Array.isArray(truth.present), `${prefix}.truth rule, threshold or present`);
  const expected = [];
  for (const [index, cell] of grid.cells.entries()) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const field = `${prefix}.cells[${index}]`;
    require(cell?.row === row && cell.col === col, `${field} row-major coordinates`);
    require(finite(cell.lat) && finite(cell.lon) &&
      close(cell.lat, bounds.north - (row + 0.5) * (bounds.north - bounds.south) / rows) &&
      close(cell.lon, bounds.west + (col + 0.5) * (bounds.east - bounds.west) / cols), `${field} WGS84 center`);
    const { value, status } = cell;
    require(["missing", "measured", "below_threshold"].includes(status) &&
      (status === "missing" ? value === null : finite(value) && value >= 0), `${field} value/status`);
    if (behavior === "intermittent" && status !== "missing") {
      require(Number.isSafeInteger(cell.eventCount) && cell.eventCount === value, `${field}.eventCount`);
    } else {
      require(!Object.hasOwn(cell, "eventCount"), `${field}.eventCount must be absent`);
    }
    if (status === "missing") continue;
    require(status === (value >= truth.threshold ? "measured" : "below_threshold"), `${field} threshold status`);
    if (value >= truth.threshold) expected.push([row, col]);
  }
  const key = ([row, col]) => row * cols + col;
  require(truth.present.length === expected.length && truth.present.every(pair =>
    Array.isArray(pair) && pair.length === 2 && Number.isInteger(pair[0]) && Number.isInteger(pair[1]) &&
    pair[0] >= 0 && pair[0] < rows && pair[1] >= 0 && pair[1] < cols), `${prefix}.truth.present cells`);
  const supplied = new Set(truth.present.map(key));
  require(expected.every(pair => supplied.has(key(pair))), `${prefix}.truth.present does not match the rule`);
}

export function validateDecodeCase(json) {
  require(json?.schema === tag, `schema must be ${tag}`);
  require(text(json.id) && typeof json.fixture === "boolean" && text(json.unit), "id, fixture or unit");
  require(Object.hasOwn(behaviors, json.phenomenon) && json.behavior === behaviors[json.phenomenon], "phenomenon or behavior");
  const { source, visualLink, bounds, levels, behavior } = json;
  require(text(source?.product) && text(source.version) && Array.isArray(source.granules) &&
    source.granules.length > 0 && source.granules.every(text), "source metadata");
  require((json.fixture && source.url === "") || url(source.url), "source.url");
  require(source.doi === undefined || text(source.doi), "source.doi");
  require(utc(source.time?.start) && utc(source.time?.end) &&
    Date.parse(source.time.start) < Date.parse(source.time.end), "source.time UTC interval");
  require(relations.has(visualLink?.relation) && text(visualLink.note), "visualLink.relation or note");
  if (json.fixture) {
    require(/^synthetic test fixture\b/i.test(source.product) && visualLink.relation === "RELATED_CONTEXT" &&
      visualLink.svs === "" && visualLink.image === "", "fixture provenance must be explicitly synthetic");
  } else {
    require(url(visualLink.svs) && text(visualLink.image), "visualLink source or image");
  }
  require(bounds && [bounds.north, bounds.south, bounds.east, bounds.west].every(finite) &&
    bounds.south >= -90 && bounds.north <= 90 && bounds.south < bounds.north &&
    bounds.west >= -180 && bounds.east <= 180 && bounds.west < bounds.east, "bounds");
  validateGrid(levels?.advanced, "advanced", bounds, behavior);
  validateGrid(levels?.quick, "quick", bounds, behavior);
  const { advanced, quick } = levels;
  const method = behavior === "continuous" ? "mean of 2x2 advanced cells" : "sum of 2x2 advanced cells";
  require(text(advanced.aggregation) && quick.aggregation === method, "levels aggregation");
  require(quick.truth.threshold === advanced.truth.threshold, "truth.threshold must match across levels");
  for (const { row, col, value } of quick.cells) {
    const index = row * 16 + col * 2;
    const children = [index, index + 1, index + 8, index + 9].map(i => advanced.cells[i].value);
    const divisor = behavior === "continuous" ? 4 : 1;
    const aggregate = children.includes(null) ? null : children.reduce((sum, child) => sum + child / divisor, 0);
    const agrees = aggregate === null ? value === null : value !== null &&
      (behavior === "continuous" ? Number.isFinite(aggregate) && close(value, aggregate) : value === aggregate);
    require(agrees, `levels.quick.cells[${row * 4 + col}] does not match 2x2 aggregation`);
  }
  return json;
}
