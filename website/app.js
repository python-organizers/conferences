import { getCountryName, countriesPromise } from "./countries.js";
import { getStartDate, getEndDate, getToday, formatDate } from "./dates.js";
import { renderCalendarLinks } from "./calendarLinks.js";

let allConferences = [];
let filteredConferences = [];

function saveFiltersToURL() {
  const params = new URLSearchParams();

  const search = document.getElementById("search-input").value;
  const status = document.getElementById("status-filter").value;
  const year = document.getElementById("year-filter").value;
  const country = document.getElementById("country-filter").value;
  const sort = document.getElementById("sort-filter").value;

  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (year) params.set("year", year);
  if (country) params.set("country", country);
  if (sort && sort !== "date-asc") params.set("sort", sort);

  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", newURL);
}

function loadFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("search")) {
    document.getElementById("search-input").value = params.get("search");
  }
  if (params.has("status")) {
    document.getElementById("status-filter").value = params.get("status");
  } else {
    document.getElementById("status-filter").value = "upcoming";
  }
  if (params.has("year")) {
    document.getElementById("year-filter").value = params.get("year");
  }
  if (params.has("country")) {
    document.getElementById("country-filter").value = params.get("country");
  }
  if (params.has("sort")) {
    document.getElementById("sort-filter").value = params.get("sort");
  }
}

async function loadConferences() {
  try {
    const response = await fetch("conferences.json");
    if (!response.ok) {
      console.error("Failed to load conferences.json", response.status);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("conferences.json is not an array");
      return [];
    }

    const conferences = data.map((row) => ({
      ...row,
      year: String(row.year || (row["Start Date"] || "").slice(0, 4) || ""),
    }));

    console.log(`Total conferences loaded from JSON: ${conferences.length}`);

    const today = getToday();
    conferences.sort((a, b) => {
      const aStart = getStartDate(a);
      const bStart = getStartDate(b);

      if (!aStart && !bStart) return 0;
      if (!aStart) return 1;
      if (!bStart) return -1;

      const aIsUpcoming = aStart >= today;
      const bIsUpcoming = bStart >= today;

      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;

      if (aIsUpcoming && bIsUpcoming) {
        return aStart - bStart;
      } else {
        return bStart - aStart;
      }
    });

    return conferences;
  } catch (err) {
    console.error("Error loading conferences.json", err);
    return [];
  }
}

async function init() {
  await countriesPromise;

  allConferences = await loadConferences();
  filteredConferences = [...allConferences];

  await populateFilters();
  updateStats();

  loadFiltersFromURL();
  applyFilters();
  setupEventListeners();
}

async function populateFilters() {
  const years = [...new Set(allConferences.map((c) => c.year))]
    .filter(Boolean)
    .sort()
    .reverse();
  const yearSelect = document.getElementById("year-filter");
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  const countries = [
    ...new Set(allConferences.map((c) => c.Country).filter((c) => c)),
  ].sort();

  const countrySelect = document.getElementById("country-filter");

  for (const country of countries) {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = await getCountryName(country);
    countrySelect.appendChild(option);
  }
}

function updateStats() {
  const today = getToday();

  const upcomingCount = allConferences.filter((c) => {
    const start = getStartDate(c);
    return start && start >= today;
  }).length;

  const countries = new Set(
    allConferences.map((c) => c.Country).filter((c) => c),
  );
  const years = new Set(allConferences.map((c) => c.year).filter((y) => y));
  const yearsArray = Array.from(years)
    .map((y) => parseInt(y, 10))
    .filter((y) => !isNaN(y));

  document.getElementById("total-events").textContent = allConferences.length;
  document.getElementById("total-countries").textContent = countries.size;
  document.getElementById("upcoming-events").textContent = upcomingCount;

  if (yearsArray.length > 0) {
    document.getElementById("years-span").textContent =
      `${Math.min(...yearsArray)}-${Math.max(...yearsArray)}`;
  } else {
    document.getElementById("years-span").textContent = "N/A";
  }
}

function applyFilters() {
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();
  const yearFilter = document.getElementById("year-filter").value;
  const countryFilter = document.getElementById("country-filter").value;
  const statusFilter = document.getElementById("status-filter").value;
  const sortFilter = document.getElementById("sort-filter").value;
  const today = getToday();

  saveFiltersToURL();

  filteredConferences = allConferences.filter((conf) => {
    if (searchTerm) {
      const searchableText = [
        conf.Subject,
        conf.Location,
        conf.Country,
        conf.Venue,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchTerm)) return false;
    }

    if (yearFilter && conf.year !== yearFilter) return false;

    if (countryFilter && conf.Country !== countryFilter) return false;

    const start = getStartDate(conf);
    if (statusFilter === "upcoming") {
      if (!start || start < today) return false;
    } else if (statusFilter === "past") {
      if (!start || start >= today) return false;
    }

    return true;
  });

  filteredConferences.sort((a, b) => {
    const aStart = getStartDate(a);
    const bStart = getStartDate(b);

    switch (sortFilter) {
      case "date-asc": {
        if (!aStart && !bStart) return 0;
        if (!aStart) return 1;
        if (!bStart) return -1;
        return aStart - bStart;
      }
      case "date-desc": {
        if (!aStart && !bStart) return 0;
        if (!aStart) return 1;
        if (!bStart) return -1;
        return bStart - aStart;
      }
      case "name-asc":
        return (a.Subject || "").localeCompare(b.Subject || "");
      case "name-desc":
        return (b.Subject || "").localeCompare(a.Subject || "");
      default:
        return 0;
    }
  });

  renderConferences();
}

async function renderConferences() {
  const container = document.getElementById("conferences-container");
  document.getElementById("results-count").textContent =
    filteredConferences.length;

  if (filteredConferences.length === 0) {
    const searchTerm = document
      .getElementById("search-input")
      .value.toLowerCase();
    const hasActiveFilters =
      document.getElementById("status-filter").value !== "" ||
      document.getElementById("year-filter").value !== "" ||
      document.getElementById("country-filter").value !== "";

    let matchingBeforeFilters = 0;
    if (hasActiveFilters && searchTerm) {
      matchingBeforeFilters = allConferences.filter((conf) => {
        const searchableText = [
          conf.Subject,
          conf.Location,
          conf.Country,
          conf.Venue,
        ]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchTerm);
      }).length;
    }

    if (hasActiveFilters && allConferences.length > 0) {
      container.innerHTML = `
                <div class="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 rounded-lg shadow-md p-6">
                    <div class="flex items-start gap-3">
                        <div class="text-3xl">⚠️</div>
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">No Results Found</h3>
                            <p class="text-amber-800 dark:text-amber-300 mb-4">
                                ${
                                  matchingBeforeFilters > 0
                                    ? `Found ${matchingBeforeFilters} conference${matchingBeforeFilters !== 1 ? "s" : ""} matching your search, but your filters are hiding them.`
                                    : "Your current filter combination has no matching conferences."
                                }
                            </p>
                            <button id="clear-filters-btn" class="px-4 py-2 bg-amber-500 dark:bg-amber-600 text-white rounded-lg hover:bg-amber-600 dark:hover:bg-amber-700 transition-colors font-medium">
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                </div>
            `;

      document
        .getElementById("clear-filters-btn")
        .addEventListener("click", () => {
          document.getElementById("year-filter").value = "";
          document.getElementById("country-filter").value = "";
          document.getElementById("status-filter").value = "";
          document.getElementById("sort-filter").value = "date-asc";
          applyFilters();
        });
    } else {
      container.innerHTML = `
                <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <div class="text-6xl mb-4">🔍</div>
                    <p class="text-xl text-slate-600 dark:text-slate-300">No conferences found</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Try adjusting your filters</p>
                </div>
            `;
    }
    return;
  }

  const today = getToday();

  const countryNames = {};
  const uniqueCountries = [
    ...new Set(filteredConferences.map((c) => c.Country).filter((c) => c)),
  ];
  await Promise.all(
    uniqueCountries.map(async (code) => {
      countryNames[code] = await getCountryName(code);
    }),
  );

  container.innerHTML = filteredConferences
    .map((conf, idx) => {
      const start = getStartDate(conf);
      const end = getEndDate(conf);
      const isUpcoming = start && start >= today;

      return `
            <div class="conference-card relative bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow p-6 border-l-8 ${
              isUpcoming
                ? "border-green-500"
                : "border-slate-300 dark:border-slate-600"
            } fade-in backdrop-blur-md">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div class="flex-1">
                        <h3 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
                            ${conf.Subject || "Untitled Conference"}
                        </h3>
                        <div class="flex flex-wrap gap-2 mb-3">
                            ${
                              isUpcoming
                                ? '<span class="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-semibold rounded-xl shadow">Upcoming</span>'
                                : ""
                            }
                            ${
                              conf.year
                                ? `<span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-xl shadow">${conf.year}</span>`
                                : ""
                            }
                            ${
                              conf.Country
                                ? `<span class="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-xs font-semibold rounded-xl shadow">${countryNames[conf.Country] || conf.Country}</span>`
                                : ""
                            }
                        </div>
                        <div class="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            ${
                              conf.Location
                                ? `<div class="flex items-start gap-2"><span class="font-medium">📍</span><span>${conf.Location}</span></div>`
                                : ""
                            }
                            ${
                              conf.Venue
                                ? `<div class="flex items-start gap-2"><span class="font-medium">🏢</span><span>${conf.Venue}</span></div>`
                                : ""
                            }
                            ${
                              start
                                ? `<div class="flex items-center gap-2">
                                        <span class="font-medium">📆</span>
                                        <span>${formatDate(start)}${end ? " - " + formatDate(end) : ""}</span>
                                        ${renderCalendarLinks(conf, idx)}
                                   </div>`
                                : ""
                            }
                            ${
                              conf["Talk Deadline"]
                                ? `<div class="flex items-start gap-2"><span class="font-medium">💬</span><span>Talk Deadline: ${formatDate(conf["Talk Deadline"])}</span></div>`
                                : ""
                            }
                            ${
                              conf["Tutorial Deadline"]
                                ? `<div class="flex items-start gap-2"><span class="font-medium">🎓</span><span>Tutorial Deadline: ${formatDate(conf["Tutorial Deadline"])}</span></div>`
                                : ""
                            }
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 items-start md:items-center">
                        ${
                          conf["Website URL"]
                            ? `<a href="${conf["Website URL"]}" target="_blank" class="px-4 py-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600 transition-colors text-sm font-medium whitespace-nowrap">🌐 Website</a>`
                            : ""
                        }
                        ${
                          conf["Proposal URL"]
                            ? `<a href="${conf["Proposal URL"]}" target="_blank" class="px-4 py-2 bg-green-500 text-white rounded-xl shadow hover:bg-green-600 transition-colors text-sm font-medium whitespace-nowrap">📝 Submit Talk</a>`
                            : ""
                        }
                        ${
                          conf["Sponsorship URL"]
                            ? `<a href="${conf["Sponsorship URL"]}" target="_blank" class="px-4 py-2 bg-amber-500 text-white rounded-xl shadow hover:bg-amber-600 transition-colors text-sm font-medium whitespace-nowrap">💰 Sponsor</a>`
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  import("./ical.js").then(({ exportICal }) => {
    filteredConferences.forEach((conf, idx) => {
      const icsId = `download-ics-${idx}`;
      const el = document.getElementById(icsId);
      if (el) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          exportICal(conf);
          const dropdown = document.getElementById(`cal-dropdown-${idx}`);
          if (dropdown) {
            dropdown.classList.add("hidden");
          }
        });
      }
    });
  });
}

function setupEventListeners() {
  document
    .getElementById("search-input")
    .addEventListener("input", applyFilters);
  document
    .getElementById("year-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("country-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("status-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("sort-filter")
    .addEventListener("change", applyFilters);

  document.getElementById("reset-filters").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    document.getElementById("year-filter").value = "";
    document.getElementById("country-filter").value = "";
    document.getElementById("status-filter").value = "upcoming";
    document.getElementById("sort-filter").value = "date-asc";
    window.history.replaceState({}, "", window.location.pathname);
    applyFilters();
  });

  import("./ical.js").then(({ exportICal }) => {
    document.getElementById("ical-export-btn").addEventListener("click", () => {
      exportICal(filteredConferences);
    });
  });

  const themeSliders = document.querySelectorAll(".theme-slider");
  const navbarIcon = document.getElementById("navbar-theme-icon");
  const floatingIcon = document.getElementById("floating-theme-icon");

  let currentTheme = localStorage.getItem("themePreference") || "system";
  const themeOrder = ["light", "system", "dark"];

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function getThemeIcon(theme) {
    const icons = { light: "☀️", system: "💻", dark: "🌙" };
    return icons[theme];
  }

  function applyTheme(theme) {
    currentTheme = theme;

    themeSliders.forEach((slider) => {
      slider.setAttribute("data-theme", theme);
    });

    const icon = getThemeIcon(theme);
    if (navbarIcon) navbarIcon.textContent = icon;
    if (floatingIcon) floatingIcon.textContent = icon;

    const effectiveTheme = theme === "system" ? getSystemTheme() : theme;

    if (effectiveTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  applyTheme(currentTheme);

  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemThemeQuery.addEventListener("change", () => {
    if (localStorage.getItem("themePreference") === "system") {
      applyTheme("system");
    }
  });

  themeSliders.forEach((slider) => {
    slider.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentIndex = themeOrder.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const newTheme = themeOrder[nextIndex];

      localStorage.setItem("themePreference", newTheme);
      applyTheme(newTheme);
    });
  });

  const scrollToTopBtn = document.getElementById("scroll-to-top");
  const floatingThemeToggle = document.getElementById("floating-theme-toggle");
  const navbarThemeToggle = document.getElementById("navbar-theme-toggle");

  window.addEventListener("scroll", () => {
    const navbarRect = navbarThemeToggle.getBoundingClientRect();
    const navbarOutOfView = navbarRect.bottom < 0;

    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.remove("opacity-0", "invisible");
      scrollToTopBtn.classList.add("opacity-100", "visible");
    } else {
      scrollToTopBtn.classList.add("opacity-0", "invisible");
      scrollToTopBtn.classList.remove("opacity-100", "visible");
    }

    if (navbarOutOfView) {
      floatingThemeToggle.classList.remove("opacity-0", "invisible");
      floatingThemeToggle.classList.add("opacity-100", "visible");
    } else {
      floatingThemeToggle.classList.add("opacity-0", "invisible");
      floatingThemeToggle.classList.remove("opacity-100", "visible");
    }
  });

  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  document.addEventListener("click", (e) => {
    if (
      e.target.closest(".calendar-toggle-btn") ||
      e.target.closest('[id^="cal-dropdown-"]')
    ) {
      return;
    }

    document.querySelectorAll('[id^="cal-dropdown-"]').forEach((el) => {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".conference-card").forEach((card) => {
      card.classList.remove("z-20");
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
