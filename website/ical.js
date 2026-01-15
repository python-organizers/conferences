export function exportICal(confsOrSingle) {
  const confs = Array.isArray(confsOrSingle) ? confsOrSingle : [confsOrSingle];

  function esc(str) {
    return String(str ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  }

  function parseYmd(str) {
    if (!str) return null;
    const [y, m, d] = String(str).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  function toYmd(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  function addDaysUTC(date, days) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  function getStartDate(conf) {
    if (conf._startDateObj instanceof Date) return conf._startDateObj;
    if (conf.__Start_DateObj instanceof Date) return conf.__Start_DateObj;
    return parseYmd(conf["Start Date"]);
  }

  function getEndDate(conf) {
    if (conf._endDateObj instanceof Date) return conf._endDateObj;
    if (conf.__End_DateObj instanceof Date) return conf.__End_DateObj;
    return parseYmd(conf["End Date"]) || getStartDate(conf);
  }

  const exclude = new Set([
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

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Python Conferences//EN",
  ];

  for (const conf of confs) {
    const startDate = getStartDate(conf);
    if (!startDate) continue;

    const endInclusive = getEndDate(conf) || startDate;

    const dtstart = toYmd(startDate);
    const dtend = toYmd(addDaysUTC(endInclusive, 1));

    const subject = conf.Subject || "Untitled Conference";

    const dtstamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

    ical.push("BEGIN:VEVENT");
    ical.push("UID:" + esc(subject) + "-" + dtstart);
    ical.push("DTSTAMP:" + dtstamp);
    ical.push("DTSTART;VALUE=DATE:" + dtstart);
    ical.push("DTEND;VALUE=DATE:" + dtend);
    ical.push("SUMMARY:" + esc(subject));

    const descParts = [];

    if (conf.Venue) descParts.push("Venue: " + conf.Venue);
    if (conf["Website URL"]) descParts.push("Website: " + conf["Website URL"]);

    Object.keys(conf).forEach((key) => {
      if (exclude.has(key)) return;
      if (key.startsWith("__")) return;
      const value = conf[key];
      if (!value) return;
      descParts.push(`${key}: ${value}`);
    });

    if (descParts.length > 0) {
      const desc = esc(descParts.join("\n"));
      ical.push("DESCRIPTION:" + desc);
    }

    if (conf.Location) {
      ical.push("LOCATION:" + esc(conf.Location));
    }

    ical.push("END:VEVENT");
  }

  ical.push("END:VCALENDAR");

  if (ical.length <= 4) {
    console.warn("No valid conferences to export as iCal");
    return;
  }

  const blob = new Blob([ical.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const many = confs.length > 1;

  let filename = "python-conferences.ics";
  if (!many && confs[0]) {
    const subj = String(confs[0].Subject || "event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    filename = (subj || "event") + ".ics";
  }

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
