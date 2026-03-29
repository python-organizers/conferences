const AVAILABLE_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

const state = {
  year: null,
  query: "",
  status: "all",
  country: "all",
  sortKey: "startDate",
  sortDir: "asc",
  rows: [],
};

const el = {
  subtitle: document.getElementById("subtitle"),
  notice: document.getElementById("notice"),
  error: document.getElementById("error"),
  loading: document.getElementById("loading"),
  empty: document.getElementById("empty"),
  tableWrap: document.getElementById("table-wrap"),
  tableBody: document.getElementById("table-body"),
  yearSelect: document.getElementById("year-select"),
  searchInput: document.getElementById("search-input"),
  statusSelect: document.getElementById("status-select"),
  countrySelect: document.getElementById("country-select"),
  sortButtons: Array.from(document.querySelectorAll("button.sort")),
};

init();

async function init() {
  buildYearOptions();
  hydrateStateFromUrl();
  bindEvents();
  await loadYear(state.year);
}

function buildYearOptions() {
  const years = [...AVAILABLE_YEARS].sort((a, b) => b - a);
  for (const year of years) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    el.yearSelect.append(option);
  }
}

function hydrateStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const nowYear = new Date().getFullYear();
  const yearFromUrl = Number(params.get("year"));

  if (AVAILABLE_YEARS.includes(yearFromUrl)) {
    state.year = yearFromUrl;
  } else if (AVAILABLE_YEARS.includes(nowYear)) {
    state.year = nowYear;
  } else {
    state.year = Math.max(...AVAILABLE_YEARS);
  }

  state.query = (params.get("q") || "").trim();
  state.status = ["all", "upcoming", "ongoing", "past"].includes(params.get("status"))
    ? params.get("status")
    : "all";
  state.country = (params.get("country") || "all").trim() || "all";
  state.sortKey = ["subject", "startDate", "endDate", "status", "country"].includes(params.get("sort"))
    ? params.get("sort")
    : "startDate";
  state.sortDir = params.get("dir") === "desc" ? "desc" : "asc";

  el.yearSelect.value = String(state.year);
  el.searchInput.value = state.query;
  el.statusSelect.value = state.status;
  setSortIndicators();
}

function bindEvents() {
  el.yearSelect.addEventListener("change", async (event) => {
    state.year = Number(event.target.value);
    await loadYear(state.year);
  });

  el.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    render();
    syncUrl();
  });

  el.statusSelect.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
    syncUrl();
  });

  el.countrySelect.addEventListener("change", (event) => {
    state.country = event.target.value;
    render();
    syncUrl();
  });

  for (const btn of el.sortButtons) {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sortKey;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      setSortIndicators();
      render();
      syncUrl();
    });
  }
}

async function loadYear(year) {
  showLoading(true);
  setError("");
  setNotice("");

  try {
    const response = await fetch(`${year}.csv`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load data for ${year}.`);
    }

    const text = await response.text();
    const parsed = parseCsv(text).map(normalizeRow).filter((row) => row.subject);
    state.rows = parsed;

    if (!AVAILABLE_YEARS.includes(year)) {
      setNotice(`Year ${year} is not in the available year list.`);
    }

    populateCountryFilter(state.rows);
    render();
    syncUrl();
  } catch (error) {
    state.rows = [];
    render();
    setError(`${error.message} Available years: ${AVAILABLE_YEARS.join(", ")}.`);
  } finally {
    showLoading(false);
  }
}

function parseCsv(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;
  if (!header) {
    return [];
  }

  return dataRows.map((cells) => {
    const obj = {};
    header.forEach((key, index) => {
      obj[key.trim()] = (cells[index] || "").trim();
    });
    return obj;
  });
}

function normalizeRow(raw) {
  const startDate = parseDate(raw["Start Date"]);
  const endDate = parseDate(raw["End Date"]) || startDate;

  return {
    subject: raw.Subject || "",
    startDate,
    endDate,
    startDateLabel: raw["Start Date"] || "",
    endDateLabel: raw["End Date"] || "",
    location: raw.Location || "",
    country: raw.Country || "",
    venue: raw.Venue || "",
    websiteUrl: raw["Website URL"] || "",
    proposalUrl: raw["Proposal URL"] || "",
    sponsorshipUrl: raw["Sponsorship URL"] || "",
    status: computeStatus(startDate, endDate),
  };
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function computeStatus(startDate, endDate) {
  if (!startDate || !endDate) {
    return "unknown";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);

  if (today < startDate) {
    return "upcoming";
  }
  if (today > endDate) {
    return "past";
  }
  return "ongoing";
}

function populateCountryFilter(rows) {
  const previous = state.country;
  const countries = Array.from(new Set(rows.map((row) => row.country).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

  el.countrySelect.innerHTML = '<option value="all">All</option>';
  for (const country of countries) {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    el.countrySelect.append(option);
  }

  state.country = countries.includes(previous) || previous === "all" ? previous : "all";
  el.countrySelect.value = state.country;
}

function render() {
  const filtered = getFilteredRows(state.rows);
  const sorted = sortRows(filtered, state.sortKey, state.sortDir);

  el.tableBody.innerHTML = "";
  for (const row of sorted) {
    el.tableBody.append(renderRow(row));
  }

  el.subtitle.textContent = `${state.year} · ${sorted.length} event${sorted.length === 1 ? "" : "s"}`;

  const hasRows = sorted.length > 0;
  el.empty.classList.toggle("hidden", hasRows);
  el.tableWrap.classList.toggle("hidden", !hasRows);
}

function getFilteredRows(rows) {
  const q = state.query.toLowerCase();

  return rows.filter((row) => {
    const matchesStatus = state.status === "all" || row.status === state.status;
    const matchesCountry = state.country === "all" || row.country === state.country;
    const matchesQuery =
      q.length === 0 ||
      [row.subject, row.location, row.venue, row.country].join(" ").toLowerCase().includes(q);

    return matchesStatus && matchesCountry && matchesQuery;
  });
}

function sortRows(rows, key, dir) {
  const factor = dir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = getSortValue(a, key);
    const bv = getSortValue(b, key);

    if (av == null && bv == null) {
      return 0;
    }
    if (av == null) {
      return 1;
    }
    if (bv == null) {
      return -1;
    }

    if (av instanceof Date && bv instanceof Date) {
      return (av.getTime() - bv.getTime()) * factor;
    }

    return String(av).localeCompare(String(bv)) * factor;
  });
}

function getSortValue(row, key) {
  switch (key) {
    case "subject":
      return row.subject;
    case "startDate":
      return row.startDate;
    case "endDate":
      return row.endDate;
    case "status":
      return statusSortOrder(row.status);
    case "country":
      return row.country;
    default:
      return row.startDate;
  }
}

function statusSortOrder(status) {
  const order = { ongoing: 0, upcoming: 1, past: 2, unknown: 3 };
  return order[status] ?? 99;
}

function renderRow(row) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${escapeHtml(row.subject)}</td>
    <td>${escapeHtml(row.startDateLabel)}</td>
    <td>${escapeHtml(row.endDateLabel)}</td>
    <td>${renderStatusBadge(row.status)}</td>
    <td>${escapeHtml(row.country)}</td>
    <td>${escapeHtml(row.location)}</td>
    <td>${escapeHtml(row.venue)}</td>
    <td>${renderLinks(row)}</td>
  `;
  return tr;
}

function renderStatusBadge(status) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const cls = `badge badge-${status}`;
  return `<span class="${cls}" aria-label="Status: ${label}">${label}</span>`;
}

function renderLinks(row) {
  const links = [
    ["Website", row.websiteUrl],
    ["CFP", row.proposalUrl],
    ["Sponsor", row.sponsorshipUrl],
  ].filter((item) => item[1]);

  if (links.length === 0) {
    return "";
  }

  const items = links
    .map(([label, href]) => `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    .join("");
  return `<div class="links">${items}</div>`;
}

function setSortIndicators() {
  for (const btn of el.sortButtons) {
    if (btn.dataset.sortKey === state.sortKey) {
      btn.dataset.sortDir = state.sortDir;
      btn.setAttribute("aria-sort", state.sortDir === "asc" ? "ascending" : "descending");
    } else {
      btn.dataset.sortDir = "";
      btn.removeAttribute("aria-sort");
    }
  }
}

function syncUrl() {
  const params = new URLSearchParams();
  params.set("year", String(state.year));

  if (state.query) {
    params.set("q", state.query);
  }
  if (state.status !== "all") {
    params.set("status", state.status);
  }
  if (state.country !== "all") {
    params.set("country", state.country);
  }
  if (state.sortKey !== "startDate") {
    params.set("sort", state.sortKey);
  }
  if (state.sortDir !== "asc") {
    params.set("dir", state.sortDir);
  }

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", nextUrl);
}

function showLoading(isLoading) {
  el.loading.classList.toggle("hidden", !isLoading);
}

function setNotice(message) {
  el.notice.textContent = message;
  el.notice.classList.toggle("hidden", !message);
}

function setError(message) {
  el.error.textContent = message;
  el.error.classList.toggle("hidden", !message);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
