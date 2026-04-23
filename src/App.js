import React, { useState, useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TICKERS = ["EURUSD","GBPUSD","USDCHF","USDJPY","GBPJPY","AUDUSD","NZDUSD","USDCAD","XAUUSD","XAGUSD","NAS100","US30","SPX500","BTCUSD"];
const DIRECTIONS = ["Buy","Sell"];
const TRADE_TYPES = ["Executed","Missed","Partials"];
const SESSIONS = ["NY Open","NY PM","London Open","London Close","Asian","Overlap"];
const TIMEFRAMES = ["1M","3M","5M","15M","30M","1H","4H","D","W"];

const KEY_LEVELS = [
  "FVG 1M","FVG 3M","FVG 5M","FVG 15M","FVG 30M","FVG 1H","FVG 4H","FVG D","FVG W","FVG MN",
  "IFVG 1H","IFVG 4H","IFVG D",
  "OB 1M","OB 3M","OB 5M","OB 15M","OB 30M","OB 1H","OB 4H","OB D","OB W","OB MN",
  "BB 1H","BB 4H","BB D","BB W",
  "Mitigation 1H","Mitigation 4H","Mitigation D",
  "Rejection Block 1H","Rejection Block 4H",
  "BPR 1H","BPR 4H","BPR D",
  "BSL 1H","BSL 4H","BSL D","BSL W",
  "SSL 1H","SSL 4H","SSL D","SSL W",
  "EQH 1H","EQH 4H","EQH D","EQL 1H","EQL 4H","EQL D",
  "PDH","PDL","PWH","PWL","PMH","PML",
  "OTE 62%","OTE 70.5%","OTE 79%",
  "Fib 50%","Fib 61.8%","Fib 70.5%","Fib 79%",
  "Premium","Discount","EQ 50%",
  "NWOG","NDOG","Weekly Open","Daily Open","Monthly Open",
  "Propulsion Block","Vacuum Block","Unicorn POI","Liquidity Void"
];

const CONFLUENCES = [
  "Liq Sweep","MSS","BOS","CISD","SMT","HTF Align",
  "PO3","AMD","IDM","Stop Hunt","Turtle Soup","Seek & Destroy",
  "KZ London","KZ New York","KZ Asian",
  "Judas Swing","NY Midnight Open","Silver Bullet",
  "Macro 9:50","Macro 10:10","Macro 11:50","Macro 14:50",
  "OTE Confirm","Displacement","Inst. Candle",
  "TOD Conf","NWOG/NDOG","Dealing Range",
  "London Manip","News Catalyst","HTF FVG Retest","Liq Void"
];

const RULES_BROKEN_LIST = [
  "Overtraded","Moved SL","Early Entry","Revenge Trade","FOMO",
  "Ignored HTF Bias","Wrong Session","Outside KZ","Traded News",
  "Sized Too Big","No Trading Plan","Proper Plan Failed",
  "Chased Price","Emotional Trade","Cut Winners Early","Added to Loser"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function getMonth(d) { if(!d)return""; const x=new Date(d); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][x.getMonth()]+"-"+String(x.getFullYear()).slice(2); }
function getWeekday(d) { if(!d)return""; return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(d).getDay()]; }
function getYear(d) { if(!d)return""; return String(new Date(d).getFullYear()); }

function calcDuration(entry, exit) {
  if (!entry || !exit) return "";
  const diff = new Date(exit) - new Date(entry);
  if (diff <= 0) return "";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function emptyTrade() {
  return { id:uid(), name:"", status:"Open", ticker:"", tradeType:"Executed",
    entryDate:"", exitDate:"", weekday:"", month:"", year:"", duration:"",
    direction:"", model:"", session:"", entryTF:"",
    keyLevels:[], confluences:[], rulesBroken:[], result:"",
    grossPnl:"", commission:"", netPnl:"", screenshot:null, screenshotName:"", notes:"" };
}

function exportCSV(trades, accountName) {
  const H = ["Account","Name","Status","Ticker","Direction","Model","Entry Date","Exit Date","Duration","Weekday","Month","Year","Session","Entry TF","Key Levels","Confluences","Rules Broken","Result","Gross PnL","Commission","Net PnL","Notes"];
  const R = trades.map(t=>[accountName,t.name,t.status,t.ticker,t.direction,t.model,t.entryDate,t.exitDate,t.duration||"",t.weekday,t.month,t.year,t.session,t.entryTF,(t.keyLevels||[]).join("|"),(t.confluences||[]).join("|"),(t.rulesBroken||[]).join("|"),t.result,t.grossPnl,t.commission,t.netPnl,(t.notes||"").replace(/\n/g," ")]);
  const csv=[H,...R].map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`${accountName}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// ─── Theme — Attractive dark with jewel accents ───────────────────────────────
const C = {
  bg:        "#0b0d14",
  bgCard:    "#12151f",
  bgInput:   "#181b27",
  bgDeep:    "#0d0f18",
  bgHover:   "#161924",
  border:    "#222536",
  borderLight:"#1a1d2e",
  borderGlow: "#3a3060",
  text:      "#e0e4f8",
  textSub:   "#8890b8",
  textDim:   "#383c58",
  gold:      "#f0c060",
  goldSoft:  "#c49a40",
  goldGlow:  "rgba(240,192,96,0.15)",
  goldDim:   "#6a5020",
  green:     "#34d17a",
  greenSoft: "#22a05a",
  greenBg:   "#0a1e14",
  greenBorder:"#1a4a30",
  greenGlow: "rgba(52,209,122,0.12)",
  red:       "#f06060",
  redSoft:   "#c04040",
  redBg:     "#1c0c0c",
  redBorder: "#3a1818",
  orange:    "#f09040",
  orangeBg:  "#1c1008",
  purple:    "#a080f0",
  purpleBg:  "#14102a",
  purpleBorder:"#302060",
  blue:      "#60a8f0",
  blueBg:    "#0c1420",
  cyan:      "#40d0c0",
};

const S = {
  app:{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Syne',sans-serif", fontSize:"13px" },
  nav:{ background:C.bgCard, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", position:"sticky", top:0, zIndex:50, boxShadow:`0 2px 20px rgba(0,0,0,0.4)` },
  page:{ padding:"20px", maxWidth:"1300px", margin:"0 auto" },
  card:{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"20px 24px", marginBottom:"16px" },
  label:{ fontSize:"9px", letterSpacing:"2.5px", color:C.textSub, textTransform:"uppercase", display:"block", marginBottom:"6px", fontFamily:"'DM Mono',monospace" },
  input:{ width:"100%", background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:"8px", color:C.text, padding:"9px 12px", fontSize:"13px", fontFamily:"'Syne',sans-serif", boxSizing:"border-box", outline:"none", transition:"border-color 0.2s" },
  textarea:{ width:"100%", background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:"8px", color:C.text, padding:"10px 12px", fontSize:"13px", fontFamily:"'Syne',sans-serif", boxSizing:"border-box", outline:"none", resize:"vertical" },
  row:{ display:"flex", alignItems:"flex-start", padding:"10px 0", borderBottom:`1px solid ${C.borderLight}` },
  rowLabel:{ width:"200px", display:"flex", alignItems:"center", gap:"8px", color:C.textSub, fontSize:"11px", flexShrink:0, paddingTop:"3px" },
};

// ─── Tag ──────────────────────────────────────────────────────────────────────
const TAG_MAP = {
  "Buy":       {bg:C.greenBg,   color:C.green,  border:C.greenBorder},
  "Sell":      {bg:C.redBg,     color:C.red,    border:C.redBorder},
  "Win":       {bg:"#0a1e14",   color:"#34d17a",border:"#1a4a30"},
  "Loss":      {bg:"#1c0c0c",   color:"#f06060",border:"#3a1818"},
  "Break Even":{bg:"#12121e",   color:"#7880a8",border:C.border},
  "Open":      {bg:"#0c1a20",   color:C.cyan,   border:"#1a3a40"},
  "Closed":    {bg:"#12141e",   color:"#6870a0",border:C.border},
  "Executed":  {bg:C.greenBg,   color:"#40d080",border:C.greenBorder},
  "Missed":    {bg:C.redBg,     color:"#d07070",border:C.redBorder},
  "Partials":  {bg:C.orangeBg,  color:C.orange, border:"#2a2010"},
};

function Tag({ label, small, onRemove }) {
  const c = TAG_MAP[label]||{bg:"#12151f",color:C.textSub,border:C.border};
  return (
    <span style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`,borderRadius:"5px",
      padding:small?"2px 8px":"3px 11px",fontSize:small?"10px":"11px",fontWeight:600,
      whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:"4px",letterSpacing:"0.3px"}}>
      {label}
      {onRemove&&<span onClick={e=>{e.stopPropagation();onRemove();}} style={{cursor:"pointer",opacity:0.5,fontSize:"9px",marginLeft:"2px"}}>✕</span>}
    </span>
  );
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────
function MultiSelect({ options, value, onChange, placeholder }) {
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const ref=useRef();
  useEffect(()=>{ const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  const filtered=options.filter(o=>o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={()=>setOpen(!open)} style={{...S.input,minHeight:"40px",cursor:"pointer",display:"flex",flexWrap:"wrap",gap:"4px",alignItems:"center",borderColor:open?C.borderGlow:C.border}}>
        {!value.length?<span style={{color:C.textDim,fontSize:"12px"}}>{placeholder}</span>:value.map(v=><Tag key={v} label={v} small onRemove={()=>onChange(value.filter(x=>x!==v))} />)}
        <span style={{marginLeft:"auto",color:C.textDim,fontSize:"10px",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:300,
          background:C.bgDeep,border:`1px solid ${C.borderGlow}`,borderRadius:"10px",overflow:"hidden",
          boxShadow:`0 8px 32px rgba(0,0,0,0.5)`}}>
          <div style={{padding:"8px"}}><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{...S.input,padding:"7px 10px",fontSize:"12px"}} /></div>
          <div style={{maxHeight:"200px",overflowY:"auto"}}>
            {filtered.map(o=>(
              <div key={o} onClick={()=>onChange(value.includes(o)?value.filter(x=>x!==o):[...value,o])}
                style={{padding:"8px 14px",cursor:"pointer",fontSize:"12px",
                  color:value.includes(o)?C.gold:C.text,
                  background:value.includes(o)?"rgba(240,192,96,0.08)":"transparent",
                  display:"flex",alignItems:"center",gap:"10px",
                  borderBottom:`1px solid ${C.borderLight}`,transition:"background 0.1s"}}>
                <span style={{color:value.includes(o)?C.gold:C.textDim,fontSize:"11px",width:"12px",flexShrink:0}}>{value.includes(o)?"✓":"○"}</span>
                {o}
              </div>
            ))}
            {!filtered.length&&<div style={{padding:"14px",color:C.textSub,fontSize:"12px",textAlign:"center"}}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Sel({ options, value, onChange, placeholder }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{...S.input,appearance:"none",cursor:"pointer",color:value?C.text:C.textDim}}>
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
      <div onClick={()=>ref.current.click()} style={{border:`2px dashed ${C.border}`,borderRadius:"10px",
        padding:"20px",cursor:"pointer",textAlign:"center",background:C.bgDeep,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gold;e.currentTarget.style.background="rgba(240,192,96,0.04)";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bgDeep;}}>
        {value
          ?<div><img src={value} alt="SS" style={{maxWidth:"100%",maxHeight:"320px",borderRadius:"8px",marginBottom:"8px",boxShadow:`0 4px 20px rgba(0,0,0,0.4)`}} /><div style={{fontSize:"11px",color:C.textSub}}>{name} · Tap to change</div></div>
          :<div><div style={{fontSize:"32px",marginBottom:"8px",filter:"grayscale(0.3)"}}>📷</div><div style={{color:C.textSub,fontSize:"12px",marginBottom:"4px",fontWeight:600}}>Upload Screenshot</div><div style={{color:C.textDim,fontSize:"10px"}}>PNG · JPG · WEBP</div></div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
      {value&&<button onClick={()=>onChange(null,"")} style={{marginTop:"8px",padding:"5px 14px",background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:"6px",color:C.red,cursor:"pointer",fontSize:"11px",fontFamily:"inherit"}}>✕ Remove</button>}
    </div>
  );
}

// ─── Account Selector Modal ───────────────────────────────────────────────────
function AccountModal({ accounts, onSelect, onClose, onAdd, onDelete }) {
  const [newName,setNewName]=useState("");
  const [newType,setNewType]=useState("Live");
  const types=["Live","Demo","Funded","Challenge","Crypto","Forex","Prop"];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
      onClick={onClose}>
      <div style={{background:C.bgCard,border:`1px solid ${C.borderGlow}`,borderRadius:"16px",padding:"28px",width:"100%",maxWidth:"420px",boxShadow:`0 20px 60px rgba(0,0,0,0.6)`}}
        onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:"16px",fontWeight:"700",color:C.text,marginBottom:"6px"}}>Accounts</div>
        <div style={{fontSize:"12px",color:C.textSub,marginBottom:"20px"}}>Select or create an account</div>

        <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px",maxHeight:"260px",overflowY:"auto"}}>
          {accounts.map(a=>(
            <div key={a.id} onClick={()=>onSelect(a.id)}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",
                background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:"10px",cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div>
                <div style={{fontWeight:600,color:C.text,marginBottom:"2px"}}>{a.name}</div>
                <div style={{fontSize:"11px",color:C.textSub}}>{a.type} · ${Number(a.startingBalance||0).toLocaleString()}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"18px"}}>{a.type==="Live"?"🟢":a.type==="Demo"?"🔵":a.type==="Funded"?"🟡":a.type==="Crypto"?"🟠":"⚪"}</span>
                {accounts.length>1&&<span onClick={e=>{e.stopPropagation();onDelete(a.id);}} style={{color:C.red,cursor:"pointer",fontSize:"12px",opacity:0.6,padding:"2px 6px"}}>✕</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"16px"}}>
          <div style={{fontSize:"11px",color:C.textSub,marginBottom:"10px",letterSpacing:"1px",textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>New Account</div>
          <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Account name..." style={{...S.input,flex:1}} />
            <select value={newType} onChange={e=>setNewType(e.target.value)} style={{...S.input,width:"auto",appearance:"none",cursor:"pointer"}}>
              {types.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={()=>{ if(!newName.trim())return; onAdd(newName.trim(),newType); setNewName(""); }}
            style={{width:"100%",padding:"10px",background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,
              border:"none",borderRadius:"8px",color:"#0a0a0f",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",fontSize:"13px"}}>
            + Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Balance Dashboard ────────────────────────────────────────────────────────
function BalanceDashboard({ account, trades, onUpdateAccount, onExport }) {
  const [editing,setEditing]=useState(false);
  const [tmp,setTmp]=useState({startingBalance:account.startingBalance||"",currentBalance:account.currentBalance||"",targetBalance:account.targetBalance||"",maxDD:account.maxDD||""});

  const tradesPnl = trades.reduce((s,t)=>s+(parseFloat(t.netPnl)||0),0);
  const startBal = parseFloat(account.startingBalance)||0;
  const manualCurrent = parseFloat(account.currentBalance);
  const baseBal = isNaN(manualCurrent) ? startBal : manualCurrent;
  const currentBal = baseBal + tradesPnl;
  const target = parseFloat(account.targetBalance)||0;
  const maxDD = parseFloat(account.maxDD)||0;

  const closed = trades.filter(t=>t.status==="Closed");
  const wins = closed.filter(t=>t.result==="Win"||(parseFloat(t.netPnl)||0)>0).length;
  const losses = closed.filter(t=>t.result==="Loss"||(parseFloat(t.netPnl)||0)<0).length;
  const winRate = closed.length?((wins/closed.length)*100).toFixed(1):"0.0";
  const progress = target>startBal?Math.min(((currentBal-startBal)/(target-startBal))*100,100):0;
  const ddRange=startBal-maxDD; const ddUsed=startBal-currentBal;
  const ddPct=ddRange>0?Math.min((ddUsed/ddRange)*100,100):0;

  const sc=(label,val,color,sub)=>(
    <div style={{background:C.bgDeep,border:`1px solid ${C.borderLight}`,borderRadius:"10px",padding:"14px 16px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:color,opacity:0.6}} />
      <div style={{fontSize:"9px",color:C.textSub,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"8px",fontFamily:"'DM Mono',monospace"}}>{label}</div>
      <div style={{fontSize:"20px",fontWeight:"700",color,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:"10px",color:C.textDim,marginTop:"4px",fontFamily:"'DM Mono',monospace"}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{...S.card,background:`linear-gradient(160deg,#14172a,#0f1220)`,border:`1px solid ${C.borderGlow}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
        <div>
          <div style={{fontSize:"9px",letterSpacing:"3px",color:C.textSub,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:"2px"}}>Account Overview</div>
          <div style={{fontSize:"15px",fontWeight:"700",color:C.gold}}>{account.name} <span style={{fontSize:"11px",color:C.textSub,fontWeight:400}}>· {account.type}</span></div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={onExport} style={{padding:"6px 14px",background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:"7px",color:C.green,cursor:"pointer",fontFamily:"inherit",fontSize:"11px",fontWeight:600}}>↓ CSV</button>
          <button onClick={()=>{if(editing){onUpdateAccount(tmp);}else{setTmp({startingBalance:account.startingBalance||"",currentBalance:account.currentBalance||"",targetBalance:account.targetBalance||"",maxDD:account.maxDD||""});}setEditing(!editing);}}
            style={{padding:"6px 14px",background:editing?C.greenBg:C.bgInput,border:`1px solid ${editing?C.greenBorder:C.border}`,borderRadius:"7px",color:editing?C.green:C.textSub,cursor:"pointer",fontFamily:"inherit",fontSize:"11px",fontWeight:600}}>
            {editing?"✓ Save":"✎ Edit"}
          </button>
        </div>
      </div>

      {editing?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px",marginBottom:"4px"}}>
          {[
            {label:"Starting Balance ($)",key:"startingBalance",hint:"Original account balance"},
            {label:"Current Balance ($)",key:"currentBalance",hint:"Your actual balance now (optional override)"},
            {label:"Target Balance ($)",key:"targetBalance",hint:"Profit target"},
            {label:"Max Drawdown ($)",key:"maxDD",hint:"Max allowed drawdown"},
          ].map(f=>(
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input type="number" value={tmp[f.key]} onChange={e=>setTmp({...tmp,[f.key]:e.target.value})} style={S.input} placeholder="0.00" />
              <div style={{fontSize:"10px",color:C.textDim,marginTop:"4px"}}>{f.hint}</div>
            </div>
          ))}
        </div>
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"10px",marginBottom:"16px"}}>
            {sc("Starting",`$${Number(startBal).toLocaleString("en",{minimumFractionDigits:2})}`,C.textSub)}
            {sc("Current Balance",`$${Number(currentBal).toLocaleString("en",{minimumFractionDigits:2})}`,currentBal>=startBal?C.green:C.red,!isNaN(manualCurrent)?"Manual + Trades":"Auto")}
            {sc("Target",`$${Number(target).toLocaleString("en",{minimumFractionDigits:2})}`,C.gold)}
            {sc("Max DD",`$${Number(maxDD).toLocaleString("en",{minimumFractionDigits:2})}`,C.orange)}
            {sc("Net P&L",`${tradesPnl>=0?"+":""}$${Number(tradesPnl).toLocaleString("en",{minimumFractionDigits:2})}`,tradesPnl>=0?C.green:C.red,`${closed.length} closed`)}
            {sc("Win Rate",`${winRate}%`,parseFloat(winRate)>=50?C.green:C.red,`${wins}W / ${losses}L`)}
          </div>

          {target>startBal&&(
            <div style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"11px",color:C.textSub,fontWeight:600}}>🎯 Progress to Target</span>
                <span style={{fontSize:"11px",color:C.gold,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{Math.max(0,progress).toFixed(1)}%</span>
              </div>
              <div style={{height:"6px",background:C.borderLight,borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(0,progress)}%`,background:`linear-gradient(90deg,${C.goldDim},${C.gold})`,borderRadius:"3px",transition:"width 0.5s",boxShadow:`0 0 8px ${C.gold}60`}} />
              </div>
            </div>
          )}

          {currentBal<startBal&&maxDD>0&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"11px",color:C.orange,fontWeight:600}}>⚠ Drawdown</span>
                <span style={{fontSize:"11px",color:C.orange,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{Math.max(0,ddPct).toFixed(1)}%</span>
              </div>
              <div style={{height:"6px",background:C.borderLight,borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(0,ddPct)}%`,background:`linear-gradient(90deg,${C.orange},${C.red})`,borderRadius:"3px",boxShadow:`0 0 8px ${C.red}60`}} />
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
    if(k==="entryDate"){ n.weekday=getWeekday(v); n.month=getMonth(v); n.year=getYear(v); n.duration=calcDuration(v,n.exitDate); }
    if(k==="exitDate"){ n.duration=calcDuration(n.entryDate,v); }
    if(k==="grossPnl"||k==="commission"){
      const g=parseFloat(k==="grossPnl"?v:n.grossPnl)||0;
      const c=parseFloat(k==="commission"?v:n.commission)||0;
      n.netPnl=(g-c).toFixed(2);
    }
    setT(n);
  };

  const rv=v=><span style={{fontSize:"13px",color:v?C.text:C.textDim}}>{v||"—"}</span>;
  const pr=(icon,label,content)=>(
    <div style={S.row}>
      <div style={S.rowLabel}><span style={{fontSize:"14px"}}>{icon}</span>{label}</div>
      <div style={{flex:1}}>{content}</div>
    </div>
  );

  const btn=(label,onClick,bg,border,color)=>(
    <button onClick={onClick} style={{padding:"7px 18px",background:bg,border:`1px solid ${border}`,borderRadius:"8px",color,cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:600,transition:"opacity 0.15s"}}>{label}</button>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"24px"}}>
        <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:"8px",color:C.textSub,cursor:"pointer",fontSize:"18px",padding:"5px 12px",lineHeight:1}}>←</button>
        <div style={{flex:1}} />
        {!em&&btn("✎ Edit",()=>setEm(true),C.bgInput,C.border,C.gold)}
        {em&&btn("✓ Save",()=>{onSave(t);setEm(false);},C.greenBg,C.greenBorder,C.green)}
        {btn("✕ Delete",()=>onDelete(t.id),C.redBg,C.redBorder,C.red)}
      </div>

      <div style={{marginBottom:"24px"}}>
        <div style={{fontSize:"28px",marginBottom:"10px"}}>🔖</div>
        {em?<input value={t.name} onChange={e=>upd("name",e.target.value)} placeholder="Trade name..."
            style={{fontSize:"22px",fontWeight:"700",color:C.text,background:"transparent",border:"none",borderBottom:`2px solid ${C.border}`,outline:"none",width:"100%",fontFamily:"'Syne',sans-serif",paddingBottom:"4px"}} />
          :<div style={{fontSize:"22px",fontWeight:"700",color:C.text}}>{t.name||t.ticker||"Untitled Trade"}</div>}
      </div>

      {/* Status */}
      <div style={{marginBottom:"20px"}}>
        <div style={S.label}>Trade Status</div>
        {em?<div style={{display:"flex",gap:"8px"}}>
          {["Open","Closed"].map(s=>(
            <button key={s} onClick={()=>upd("status",s)} style={{padding:"6px 22px",borderRadius:"20px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",
              border:`1px solid ${t.status===s?C.greenBorder:C.border}`,
              background:t.status===s?C.greenBg:"transparent",
              color:t.status===s?C.green:C.textSub}}>{s}</button>
          ))}</div>:<Tag label={t.status||"Open"} />}
      </div>

      {/* Properties */}
      <div style={S.card}>
        <div style={{...S.label,marginBottom:"14px",fontSize:"10px",color:C.gold}}>Properties</div>
        {pr("↗","Ticker",em?<Sel options={TICKERS} value={t.ticker} onChange={v=>upd("ticker",v)} />:rv(t.ticker))}
        {pr("📅","Entry Date",em?<input type="datetime-local" value={t.entryDate} onChange={e=>upd("entryDate",e.target.value)} style={S.input} />:rv(t.entryDate))}
        {pr("📅","Exit Date",em?<input type="datetime-local" value={t.exitDate} onChange={e=>upd("exitDate",e.target.value)} style={S.input} />:rv(t.exitDate))}
        {pr("⏱","Duration", <span style={{fontSize:"13px",color:t.duration?C.cyan:C.textDim,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{t.duration||calcDuration(t.entryDate,t.exitDate)||"—"}</span>)}
        {pr("📆","Weekday",rv(t.weekday))}
        {pr("📅","Month",t.month?<Tag label={t.month} />:rv(""))}
        {pr("⊙","Direction",em
          ?<div style={{display:"flex",gap:"8px"}}>{DIRECTIONS.map(d=>(<button key={d} onClick={()=>upd("direction",d)} style={{padding:"6px 22px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",border:`1px solid ${t.direction===d?(d==="Buy"?C.greenBorder:C.redBorder):C.border}`,background:t.direction===d?(d==="Buy"?C.greenBg:C.redBg):"transparent",color:t.direction===d?(d==="Buy"?C.green:C.red):C.textSub}}>{d}</button>))}</div>
          :t.direction?<Tag label={t.direction} />:rv("")
        )}
        {pr("❄","Model",em?<input value={t.model} onChange={e=>upd("model",e.target.value)} placeholder="ICT 2022, Silver Bullet, AMD..." style={S.input} />:rv(t.model))}
        {pr("⊙","Trade Type",em?<Sel options={TRADE_TYPES} value={t.tradeType} onChange={v=>upd("tradeType",v)} />:t.tradeType?<Tag label={t.tradeType} />:rv(""))}
        {pr("⏱","Session",em?<Sel options={SESSIONS} value={t.session} onChange={v=>upd("session",v)} />:rv(t.session))}
        {pr("↗","Entry TF",em?<Sel options={TIMEFRAMES} value={t.entryTF} onChange={v=>upd("entryTF",v)} />:rv(t.entryTF))}
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
          ?<div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{["Win","Loss","Break Even"].map(r=>(<button key={r} onClick={()=>upd("result",r)} style={{padding:"6px 18px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",border:`1px solid ${t.result===r?(r==="Win"?C.greenBorder:r==="Loss"?C.redBorder:C.border):C.border}`,background:t.result===r?(r==="Win"?C.greenBg:r==="Loss"?C.redBg:"#14121e"):"transparent",color:t.result===r?(r==="Win"?C.green:r==="Loss"?C.red:"#7880a8"):C.textSub}}>{r}</button>))}</div>
          :t.result?<Tag label={t.result} />:rv("")
        )}
      </div>

      {/* P&L */}
      <div style={S.card}>
        <div style={{...S.label,marginBottom:"16px",fontSize:"10px",color:C.gold}}>Trade P&L</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"14px"}}>
          <div>
            <label style={S.label}>Gross P&L ($)</label>
            {em?<input type="number" value={t.grossPnl} onChange={e=>upd("grossPnl",e.target.value)} placeholder="300 or -100" style={S.input} />
              :<div style={{padding:"10px 12px",background:C.bgDeep,border:`1px solid ${C.border}`,borderRadius:"8px",fontSize:"20px",fontWeight:"700",fontFamily:"'DM Mono',monospace",color:parseFloat(t.grossPnl)>=0?C.green:C.red}}>{t.grossPnl?`${parseFloat(t.grossPnl)>=0?"+":""}$${t.grossPnl}`:"—"}</div>}
          </div>
          <div>
            <label style={S.label}>Commission ($)</label>
            {em?<input type="number" value={t.commission} onChange={e=>upd("commission",e.target.value)} placeholder="5.00" style={S.input} />
              :<div style={{padding:"10px 12px",background:C.bgDeep,border:`1px solid ${C.border}`,borderRadius:"8px",fontSize:"20px",fontWeight:"700",color:C.orange,fontFamily:"'DM Mono',monospace"}}>{t.commission?`-$${t.commission}`:"—"}</div>}
          </div>
          <div>
            <label style={S.label}>Net P&L — Auto ($)</label>
            <div style={{padding:"10px 12px",background:C.bgDeep,
              border:`1px solid ${parseFloat(t.netPnl)>0?C.greenBorder:parseFloat(t.netPnl)<0?C.redBorder:C.border}`,
              borderRadius:"8px",fontSize:"22px",fontWeight:"700",fontFamily:"'DM Mono',monospace",
              color:parseFloat(t.netPnl)>0?C.green:parseFloat(t.netPnl)<0?C.red:C.textSub,
              boxShadow:parseFloat(t.netPnl)>0?`0 0 12px ${C.greenGlow}`:parseFloat(t.netPnl)<0?`0 0 12px rgba(240,96,96,0.12)`:"none"}}>
              {t.netPnl?`${parseFloat(t.netPnl)>=0?"+":""}$${t.netPnl}`:"—"}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot */}
      <div style={S.card}>
        <div style={{...S.label,marginBottom:"12px",fontSize:"10px",color:C.gold}}>Screenshot</div>
        {em?<SSUpload value={t.screenshot} name={t.screenshotName} onChange={(img,n)=>setT({...t,screenshot:img,screenshotName:n})} />
          :t.screenshot?<img src={t.screenshot} alt="SS" style={{maxWidth:"100%",borderRadius:"10px",border:`1px solid ${C.border}`,boxShadow:`0 4px 20px rgba(0,0,0,0.4)`}} />
          :<div style={{color:C.textDim,fontSize:"12px",padding:"28px",textAlign:"center",border:`1px dashed ${C.border}`,borderRadius:"10px"}}>No screenshot added</div>}
      </div>

      {/* Notes */}
      <div style={S.card}>
        <div style={{...S.label,marginBottom:"12px",fontSize:"10px",color:C.gold}}>Notes</div>
        {em?<textarea value={t.notes} onChange={e=>upd("notes",e.target.value)} rows={5} placeholder="Analysis, confluences, lessons learned..." style={S.textarea} />
          :<div style={{color:"#b8bcd8",lineHeight:"1.9",fontSize:"13px",whiteSpace:"pre-wrap",minHeight:"40px"}}>{t.notes||<span style={{color:C.textDim}}>No notes added.</span>}</div>}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ trades, onSelect }) {
  if(!trades.length) return (
    <div style={{textAlign:"center",padding:"80px 20px",color:C.textDim}}>
      <div style={{fontSize:"48px",marginBottom:"14px",filter:"grayscale(0.5)"}}>📋</div>
      <div style={{fontSize:"14px",fontWeight:600,color:C.textSub,marginBottom:"6px"}}>No trades yet</div>
      <div style={{fontSize:"12px",color:C.textDim}}>Tap <strong style={{color:C.gold}}>+ New Trade</strong> to get started</div>
    </div>
  );
  return (
    <div style={{overflowX:"auto",borderRadius:"12px",border:`1px solid ${C.border}`,background:C.bgCard}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:"860px"}}>
        <thead>
          <tr style={{borderBottom:`1px solid ${C.border}`,background:C.bgDeep}}>
            {["Trade","Status","Ticker","Date","Duration","Weekday","Model","Dir","Session","Result","Net P&L"].map(h=>(
              <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:"9px",letterSpacing:"1.5px",color:C.textSub,textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t,i)=>{
            const net=parseFloat(t.netPnl)||0;
            return (
              <tr key={t.id} onClick={()=>onSelect(t)}
                style={{borderBottom:`1px solid ${C.borderLight}`,cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"11px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"14px"}}>🔖</span>
                    <span style={{color:C.text,fontWeight:600,fontSize:"13px"}}>{t.name||t.ticker||"Untitled"}</span>
                  </div>
                </td>
                <td style={{padding:"11px 12px"}}><Tag label={t.status||"Open"} small /></td>
                <td style={{padding:"11px 12px"}}><span style={{color:C.gold,fontWeight:"bold",fontFamily:"'DM Mono',monospace"}}>{t.ticker||"—"}</span></td>
                <td style={{padding:"11px 12px",color:C.textSub,fontSize:"11px",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{t.entryDate?new Date(t.entryDate).toLocaleDateString():"—"}</td>
                <td style={{padding:"11px 12px",color:C.cyan,fontSize:"11px",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{t.duration||"—"}</td>
                <td style={{padding:"11px 12px",color:C.text,fontSize:"12px"}}>{t.weekday||"—"}</td>
                <td style={{padding:"11px 12px",color:C.text,fontSize:"12px"}}>{t.model||"—"}</td>
                <td style={{padding:"11px 12px"}}>{t.direction?<Tag label={t.direction} small />:<span style={{color:C.textDim}}>—</span>}</td>
                <td style={{padding:"11px 12px",color:C.text,fontSize:"12px",whiteSpace:"nowrap"}}>{t.session||"—"}</td>
                <td style={{padding:"11px 12px"}}>{t.result?<Tag label={t.result} small />:<span style={{color:C.textDim}}>—</span>}</td>
                <td style={{padding:"11px 12px",fontFamily:"'DM Mono',monospace",fontWeight:"700",fontSize:"13px",
                  color:net>0?C.green:net<0?C.red:C.textSub}}>
                  {t.netPnl?`${net>=0?"+":""}$${t.netPnl}`:"—"}
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
  if(!trades.length) return <div style={{textAlign:"center",padding:"80px 20px",color:C.textDim}}><div style={{fontSize:"40px",marginBottom:"12px"}}>🖼</div>No trades to show.</div>;
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"14px"}}>
      {trades.map(t=>{
        const net=parseFloat(t.netPnl)||0;
        return (
          <div key={t.id} onClick={()=>onSelect(t)}
            style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:"12px",overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderGlow;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.3)`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            {t.screenshot?<img src={t.screenshot} alt="" style={{width:"100%",height:"130px",objectFit:"cover"}} />
              :<div style={{height:"80px",background:C.bgDeep,display:"flex",alignItems:"center",justifyContent:"center",color:C.textDim,fontSize:"28px"}}>📷</div>}
            <div style={{padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
                <span style={{fontWeight:"700",color:C.gold,fontSize:"15px",fontFamily:"'DM Mono',monospace"}}>{t.ticker||"—"}</span>
                <Tag label={t.status||"Open"} small />
              </div>
              <div style={{color:C.textSub,fontSize:"11px",marginBottom:"8px"}}>{t.entryDate?new Date(t.entryDate).toLocaleDateString():"—"} · {t.session||""}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginBottom:"8px"}}>
                {t.direction&&<Tag label={t.direction} small />}
                {t.result&&<Tag label={t.result} small />}
                {t.duration&&<span style={{fontSize:"10px",color:C.cyan,fontFamily:"'DM Mono',monospace",padding:"2px 6px",background:"rgba(64,208,192,0.08)",borderRadius:"4px",border:`1px solid rgba(64,208,192,0.15)`}}>{t.duration}</span>}
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
function newAccount(name="My Account", type="Live") {
  return { id:uid(), name, type, startingBalance:"", currentBalance:"", targetBalance:"", maxDD:"", trades:[] };
}

export default function App() {
  const [accounts,setAccounts]=useState(()=>{
    try{ const d=JSON.parse(localStorage.getItem("ict_accounts_v1")||"null"); return d&&d.length?d:[newAccount("Main Account","Live")]; }catch{return [newAccount("Main Account","Live")];}
  });
  const [activeId,setActiveId]=useState(()=>{ try{return localStorage.getItem("ict_active_v1")||null;}catch{return null;} });
  const [view,setView]=useState("list");
  const [tab,setTab]=useState("Trades");
  const [selected,setSelected]=useState(null);
  const [showAccModal,setShowAccModal]=useState(false);

  const account = accounts.find(a=>a.id===activeId)||accounts[0];

  useEffect(()=>{ try{localStorage.setItem("ict_accounts_v1",JSON.stringify(accounts));}catch{} },[accounts]);
  useEffect(()=>{ if(account)try{localStorage.setItem("ict_active_v1",account.id);}catch{} },[account]);

  const updateAccount=(id,patch)=>setAccounts(p=>p.map(a=>a.id===id?{...a,...patch}:a));
  const addAccount=(name,type)=>{ const a=newAccount(name,type); setAccounts(p=>[...p,a]); setActiveId(a.id); setShowAccModal(false); };
  const deleteAccount=(id)=>{ if(accounts.length<=1)return; setAccounts(p=>p.filter(a=>a.id!==id)); if(activeId===id)setActiveId(accounts.find(a=>a.id!==id)?.id||null); };

  const trades = account?.trades||[];
  const saveTrade=t=>{ updateAccount(account.id,{trades:(trades.find(x=>x.id===t.id)?trades.map(x=>x.id===t.id?t:x):[...trades,t])}); setSelected(t); };
  const deleteTrade=id=>{ if(window.confirm("Delete trade?")){updateAccount(account.id,{trades:trades.filter(x=>x.id!==id)});setView("list");setSelected(null);} };
  const newTrade=()=>{ const t=emptyTrade(); setSelected(t); setView("detail"); };

  const displayed=tab==="Open"?trades.filter(t=>t.status==="Open"):trades;
  const sorted=[...displayed].sort((a,b)=>(b.entryDate||"").localeCompare(a.entryDate||""));

  return (
    <div style={S.app}>
      {showAccModal&&<AccountModal accounts={accounts} onSelect={id=>{setActiveId(id);setShowAccModal(false);setView("list");}} onClose={()=>setShowAccModal(false)} onAdd={addAccount} onDelete={deleteAccount} />}

      {/* Nav */}
      <div style={S.nav}>
        <div style={{padding:"11px 0",marginRight:"20px",cursor:"pointer"}} onClick={()=>setShowAccModal(true)}>
          <div style={{fontSize:"9px",letterSpacing:"3px",color:C.textSub,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:"1px"}}>
            {account?.type||"Account"} ▾
          </div>
          <div style={{fontSize:"16px",fontWeight:"800",color:C.gold,letterSpacing:"0.5px"}}>{account?.name||"Select Account"}</div>
        </div>

        <div style={{width:"1px",height:"32px",background:C.border,marginRight:"16px"}} />

        <div style={{display:"flex",flex:1}}>
          {["Trades","Open","Gallery"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setView("list");}}
              style={{padding:"14px 16px",background:"none",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,fontFamily:"inherit",
                color:tab===t?C.text:C.textSub,
                borderBottom:tab===t?`2px solid ${C.gold}`:"2px solid transparent",
                transition:"color 0.15s"}}>{t}</button>
          ))}
        </div>

        <button onClick={newTrade} style={{padding:"8px 18px",
          background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,
          border:"none",borderRadius:"8px",color:"#0a0807",fontWeight:"800",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",
          boxShadow:`0 2px 12px ${C.goldGlow}`,letterSpacing:"0.3px"}}>+ New Trade</button>
      </div>

      <div style={S.page}>
        {view==="list"&&(
          <>
            <BalanceDashboard
              account={account}
              trades={trades}
              onUpdateAccount={patch=>updateAccount(account.id,patch)}
              onExport={()=>exportCSV(trades,account.name)}
            />
            {tab==="Gallery"
              ?<GalleryView trades={sorted} onSelect={t=>{setSelected(t);setView("detail");}} />
              :<ListView trades={sorted} onSelect={t=>{setSelected(t);setView("detail");}} />
            }
          </>
        )}
        {view==="detail"&&selected&&(
          <TradeDetail trade={selected} onSave={saveTrade} onDelete={deleteTrade} onBack={()=>setView("list")} />
        )}
      </div>
    </div>
  );
}
