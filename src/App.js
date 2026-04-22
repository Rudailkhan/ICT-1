import React, { useState, useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TICKERS = ["EURUSD","GBPUSD","USDCHF","USDJPY","GBPJPY","AUDUSD","NZDUSD","USDCAD","XAUUSD","XAGUSD","NAS100","US30","SPX500","BTCUSD"];
const ACCOUNTS = ["Real-Account","Demo-Account","Prop-Firm","Challenge"];
const DIRECTIONS = ["Buy","Sell"];
const TRADE_TYPES = ["Executed","Missed","Partials"];
const SESSIONS = ["New York Open","New York PM","London Open","London Close","Asian","Overlap"];
const TIMEFRAMES = ["1 Minute","3 Minutes","5 Minutes","15 Minutes","30 Minutes","1 Hour","4 Hour","Daily","Weekly"];

const KEY_LEVELS = [
  "FVG — 1M","FVG — 3M","FVG — 5M","FVG — 15M","FVG — 30M","FVG — 1H","FVG — 4H","FVG — Daily","FVG — Weekly","FVG — Monthly",
  "IFVG — 1H","IFVG — 4H","IFVG — Daily",
  "OB — 1M","OB — 3M","OB — 5M","OB — 15M","OB — 30M","OB — 1H","OB — 4H","OB — Daily","OB — Weekly","OB — Monthly",
  "Breaker Block — 1H","Breaker Block — 4H","Breaker Block — Daily","Breaker Block — Weekly",
  "Mitigation Block — 1H","Mitigation Block — 4H","Mitigation Block — Daily",
  "Rejection Block — 1H","Rejection Block — 4H",
  "BPR — 1H","BPR — 4H","BPR — Daily",
  "BSL — 1H","BSL — 4H","BSL — Daily","BSL — Weekly",
  "SSL — 1H","SSL — 4H","SSL — Daily","SSL — Weekly",
  "Equal Highs — 1H","Equal Highs — 4H","Equal Highs — Daily",
  "Equal Lows — 1H","Equal Lows — 4H","Equal Lows — Daily",
  "Previous Day High","Previous Day Low","Previous Week High","Previous Week Low","Previous Month High","Previous Month Low",
  "OTE — 62%","OTE — 70.5%","OTE — 79%",
  "Fibonacci 50%","Fibonacci 61.8%","Fibonacci 70.5%","Fibonacci 79%",
  "Premium Array","Discount Array","Equilibrium (50%)",
  "NWOG","NDOG","Weekly Open","Daily Open","Monthly Open","Opening Gap",
  "Propulsion Block","Vacuum Block","Unicorn Model POI","Liquidity Void"
];

const CONFLUENCES = [
  "Liquidity Sweep","Market Structure Shift (MSS)","Break of Structure (BOS)",
  "Change in State of Delivery (CISD)","SMT Divergence","HTF Alignment",
  "Power of 3 (PO3)","AMD — Accumulation/Manipulation/Distribution",
  "Kill Zone — London","Kill Zone — New York","Kill Zone — Asian",
  "London Judas Swing","New York Midnight Open","Silver Bullet",
  "ICT Macro — 9:50","ICT Macro — 10:10","ICT Macro — 11:50","ICT Macro — 14:50",
  "OTE Confirmation","Displacement Candle","Institutional Candle",
  "Turtle Soup","Seek & Destroy","Stop Hunt","Inducement (IDM)",
  "Time of Day Confluence","NWOG / NDOG","Dealing Range",
  "London Open Manipulation","News Catalyst","HTF FVG Retest","Liquidity Void"
];

const RULES_BROKEN_LIST = [
  "Overtraded",
  "Moved SL",
  "Early Entry — No Confirmation",
  "Revenge Trade",
  "FOMO",
  "Ignored HTF Bias",
  "Wrong Session",
  "Outside Kill Zone",
  "Traded High Impact News",
  "Sized Too Big — Poor Risk Management",
  "No Trading Plan",
  "Proper Plan But Failed",
  "Chased Price",
  "Emotional Trade — Ignored Rules",
  "Exited Early — Cut Winners Short",
  "Added to Losing Trade"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function getMonth(d) { if(!d)return""; const x=new Date(d); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][x.getMonth()]+"-"+String(x.getFullYear()).slice(2); }
function getWeekday(d) { if(!d)return""; return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(d).getDay()]; }
function getYear(d) { if(!d)return""; return String(new Date(d).getFullYear()); }

function emptyTrade() {
  return { id:uid(), name:"", status:"Open", ticker:"", account:"Real-Account", entryDate:"", exitDate:"", weekday:"", month:"", year:"", direction:"", model:"", tradeType:"Executed", session:"", entryTF:"", keyLevels:[], confluences:[], rulesBroken:[], result:"", grossPnl:"", commission:"", netPnl:"", screenshot:null, screenshotName:"", notes:"" };
}

function exportCSV(trades) {
  const H = ["Name","Status","Ticker","Account","Entry Date","Exit Date","Weekday","Month","Year","Direction","Model","Trade Type","Session","Entry TF","Key Levels","Confluences","Rules Broken","Result","Gross PnL","Commission","Net PnL","Notes"];
  const R = trades.map(t=>[t.name,t.status,t.ticker,t.account,t.entryDate,t.exitDate,t.weekday,t.month,t.year,t.direction,t.model,t.tradeType,t.session,t.entryTF,(t.keyLevels||[]).join("|"),(t.confluences||[]).join("|"),(t.rulesBroken||[]).join("|"),t.result,t.grossPnl,t.commission,t.netPnl,(t.notes||"").replace(/\n/g," ")]);
  const csv=[H,...R].map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`trades-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#10121a", bgCard:"#161922", bgInput:"#1c1f2e", bgDeep:"#0e1018",
  border:"#252838", borderLight:"#1e2130",
  text:"#d4d8f0", textMuted:"#6b7094", textDim:"#3a3d55",
  gold:"#d4a843", goldDim:"#7a6020",
  green:"#3db87a", greenBg:"#0d2018", greenBorder:"#1a4030",
  red:"#d95f5f", redBg:"#1e0d0d", redBorder:"#3a1a1a",
  orange:"#d4854a", blue:"#5b8dee",
};

const S = {
  app:{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Syne',sans-serif", fontSize:"13px" },
  nav:{ background:C.bgCard, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", position:"sticky", top:0, zIndex:50 },
  page:{ padding:"20px", maxWidth:"1300px", margin:"0 auto" },
  card:{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"20px 24px", marginBottom:"16px" },
  label:{ fontSize:"10px", letterSpacing:"2.5px", color:C.textMuted, textTransform:"uppercase", display:"block", marginBottom:"6px", fontFamily:"'DM Mono',monospace" },
  input:{ width:"100%", background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:"6px", color:C.text, padding:"8px 11px", fontSize:"13px", fontFamily:"'Syne',sans-serif", boxSizing:"border-box", outline:"none" },
  textarea:{ width:"100%", background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:"6px", color:C.text, padding:"10px 11px", fontSize:"13px", fontFamily:"'Syne',sans-serif", boxSizing:"border-box", outline:"none", resize:"vertical" },
  row:{ display:"flex", alignItems:"flex-start", padding:"9px 0", borderBottom:`1px solid ${C.borderLight}` },
  rowLabel:{ width:"210px", display:"flex", alignItems:"center", gap:"8px", color:C.textMuted, fontSize:"12px", flexShrink:0, paddingTop:"2px" },
};

// ─── Tag ──────────────────────────────────────────────────────────────────────
const TAG_MAP = {
  "Buy":{bg:C.greenBg,color:C.green,border:C.greenBorder},
  "Sell":{bg:C.redBg,color:C.red,border:C.redBorder},
  "Win":{bg:"#0d2018",color:"#3db87a",border:"#1a4030"},
  "Loss":{bg:"#1e0d0d",color:"#d95f5f",border:"#3a1a1a"},
  "Break Even":{bg:"#14141e",color:"#8888aa",border:"#252838"},
  "Open":{bg:"#0d1a14",color:C.green,border:"#1a3a28"},
  "Closed":{bg:"#14141e",color:"#7a7d9a",border:C.border},
  "Executed":{bg:"#0d1a14",color:"#5dc48a",border:"#1a3a28"},
  "Missed":{bg:"#1e1414",color:"#c47a7a",border:"#3a2828"},
  "Partials":{bg:"#1a160a",color:"#c4923a",border:"#2a2010"},
};

function Tag({ label, small, onRemove }) {
  const c = TAG_MAP[label]||{bg:"#161922",color:"#7a7d9a",border:"#252838"};
  return (
    <span style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`,borderRadius:"4px",padding:small?"1px 8px":"3px 10px",fontSize:small?"10px":"11px",fontWeight:600,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:"4px"}}>
      {label}
      {onRemove&&<span onClick={e=>{e.stopPropagation();onRemove();}} style={{cursor:"pointer",opacity:0.5,fontSize:"10px"}}>✕</span>}
    </span>
  );
}

// ─── MultiSelect with search ──────────────────────────────────────────────────
function MultiSelect({ options, value, onChange, placeholder }) {
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const ref=useRef();
  useEffect(()=>{ const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  const filtered=options.filter(o=>o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={()=>setOpen(!open)} style={{...S.input,minHeight:"38px",cursor:"pointer",display:"flex",flexWrap:"wrap",gap:"4px",alignItems:"center"}}>
        {!value.length?<span style={{color:C.textDim,fontSize:"12px"}}>{placeholder}</span>:value.map(v=><Tag key={v} label={v} small onRemove={()=>onChange(value.filter(x=>x!==v))} />)}
        <span style={{marginLeft:"auto",color:C.textDim,fontSize:"10px"}}>▾</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:300,background:C.bgDeep,border:`1px solid ${C.border}`,borderRadius:"8px",overflow:"hidden"}}>
          <div style={{padding:"8px"}}><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{...S.input,padding:"6px 10px",fontSize:"12px"}} /></div>
          <div style={{maxHeight:"200px",overflowY:"auto"}}>
            {filtered.map(o=>(
              <div key={o} onClick={()=>onChange(value.includes(o)?value.filter(x=>x!==o):[...value,o])}
                style={{padding:"8px 12px",cursor:"pointer",fontSize:"12px",color:value.includes(o)?C.gold:C.text,background:value.includes(o)?"#1a1800":"transparent",display:"flex",alignItems:"center",gap:"8px",borderBottom:`1px solid ${C.borderLight}`}}>
                <span style={{color:value.includes(o)?C.gold:C.textDim,fontSize:"11px",width:"12px"}}>{value.includes(o)?"✓":"○"}</span>{o}
              </div>
            ))}
            {!filtered.length&&<div style={{padding:"12px",color:C.textMuted,fontSize:"12px",textAlign:"center"}}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Sel({ options, value, onChange, placeholder }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{...S.input,appearance:"none",cursor:"pointer",color:value?C.text:C.textDim}}>
      <option value="">{placeholder||"—"}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Screenshot Upload ────────────────────────────────────────────────────────
function SSUpload({ value, name, onChange }) {
  const ref=useRef();
  const handleFile=f=>{ if(!f)return; const r=new FileReader(); r.onload=e=>onChange(e.target.result,f.name); r.readAsDataURL(f); };
  return (
    <div>
      <div onClick={()=>ref.current.click()} style={{border:`2px dashed ${C.border}`,borderRadius:"8px",padding:"16px",cursor:"pointer",textAlign:"center",background:C.bgDeep,transition:"border-color 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
        {value
          ?<div><img src={value} alt="SS" style={{maxWidth:"100%",maxHeight:"300px",borderRadius:"6px",marginBottom:"8px"}} /><div style={{fontSize:"11px",color:C.textMuted}}>{name} · Tap to change</div></div>
          :<div><div style={{fontSize:"28px",marginBottom:"8px"}}>📷</div><div style={{color:C.textMuted,fontSize:"12px"}}>Tap to upload screenshot</div><div style={{color:C.textDim,fontSize:"10px",marginTop:"4px"}}>PNG, JPG, WEBP</div></div>
        }
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
      {value&&<button onClick={()=>onChange(null,"")} style={{marginTop:"6px",padding:"4px 14px",background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:"4px",color:C.red,cursor:"pointer",fontSize:"11px",fontFamily:"inherit"}}>Remove</button>}
    </div>
  );
}

// ─── Balance Dashboard ────────────────────────────────────────────────────────
function BalanceDashboard({ settings, trades, onSettingsChange }) {
  const [editing,setEditing]=useState(false);
  const [tmp,setTmp]=useState(settings);

  const totalNet=trades.reduce((s,t)=>s+(parseFloat(t.netPnl)||0),0);
  const initial=parseFloat(settings.initialBalance)||0;
  const current=initial+totalNet;
  const target=parseFloat(settings.targetBalance)||0;
  const maxDD=parseFloat(settings.maxDD)||0;

  const closed=trades.filter(t=>t.status==="Closed");
  const wins=closed.filter(t=>t.result==="Win"||(parseFloat(t.netPnl)||0)>0).length;
  const losses=closed.filter(t=>t.result==="Loss"||(parseFloat(t.netPnl)||0)<0).length;
  const winRate=closed.length?((wins/closed.length)*100).toFixed(1):"0.0";
  const progress=target>initial?Math.min(((current-initial)/(target-initial))*100,100):0;
  const ddRange=initial-maxDD; const ddUsed=initial-current;
  const ddPct=ddRange>0?Math.min((ddUsed/ddRange)*100,100):0;

  const sc=(label,value,color)=>(
    <div style={{background:C.bgDeep,border:`1px solid ${C.borderLight}`,borderRadius:"8px",padding:"14px 16px"}}>
      <div style={{fontSize:"9px",color:C.textMuted,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"6px",fontFamily:"'DM Mono',monospace"}}>{label}</div>
      <div style={{fontSize:"20px",fontWeight:"700",color,fontFamily:"'DM Mono',monospace"}}>{value}</div>
    </div>
  );

  return (
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div style={{fontSize:"10px",letterSpacing:"3px",color:C.textMuted,textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>Account Overview</div>
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={()=>exportCSV(trades)} style={{padding:"5px 14px",background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:"5px",color:C.green,cursor:"pointer",fontFamily:"inherit",fontSize:"11px"}}>↓ Export CSV</button>
          <button onClick={()=>{if(editing)onSettingsChange(tmp);else setTmp(settings);setEditing(!editing);}} style={{padding:"5px 14px",background:editing?C.greenBg:C.bgInput,border:`1px solid ${editing?C.greenBorder:C.border}`,borderRadius:"5px",color:editing?C.green:C.textMuted,cursor:"pointer",fontFamily:"inherit",fontSize:"11px"}}>{editing?"✓ Save":"✎ Edit"}</button>
        </div>
      </div>
      {editing?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px"}}>
          {[{label:"Initial Balance ($)",key:"initialBalance"},{label:"Target Balance ($)",key:"targetBalance"},{label:"Max Drawdown ($)",key:"maxDD"}].map(f=>(
            <div key={f.key}><label style={S.label}>{f.label}</label><input type="number" value={tmp[f.key]} onChange={e=>setTmp({...tmp,[f.key]:e.target.value})} style={S.input} placeholder="0.00" /></div>
          ))}
        </div>
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:"10px",marginBottom:"16px"}}>
            {sc("Initial Balance",`$${Number(initial).toLocaleString("en",{minimumFractionDigits:2})}`,C.textMuted)}
            {sc("Current Balance",`$${Number(current).toLocaleString("en",{minimumFractionDigits:2})}`,current>=initial?C.green:C.red)}
            {sc("Target Balance",`$${Number(target).toLocaleString("en",{minimumFractionDigits:2})}`,C.gold)}
            {sc("Max Drawdown",`$${Number(maxDD).toLocaleString("en",{minimumFractionDigits:2})}`,C.orange)}
            {sc("Total Net P&L",`${totalNet>=0?"+":""}$${Number(totalNet).toLocaleString("en",{minimumFractionDigits:2})}`,totalNet>=0?C.green:C.red)}
            {sc("Win Rate",`${winRate}%`,parseFloat(winRate)>=50?C.green:C.red)}
            {sc("Wins / Losses",`${wins} / ${losses}`,C.text)}
            {sc("Total Trades",closed.length,C.textMuted)}
          </div>
          {target>initial&&(
            <div style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                <span style={{fontSize:"11px",color:C.textMuted}}>Progress to Target</span>
                <span style={{fontSize:"11px",color:C.gold,fontFamily:"'DM Mono',monospace"}}>{Math.max(0,progress).toFixed(1)}%</span>
              </div>
              <div style={{height:"5px",background:C.borderLight,borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(0,progress)}%`,background:`linear-gradient(90deg,${C.goldDim},${C.gold})`,borderRadius:"3px",transition:"width 0.4s"}} />
              </div>
            </div>
          )}
          {current<initial&&maxDD>0&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                <span style={{fontSize:"11px",color:C.orange}}>⚠ Drawdown Used</span>
                <span style={{fontSize:"11px",color:C.orange,fontFamily:"'DM Mono',monospace"}}>{Math.max(0,ddPct).toFixed(1)}%</span>
              </div>
              <div style={{height:"5px",background:C.borderLight,borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(0,ddPct)}%`,background:`linear-gradient(90deg,${C.orange},${C.red})`,borderRadius:"3px"}} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Trade Detail ─────────────────────────────────────────────────────────────
function TradeDetail({ trade, onSave, onDelete, onBack }) {
  const [t,setT]=useState({...trade});
  const [em,setEm]=useState(!trade.ticker);

  const upd=(k,v)=>{
    const n={...t,[k]:v};
    if(k==="entryDate"){n.weekday=getWeekday(v);n.month=getMonth(v);n.year=getYear(v);}
    if(k==="grossPnl"||k==="commission"){
      const g=parseFloat(k==="grossPnl"?v:n.grossPnl)||0;
      const c=parseFloat(k==="commission"?v:n.commission)||0;
      n.netPnl=(g-c).toFixed(2);
    }
    setT(n);
  };

  const rv=v=><span style={{fontSize:"13px",color:v?C.text:C.textDim}}>{v||"—"}</span>;
  const pr=(icon,label,content)=>(<div style={S.row}><div style={S.rowLabel}><span>{icon}</span>{label}</div><div style={{flex:1}}>{content}</div></div>);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:"22px",padding:"0"}}>←</button>
        <div style={{flex:1}} />
        {!em&&<button onClick={()=>setEm(true)} style={{padding:"7px 18px",background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:"6px",color:C.gold,cursor:"pointer",fontFamily:"inherit",fontSize:"12px"}}>✎ Edit</button>}
        {em&&<button onClick={()=>{onSave(t);setEm(false);}} style={{padding:"7px 18px",background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:"6px",color:C.green,cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:600}}>✓ Save</button>}
        <button onClick={()=>onDelete(t.id)} style={{padding:"7px 18px",background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:"6px",color:C.red,cursor:"pointer",fontFamily:"inherit",fontSize:"12px"}}>Delete</button>
      </div>

      <div style={{marginBottom:"20px"}}>
        <div style={{fontSize:"30px",marginBottom:"10px"}}>🔖</div>
        {em?<input value={t.name} onChange={e=>upd("name",e.target.value)} placeholder="Trade name..." style={{fontSize:"24px",fontWeight:"700",color:C.text,background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,outline:"none",width:"100%",fontFamily:"'Syne',sans-serif"}} />
          :<div style={{fontSize:"24px",fontWeight:"700",color:C.text}}>{t.name||t.ticker||"Untitled Trade"}</div>}
      </div>

      <div style={{marginBottom:"16px"}}>
        <div style={S.label}>Trade Status</div>
        {em?<div style={{display:"flex",gap:"8px"}}>
          {["Open","Closed"].map(s=>(
            <button key={s} onClick={()=>upd("status",s)} style={{padding:"5px 20px",borderRadius:"20px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",border:`1px solid ${t.status===s?C.greenBorder:C.border}`,background:t.status===s?C.greenBg:"transparent",color:t.status===s?C.green:C.textMuted}}>{s}</button>
          ))}</div>:<Tag label={t.status||"Open"} />}
      </div>

      <div style={S.card}>
        <div style={{...S.label,marginBottom:"12px"}}>Properties</div>
        {pr("↗","Ticker",em?<Sel options={TICKERS} value={t.ticker} onChange={v=>upd("ticker",v)} />:rv(t.ticker))}
        {pr("🏛","Account",em?<Sel options={ACCOUNTS} value={t.account} onChange={v=>upd("account",v)} />:rv(t.account))}
        {pr("📅","Entry Date & Time",em?<input type="datetime-local" value={t.entryDate} onChange={e=>upd("entryDate",e.target.value)} style={S.input} />:rv(t.entryDate))}
        {pr("📅","Exit Date & Time",em?<input type="datetime-local" value={t.exitDate} onChange={e=>upd("exitDate",e.target.value)} style={S.input} />:rv(t.exitDate))}
        {pr("📆","Weekday",rv(t.weekday))}
        {pr("📅","Month",t.month?<Tag label={t.month} />:rv(""))}
        {pr("📅","Year",rv(t.year))}
        {pr("⊙","Direction",em
          ?<div style={{display:"flex",gap:"8px"}}>{DIRECTIONS.map(d=>(<button key={d} onClick={()=>upd("direction",d)} style={{padding:"5px 20px",borderRadius:"4px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",border:`1px solid ${t.direction===d?(d==="Buy"?C.greenBorder:C.redBorder):C.border}`,background:t.direction===d?(d==="Buy"?C.greenBg:C.redBg):"transparent",color:t.direction===d?(d==="Buy"?C.green:C.red):C.textMuted}}>{d}</button>))}</div>
          :t.direction?<Tag label={t.direction} />:rv("")
        )}
        {pr("❄","Model",em?<input value={t.model} onChange={e=>upd("model",e.target.value)} placeholder="e.g. ICT 2022, Silver Bullet, AMD..." style={S.input} />:rv(t.model))}
        {pr("⊙","Trade Type",em?<Sel options={TRADE_TYPES} value={t.tradeType} onChange={v=>upd("tradeType",v)} />:t.tradeType?<Tag label={t.tradeType} />:rv(""))}
        {pr("⏱","Session",em?<Sel options={SESSIONS} value={t.session} onChange={v=>upd("session",v)} />:rv(t.session))}
        {pr("↗","Entry Timeframe",em?<Sel options={TIMEFRAMES} value={t.entryTF} onChange={v=>upd("entryTF",v)} />:rv(t.entryTF))}
        {pr("🔑","Key Levels (POI)",em
          ?<MultiSelect options={KEY_LEVELS} value={t.keyLevels||[]} onChange={v=>upd("keyLevels",v)} placeholder="Select key levels..." />
          :<div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>{(t.keyLevels||[]).length?(t.keyLevels||[]).map(k=><Tag key={k} label={k} />):rv("")}</div>
        )}
        {pr("≡","Confluences",em
          ?<MultiSelect options={CONFLUENCES} value={t.confluences||[]} onChange={v=>upd("confluences",v)} placeholder="Select confluences..." />
          :<div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>{(t.confluences||[]).length?(t.confluences||[]).map(c=><Tag key={c} label={c} />):rv("")}</div>
        )}
        {pr("⚠","Rules Broken",em
          ?<MultiSelect options={RULES_BROKEN_LIST} value={t.rulesBroken||[]} onChange={v=>upd("rulesBroken",v)} placeholder="Any rules broken?" />
          :<div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>{(t.rulesBroken||[]).length?(t.rulesBroken||[]).map(r=><Tag key={r} label={r} />):<span style={{color:C.textDim,fontSize:"12px"}}>Empty</span>}</div>
        )}
        {pr("🏆","Result",em
          ?<div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{["Win","Loss","Break Even"].map(r=>(<button key={r} onClick={()=>upd("result",r)} style={{padding:"5px 16px",borderRadius:"4px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",border:`1px solid ${t.result===r?(r==="Win"?C.greenBorder:r==="Loss"?C.redBorder:C.border):C.border}`,background:t.result===r?(r==="Win"?C.greenBg:r==="Loss"?C.redBg:"#14141e"):"transparent",color:t.result===r?(r==="Win"?C.green:r==="Loss"?C.red:"#8888aa"):C.textMuted}}>{r}</button>))}</div>
          :t.result?<Tag label={t.result} />:rv("")
        )}
      </div>

      <div style={S.card}>
        <div style={{...S.label,marginBottom:"16px"}}>Trade P&L</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"14px"}}>
          <div>
            <label style={S.label}>Gross P&L ($)</label>
            {em?<input type="number" value={t.grossPnl} onChange={e=>upd("grossPnl",e.target.value)} placeholder="e.g. 300 or -100" style={S.input} />
              :<div style={{padding:"8px 11px",background:C.bgDeep,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"18px",fontWeight:"700",fontFamily:"'DM Mono',monospace",color:parseFloat(t.grossPnl)>=0?C.green:C.red}}>{t.grossPnl?`${parseFloat(t.grossPnl)>=0?"+":""}$${t.grossPnl}`:"—"}</div>}
          </div>
          <div>
            <label style={S.label}>Commission ($)</label>
            {em?<input type="number" value={t.commission} onChange={e=>upd("commission",e.target.value)} placeholder="e.g. 5.00" style={S.input} />
              :<div style={{padding:"8px 11px",background:C.bgDeep,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"18px",fontWeight:"700",color:C.orange,fontFamily:"'DM Mono',monospace"}}>{t.commission?`-$${t.commission}`:"—"}</div>}
          </div>
          <div>
            <label style={S.label}>Net P&L — Auto ($)</label>
            <div style={{padding:"8px 11px",background:C.bgDeep,border:`1px solid ${parseFloat(t.netPnl)>=0?C.greenBorder:C.redBorder}`,borderRadius:"6px",fontSize:"20px",fontWeight:"700",fontFamily:"'DM Mono',monospace",color:parseFloat(t.netPnl)>=0?C.green:C.red}}>
              {t.netPnl?`${parseFloat(t.netPnl)>=0?"+":""}$${t.netPnl}`:"—"}
            </div>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={{...S.label,marginBottom:"12px"}}>Screenshot (SS)</div>
        {em?<SSUpload value={t.screenshot} name={t.screenshotName} onChange={(img,n)=>setT({...t,screenshot:img,screenshotName:n})} />
          :t.screenshot?<img src={t.screenshot} alt="SS" style={{maxWidth:"100%",borderRadius:"8px",border:`1px solid ${C.border}`}} />
          :<div style={{color:C.textDim,fontSize:"12px",padding:"24px",textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:"8px"}}>No screenshot</div>}
      </div>

      <div style={S.card}>
        <div style={{...S.label,marginBottom:"10px"}}>Notes</div>
        {em?<textarea value={t.notes} onChange={e=>upd("notes",e.target.value)} rows={5} placeholder="Analysis, confluences, lessons learned..." style={S.textarea} />
          :<div style={{color:"#b0b4cc",lineHeight:"1.8",fontSize:"13px",whiteSpace:"pre-wrap",minHeight:"40px"}}>{t.notes||<span style={{color:C.textDim}}>No notes.</span>}</div>}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ trades, onSelect }) {
  if(!trades.length) return <div style={{textAlign:"center",padding:"80px 20px",color:C.textDim}}><div style={{fontSize:"40px",marginBottom:"12px"}}>📋</div><div>No trades yet. Tap <strong style={{color:C.gold}}>+ New</strong> to log your first trade.</div></div>;
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:"900px"}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
          {["Trade","Status","Ticker","Date","Month","Weekday","Model","Direction","Session","Result","Net P&L"].map(h=>(
            <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:"10px",letterSpacing:"1.5px",color:C.textMuted,textTransform:"uppercase",fontWeight:"normal",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {trades.map((t,i)=>{
            const net=parseFloat(t.netPnl)||0;
            return (
              <tr key={t.id} onClick={()=>onSelect(t)} style={{borderBottom:`1px solid ${C.borderLight}`,cursor:"pointer",background:i%2===0?"transparent":"#0e1018"}}
                onMouseEnter={e=>e.currentTarget.style.background="#141720"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"#0e1018"}>
                <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:"7px"}}><span>🔖</span><span style={{color:C.text,fontWeight:600}}>{t.name||t.ticker||"Untitled"}</span></div></td>
                <td style={{padding:"10px 12px"}}><Tag label={t.status||"Open"} small /></td>
                <td style={{padding:"10px 12px"}}><span style={{color:C.gold,fontWeight:"bold"}}>{t.ticker||"—"}</span></td>
                <td style={{padding:"10px 12px",color:C.textMuted,fontSize:"11px",whiteSpace:"nowrap"}}>{t.entryDate?new Date(t.entryDate).toLocaleDateString():"—"}</td>
                <td style={{padding:"10px 12px"}}>{t.month?<Tag label={t.month} small />:<span style={{color:C.textDim}}>—</span>}</td>
                <td style={{padding:"10px 12px",color:C.text,fontSize:"12px"}}>{t.weekday||"—"}</td>
                <td style={{padding:"10px 12px",color:C.text,fontSize:"12px"}}>{t.model||"—"}</td>
                <td style={{padding:"10px 12px"}}>{t.direction?<Tag label={t.direction} small />:<span style={{color:C.textDim}}>—</span>}</td>
                <td style={{padding:"10px 12px",color:C.text,fontSize:"12px",whiteSpace:"nowrap"}}>{t.session||"—"}</td>
                <td style={{padding:"10px 12px"}}>{t.result?<Tag label={t.result} small />:<span style={{color:C.textDim}}>—</span>}</td>
                <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace",fontWeight:"700",color:net>0?C.green:net<0?C.red:C.textMuted}}>{t.netPnl?`${net>=0?"+":""}$${t.netPnl}`:"—"}</td>
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
  if(!trades.length) return <div style={{textAlign:"center",padding:"80px 20px",color:C.textDim}}><div style={{fontSize:"40px",marginBottom:"12px"}}>🖼</div><div>No trades to show.</div></div>;
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"14px"}}>
      {trades.map(t=>{
        const net=parseFloat(t.netPnl)||0;
        return (
          <div key={t.id} onClick={()=>onSelect(t)} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:"10px",overflow:"hidden",cursor:"pointer",transition:"border-color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.textMuted} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            {t.screenshot?<img src={t.screenshot} alt="" style={{width:"100%",height:"130px",objectFit:"cover"}} />
              :<div style={{height:"80px",background:C.bgDeep,display:"flex",alignItems:"center",justifyContent:"center",color:C.textDim,fontSize:"28px"}}>📷</div>}
            <div style={{padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
                <span style={{fontWeight:"700",color:C.gold,fontSize:"15px"}}>{t.ticker||"—"}</span>
                <Tag label={t.status||"Open"} small />
              </div>
              <div style={{color:C.textMuted,fontSize:"11px",marginBottom:"8px"}}>{t.entryDate?new Date(t.entryDate).toLocaleDateString():"No date"} · {t.session||""}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginBottom:"8px"}}>
                {t.direction&&<Tag label={t.direction} small />}
                {t.result&&<Tag label={t.result} small />}
              </div>
              {t.netPnl&&<div style={{fontFamily:"'DM Mono',monospace",fontWeight:"700",fontSize:"16px",color:net>=0?C.green:C.red}}>{net>=0?"+":""}${t.netPnl}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS={initialBalance:"10000",targetBalance:"10800",maxDD:"9000"};

export default function App() {
  const [trades,setTrades]=useState(()=>{try{return JSON.parse(localStorage.getItem("ict_v4")||"[]")}catch{return []}});
  const [settings,setSettings]=useState(()=>{try{return JSON.parse(localStorage.getItem("ict_cfg_v4")||JSON.stringify(DEFAULT_SETTINGS))}catch{return DEFAULT_SETTINGS}});
  const [view,setView]=useState("list");
  const [tab,setTab]=useState("Trades");
  const [selected,setSelected]=useState(null);

  useEffect(()=>{try{localStorage.setItem("ict_v4",JSON.stringify(trades))}catch{}},[trades]);
  useEffect(()=>{try{localStorage.setItem("ict_cfg_v4",JSON.stringify(settings))}catch{}},[settings]);

  const saveTrade=t=>{setTrades(p=>p.find(x=>x.id===t.id)?p.map(x=>x.id===t.id?t:x):[...p,t]);setSelected(t);};
  const deleteTrade=id=>{if(window.confirm("Delete trade?")){setTrades(p=>p.filter(x=>x.id!==id));setView("list");setSelected(null);}};
  const newTrade=()=>{const t=emptyTrade();setSelected(t);setView("detail");};

  const displayed=tab==="Open"?trades.filter(t=>t.status==="Open"):trades;
  const sorted=[...displayed].sort((a,b)=>(b.entryDate||"").localeCompare(a.entryDate||""));

  return (
    <div style={S.app}>
      <div style={S.nav}>
        <div style={{padding:"12px 0",marginRight:"20px"}}>
          <div style={{fontSize:"17px",fontWeight:"800",color:C.gold,letterSpacing:"1px"}}>Trade Journal</div>
        </div>
        <div style={{display:"flex",flex:1}}>
          {["Trades","Open","Gallery"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setView("list");}} style={{padding:"14px 16px",background:"none",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",color:tab===t?C.text:C.textMuted,borderBottom:tab===t?`2px solid ${C.gold}`:"2px solid transparent"}}>{t}</button>
          ))}
        </div>
        <button onClick={newTrade} style={{padding:"7px 18px",background:C.gold,border:"none",borderRadius:"6px",color:"#0a0a0f",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",fontSize:"12px"}}>+ New</button>
      </div>
      <div style={S.page}>
        {view==="list"&&(
          <>{<BalanceDashboard settings={settings} trades={trades} onSettingsChange={setSettings} />}
          {tab==="Gallery"?<GalleryView trades={sorted} onSelect={t=>{setSelected(t);setView("detail");}} />:<ListView trades={sorted} onSelect={t=>{setSelected(t);setView("detail");}} />}</>
        )}
        {view==="detail"&&selected&&<TradeDetail trade={selected} onSave={saveTrade} onDelete={deleteTrade} onBack={()=>setView("list")} />}
      </div>
    </div>
  );
}
