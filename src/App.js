import React, { useState, useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TICKERS = ["EURUSD","GBPUSD","USDCHF","USDJPY","GBPJPY","AUDUSD","NZDUSD","USDCAD","XAUUSD","XAGUSD","NAS100","US30","SPX500","BTCUSD"];
const ACCOUNTS = ["Real-Account","Demo-Account","Prop-Firm","Challenge"];
const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const DIRECTIONS = ["Buy","Sell"];
const TRADE_TYPES = ["Executed","Missed","Partials"];
const SESSIONS = ["New York Open","New York PM","London Open","London Close","Asian","Overlap"];
const TIMEFRAMES = ["1 Minute","3 Minutes","5 Minutes","15 Minutes","30 Minutes","1 Hour","4 Hour","Daily","Weekly"];

const KEY_LEVELS = [
  "FVG (4HR)","FVG (1HR)","FVG (15M)","FVG (5M)",
  "Order Block (4HR)","Order Block (1HR)","Order Block (15M)",
  "Breaker Block","Mitigation Block","Rejection Block",
  "Liquidity Pool (BSL)","Liquidity Pool (SSL)",
  "Equal Highs","Equal Lows",
  "Previous Day High","Previous Day Low",
  "Previous Week High","Previous Week Low",
  "Balanced Price Range","Implied Fair Value Gap",
  "Optimal Trade Entry (OTE)","Fibonacci 61.8%","Fibonacci 70.5%",
  "Discount Array","Premium Array","Equilibrium (50%)"
];

const CONFLUENCES = [
  "Liquidity Sweep","Market Structure Shift (MSS)","Break of Structure (BOS)",
  "SMT Divergence","HTF Alignment","Change in State of Delivery (CISD)",
  "Power of 3 (PO3)","Time of Day","Kill Zone","Killzone Overlap",
  "Turtle Soup","OTE Confirmation","Displacement Candle",
  "Institutional Order Flow","NWOG / NDOG","London Judas Swing",
  "Dealing Range","Seek & Destroy","ICT Macro","News Catalyst"
];

const RULES_BROKEN_LIST = [
  "Overtraded","Moved SL","Early Entry","No Confirmation",
  "Revenge Trade","FOMO","Ignored HTF Bias","Wrong Session",
  "No Kill Zone","Traded News","Sized Too Big","No Trading Plan"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function getMonth(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

function getWeekday(dateStr) {
  if (!dateStr) return "";
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[new Date(dateStr).getDay()];
}

function getYear(dateStr) {
  if (!dateStr) return "";
  return String(new Date(dateStr).getFullYear());
}

function emptyTrade() {
  return {
    id: uid(), name: "", status: "Open",
    ticker: "", account: "Real-Account",
    entryDate: "", exitDate: "",
    weekday: "", month: "", year: "",
    direction: "", model: "", tradeType: "Executed",
    session: "", entryTF: "",
    keyLevel: "", confluences: [], rulesBroken: [],
    grossPnl: "", commission: "", netPnl: "",
    screenshot: null, screenshotName: "",
    notes: ""
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight:"100vh", background:"#0c0c18", color:"#e2e2f2", fontFamily:"'Syne', sans-serif", fontSize:"13px" },
  nav: { background:"#0f0f1e", borderBottom:"1px solid #1e1e2e", padding:"0 20px", display:"flex", alignItems:"center", gap:"0", position:"sticky", top:0, zIndex:50 },
  page: { padding:"20px", maxWidth:"1300px", margin:"0 auto" },
  card: { background:"#0f0f1e", border:"1px solid #1e1e2e", borderRadius:"10px", padding:"20px 24px", marginBottom:"16px" },
  label: { fontSize:"10px", letterSpacing:"2.5px", color:"#5a5a7a", textTransform:"uppercase", display:"block", marginBottom:"6px", fontFamily:"'DM Mono', monospace" },
  input: { width:"100%", background:"#1a1a28", border:"1px solid #2a2a3a", borderRadius:"6px", color:"#e2e2f2", padding:"8px 11px", fontSize:"13px", fontFamily:"'Syne', sans-serif", boxSizing:"border-box", outline:"none" },
  textarea: { width:"100%", background:"#1a1a28", border:"1px solid #2a2a3a", borderRadius:"6px", color:"#e2e2f2", padding:"10px 11px", fontSize:"13px", fontFamily:"'Syne', sans-serif", boxSizing:"border-box", outline:"none", resize:"vertical" },
  row: { display:"flex", alignItems:"flex-start", padding:"9px 0", borderBottom:"1px solid #161624", gap:"0" },
  rowLabel: { width:"210px", display:"flex", alignItems:"center", gap:"8px", color:"#5a5a7a", fontSize:"12px", flexShrink:0, paddingTop:"2px" },
};

// ─── Tag ──────────────────────────────────────────────────────────────────────
const TAG_MAP = {
  "Buy":     { bg:"#1a3a1a", color:"#4ade80", border:"#2a5a2a" },
  "Sell":    { bg:"#3a1a1a", color:"#f87171", border:"#5a2a2a" },
  "Open":    { bg:"#1a2f1a", color:"#4ade80", border:"#2a4a2a" },
  "Closed":  { bg:"#1a1a2a", color:"#94a3b8", border:"#2a2a3a" },
  "Executed":{ bg:"#1e2a1e", color:"#86efac", border:"#2a3a2a" },
  "Missed":  { bg:"#2a1e1e", color:"#fca5a5", border:"#3a2a2a" },
  "Partials":{ bg:"#2a2010", color:"#fbbf24", border:"#3a3010" },
  "Liquidity Sweep":              { bg:"#1a2a1a", color:"#86efac", border:"#2a4a2a" },
  "Market Structure Shift (MSS)": { bg:"#2a1e10", color:"#fbbf24", border:"#3a2e1a" },
  "SMT Divergence":               { bg:"#1e1a2a", color:"#c084fc", border:"#2e2a3a" },
  "HTF Alignment":                { bg:"#2a1010", color:"#f97316", border:"#3a2020" },
};

function Tag({ label, small, onRemove }) {
  const c = TAG_MAP[label] || { bg:"#1e2030", color:"#94a3b8", border:"#2a2a3a" };
  return (
    <span style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}`, borderRadius:"4px",
      padding: small ? "1px 7px" : "2px 10px", fontSize: small ? "10px" : "11px",
      fontWeight:600, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:"4px" }}>
      {label}
      {onRemove && <span onClick={e=>{e.stopPropagation();onRemove();}} style={{cursor:"pointer",opacity:0.6,fontSize:"10px"}}>✕</span>}
    </span>
  );
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────
function MultiSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={() => setOpen(!open)} style={{ ...S.input, minHeight:"36px", cursor:"pointer", display:"flex", flexWrap:"wrap", gap:"4px", alignItems:"center" }}>
        {value.length === 0
          ? <span style={{ color:"#4a4a6a", fontSize:"12px" }}>{placeholder}</span>
          : value.map(v => <Tag key={v} label={v} small onRemove={() => onChange(value.filter(x=>x!==v))} />)}
        <span style={{ marginLeft:"auto", color:"#4a4a6a", fontSize:"10px" }}>▾</span>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:200,
          background:"#12121e", border:"1px solid #2a2a3a", borderRadius:"8px", maxHeight:"220px", overflowY:"auto" }}>
          {options.map(o => (
            <div key={o} onClick={() => onChange(value.includes(o) ? value.filter(x=>x!==o) : [...value, o])}
              style={{ padding:"8px 12px", cursor:"pointer", fontSize:"12px",
                color: value.includes(o) ? "#c9b96e" : "#9a9ab8",
                background: value.includes(o) ? "#1e1e10" : "transparent",
                display:"flex", alignItems:"center", gap:"8px",
                borderBottom:"1px solid #1a1a28" }}>
              <span style={{ color: value.includes(o) ? "#c9b96e" : "#3a3a5a", fontSize:"11px" }}>
                {value.includes(o) ? "✓" : "○"}
              </span>{o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
function Sel({ options, value, onChange, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...S.input, appearance:"none", cursor:"pointer", color: value ? "#e2e2f2" : "#4a4a6a" }}>
      <option value="">{placeholder || "—"}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Screenshot Upload ────────────────────────────────────────────────────────
function SSUpload({ value, name, onChange }) {
  const ref = useRef();
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target.result, file.name);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <div onClick={() => ref.current.click()} style={{
        border:"2px dashed #2a2a3a", borderRadius:"8px", padding:"16px", cursor:"pointer",
        textAlign:"center", background:"#12121e", transition:"border-color 0.2s"
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor="#c9b96e"}
        onMouseLeave={e => e.currentTarget.style.borderColor="#2a2a3a"}>
        {value
          ? <div>
              <img src={value} alt="SS" style={{ maxWidth:"100%", maxHeight:"200px", borderRadius:"6px", marginBottom:"8px" }} />
              <div style={{ fontSize:"11px", color:"#5a5a7a" }}>{name} · Click to change</div>
            </div>
          : <div>
              <div style={{ fontSize:"24px", marginBottom:"6px" }}>📷</div>
              <div style={{ color:"#5a5a7a", fontSize:"12px" }}>Click to upload screenshot</div>
              <div style={{ color:"#3a3a5a", fontSize:"10px", marginTop:"4px" }}>PNG, JPG, WEBP supported</div>
            </div>
        }
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => handleFile(e.target.files[0])} />
      {value && (
        <button onClick={() => onChange(null, "")} style={{
          marginTop:"6px", padding:"4px 12px", background:"#2a1010", border:"1px solid #3a2020",
          borderRadius:"4px", color:"#f87171", cursor:"pointer", fontSize:"11px", fontFamily:"inherit"
        }}>Remove</button>
      )}
    </div>
  );
}

// ─── Balance Dashboard ────────────────────────────────────────────────────────
function BalanceDashboard({ settings, trades, onSettingsChange }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(settings);

  const totalNet = trades.reduce((sum, t) => sum + (parseFloat(t.netPnl) || 0), 0);
  const currentBalance = (parseFloat(settings.initialBalance) || 0) + totalNet;
  const target = parseFloat(settings.targetBalance) || 0;
  const maxDD = parseFloat(settings.maxDD) || 0;
  const initial = parseFloat(settings.initialBalance) || 0;

  const wins = trades.filter(t => t.status === "Closed" && (parseFloat(t.netPnl) || 0) > 0).length;
  const losses = trades.filter(t => t.status === "Closed" && (parseFloat(t.netPnl) || 0) < 0).length;
  const closedTotal = trades.filter(t => t.status === "Closed").length;
  const winRate = closedTotal > 0 ? ((wins / closedTotal) * 100).toFixed(1) : "0.0";

  const progress = target > initial ? Math.min(((currentBalance - initial) / (target - initial)) * 100, 100) : 0;
  const ddProgress = initial > 0 ? Math.min(((initial - currentBalance) / (initial - maxDD || 1)) * 100, 100) : 0;
  const inDD = currentBalance < initial;

  return (
    <div style={{ ...S.card, marginBottom:"20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:"#5a5a7a", textTransform:"uppercase", fontFamily:"'DM Mono', monospace" }}>Account Overview</div>
        <button onClick={() => { if(editing){onSettingsChange(tmp);} setEditing(!editing); }}
          style={{ padding:"5px 14px", background: editing?"#1a3020":"#151525", border:`1px solid ${editing?"#2a5a2a":"#2a2a3a"}`,
            borderRadius:"5px", color: editing?"#4ade80":"#7a7aaa", cursor:"pointer", fontFamily:"inherit", fontSize:"11px" }}>
          {editing ? "✓ Save" : "✎ Edit"}
        </button>
      </div>

      {editing ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:"12px" }}>
          {[
            { label:"Initial Balance ($)", key:"initialBalance" },
            { label:"Target Balance ($)", key:"targetBalance" },
            { label:"Max Drawdown ($)", key:"maxDD" },
          ].map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input type="number" value={tmp[f.key]} onChange={e => setTmp({...tmp,[f.key]:e.target.value})}
                style={S.input} placeholder="0.00" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Main Balance Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:"12px", marginBottom:"20px" }}>
            {[
              { label:"Initial Balance", value:`$${Number(initial).toLocaleString("en",{minimumFractionDigits:2})}`, color:"#7a7aaa" },
              { label:"Current Balance", value:`$${Number(currentBalance).toLocaleString("en",{minimumFractionDigits:2})}`,
                color: currentBalance >= initial ? "#4ade80" : "#f87171" },
              { label:"Target Balance", value:`$${Number(target).toLocaleString("en",{minimumFractionDigits:2})}`, color:"#c9b96e" },
              { label:"Max Drawdown", value:`$${Number(maxDD).toLocaleString("en",{minimumFractionDigits:2})}`, color:"#f97316" },
              { label:"Total Net P&L", value:`${totalNet >= 0 ? "+" : ""}$${Number(totalNet).toLocaleString("en",{minimumFractionDigits:2})}`,
                color: totalNet >= 0 ? "#4ade80" : "#f87171" },
              { label:"Win Rate", value:`${winRate}%`, color: parseFloat(winRate) >= 50 ? "#4ade80" : "#f87171" },
              { label:"Wins / Losses", value:`${wins} / ${losses}`, color:"#94a3b8" },
              { label:"Total Trades", value:closedTotal, color:"#7a7aaa" },
            ].map(s => (
              <div key={s.label} style={{ background:"#12121e", border:"1px solid #1a1a2a", borderRadius:"8px", padding:"14px 16px" }}>
                <div style={{ fontSize:"10px", color:"#4a4a6a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px", fontFamily:"'DM Mono', monospace" }}>{s.label}</div>
                <div style={{ fontSize:"20px", fontWeight:"700", color:s.color, fontFamily:"'DM Mono', monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Progress to Target */}
          {target > initial && (
            <div style={{ marginBottom:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                <span style={{ fontSize:"11px", color:"#5a5a7a" }}>Progress to Target</span>
                <span style={{ fontSize:"11px", color:"#c9b96e", fontFamily:"'DM Mono',monospace" }}>{progress.toFixed(1)}%</span>
              </div>
              <div style={{ height:"6px", background:"#1a1a2a", borderRadius:"3px", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#c9b96e,#f0d080)", borderRadius:"3px", transition:"width 0.5s" }} />
              </div>
            </div>
          )}

          {/* Drawdown Progress */}
          {inDD && maxDD > 0 && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                <span style={{ fontSize:"11px", color:"#f97316" }}>⚠ Drawdown</span>
                <span style={{ fontSize:"11px", color:"#f97316", fontFamily:"'DM Mono',monospace" }}>{ddProgress.toFixed(1)}%</span>
              </div>
              <div style={{ height:"6px", background:"#1a1a2a", borderRadius:"3px", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${ddProgress}%`, background:"linear-gradient(90deg,#f97316,#f87171)", borderRadius:"3px" }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Trade Form ───────────────────────────────────────────────────────────────
function TradeDetail({ trade, onSave, onDelete, onBack }) {
  const [t, setT] = useState({ ...trade });
  const [editMode, setEditMode] = useState(!trade.ticker);

  const upd = (k, v) => {
    const n = { ...t, [k]: v };
    // Auto-fill weekday, month, year from entryDate
    if (k === "entryDate") {
      n.weekday = getWeekday(v);
      n.month = getMonth(v);
      n.year = getYear(v);
    }
    // Auto calc net pnl
    if (k === "grossPnl" || k === "commission") {
      const gross = parseFloat(k === "grossPnl" ? v : n.grossPnl) || 0;
      const comm = parseFloat(k === "commission" ? v : n.commission) || 0;
      n.netPnl = (gross - comm).toFixed(2);
    }
    setT(n);
  };

  const save = () => { onSave(t); setEditMode(false); };

  const propRow = (icon, label, content) => (
    <div style={S.row}>
      <div style={S.rowLabel}><span>{icon}</span>{label}</div>
      <div style={{ flex:1 }}>{content}</div>
    </div>
  );

  const readVal = (v, fallback="—") => (
    <span style={{ fontSize:"13px", color: v ? "#e2e2f2" : "#4a4a6a" }}>{v || fallback}</span>
  );

  return (
    <div>
      {/* Back + Actions */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#7a7aaa", cursor:"pointer", fontSize:"22px", padding:"0", lineHeight:1 }}>←</button>
        <div style={{ flex:1 }} />
        {!editMode && (
          <button onClick={() => setEditMode(true)} style={{ padding:"7px 18px", background:"#151525", border:"1px solid #2a2a3a", borderRadius:"6px", color:"#c9b96e", cursor:"pointer", fontFamily:"inherit", fontSize:"12px" }}>✎ Edit</button>
        )}
        {editMode && (
          <button onClick={save} style={{ padding:"7px 18px", background:"#1a3020", border:"1px solid #2a5a2a", borderRadius:"6px", color:"#4ade80", cursor:"pointer", fontFamily:"inherit", fontSize:"12px", fontWeight:600 }}>✓ Save</button>
        )}
        <button onClick={() => onDelete(t.id)} style={{ padding:"7px 18px", background:"#2a1010", border:"1px solid #3a2020", borderRadius:"6px", color:"#f87171", cursor:"pointer", fontFamily:"inherit", fontSize:"12px" }}>Delete</button>
      </div>

      {/* Title */}
      <div style={{ marginBottom:"20px" }}>
        <div style={{ fontSize:"32px", marginBottom:"10px" }}>🔖</div>
        {editMode
          ? <input value={t.name} onChange={e => upd("name", e.target.value)} placeholder="Trade name..."
              style={{ fontSize:"26px", fontWeight:"700", color:"#e2e2f2", background:"transparent", border:"none", borderBottom:"1px solid #3a3a5a", outline:"none", width:"100%", fontFamily:"'Syne',sans-serif" }} />
          : <div style={{ fontSize:"26px", fontWeight:"700", color:"#e2e2f2" }}>{t.name || t.ticker || "Untitled Trade"}</div>
        }
      </div>

      {/* Status */}
      <div style={{ marginBottom:"16px" }}>
        <div style={S.label}>Trade Status</div>
        {editMode
          ? <div style={{ display:"flex", gap:"8px" }}>
              {["Open","Closed"].map(s => (
                <button key={s} onClick={() => upd("status", s)} style={{
                  padding:"5px 20px", borderRadius:"20px", cursor:"pointer", fontSize:"12px", fontWeight:600, fontFamily:"inherit",
                  border:`1px solid ${t.status===s ? "#4ade80" : "#2a2a3a"}`,
                  background: t.status===s ? "#1a3020" : "transparent",
                  color: t.status===s ? "#4ade80" : "#5a5a7a"
                }}>{s}</button>
              ))}
            </div>
          : <Tag label={t.status || "Open"} />
        }
      </div>

      {/* Properties */}
      <div style={S.card}>
        <div style={{ ...S.label, marginBottom:"12px" }}>Properties</div>

        {propRow("↗","Ticker", editMode ? <Sel options={TICKERS} value={t.ticker} onChange={v=>upd("ticker",v)} /> : readVal(t.ticker))}
        {propRow("🏛","Account", editMode ? <Sel options={ACCOUNTS} value={t.account} onChange={v=>upd("account",v)} /> : readVal(t.account))}

        {propRow("📅","Entry Date & Time", editMode
          ? <input type="datetime-local" value={t.entryDate} onChange={e=>upd("entryDate",e.target.value)} style={S.input} />
          : readVal(t.entryDate)
        )}
        {propRow("📅","Exit Date & Time", editMode
          ? <input type="datetime-local" value={t.exitDate} onChange={e=>upd("exitDate",e.target.value)} style={S.input} />
          : readVal(t.exitDate)
        )}
        {propRow("📆","Weekday", <span style={{ color:"#e2e2f2", fontSize:"13px" }}>{t.weekday || "—"}</span>)}
        {propRow("📅","Month", t.month ? <Tag label={t.month} /> : readVal(""))}
        {propRow("📅","Year", t.year ? <Tag label={t.year} /> : readVal(""))}

        {propRow("⊙","Direction", editMode
          ? <div style={{ display:"flex", gap:"8px" }}>
              {DIRECTIONS.map(d => (
                <button key={d} onClick={() => upd("direction",d)} style={{
                  padding:"5px 20px", borderRadius:"4px", cursor:"pointer", fontSize:"12px", fontWeight:600, fontFamily:"inherit",
                  border:`1px solid ${t.direction===d ? (d==="Buy"?"#4ade80":"#f87171") : "#2a2a3a"}`,
                  background: t.direction===d ? (d==="Buy"?"#1a3020":"#2a1010") : "transparent",
                  color: t.direction===d ? (d==="Buy"?"#4ade80":"#f87171") : "#5a5a7a"
                }}>{d}</button>
              ))}
            </div>
          : t.direction ? <Tag label={t.direction} /> : readVal("")
        )}

        {propRow("❄","Model", editMode
          ? <input value={t.model} onChange={e=>upd("model",e.target.value)} placeholder="e.g. ICT 2022, SMC, PD Arrays..." style={S.input} />
          : readVal(t.model)
        )}

        {propRow("⊙","Trade Type", editMode
          ? <Sel options={TRADE_TYPES} value={t.tradeType} onChange={v=>upd("tradeType",v)} />
          : t.tradeType ? <Tag label={t.tradeType} /> : readVal("")
        )}

        {propRow("⏱","Session", editMode
          ? <Sel options={SESSIONS} value={t.session} onChange={v=>upd("session",v)} />
          : readVal(t.session)
        )}

        {propRow("↗","Entry Timeframe", editMode
          ? <Sel options={TIMEFRAMES} value={t.entryTF} onChange={v=>upd("entryTF",v)} />
          : readVal(t.entryTF)
        )}

        {propRow("🔑","Key Level (POI)", editMode
          ? <input value={t.keyLevel} onChange={e=>upd("keyLevel",e.target.value)} placeholder="e.g. FVG (4HR), Order Block, Breaker..." style={S.input} />
          : readVal(t.keyLevel)
        )}

        {propRow("≡","Confluences", editMode
          ? <MultiSelect options={CONFLUENCES} value={t.confluences} onChange={v=>upd("confluences",v)} placeholder="Select confluences..." />
          : <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
              {t.confluences.length ? t.confluences.map(c=><Tag key={c} label={c} />) : readVal("")}
            </div>
        )}

        {propRow("⚠","Rules Broken", editMode
          ? <MultiSelect options={RULES_BROKEN_LIST} value={t.rulesBroken} onChange={v=>upd("rulesBroken",v)} placeholder="Any rules broken?" />
          : <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
              {t.rulesBroken.length ? t.rulesBroken.map(r=><Tag key={r} label={r} />) : <span style={{ color:"#3a3a5a", fontSize:"12px" }}>Empty</span>}
            </div>
        )}
      </div>

      {/* P&L Section */}
      <div style={S.card}>
        <div style={{ ...S.label, marginBottom:"16px" }}>Trade P&L</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:"16px" }}>
          {/* Gross P&L */}
          <div>
            <label style={S.label}>Gross P&L ($)</label>
            {editMode
              ? <input type="number" value={t.grossPnl} onChange={e=>upd("grossPnl",e.target.value)}
                  placeholder="e.g. 300 or -100" style={S.input} />
              : <div style={{ padding:"8px 11px", background:"#12121e", border:"1px solid #1e1e2e", borderRadius:"6px",
                  fontSize:"16px", fontWeight:"700", fontFamily:"'DM Mono',monospace",
                  color: parseFloat(t.grossPnl)>=0 ? "#4ade80" : "#f87171" }}>
                  {t.grossPnl ? `${parseFloat(t.grossPnl)>=0?"+":""}$${t.grossPnl}` : "—"}
                </div>
            }
          </div>

          {/* Commission */}
          <div>
            <label style={S.label}>Commission ($)</label>
            {editMode
              ? <input type="number" value={t.commission} onChange={e=>upd("commission",e.target.value)}
                  placeholder="e.g. 5.00" style={S.input} />
              : <div style={{ padding:"8px 11px", background:"#12121e", border:"1px solid #1e1e2e", borderRadius:"6px",
                  fontSize:"16px", fontWeight:"700", color:"#f97316", fontFamily:"'DM Mono',monospace" }}>
                  {t.commission ? `-$${t.commission}` : "—"}
                </div>
            }
          </div>

          {/* Net P&L — always auto */}
          <div>
            <label style={S.label}>Net P&L (Auto) ($)</label>
            <div style={{ padding:"8px 11px", background:"#12121e", border:`1px solid ${parseFloat(t.netPnl)>=0?"#2a5a2a":"#5a2a2a"}`, borderRadius:"6px",
              fontSize:"18px", fontWeight:"700", fontFamily:"'DM Mono',monospace",
              color: parseFloat(t.netPnl)>=0 ? "#4ade80" : "#f87171" }}>
              {t.netPnl ? `${parseFloat(t.netPnl)>=0?"+":""}$${t.netPnl}` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot */}
      <div style={S.card}>
        <div style={{ ...S.label, marginBottom:"12px" }}>Screenshot (SS)</div>
        {editMode
          ? <SSUpload value={t.screenshot} name={t.screenshotName} onChange={(img,name)=>setT({...t,screenshot:img,screenshotName:name})} />
          : t.screenshot
            ? <img src={t.screenshot} alt="Trade SS" style={{ maxWidth:"100%", borderRadius:"8px", border:"1px solid #2a2a3a" }} />
            : <div style={{ color:"#3a3a5a", fontSize:"12px", padding:"20px", textAlign:"center", border:"1px dashed #2a2a3a", borderRadius:"8px" }}>No screenshot added</div>
        }
      </div>

      {/* Notes */}
      <div style={S.card}>
        <div style={{ ...S.label, marginBottom:"10px" }}>Notes</div>
        {editMode
          ? <textarea value={t.notes} onChange={e=>upd("notes",e.target.value)} rows={5}
              placeholder="Analysis, confluences, lessons learned..." style={S.textarea} />
          : <div style={{ color:"#c8c4b9", lineHeight:"1.8", fontSize:"13px", whiteSpace:"pre-wrap", minHeight:"40px" }}>
              {t.notes || <span style={{ color:"#3a3a5a" }}>No notes added.</span>}
            </div>
        }
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ trades, onSelect }) {
  if (trades.length === 0) return (
    <div style={{ textAlign:"center", padding:"80px 20px", color:"#3a3a5a" }}>
      <div style={{ fontSize:"40px", marginBottom:"12px" }}>📋</div>
      <div>No trades yet. Tap <strong style={{ color:"#c9b96e" }}>+ New</strong> to log your first trade.</div>
    </div>
  );
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"900px" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid #1e1e2e" }}>
            {["Trade","Status","Ticker","Date","Month","Weekday","Account","Model","Direction","Type","Session","TF","Net P&L"].map(h => (
              <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:"10px", letterSpacing:"1.5px",
                color:"#4a4a6a", textTransform:"uppercase", fontWeight:"normal", whiteSpace:"nowrap", fontFamily:"'DM Mono',monospace" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t,i) => {
            const net = parseFloat(t.netPnl) || 0;
            return (
              <tr key={t.id} onClick={() => onSelect(t)}
                style={{ borderBottom:"1px solid #12121e", cursor:"pointer", background: i%2===0?"transparent":"#0d0d18" }}
                onMouseEnter={e => e.currentTarget.style.background="#14141f"}
                onMouseLeave={e => e.currentTarget.style.background=i%2===0?"transparent":"#0d0d18"}>
                <td style={{ padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                    <span>🔖</span>
                    <span style={{ color:"#e2e2f2", fontWeight:600 }}>{t.name||t.ticker||"Untitled"}</span>
                  </div>
                </td>
                <td style={{ padding:"10px 12px" }}><Tag label={t.status||"Open"} small /></td>
                <td style={{ padding:"10px 12px" }}><span style={{ color:"#c9b96e", fontWeight:"bold" }}>{t.ticker||"—"}</span></td>
                <td style={{ padding:"10px 12px", color:"#7a7aaa", fontSize:"11px", whiteSpace:"nowrap" }}>{t.entryDate ? new Date(t.entryDate).toLocaleDateString() : "—"}</td>
                <td style={{ padding:"10px 12px" }}>{t.month ? <Tag label={t.month} small /> : <span style={{color:"#4a4a6a"}}>—</span>}</td>
                <td style={{ padding:"10px 12px", color:"#9a9ab8" }}>{t.weekday||"—"}</td>
                <td style={{ padding:"10px 12px", color:"#9a9ab8" }}>{t.account||"—"}</td>
                <td style={{ padding:"10px 12px", color:"#9a9ab8" }}>{t.model||"—"}</td>
                <td style={{ padding:"10px 12px" }}>{t.direction ? <Tag label={t.direction} small /> : <span style={{color:"#4a4a6a"}}>—</span>}</td>
                <td style={{ padding:"10px 12px" }}>{t.tradeType ? <Tag label={t.tradeType} small /> : <span style={{color:"#4a4a6a"}}>—</span>}</td>
                <td style={{ padding:"10px 12px", color:"#9a9ab8", whiteSpace:"nowrap", fontSize:"12px" }}>{t.session||"—"}</td>
                <td style={{ padding:"10px 12px", color:"#9a9ab8" }}>{t.entryTF||"—"}</td>
                <td style={{ padding:"10px 12px", fontFamily:"'DM Mono',monospace", fontWeight:"700",
                  color: net > 0 ? "#4ade80" : net < 0 ? "#f87171" : "#5a5a7a" }}>
                  {t.netPnl ? `${net>=0?"+":""}$${t.netPnl}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Gallery View ─────────────────────────────────────────────────────────────
function GalleryView({ trades, onSelect }) {
  if (trades.length === 0) return (
    <div style={{ textAlign:"center", padding:"80px 20px", color:"#3a3a5a" }}>
      <div style={{ fontSize:"40px", marginBottom:"12px" }}>🖼</div>
      <div>No trades to show.</div>
    </div>
  );
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:"14px" }}>
      {trades.map(t => {
        const net = parseFloat(t.netPnl) || 0;
        return (
          <div key={t.id} onClick={() => onSelect(t)}
            style={{ background:"#0f0f1e", border:"1px solid #1e1e2e", borderRadius:"10px", overflow:"hidden", cursor:"pointer", transition:"border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#3a3a5a"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#1e1e2e"}>
            {t.screenshot
              ? <img src={t.screenshot} alt="" style={{ width:"100%", height:"130px", objectFit:"cover" }} />
              : <div style={{ height:"80px", background:"#12121e", display:"flex", alignItems:"center", justifyContent:"center", color:"#2a2a3a", fontSize:"28px" }}>📷</div>
            }
            <div style={{ padding:"14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                <span style={{ fontWeight:"700", color:"#c9b96e", fontSize:"15px" }}>{t.ticker||"—"}</span>
                <Tag label={t.status||"Open"} small />
              </div>
              <div style={{ color:"#5a5a7a", fontSize:"11px", marginBottom:"8px" }}>
                {t.entryDate ? new Date(t.entryDate).toLocaleDateString() : "No date"} · {t.session||""}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"3px", marginBottom:"8px" }}>
                {t.direction && <Tag label={t.direction} small />}
                {t.tradeType && <Tag label={t.tradeType} small />}
              </div>
              {t.netPnl && (
                <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:"700", fontSize:"16px",
                  color: net>=0 ? "#4ade80" : "#f87171" }}>
                  {net>=0?"+":""}${t.netPnl}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = { initialBalance:"10000", targetBalance:"10800", maxDD:"9000" };

export default function App() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ict_trades_v3") || "[]"); } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ict_settings_v3") || JSON.stringify(DEFAULT_SETTINGS)); } catch { return DEFAULT_SETTINGS; }
  });
  const [view, setView] = useState("list");
  const [tab, setTab] = useState("Trades");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    try { localStorage.setItem("ict_trades_v3", JSON.stringify(trades)); } catch {}
  }, [trades]);

  useEffect(() => {
    try { localStorage.setItem("ict_settings_v3", JSON.stringify(settings)); } catch {}
  }, [settings]);

  const saveTrade = t => {
    setTrades(prev => prev.find(x => x.id===t.id) ? prev.map(x => x.id===t.id ? t : x) : [...prev, t]);
    setSelected(t);
  };

  const deleteTrade = id => {
    if (window.confirm("Delete this trade?")) {
      setTrades(prev => prev.filter(x => x.id!==id));
      setView("list");
      setSelected(null);
    }
  };

  const newTrade = () => {
    const t = emptyTrade();
    setSelected(t);
    setView("detail");
  };

  const displayed = tab==="Open" ? trades.filter(t=>t.status==="Open") : trades;
  const sorted = [...displayed].sort((a,b) => (b.entryDate||"").localeCompare(a.entryDate||""));

  return (
    <div style={S.app}>
      {/* Nav */}
      <div style={S.nav}>
        <div style={{ padding:"12px 0", marginRight:"20px" }}>
          <div style={{ fontSize:"9px", letterSpacing:"4px", color:"#5a5a7a", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>ICT 2022</div>
          <div style={{ fontSize:"17px", fontWeight:"800", color:"#c9b96e", letterSpacing:"1px" }}>Trade Journal</div>
        </div>
        <div style={{ display:"flex", flex:1 }}>
          {["Trades","Open","Gallery"].map(t => (
            <button key={t} onClick={() => { setTab(t); setView("list"); }}
              style={{ padding:"14px 16px", background:"none", border:"none", cursor:"pointer",
                fontSize:"12px", fontWeight:600, fontFamily:"inherit",
                color: tab===t ? "#e2e2f2" : "#5a5a7a",
                borderBottom: tab===t ? "2px solid #c9b96e" : "2px solid transparent" }}>{t}</button>
          ))}
        </div>
        <button onClick={newTrade} style={{ padding:"7px 18px", background:"#c9b96e", border:"none", borderRadius:"6px",
          color:"#0a0a0f", fontWeight:"700", cursor:"pointer", fontFamily:"inherit", fontSize:"12px" }}>+ New</button>
      </div>

      <div style={S.page}>
        {view === "list" && (
          <>
            <BalanceDashboard settings={settings} trades={trades} onSettingsChange={setSettings} />
            {tab==="Gallery"
              ? <GalleryView trades={sorted} onSelect={t=>{setSelected(t);setView("detail");}} />
              : <ListView trades={sorted} onSelect={t=>{setSelected(t);setView("detail");}} />
            }
          </>
        )}
        {view === "detail" && selected && (
          <TradeDetail
            trade={selected}
            onSave={t => { saveTrade(t); }}
            onDelete={id => { deleteTrade(id); }}
            onBack={() => setView("list")}
          />
        )}
      </div>
    </div>
  );
}
