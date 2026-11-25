(function(){
  /* ===== playlist (pořadí = pořadí přehrávání) ===== */
  var TRACKS = [
    { src: "audio/01-xerxes-circle-of-shit.mp3", title: "Circle of Shit", artist: "Xerxes", dur: 111 },
    { src: "audio/02-nasilnik-kleptoman.mp3", title: "Kleptoman", artist: "Násilník", dur: 215 },
    { src: "audio/03-kde-je-tyler-outro.mp3", title: "Kde je Tyler (outro)", artist: "Tyler Durden", dur: 128 }
  ];
  var mp = document.getElementById("mp"), au = document.getElementById("mp-audio");
  if (!mp || !au) return;
  var $ = function(s){ return mp.querySelector(s); }, $$ = function(s){ return Array.prototype.slice.call(mp.querySelectorAll(s)); };
  var seek = $(".js-mp-seek"), vol = $(".js-mp-vol"), list = $(".js-mp-list");
  var cur = 0, ctx = null, an = null, freq = null, noWebAudio = false, seeking = false;
  document.body.classList.add("has-mp");

  function fmt(s){ s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function fill(r){ r.style.setProperty("--p", (r.value - r.min) / (r.max - r.min) * 100 + "%"); }

  TRACKS.forEach(function(t, k){
    var li = document.createElement("li");
    li.innerHTML = '<button type="button"><span class="n">0' + (k + 1) + '</span><span class="t">' + t.title + '<small>' + t.artist + '</small></span><span class="d">' + fmt(t.dur) + '</span></button>';
    li.querySelector("button").addEventListener("click", function(){ load(k, true); });
    list.appendChild(li);
  });

  function ui(){
    var t = TRACKS[cur];
    $(".js-mp-title").textContent = t.title;
    $(".js-mp-artist").textContent = t.artist;
    $(".js-mp-ix").textContent = (cur + 1) + "/" + TRACKS.length;
    $(".js-mp-mq").innerHTML = t.artist + " — " + t.title + " &nbsp; <small>▶ " + (cur + 1) + "/" + TRACKS.length + "</small>";
    $(".js-mp-dur").textContent = fmt(t.dur);
    $$(".mp-list li").forEach(function(li, k){ li.classList.toggle("on", k === cur); });
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: "1+kk se zahradou · Mníšek" }); } catch (e) {}
    }
  }
  function load(k, play){
    cur = (k + TRACKS.length) % TRACKS.length;
    au.src = TRACKS[cur].src; seek.value = 0; fill(seek); $(".js-mp-cur").textContent = "0:00";
    ui(); if (play) start();
  }
  function setupAudio(){
    if (ctx || noWebAudio) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      var src = ctx.createMediaElementSource(au);
      an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .8;
      src.connect(an); an.connect(ctx.destination);
      freq = new Uint8Array(an.frequencyBinCount);
    } catch (e) { noWebAudio = true; ctx = null; an = null; }
  }
  function start(){
    /* iPhone: hrát i při zapnutém tichém režimu */
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    setupAudio();
    if (ctx && ctx.state === "suspended") ctx.resume();
    var p = au.play(); if (p && p.catch) p.catch(function(){});
  }
  function toggle(){ if (au.paused) start(); else au.pause(); }

  $$(".js-mp-play").forEach(function(b){ b.addEventListener("click", toggle); });
  $(".js-mp-prev").addEventListener("click", function(){ if (au.currentTime > 3) au.currentTime = 0; else load(cur - 1, !au.paused); });
  $(".js-mp-next").addEventListener("click", function(){ load(cur + 1, !au.paused); });
  function setState(s){
    mp.dataset.state = s;
    document.body.classList.toggle("mp-open", s === "full");
    $(".js-mp-open").setAttribute("aria-expanded", s === "full");
    if (s === "full") setTimeout(function(){ $(".js-mp-close").focus({ preventScroll: true }); }, 50);
  }
  $(".js-mp-open").addEventListener("click", function(){ setState("full"); });
  $(".js-mp-close").addEventListener("click", function(){ setState("mini"); $(".js-mp-open").focus({ preventScroll: true }); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && mp.dataset.state === "full" && document.getElementById("lb").hidden) setState("mini"); });

  au.addEventListener("play", function(){ mp.classList.add("playing"); $$(".js-mp-play").forEach(function(b){ b.setAttribute("aria-label", "Pozastavit hudbu"); }); });
  au.addEventListener("pause", function(){ mp.classList.remove("playing"); $$(".js-mp-play").forEach(function(b){ b.setAttribute("aria-label", "Přehrát hudbu"); }); });
  au.addEventListener("ended", function(){ load(cur + 1, true); });
  au.addEventListener("loadedmetadata", function(){ if (isFinite(au.duration)) $(".js-mp-dur").textContent = fmt(au.duration); });
  au.addEventListener("timeupdate", function(){
    if (seeking || !au.duration) return;
    seek.value = Math.round(au.currentTime / au.duration * 1000); fill(seek);
    $(".js-mp-cur").textContent = fmt(au.currentTime);
  });
  seek.addEventListener("input", function(){
    seeking = true; fill(seek);
    var d = au.duration || TRACKS[cur].dur; $(".js-mp-cur").textContent = fmt(seek.value / 1000 * d);
  });
  seek.addEventListener("change", function(){
    var d = au.duration || TRACKS[cur].dur; seeking = false;
    if (!au.duration) { start(); }
    try { au.currentTime = seek.value / 1000 * d; } catch (e) {}
  });
  vol.addEventListener("input", function(){ au.volume = vol.value / 100; fill(vol); });
  au.volume = vol.value / 100; fill(vol); fill(seek);

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", start);
      navigator.mediaSession.setActionHandler("pause", function(){ au.pause(); });
      navigator.mediaSession.setActionHandler("previoustrack", function(){ load(cur - 1, true); });
      navigator.mediaSession.setActionHandler("nexttrack", function(){ load(cur + 1, true); });
    } catch (e) {}
  }

  /* ===== vizualizér: lesklé aqua sloupce + pixelové špičky + odraz + bubliny na beat ===== */
  var big = $(".mp-viz"), mini = $(".mp-mini-viz"), N = 28;
  var lv = new Float32Array(N), pk = new Float32Array(N), pv = new Float32Array(N), bubbles = [], beatAvg = .2, t0 = performance.now(), last = 0;
  function fit(c){
    var r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (w && h && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; c._g = null; }
    return d;
  }
  function bands(dt){
    var playing = !au.paused, t = (performance.now() - t0) / 1000;
    if (an && playing) {
      an.getByteFrequencyData(freq);
      for (var b = 0; b < N; b++) {
        var a = Math.floor(Math.pow(b / N, 1.6) * 92) + 1, z = Math.max(a + 1, Math.floor(Math.pow((b + 1) / N, 1.6) * 92) + 1), s = 0;
        for (var j = a; j < z; j++) s += freq[j];
        var v = s / (z - a) / 255; v = Math.min(1, v * (1 + b / N * .6));
        lv[b] += (v - lv[b]) * .55;
      }
    } else {
      for (var b2 = 0; b2 < N; b2++) {
        var v2 = playing
          ? Math.max(.05, (.42 + .32 * Math.sin(t * 7.3 + b2 * .55) * Math.sin(t * 1.7 + b2 * .21) + .22 * Math.random()) * (1 - b2 / N * .45))
          : .05 + .04 * Math.sin(t * 1.8 + b2 * .5) + .02 * Math.sin(t * 3.1 - b2 * .9);
        lv[b2] += (v2 - lv[b2]) * Math.min(1, dt * (playing ? 14 : 4));
      }
    }
  }
  function drawBig(d, dt){
    var c = big.getContext("2d"), W = big.width, H = big.height; if (!W) return;
    var base = H * .74, bw = W / N;
    c.clearRect(0, 0, W, H);
    var bass = (lv[0] + lv[1] + lv[2] + lv[3]) / 4;
    var g0 = c.createRadialGradient(W / 2, base, 0, W / 2, base, W * .6);
    g0.addColorStop(0, "rgba(40,190,255," + (.12 + bass * .4) + ")"); g0.addColorStop(1, "rgba(40,190,255,0)");
    c.fillStyle = g0; c.fillRect(0, 0, W, H);
    if (!big._g) {
      big._g = c.createLinearGradient(0, 62 * d, 0, base);
      big._g.addColorStop(0, "#effdff"); big._g.addColorStop(.3, "#7fe2ff"); big._g.addColorStop(.65, "#1fa8ee"); big._g.addColorStop(1, "#0a58a8");
      big._r = c.createLinearGradient(0, base, 0, H);
      big._r.addColorStop(0, "rgba(60,190,255,.38)"); big._r.addColorStop(1, "rgba(60,190,255,0)");
    }
    for (var b = 0; b < N; b++) {
      var h = Math.max(2 * d, lv[b] * (base - 62 * d)), x = b * bw + bw * .14, w = bw * .72;
      c.fillStyle = big._g; c.fillRect(x, base - h, w, h);
      c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(x, base - h, w * .3, h);
      c.fillStyle = big._r; c.fillRect(x, base + 2 * d, w, h * .42);
      if (h > pk[b]) { pk[b] = h; pv[b] = 0; } else { pv[b] += 60 * d * dt; pk[b] = Math.max(0, pk[b] - pv[b] * dt * 6); }
      c.fillStyle = "#e9fbff"; c.shadowColor = "rgba(120,230,255,.9)"; c.shadowBlur = 6 * d;
      c.fillRect(x, base - pk[b] - 4 * d, w, 2 * d); c.shadowBlur = 0;
    }
    c.fillStyle = "rgba(160,230,255,.5)"; c.fillRect(0, base, W, 1 * d);
    if (!au.paused && bass > .3 && bass > beatAvg * 1.25 && bubbles.length < 24) {
      for (var k = 0; k < 2; k++) bubbles.push({ x: Math.random() * W, y: base, r: (3 + Math.random() * 7) * d, s: (25 + Math.random() * 45) * d, w: Math.random() * 6 });
    }
    beatAvg = beatAvg * .94 + bass * .06;
    for (var q = bubbles.length - 1; q >= 0; q--) {
      var B = bubbles[q]; B.y -= B.s * dt; B.x += Math.sin((B.y + B.w * 40) / (18 * d)) * .4 * d;
      if (B.y < -B.r) { bubbles.splice(q, 1); continue; }
      c.beginPath(); c.arc(B.x, B.y, B.r, 0, Math.PI * 2);
      c.strokeStyle = "rgba(200,245,255,.75)"; c.lineWidth = 1 * d; c.stroke();
      c.fillStyle = "rgba(120,220,255,.12)"; c.fill();
      c.beginPath(); c.arc(B.x - B.r * .35, B.y - B.r * .35, B.r * .28, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,.85)"; c.fill();
    }
  }
  function drawMini(d){
    var c = mini.getContext("2d"), W = mini.width, H = mini.height; if (!W) return;
    c.clearRect(0, 0, W, H);
    var M = 5, bw = W / M;
    if (!mini._g) { mini._g = c.createLinearGradient(0, 0, 0, H); mini._g.addColorStop(0, "#effdff"); mini._g.addColorStop(.45, "#5fd6ff"); mini._g.addColorStop(1, "#0a6fc0"); }
    for (var b = 0; b < M; b++) {
      var v = 0; for (var j = 0; j < 5; j++) v += lv[Math.min(N - 1, b * 5 + j)]; v /= 5;
      var h = Math.max(2 * d, Math.min(1, v * 1.3) * H), x = b * bw + bw * .18;
      c.fillStyle = mini._g; c.fillRect(x, H - h, bw * .64, h);
    }
  }
  function loop(now){
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (!document.hidden) {
      bands(dt);
      var bass = (lv[0] + lv[1] + lv[2] + lv[3]) / 4;
      mp.style.setProperty("--beat", au.paused ? 0 : Math.min(1, bass).toFixed(2));
      var d = fit(mini); drawMini(d);
      if (mp.dataset.state === "full") { var d2 = fit(big); drawBig(d2, dt); }
    }
    requestAnimationFrame(loop);
  }
  load(0, false);
  requestAnimationFrame(loop);
})();
