// ============================================================
// Percussion Part Scheduler — client-side only.
// No network calls. No server storage. State lives in memory
// and (as a safety net) in this browser's localStorage.
// ============================================================

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const STORAGE_KEY = "percussion-scheduler-autosave-v1";

let state = {
  instruments: [], // {id, name, type: "Pitched"|"Unpitched", limit, role: "Core"|"Optional"|"Fill", active}
  students: [],    // {id, name, ensemble, absent: {Monday:false,...}}
  schedules: {}     // { ensembleName: { studentName: {Monday:"Snare",...}, __score: number, __warnings: [] } }
};

let nextId = 1;
function newId() { return nextId++; }

// ------------------------------------------------------------
// Default starter data (placeholder, so the page isn't empty)
// ------------------------------------------------------------
function seedDefaults() {
  state.instruments = [
    { id: newId(), name: "Snare", type: "Unpitched", limit: 2, role: "Core", active: true },
    { id: newId(), name: "Bass Drum", type: "Unpitched", limit: 1, role: "Core", active: true },
    { id: newId(), name: "Auxiliary", type: "Unpitched", limit: 2, role: "Optional", active: true },
    { id: newId(), name: "Bells", type: "Pitched", limit: 4, role: "Fill", active: true },
    { id: newId(), name: "Pad", type: "Unpitched", limit: 10, role: "Fill", active: true }
  ];
  state.students = [];
  state.schedules = {};
}

// ------------------------------------------------------------
// Persistence: localStorage autosave (still 100% local/client-side)
// ------------------------------------------------------------
function autosave() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Autosave failed:", e);
  }
}

function loadAutosave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.instruments) && Array.isArray(parsed.students)) {
      state = parsed;
      // recompute nextId above any existing ids
      let maxId = 0;
      [...state.instruments, ...state.students].forEach(o => { if (o.id > maxId) maxId = o.id; });
      nextId = maxId + 1;
      return true;
    }
  } catch (e) {
    console.warn("Could not read autosave:", e);
  }
  return false;
}

// ------------------------------------------------------------
// Tab navigation
// ------------------------------------------------------------
function setupTabs() {
  const buttons = document.querySelectorAll("nav.tabs button");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      document.getElementById("panel-" + btn.dataset.panel).classList.add("active");
      if (btn.dataset.panel === "generate") populateEnsembleSelect();
    });
  });
}

// ------------------------------------------------------------
// Instruments table rendering
// ------------------------------------------------------------
function renderInstruments() {
  const tbody = document.querySelector("#instruments-table tbody");
  tbody.innerHTML = "";
  state.instruments.forEach(inst => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = inst.name;
    nameInput.addEventListener("input", () => { inst.name = nameInput.value; autosave(); });
    nameTd.appendChild(nameInput);

    const typeTd = document.createElement("td");
    const typeSelect = document.createElement("select");
    ["Pitched", "Unpitched"].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = opt;
      if (inst.type === opt) o.selected = true;
      typeSelect.appendChild(o);
    });
    typeSelect.addEventListener("change", () => { inst.type = typeSelect.value; autosave(); });
    typeTd.appendChild(typeSelect);

    const limitTd = document.createElement("td");
    const limitInput = document.createElement("input");
    limitInput.type = "number";
    limitInput.min = "0";
    limitInput.value = inst.limit;
    limitInput.addEventListener("input", () => { inst.limit = parseInt(limitInput.value || "0", 10); autosave(); });
    limitTd.appendChild(limitInput);

    const roleTd = document.createElement("td");
    const roleSelect = document.createElement("select");
    ["Core", "Optional", "Fill"].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = opt;
      if (inst.role === opt) o.selected = true;
      roleSelect.appendChild(o);
    });
    roleSelect.addEventListener("change", () => { inst.role = roleSelect.value; autosave(); });
    roleTd.appendChild(roleSelect);

    const activeTd = document.createElement("td");
    activeTd.style.textAlign = "center";
    const activeCheck = document.createElement("input");
    activeCheck.type = "checkbox";
    activeCheck.checked = !!inst.active;
    activeCheck.addEventListener("change", () => { inst.active = activeCheck.checked; autosave(); });
    activeTd.appendChild(activeCheck);

    const actionTd = document.createElement("td");
    actionTd.className = "row-actions";
    const delBtn = document.createElement("button");
    delBtn.className = "btn secondary small";
    delBtn.textContent = "Remove";
    delBtn.addEventListener("click", () => {
      state.instruments = state.instruments.filter(i => i.id !== inst.id);
      autosave();
      renderInstruments();
    });
    actionTd.appendChild(delBtn);

    tr.append(nameTd, typeTd, limitTd, roleTd, activeTd, actionTd);
    tbody.appendChild(tr);
  });
}

function addInstrument() {
  state.instruments.push({ id: newId(), name: "New Instrument", type: "Unpitched", limit: 1, role: "Optional", active: true });
  autosave();
  renderInstruments();
}

// ------------------------------------------------------------
// Students table rendering
// ------------------------------------------------------------
function renderStudents() {
  const tbody = document.querySelector("#students-table tbody");
  tbody.innerHTML = "";
  state.students.forEach(stu => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = stu.name;
    nameInput.addEventListener("input", () => { stu.name = nameInput.value; autosave(); });
    nameTd.appendChild(nameInput);

    const ensTd = document.createElement("td");
    const ensInput = document.createElement("input");
    ensInput.type = "text";
    ensInput.placeholder = "e.g. 7th Grade";
    ensInput.value = stu.ensemble;
    ensInput.addEventListener("input", () => { stu.ensemble = ensInput.value; autosave(); });
    ensTd.appendChild(ensInput);

    DAYS.forEach(day => {
      const dTd = document.createElement("td");
      dTd.className = "day-check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!stu.absent[day];
      cb.title = "Checked = absent/unavailable this day";
      cb.addEventListener("change", () => { stu.absent[day] = cb.checked; autosave(); });
      dTd.appendChild(cb);
      tr.appendChild(dTd);
    });
    tr.prepend(ensTd);
    tr.prepend(nameTd);

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "btn secondary small";
    delBtn.textContent = "Remove";
    delBtn.addEventListener("click", () => {
      state.students = state.students.filter(s => s.id !== stu.id);
      autosave();
      renderStudents();
    });
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

function addStudent() {
  const absent = {};
  DAYS.forEach(d => absent[d] = false);
  state.students.push({ id: newId(), name: "New Student", ensemble: "", absent });
  autosave();
  renderStudents();
}

// ------------------------------------------------------------
// Ensemble dropdown for Generate tab
// ------------------------------------------------------------
function getEnsembles() {
  const set = new Set();
  state.students.forEach(s => { if (s.ensemble && s.ensemble.trim()) set.add(s.ensemble.trim()); });
  return Array.from(set);
}

function populateEnsembleSelect() {
  const select = document.getElementById("ensemble-select");
  const current = select.value;
  select.innerHTML = "";
  getEnsembles().forEach(e => {
    const o = document.createElement("option");
    o.value = e; o.textContent = e;
    select.appendChild(o);
  });
  if (current && getEnsembles().includes(current)) select.value = current;
}

// ============================================================
// SCHEDULING ALGORITHM
// Ported from the Google Apps Script version. Core/Optional
// assignment logic matches the original; the Fill step reads
// whichever instruments are marked role "Fill" rather than
// hardcoding instrument names, and each student's pitched-target
// days are chosen at random from their available days each trial.
// ============================================================

function getActiveInstrumentConfig() {
  const limits = {};
  const pitched = [];
  const core = [];
  const optional = [];
  const fill = [];
  state.instruments.forEach(inst => {
    if (!inst.active) return;
    limits[inst.name] = inst.limit;
    if (inst.type === "Pitched") pitched.push(inst.name);
    if (inst.role === "Core") core.push(inst.name);
    else if (inst.role === "Optional") optional.push(inst.name);
    else if (inst.role === "Fill") fill.push(inst.name);
  });
  return { limits, pitched, core, optional, fill };
}

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateScheduleForEnsemble(ensembleName) {
  const studentsRaw = state.students.filter(s => (s.ensemble || "").trim() === ensembleName);
  if (studentsRaw.length === 0) {
    return { schedule: {}, score: 0, warnings: ["No students found in this ensemble."] };
  }

  const config = getActiveInstrumentConfig();
  const limits = config.limits;
  const pitched = config.pitched;
  const coreInstruments = config.core;
  const optionalInstruments = config.optional;
  const fillInstruments = config.fill;

  function isAvailable(studentName, day) {
    const stu = studentsRaw.find(s => s.name === studentName);
    return stu ? !stu.absent[day] : false;
  }

  function isPitched(inst) { return pitched.includes(inst); }

  const unpitchedFillInstruments = fillInstruments.filter(inst => !isPitched(inst));

  function getAvailableDays(studentName) {
    let count = 0;
    DAYS.forEach(day => { if (isAvailable(studentName, day)) count++; });
    return count;
  }

  // Balanced toggles (fairness across the group), same order-dependent
  // behavior as the original script.
  let fiveDayToggle = true, threeDayToggle = true, oneDayToggle = true;
  const targetPitched = {};
  const currentPitched = {};

  studentsRaw.forEach(s => {
    const name = s.name;
    const daysAvailable = getAvailableDays(name);
    let target;
    if (daysAvailable === 5) { target = fiveDayToggle ? 3 : 2; fiveDayToggle = !fiveDayToggle; }
    else if (daysAvailable === 4) { target = 2; }
    else if (daysAvailable === 3) { target = threeDayToggle ? 2 : 1; threeDayToggle = !threeDayToggle; }
    else if (daysAvailable === 2) { target = 1; }
    else if (daysAvailable === 1) { target = oneDayToggle ? 1 : 0; oneDayToggle = !oneDayToggle; }
    else { target = 0; }
    targetPitched[name] = target;
    currentPitched[name] = 0;
  });

  const warnings = [];

  function buildSchedule() {
    const schedule = {};
    const history = {};
    const pitchedDays = {}; // per-trial: which of each student's available days should be pitched

    studentsRaw.forEach(s => {
      schedule[s.name] = {};
      history[s.name] = new Set();
      currentPitched[s.name] = 0;

      const availableDayList = DAYS.filter(day => isAvailable(s.name, day));
      const target = targetPitched[s.name];
      const chosenDays = shuffle(availableDayList).slice(0, Math.min(target, availableDayList.length));
      pitchedDays[s.name] = new Set(chosenDays);
    });

    shuffle(DAYS).forEach(day => {
      const used = { assigned: new Set() };
      Object.keys(limits).forEach(inst => { used[inst] = 0; });

      const shuffledStudents = shuffle(studentsRaw.map(s => s.name));

      // CORE (required)
      coreInstruments.forEach(inst => {
        const max = limits[inst] || 1;
        for (let slot = 0; slot < max; slot++) {
          let assigned = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            const eligible = shuffle(shuffledStudents).filter(student => {
              if (!isAvailable(student, day)) return false;
              if (used[inst] >= (limits[inst] || 1)) return false;
              if (used.assigned.has(student)) return false;
              if (history[student].has(inst) && attempt < 8) return false;
              return true;
            });
            if (eligible.length > 0) {
              const chosen = eligible[0];
              schedule[chosen][day] = inst;
              used[inst]++;
              used.assigned.add(chosen);
              history[chosen].add(inst);
              if (isPitched(inst)) currentPitched[chosen]++;
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            const emergency = shuffledStudents.find(student => !used.assigned.has(student) && isAvailable(student, day));
            if (!emergency) {
              warnings.push("Skipped " + inst + " on " + day);
              continue;
            }
            schedule[emergency][day] = inst;
            used[inst]++;
            used.assigned.add(emergency);
            history[emergency].add(inst);
            if (isPitched(inst)) currentPitched[emergency]++;
          }
        }
      });

      // OPTIONAL
      optionalInstruments.forEach(inst => {
        const max = limits[inst] || 1;
        for (let slot = 0; slot < max; slot++) {
          let assigned = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            const eligible = shuffle(shuffledStudents).filter(student => {
              if (!isAvailable(student, day)) return false;
              if (used[inst] >= (limits[inst] || 1)) return false;
              if (used.assigned.has(student)) return false;
              if (history[student].has(inst) && attempt < 8) return false;
              return true;
            });
            if (eligible.length > 0) {
              const chosen = eligible[0];
              schedule[chosen][day] = inst;
              used[inst]++;
              used.assigned.add(chosen);
              history[chosen].add(inst);
              if (isPitched(inst)) currentPitched[chosen]++;
              assigned = true;
              break;
            }
          }
          if (!assigned) warnings.push("Skipped " + inst + " on " + day);
        }
      });

      // FILL — pick from whichever instruments are actually marked role "Fill",
      // choosing a pitched one if the student still needs pitched days.
      const pitchedFill = fillInstruments.filter(isPitched);
      const unpitchedFill = fillInstruments.filter(inst => !isPitched(inst));

      shuffle(shuffledStudents).forEach(student => {
        if (!isAvailable(student, day)) { schedule[student][day] = ""; return; }
        if (!schedule[student][day]) {
          const needsPitched = pitchedDays[student].has(day);
          let pool = needsPitched ? pitchedFill : unpitchedFill;
          if (pool.length === 0) {
            pool = fillInstruments;
            if (pool.length === 0) {
              warnings.push("No active Fill-role instrument configured — leaving " + student + " unassigned on " + day);
              schedule[student][day] = "";
              return;
            }
          }
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          schedule[student][day] = chosen;
          if (isPitched(chosen)) currentPitched[student]++;
        }
      });
    });

    return schedule;
  }

  function scoreSchedule(schedule) {
    let score = 0;
    for (const student in schedule) {
      const assignments = Object.values(schedule[student]);
      const pitchedCount = assignments.filter(inst => pitched.includes(inst)).length;
      const target = targetPitched[student];
      score -= Math.abs(pitchedCount - target);

      const seen = new Set();
      assignments.forEach(inst => {
        if (inst && !unpitchedFillInstruments.includes(inst)) {
          if (seen.has(inst)) score -= 2;
          seen.add(inst);
        }
      });
    }
    return score;
  }

  const studentCount = studentsRaw.length;
  let runs;
  if (studentCount <= 6) runs = 1000;
  else if (studentCount <= 12) runs = 500;
  else if (studentCount <= 20) runs = 300;
  else runs = 100;

  let best = null, bestScore = -Infinity;
  for (let i = 0; i < runs; i++) {
    const testSchedule = buildSchedule();
    const score = scoreSchedule(testSchedule);
    if (score > bestScore) { bestScore = score; best = testSchedule; }
  }

  return { schedule: best, score: bestScore, warnings };
}

// ------------------------------------------------------------
// Rendering the generated schedule
// ------------------------------------------------------------
function chipFor(instName) {
  if (!instName) return '<span class="chip empty">—</span>';
  const inst = state.instruments.find(i => i.name === instName);
  if (inst && inst.role === "Fill" && inst.type === "Unpitched") {
    return `<span class="chip fill-pad">${escapeHtml(instName)}</span>`;
  }
  const isPitched = inst ? inst.type === "Pitched" : false;
  return `<span class="chip ${isPitched ? "pitched" : "unpitched"}">${escapeHtml(instName)}</span>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderScheduleResult(ensembleName, result) {
  const container = document.getElementById("schedule-output");
  const studentsInEnsemble = state.students.filter(s => (s.ensemble || "").trim() === ensembleName);

  let html = `<h3 style="font-family:'Oswald',sans-serif;text-transform:uppercase;font-size:15px;margin-top:24px;">${escapeHtml(ensembleName)}</h3>`;
  html += `<table class="schedule-table"><thead><tr><th>Student</th>`;
  DAYS.forEach(d => html += `<th>${d.slice(0,3)}</th>`);
  html += `</tr></thead><tbody>`;

  studentsInEnsemble.forEach(stu => {
    html += `<tr><td>${escapeHtml(stu.name)}</td>`;
    DAYS.forEach(day => {
      const inst = result.schedule[stu.name] ? result.schedule[stu.name][day] : "";
      html += `<td>${chipFor(inst)}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  html += `<div class="score-line">Best of ${studentsInEnsemble.length <= 6 ? 1000 : studentsInEnsemble.length <= 12 ? 500 : studentsInEnsemble.length <= 20 ? 300 : 100} trials — fairness score: ${result.score}</div>`;
  if (result.warnings && result.warnings.length) {
    const uniqueWarnings = Array.from(new Set(result.warnings));
    html += `<div class="warning-list">${uniqueWarnings.map(w => escapeHtml(w)).join("<br>")}</div>`;
  }

  container.innerHTML += html;
}

function runGenerateOne() {
  const ensemble = document.getElementById("ensemble-select").value;
  if (!ensemble) { alert("Add students with an ensemble name first."); return; }
  document.getElementById("schedule-output").innerHTML = "";
  const result = generateScheduleForEnsemble(ensemble);
  state.schedules[ensemble] = result;
  autosave();
  renderScheduleResult(ensemble, result);
}

function runGenerateAll() {
  const ensembles = getEnsembles();
  if (ensembles.length === 0) { alert("Add students with ensemble names first."); return; }
  document.getElementById("schedule-output").innerHTML = "";
  ensembles.forEach(ensemble => {
    const result = generateScheduleForEnsemble(ensemble);
    state.schedules[ensemble] = result;
    renderScheduleResult(ensemble, result);
  });
  autosave();
}

// ------------------------------------------------------------
// Save / Load to file
// ------------------------------------------------------------
function saveToFile() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `percussion-scheduler-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  document.getElementById("saveload-status").textContent = "Saved. Check your downloads folder.";
}

function loadFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.instruments || !parsed.students) throw new Error("File doesn't look like a scheduler save file.");
      state = parsed;
      let maxId = 0;
      [...state.instruments, ...state.students].forEach(o => { if (o.id > maxId) maxId = o.id; });
      nextId = maxId + 1;
      autosave();
      renderInstruments();
      renderStudents();
      populateEnsembleSelect();
      document.getElementById("schedule-output").innerHTML = "";
      document.getElementById("saveload-status").textContent = "Loaded successfully.";
    } catch (e) {
      document.getElementById("saveload-status").textContent = "Couldn't read that file: " + e.message;
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm("This will erase all instruments, students, and schedules in this browser tab. This can't be undone unless you've saved a file. Continue?")) return;
  seedDefaults();
  autosave();
  renderInstruments();
  renderStudents();
  populateEnsembleSelect();
  document.getElementById("schedule-output").innerHTML = "";
  document.getElementById("saveload-status").textContent = "Cleared.";
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
function init() {
  const restored = loadAutosave();
  if (!restored) seedDefaults();

  setupTabs();
  renderInstruments();
  renderStudents();
  populateEnsembleSelect();

  document.getElementById("add-instrument").addEventListener("click", addInstrument);
  document.getElementById("add-student").addEventListener("click", addStudent);
  document.getElementById("generate-one").addEventListener("click", runGenerateOne);
  document.getElementById("generate-all").addEventListener("click", runGenerateAll);
  document.getElementById("print-schedule").addEventListener("click", () => window.print());
  document.getElementById("save-file").addEventListener("click", saveToFile);
  document.getElementById("load-file").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) loadFromFile(e.target.files[0]);
  });
  document.getElementById("clear-all").addEventListener("click", clearAllData);
}

document.addEventListener("DOMContentLoaded", init);
