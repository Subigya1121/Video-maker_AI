import { useState, useRef, useEffect } from "react";

const API = "https://api.anthropic.com/v1/messages";
const callClaude = async (prompt, system = "You are an expert viral content creator.") => {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return data.content.map(b => b.text || "").join("");
};

const TONES = [
  { label: "Funny", icon: "😂", color: "#facc15" },
  { label: "Educational", icon: "📚", color: "#60a5fa" },
  { label: "Motivational", icon: "🔥", color: "#f97316" },
  { label: "News", icon: "📰", color: "#a78bfa" },
  { label: "Storytelling", icon: "📖", color: "#34d399" },
];
const FORMATS = [
  { label: "Short-form", sub: "Reels / TikTok / Shorts", icon: "📱", ar: "9:16" },
  { label: "Long-form", sub: "YouTube / Documentary", icon: "🖥️", ar: "16:9" },
];
const TEMPLATES = [
  { name: "Cinematic", emoji: "🎬", bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" },
  { name: "Motivational", emoji: "🔥", bg: "linear-gradient(135deg,#fc4a1a,#f7b733)" },
  { name: "Educational", emoji: "📚", bg: "linear-gradient(135deg,#005c97,#363795)" },
  { name: "News", emoji: "📰", bg: "linear-gradient(135deg,#141e30,#243b55)" },
  { name: "Aesthetic", emoji: "✨", bg: "linear-gradient(135deg,#ee9ca7,#ffdde1)" },
];
const LANGS = ["English 🇬🇧", "Nepali 🇳🇵", "Both English + Nepali 🌏"];

const formatSRT = (seconds) => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${h}:${m}:${s},000`;
};

export default function App() {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState(0);
  const [tone, setTone] = useState("Educational");
  const [lang, setLang] = useState("English 🇬🇧");
  const [template, setTemplate] = useState("Cinematic");
  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState([]);
  const [selVoice, setSelVoice] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [previewLine, setPreviewLine] = useState(0);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const previewTimer = useRef(null);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length) setSelVoice(v[0]);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  // Canvas preview animation
  useEffect(() => {
    if (step !== 3 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const tmpl = TEMPLATES.find(t => t.name === template) || TEMPLATES[0];
    const lines = script.replace(/\[.*?\]/g, "").split(/[.!?\n]+/).filter(l => l.trim().length > 5).slice(0, 12);
    let frame = 0;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      // Background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (template === "Motivational") { grad.addColorStop(0, "#fc4a1a"); grad.addColorStop(1, "#f7b733"); }
      else if (template === "Educational") { grad.addColorStop(0, "#005c97"); grad.addColorStop(1, "#363795"); }
      else if (template === "News") { grad.addColorStop(0, "#141e30"); grad.addColorStop(1, "#243b55"); }
      else if (template === "Aesthetic") { grad.addColorStop(0, "#ee9ca7"); grad.addColorStop(1, "#ffdde1"); }
      else { grad.addColorStop(0, "#0f0c29"); grad.addColorStop(0.5, "#302b63"); grad.addColorStop(1, "#24243e"); }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Scan line
      const scanY = (frame * 2) % H;
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0, scanY, W, 2);

      // Corner brackets
      ctx.strokeStyle = "rgba(110,231,247,0.6)";
      ctx.lineWidth = 2;
      const br = 16;
      [[0,0],[W,0],[0,H],[W,H]].forEach(([cx,cy]) => {
        const sx = cx === 0 ? cx : cx - br; const ex = cx === 0 ? cx + br : cx;
        const sy = cy === 0 ? cy : cy - br; const ey = cy === 0 ? cy + br : cy;
        ctx.beginPath(); ctx.moveTo(ex, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, ey); ctx.stroke();
      });

      // Format label
      const isShort = format === 0;
      ctx.fillStyle = "rgba(110,231,247,0.9)";
      ctx.font = "bold 10px monospace";
      ctx.fillText(isShort ? "9:16 • REELS" : "16:9 • YOUTUBE", 12, 18);

      // Waveform decoration
      for (let i = 0; i < 30; i++) {
        const x = 10 + i * 8;
        const h2 = 3 + Math.sin(frame * 0.05 + i * 0.5) * 8;
        ctx.fillStyle = `rgba(110,231,247,${0.3 + Math.abs(Math.sin(frame * 0.05 + i)) * 0.5})`;
        ctx.fillRect(x, H - 30 - h2, 4, h2 * 2);
      }

      // Subtitle box
      const lineIdx = Math.floor(frame / 90) % (lines.length || 1);
      if (lines[lineIdx]) {
        setPreviewLine(lineIdx);
        const text = lines[lineIdx].trim();
        const words = text.split(" ");
        const wordIdx = Math.floor((frame % 90) / 90 * words.length);
        
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(20, H - 65, W - 40, 48, 8) : ctx.rect(20, H - 65, W - 40, 48);
        ctx.fill();

        ctx.font = `bold ${isShort ? 13 : 11}px 'Arial', sans-serif`;
        ctx.textAlign = "center";
        words.forEach((word, wi) => {
          ctx.fillStyle = wi === wordIdx ? "#6EE7F7" : "white";
          const totalW = words.length * (isShort ? 18 : 14);
          const startX = W / 2 - totalW / 2 + wi * (isShort ? 18 : 14);
          ctx.fillText(word, startX, H - 38);
        });
        ctx.textAlign = "left";
      }

      // REC indicator
      if (Math.floor(frame / 30) % 2 === 0) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(W - 20, 14, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 9px monospace";
        ctx.fillText("REC", W - 40, 18);
      }

      frame++;
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [step, template, script, format]);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setProgress(10);
    const isShort = format === 0;
    const langNote = lang.includes("Nepali") && lang.includes("English") 
      ? "Write in English, then add a Nepali translation below each paragraph in (नेपाली)." 
      : lang.includes("Nepali") ? "Write entirely in Nepali (नेपाली भाषामा लेख्नुहोस्)." : "";
    
    try {
      setLoadMsg("✍️ Writing your viral script…");
      const scriptResult = await callClaude(
        `Create a ${isShort ? "60-90 second TikTok/Reels" : "3-5 minute YouTube"} script about: "${topic}"
Tone: ${tone} | Style: ${template}
${langNote}

Structure:
[HOOK] (Bold 1-2 sentence opener that stops the scroll)
[MAIN CONTENT] (3-4 engaging paragraphs with key points)  
[CTA] (Strong call to action)

Make it punchy, conversational, and perfectly paced for ${isShort ? "vertical short-form video" : "YouTube"}.`,
        "You are an elite viral content creator who has written scripts for creators with 10M+ followers. Create gripping, scroll-stopping scripts."
      );
      setScript(scriptResult); setProgress(40);

      setLoadMsg("🎬 Building scene storyboard…");
      const scenesRaw = await callClaude(
        `Break this script into 5 visual scenes. Return ONLY a JSON array, no markdown:\n[{"scene":"Scene Name","visual":"What appears on screen","duration":10,"type":"Stock footage|AI image|Text overlay|Graphic","emoji":"🏔️","color":"#hex"}]\n\nScript:\n${scriptResult}`,
        "Return ONLY valid JSON array. No markdown, no explanation."
      );
      try {
        const parsed = JSON.parse(scenesRaw.replace(/```json|```/g, "").trim());
        setScenes(parsed);
      } catch {
        setScenes([
          { scene: "Opening Hook", visual: `Dynamic title card: "${topic}"`, duration: 5, type: "Text overlay", emoji: "⚡", color: "#6ee7f7" },
          { scene: "Context Setup", visual: "Establishing visuals for " + topic, duration: 12, type: "Stock footage", emoji: "🎬", color: "#a78bfa" },
          { scene: "Core Insight", visual: "Infographic animations", duration: 15, type: "AI image", emoji: "💡", color: "#facc15" },
          { scene: "Key Takeaway", visual: "Bold text overlay with b-roll", duration: 10, type: "Graphic", emoji: "🎯", color: "#34d399" },
          { scene: "Call to Action", visual: "Subscribe/Follow animation", duration: 5, type: "Graphic", emoji: "🔔", color: "#f97316" },
        ]);
      }
      setProgress(75);

      setLoadMsg("🏷️ Crafting title & hashtags…");
      const metaRaw = await callClaude(
        `For a ${tone} ${isShort ? "Reels/TikTok" : "YouTube"} video about "${topic}", generate:
Return ONLY JSON (no backticks): {"title":"Viral title max 70 chars","hashtags":["#tag1","#tag2",...10 tags total]}`,
        "Return ONLY valid JSON. No markdown."
      );
      try {
        const meta = JSON.parse(metaRaw.replace(/```json|```/g, "").trim());
        setVideoTitle(meta.title);
        setHashtags(meta.hashtags || []);
      } catch {
        setVideoTitle(`The Truth About ${topic} 🔥`);
        setHashtags(["#viral", "#trending", "#reels", "#youtube", "#" + topic.replace(/\s+/g, "").toLowerCase()]);
      }
      setProgress(100);
      setTimeout(() => { setStep(2); setLoading(false); }, 400);
    } catch (err) {
      alert("Generation failed. Please try again."); setLoading(false);
    }
  };

  const playTTS = () => {
    if (!window.speechSynthesis) { alert("Text-to-speech is not supported in this browser."); return; }
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    const clean = script.replace(/\[.*?\]/g, "").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    if (selVoice) utt.voice = selVoice;
    utt.rate = 0.92; utt.pitch = 1.05;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  };

  const dlScript = () => {
    const content = `═══════════════════════════════════\nREEL.AI — VIDEO SCRIPT\n═══════════════════════════════════\nTOPIC: ${topic}\nFORMAT: ${FORMATS[format].label}\nTONE: ${tone}\nLANGUAGE: ${lang}\nTEMPLATE: ${template}\n\nTITLE: ${videoTitle}\n\n${script}\n\nHASHTAGS:\n${hashtags.join(" ")}\n═══════════════════════════════════\nGenerated by REEL.AI`;
    const blob = new Blob([content], { type: "text/plain" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${topic.replace(/\s+/g, "-")}-script.txt`; a.click();
  };

  const dlSRT = () => {
    const sentences = script.replace(/\[.*?\]/g, "").split(/[.!?]+/).filter(s => s.trim().length > 8);
    let srt = ""; let t = 0;
    sentences.forEach((s, i) => {
      const dur = Math.max(2.5, s.split(" ").length * 0.45);
      srt += `${i + 1}\n${formatSRT(t)} --> ${formatSRT(t + dur)}\n${s.trim()}\n\n`;
      t += dur;
    });
    const blob = new Blob([srt], { type: "text/plain" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${topic.replace(/\s+/g, "-")}-subtitles.srt`; a.click();
  };

  const copyHashtags = () => {
    navigator.clipboard.writeText(hashtags.join(" "));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const tmplObj = TEMPLATES.find(t => t.name === template) || TEMPLATES[0];

  return (
    <div style={{ minHeight: "100vh", background: "#030308", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Grotesk:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0c0c18; } ::-webkit-scrollbar-thumb { background: #6ee7f7; border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        @keyframes waveBar { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .pill-btn { cursor:pointer; border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:8px 18px; font-size:13px; font-family:'Space Grotesk',sans-serif; transition:all 0.2s; background:transparent; color:#94a3b8; }
        .pill-btn:hover { border-color:rgba(110,231,247,0.5); color:#e2e8f0; }
        .pill-btn.active { background:rgba(110,231,247,0.12); border-color:#6ee7f7; color:#6ee7f7; font-weight:600; }
        .glass { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); backdrop-filter:blur(12px); }
        .glow-btn { background:linear-gradient(135deg,#6ee7f7,#818cf8); color:#000; font-weight:700; border:none; border-radius:12px; cursor:pointer; font-family:'Syne',sans-serif; letter-spacing:0.5px; transition:all 0.3s; box-shadow:0 0 20px rgba(110,231,247,0.3); }
        .glow-btn:hover { transform:translateY(-2px); box-shadow:0 0 35px rgba(110,231,247,0.5); }
        .glow-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .scene-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px; transition:all 0.2s; }
        .scene-card:hover { border-color:rgba(110,231,247,0.3); background:rgba(110,231,247,0.04); }
        textarea { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:#e2e8f0; font-family:'Space Grotesk',sans-serif; font-size:14px; line-height:1.7; padding:16px; width:100%; resize:vertical; outline:none; transition:border-color 0.2s; }
        textarea:focus { border-color:#6ee7f7; }
        select { background:#0c0c18; border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#e2e8f0; padding:8px 12px; font-size:13px; font-family:'Space Grotesk',sans-serif; outline:none; cursor:pointer; }
        .step-dot { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; transition:all 0.3s; }
        .hashtag { background:rgba(110,231,247,0.1); border:1px solid rgba(110,231,247,0.25); border-radius:999px; padding:5px 12px; font-size:12px; color:#6ee7f7; font-family:'Space Grotesk',sans-serif; }
        .wave-bar { width:3px; border-radius:2px; background:#6ee7f7; animation: waveBar 0.8s ease-in-out infinite; }
      `}</style>

      {/* BG grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(110,231,247,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(110,231,247,0.03) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
      <div style={{ position:"fixed", top:"20%", left:"10%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(110,231,247,0.06),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"20%", right:"5%", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(247,37,133,0.06),transparent 70%)", pointerEvents:"none" }} />

      <div style={{ maxWidth:820, margin:"0 auto", padding:"24px 16px", position:"relative" }}>
        {/* Header */}
        <div className="fade-up" style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:8 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:"linear-gradient(135deg,#6ee7f7,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 0 24px rgba(110,231,247,0.4)" }}>🎬</div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, margin:0, background:"linear-gradient(135deg,#6ee7f7,#e2e8f0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>REEL.AI</h1>
            <span style={{ background:"rgba(247,37,133,0.2)", border:"1px solid rgba(247,37,133,0.4)", borderRadius:6, padding:"2px 8px", fontSize:10, color:"#f72585", fontWeight:700, letterSpacing:1 }}>BETA</span>
          </div>
          <p style={{ color:"#64748b", fontSize:14, fontFamily:"'Space Grotesk',sans-serif", margin:0 }}>AI Reel Generator · Nepali & English · Topic → Full Video in 1 Click</p>
        </div>

        {/* Step indicator */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, marginBottom:32 }}>
          {["Setup", "Script & Voice", "Preview & Export"].map((label, i) => {
            const num = i + 1; const active = step === num; const done = step > num;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div className="step-dot" style={{ background: done ? "#6ee7f7" : active ? "linear-gradient(135deg,#6ee7f7,#818cf8)" : "rgba(255,255,255,0.06)", border: active ? "none" : done ? "none" : "1px solid rgba(255,255,255,0.12)", color: (done||active) ? "#000" : "#475569", boxShadow: active ? "0 0 16px rgba(110,231,247,0.5)" : "none" }}>
                    {done ? "✓" : num}
                  </div>
                  <span style={{ fontSize:10, color: active ? "#6ee7f7" : "#475569", fontFamily:"'Space Grotesk',sans-serif", fontWeight: active ? 600 : 400 }}>{label}</span>
                </div>
                {i < 2 && <div style={{ width:60, height:1, background: step > i+1 ? "#6ee7f7" : "rgba(255,255,255,0.08)", margin:"0 8px 18px" }} />}
              </div>
            );
          })}
        </div>

        {/* ───── STEP 1 ───── */}
        {step === 1 && (
          <div className="fade-up">
            <div className="glass" style={{ borderRadius:20, padding:32 }}>
              {/* Topic */}
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", marginBottom:10, textTransform:"uppercase" }}>Your Video Topic</label>
                <div style={{ position:"relative" }}>
                  <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Mount Everest Climbing Facts, Python Tutorial, Morning Routine for Success..." rows={3} style={{ fontSize:16, paddingLeft:44 }} />
                  <span style={{ position:"absolute", left:14, top:16, fontSize:20 }}>💡</span>
                </div>
              </div>

              {/* Format */}
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", marginBottom:12, textTransform:"uppercase" }}>Video Format</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {FORMATS.map((f, i) => (
                    <button key={i} onClick={() => setFormat(i)} style={{ background: format===i ? "rgba(110,231,247,0.1)" : "rgba(255,255,255,0.03)", border:`1px solid ${format===i?"#6ee7f7":"rgba(255,255,255,0.1)"}`, borderRadius:12, padding:"14px 16px", cursor:"pointer", color: format===i?"#6ee7f7":"#94a3b8", textAlign:"left", transition:"all 0.2s" }}>
                      <div style={{ fontSize:22, marginBottom:4 }}>{f.icon}</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color: format===i?"#6ee7f7":"#e2e8f0" }}>{f.label}</div>
                      <div style={{ fontSize:11, color:"#64748b", fontFamily:"'Space Grotesk',sans-serif" }}>{f.sub} · {f.ar}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", marginBottom:12, textTransform:"uppercase" }}>Tone & Style</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {TONES.map(t => (
                    <button key={t.label} onClick={() => setTone(t.label)} className="pill-btn" style={tone===t.label?{background:`rgba(${t.color === "#facc15"?"250,204,21":t.color === "#60a5fa"?"96,165,250":t.color === "#f97316"?"249,115,22":t.color === "#a78bfa"?"167,139,250":"52,211,153"},0.15)`, borderColor:t.color, color:t.color}:{}}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", marginBottom:12, textTransform:"uppercase" }}>Language</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {LANGS.map(l => (
                    <button key={l} onClick={() => setLang(l)} className="pill-btn" style={lang===l?{background:"rgba(247,37,133,0.12)", borderColor:"#f72585", color:"#f72585"}:{}}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div style={{ marginBottom:28 }}>
                <label style={{ display:"block", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", marginBottom:12, textTransform:"uppercase" }}>Visual Template</label>
                <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => setTemplate(t.name)} style={{ flexShrink:0, borderRadius:10, border:`2px solid ${template===t.name?"#6ee7f7":"transparent"}`, overflow:"hidden", cursor:"pointer", padding:0, background:"none", outline:"none", boxShadow: template===t.name?"0 0 16px rgba(110,231,247,0.4)":"none", transition:"all 0.2s" }}>
                      <div style={{ width:70, height:50, background:t.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{t.emoji}</div>
                      <div style={{ background:"#0c0c18", padding:"4px 6px", fontSize:10, color: template===t.name?"#6ee7f7":"#64748b", fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>{t.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate btn */}
              {loading ? (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:16 }}>
                    <div style={{ width:20, height:20, border:"2px solid #6ee7f7", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", color:"#6ee7f7", fontSize:15 }}>{loadMsg}</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#6ee7f7,#818cf8)", borderRadius:2, transition:"width 0.5s ease" }} />
                  </div>
                </div>
              ) : (
                <button className="glow-btn" onClick={generate} disabled={!topic.trim()} style={{ width:"100%", padding:"16px", fontSize:16, letterSpacing:0.5 }}>
                  🚀 Generate My Video Content
                </button>
              )}
            </div>
          </div>
        )}

        {/* ───── STEP 2 ───── */}
        {step === 2 && (
          <div className="fade-up">
            {/* Title */}
            <div className="glass" style={{ borderRadius:16, padding:20, marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", textTransform:"uppercase" }}>📌 Suggested Title</span>
              </div>
              <p style={{ margin:0, fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#e2e8f0" }}>{videoTitle}</p>
            </div>

            {/* Script */}
            <div className="glass" style={{ borderRadius:16, padding:24, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", textTransform:"uppercase" }}>✍️ Your Script</span>
                <span style={{ fontSize:11, color:"#475569", fontFamily:"'Space Grotesk',sans-serif" }}>Click to edit ✏️</span>
              </div>
              <textarea value={script} onChange={e => setScript(e.target.value)} rows={14} />
            </div>

            {/* TTS */}
            <div className="glass" style={{ borderRadius:16, padding:20, marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                <div>
                  <p style={{ margin:"0 0 4px", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", textTransform:"uppercase" }}>🗣️ Voiceover Preview</p>
                  <p style={{ margin:0, fontSize:11, color:"#64748b", fontFamily:"'Space Grotesk',sans-serif" }}>Browser TTS · Real AI voices available via ElevenLabs API</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {playing && (
                    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:20 }}>
                      {[0.4,0.8,0.6,1,0.5,0.9,0.3].map((d,i) => (
                        <div key={i} className="wave-bar" style={{ height:`${d*18}px`, animationDelay:`${i*0.12}s` }} />
                      ))}
                    </div>
                  )}
                  <select value={selVoice?.name || ""} onChange={e => setSelVoice(voices.find(v => v.name === e.target.value))} style={{ maxWidth:160 }}>
                    {voices.map(v => <option key={v.name} value={v.name}>{v.name.slice(0,22)}</option>)}
                  </select>
                  <button onClick={playTTS} style={{ background: playing ? "rgba(247,37,133,0.15)" : "rgba(110,231,247,0.1)", border:`1px solid ${playing?"#f72585":"#6ee7f7"}`, borderRadius:10, padding:"8px 18px", color: playing?"#f72585":"#6ee7f7", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, transition:"all 0.2s" }}>
                    {playing ? "⏹ Stop" : "▶ Play"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"12px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#94a3b8", cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif", fontSize:14 }}>← Back</button>
              <button className="glow-btn" onClick={() => setStep(3)} style={{ flex:2, padding:"12px", fontSize:15 }}>🎬 See Scenes & Export →</button>
            </div>
          </div>
        )}

        {/* ───── STEP 3 ───── */}
        {step === 3 && (
          <div className="fade-up">
            {/* Canvas preview */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
              <div style={{ position:"relative" }}>
                <canvas ref={canvasRef} width={format===0?270:480} height={format===0?480:270} style={{ borderRadius:14, border:"1px solid rgba(110,231,247,0.2)", display:"block", boxShadow:"0 0 40px rgba(110,231,247,0.1)" }} />
                <div style={{ position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)", background:"rgba(110,231,247,0.1)", border:"1px solid rgba(110,231,247,0.3)", borderRadius:999, padding:"3px 12px", fontSize:10, color:"#6ee7f7", fontFamily:"monospace", whiteSpace:"nowrap" }}>
                  {format===0?"9:16 · Reels/Shorts":"16:9 · YouTube"} — PREVIEW
                </div>
              </div>
            </div>

            {/* Storyboard */}
            <div className="glass" style={{ borderRadius:16, padding:20, marginBottom:16, marginTop:16 }}>
              <p style={{ margin:"0 0 14px", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", textTransform:"uppercase" }}>🎞️ Scene Storyboard</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {scenes.map((s, i) => (
                  <div key={i} className="scene-card" style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:`${s.color || "#6ee7f7"}22`, border:`1px solid ${s.color || "#6ee7f7"}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{s.emoji || "🎬"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:"#e2e8f0", marginBottom:2 }}>{s.scene}</div>
                      <div style={{ fontSize:12, color:"#64748b", fontFamily:"'Space Grotesk',sans-serif" }}>{s.visual}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:11, color:"#6ee7f7", fontFamily:"monospace", fontWeight:700 }}>{s.duration}s</div>
                      <div style={{ fontSize:10, color:"#475569", fontFamily:"'Space Grotesk',sans-serif" }}>{s.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            <div className="glass" style={{ borderRadius:16, padding:20, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <p style={{ margin:0, fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", textTransform:"uppercase" }}>🏷️ Hashtags & SEO</p>
                <button onClick={copyHashtags} style={{ background: copied?"rgba(52,211,153,0.15)":"rgba(110,231,247,0.08)", border:`1px solid ${copied?"#34d399":"rgba(110,231,247,0.3)"}`, borderRadius:8, padding:"5px 12px", color: copied?"#34d399":"#6ee7f7", cursor:"pointer", fontSize:12, fontFamily:"'Space Grotesk',sans-serif", transition:"all 0.2s" }}>
                  {copied ? "✓ Copied!" : "Copy all"}
                </button>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {hashtags.map((h, i) => <span key={i} className="hashtag">{h}</span>)}
              </div>
            </div>

            {/* Export */}
            <div className="glass" style={{ borderRadius:16, padding:20, marginBottom:20 }}>
              <p style={{ margin:"0 0 14px", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1.5, color:"#6ee7f7", textTransform:"uppercase" }}>📦 Export & Download</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { icon:"📄", label:"Script (.txt)", sub:"Full script + metadata", fn: dlScript, c:"#6ee7f7" },
                  { icon:"💬", label:"Subtitles (.srt)", sub:"Timed captions file", fn: dlSRT, c:"#a78bfa" },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.fn} style={{ background:`rgba(${btn.c==="#6ee7f7"?"110,231,247":"167,139,250"},0.06)`, border:`1px solid rgba(${btn.c==="#6ee7f7"?"110,231,247":"167,139,250"},0.2)`, borderRadius:12, padding:"14px", cursor:"pointer", textAlign:"left", transition:"all 0.2s", color:"#e2e8f0" }} onMouseEnter={e => e.currentTarget.style.borderColor=btn.c} onMouseLeave={e => e.currentTarget.style.borderColor=`rgba(${btn.c==="#6ee7f7"?"110,231,247":"167,139,250"},0.2)`}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{btn.icon}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:btn.c }}>{btn.label}</div>
                    <div style={{ fontSize:11, color:"#475569", fontFamily:"'Space Grotesk',sans-serif" }}>{btn.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline info */}
            <div style={{ background:"rgba(247,37,133,0.06)", border:"1px solid rgba(247,37,133,0.15)", borderRadius:12, padding:16, marginBottom:20 }}>
              <p style={{ margin:"0 0 8px", fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1.5, color:"#f72585", textTransform:"uppercase" }}>🚀 Full Production Pipeline</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {["FFmpeg · Video Assembly","MoviePy · Transitions","ElevenLabs · AI Voice","Pexels API · Stock Footage","Stable Diffusion · AI Images","OpenAI Whisper · Subtitles"].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#94a3b8", fontFamily:"'Space Grotesk',sans-serif" }}>
                    <span style={{ color:"#f72585" }}>◆</span>{item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={() => setStep(2)} style={{ flex:1, padding:"12px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#94a3b8", cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif", fontSize:14 }}>← Script</button>
              <button className="glow-btn" onClick={() => { setStep(1); setScript(""); setScenes([]); setHashtags([]); setVideoTitle(""); setTopic(""); if(window.speechSynthesis) window.speechSynthesis.cancel(); setPlaying(false); }} style={{ flex:2, padding:"12px", fontSize:15 }}>
                ✨ Create New Video
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:"center", marginTop:32, padding:"16px 0" }}>
          <p style={{ margin:0, fontSize:11, color:"#1e293b", fontFamily:"'Space Grotesk',sans-serif" }}>REEL.AI · Built for Nepal 🇳🇵 & Creators Worldwide · Powered by Claude</p>
        </div>
      </div>
    </div>
  );
}
