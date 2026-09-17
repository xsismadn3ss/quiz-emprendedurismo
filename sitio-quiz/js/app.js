/* App Quiz Emprendedurismo — vanilla JS, compatible file://
   Sin fetch, sin modules. Lee QUESTION_BANK y DOCS de questions-data.js.
   Claves localStorage: eq_stats_v1, eq_history_v1, eq_prefs_v1
*/
(function () {
  "use strict";
  var LS_STATS = "eq_stats_v1", LS_HIST = "eq_history_v1", LS_PREFS = "eq_prefs_v1";

  function $(id) { return document.getElementById(id); }
  function load(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function docTitle(id) { for (var i = 0; i < DOCS.length; i++) if (DOCS[i].id === id) return DOCS[i].titulo; return id; }
  function docFull(id) {
    if (id === "ALL") return "Todos los documentos";
    if (typeof DOC_NAMES !== "undefined" && DOC_NAMES[id]) return DOC_NAMES[id].replace(/\.pdf$/i, "");
    return docTitle(id);
  }
  function tipoLabel(t) { return t === "vf" ? "Verdadero/Falso" : "Opción múltiple"; }
  function difLabel(d) {
    if (d === "trampa") return "preguntas trampa";
    if (d === "detalle") return "detalle";
    return "básica";
  }

  var stats = load(LS_STATS, {});
  var history = load(LS_HIST, []);
  var prefs = load(LS_PREFS, { doc: "ALL", num: "15", fails: false });

  function getStats(id) { if (!stats[id]) stats[id] = { fails: 0, hits: 0, streak: 0 }; return stats[id]; }
  function weight(q) {
    var s = getStats(q.id);
    var w = 1 + s.fails * 2.5 - Math.min(s.streak, 3) * 0.8;
    if (q.dificultad === "trampa") w += 0.5;
    return Math.max(w, 0.2);
  }
  function pickQuestions(docFilter, numOpt, onlyFails) {
    var pool = QUESTION_BANK.filter(function (q) {
      if (docFilter !== "ALL" && q.doc !== docFilter) return false;
      if (onlyFails && getStats(q.id).fails < 1) return false;
      return true;
    });
    if (!pool.length) return [];
    pool = pool.slice().sort(function (a, b) { return weight(b) - weight(a); });
    var n = numOpt === "all" ? pool.length : Math.min(parseInt(numOpt, 10) || 15, pool.length);
    var top = pool.slice(0, n);
    // Mezcla 80% ponderadas + 20% aleatorias nuevas para no estancar
    var mixed = shuffle(top);
    return mixed.map(function (q) {
      var order = shuffle(q.opciones.map(function (_, i) { return i; }));
      return { q: q, order: order, answer: order.indexOf(q.respuesta) };
    });
  }

  // ---------- Router ----------
  var views = { inicio: $("view-inicio"), quiz: $("view-quiz"), biblioteca: $("view-biblioteca") };
  function router() {
    var h = (location.hash || "#/inicio").replace("#/", "");
    if (!views[h]) h = "inicio";
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== h; });
    var links = document.querySelectorAll("[data-nav]");
    links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-nav") === h); });
    if (h === "inicio") renderHome();
    if (h === "biblioteca") renderDocs();
  }
  window.addEventListener("hashchange", router);

  // ---------- Inicio ----------
  var charts = {};
  function destroyChart(k) { if (charts[k]) { try { charts[k].destroy(); } catch (e) {} delete charts[k]; } }

  function renderHome() {
    $("bankInfo").textContent = QUESTION_BANK.length + " preguntas · " + DOCS.length + " documentos · refuerzo de fallos activo";
    var sel = $("filtroDoc");
    if (!sel.options.length) {
      sel.innerHTML = '<option value="ALL">Todos los documentos</option>' +
        DOCS.map(function (d) { return '<option value="' + d.id + '">' + esc(d.titulo) + '</option>'; }).join("");
      sel.value = prefs.doc; $("filtroNum").value = prefs.num; $("soloFalladas").checked = !!prefs.fails;
    }
    // Cards
    var total = history.length, avg = 0, best = 0, last = null;
    if (total) {
      var sum = 0;
      history.forEach(function (h) { sum += h.pct; if (h.pct > best) best = h.pct; });
      avg = Math.round(sum / total); last = history[history.length - 1];
    }
    var fails = Object.keys(stats).filter(function (k) { return stats[k].fails > 0; }).length;
    var trend = "";
    if (history.length >= 2) {
      var d = history[history.length - 1].pct - history[history.length - 2].pct;
      trend = d > 0 ? "▲ +" + d + " pts" : d < 0 ? "▼ " + d + " pts" : "= igual";
    }
    $("statCards").innerHTML =
      card(total, "intentos") + card(total ? avg + "%" : "—", "promedio") +
      card(total ? best + "%" : "—", "mejor") + card(fails, "por reforzar") +
      card(trend || "—", "tendencia");
    function card(b, s) { return '<div class="card stat"><b>' + esc(String(b)) + '</b><span>' + esc(s) + '</span></div>'; }

    // Historial tabla
    var tb = document.querySelector("#historyTable tbody");
    if (!history.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">Sin intentos todavía.</td></tr>'; }
    else {
      tb.innerHTML = history.slice(-10).reverse().map(function (h) {
        var d = new Date(h.fecha);
        return "<tr><td>" + esc(d.toLocaleString()) + "</td><td>" + h.aciertos + "/" + h.total +
          "</td><td>" + h.pct + "%</td><td>" + esc(docFull(h.docs || "ALL")) + "</td><td>" + (h.seg || 0) + "s</td></tr>";
      }).join("");
    }
    renderCharts();
  }

  function renderCharts() {
    var hasChart = typeof window.Chart !== "undefined";
    destroyChart("h"); destroyChart("d");
    var last10 = history.slice(-10);
    if (!hasChart) {
      $("chartHistory").style.display = "none"; $("chartDocs").style.display = "none";
      var fh = $("chartHistoryFallback"), fd = $("chartDocsFallback");
      fh.hidden = false; fd.hidden = false;
      fh.innerHTML = last10.length ? last10.map(function (h, i) {
        return bar("Intento " + (history.length - last10.length + i + 1), h.pct);
      }).join("") : '<p class="muted small">Sin datos.</p>';
      var per = perDoc();
      fd.innerHTML = Object.keys(per).length ? Object.keys(per).map(function (k) {
        return bar(docFull(k), per[k].pct);
      }).join("") : '<p class="muted small">Sin datos.</p>';
      return;
    }
    $("chartHistory").style.display = ""; $("chartDocs").style.display = "";
    $("chartHistoryFallback").hidden = true; $("chartDocsFallback").hidden = true;
    var ctx1 = $("chartHistory").getContext("2d");
    charts.h = new Chart(ctx1, { type: "bar", data: { labels: last10.map(function (_, i) { return "I" + (history.length - last10.length + i + 1); }), datasets: [{ data: last10.map(function (h) { return h.pct; }) }] }, options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } } });
    var per = perDoc(), keys = Object.keys(per);
    var ctx2 = $("chartDocs").getContext("2d");
    charts.d = new Chart(ctx2, { type: "bar", data: { labels: keys.map(docFull), datasets: [{ data: keys.map(function (k) { return per[k].pct; }) }] }, options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } } });
  }
  function bar(label, pct) {
    return '<div class="bar"><span>' + esc(label) + '</span><i style="width:' + pct + '%"></i><b>' + pct + '%</b></div>';
  }
  function perDoc() {
    var agg = {};
    history.forEach(function (h) {
      Object.keys(h.porDoc || {}).forEach(function (k) {
        if (!agg[k]) agg[k] = { ok: 0, tot: 0 };
        agg[k].ok += h.porDoc[k].ok; agg[k].tot += h.porDoc[k].tot;
      });
    });
    var out = {};
    Object.keys(agg).forEach(function (k) { out[k] = { pct: Math.round(agg[k].ok * 100 / Math.max(agg[k].tot, 1)) }; });
    return out;
  }

  // ---------- Quiz ----------
  var session = null;
  function startQuiz(docFilter, numOpt, onlyFails) {
    var items = pickQuestions(docFilter, numOpt, onlyFails);
    if (!items.length) { alert("No hay preguntas para ese filtro. Desactiva 'Solo repasar falladas' o elige otro documento."); return; }
    session = { items: items, idx: 0, ok: 0, answers: [], t0: Date.now(), docs: docFilter };
    location.hash = "#/quiz";
    $("quizSetup").hidden = true; $("quizPlay").hidden = false; $("quizResult").hidden = true;
    renderQ();
  }
  function renderQ() {
    var it = session.items[session.idx], q = it.q;
    $("quizMeta").textContent = "Pregunta " + (session.idx + 1) + " de " + session.items.length + " · " + docFull(q.doc) + " · " + q.tema;
    $("progressBar").style.width = Math.round(session.idx * 100 / session.items.length) + "%";
    $("qTag").textContent = tipoLabel(q.tipo) + " · " + difLabel(q.dificultad);
    $("qText").textContent = q.pregunta;
    var box = $("qOpts"); box.innerHTML = ""; $("qFeedback").hidden = true; $("btnNext").disabled = true;
    it.order.forEach(function (origIdx, pos) {
      var b = document.createElement("button");
      b.className = "opt"; b.textContent = q.opciones[origIdx];
      b.onclick = function () { answer(pos); };
      box.appendChild(b);
    });
  }
  function answer(pos) {
    var it = session.items[session.idx], q = it.q;
    var good = pos === it.answer;
    var btns = $("qOpts").children;
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === it.answer) btns[i].classList.add("correct");
      else if (i === pos) btns[i].classList.add("wrong");
    }
    var s = getStats(q.id);
    if (good) { s.hits++; s.streak++; session.ok++; } else { s.fails++; s.streak = 0; }
    save(LS_STATS, stats);
    session.answers.push({ id: q.id, doc: q.doc, ok: good, n: session.idx + 1 });
    var fb = $("qFeedback");
    fb.hidden = false;
    fb.className = "feedback " + (good ? "ok" : "no");
    fb.innerHTML = "<b>" + (good ? "Correcto." : "Incorrecto.") + "</b> " + esc(q.explicacion) +
      '<br><span class="small muted">Fuente: ' + esc(q.fuente) + "</span>";
    $("btnNext").disabled = false;
    $("btnNext").textContent = session.idx + 1 === session.items.length ? "Ver resultado" : "Siguiente";
  }
  function nextQ() {
    if (session.idx + 1 < session.items.length) { session.idx++; renderQ(); }
    else finishQuiz();
  }
  function finishQuiz() {
    var seg = Math.round((Date.now() - session.t0) / 1000);
    var pct = Math.round(session.ok * 100 / session.items.length);
    var porDoc = {};
    session.answers.forEach(function (a) {
      if (!porDoc[a.doc]) porDoc[a.doc] = { ok: 0, tot: 0 };
      porDoc[a.doc].tot++; if (a.ok) porDoc[a.doc].ok++;
    });
    var fails = session.answers.filter(function (a) { return !a.ok; });
    history.push({ fecha: new Date().toISOString(), total: session.items.length, aciertos: session.ok, pct: pct, porDoc: porDoc, docs: session.docs, seg: seg });
    save(LS_HIST, history);
    $("quizPlay").hidden = true;
    var r = $("quizResult"); r.hidden = false;
    $("progressBar").style.width = "100%";
    r.innerHTML = "<h2>Resultado: " + session.ok + "/" + session.items.length + " (" + pct + "%)</h2>" +
      '<p class="muted">Tiempo: ' + seg + 's · ' + esc(new Date().toLocaleString()) + "</p>" +
      "<p>" + (pct >= 80 ? "Buen dominio. Mantén el ritmo." : pct >= 60 ? "Vas bien, refuerza las falladas." : "Toca repasar: usa el modo Solo repasar falladas.") + "</p>" +
      (fails.length ? '<p class="small">A repasar: ' + fails.map(function (f) { return "Pregunta " + f.n + " (" + esc(docFull(f.doc)) + ")"; }).join(" · ") + "</p>" : "<p>Sin fallos. Excelente.</p>") +
      '<div class="form-row"><button class="btn primary" id="btnAgain">Nuevo intento</button>' +
      (fails.length ? '<button class="btn" id="btnOnlyFails">Repetir falladas de este intento</button>' : "") +
      '<a class="btn" href="#/inicio">Ver estadísticas</a></div>';
    $("btnAgain").onclick = function () { startQuiz(prefs.doc, prefs.num, false); };
    var bf = $("btnOnlyFails");
    if (bf) bf.onclick = function () {
      var ids = {}; fails.forEach(function (f) { ids[f.id] = 1; });
      var items = session.items.filter(function (it) { return ids[it.q.id]; });
      session = { items: shuffle(items), idx: 0, ok: 0, answers: [], t0: Date.now(), docs: session.docs };
      $("quizResult").hidden = true; $("quizPlay").hidden = false; renderQ();
    };
  }

  // ---------- Biblioteca ----------
  function renderDocs() {
    $("docList").innerHTML = DOCS.map(function (d) {
      var n = QUESTION_BANK.filter(function (q) { return q.doc === d.id; }).length;
      return '<article class="card doc-card"><p class="pill">' + n + ' preguntas</p><h3>' + esc(d.titulo) + "</h3>" +
        '<p class="muted small">' + esc(d.descripcion) + "</p>" +
        '<div class="form-row"><a class="btn primary" href="' + d.archivo + '" target="_blank" rel="noopener">Abrir</a>' +
        '<a class="btn" href="' + d.archivo + '" download>Descargar</a></div></article>';
    }).join("");
  }

  // ---------- Eventos ----------
  $("btnStart").onclick = function () {
    prefs = { doc: $("filtroDoc").value, num: $("filtroNum").value, fails: $("soloFalladas").checked };
    save(LS_PREFS, prefs); startQuiz(prefs.doc, prefs.num, prefs.fails);
  };
  $("btnStart2").onclick = function () { startQuiz(prefs.doc, prefs.num, false); };
  $("btnRetryFails").onclick = function () { startQuiz($("filtroDoc").value, $("filtroNum").value, true); };
  $("btnNext").onclick = nextQ;
  $("btnQuit").onclick = function () { if (session && confirm("Terminar intento y guardar resultado parcial?")) finishQuiz(); };
  $("btnClear").onclick = function () {
    if (!confirm("Borrar estadísticas, historial y refuerzo guardados en este navegador?")) return;
    if (!confirm("Confirmar de nuevo: se perderá todo el progreso.")) return;
    localStorage.removeItem(LS_STATS); localStorage.removeItem(LS_HIST);
    stats = {}; history = []; renderHome();
  };

  router();
  renderHome();
})();
