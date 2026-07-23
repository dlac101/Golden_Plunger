(function () {
  'use strict';

  var BATH_LABEL = 'Bathroom / sink';
  var DAYS = ['Tue', 'Wed', 'Thu', 'Fri'];
  var AGE_GROUPS = ['Alpha', 'Beta', 'Gamma'];
  var CATEGORIES = [
    {key: 'floors', label: 'Floors', hint: 'swept, nothing underfoot'},
    {key: 'beds', label: 'Beds made', hint: ''},
    {key: 'belongings', label: 'Belongings stowed', hint: ''},
    {key: 'trash', label: 'Trash & surfaces', hint: ''},
    {key: 'bath', label: BATH_LABEL, hint: ''}
  ];
  var SPARKLE = {min: 0, max: 10, 'default': 5, label: 'Sparkle'};
  var CABIN_SPEC = [
    {prefix: 'AG', count: 5},
    {prefix: 'AB', count: 5},
    {prefix: 'BG', count: 4},
    {prefix: 'BB', count: 2},
    {prefix: 'GG', count: 2},
    {prefix: 'GB', count: 3}
  ];

  function ageGroupFromLetter_(letter) {
    if (letter === 'A') return 'Alpha';
    if (letter === 'B') return 'Beta';
    if (letter === 'G') return 'Gamma';
    return null;
  }

  function genderFromLetter_(letter) {
    if (letter === 'G') return 'Girls';
    if (letter === 'B') return 'Boys';
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
  var score_rows = [];
  var fail_next = 0;

  function isBlank_(v) {
    return v === '' || v === null || v === undefined;
  }

  function rowCopy_(row) {
    return {
      timestamp: row.timestamp,
      day: row.day,
      cabin: row.cabin,
      ageGroup: row.ageGroup,
      gender: row.gender,
      floors: row.floors,
      beds: row.beds,
      belongings: row.belongings,
      trash: row.trash,
      bath: row.bath,
      sparkle: row.sparkle,
      cleanliness: row.cleanliness,
      tieOrder: row.tieOrder,
      inspector: row.inspector,
      notes: row.notes
    };
  }

  function readRows_() {
    return score_rows.map(rowCopy_);
  }

  function getConfig() {
    return {
      days: DAYS,
      categories: CATEGORIES,
      cabins: CABINS,
      ageGroups: AGE_GROUPS,
      bathLabel: BATH_LABEL,
      sparkle: {min: SPARKLE.min, max: SPARKLE.max, 'default': SPARKLE['default'], label: SPARKLE.label}
    };
  }

  function validateInt_(name, v, min, max) {
    if (isBlank_(v)) {
      throw new Error(name + ' is required (integer ' + min + '..' + max + ').');
    }
    var n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new Error(name + ' must be an integer ' + min + '..' + max + ' (got ' + v + ').');
    }
    return n;
  }

  function submitScore(rec) {
    rec = rec || {};

    var day = String(rec.day == null ? '' : rec.day).trim();
    if (DAYS.indexOf(day) === -1) {
      throw new Error('Invalid day: ' + rec.day + '. Must be one of ' + DAYS.join(', ') + '.');
    }

    var code = String(rec.cabin == null ? '' : rec.cabin).trim();
    var cabin = CABIN_BY_CODE[code];
    if (!cabin) {
      throw new Error('Invalid cabin code: ' + rec.cabin + '.');
    }

    var floors = validateInt_('Floors', rec.floors, 0, 2);
    var beds = validateInt_('Beds', rec.beds, 0, 2);
    var belongings = validateInt_('Belongings', rec.belongings, 0, 2);
    var trash = validateInt_('Trash', rec.trash, 0, 2);
    var bath = validateInt_('Bath', rec.bath, 0, 2);
    var sparkleRaw = isBlank_(rec.sparkle) ? SPARKLE['default'] : rec.sparkle;
    var sparkle = validateInt_('Sparkle', sparkleRaw, SPARKLE.min, SPARKLE.max);
    var cleanliness = floors + beds + belongings + trash + bath;
    var inspector = rec.inspector == null ? '' : String(rec.inspector).trim();
    var notes = rec.notes == null ? '' : String(rec.notes);
    var row_index = -1;

    for (var i = 0; i < score_rows.length; i++) {
      if (score_rows[i].day === day && score_rows[i].cabin === cabin.code) {
        row_index = i;
        break;
      }
    }

    var tie_order = null;
    if (row_index >= 0) {
      var existing = score_rows[row_index];
      var unchanged = existing.sparkle === sparkle && existing.cleanliness === cleanliness;
      if (unchanged && !isBlank_(existing.tieOrder)) {
        tie_order = existing.tieOrder;
      }
    }

    var row = {
      timestamp: new Date().toISOString(),
      day: day,
      cabin: cabin.code,
      ageGroup: cabin.ageGroup,
      gender: cabin.gender,
      floors: floors,
      beds: beds,
      belongings: belongings,
      trash: trash,
      bath: bath,
      sparkle: sparkle,
      cleanliness: cleanliness,
      tieOrder: tie_order,
      inspector: inspector,
      notes: notes
    };

    if (row_index >= 0) score_rows[row_index] = row;
    else score_rows.push(row);

    return {ok: true, cleanliness: cleanliness, sparkle: sparkle, day: day, cabin: cabin.code};
  }

  function getScores(day) {
    var rows = readRows_();
    if (day) {
      rows = rows.filter(function (r) { return r.day === day; });
    }
    return rows;
  }

  function compareRanking_(a, b) {
    if (b.cleanliness !== a.cleanliness) return b.cleanliness - a.cleanliness;
    if (b.sparkle !== a.sparkle) return b.sparkle - a.sparkle;
    var at = a.tieOrder;
    var bt = b.tieOrder;
    if (at !== null && bt !== null && at !== bt) return at - bt;
    if (at !== null && bt === null) return -1;
    if (at === null && bt !== null) return 1;
    if (a.cabin < b.cabin) return -1;
    if (a.cabin > b.cabin) return 1;
    return 0;
  }

  function annotateGroup_(list) {
    var clusters = {};
    list.forEach(function (r) {
      var key = r.cleanliness + '|' + r.sparkle;
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
        winnerProvisional: top.inTie && !top.tieResolved
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

  function setTieOrder(day, ageGroup, orderedCabinCodes) {
    day = String(day == null ? '' : day).trim();
    if (DAYS.indexOf(day) === -1) {
      throw new Error('Invalid day: ' + day + '.');
    }
    if (AGE_GROUPS.indexOf(ageGroup) === -1) {
      throw new Error('Invalid age group: ' + ageGroup + '.');
    }
    if (!Array.isArray(orderedCabinCodes) || orderedCabinCodes.length < 2) {
      throw new Error('A tie order needs at least two cabins.');
    }

    var codes = orderedCabinCodes.map(function (c) { return String(c == null ? '' : c).trim(); });
    var seen = {};
    codes.forEach(function (c) {
      if (seen[c]) throw new Error('Duplicate cabin in order: ' + c + '.');
      seen[c] = true;
      var cab = CABIN_BY_CODE[c];
      if (!cab) throw new Error('Unknown cabin code: ' + c + '.');
      if (cab.ageGroup !== ageGroup) {
        throw new Error('Cabin ' + c + ' is not in age group ' + ageGroup + '.');
      }
    });

    if (score_rows.length < 1) throw new Error('No scores recorded yet.');
    var rowByCode = {};
    for (var i = 0; i < score_rows.length; i++) {
      var row = score_rows[i];
      if (row.day === day && row.ageGroup === ageGroup && row.cabin) {
        rowByCode[row.cabin] = {
          rowIndex: i,
          cleanliness: row.cleanliness,
          sparkle: row.sparkle
        };
      }
    }

    var ref = null;
    codes.forEach(function (c) {
      var info = rowByCode[c];
      if (!info) throw new Error('Cabin ' + c + ' has no score for ' + day + '.');
      if (ref === null) {
        ref = info;
      } else if (info.cleanliness !== ref.cleanliness || info.sparkle !== ref.sparkle) {
        throw new Error('Cabins are not a real tie (they differ on Cleanliness or Sparkle).');
      }
    });

    codes.forEach(function (c, idx) {
      score_rows[rowByCode[c].rowIndex].tieOrder = idx + 1;
    });

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

  var methods = {
    getConfig: getConfig,
    submitScore: submitScore,
    getScores: getScores,
    getRankings: getRankings,
    setTieOrder: setTieOrder,
    getWeekSummary: getWeekSummary
  };

  function resultCopy_(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function errorObject_(error) {
    return {message: error && error.message ? error.message : String(error)};
  }

  function runnerCreate_(success_handler, failure_handler) {
    return new Proxy({}, {
      get: function (_, property) {
        if (property === 'withSuccessHandler') {
          return function (handler) { return runnerCreate_(handler, failure_handler); };
        }
        if (property === 'withFailureHandler') {
          return function (handler) { return runnerCreate_(success_handler, handler); };
        }
        if (typeof property !== 'string') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var forced_failure = fail_next > 0;
          if (forced_failure) fail_next--;
          var delay = 120 + Math.floor(Math.random() * 131);
          setTimeout(function () {
            if (forced_failure) {
              var forced_error = {message: 'Forced mock google.script.run failure.'};
              if (typeof failure_handler === 'function') failure_handler(forced_error);
              else console.error(forced_error.message);
              return;
            }

            try {
              if (!methods[property]) throw new Error('Script function not found: ' + property);
              var result = methods[property].apply(null, args);
              if (typeof success_handler === 'function') success_handler(resultCopy_(result));
            } catch (error) {
              var failure = errorObject_(error);
              if (typeof failure_handler === 'function') failure_handler(failure);
              else console.error(failure.message);
            }
          }, delay);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = runnerCreate_(null, null);
  window.google.script.url = {
    getLocation: function (callback) {
      var params = new URLSearchParams(window.location.search || '');
      var parameter = {};
      var parameters = {};
      params.forEach(function (value, key) {
        if (!(key in parameter)) parameter[key] = value;
        (parameters[key] = parameters[key] || []).push(value);
      });
      var hash = (window.location.hash || '').replace(/^#/, '');
      setTimeout(function () {
        callback({parameter: parameter, parameters: parameters, hash: hash});
      }, 40);
    }
  };
  window.__mock = {
    reset: function () {
      score_rows.length = 0;
      fail_next = 0;
    },
    rows: function () {
      return score_rows;
    },
    setFailNext: function (n) {
      var count = Number(n);
      fail_next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    }
  };
})();
