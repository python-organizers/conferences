export function getConfDate(conf, key) {
  const cacheKey = `__${key.replace(/\s+/g, "_")}Obj`;

  if (conf[cacheKey] !== undefined) {
    return conf[cacheKey];
  }

  const raw = conf[key];
  if (!raw) {
    conf[cacheKey] = null;
    return null;
  }

  const parts = String(raw).split("-");
  if (parts.length !== 3) {
    conf[cacheKey] = null;
    return null;
  }

  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) {
    conf[cacheKey] = null;
    return null;
  }

  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  conf[cacheKey] = dt;
  return dt;
}

export function getStartDate(conf) {
  return getConfDate(conf, "Start Date");
}

export function getEndDate(conf) {
  return getConfDate(conf, "End Date") || getStartDate(conf);
}

export function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(dateOrStr) {
  if (!dateOrStr) return "";

  let date = dateOrStr;
  if (!(dateOrStr instanceof Date)) {
    const parts = String(dateOrStr).split("-");
    if (parts.length !== 3) return "";
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return "";
    date = new Date(y, m - 1, d);
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
