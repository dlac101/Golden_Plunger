/**
 * Cleanest Cabin - server (Code.gs), scoring model v2.
 *
 * Container-bound Google Apps Script web app (V8 runtime) bound to a Sheet.
 * Serves two HTML pages (Entry at ?page=score [default], Dashboard at
 * ?page=dashboard) and exposes server functions the pages call via
 * google.script.run. All scores live in one shared "Scores" sheet, one row
 * per (Day, CabinCode).
 *
 * Model: 5 categories (0/1/2) sum to Cleanliness (0..10, primary rank score).
 * Sparkle (0..10, default 5) is a manual tiebreaker only. Cabins tied on both
 * Cleanliness and Sparkle form a "cluster" that an inspector resolves manually
 * via TieOrder, producing a strict 1..N daily ranking per age group.
 */

// Swap this single constant if cabins share a bathhouse instead of a sink,
// e.g. "Shoes and gear lined up" or "Windows and screens".
var BATH_LABEL = "Bathroom / sink";

var DAYS = ["Tue", "Wed", "Thu", "Fri"];

var AGE_GROUPS = ["Alpha", "Beta", "Gamma"];

var CATEGORIES = [
  {key: "floors",     label: "Floors",            hint: "swept, nothing underfoot"},
  {key: "beds",       label: "Beds made",         hint: ""},
  {key: "belongings", label: "Belongings stowed", hint: ""},
  {key: "trash",      label: "Trash & surfaces",  hint: ""},
  {key: "bath",       label: BATH_LABEL,          hint: ""}
];

var SPARKLE = {min: 0, max: 10, "default": 5, label: "Sparkle"};

// Edit the counts here to change how many cabins each pool has.
// prefix = [age letter A/B/G][gender letter G/B]; codes are prefix + 1..count.
var CABIN_SPEC = [
  {prefix: "AG", count: 5},
  {prefix: "AB", count: 5},
  {prefix: "BG", count: 4},
  {prefix: "BB", count: 2},
  {prefix: "GG", count: 2},
  {prefix: "GB", count: 3}
];

var SHEET_NAME = "Scores";

var HEADERS = [
  "Timestamp", "Day", "CabinCode", "AgeGroup", "Gender",
  "Floors", "Beds", "Belongings", "Trash", "Bath",
  "Sparkle", "Cleanliness", "TieOrder", "Inspector", "Notes"
];

// 0-based column offsets into a Scores data row (matches HEADERS order).
var COL = {
  timestamp: 0, day: 1, cabin: 2, ageGroup: 3, gender: 4,
  floors: 5, beds: 6, belongings: 7, trash: 8, bath: 9,
  sparkle: 10, cleanliness: 11, tieOrder: 12, inspector: 13, notes: 14
};


/* ----------------------------- cabin model ----------------------------- */

function ageGroupFromLetter_(letter) {
  if (letter === "A") return "Alpha";
  if (letter === "B") return "Beta";
  if (letter === "G") return "Gamma";
  return null;
}

function genderFromLetter_(letter) {
  if (letter === "G") return "Girls";
  if (letter === "B") return "Boys";
  return null;
}

function buildCabins_() {
  var cabins = [];
  CABIN_SPEC.forEach(function (spec) {
    var ageGroup = ageGroupFromLetter_(spec.prefix.charAt(0));
    var gender = genderFromLetter_(spec.prefix.charAt(1));
    for (var i = 1; i <= spec.count; i++) {
      cabins.push({code: spec.prefix + i, ageGroup: ageGroup, gender: gender, n: i});
    }
  });
  return cabins;
}

var CABINS = buildCabins_();

var CABIN_BY_CODE = (function () {
  var map = {};
  CABINS.forEach(function (c) { map[c.code] = c; });
  return map;
})();


/* --------------------------- sheet plumbing ---------------------------- */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  var current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  for (var i = 0; i < HEADERS.length; i++) {
    if (current[i] !== HEADERS[i]) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      return;
    }
  }
}

function initSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    created = true;
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  return created
    ? 'Created "' + SHEET_NAME + '" sheet and wrote header row.'
    : 'Repaired header row on "' + SHEET_NAME + '" sheet.';
}

// Read the whole data range once and map to plain score objects.
function readRows_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var rows = [];
  values.forEach(function (r) {
    if (!r[COL.cabin]) return; // skip blank / partial rows
    rows.push(rowToObject_(r));
  });
  return rows;
}

function rowToObject_(r) {
  var ts = r[COL.timestamp];
  var tie = r[COL.tieOrder];
  return {
    timestamp: (ts instanceof Date) ? ts.toISOString() : (ts || ""),
    day: r[COL.day],
    cabin: r[COL.cabin],
    ageGroup: r[COL.ageGroup],
    gender: r[COL.gender],
    floors: toNum_(r[COL.floors]),
    beds: toNum_(r[COL.beds]),
    belongings: toNum_(r[COL.belongings]),
    trash: toNum_(r[COL.trash]),
    bath: toNum_(r[COL.bath]),
    sparkle: toNum_(r[COL.sparkle]),
    cleanliness: toNum_(r[COL.cleanliness]),
    tieOrder: isBlank_(tie) ? null : toNum_(tie),
    inspector: r[COL.inspector] || "",
    notes: r[COL.notes] || ""
  };
}

function toNum_(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function isBlank_(v) {
  return v === "" || v === null || v === undefined;
}


/* --------------------------- web-app plumbing -------------------------- */

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : "";
  var name = (page === "dashboard") ? "Dashboard" : "Entry";
  var template = HtmlService.createTemplateFromFile(name);
  // Entry.html's dashboard link needs the real /exec URL: the page renders
  // inside a sandboxed googleusercontent.com iframe, so a relative href
  // resolves against that iframe's own URL instead of the top-level tab,
  // sending target="_top" navigation to a broken googleusercontent.com URL.
  template.dashboardUrl = ScriptApp.getService().getUrl() + "?page=dashboard";
  return template.evaluate()
    .setTitle("Cleanest Cabin")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Cabin Comp")
    .addItem("Initialize / repair sheet", "initSheet")
    .addItem("Show web app URL", "showWebAppUrl")
    .addToUi();
}

function showWebAppUrl() {
  var ui = SpreadsheetApp.getUi();
  var url = ScriptApp.getService().getUrl();
  if (url) {
    ui.alert(
      "Cleanest Cabin web app URL",
      url + "\n\nAppend ?page=dashboard for the live dashboard.",
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      "Cleanest Cabin",
      "No web app URL yet. Deploy this project as a web app first " +
      "(Deploy > New deployment > Web app).",
      ui.ButtonSet.OK
    );
  }
}


/* ---------------------- client-facing server API ----------------------- */

function getConfig() {
  return {
    days: DAYS,
    categories: CATEGORIES,
    cabins: CABINS,
    ageGroups: AGE_GROUPS,
    bathLabel: BATH_LABEL,
    sparkle: {min: SPARKLE.min, max: SPARKLE.max, "default": SPARKLE["default"], label: SPARKLE.label}
  };
}

function submitScore(rec) {
  rec = rec || {};

  var day = String(rec.day == null ? "" : rec.day).trim();
  if (DAYS.indexOf(day) === -1) {
    throw new Error("Invalid day: " + rec.day + ". Must be one of " + DAYS.join(", ") + ".");
  }

  var code = String(rec.cabin == null ? "" : rec.cabin).trim();
  var cabin = CABIN_BY_CODE[code];
  if (!cabin) {
    throw new Error("Invalid cabin code: " + rec.cabin + ".");
  }

  var floors = validateInt_("Floors", rec.floors, 0, 2);
  var beds = validateInt_("Beds", rec.beds, 0, 2);
  var belongings = validateInt_("Belongings", rec.belongings, 0, 2);
  var trash = validateInt_("Trash", rec.trash, 0, 2);
  var bath = validateInt_("Bath", rec.bath, 0, 2);

  // Sparkle has a documented default; a blank submission falls back to it.
  var sparkleRaw = isBlank_(rec.sparkle) ? SPARKLE["default"] : rec.sparkle;
  var sparkle = validateInt_("Sparkle", sparkleRaw, SPARKLE.min, SPARKLE.max);

  var cleanliness = floors + beds + belongings + trash + bath;
  var inspector = (rec.inspector == null) ? "" : String(rec.inspector).trim();
  var notes = (rec.notes == null) ? "" : String(rec.notes);

  // Serialize concurrent inspectors so the (day, cabin) upsert stays unique.
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getSheet_();
    var rowIndex = findRowIndex_(sheet, day, cabin.code);

    // Preserve an existing manual TieOrder only when neither Cleanliness nor
    // Sparkle changed; otherwise the cluster may differ, so clear it.
    var tieOrderValue = "";
    if (rowIndex > 0) {
      var existing = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
      var unchanged = (toNum_(existing[COL.sparkle]) === sparkle) &&
                      (toNum_(existing[COL.cleanliness]) === cleanliness);
      if (unchanged && !isBlank_(existing[COL.tieOrder])) {
        tieOrderValue = existing[COL.tieOrder];
      }
    }

    var rowValues = [
      new Date(), day, cabin.code, cabin.ageGroup, cabin.gender,
      floors, beds, belongings, trash, bath,
      sparkle, cleanliness, tieOrderValue, inspector, notes
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
  } finally {
    lock.releaseLock();
  }

  return {ok: true, cleanliness: cleanliness, sparkle: sparkle, day: day, cabin: cabin.code};
}

function validateInt_(name, v, min, max) {
  if (isBlank_(v)) {
    throw new Error(name + " is required (integer " + min + ".." + max + ").");
  }
  var n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(name + " must be an integer " + min + ".." + max + " (got " + v + ").");
  }
  return n;
}

// Returns the 1-based sheet row for a (day, cabin) match, or -1 if none.
function findRowIndex_(sheet, day, code) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][COL.day] === day && values[i][COL.cabin] === code) {
      return i + 2; // +1 for header row, +1 for 0-based -> 1-based
    }
  }
  return -1;
}

function getScores(day) {
  var rows = readRows_();
  if (day) {
    rows = rows.filter(function (r) { return r.day === day; });
  }
  return rows;
}

function rankDay_(ageGroup, rows) {
  var list = rows.slice();
  list.sort(compareRanking_);
  annotateGroup_(list);

  var ties = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].inTie && !list[i].tieResolved && isClusterLead_(list, i)) {
      ties.push(clusterFor_(ageGroup, list, i));
    }
  }

  var winner = null;
  if (list.length > 0) {
    var top = list[0];
    winner = {
      cabin: top.cabin,
      cleanliness: top.cleanliness,
      sparkle: top.sparkle,
      winnerProvisional: (top.inTie && !top.tieResolved)
    };
  }

  return {list: list, ties: ties, winner: winner};
}

function getRankings(day) {
  var rows = readRows_();
  if (day) {
    rows = rows.filter(function (r) { return r.day === day; });
  }

  var byAgeGroup = {};
  var winners = {};
  var unresolvedTies = [];

  AGE_GROUPS.forEach(function (g) {
    var groupRows = rows.filter(function (r) { return r.ageGroup === g; });
    var ranked = rankDay_(g, groupRows);
    byAgeGroup[g] = ranked.list;
    winners[g] = ranked.winner;
    unresolvedTies = unresolvedTies.concat(ranked.ties);
  });

  return {
    day: day || null,
    byAgeGroup: byAgeGroup,
    winners: winners,
    unresolvedTies: unresolvedTies,
    scoredCount: rows.length,
    totalCabins: CABINS.length
  };
}

// Strict order: Cleanliness desc, Sparkle desc, manual TieOrder asc (a set
// TieOrder beats an unset one), then cabin code asc as a provisional fallback.
function compareRanking_(a, b) {
  if (b.cleanliness !== a.cleanliness) return b.cleanliness - a.cleanliness;
  if (b.sparkle !== a.sparkle) return b.sparkle - a.sparkle;
  var at = a.tieOrder, bt = b.tieOrder;
  if (at !== null && bt !== null && at !== bt) return at - bt;
  if (at !== null && bt === null) return -1;
  if (at === null && bt !== null) return 1;
  if (a.cabin < b.cabin) return -1;
  if (a.cabin > b.cabin) return 1;
  return 0;
}

// Assigns rank (1..N) and per-cabin inTie / tieResolved flags. Assumes the
// list is already sorted by compareRanking_.
function annotateGroup_(list) {
  var clusters = {};
  list.forEach(function (r) {
    var key = r.cleanliness + "|" + r.sparkle;
    (clusters[key] = clusters[key] || []).push(r);
  });

  Object.keys(clusters).forEach(function (key) {
    var members = clusters[key];
    var isTie = members.length >= 2;
    var resolved = true;
    if (isTie) {
      var seen = {};
      members.forEach(function (m) {
        if (m.tieOrder === null || seen[m.tieOrder]) resolved = false;
        else seen[m.tieOrder] = true;
      });
    }
    members.forEach(function (m) {
      m.inTie = isTie;
      m.tieResolved = isTie ? resolved : true;
    });
  });

  for (var i = 0; i < list.length; i++) {
    list[i].rank = i + 1;
  }
}

function sameCluster_(a, b) {
  return a.cleanliness === b.cleanliness && a.sparkle === b.sparkle;
}

// True when index i is the first (provisional-lead) member of its cluster.
function isClusterLead_(list, i) {
  return i === 0 || !sameCluster_(list[i], list[i - 1]);
}

function clusterFor_(ageGroup, list, startIndex) {
  var lead = list[startIndex];
  var cabins = [];
  for (var i = startIndex; i < list.length && sameCluster_(list[i], lead); i++) {
    var c = list[i];
    cabins.push({
      cabin: c.cabin,
      floors: c.floors,
      beds: c.beds,
      belongings: c.belongings,
      trash: c.trash,
      bath: c.bath,
      sparkle: c.sparkle,
      notes: c.notes
    });
  }
  return {
    ageGroup: ageGroup,
    cleanliness: lead.cleanliness,
    sparkle: lead.sparkle,
    cabins: cabins
  };
}

function setTieOrder(day, ageGroup, orderedCabinCodes) {
  day = String(day == null ? "" : day).trim();
  if (DAYS.indexOf(day) === -1) {
    throw new Error("Invalid day: " + day + ".");
  }
  if (AGE_GROUPS.indexOf(ageGroup) === -1) {
    throw new Error("Invalid age group: " + ageGroup + ".");
  }
  if (!Array.isArray(orderedCabinCodes) || orderedCabinCodes.length < 2) {
    throw new Error("A tie order needs at least two cabins.");
  }

  var codes = orderedCabinCodes.map(function (c) { return String(c == null ? "" : c).trim(); });
  var seen = {};
  codes.forEach(function (c) {
    if (seen[c]) throw new Error("Duplicate cabin in order: " + c + ".");
    seen[c] = true;
    var cab = CABIN_BY_CODE[c];
    if (!cab) throw new Error("Unknown cabin code: " + c + ".");
    if (cab.ageGroup !== ageGroup) {
      throw new Error("Cabin " + c + " is not in age group " + ageGroup + ".");
    }
  });

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("No scores recorded yet.");
    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

    var rowByCode = {};
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v[COL.day] === day && v[COL.ageGroup] === ageGroup && v[COL.cabin]) {
        rowByCode[v[COL.cabin]] = {
          rowIndex: i + 2,
          cleanliness: toNum_(v[COL.cleanliness]),
          sparkle: toNum_(v[COL.sparkle])
        };
      }
    }

    var ref = null;
    codes.forEach(function (c) {
      var info = rowByCode[c];
      if (!info) throw new Error("Cabin " + c + " has no score for " + day + ".");
      if (ref === null) {
        ref = info;
      } else if (info.cleanliness !== ref.cleanliness || info.sparkle !== ref.sparkle) {
        throw new Error("Cabins are not a real tie (they differ on Cleanliness or Sparkle).");
      }
    });

    codes.forEach(function (c, idx) {
      sheet.getRange(rowByCode[c].rowIndex, COL.tieOrder + 1).setValue(idx + 1);
    });
  } finally {
    lock.releaseLock();
  }

  return {ok: true};
}

function getWeekSummary() {
  var allRows = readRows_();

  var byAgeGroup = {};
  AGE_GROUPS.forEach(function (g) { byAgeGroup[g] = {}; });

  DAYS.forEach(function (day) {
    var dayRows = allRows.filter(function (r) { return r.day === day; });
    AGE_GROUPS.forEach(function (g) {
      var groupRows = dayRows.filter(function (r) { return r.ageGroup === g; });
      byAgeGroup[g][day] = rankDay_(g, groupRows).winner;
    });
  });

  return {days: DAYS, byAgeGroup: byAgeGroup};
}
