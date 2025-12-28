import { formatDate } from "./dates.js";

window.toggleCalDropdown = function (idx, btnEl, event) {
  if (event) {
    event.stopPropagation();
  }

  const dropdownId = `cal-dropdown-${idx}`;
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains("hidden");

  document.querySelectorAll('[id^="cal-dropdown-"]').forEach((el) => {
    el.classList.add("hidden");
  });
  document.querySelectorAll(".conference-card").forEach((card) => {
    card.classList.remove("z-20");
  });

  if (isHidden) {
    dropdown.classList.remove("hidden");
    const card = btnEl.closest(".conference-card");
    if (card) {
      card.classList.add("z-20");
    }
  } else {
    dropdown.classList.add("hidden");
  }
};

export function renderCalendarLinks(conf, idx) {
  const startStr = conf["Start Date"];
  if (!startStr) return "";

  const endStr = conf["End Date"] || startStr;

  function parseYmd(str) {
    const [y, m, d] = (str || "").split("-").map(Number);
    if (!y || !m || !d) return null;
    return { y, m, d };
  }

  function ymdCompact({ y, m, d }) {
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}${mm}${dd}`;
  }

  function toYmd({ y, m, d }) {
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  function addDays(parts, days) {
    const dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
    return {
      y: dt.getUTCFullYear(),
      m: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
    };
  }

  const startParts = parseYmd(startStr);
  const endParts = parseYmd(endStr) || startParts;

  if (!startParts || !endParts) {
    return "";
  }

  const startYmdCompact = ymdCompact(startParts);
  const endInclusiveYmdCompact = ymdCompact(endParts);

  const endExclusiveParts = addDays(endParts, 1);
  const endExclusiveYmdCompact = ymdCompact(endExclusiveParts);
  const outlookEndExclusiveStr = toYmd(endExclusiveParts);

  const title = conf.Subject || "Untitled Conference";
  const location = conf.Location || "";

  let details = "";
  if (conf.Venue) details += "Venue: " + conf.Venue + "\n";
  if (conf["Website URL"]) details += "Website: " + conf["Website URL"] + "\n";
  if (conf.Location) details += "Location: " + conf.Location + "\n";

  const excludeFields = new Set([
    "Subject",
    "Start Date",
    "End Date",
    "Venue",
    "Website URL",
    "Location",
    "Country",
    "_startDateObj",
    "_endDateObj",
    "year",
  ]);

  Object.keys(conf).forEach((key) => {
    const value = conf[key];
    if (!value) return;

    if (key.startsWith("__")) return;
    if (excludeFields.has(key)) return;

    let displayValue = value;

    if (/deadline/i.test(key)) {
      const formatted = formatDate(value);
      if (formatted) {
        displayValue = formatted;
      }
    }

    details += `${key}: ${displayValue}\n`;
  });

  const description = encodeURIComponent(details.trim());
  const titleEnc = encodeURIComponent(title);
  const locationEnc = encodeURIComponent(location);

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${titleEnc}` +
    `&dates=${startYmdCompact}/${endExclusiveYmdCompact}` +
    (description ? `&details=${description}` : "") +
    (location ? `&location=${locationEnc}` : "");

  const outlookUrl =
    `https://outlook.live.com/calendar/deeplink/compose` +
    `?path=/calendar/action/compose` +
    `&rru=addevent` +
    `&allday=true` +
    `&startdt=${encodeURIComponent(startStr)}` +
    `&enddt=${encodeURIComponent(outlookEndExclusiveStr)}` +
    `&subject=${titleEnc}` +
    (description ? `&body=${description}` : "") +
    (location ? `&location=${locationEnc}` : "");

  const yahooUrl =
    `https://calendar.yahoo.com/` +
    `?v=60` +
    `&TITLE=${titleEnc}` +
    `&ST=${startYmdCompact}` +
    `&ET=${endInclusiveYmdCompact}` +
    (description ? `&DESC=${description}` : "") +
    (location ? `&in_loc=${locationEnc}` : "");

  const icsId = `download-ics-${idx}`;

  return `
        <div class="relative inline-block">
            <button
                class="calendar-toggle-btn text-xs text-purple-700 dark:text-purple-300 underline cursor-pointer hover:text-purple-900 dark:hover:text-purple-100 transition-colors ml-2"
                onclick="window.toggleCalDropdown(${idx}, this, event)"
                title="Add to Calendar"
            >
                Add to Calendar ▼
            </button>
            <div id="cal-dropdown-${idx}" class="absolute z-10 left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg py-1 w-40 hidden">
                <a href="${googleUrl}" target="_blank" rel="noopener" class="block px-4 py-1 text-sm hover:bg-purple-50 dark:hover:bg-slate-700">Google Calendar</a>
                <a href="${outlookUrl}" target="_blank" rel="noopener" class="block px-4 py-1 text-sm hover:bg-purple-50 dark:hover:bg-slate-700">Outlook</a>
                <a href="${yahooUrl}" target="_blank" rel="noopener" class="block px-4 py-1 text-sm hover:bg-purple-50 dark:hover:bg-slate-700">Yahoo</a>
                <a href="#" id="${icsId}" class="block px-4 py-1 text-sm hover:bg-purple-50 dark:hover:bg-slate-700">Download .ics</a>
            </div>
        </div>
    `;
}
