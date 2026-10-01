"use strict";

const CONFIG = window.PORTAL_CONFIG || {};
const KKM = Number.isFinite(Number(CONFIG.KKM)) ? Number(CONFIG.KKM) : 75;
const REFRESH_MS = Math.max(15000, Number(CONFIG.REFRESH_INTERVAL_MS) || 60000);
const SHEET_ID = String(CONFIG.GOOGLE_SHEET_ID || "").trim();
const SHEET_GID = String(CONFIG.SHEET_GID ?? "0").trim();
const USE_DEMO = !SHEET_ID || SHEET_ID.includes("GANTI_");
const SUBJECTS = { BIND: "Bahasa Indonesia", KKA: "Koding Kecerdasan Artifisial (KKA)" };

// Seluruh contoh adalah nama fiktif. Hapus/abaikan setelah menghubungkan Google Sheets.
const DEMO_DATA = [
  ["Bahasa Indonesia", "7 A", 1, "Siswa Contoh 01", 88],
  ["Bahasa Indonesia", "7 A", 2, "Siswa Contoh 02", 64],
  ["Bahasa Indonesia", "7 A", 3, "Siswa Contoh 03", 75],
  ["Bahasa Indonesia", "7 A", 4, "Siswa Contoh 04", 93],
  ["Bahasa Indonesia", "7 B", 1, "Siswa Contoh 05", 72],
  ["Bahasa Indonesia", "7 B", 2, "Siswa Contoh 06", 89],
  ["Bahasa Indonesia", "7 B", 3, "Siswa Contoh 07", 77],
  ["Bahasa Indonesia", "7 B", 4, "Siswa Contoh 08", 69],
  ["KKA", "7 A", 1, "Siswa Contoh 01", 98],
  ["KKA", "7 A", 2, "Siswa Contoh 02", 70],
  ["KKA", "7 A", 3, "Siswa Contoh 03", 81],
  ["KKA", "7 A", 4, "Siswa Contoh 04", 75],
  ["KKA", "7 B", 1, "Siswa Contoh 05", 79],
  ["KKA", "7 B", 2, "Siswa Contoh 06", 74],
  ["KKA", "7 B", 3, "Siswa Contoh 07", 90],
  ["KKA", "7 B", 4, "Siswa Contoh 08", 86],
];

const state = { subject: null, kelas: null, filter: "all", search: "", rows: [], mode: "demo", hasLoaded: false, updating: false, lastChecked: null };
const $ = (id) => document.getElementById(id);
function normalizeText(value) { return String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(); }
function getSubjectCode(value) {
  const v = normalizeText(value);
  if (v === "bind" || v === "b. indonesia" || v.includes("bahasa indonesia")) return "BIND";
  if (v === "kka" || v.includes("koding") || v.includes("kecerdasan artifisial")) return "KKA";
  return null;
}
function getClassCode(value) {
  const v = String(value ?? "").toUpperCase().replace(/[\s._-]/g, "");
  if (["7A", "VIIA"].includes(v)) return "7A";
  if (["7B", "VIIB"].includes(v)) return "7B";
  return null;
}
function scoreNumber(value) {
  if (typeof value === "number") return value;
  const clean = String(value ?? "").replace(/,/g, ".").trim();
  return clean !== "" ? Number(clean) : NaN;
}
function normalizeRows(rawRows) {
  return rawRows.map((raw) => ({
    subject: getSubjectCode(raw[0]), kelas: getClassCode(raw[1]), no: Number(raw[2]),
    name: String(raw[3] ?? "").trim(), score: scoreNumber(raw[4]),
  })).filter((item) => item.subject && item.kelas && item.name && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100)
    .map((item, i) => ({ ...item, no: Number.isFinite(item.no) && item.no > 0 ? item.no : i + 1 }));
}
function parseGviz(response) {
  if (!response || response.status !== "ok" || !response.table) {
    const details = (response?.errors || []).map((e) => e.detailed_message || e.message).join("; ");
    throw new Error(details || "Google Sheets tidak mengembalikan data yang valid.");
  }
  const cols = response.table.cols || [];
  const headers = cols.map((col) => normalizeText(col.label).replace(/[^a-z0-9]/g, ""));
  const required = ["mapel", "kelas", "no", "nama", "nilai"];
  const indexes = required.map((field) => headers.indexOf(field));
  if (indexes.some((idx) => idx < 0)) {
    // Beberapa jenis Sheets menghilangkan label; urutan baku tetap didukung.
    if (cols.length < 5 || headers.some(Boolean)) {
      throw new Error("Kolom Google Sheets wajib: MAPEL, KELAS, NO, NAMA, NILAI (baris 1).");
    }
    for (let i = 0; i < 5; i++) indexes[i] = i;
  }
  const rows = (response.table.rows || []).map((row) => indexes.map((idx) => {
    const cell = row.c?.[idx];
    return cell?.v ?? cell?.f ?? "";
  }));
  return normalizeRows(rows);
}
/** Muat gviz sebagai JSONP melalui tag script supaya tidak bergantung pada CORS browser. */
function getGoogleSheetRows() {
  return new Promise((resolve, reject) => {
    const callbackName = "__portalNilai_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => { delete window[callbackName]; script.remove(); clearTimeout(timeout); };
    const finish = (err, rows) => { if (settled) return; settled = true; cleanup(); err ? reject(err) : resolve(rows); };
    window[callbackName] = (payload) => {
      try { finish(null, parseGviz(payload)); } catch (error) { finish(error); }
    };
    const timeout = setTimeout(() => finish(new Error("Google Sheets tidak merespons. Periksa koneksi dan izin spreadsheet.")), 15000);
    script.onerror = () => finish(new Error("Gagal terhubung ke Google Sheets. Pastikan spreadsheet dapat dibaca secara publik."));
    const qs = new URLSearchParams({ gid: SHEET_GID, headers: "1", tqx: `out:json;responseHandler:${callbackName};reqId:1`, _: String(Date.now()) });
    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?${qs}`;
    document.head.appendChild(script);
  });
}
function setStatus(mode) {
  state.mode = mode;
  const status = $("topStatus");
  status.classList.toggle("connected", mode === "connected");
  status.classList.toggle("error", mode === "error");
  $("topStatusText").textContent = mode === "demo" ? "Mode pratinjau" : mode === "connected" ? "Terhubung ke Sheets" : mode === "loading" ? "Sinkronisasi..." : "Periksa koneksi";
  if (state.kelas) renderStatusMessage();
}
function renderStatusMessage() {
  $("syncInfo").textContent = state.mode === "demo" ? "Data ilustrasi · belum terhubung" : state.mode === "loading" ? "Mengambil data terbaru..." : state.mode === "error" ? "Gagal menyinkronkan" : `Terakhir dicek ${state.lastChecked ? state.lastChecked.toLocaleTimeString("id-ID", {hour:"2-digit",minute:"2-digit"}) : "—"}`;
}
function showWarning(message) {
  const warning = $("dataWarning");
  warning.textContent = message;
  warning.classList.toggle("hidden", !message);
}
async function loadData() {
  if (state.updating) return;
  if (USE_DEMO) {
    state.rows = normalizeRows(DEMO_DATA);
    state.hasLoaded = true;
    state.lastChecked = new Date();
    setStatus("demo");
    showWarning("MODE CONTOH: Data yang ditampilkan masih fiktif. Isi GOOGLE_SHEET_ID dan SHEET_GID di config.js untuk menampilkan data Google Sheets.");
    renderResults();
    return;
  }
  state.updating = true;
  $("refreshButton").disabled = true;
  $("refreshButton").classList.add("loading");
  setStatus("loading");
  showWarning("");
  try {
    const rows = await getGoogleSheetRows();
    state.rows = rows;
    state.hasLoaded = true;
    state.lastChecked = new Date();
    setStatus("connected");
  } catch (error) {
    console.error("Gagal mengambil spreadsheet:", error);
    setStatus("error");
    showWarning(`Data belum berhasil diperbarui: ${error.message} ${state.hasLoaded ? "Data terakhir yang berhasil diambil tetap ditampilkan." : "Periksa panduan README.md."}`);
  } finally {
    state.updating = false;
    $("refreshButton").disabled = false;
    $("refreshButton").classList.remove("loading");
    renderResults();
  }
}
function updateSteps(step) {
  [["stepOne",1],["stepTwo",2],["stepThree",3]].forEach(([id,num]) => {
    $(id).classList.toggle("active", num === step);
    $(id).classList.toggle("done", num < step);
  });
}
function navigate(step) {
  $("subjectSection").classList.toggle("hidden", step !== 1);
  $("classSection").classList.toggle("hidden", step !== 2);
  $("resultsSection").classList.toggle("hidden", step !== 3);
  updateSteps(step);
  if (step > 1 && window.innerWidth < 720) $("classSection").closest(".workspace").scrollIntoView({behavior: "smooth", block: "start"});
}
function chooseSubject(code) {
  state.subject = code; state.kelas = null; state.filter = "all"; state.search = "";
  $("selectedSubjectPill").textContent = SUBJECTS[code];
  navigate(2);
}
function chooseClass(code) {
  state.kelas = code; state.filter = "all"; state.search = "";
  $("searchInput").value = "";
  document.querySelectorAll(".filter-pill").forEach((button) => {
    const selected = button.dataset.filter === "all";
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("classInTitle").textContent = code === "7A" ? "VII A" : "VII B";
  $("resultSubjectLabel").textContent = SUBJECTS[state.subject];
  $("resultCrumb").replaceChildren(document.createTextNode(SUBJECTS[state.subject] + " › Kelas " + (code === "7A" ? "7 A" : "7 B")));
  $("kkmDisplay").textContent = String(KKM);
  renderResults();
  navigate(3);
}
function gradeRow(item) {
  const pass = item.score >= KKM;
  const tr = document.createElement("tr");
  if (!pass) tr.classList.add("remidi-row");
  const values = [item.no, item.name, item.score.toLocaleString("id-ID", { maximumFractionDigits: 2 }), pass ? "Sukses" : "Remidi"];
  const labels = ["NO", "NAMA", "NILAI", "KETERANGAN"];
  values.forEach((value, idx) => {
    const td = document.createElement("td");
    td.dataset.label = labels[idx];
    if (idx === 2) { const pill = document.createElement("span"); pill.className = "score-pill " + (pass ? "passed" : "failed"); pill.textContent = String(value); td.appendChild(pill); }
    else if (idx === 3) { const badge = document.createElement("span"); badge.className = "result-badge " + (pass ? "passed" : "failed"); badge.textContent = String(value); td.appendChild(badge); }
    else td.textContent = String(value); // textContent menghindari HTML/script dari isi spreadsheet.
    tr.appendChild(td);
  });
  return tr;
}
function renderResults() {
  if (!state.kelas || !state.subject) return;
  const rows = state.rows.filter((row) => row.subject === state.subject && row.kelas === state.kelas)
    .sort((a,b) => a.no - b.no || a.name.localeCompare(b.name, "id"));
  const success = rows.filter((row) => row.score >= KKM).length;
  $("totalCount").textContent = rows.length;
  $("successCount").textContent = success;
  $("remidiCount").textContent = rows.length - success;
  const query = normalizeText(state.search);
  const filtered = rows.filter((row) => (state.filter === "all" || (state.filter === "success" ? row.score >= KKM : row.score < KKM)) && (!query || normalizeText(row.name).includes(query)));
  const tbody = $("gradesBody");
  tbody.replaceChildren(...filtered.map(gradeRow));
  $("emptyState").classList.toggle("hidden", filtered.length > 0);
  $("rowInfo").textContent = `Menampilkan ${filtered.length} dari ${rows.length} siswa`;
  $("tableCaption").textContent = state.filter === "all" ? "Menampilkan seluruh siswa" : state.filter === "success" ? "Hanya siswa dengan nilai memenuhi KKM" : "Hanya siswa yang perlu remidi";
  renderStatusMessage();
}
function init() {
  document.querySelectorAll("[data-subject]").forEach((button) => button.addEventListener("click", () => chooseSubject(button.dataset.subject)));
  document.querySelectorAll("[data-class]").forEach((button) => button.addEventListener("click", () => chooseClass(button.dataset.class)));
  $("backToSubjects").addEventListener("click", () => { state.subject = null; state.kelas = null; navigate(1); });
  $("backToClasses").addEventListener("click", () => { state.kelas = null; navigate(2); });
  $("brandHome").addEventListener("click", () => { state.subject = null; state.kelas = null; navigate(1); });
  $("searchInput").addEventListener("input", (event) => { state.search = event.target.value; renderResults(); });
  document.querySelectorAll(".filter-pill").forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter-pill").forEach((pill) => { const selected = pill === button; pill.classList.toggle("selected", selected); pill.setAttribute("aria-pressed", String(selected)); });
    renderResults();
  }));
  $("refreshButton").addEventListener("click", loadData);
  $("footerYear").textContent = String(new Date().getFullYear());
  $("kkmDisplay").textContent = String(KKM);
  loadData();
  if (!USE_DEMO) {
    window.setInterval(() => { if (!document.hidden) loadData(); }, REFRESH_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && state.lastChecked && Date.now() - state.lastChecked.getTime() >= REFRESH_MS) loadData(); });
  }
}
init();
