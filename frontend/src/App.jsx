import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { forgotPassword as apiForgotPassword, createPatient as apiCreatePatient, updatePatient as apiUpdatePatient, deletePatient as apiDeletePatient, finishProgram as apiFinishProgram, restartProgram as apiRestartProgram } from './utils/api';
import html2pdf from "html2pdf.js";
import { subDays, isAfter, format, differenceInYears, setYear, isBefore, addDays, parseISO, differenceInDays } from "date-fns";
import * as Lucide from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area
} from "recharts";
import {
  Users, LayoutDashboard, ClipboardCheck, AlertTriangle, FileText,
  LogOut, ChevronRight, Search, Bell, TrendingUp, TrendingDown,
  Activity, Shield, User, Lock, Menu, Check, Download,
  ArrowLeft, Camera, Star, Award, Flame, Target, Zap, BarChart3,
  Trophy, CalendarDays, Weight, Home, Heart, Brain, RefreshCw, Plus, Settings, UserPlus, Cake, FileSignature, Save
} from "lucide-react";

/* ════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════ */
const G = {
  50:"#FBF7EE", 100:"#F5ECDA", 200:"#EBDAB5", 300:"#D4B978",
  400:"#C4A44E", 500:"#A8872E", 600:"#8B6D1E", 700:"#6E5517",
  800:"#4E3D12", 900:"#332810"
};
const W = { 50:"#FEFCF9", 100:"#FDF8F0", 200:"#FAF0E0" };
const S = {
  red:"#C0392B", redBg:"#FDEDEC",
  yel:"#F39C12", yelBg:"#FEF9E7",
  grn:"#27AE60", grnBg:"#EAFAF1",
  pur:"#8E44AD", purBg:"#F4ECF7",
  blue:"#2980B9", blueBg:"#EBF5FB"
};

/* ════════════════════════════════════════════
   CONSTANTES
═══════════════════════════════════════════════ */
const PLANS = [
  { id:"platinum_plus", name:"Platinum Plus", tier:1 },
  { id:"gold_plus",     name:"Gold Plus",     tier:1 },
  { id:"platinum",      name:"Platinum",      tier:2 },
  { id:"gold",          name:"Gold",          tier:2 },
  { id:"essential_plus",name:"Essential Plus",tier:3 },
  { id:"essential",     name:"Essential",     tier:3 },
];

const TIER = {
  1:{ ter:"semanal",    psi:"semanal",    tr:3, nf:true  },
  2:{ ter:"quinzenal",  psi:"quinzenal",  tr:2, nf:false },
  3:{ ter:null,         psi:null,         tr:2, nf:false },
};

const TODAY = new Date(2026, 2, 24);
const fmt   = d => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}`; };
const addD  = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };

/* ════════════════════════════════════════════
   DADOS INICIAIS (PERSISTENTES)
═══════════════════════════════════════════════ */
const MOCK_HIST_BASE = [
  { date: subDays(new Date(), 42).toISOString(), weight: 89.5, massaMagra: 54.3, massaGordura: 35.2, m:{gv:2,mm:2,pcr:3,fer:2,hb:2,au:3,th:2,ca:2}, b:{gi:2,lib:2,dor:3,au:2,en:2,so:3}, n:{co:2,ge:2,mv:3} },
  { date: subDays(new Date(), 21).toISOString(), weight: 87.1, massaMagra: 55.2, massaGordura: 31.9, m:{gv:3,mm:2,pcr:3,fer:3,hb:2,au:3,th:2,ca:3}, b:{gi:3,lib:3,dor:3,au:2,en:2,so:3}, n:{co:2,ge:3,mv:2} },
  { date: new Date().toISOString(),              weight: 84.2, massaMagra: 56.8, massaGordura: 27.4, m:{gv:3,mm:3,pcr:2,fer:3,hb:3,au:2,th:3,ca:2}, b:{gi:3,lib:2,dor:2,au:3,en:3,so:2}, n:{co:3,ge:2,mv:3} }
];

const MOCK_PATIENTS = [
  { id: 1, name: "Ana Carolina Silva", plan: "platinum_plus", cycle: 1, week: 6, birthDate: "1992-05-15", phone: "(24) 99912-3456", sd: "2025-11-01", iw: 89.5, cw: 84.2, history: MOCK_HIST_BASE, nr: addDays(new Date(), 2).toISOString(), eng: 92, pass: "123", scoreHistory: [
    { id:1, date: subDays(new Date(), 120).toISOString(), month:"Nov/25", m:{gv:1,mm:2,pcr:2,fer:1,hb:1,au:2,th:1,ca:2}, b:{gi:2,lib:1,dor:2,au:1,en:2,so:2}, n:{co:1,ge:1,mv:2} },
    { id:2, date: subDays(new Date(), 90).toISOString(),  month:"Dez/25", m:{gv:2,mm:2,pcr:2,fer:2,hb:2,au:2,th:2,ca:2}, b:{gi:2,lib:2,dor:2,au:2,en:2,so:3}, n:{co:2,ge:2,mv:2} },
    { id:3, date: subDays(new Date(), 60).toISOString(),  month:"Jan/26", m:{gv:2,mm:2,pcr:3,fer:2,hb:2,au:3,th:2,ca:2}, b:{gi:3,lib:2,dor:3,au:2,en:2,so:3}, n:{co:2,ge:2,mv:3} },
    { id:4, date: subDays(new Date(), 30).toISOString(),  month:"Fev/26", m:{gv:3,mm:2,pcr:3,fer:3,hb:2,au:3,th:2,ca:3}, b:{gi:3,lib:3,dor:3,au:2,en:3,so:3}, n:{co:2,ge:3,mv:2} },
    { id:5, date: new Date().toISOString(),               month:"Mar/26", m:{gv:3,mm:3,pcr:2,fer:3,hb:3,au:2,th:3,ca:2}, b:{gi:3,lib:2,dor:2,au:3,en:3,so:2}, n:{co:3,ge:2,mv:3} },
  ] },
  { id: 2, name: "Beatriz Oliveira", plan: "gold", cycle: 1, week: 12, birthDate: "1983-11-20", phone: "(24) 99834-5678", sd: "2025-09-15", iw: 95.0, cw: 86.8, history: MOCK_HIST_BASE.map(h => ({...h, weight: h.weight+5})), nr: addDays(new Date(), 5).toISOString(), eng: 88, pass: "123", scoreHistory: [
    { id:1, date: subDays(new Date(), 150).toISOString(), month:"Set/25", m:{gv:1,mm:1,pcr:1,fer:1,hb:1,au:1,th:1,ca:1}, b:{gi:1,lib:1,dor:1,au:1,en:1,so:2}, n:{co:1,ge:1,mv:1} },
    { id:2, date: subDays(new Date(), 120).toISOString(), month:"Out/25", m:{gv:2,mm:1,pcr:2,fer:2,hb:1,au:2,th:1,ca:2}, b:{gi:2,lib:1,dor:2,au:2,en:1,so:2}, n:{co:2,ge:1,mv:2} },
    { id:3, date: subDays(new Date(), 90).toISOString(),  month:"Nov/25", m:{gv:2,mm:2,pcr:2,fer:2,hb:2,au:2,th:2,ca:2}, b:{gi:2,lib:2,dor:2,au:2,en:2,so:3}, n:{co:2,ge:2,mv:2} },
    { id:4, date: subDays(new Date(), 60).toISOString(),  month:"Dez/25", m:{gv:2,mm:2,pcr:3,fer:2,hb:2,au:2,th:2,ca:2}, b:{gi:3,lib:2,dor:2,au:2,en:2,so:3}, n:{co:2,ge:2,mv:2} },
    { id:5, date: subDays(new Date(), 30).toISOString(),  month:"Jan/26", m:{gv:3,mm:2,pcr:3,fer:3,hb:2,au:3,th:2,ca:3}, b:{gi:3,lib:2,dor:3,au:3,en:3,so:3}, n:{co:3,ge:2,mv:3} },
    { id:6, date: new Date().toISOString(),               month:"Fev/26", m:{gv:3,mm:3,pcr:3,fer:3,hb:3,au:3,th:3,ca:2}, b:{gi:3,lib:3,dor:3,au:3,en:3,so:3}, n:{co:3,ge:3,mv:2} },
  ] },
  { id: 3, name: "Camila Ferreira", plan: "essential", cycle: 2, week: 3, birthDate: format(addDays(new Date(), 5), "yyyy-MM-dd"), phone: "(24) 99756-7890", sd: "2025-06-01", iw: 78.3, cw: 71.1, history: MOCK_HIST_BASE.map(h => ({...h, weight: h.weight-10, met:12, be:10})), nr: new Date().toISOString(), eng: 95, pass: "123", scoreHistory: [
    { id:1, date: subDays(new Date(), 60).toISOString(),  month:"Jan/26", m:{gv:1,mm:1,pcr:1,fer:1,hb:1,au:1,th:1,ca:1}, b:{gi:1,lib:1,dor:1,au:1,en:1,so:1}, n:{co:1,ge:1,mv:1} },
    { id:2, date: subDays(new Date(), 30).toISOString(),  month:"Fev/26", m:{gv:2,mm:1,pcr:2,fer:1,hb:2,au:2,th:1,ca:2}, b:{gi:2,lib:1,dor:2,au:2,en:2,so:2}, n:{co:2,ge:1,mv:2} },
    { id:3, date: new Date().toISOString(),               month:"Mar/26", m:{gv:2,mm:2,pcr:2,fer:2,hb:2,au:2,th:2,ca:2}, b:{gi:2,lib:2,dor:2,au:2,en:2,so:2}, n:{co:2,ge:2,mv:2} },
  ] },
];

const MOCK_TEAM = [
  { id:1, name:"Dra. Mariana Wogel", role:"admin",   label:"Administradora", specialty:"Nutróloga",  color:G[600], email:"mariana@institutowogel.com",  phone:"(24) 99999-0001", createdAt:"2024-01-01T00:00:00.000Z" },
  { id:2, name:"Juliana Santos",     role:"enferm",  label:"Enfermagem",     specialty:"Enfermeira", color:S.grn,  email:"juliana@institutowogel.com",   phone:"(24) 99999-0002", createdAt:"2024-03-15T00:00:00.000Z" },
];

const ROLES = [
  { id:"admin",    label:"Administrador(a)", color:G[600] },
  { id:"medico",   label:"Médico(a)",        color:S.blue },
  { id:"enferm",   label:"Enfermagem",       color:S.grn  },
  { id:"nutri",    label:"Nutricionista",    color:S.pur  },
  { id:"psi",      label:"Psicóloga",        color:"#E91E63" },
  { id:"personal", label:"Personal",         color:S.yel  },
];

const MOCK_ACTIVITY = [
  { id:1, date: subDays(new Date(), 1).toISOString(),  memberId:2, memberName:"Juliana Santos",     action:"pesagem",  patientId:1, patientName:"Ana Carolina Silva", detail:"Peso: 84.2kg | MM: 56.8kg | MG: 27.4kg" },
  { id:2, date: subDays(new Date(), 2).toISOString(),  memberId:2, memberName:"Juliana Santos",     action:"pesagem",  patientId:2, patientName:"Beatriz Oliveira",   detail:"Peso: 86.8kg | MM: 54.1kg | MG: 32.7kg" },
  { id:3, date: subDays(new Date(), 3).toISOString(),  memberId:1, memberName:"Dra. Mariana Wogel", action:"scores",   patientId:1, patientName:"Ana Carolina Silva", detail:"Scores metabólicos atualizados" },
  { id:4, date: subDays(new Date(), 5).toISOString(),  memberId:1, memberName:"Dra. Mariana Wogel", action:"cadastro", patientId:3, patientName:"Camila Ferreira",   detail:"Novo paciente cadastrado" },
  { id:5, date: subDays(new Date(), 7).toISOString(),  memberId:2, memberName:"Juliana Santos",     action:"checklist",patientId:3, patientName:"Camila Ferreira",   detail:"Checklist semana 3 atualizado" },
];

const genSC = (ps) => ps.reduce((acc, p) => {
  const last = p.history[p.history.length-1];
  acc[p.id] = { m: last.m, b: last.b, n: last.n };
  return acc;
}, {});
/* ════════════════════════════════════════════
   HELPERS — CÁLCULO DE SCORES
═══════════════════════════════════════════════ */
const cM  = s => s ? s.gv+s.mm+s.pcr+s.fer+s.hb+s.au+s.th+s.ca : 0;
const cB  = s => s ? s.gi+s.lib+s.dor+s.au+s.en+s.so : 0;
const cN  = s => s ? s.co+s.ge+s.mv : 0;
const pM  = s => ({ comp:s.gv+s.mm, infl:s.pcr+s.fer, glic:s.hb+s.au, card:s.th+s.ca });

const sM = t => t>=21 ? {l:"Elite",      c:S.pur, bg:S.purBg, e:"🟣", d:"Corpo blindado"}
              : t>=17 ? {l:"Saudável",   c:S.grn, bg:S.grnBg, e:"🟢", d:"Liberdade metabólica"}
              : t>=13 ? {l:"Transição",  c:S.yel, bg:S.yelBg, e:"🟡", d:"Em alerta"}
              :         {l:"Crítico",    c:S.red, bg:S.redBg, e:"🔴", d:"Travado"};

const sB = t => t>13  ? {l:"Excelente", c:S.grn, bg:S.grnBg, e:"🟢", d:"Manter"}
              : t>=10 ? {l:"Alerta",    c:S.yel, bg:S.yelBg, e:"🟡", d:"Nutri intervém"}
              :         {l:"Crítico",   c:S.red, bg:S.redBg, e:"🔴", d:"Médica"};

const sN = t => t>=8  ? {l:"Elite",      c:S.pur, bg:S.purBg, e:"🟣", d:"Alta"}
              : t>=5  ? {l:"Construção", c:S.yel, bg:S.yelBg, e:"🟡", d:"Reforço"}
              :         {l:"Recaída",    c:S.red, bg:S.redBg, e:"🔴", d:"Intervenção"};

/* ════════════════════════════════════════════
   HELPERS GERAIS
═══════════════════════════════════════════════ */
const ini     = n => n.split(" ").filter((_,i,a) => i===0||i===a.length-1).map(w=>w[0]).join("").toUpperCase();
const calcAge = bd => { try { return differenceInYears(new Date(), parseISO(bd)); } catch { return "?"; } };

const HIST = id => [1,2,3,4].map((m,i) => ({
  mo:`Mês ${m}`,
  met: Math.min(24, Math.max(8,  10 + id%5*2 + i*2)),
  be:  Math.min(18, Math.max(6,   8 + id%4*2 + i*2)),
  mn:  Math.min(9,  Math.max(3,   4 + id%2   + i  )),
}));

const genCL = (p, tier) => {
  const w = p?.week || 1;
  const f = TIER[tier];
  const r = {};
  for (let i=1; i<=16; i++) {
    const d  = i < w;
    const pt = i === w;
    r[i] = {
      tirz: d||(pt&&Math.random()>0.3),
      ter:  f.ter ? (d||(pt&&Math.random()>0.4)) : null,
      peso: d||(pt&&Math.random()>0.2),
      psi:  f.psi ? (d||(pt&&Math.random()>0.5)) : null,
      bio:  d||(pt&&Math.random()>0.3),
      tr:   Array.from({length:f.tr}, () => d||(pt&&Math.random()>0.4)),
      nu:   i%4===1 ? {av:d, pl:d, sc:d} : null,
      dose: d||pt ? (i<=4?"2.5mg":i<=8?"5mg":i<=12?"7.5mg":"10mg") : "2.5mg",
    };
  }
  return r;
};

/* hook mobile */
const useMob = () => {
  const [m, s] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => s(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
};

/* ════════════════════════════════════════════
   COMPONENTE — AVATAR
═══════════════════════════════════════════════ */
function Av({ name, size=40, src, onEdit }) {
  const ref = useRef();
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {src
        ? <img src={src} alt="" style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover" }}/>
        : <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${G[400]},${G[600]})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:size*0.35 }}>
            {ini(name)}
          </div>
      }
      {onEdit && <>
        <input ref={ref} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e => { const f=e.target.files[0]; if(f){ const r=new FileReader(); r.onload=ev=>onEdit(ev.target.result); r.readAsDataURL(f); }}}
        />
        <div onClick={()=>ref.current?.click()} style={{ position:"absolute", bottom:-2, right:-2, width:Math.max(18,size*0.38), height:Math.max(18,size*0.38), borderRadius:"50%", background:G[500], border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Camera size={Math.max(9,size*0.17)} color="#fff"/>
        </div>
      </>}
    </div>
  );
}

/* Badge */
const Bg = ({ children, color=G[700], bg=G[100] }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color, background:bg, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

/* Metric Card */
function Mt({ value, label, icon:Icon, color, sub, trend }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:10, color:G[600], fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</span>
        {Icon && <Icon size={15} color={color||G[400]}/>}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color:color||G[800], lineHeight:1.2, marginTop:2 }}>{value}</div>
      {sub   && <div style={{ fontSize:10, color:"#aaa", marginTop:1 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ display:"flex", alignItems:"center", gap:2, fontSize:10, fontWeight:600, color:trend>=0?S.grn:S.red, marginTop:2 }}>
          {trend>=0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
          {Math.abs(trend)}% vs mês ant.
        </div>
      )}
    </div>
  );
}

/* Score Bar */
function SBar({ label, total, max, fn }) {
  const st = fn(total);
  const p  = Math.round(total/max*100);
  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:38, height:38, borderRadius:"50%", background:st.c, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>{total}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:G[800] }}>{label}</div>
        <div style={{ height:5, background:G[100], borderRadius:3, marginTop:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${p}%`, background:st.c, borderRadius:3, transition:"width 0.5s" }}/>
        </div>
      </div>
      <Bg color={st.c} bg={st.bg}>{st.e} {st.l}</Bg>
    </div>
  );
}

/* Checkbox Item */
function CI({ checked, label, onToggle }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${G[50]}` }}>
      <div onClick={onToggle} style={{ width:20, height:20, borderRadius:5, border:checked?`2px solid ${S.grn}`:`2px solid ${G[300]}`, background:checked?S.grnBg:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
        {checked && <Check size={12} color={S.grn}/>}
      </div>
      <span style={{ fontSize:12, color:checked?"#bbb":G[900], textDecoration:checked?"line-through":"none" }}>{label}</span>
    </div>
  );
}

/* Score Input */
function SI({ label, value, onChange, opts }) {
  return (
    <div style={{ padding:"8px 0", borderBottom:`1px solid ${G[100]}` }}>
      <div style={{ fontSize:12, fontWeight:600, color:G[800], marginBottom:4 }}>{label}</div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {opts.map(o => (
          <div key={o.v} onClick={()=>onChange(o.v)} style={{ padding:"6px 12px", borderRadius:7, cursor:"pointer", fontSize:11, border:`1.5px solid ${value===o.v?G[500]:G[200]}`, background:value===o.v?G[100]:"#fff", color:value===o.v?G[800]:"#888", fontWeight:value===o.v?600:400, transition:"all 0.15s" }}>
            {o.v}pt — {o.l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   DASHBOARD — Dra. Mariana
═══════════════════════════════════════════════ */
function Dash({  ps, onSel, mob }) {
  const [df, setDf] = useState("all");
  const SC = genSC(ps);

  // Composição corporal média atual
  const avgMM = ps.length ? +(ps.reduce((a,p)=>{ const last=p.history[p.history.length-1]; return a+(last.massaMagra||0); },0)/ps.length).toFixed(1) : 0;
  const avgMG = ps.length ? +(ps.reduce((a,p)=>{ const last=p.history[p.history.length-1]; return a+(last.massaGordura||0); },0)/ps.length).toFixed(1) : 0;
  const avgPctMM = ps.length ? +(ps.reduce((a,p)=>{ const last=p.history[p.history.length-1]; const tot=(last.massaMagra||0)+(last.massaGordura||0); return a+(tot>0?(last.massaMagra/tot*100):0); },0)/ps.length).toFixed(1) : 0;
  const avgPctMG = ps.length ? +(100-avgPctMM).toFixed(1) : 0;

  // Histórico de composição (para gráfico)
  const compHist = (() => {
    const weeks = {};
    ps.forEach(p => { p.history.forEach((h,i) => { const k=`S${i+1}`; if(!weeks[k]) weeks[k]={s:k,mm:0,mg:0,n:0}; weeks[k].mm+=(h.massaMagra||0); weeks[k].mg+=(h.massaGordura||0); weeks[k].n++; }); });
    return Object.values(weeks).map(w=>({s:w.s, mm:w.n?+(w.mm/w.n).toFixed(1):0, mg:w.n?+(w.mg/w.n).toFixed(1):0}));
  })();

  const tl   = ps.reduce((a,p) => a+(p.iw-p.cw), 0);
  const ae   = Math.round(ps.reduce((a,p) => a+p.eng, 0)/ps.length);
  const cr   = ps.filter(p => { const sc=SC[p.id]; return sc&&(cM(sc.m)<=12||cB(sc.b)<10); });
  const el   = ps.filter(p => { const sc=SC[p.id]; return sc&&cM(sc.m)>=21; });
  const rTod = ps.filter(p => p.nr && fmt(p.nr)===fmt(TODAY));
  const rWk  = ps.filter(p => { if(!p.nr)return false; const d=new Date(p.nr).getTime(); return d>=TODAY.getTime()&&d<=addD(TODAY,7).getTime(); }).sort((a,b)=>new Date(a.nr)-new Date(b.nr));
  const top  = useMemo(() => ps.map(p=>({...p,pct:((p.iw-p.cw)/p.iw*100)})).sort((a,b)=>b.pct-a.pct).slice(0,3), [ps]);
  const pavg = useMemo(() => {
    const s={c:0,i:0,g:0,v:0,n:0};
    ps.forEach(p => { const sc=SC[p.id]; if(!sc)return; const pm=pM(sc.m); s.c+=pm.comp; s.i+=pm.infl; s.g+=pm.glic; s.v+=pm.card; s.n++; });
    const n=s.n||1;
    return [{p:"Composição",v:+(s.c/n).toFixed(1)},{p:"Inflamação",v:+(s.i/n).toFixed(1)},{p:"Glicêmico",v:+(s.g/n).toFixed(1)},{p:"Cardiovascular",v:+(s.v/n).toFixed(1)}];
  }, [ps]);
  const engD = useMemo(() => ps.map(p=>({n:p.name.split(" ")[0],e:p.eng})).sort((a,b)=>b.e-a.e), [ps]);
  const wbw  = useMemo(() => {
    const w=[];
    for(let i=1;i<=16;i++){let s=0,n=0; ps.forEach(p=>{if(p.history[i-1]!==undefined){s+=p.iw-p.history[i-1];n++;}}); w.push({s:`S${i}`,v:n?+(s/n).toFixed(1):0});}
    return w;
  }, [ps]);

  const achievements = [
    {i:Trophy,    l:"Fernanda completou 15 semanas",        c:S.pur},
    {i:TrendingUp,l:"Ana Carolina perdeu 1.6kg esta semana",c:S.grn},
    {i:Star,      l:"Gabriela atingiu score Elite metabólico",c:G[500]},
    {i:Target,    l:"Beatriz completou todos os treinos",    c:S.blue},
  ];
  const todayA = [
    {i:Zap,  l:"Camila — retorno hoje",              c:S.blue},
    {i:Check,l:"3 pacientes completaram checklist",  c:S.grn},
  ];
  const gc  = mob ? "1fr" : "repeat(4,1fr)";
  const gc2 = mob ? "1fr" : "1fr 1fr";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Filtro período */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, color:G[600], fontWeight:500 }}>Período:</span>
        {[["all","Todos"],["week","7d"],["month","30d"],["quarter","90d"],["120d","120d"]].map(([k,l]) => (
          <div key={k} onClick={()=>setDf(k)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, cursor:"pointer", fontWeight:df===k?600:400, background:df===k?G[600]:"#fff", color:df===k?"#fff":G[700], border:`1px solid ${df===k?G[600]:G[300]}` }}>{l}</div>
        ))}
      </div>

      {/* KPIs linha 1 */}
      <div style={{ display:"grid", gridTemplateColumns:gc, gap:8 }}>
        <Mt value={ps.length}          label="Pacientes ativos"   icon={Users}        trend={12}/>
        <Mt value={cr.length}          label="Críticos"            icon={AlertTriangle} color={cr.length?S.red:S.grn} sub={cr.length?cr.map(p=>p.name.split(" ")[0]).join(", "):"Nenhum"}/>
        <Mt value={`${tl.toFixed(1)}kg`} label="Peso total perdido" icon={TrendingUp}   color={S.grn} trend={8}/>
        <Mt value={`${ae}%`}           label="Engajamento médio"  icon={Flame}         color={ae>=80?S.grn:ae>=60?S.yel:S.red}/>
      </div>

      {/* KPIs linha 2 */}
      <div style={{ display:"grid", gridTemplateColumns:gc, gap:8 }}>
        <Mt value={`${(tl/ps.length).toFixed(1)}kg`} label="Média por paciente"  icon={Weight}/>
        <Mt value={el.length}          label="Score elite"         icon={Trophy}        color={S.pur} sub={el.map(p=>p.name.split(" ")[0]).join(", ")||"—"}/>
        <Mt value={rTod.length}        label="Retornos hoje"       icon={CalendarDays}  color={S.blue} sub={rTod.map(p=>p.name.split(" ")[0]).join(", ")||"Nenhum"}/>
        <Mt value={`${Math.round(ps.filter(p=>p.eng>=80).length/ps.length*100)}%`} label="Engajamento alto" icon={Zap} color={S.grn}/>
      </div>

      {/* KPIs composição corporal */}
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)", gap:8 }}>
        <Mt value={`${avgMM}kg`}    label="Massa magra média"   icon={Activity} color={S.blue}  sub={`${avgPctMM}% do peso`}/>
        <Mt value={`${avgMG}kg`}    label="Massa gorda média"   icon={Weight}   color={S.yel}   sub={`${avgPctMG}% do peso`}/>
        <Mt value={`${(tl/ps.length).toFixed(1)}kg`} label="Perda média"   icon={TrendingDown} color={S.grn}/>
        <Mt value={`${ae}%`}        label="Engajamento"         icon={Flame}    color={ae>=80?S.grn:S.yel}/>
      </div>

      {/* Gráfico composição corporal */}
      <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:4 }}>Composição corporal média</div>
        <div style={{ fontSize:10, color:"#aaa", marginBottom:8 }}>Massa magra vs massa gorda (kg) ao longo do programa</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={compHist}>
            <defs>
              <linearGradient id="gmm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.blue} stopOpacity={0.3}/><stop offset="100%" stopColor={S.blue} stopOpacity={0}/></linearGradient>
              <linearGradient id="gmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.yel} stopOpacity={0.3}/><stop offset="100%" stopColor={S.yel} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}} unit="kg"/>
            <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Legend iconType="circle" wrapperStyle={{fontSize:10}}/>
            <Area type="monotone" dataKey="mm" name="Massa Magra" stroke={S.blue} fill="url(#gmm)" strokeWidth={2}/>
            <Area type="monotone" dataKey="mg" name="Massa Gorda" stroke={S.yel}  fill="url(#gmg)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Calendário + Conquistas */}
      <div style={{ display:"grid", gridTemplateColumns:gc2, gap:12 }}>
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Retornos próximos 7 dias</span>
            <CalendarDays size={15} color={G[400]}/>
          </div>
          {rWk.length===0 ? <div style={{ fontSize:12, color:"#ccc", padding:8, textAlign:"center" }}>Nenhum</div>
            : rWk.map(p => {
              const isT=fmt(p.nr)===fmt(TODAY); const past=new Date(p.nr)<TODAY;
              return (
                <div key={p.id} onClick={()=>onSel(p.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px", borderRadius:7, marginBottom:3, cursor:"pointer", background:isT?S.blueBg:past?S.redBg:"transparent" }}>
                  <Av name={p.name} size={28}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:isT?S.blue:past?S.red:"#aaa" }}>{isT?"Hoje":past?"Atrasado":fmt(p.nr)}</div>
                  </div>
                  <ChevronRight size={12} color="#ddd"/>
                </div>
              );
          })}
        </div>

        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Conquistas da semana</div>
          {achievements.map((a,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:i<achievements.length-1?`1px solid ${G[50]}`:"none" }}>
              <a.i size={14} color={a.c}/><span style={{ fontSize:11, color:G[800] }}>{a.l}</span>
            </div>
          ))}
          <div style={{ fontSize:13, fontWeight:600, color:G[800], margin:"12px 0 6px", paddingTop:10, borderTop:`1px solid ${G[200]}` }}>Hoje</div>
          {todayA.map((a,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0" }}>
              <a.i size={14} color={a.c}/><span style={{ fontSize:11, color:G[800] }}>{a.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display:"grid", gridTemplateColumns:gc2, gap:12 }}>
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Perda de peso média por semana</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={wbw}>
              <defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.grn} stopOpacity={0.25}/><stop offset="100%" stopColor={S.grn} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}} unit="kg"/>
              <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Area type="monotone" dataKey="v" stroke={S.grn} fill="url(#gw)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Engajamento por paciente</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={engD} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis type="number" domain={[0,100]} tick={{fontSize:9,fill:"#bbb"}}/>
              <YAxis type="category" dataKey="n" width={60} tick={{fontSize:10,fill:G[700]}}/><Tooltip contentStyle={{borderRadius:8,fontSize:11}}/>
              <Bar dataKey="e" radius={[0,4,4,0]}>{engD.map((e,i)=><Cell key={i} fill={e.e>=80?S.grn:e.e>=60?S.yel:S.red}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:gc2, gap:12 }}>
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:4 }}>Radar metabólico médio</div>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>Onde os pacientes mais melhoram</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={pavg} outerRadius={65}>
              <PolarGrid stroke={G[200]}/><PolarAngleAxis dataKey="p" tick={{fontSize:10,fill:G[700]}}/><PolarRadiusAxis domain={[0,6]} tick={{fontSize:8,fill:"#ddd"}}/>
              <Radar dataKey="v" stroke={G[500]} fill={G[400]} fillOpacity={0.2} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Top resultados — maior perda %</div>
          {top.map((p,i) => (
            <div key={p.id} onClick={()=>onSel(p.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px", borderRadius:7, marginBottom:4, cursor:"pointer", background:i===0?`${G[500]}0A`:W[50] }}>
              <span style={{ fontSize:16, fontWeight:700, color:i===0?G[500]:G[300], width:20 }}>{i+1}</span>
              <Av name={p.name} size={30}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                <div style={{ fontSize:10, color:"#aaa" }}>{PLANS.find(x=>x.id===p.plan)?.name}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:14, fontWeight:700, color:S.grn }}>-{p.pct.toFixed(1)}%</div>
                <div style={{ fontSize:10, color:"#aaa" }}>-{(p.iw-p.cw).toFixed(1)}kg</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Críticos destaque */}
      {cr.length>0 && (
        <div style={{ background:S.redBg, borderRadius:12, border:`1px solid ${S.red}30`, padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <AlertTriangle size={14} color={S.red}/>
            <span style={{ fontSize:13, fontWeight:600, color:S.red }}>Críticos — atenção imediata</span>
          </div>
          {cr.map(p => { const sc=SC[p.id]; const m=cM(sc.m); const b=cB(sc.b); return (
            <div key={p.id} onClick={()=>onSel(p.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, marginBottom:3, background:"rgba(255,255,255,0.6)", cursor:"pointer" }}>
              <Av name={p.name} size={26}/>
              <span style={{ flex:1, fontSize:12, fontWeight:500 }}>{p.name}</span>
              {m<=12 && <Bg color={S.red} bg="#fff">Met:{m}</Bg>}
              {b<10  && <Bg color={S.red} bg="#fff">Bem:{b}</Bg>}
            </div>
          );})}
        </div>
      )}

      {/* Tabela resumo */}
      <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:mob?"10px":"14px 16px", overflowX:"auto" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Todos os pacientes</div>
        <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:11, minWidth:560 }}>
          <thead><tr>{["Paciente","Plano","Sem","Met","Bem","Ment","Eng%","Evol"].map(h =>
            <th key={h} style={{ textAlign:"left", padding:"6px 8px", borderBottom:`2px solid ${G[300]}`, color:G[700], fontWeight:600, fontSize:9, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
          )}</tr></thead>
          <tbody>{ps.map(p => {
            const sc=SC[p.id]; const m=cM(sc?.m); const b=cB(sc?.b); const n=cN(sc?.n);
            const ms=sM(m); const bs=sB(b); const ns=sN(n);
            return (
              <tr key={p.id} onClick={()=>onSel(p.id)} style={{ cursor:"pointer" }}>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}` }}><div style={{ display:"flex", alignItems:"center", gap:6 }}><Av name={p.name} size={22}/><span style={{ fontWeight:500 }}>{p.name}</span></div></td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}`, color:G[600], fontSize:10 }}>{PLANS.find(x=>x.id===p.plan)?.name}</td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}` }}><strong>{p.week}</strong>/16</td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}` }}><Bg color={ms.c} bg={ms.bg}>{ms.e}{m}</Bg></td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}` }}><Bg color={bs.c} bg={bs.bg}>{bs.e}{b}</Bg></td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}` }}><Bg color={ns.c} bg={ns.bg}>{ns.e}{n}</Bg></td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}` }}>
                  <div style={{ height:5, width:44, background:G[100], borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${p.eng}%`, background:p.eng>=80?S.grn:p.eng>=60?S.yel:S.red, borderRadius:3 }}/>
                  </div>
                  <div style={{ fontSize:9, color:"#aaa" }}>{p.eng}%</div>
                </td>
                <td style={{ padding:"8px", borderBottom:`1px solid ${G[100]}`, color:S.grn, fontWeight:600 }}>-{(p.iw-p.cw).toFixed(1)}kg</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   LISTA DE PACIENTES
═══════════════════════════════════════════════ */
function PList({  ps, onSel, mob, onAdd, onDelete }) {
  const SC = genSC(ps);
  const [q,  setQ]  = useState("");
  const [fp, setFp] = useState("all");
  const f = ps.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) && (fp==="all"||p.plan===fp));

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={onAdd} style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}><Plus size={13}/>Novo paciente</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:140, position:"relative" }}>
          <Search size={14} color="#bbb" style={{ position:"absolute", left:10, top:10 }}/>
          <input style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:8, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <select style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", background:"#fff" }} value={fp} onChange={e=>setFp(e.target.value)}>
          <option value="all">Todos</option>
          {PLANS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ display:"grid", gap:6 }}>
        {f.map(p => {
          const sc=SC[p.id]; const m=cM(sc?.m); const ms=sM(m);
          return (
            <div key={p.id} style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
              <div onClick={()=>onSel(p.id)} style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0, cursor:"pointer" }}>
                <Av name={p.name} size={mob?36:40}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:10, color:"#aaa" }}>{PLANS.find(x=>x.id===p.plan)?.name} • S{p.week}/16 • {calcAge(p.birthDate)}a</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <Bg color={ms.c} bg={ms.bg}>{ms.e}{ms.l}</Bg>
                  <div style={{ fontSize:11, color:S.grn, fontWeight:600, marginTop:2 }}>-{(p.iw-p.cw).toFixed(1)}kg</div>
                </div>
              </div>
              {onDelete && (
                <button onClick={e=>{ e.stopPropagation(); if(window.confirm(`Excluir paciente "${p.name}"? Esta ação não pode ser desfeita.`)) onDelete(p.id); }}
                  style={{ flexShrink:0, padding:"5px 8px", borderRadius:7, background:"#FDEDEC", color:S.red, border:`1px solid #F5B7B1`, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>🗑️</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   RELATÓRIO — componente com estado próprio
═══════════════════════════════════════════════ */
function RelTab({ p, mob, plan, met, be, mn }) {
  const [relDe,   setRelDe]   = useState("");
  const [relAte,  setRelAte]  = useState("");
  const [relComp, setRelComp] = useState(false);

  const sh = p.scoreHistory || [];
  const shFilt = relDe||relAte ? sh.filter(s => {
    const d = new Date(s.date);
    if(relDe && d < new Date(relDe)) return false;
    if(relAte && d > new Date(relAte)) return false;
    return true;
  }) : sh;
  const histFilt = relDe||relAte ? p.history.filter(h => {
    const d = new Date(h.date);
    if(relDe && d < new Date(relDe)) return false;
    if(relAte && d > new Date(relAte)) return false;
    return true;
  }) : p.history;

  const comp1 = shFilt[0];
  const comp2 = shFilt[shFilt.length-1];
  const lastH = p.history[p.history.length-1];
  const mmLast = lastH?.massaMagra||0;
  const mgLast = lastH?.massaGordura||0;
  const totComp = mmLast+mgLast||1;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Controles de período e PDF */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
          <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Relatório Clínico</span>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>setRelComp(!relComp)} style={{ fontSize:11, padding:"6px 12px", borderRadius:7, background:relComp?G[600]:G[50], color:relComp?"#fff":G[700], border:`1px solid ${G[300]}`, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>📊 Comparativo</button>
            <button onClick={()=>{ const el=document.getElementById(`rel-${p.id}`); if(el) html2pdf().set({margin:[10,10,10,10],filename:`relatorio-${p.name}.pdf`,html2canvas:{scale:2,useCORS:true,letterRendering:true},jsPDF:{format:"a4",orientation:"portrait",unit:"mm"},pagebreak:{mode:["css","legacy"],before:".pdf-page-break",avoid:".pdf-no-break"}}).from(el).save(); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:7, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}><Download size={13}/>PDF</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:130 }}>
            <label style={{ fontSize:10, color:"#aaa", marginBottom:2, display:"block" }}>De</label>
            <input type="date" value={relDe} onChange={e=>setRelDe(e.target.value)} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:11, fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
          <div style={{ flex:1, minWidth:130 }}>
            <label style={{ fontSize:10, color:"#aaa", marginBottom:2, display:"block" }}>Até</label>
            <input type="date" value={relAte} onChange={e=>setRelAte(e.target.value)} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:11, fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
          {(relDe||relAte) && <button onClick={()=>{setRelDe("");setRelAte("");}} style={{ alignSelf:"flex-end", padding:"7px 12px", borderRadius:7, background:G[50], border:`1px solid ${G[300]}`, fontSize:11, color:G[700], cursor:"pointer", fontFamily:"inherit" }}>Limpar</button>}
        </div>
      </div>

      {/* Conteúdo do relatório (exportável) */}
      <div id={`rel-${p.id}`} style={{ display:"flex", flexDirection:"column", gap:10 }}>

        {/* Cabeçalho */}
        <div style={{ background:`linear-gradient(135deg,${G[700]},${G[900]})`, borderRadius:12, padding:"20px 18px", color:"#fff", pageBreakInside:"avoid" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
            <img src="https://i.imgur.com/iI43uBa.png" alt="Instituto Dra. Mariana Wogel"
              onError={e=>{ e.target.src="https://i.imgur.com/iI43uBa.jpg"; }}
              style={{ width:52, height:52, borderRadius:8, objectFit:"contain", background:"rgba(255,255,255,0.1)", padding:4 }}/>
            <div>
              <div style={{ fontSize:11, opacity:0.5 }}>Programa Ser Livre</div>
              <div style={{ fontSize:14, fontWeight:700, opacity:0.9 }}>Instituto Dra. Mariana Wogel</div>
            </div>
          </div>
          <div style={{ fontSize:19, fontWeight:700 }}>Relatório Clínico</div>
          <div style={{ fontSize:12, opacity:0.6, marginTop:2 }}>{p.name} · Emitido em {fmt(TODAY)}/2026</div>
          {(relDe||relAte) && <div style={{ fontSize:10, opacity:0.4, marginTop:2 }}>Período: {relDe||"início"} → {relAte||"hoje"}</div>}
        </div>

        {/* Dados da ficha */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px", pageBreakInside:"avoid" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>📋 Dados do paciente</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px", fontSize:12 }}>
            <div><span style={{ color:"#aaa" }}>Nome: </span><strong>{p.name}</strong></div>
            <div><span style={{ color:"#aaa" }}>Plano: </span><strong>{plan?.name}</strong></div>
            <div><span style={{ color:"#aaa" }}>Nascimento: </span>{p.birthDate} ({calcAge(p.birthDate)} anos)</div>
            <div><span style={{ color:"#aaa" }}>Telefone: </span>{p.phone}</div>
            <div><span style={{ color:"#aaa" }}>Início do programa: </span>{p.sd}</div>
            <div><span style={{ color:"#aaa" }}>Ciclo/Semana: </span>C{p.cycle} — S{p.week}/16</div>
          </div>
        </div>

        {/* Evolução de peso */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px", pageBreakInside:"avoid" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>⚖️ Evolução de peso</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:10 }}>
            <div style={{ textAlign:"center", padding:"10px 8px", background:G[50], borderRadius:8 }}><div style={{ fontSize:16, fontWeight:700, color:G[800] }}>{p.iw}kg</div><div style={{ fontSize:9, color:"#aaa" }}>Peso inicial</div></div>
            <div style={{ textAlign:"center", padding:"10px 8px", background:G[50], borderRadius:8 }}><div style={{ fontSize:16, fontWeight:700, color:G[800] }}>{p.cw}kg</div><div style={{ fontSize:9, color:"#aaa" }}>Peso atual</div></div>
            <div style={{ textAlign:"center", padding:"10px 8px", background:S.grnBg, borderRadius:8 }}><div style={{ fontSize:16, fontWeight:700, color:S.grn }}>-{(p.iw-p.cw).toFixed(1)}kg</div><div style={{ fontSize:9, color:"#aaa" }}>Perdido</div></div>
            <div style={{ textAlign:"center", padding:"10px 8px", background:S.grnBg, borderRadius:8 }}><div style={{ fontSize:16, fontWeight:700, color:S.grn }}>{(((p.iw-p.cw)/p.iw)*100).toFixed(1)}%</div><div style={{ fontSize:9, color:"#aaa" }}>Redução</div></div>
          </div>
          {histFilt.length > 0 && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:400 }}>
                <thead><tr>{["Data","Peso","MM (kg)","%MM","MG (kg)","%MG"].map(h=><th key={h} style={{ textAlign:"left", padding:"5px 7px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                <tbody>{[...histFilt].reverse().map((h,i)=>{ const t=(h.massaMagra||0)+(h.massaGordura||0)||1; return <tr key={i} style={{ background:i===0?G[50]:"transparent" }}><td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, color:"#aaa", fontSize:10 }}>{format(new Date(h.date),"dd/MM/yy")}</td><td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, fontWeight:i===0?600:400 }}>{h.weight.toFixed(1)}kg</td><td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, color:S.blue }}>{(h.massaMagra||0).toFixed(1)}</td><td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, color:S.blue }}>{(h.massaMagra||0)>0?(h.massaMagra/t*100).toFixed(0):"-"}%</td><td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, color:S.yel }}>{(h.massaGordura||0).toFixed(1)}</td><td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, color:S.yel }}>{(h.massaGordura||0)>0?(h.massaGordura/t*100).toFixed(0):"-"}%</td></tr>; })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Composição corporal atual */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px", pageBreakInside:"avoid" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>🧬 Composição corporal atual</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <div style={{ textAlign:"center", padding:"10px 8px", background:S.blueBg, borderRadius:8 }}><div style={{ fontSize:18, fontWeight:700, color:S.blue }}>{mmLast.toFixed(1)}kg</div><div style={{ fontSize:10, color:S.blue, fontWeight:600 }}>Massa Magra</div><div style={{ fontSize:10, color:"#aaa" }}>{(mmLast/totComp*100).toFixed(1)}% do total</div></div>
            <div style={{ textAlign:"center", padding:"10px 8px", background:S.yelBg, borderRadius:8 }}><div style={{ fontSize:18, fontWeight:700, color:S.yel }}>{mgLast.toFixed(1)}kg</div><div style={{ fontSize:10, color:S.yel, fontWeight:600 }}>Massa Gorda</div><div style={{ fontSize:10, color:"#aaa" }}>{(mgLast/totComp*100).toFixed(1)}% do total</div></div>
          </div>
          <div style={{ height:7, borderRadius:4, overflow:"hidden", display:"flex" }}>
            <div style={{ width:`${(mmLast/totComp*100).toFixed(1)}%`, background:S.blue }}/>
            <div style={{ width:`${(mgLast/totComp*100).toFixed(1)}%`, background:S.yel }}/>
          </div>
        </div>

        {/* Scores atuais */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px", pageBreakInside:"avoid" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>📊 Scores clínicos atuais</div>
          {[{l:"Saúde metabólica",t:met,m:24,fn:sM},{l:"Bem-estar",t:be,m:18,fn:sB},{l:"Blindagem mental",t:mn,m:9,fn:sN}].map((s,i) => {
            const st=s.fn(s.t);
            return <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${G[100]}`, flexWrap:"wrap", gap:3 }}><span style={{ fontSize:12 }}>{s.l}</span><div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:80, height:6, background:G[100], borderRadius:3, overflow:"hidden" }}><div style={{ height:"100%", width:`${(s.t/s.m*100).toFixed(0)}%`, background:st.c, borderRadius:3 }}/></div><Bg color={st.c} bg={st.bg}>{st.e} {s.t}/{s.m} — {st.l}</Bg></div></div>;
          })}
        </div>

        {/* Comparativo mensal (se ativado e houver dados) */}
        {relComp && shFilt.length >= 2 && (
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px", pageBreakInside:"avoid" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>📈 Comparativo: {comp1.month} → {comp2.month}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {[{l:"Metabólico",c1:cM(comp1.m),c2:cM(comp2.m),max:24,fn:sM},{l:"Bem-estar",c1:cB(comp1.b),c2:cB(comp2.b),max:18,fn:sB},{l:"Mental",c1:cN(comp1.n),c2:cN(comp2.n),max:9,fn:sN}].map((s,i)=>{
                const d=s.c2-s.c1; const st=s.fn(s.c2);
                return <div key={i} style={{ textAlign:"center", padding:"10px 8px", background:st.bg, borderRadius:8 }}>
                  <div style={{ fontSize:11, color:st.c, fontWeight:600 }}>{s.l}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:st.c }}>{s.c2}/{s.max}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:d>0?S.grn:d<0?S.red:"#aaa", marginTop:3 }}>{d>0?"+":""}{d!==0?d:"="} pts</div>
                  <div style={{ fontSize:9, color:"#aaa" }}>era {s.c1}</div>
                </div>;
              })}
            </div>
            <div style={{ overflowX:"auto", marginTop:10 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:420 }}>
                <thead><tr>{["Mês","Met","Δ","Bem","Δ","Mental","Δ","Status"].map(h=><th key={h} style={{ textAlign:"left", padding:"5px 7px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                <tbody>{shFilt.map((s,i)=>{
                  const met_=cM(s.m),bem_=cB(s.b),men_=cN(s.n);
                  const pr_=i>0?shFilt[i-1]:null;
                  const dM=pr_?met_-cM(pr_.m):null,dB=pr_?bem_-cB(pr_.b):null,dN=pr_?men_-cN(pr_.n):null;
                  const overall=met_>=17&&bem_>13&&men_>=8?"Elite":met_>=13&&bem_>=10&&men_>=5?"Ok":"Atenção";
                  const ovC=overall==="Elite"?S.pur:overall==="Ok"?S.grn:S.red;
                  return <tr key={i} style={{ background:i===shFilt.length-1?G[50]:"transparent" }}>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, fontWeight:i===shFilt.length-1?600:400 }}>{s.month}</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, color:sM(met_).c, fontWeight:600 }}>{met_}/24</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, fontSize:10 }}>{dM===null?"—":<span style={{ color:dM>0?S.grn:dM<0?S.red:"#aaa", fontWeight:600 }}>{dM>0?"+":""}{dM}</span>}</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, color:sB(bem_).c, fontWeight:600 }}>{bem_}/18</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, fontSize:10 }}>{dB===null?"—":<span style={{ color:dB>0?S.grn:dB<0?S.red:"#aaa", fontWeight:600 }}>{dB>0?"+":""}{dB}</span>}</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, color:sN(men_).c, fontWeight:600 }}>{men_}/9</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}`, fontSize:10 }}>{dN===null?"—":<span style={{ color:dN>0?S.grn:dN<0?S.red:"#aaa", fontWeight:600 }}>{dN>0?"+":""}{dN}</span>}</td>
                    <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[100]}` }}><Bg color={ovC} bg={ovC+"22"}>{overall}</Bg></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Plano de ação */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px", pageBreakInside:"avoid" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:8 }}>🎯 Plano de ação</div>
          {met<=12 && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🔴 <strong>Metabólico crítico</strong> — Protocolo de ataque + detox</div>}
          {be<10   && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🔴 <strong>Bem-estar crítico</strong> — Intervenção médica imediata</div>}
          {met>=13 && met<=16 && <div style={{ padding:"6px 10px", background:S.yelBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🟡 <strong>Transição metabólica</strong> — Ajustes terapêuticos</div>}
          {met>=17 && <div style={{ padding:"6px 10px", background:S.grnBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🟢 <strong>Saudável</strong> — Manutenção + evolução contínua</div>}
          {mn<=4   && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🔴 <strong>Risco de recaída</strong> — Sessão individual com psicóloga</div>}
          {be>=10&&be<=13&&met>=17 && <div style={{ padding:"6px 10px", background:S.yelBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🟡 <strong>Bem-estar em alerta</strong> — Nutricionista intervém</div>}
        </div>

        {/* Rodapé */}
        <div style={{ textAlign:"center", padding:"12px 0", borderTop:`1px solid ${G[200]}`, fontSize:10, color:"#bbb" }}>
          Dra. Mariana Wogel — Nutróloga<br/>Praça São Sebastião 119 — Três Rios, RJ<br/>
          <span style={{ fontSize:9, color:"#ddd" }}>Relatório gerado em {format(new Date(),"dd/MM/yyyy 'às' HH:mm")}</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   DETALHE DO PACIENTE (5 abas)
═══════════════════════════════════════════════ */
function PDetail({  p, onBack, mob, avs, setAvs, onSaveScores, onAddWeighIn, onLog, onAddScoreMonth, onChangePlan, activityLog, onDelete, onFinish, onRestart, onEdit }) {
  const SC = genSC([p]);
  const [tab, setTab]   = useState("ficha");
  const plan = PLANS.find(x=>x.id===p.plan);
  const tier = plan?.tier || 1;
  const ft   = TIER[tier];
  const sc   = SC[p.id];
  const met  = cM(sc?.m); const be = cB(sc?.b); const mn = cN(sc?.n);
  const pm   = sc ? pM(sc.m) : {comp:0,infl:0,glic:0,card:0};
  const hist = HIST(p.id);
  const [cl, setCl]   = useState(() => genCL(p, tier));
  const [es, setEs]   = useState(sc ? JSON.parse(JSON.stringify(sc)) : null);
  const [sw, setSw]   = useState(p.week);
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [newPlanId, setNewPlanId] = useState(p.plan);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(p.name);
  const [editPhone, setEditPhone] = useState(p.phone||'');
  const [editEmail, setEditEmail] = useState(p.email||'');
  const [editBirth, setEditBirth] = useState(p.birthDate||'');

  const tabs = [
    {k:"ficha",    l:"Ficha",     i:User},
    {k:"jornada",  l:"Jornada",   i:ClipboardCheck},
    {k:"scores",   l:"Scores",    i:Activity},
    {k:"evolucao", l:"Evolução",  i:TrendingUp},
    {k:"graficos", l:"Gráficos",  i:BarChart3},
    {k:"rel",      l:"Relatório", i:FileText},
  ];

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <div onClick={onBack} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}><ArrowLeft size={16} color={G[700]}/></div>
        <Av name={p.name} size={40} src={avs[p.id]} onEdit={url=>setAvs(prev=>({...prev,[p.id]:url}))}/>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:mob?15:17, fontWeight:700, color:G[800], overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
          <div style={{ fontSize:11, color:"#aaa" }}>{plan?.name} • {calcAge(p.birthDate)}a • C{p.cycle} • S{p.week}/16</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:"flex", borderBottom:`1px solid ${G[200]}`, marginBottom:14, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:"7px 12px", fontSize:11, fontWeight:tab===t.k?600:400, color:tab===t.k?G[700]:"#aaa", borderBottom:tab===t.k?`2px solid ${G[500]}`:"2px solid transparent", background:"none", border:"none", borderBottomStyle:"solid", whiteSpace:"nowrap", fontFamily:"inherit", display:"flex", alignItems:"center", gap:3, cursor:"pointer" }}>
            <t.i size={12}/>{t.l}
          </button>
        ))}
      </div>

      {/* ABA FICHA */}
      {tab==="ficha" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)", gap:6 }}>
            <Mt value={`${p.iw}kg`} label="Peso inicial"/>
            <Mt value={`${p.cw}kg`} label="Peso atual"/>
            <Mt value={`-${(p.iw-p.cw).toFixed(1)}kg`} label="Evolução" color={S.grn}/>
            <Mt value={`${Math.round((p.iw-p.cw)/p.iw*100)}%`} label="Perda total"/>
          </div>
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px", fontSize:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
              <span style={{ fontWeight:600, color:G[800] }}>Dados do paciente</span>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                <button onClick={()=>setShowEditModal(true)} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:G[50], border:`1px solid ${G[300]}`, color:G[700], cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>✏️ Editar dados</button>
                <button onClick={()=>setShowChangePlan(true)} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:G[50], border:`1px solid ${G[300]}`, color:G[700], cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>🔄 Alterar plano</button>
                <button onClick={()=>{ if(window.confirm(`Finalizar programa de "${p.name}"?`)) { onFinish&&onFinish(p.id); } }} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:"#EAFAF1", border:`1px solid #A9DFBF`, color:S.grn, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>✅ Finalizar</button>
                <button onClick={()=>{ if(window.confirm(`Iniciar novo ciclo para "${p.name}"?`)) { onRestart&&onRestart(p.id); } }} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:"#EBF5FB", border:`1px solid #A9CCE3`, color:S.blue, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>🔁 Novo ciclo</button>
                {onDelete && <button onClick={()=>{ if(window.confirm(`Excluir paciente "${p.name}"? Esta ação não pode ser desfeita.`)) { onDelete(p.id); onBack&&onBack(); } }} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:"#FDEDEC", border:`1px solid #F5B7B1`, color:S.red, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>🗑️ Excluir</button>}
              </div>
            </div>
            {showEditModal && (
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
                <div style={{ background:"#fff", width:"100%", maxWidth:420, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize:15, fontWeight:700, color:G[800], marginBottom:16 }}>Editar dados do paciente</div>
                  {[
                    { label:"Nome completo", val:editName, set:setEditName, type:"text" },
                    { label:"E-mail", val:editEmail, set:setEditEmail, type:"email" },
                    { label:"Telefone", val:editPhone, set:setEditPhone, type:"tel" },
                    { label:"Data de nascimento", val:editBirth, set:setEditBirth, type:"date" },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom:12 }}>
                      <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
                      <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)}
                        style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{ const upd={name:editName,email:editEmail,phone:editPhone,birthDate:editBirth}; onEdit&&onEdit(upd); apiUpdatePatient(p.id,upd).catch(err=>console.warn('API update failed:',err.message)); setShowEditModal(false); }} style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Salvar</button>
                    <button onClick={()=>setShowEditModal(false)} style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" }}>
              <div><span style={{ color:"#aaa" }}>Telefone: </span>{p.phone}</div>
              <div><span style={{ color:"#aaa" }}>Plano: </span>{plan?.name}</div>
              <div><span style={{ color:"#aaa" }}>Início: </span>{p.sd}</div>
              <div><span style={{ color:"#aaa" }}>Ciclo: </span>{p.cycle}</div>
            </div>
          </div>
          {showChangePlan && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
              <div style={{ background:"#fff", width:"100%", maxWidth:380, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ fontSize:15, fontWeight:700, color:G[800], marginBottom:6 }}>Alterar plano</div>
                <div style={{ fontSize:12, color:"#aaa", marginBottom:16 }}>O histórico já realizado é mantido. A mudança vale a partir da semana atual.</div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:4, display:"block" }}>Novo plano</label>
                  <select value={newPlanId} onChange={e=>setNewPlanId(e.target.value)}
                    style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", background:"#fff" }}>
                    {PLANS.map(pl=><option key={pl.id} value={pl.id}>{pl.name}</option>)}
                  </select>
                </div>
                {newPlanId !== p.plan && (
                  <div style={{ padding:"8px 12px", background:G[50], borderRadius:8, marginBottom:14, fontSize:11, color:G[700] }}>
                    {PLANS.find(x=>x.id===p.plan)?.name} → <strong>{PLANS.find(x=>x.id===newPlanId)?.name}</strong>
                  </div>
                )}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ if(newPlanId!==p.plan){ onChangePlan&&onChangePlan(newPlanId); onLog&&onLog({action:"upgrade",patientId:p.id,patientName:p.name,detail:`Plano alterado: ${PLANS.find(x=>x.id===p.plan)?.name} → ${PLANS.find(x=>x.id===newPlanId)?.name}`}); } setShowChangePlan(false); }}
                    style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Confirmar</button>
                  <button onClick={()=>setShowChangePlan(false)}
                    style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {/* Composição corporal */}
          {(() => {
            const last = p.history[p.history.length-1];
            const mm = last.massaMagra || 0;
            const mg = last.massaGordura || 0;
            const tot = mm + mg || 1;
            const pctMM = (mm/tot*100).toFixed(1);
            const pctMG = (mg/tot*100).toFixed(1);
            return (
              <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Composição corporal</span>
                  <button onClick={()=>setShowWeighIn(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7, background:G[600], color:"#fff", fontSize:11, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}><Plus size={11}/>Registrar pesagem</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                  <div style={{ textAlign:"center", padding:"10px 8px", background:S.blueBg, borderRadius:8 }}>
                    <div style={{ fontSize:20, fontWeight:700, color:S.blue }}>{mm.toFixed(1)}kg</div>
                    <div style={{ fontSize:10, color:S.blue, fontWeight:600 }}>Massa Magra</div>
                    <div style={{ fontSize:10, color:"#aaa" }}>{pctMM}% do total</div>
                  </div>
                  <div style={{ textAlign:"center", padding:"10px 8px", background:S.yelBg, borderRadius:8 }}>
                    <div style={{ fontSize:20, fontWeight:700, color:S.yel }}>{mg.toFixed(1)}kg</div>
                    <div style={{ fontSize:10, color:S.yel, fontWeight:600 }}>Massa Gorda</div>
                    <div style={{ fontSize:10, color:"#aaa" }}>{pctMG}% do total</div>
                  </div>
                </div>
                {/* Barra de composição */}
                <div style={{ height:8, borderRadius:4, overflow:"hidden", display:"flex" }}>
                  <div style={{ width:`${pctMM}%`, background:S.blue, transition:"width 0.5s" }}/>
                  <div style={{ width:`${pctMG}%`, background:S.yel,  transition:"width 0.5s" }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#aaa", marginTop:3 }}>
                  <span style={{ color:S.blue }}>■ Magra {pctMM}%</span>
                  <span style={{ color:S.yel }}>■ Gorda {pctMG}%</span>
                </div>
                {/* Histórico de pesagens */}
                {p.history.length > 1 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:6 }}>Histórico de pesagens</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:320 }}>
                        <thead><tr>{["Data","Peso","MM (kg)","%MM","MG (kg)","%MG"].map(h=><th key={h} style={{ textAlign:"left", padding:"4px 6px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                        <tbody>{[...p.history].reverse().map((h,i)=>{ const t=(h.massaMagra||0)+(h.massaGordura||0)||1; return <tr key={i} style={{ background:i===0?G[50]:"transparent" }}><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:"#aaa", fontSize:10 }}>{format(new Date(h.date),"dd/MM/yy")}</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, fontWeight:i===0?600:400 }}>{h.weight.toFixed(1)}kg</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.blue }}>{(h.massaMagra||0).toFixed(1)}</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.blue }}>{(h.massaMagra||0)>0?(h.massaMagra/t*100).toFixed(0):"-"}%</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.yel }}>{(h.massaGordura||0).toFixed(1)}</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.yel }}>{(h.massaGordura||0)>0?(h.massaGordura/t*100).toFixed(0):"-"}%</td></tr>; })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <div style={{ display:"grid", gap:6 }}>
            <SBar label="Saúde metabólica" total={met} max={24} fn={sM}/>
            <SBar label="Bem-estar"         total={be}  max={18} fn={sB}/>
            <SBar label="Blindagem mental"  total={mn}  max={9}  fn={sN}/>
          </div>
          {/* Histórico de atividades do paciente */}
          {activityLog && activityLog.filter(a=>a.patientId===p.id).length > 0 && (
            <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
              <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Histórico de atividades</div>
              {activityLog.filter(a=>a.patientId===p.id).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20).map((a,i,arr) => {
                const icons = { pesagem:Weight, scores:Activity, cadastro:UserPlus, checklist:ClipboardCheck, scores_mensais:TrendingUp, upgrade:RefreshCw };
                const colors = { pesagem:S.blue, scores:S.pur, cadastro:S.grn, checklist:G[500], scores_mensais:S.pur, upgrade:S.yel };
                const Icon = icons[a.action] || FileText;
                const col  = colors[a.action] || G[600];
                return (
                  <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:i<arr.length-1?`1px solid ${G[50]}`:"none" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:col+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={13} color={col}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:G[800] }}>{a.memberName||"Equipe"}</div>
                      <div style={{ fontSize:11, color:"#aaa" }}>{a.detail}</div>
                    </div>
                    <div style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap" }}>{format(new Date(a.date),"dd/MM HH:mm")}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Curva de peso</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={p.history.map((h,i)=>({s:`S${i+1}`,w:h.weight}))}>
                <defs><linearGradient id="gpp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={G[500]} stopOpacity={0.25}/><stop offset="100%" stopColor={G[500]} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis domain={["dataMin-2","dataMax+1"]} tick={{fontSize:9,fill:"#bbb"}}/>
                <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Area type="monotone" dataKey="w" stroke={G[500]} fill="url(#gpp)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {showWeighIn && <WeighInModal p={p} onClose={()=>setShowWeighIn(false)} onSave={(entry)=>{ onAddWeighIn && onAddWeighIn(entry); setShowWeighIn(false); }} onLog={onLog}/>}
        </div>
      )}

      {/* ABA JORNADA */}
      {tab==="jornada" && (
        <div>
          <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
            {Array.from({length:16},(_,i)=>i+1).map(w => {
              const sp=w===8||w===16; const cur=w===p.week; const dn=w<p.week;
              return <div key={w} onClick={()=>setSw(w)} style={{ width:30, height:30, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:11, fontWeight:cur?700:500, background:sw===w?G[600]:dn?S.grnBg:cur?G[100]:"#fff", color:sw===w?"#fff":dn?S.grn:G[800], border:sp?`2px solid ${G[500]}`:`1px solid ${G[200]}` }}>{w}</div>;
            })}
          </div>
          {cl[sw] && (
            <div>
              {/* Alerta Consulta + Hilab para Platinum Plus e Gold Plus */}
              {(sw===8||sw===16) && (
                <div style={{ background:`linear-gradient(135deg,${G[700]},${G[800]})`, borderRadius:10, padding:"14px 16px", marginBottom:10, color:"#fff" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <FileText size={16} color={G[300]}/>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>⚕️ Semana {sw} — Protocolo obrigatório</div>
                      <div style={{ fontSize:10, opacity:0.6 }}>{plan?.name}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"rgba(255,255,255,0.1)", borderRadius:7 }}>
                      <Check size={13} color={G[300]}/><span style={{ fontSize:12 }}>Exames Hilab completos</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"rgba(255,255,255,0.1)", borderRadius:7 }}>
                      <Check size={13} color={G[300]}/><span style={{ fontSize:12 }}>Consulta médica com Dra. Mariana</span>
                    </div>
                    {sw===16 && <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"rgba(255,255,255,0.1)", borderRadius:7 }}>
                      <Check size={13} color={G[300]}/><span style={{ fontSize:12 }}>Encerramento e avaliação final do ciclo</span>
                    </div>}
                  </div>
                </div>
              )}
            <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:12, color:'#888' }}>Data real desta semana:</label>
                <input
                  type="date"
                  value={cl[sw]?.weekDate ? cl[sw].weekDate.split('T')[0] : ''}
                  onChange={e => setCl(prev => ({ ...prev, [sw]: { ...prev[sw], weekDate: e.target.value ? new Date(e.target.value).toISOString() : null }}))}
                  style={{ marginLeft:8, padding:'4px 8px', border:'1px solid #ddd', borderRadius:6, fontSize:13 }}
                />
                <span style={{ fontSize:11, color:'#aaa', marginLeft:8 }}>Deixe em branco para usar a data calculada</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>
                  Semana {sw}
                  {(sw===8||sw===16) && <Bg color={G[700]} bg={G[100]}>{sw===8?"Exames Hilab":"Exames Hilab + Consulta"}</Bg>}
                </span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, color:G[600] }}>Tirzepatida:</span>
                  <select value={cl[sw].dose||"2.5mg"} onChange={e=>setCl(pr=>({...pr,[sw]:{...pr[sw],dose:e.target.value}}))}
                    style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${G[300]}`, fontSize:11, fontFamily:"inherit", background:G[50], color:G[700], fontWeight:600, cursor:"pointer" }}>
                    {["2.5mg","5mg","7.5mg","10mg"].map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:"0 16px" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:G[700], padding:"5px 0", borderBottom:`1px solid ${G[200]}` }}>Enfermagem</div>
                  <CI checked={cl[sw].tirz} label={`Tirzepatida — ${cl[sw].dose}`} onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],tirz:!pr[sw].tirz}}))}/>
                  {ft.ter && <CI checked={cl[sw].ter} label={`Terapia injetável (${ft.ter})`} onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],ter:!pr[sw].ter}}))}/>}
                  <CI checked={cl[sw].peso} label="Pesagem" onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],peso:!pr[sw].peso}}))}/>
                  {ft.psi && <>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], padding:"5px 0", borderBottom:`1px solid ${G[200]}`, marginTop:4 }}>Psicóloga</div>
                    <CI checked={cl[sw].psi} label={`Sessão ${ft.psi}`} onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],psi:!pr[sw].psi}}))}/>
                  </>}
                  <div style={{ fontSize:11, fontWeight:600, color:G[700], padding:"5px 0", borderBottom:`1px solid ${G[200]}`, marginTop:4 }}>Bioimpedância</div>
                  <CI checked={cl[sw].bio} label="Avaliação semanal" onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],bio:!pr[sw].bio}}))}/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:G[700], padding:"5px 0", borderBottom:`1px solid ${G[200]}` }}>Pulsare (treino)</div>
                  {cl[sw].tr?.map((t,i) => <CI key={i} checked={t} label={`Treino ${i+1}`} onToggle={()=>{ setCl(pr => { const nt=[...pr[sw].tr]; nt[i]=!nt[i]; return {...pr,[sw]:{...pr[sw],tr:nt}}; }); }}/>)}
                  {cl[sw].nu && <>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], padding:"5px 0", borderBottom:`1px solid ${G[200]}`, marginTop:4 }}>Nutricionista</div>
                    <CI checked={cl[sw].nu.av} label="Avaliação nutricional" onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],nu:{...pr[sw].nu,av:!pr[sw].nu.av}}}))}/>
                    <CI checked={cl[sw].nu.pl} label="Plano alimentar enviado" onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],nu:{...pr[sw].nu,pl:!pr[sw].nu.pl}}}))}/>
                    <CI checked={cl[sw].nu.sc} label="Preencher scores" onToggle={()=>setCl(pr=>({...pr,[sw]:{...pr[sw],nu:{...pr[sw].nu,sc:!pr[sw].nu.sc}}}))}/>
                  </>}
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      )}

      {/* ABA SCORES */}
      {tab==="scores" && es && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>🧬 Saúde metabólica (8-24)</div>
            <div style={{ fontSize:11, color:G[600], marginBottom:8 }}>Pilar 1 — Composição corporal</div>
            <SI label="Gordura visceral" value={es.m.gv} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,gv:v}}))} opts={[{v:1,l:">10"},{v:2,l:"6-10"},{v:3,l:"1-5"}]}/>
            <SI label="Massa muscular"   value={es.m.mm} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,mm:v}}))} opts={[{v:1,l:"Baixa"},{v:2,l:"Ideal"},{v:3,l:"Alta"}]}/>
            <div style={{ fontSize:11, color:G[600], marginTop:8, marginBottom:4 }}>Pilar 2 — Inflamação</div>
            <SI label="PCR ultra"  value={es.m.pcr} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,pcr:v}}))} opts={[{v:1,l:">10"},{v:2,l:"5-10"},{v:3,l:"<5"}]}/>
            <SI label="Ferritina"  value={es.m.fer} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,fer:v}}))} opts={[{v:1,l:"Elevada"},{v:2,l:"Moderada"},{v:3,l:"Normal"}]}/>
            <div style={{ fontSize:11, color:G[600], marginTop:8, marginBottom:4 }}>Pilar 3 — Controle glicêmico</div>
            <SI label="Hb glicada" value={es.m.hb} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,hb:v}}))} opts={[{v:1,l:">6,4%"},{v:2,l:"5,5-6,4%"},{v:3,l:"<5,4%"}]}/>
            <SI label="Ác. úrico"  value={es.m.au} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,au:v}}))} opts={[{v:1,l:"Elevado"},{v:2,l:"Limítrofe"},{v:3,l:"Ideal"}]}/>
            <div style={{ fontSize:11, color:G[600], marginTop:8, marginBottom:4 }}>Pilar 4 — Cardiovascular</div>
            <SI label="Trig/HDL"    value={es.m.th} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,th:v}}))} opts={[{v:1,l:">4"},{v:2,l:"2-4"},{v:3,l:"<2"}]}/>
            <SI label="Circ. abd."  value={es.m.ca} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,ca:v}}))} opts={[{v:1,l:"Elevada"},{v:2,l:"Moderada"},{v:3,l:"Normal"}]}/>
            {(()=>{ const t=cM(es.m); const s=sM(t); return <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:s.bg, display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600, color:s.c, fontSize:12 }}>{s.e} {t}/24 — {s.l}</span><span style={{ fontSize:11, color:s.c }}>{s.d}</span></div>; })()}
          </div>

          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>🧠 Bem-estar (6-18)</div>
            <SI label="Gastrointestinal" value={es.b.gi}  onChange={v=>setEs(pr=>({...pr,b:{...pr.b,gi:v}}))}  opts={[{v:1,l:"Náusea"},{v:2,l:"Leve"},{v:3,l:"Normal"}]}/>
            <SI label="Libido"           value={es.b.lib} onChange={v=>setEs(pr=>({...pr,b:{...pr.b,lib:v}}))} opts={[{v:1,l:"Queda"},{v:2,l:"Redução"},{v:3,l:"Normal"}]}/>
            <SI label="Dores"            value={es.b.dor} onChange={v=>setEs(pr=>({...pr,b:{...pr.b,dor:v}}))} opts={[{v:1,l:"Limitam"},{v:2,l:"Leve"},{v:3,l:"Sem"}]}/>
            <SI label="Autoestima"       value={es.b.au}  onChange={v=>setEs(pr=>({...pr,b:{...pr.b,au:v}}))}  opts={[{v:1,l:"Frustração"},{v:2,l:"Oscila"},{v:3,l:"Confiante"}]}/>
            <SI label="Energia"          value={es.b.en}  onChange={v=>setEs(pr=>({...pr,b:{...pr.b,en:v}}))}  opts={[{v:1,l:"Baixa"},{v:2,l:"Oscila"},{v:3,l:"Alta"}]}/>
            <SI label="Sono"             value={es.b.so}  onChange={v=>setEs(pr=>({...pr,b:{...pr.b,so:v}}))}  opts={[{v:1,l:"Insônia"},{v:2,l:"Irregular"},{v:3,l:"Reparador"}]}/>
            {(()=>{ const t=cB(es.b); const s=sB(t); return <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:s.bg, display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600, color:s.c, fontSize:12 }}>{s.e} {t}/18 — {s.l}</span><span style={{ fontSize:11, color:s.c }}>{s.d}</span></div>; })()}
          </div>

          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>🧩 Blindagem mental (3-9)</div>
            <SI label="Consistência alimentar" value={es.n.co} onChange={v=>setEs(pr=>({...pr,n:{...pr.n,co:v}}))} opts={[{v:1,l:"Baixa"},{v:2,l:"70-90%"},{v:3,l:">90%"}]}/>
            <SI label="Gestão emocional"       value={es.n.ge} onChange={v=>setEs(pr=>({...pr,n:{...pr.n,ge:v}}))} opts={[{v:1,l:"Sem"},{v:2,l:"Identifica"},{v:3,l:"Controla"}]}/>
            <SI label="Movimento"              value={es.n.mv} onChange={v=>setEs(pr=>({...pr,n:{...pr.n,mv:v}}))} opts={[{v:1,l:"Sedentário"},{v:2,l:"Parcial"},{v:3,l:"Completo"}]}/>
            {(()=>{ const t=cN(es.n); const s=sN(t); return <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:s.bg, display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600, color:s.c, fontSize:12 }}>{s.e} {t}/9 — {s.l}</span><span style={{ fontSize:11, color:s.c }}>{s.d}</span></div>; })()}
          </div>
          <button onClick={()=>{ onSaveScores && onSaveScores(es); onAddScoreMonth && onAddScoreMonth({m:es.m,b:es.b,n:es.n}); alert("✅ Scores salvos e registrados na evolução mensal!"); }} style={{ width:"100%", padding:"11px", borderRadius:8, background:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>💾 Salvar scores (registra no histórico mensal)</button>
        </div>
      )}

      {/* ABA EVOLUÇÃO MENSAL */}
      {tab==="evolucao" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {(() => {
            const sh = p.scoreHistory || [];
            if (sh.length === 0) return (
              <div style={{ textAlign:"center", padding:40, color:"#ccc" }}>
                <Activity size={32} color="#ddd" style={{ margin:"0 auto 8px", display:"block" }}/>
                <div style={{ fontSize:13 }}>Nenhuma avaliação mensal registrada</div>
                <div style={{ fontSize:11, marginTop:4 }}>Salve os scores mensalmente na aba Scores</div>
              </div>
            );
            // Dados para gráficos
            const chartData = sh.map(s => ({
              mo:   s.month,
              met:  cM(s.m),
              bem:  cB(s.b),
              men:  cN(s.n),
              pctMet: +((cM(s.m)/24*100).toFixed(1)),
              pctBem: +((cB(s.b)/18*100).toFixed(1)),
              pctMen: +((cN(s.n)/9*100).toFixed(1)),
            }));
            const last   = sh[sh.length-1];
            const prev   = sh.length>1 ? sh[sh.length-2] : null;
            const dMet   = prev ? cM(last.m)-cM(prev.m) : 0;
            const dBem   = prev ? cB(last.b)-cB(prev.b) : 0;
            const dMen   = prev ? cN(last.n)-cN(prev.n) : 0;

            return (
              <>
                {/* Cards resumo último vs anterior */}
                <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:8 }}>
                  {[
                    { l:"Metabólico", cur:cM(last.m), max:24, fn:sM, d:dMet },
                    { l:"Bem-estar",  cur:cB(last.b), max:18, fn:sB, d:dBem },
                    { l:"Mental",     cur:cN(last.n), max:9,  fn:sN, d:dMen },
                  ].map((s,i) => {
                    const st = s.fn(s.cur);
                    return (
                      <div key={i} style={{ background:st.bg, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
                        <div style={{ fontSize:11, color:st.c, fontWeight:600, marginBottom:4 }}>{s.l}</div>
                        <div style={{ fontSize:28, fontWeight:700, color:st.c }}>{s.cur}</div>
                        <div style={{ fontSize:9, color:"#aaa" }}>de {s.max}</div>
                        <div style={{ fontSize:11, fontWeight:600, marginTop:4, color:s.d>0?S.grn:s.d<0?S.red:"#aaa" }}>
                          {s.d>0?"+":""}{s.d!==0?s.d:"—"} vs mês ant.
                        </div>
                        <Bg color={st.c} bg="rgba(255,255,255,0.6)">{st.e} {st.l}</Bg>
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico evolução normalizada (%) */}
                <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:2 }}>Evolução mensal — % do máximo</div>
                  <div style={{ fontSize:10, color:"#aaa", marginBottom:8 }}>Comparação normalizada entre os 3 pilares</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/>
                      <XAxis dataKey="mo" tick={{fontSize:10,fill:G[700]}}/>
                      <YAxis domain={[0,100]} unit="%" tick={{fontSize:9,fill:"#bbb"}}/>
                      <Tooltip contentStyle={{borderRadius:8,fontSize:11}} formatter={(v)=>`${v}%`}/>
                      <Legend iconType="circle" wrapperStyle={{fontSize:10}}/>
                      <Line type="monotone" dataKey="pctMet" name="Metabólico" stroke={G[500]}  strokeWidth={2.5} dot={{r:4,fill:G[500]}}  activeDot={{r:6}}/>
                      <Line type="monotone" dataKey="pctBem" name="Bem-estar"  stroke={S.grn}   strokeWidth={2.5} dot={{r:4,fill:S.grn}}   activeDot={{r:6}}/>
                      <Line type="monotone" dataKey="pctMen" name="Mental"     stroke={S.pur}   strokeWidth={2.5} dot={{r:4,fill:S.pur}}   activeDot={{r:6}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico scores absolutos */}
                <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:2 }}>Scores absolutos por mês</div>
                  <div style={{ fontSize:10, color:"#aaa", marginBottom:8 }}>Metabólico (0-24) · Bem-estar (0-18) · Mental (0-9)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/>
                      <XAxis dataKey="mo" tick={{fontSize:10,fill:G[700]}}/>
                      <YAxis tick={{fontSize:9,fill:"#bbb"}}/>
                      <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/>
                      <Legend iconType="circle" wrapperStyle={{fontSize:10}}/>
                      <Bar dataKey="met" name="Metabólico" fill={G[400]}  radius={[4,4,0,0]}/>
                      <Bar dataKey="bem" name="Bem-estar"  fill={S.grn}   radius={[4,4,0,0]}/>
                      <Bar dataKey="men" name="Mental"     fill={S.pur}   radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabela comparativa mensal */}
                <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Tabela comparativa mensal</div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:11, minWidth:520 }}>
                      <thead>
                        <tr>{["Mês","Metabólico","Δ","Status Met","Bem-estar","Δ","Mental","Δ","Status Geral"].map(h=>
                          <th key={h} style={{ textAlign:"left", padding:"6px 8px", borderBottom:`2px solid ${G[300]}`, color:G[700], fontWeight:600, fontSize:9, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                        )}</tr>
                      </thead>
                      <tbody>
                        {sh.map((s,i) => {
                          const met = cM(s.m), bem = cB(s.b), men = cN(s.n);
                          const pm_ = i>0 ? sh[i-1] : null;
                          const dM = pm_ ? met-cM(pm_.m) : null;
                          const dB = pm_ ? bem-cB(pm_.b) : null;
                          const dN = pm_ ? men-cN(pm_.n) : null;
                          const smSt = sM(met), sbSt = sB(bem), snSt = sN(men);
                          const overall = met>=17&&bem>13&&men>=8?"Elite":met>=13&&bem>=10&&men>=5?"Ok":"Atenção";
                          const ovColor = overall==="Elite"?S.pur:overall==="Ok"?S.grn:S.red;
                          const isLast = i===sh.length-1;
                          return (
                            <tr key={i} style={{ background:isLast?G[50]:"transparent" }}>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}`, fontWeight:isLast?700:400 }}>{s.month}</td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}` }}><span style={{ color:smSt.c, fontWeight:600 }}>{met}/24</span></td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}`, fontSize:10 }}>{dM===null?"—":<span style={{ color:dM>0?S.grn:dM<0?S.red:"#aaa", fontWeight:600 }}>{dM>0?"+":""}{dM}</span>}</td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}` }}><Bg color={smSt.c} bg={smSt.bg}>{smSt.e}{smSt.l}</Bg></td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}` }}><span style={{ color:sbSt.c, fontWeight:600 }}>{bem}/18</span></td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}`, fontSize:10 }}>{dB===null?"—":<span style={{ color:dB>0?S.grn:dB<0?S.red:"#aaa", fontWeight:600 }}>{dB>0?"+":""}{dB}</span>}</td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}` }}><span style={{ color:snSt.c, fontWeight:600 }}>{men}/9</span></td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}`, fontSize:10 }}>{dN===null?"—":<span style={{ color:dN>0?S.grn:dN<0?S.red:"#aaa", fontWeight:600 }}>{dN>0?"+":""}{dN}</span>}</td>
                              <td style={{ padding:"7px 8px", borderBottom:`1px solid ${G[100]}` }}><Bg color={ovColor} bg={ovColor+"22"}>{overall}</Bg></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ABA GRÁFICOS */}
      {tab==="graficos" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Radar metabólico</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={[{p:"Comp",v:pm.comp},{p:"Infl",v:pm.infl},{p:"Glic",v:pm.glic},{p:"Card",v:pm.card}]} outerRadius={65}>
                <PolarGrid stroke={G[200]}/><PolarAngleAxis dataKey="p" tick={{fontSize:10,fill:G[700]}}/><PolarRadiusAxis domain={[0,6]} tick={{fontSize:8,fill:"#ddd"}}/>
                <Radar dataKey="v" stroke={G[500]} fill={G[400]} fillOpacity={0.2} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Evolução dos 3 scores</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={hist}>
                <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="mo" tick={{fontSize:10,fill:G[700]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}}/>
                <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Legend iconType="circle" wrapperStyle={{fontSize:10}}/>
                <Line type="monotone" dataKey="met" name="Met"    stroke={G[500]} strokeWidth={2} dot={{r:2.5}}/>
                <Line type="monotone" dataKey="be"  name="Bem"    stroke={S.grn}  strokeWidth={2} dot={{r:2.5}}/>
                <Line type="monotone" dataKey="mn"  name="Mental" stroke={S.pur}  strokeWidth={2} dot={{r:2.5}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:8 }}>
            {[{l:"Metabólico",t:met,m:24,fn:sM},{l:"Bem-estar",t:be,m:18,fn:sB},{l:"Mental",t:mn,m:9,fn:sN}].map((s,i) => {
              const st=s.fn(s.t);
              return <div key={i} style={{ textAlign:"center", padding:14, background:st.bg, borderRadius:10 }}><div style={{ fontSize:28, fontWeight:700, color:st.c }}>{s.t}</div><div style={{ fontSize:9, color:"#aaa" }}>de {s.m}</div><div style={{ fontSize:11, fontWeight:600, color:st.c, marginTop:4 }}>{st.e} {st.l}</div></div>;
            })}
          </div>
        </div>
      )}

      {/* ABA RELATÓRIO */}
      {tab==="rel" && <RelTab p={p} mob={mob} plan={plan} met={met} be={be} mn={mn}/>}
    </div>
  );
}

/* ════════════════════════════════════════════
   ALERTAS
═══════════════════════════════════════════════ */
function Alerts({  ps, onSel }) {
  const SC = genSC(ps);
  const data = ps.map(p => {
    const sc=SC[p.id]; if(!sc) return null;
    const m=cM(sc.m), b=cB(sc.b), n=cN(sc.n);
    const al=[];
    if(m<=12)         al.push({t:"r",l:"Met crítico",       s:`${m}/24`,a:"Ataque+detox"});
    if(m>=13&&m<=16)  al.push({t:"y",l:"Met transição",       s:`${m}/24`,a:"Ajustes"});
    if(b<10)          al.push({t:"r",l:"Bem-estar crítico",  s:`${b}/18`,a:"Médica"});
    if(b>=10&&b<=13)  al.push({t:"y",l:"Bem-estar alerta",   s:`${b}/18`,a:"Nutri"});
    if(n<=4)          al.push({t:"r",l:"Recaída",            s:`${n}/9`, a:"Sessão individual"});
    if(n>=5&&n<=7)    al.push({t:"y",l:"Mental construção",  s:`${n}/9`, a:"Reforço"});
    return al.length ? {...p,al} : null;
  }).filter(Boolean);
  const reds = data.filter(p=>p.al.some(a=>a.t==="r"));
  const yels = data.filter(p=>p.al.every(a=>a.t==="y"));

  return (
    <div>
      {reds.length>0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:S.red }}/><span style={{ fontWeight:600, color:S.red, fontSize:13 }}>Vermelhos — Dra. Mariana</span>
          </div>
          {reds.map(p => (
            <div key={p.id} onClick={()=>onSel(p.id)} style={{ background:"#fff", borderRadius:8, borderLeft:`4px solid ${S.red}`, padding:"10px 12px", marginBottom:5, cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}><Av name={p.name} size={24}/><span style={{ fontWeight:600, fontSize:12 }}>{p.name}</span></div>
              {p.al.filter(a=>a.t==="r").map((a,i) => <div key={i} style={{ fontSize:11, padding:"3px 8px", background:S.redBg, borderRadius:5, marginBottom:2 }}>🔴 {a.l} ({a.s}) — <strong>{a.a}</strong></div>)}
            </div>
          ))}
        </div>
      )}
      {yels.length>0 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:S.yel }}/><span style={{ fontWeight:600, color:S.yel, fontSize:13 }}>Amarelos — equipe</span>
          </div>
          {yels.map(p => (
            <div key={p.id} onClick={()=>onSel(p.id)} style={{ background:"#fff", borderRadius:8, borderLeft:`4px solid ${S.yel}`, padding:"10px 12px", marginBottom:5, cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}><Av name={p.name} size={24}/><span style={{ fontWeight:600, fontSize:12 }}>{p.name}</span></div>
              {p.al.map((a,i) => <div key={i} style={{ fontSize:11, padding:"3px 8px", background:S.yelBg, borderRadius:5, marginBottom:2 }}>🟡 {a.l} ({a.s}) — {a.a}</div>)}
            </div>
          ))}
        </div>
      )}
      {data.length===0 && <div style={{ textAlign:"center", padding:30 }}><div style={{ fontSize:32 }}>🟢</div><div style={{ fontSize:14, fontWeight:600, color:S.grn, marginTop:6 }}>Todos bem!</div></div>}
    </div>
  );
}

/* ════════════════════════════════════════════
   EQUIPE
═══════════════════════════════════════════════ */
function TeamP({ team, setTeam, ta, setTa, activityLog }) {
  const [sel,        setSel]        = useState(null); // membro selecionado
  const [showNew,    setShowNew]    = useState(false);
  const [editMember, setEditMember] = useState(null);

  if (sel) {
    const m   = team.find(x=>x.id===sel);
    const log = activityLog.filter(a=>a.memberId===sel).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const roleInfo = ROLES.find(r=>r.id===m.role) || { label: m.role, color: G[600] };
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <div onClick={()=>setSel(null)} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}><ArrowLeft size={16} color={G[700]}/></div>
          <span style={{ fontSize:15, fontWeight:700, color:G[800], flex:1 }}>{m.name}</span>
          <button onClick={()=>setEditMember({...m})} style={{ fontSize:11, padding:"5px 12px", borderRadius:7, background:G[50], border:`1px solid ${G[300]}`, color:G[700], cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>✏️ Editar</button>
        </div>
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"16px", marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
          <Av name={m.name} size={56} src={ta[m.id]} onEdit={url=>setTa(pr=>({...pr,[m.id]:url}))}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15, color:G[800] }}>{m.name}</div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{m.specialty} • {m.email}</div>
            <div style={{ fontSize:11, color:"#aaa" }}>{m.phone}</div>
            <div style={{ marginTop:6 }}><Bg color={roleInfo.color} bg={roleInfo.color+"22"}>{roleInfo.label}</Bg></div>
          </div>
        </div>
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>Histórico de atividades ({log.length})</div>
          {log.length === 0 ? (
            <div style={{ textAlign:"center", padding:20, color:"#ccc", fontSize:12 }}>Nenhuma atividade registrada</div>
          ) : log.map((a,i) => {
            const icons = { pesagem:Weight, scores:Activity, cadastro:UserPlus, checklist:ClipboardCheck };
            const colors = { pesagem:S.blue, scores:S.pur, cadastro:S.grn, checklist:G[500] };
            const Icon = icons[a.action] || FileText;
            const col  = colors[a.action] || G[600];
            return (
              <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:i<log.length-1?`1px solid ${G[50]}`:"none" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:col+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={13} color={col}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:G[800] }}>{a.patientName}</div>
                  <div style={{ fontSize:11, color:"#aaa" }}>{a.detail}</div>
                </div>
                <div style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap" }}>{format(new Date(a.date),"dd/MM HH:mm")}</div>
              </div>
            );
          })}
        </div>
        {editMember && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:"#fff", width:"100%", maxWidth:420, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <span style={{ fontSize:16, fontWeight:700, color:G[800] }}>Editar membro</span>
                <div onClick={()=>setEditMember(null)} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}>✕</div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Função / Nível de acesso</label>
                <select value={editMember.role} onChange={e=>{ const ri=ROLES.find(r=>r.id===e.target.value); setEditMember(pr=>({...pr,role:e.target.value,label:ri?.label||e.target.value,color:ri?.color||pr.color})); }}
                  style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", background:"#fff" }}>
                  {ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              {[
                { label:"Nome completo",  key:"name",      type:"text"  },
                { label:"Especialidade",  key:"specialty", type:"text"  },
                { label:"E-mail",         key:"email",     type:"email" },
                { label:"Telefone",       key:"phone",     type:"tel"   },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
                  <input type={f.type} value={editMember[f.key]||""} onChange={e=>setEditMember(pr=>({...pr,[f.key]:e.target.value}))}
                    style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={()=>{ setTeam(prev=>prev.map(x=>x.id===editMember.id?editMember:x)); setEditMember(null); }}
                  style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Salvar</button>
                <button onClick={()=>setEditMember(null)}
                  style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <button onClick={()=>setShowNew(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}><Plus size={13}/>Novo membro</button>
      </div>
      {team.map(m => {
        const roleInfo = ROLES.find(r=>r.id===m.role) || { label: m.label||m.role, color: m.color };
        const mLog = activityLog.filter(a=>a.memberId===m.id);
        return (
          <div key={m.id} style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
            <Av name={m.name} size={46} src={ta[m.id]} onEdit={url=>setTa(pr=>({...pr,[m.id]:url}))}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name}</div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{m.specialty} • {m.email}</div>
              <div style={{ fontSize:10, color:"#bbb", marginTop:2 }}>{mLog.length} atividades registradas</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
              <Bg color={roleInfo.color} bg={roleInfo.color+"22"}>{roleInfo.label}</Bg>
              <div onClick={()=>setSel(m.id)} style={{ fontSize:10, color:G[600], cursor:"pointer", textDecoration:"underline" }}>Ver histórico</div>
            </div>
          </div>
        );
      })}
      {showNew && <NewMemberModal onClose={()=>setShowNew(false)} onSave={nm=>{ setTeam(prev=>[...prev,nm]); setShowNew(false); }}/>}
    </div>
  );
}

/* ════════════════════════════════════════════
   PORTAL DO PACIENTE (Read-only)
═══════════════════════════════════════════════ */
function Portal({  p, av, setAv }) {
  const SC = genSC([p]);
  const sc   = SC[p.id];
  const met  = cM(sc?.m); const be=cB(sc?.b); const mn=cN(sc?.n);
  const pm   = sc ? pM(sc.m) : {comp:0,infl:0,glic:0,card:0};
  const hist = HIST(p.id);
  const plan = PLANS.find(x=>x.id===p.plan);
  const pct  = Math.round(p.week/16*100);
  const tasks=[
    {d:true, l:"Tirzepatida aplicada"},
    {d:true, l:"Pesagem semanal"},
    {d:false,l:"Treino 2 — Pulsare"},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Header gradiente */}
      <div style={{ background:`linear-gradient(135deg,${G[700]},${G[900]})`, borderRadius:14, padding:"18px 16px", color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <Av name={p.name} size={44} src={av} onEdit={setAv}/>
          <div>
            <div style={{ fontSize:10, opacity:0.5 }}>Programa Ser Livre</div>
            <div style={{ fontSize:18, fontWeight:700 }}>Olá, {p.name.split(" ")[0]}!</div>
          </div>
        </div>
        <div style={{ fontSize:11, opacity:0.6 }}>Plano {plan?.name} • Semana {p.week}/16</div>
        <div style={{ height:6, background:"rgba(255,255,255,0.15)", borderRadius:3, marginTop:8, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:G[300], borderRadius:3 }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, opacity:0.4, marginTop:3 }}>
          <span>Início</span><span>{pct}%</span><span>Alta</span>
        </div>
      </div>

      {/* Métricas de peso */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Mt value={`${p.cw}kg`} label="Peso atual" icon={Weight}/>
        <Mt value={`-${(p.iw-p.cw).toFixed(1)}kg`} label="Já perdeu" icon={TrendingUp} color={S.grn}/>
      </div>

      {/* Scores */}
      <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>Seus scores</div>
      <SBar label="Saúde metabólica" total={met} max={24} fn={sM}/>
      <SBar label="Bem-estar"         total={be}  max={18} fn={sB}/>
      <SBar label="Blindagem mental"  total={mn}  max={9}  fn={sN}/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
        {[{l:"Met",t:met,m:24,fn:sM},{l:"Bem",t:be,m:18,fn:sB},{l:"Mental",t:mn,m:9,fn:sN}].map((s,i) => {
          const st=s.fn(s.t);
          return <div key={i} style={{ textAlign:"center", padding:12, background:st.bg, borderRadius:10 }}><div style={{ fontSize:24, fontWeight:700, color:st.c }}>{s.t}</div><div style={{ fontSize:8, color:"#aaa" }}>de {s.m}</div><div style={{ fontSize:10, fontWeight:600, color:st.c, marginTop:3 }}>{st.e} {st.l}</div></div>;
        })}
      </div>

      {/* Progresso da semana (read-only) */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:8 }}>Progresso da semana</div>
        {tasks.map((t,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:i<tasks.length-1?`1px solid ${G[50]}`:"none" }}>
            <div style={{ width:18, height:18, borderRadius:4, background:t.d?S.grnBg:G[100], border:`2px solid ${t.d?S.grn:G[300]}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {t.d && <Check size={10} color={S.grn}/>}
            </div>
            <span style={{ fontSize:12, color:t.d?"#bbb":G[900], textDecoration:t.d?"line-through":"none" }}>{t.l}</span>
          </div>
        ))}
        <div style={{ fontSize:9, color:"#ccc", marginTop:6, textAlign:"center" }}>Preenchido pela equipe — visualização apenas</div>
      </div>

      {/* Curva de peso */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Curva de peso</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={p.history.map((h,i)=>({s:`S${i+1}`,w:h.weight}))}>
            <defs><linearGradient id="gpt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.grn} stopOpacity={0.2}/><stop offset="100%" stopColor={S.grn} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis domain={["dataMin-2","dataMax+1"]} tick={{fontSize:9,fill:"#bbb"}}/>
            <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Area type="monotone" dataKey="w" stroke={S.grn} fill="url(#gpt)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Evolução scores */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Evolução dos scores</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={hist}>
            <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="mo" tick={{fontSize:9,fill:G[700]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}}/>
            <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Legend iconType="circle" wrapperStyle={{fontSize:9}}/>
            <Line type="monotone" dataKey="met" name="Met"    stroke={G[500]} strokeWidth={2} dot={{r:2}}/>
            <Line type="monotone" dataKey="be"  name="Bem"    stroke={S.grn}  strokeWidth={2} dot={{r:2}}/>
            <Line type="monotone" dataKey="mn"  name="Mental" stroke={S.pur}  strokeWidth={2} dot={{r:2}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Radar metabólico */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Radar metabólico</div>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={[{p:"Comp",v:pm.comp},{p:"Infl",v:pm.infl},{p:"Glic",v:pm.glic},{p:"Card",v:pm.card}]} outerRadius={60}>
            <PolarGrid stroke={G[200]}/><PolarAngleAxis dataKey="p" tick={{fontSize:10,fill:G[700]}}/><PolarRadiusAxis domain={[0,6]} tick={{fontSize:8,fill:"#ddd"}}/>
            <Radar dataKey="v" stroke={G[500]} fill={G[400]} fillOpacity={0.2} strokeWidth={2}/>
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <button onClick={()=>{ const el=document.getElementById(`portal-rel-${p.id}`); if(el) html2pdf().set({margin:10,filename:`meu-relatorio.pdf`,html2canvas:{scale:2},jsPDF:{format:"a4"}}).from(el).save(); }} style={{ width:"100%", padding:"10px", borderRadius:8, background:"transparent", border:`1px solid ${G[300]}`, color:G[700], fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
        <Download size={13}/>Baixar relatório PDF
      </button>
      <div style={{ textAlign:"center", fontSize:9, color:"#ccc", padding:"6px 0" }}>Instituto Dra. Mariana Wogel • Dados preenchidos pela equipe clínica</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL REGISTRO DE PESAGEM
═══════════════════════════════════════════════ */
function WeighInModal({ p, onClose, onSave, onLog }) {
  const [data,    setData]    = useState(format(new Date(), "yyyy-MM-dd"));
  const [peso,    setPeso]    = useState(p.cw || "");
  const [mm,      setMm]      = useState("");
  const [mg,      setMg]      = useState("");

  const tot = parseFloat(mm||0) + parseFloat(mg||0);
  const pctMM = tot > 0 ? (parseFloat(mm||0)/tot*100).toFixed(1) : "—";
  const pctMG = tot > 0 ? (parseFloat(mg||0)/tot*100).toFixed(1) : "—";

  const handleSave = () => {
    const w = parseFloat(peso);
    const mVal = parseFloat(mm||0);
    const gVal = parseFloat(mg||0);
    if (!w) return alert("Informe o peso.");
    const entry = {
      date: new Date(data).toISOString(),
      weight: w,
      massaMagra: mVal,
      massaGordura: gVal,
      m: p.history[p.history.length-1].m,
      b: p.history[p.history.length-1].b,
      n: p.history[p.history.length-1].n,
    };
    onSave(entry);
    onLog && onLog({ action:"pesagem", patientId:p.id, patientName:p.name, detail:`Peso: ${w}kg | MM: ${mVal}kg | MG: ${gVal}kg` });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:380, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontSize:15, fontWeight:700, color:G[800] }}>Registrar pesagem</span>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50], fontSize:13, color:"#aaa" }}>✕</div>
        </div>
        <div style={{ fontSize:11, color:"#aaa", marginBottom:14 }}>{p.name}</div>
        {[
          { label:"Data da pesagem", val:data, set:setData, type:"date" },
          { label:"Peso total (kg)", val:peso, set:setPeso, type:"number", ph:"84.2" },
          { label:"Massa magra (kg)", val:mm, set:setMm, type:"number", ph:"56.8" },
          { label:"Massa gorda (kg)", val:mg, set:setMg, type:"number", ph:"27.4" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph||""}
              style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
          </div>
        ))}
        {tot > 0 && (
          <div style={{ background:G[50], borderRadius:8, padding:"8px 12px", marginBottom:14, display:"flex", gap:16, fontSize:11 }}>
            <span style={{ color:S.blue }}>Magra: <strong>{pctMM}%</strong></span>
            <span style={{ color:S.yel }}>Gorda: <strong>{pctMG}%</strong></span>
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handleSave} style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Salvar pesagem</button>
          <button onClick={onClose} style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL NOVO MEMBRO DA EQUIPE
═══════════════════════════════════════════════ */
function NewMemberModal({ onClose, onSave }) {
  const [nome,      setNome]      = useState("");
  const [role,      setRole]      = useState("enferm");
  const [specialty, setSpecialty] = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");

  const handleSave = () => {
    if (!nome.trim()) return alert("Informe o nome.");
    const roleInfo = ROLES.find(r=>r.id===role);
    const nm = { id: Date.now(), name: nome.trim(), role, label: roleInfo?.label||role, specialty, email, phone, color: roleInfo?.color||G[600], createdAt: new Date().toISOString() };
    onSave(nm);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:420, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontSize:16, fontWeight:700, color:G[800] }}>Novo membro da equipe</span>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}>✕</div>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Função / Nível de acesso</label>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", background:"#fff" }}>
            {ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        {[
          { label:"Nome completo", val:nome, set:setNome, type:"text",  ph:"Ana Lima" },
          { label:"Especialidade", val:specialty, set:setSpecialty, type:"text", ph:"Nutricionista Clínica" },
          { label:"E-mail",        val:email, set:setEmail, type:"email", ph:"email@instituto.com" },
          { label:"Telefone",      val:phone, set:setPhone, type:"tel",   ph:"(24) 99999-0000" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
              style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button onClick={handleSave} style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Adicionar</button>
          <button onClick={onClose}   style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL NOVO PACIENTE
═══════════════════════════════════════════════ */
function NewLeadModal({ onClose, onSave }) {
  const [nome, setNome]   = useState("");
  const [nasc, setNasc]   = useState("");
  const [peso, setPeso]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan]   = useState("essential");

  const handleSave = () => {
    const w = parseFloat(peso);
    if (!nome.trim() || !nasc || !w) return alert("Preencha nome, nascimento e peso.");
    if (!email.trim()) return alert("Preencha o e-mail do paciente.");
    const np = {
      id: Date.now(), name: nome.trim(), plan, cycle: 1, week: 1,
      birthDate: nasc, phone, email, sd: new Date().toISOString(),
      iw: w, cw: w,
      history: [{ date: new Date().toISOString(), weight: w, m: MOCK_HIST_BASE[0].m, b: MOCK_HIST_BASE[0].b, n: MOCK_HIST_BASE[0].n }],
      nr: addDays(new Date(), 7).toISOString(), eng: 100
    };
    onSave(np);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:420, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontSize:16, fontWeight:700, color:G[800] }}>Novo paciente</span>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}>✕</div>
        </div>
        {[
          { label:"Nome completo", val:nome, set:setNome, type:"text", ph:"Ana Carolina Silva" },
          { label:"E-mail *", val:email, set:setEmail, type:"email", ph:"paciente@email.com" },
          { label:"Data de nascimento", val:nasc, set:setNasc, type:"date", ph:"" },
          { label:"Peso inicial (kg)", val:peso, set:setPeso, type:"number", ph:"80.5" },
          { label:"Telefone", val:phone, set:setPhone, type:"tel", ph:"(24) 99999-0000" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
            <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
              style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Plano</label>
          <select value={plan} onChange={e=>setPlan(e.target.value)}
            style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", background:"#fff" }}>
            {PLANS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handleSave} style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Salvar</button>
          <button onClick={onClose} style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════ */
function Login({ onLogin }) {
  const [mode, setMode] = useState("admin");
  const [forgotMode, setForgotMode] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpSent, setFpSent] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    setFpLoading(true);
    setFpError('');
    try {
      await apiForgotPassword(fpEmail);
      setFpSent(true);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${G[800]},${G[900]} 50%,#1a1a2e)`, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:360, background:"#fff", borderRadius:18, padding:"32px 24px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${G[400]},${G[600]})`, margin:"0 auto 10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Shield size={22} color="#fff"/>
          </div>
          <div style={{ fontSize:19, fontWeight:700, color:G[800] }}>Programa Ser Livre</div>
          <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>Instituto Dra. Mariana Wogel</div>
        </div>

        {forgotMode ? (
          <>
            {fpSent ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📧</div>
                <div style={{ fontSize:14, fontWeight:600, color:G[700], marginBottom:6 }}>E-mail enviado!</div>
                <div style={{ fontSize:12, color:"#888", marginBottom:20 }}>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</div>
                <button onClick={()=>{ setForgotMode(false); setFpSent(false); setFpEmail(''); }} style={{ width:"100%", padding:"10px", borderRadius:8, background:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>Voltar ao login</button>
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:4 }}>Esqueceu a senha?</div>
                <div style={{ fontSize:11, color:"#888", marginBottom:16 }}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</div>
                {fpError && <div style={{ background:"#FDEDEC", color:"#C0392B", padding:"8px 12px", borderRadius:7, marginBottom:12, fontSize:12 }}>{fpError}</div>}
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>E-mail</label>
                  <input type="email" value={fpEmail} onChange={e=>setFpEmail(e.target.value)} required placeholder="email@exemplo.com"
                    style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <button type="submit" disabled={fpLoading} style={{ width:"100%", padding:"11px", borderRadius:9, background:fpLoading?G[300]:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:fpLoading?"not-allowed":"pointer", fontFamily:"inherit" }}>
                  {fpLoading ? "Enviando..." : "Enviar link"}
                </button>
                <div style={{ textAlign:"center", marginTop:10 }}>
                  <span onClick={()=>setForgotMode(false)} style={{ fontSize:11, color:G[600], cursor:"pointer", textDecoration:"underline" }}>Voltar ao login</span>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            <div style={{ display:"flex", background:G[50], borderRadius:8, padding:2, marginBottom:18 }}>
              {[["admin","Equipe"],["paciente","Paciente"]].map(([k,l]) => (
                <div key={k} onClick={()=>setMode(k)} style={{ flex:1, textAlign:"center", padding:"8px 0", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:mode===k?600:400, background:mode===k?"#fff":"transparent", color:mode===k?G[700]:"#aaa", transition:"all 0.15s" }}>{l}</div>
              ))}
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>E-mail</label>
              <input style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} placeholder="email@exemplo.com"/>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Senha</label>
              <input type="password" style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} placeholder="••••••••"/>
            </div>
            <button onClick={()=>onLogin(mode)} style={{ width:"100%", padding:"11px", borderRadius:9, background:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Lock size={14}/>Entrar
            </button>
            <div style={{ textAlign:"center", marginTop:10 }}>
              <span onClick={()=>setForgotMode(true)} style={{ fontSize:11, color:G[600], cursor:"pointer", textDecoration:"underline" }}>Esqueceu a senha?</span>
            </div>
            <div style={{ textAlign:"center", marginTop:6, fontSize:10, color:"#ccc" }}>Demo: clique Entrar com qualquer dado</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   APP PRINCIPAL
═══════════════════════════════════════════════ */
export default function App() {
  const [ps,          setPs]          = useState(MOCK_PATIENTS);
  const [team,        setTeam]        = useState(MOCK_TEAM);
  const [activityLog, setActivityLog] = useState(MOCK_ACTIVITY);
  const [dbLoaded,    setDbLoaded]    = useState(false);
  const saveTimer = useRef({});

  // Carrega dados do servidor na inicialização
  useEffect(() => {
    Promise.all([
      fetch('/api/state/patients').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/state/team').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/state/activity').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pData, tData, aData]) => {
      if (Array.isArray(pData) && pData.length > 0) setPs(pData);
      if (Array.isArray(tData) && tData.length > 0) setTeam(tData);
      if (Array.isArray(aData) && aData.length > 0) setActivityLog(aData);
      setDbLoaded(true);
    }).catch(() => setDbLoaded(true));
  }, []);

  // Salva no servidor com debounce de 1.5s
  const saveToApi = useCallback((key, data) => {
    if (!dbLoaded) return;
    clearTimeout(saveTimer.current[key]);
    saveTimer.current[key] = setTimeout(() => {
      fetch(`/api/state/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {});
    }, 1500);
  }, [dbLoaded]);

  useEffect(() => { saveToApi('patients',  ps);          }, [ps,          saveToApi]);
  useEffect(() => { saveToApi('team',      team);        }, [team,        saveToApi]);
  useEffect(() => { saveToApi('activity',  activityLog); }, [activityLog, saveToApi]);

  const addLog = ({ action, patientId, patientName, detail }) => {
    const entry = { id: Date.now(), date: new Date().toISOString(), memberId:1, memberName:"Dra. Mariana Wogel", action, patientId, patientName, detail };
    setActivityLog(prev=>[entry,...prev]);
  };
  const SC = genSC(ps);

  const [lg,   setLg]   = useState(false);
  const [mode, setMode] = useState("admin");
  const [page, setPage] = useState("dash");
  const [sid,  setSid]  = useState(null);
  const [so,   setSo]   = useState(true);
  const [avs,  setAvs]  = useState({});
  const [ta,   setTa]   = useState({});
  const [nl,   setNl]   = useState(false);
  const mob = useMob();
  const sp  = ps.find(p => p.id===sid);
  const go  = id => { setSid(id); setPage("det"); };

  /* alertas críticos */
  const ac = ps.filter(p => { const sc=SC[p.id]; return sc&&(cM(sc.m)<=12||cB(sc.b)<10); }).length;

  const titles = { dash:"Dashboard", pat:"Pacientes", det:sp?.name||"", alert:"Central de alertas", team:"Equipe" };
  const nav = [
    {k:"dash",  l:"Dashboard", i:LayoutDashboard},
    {k:"pat",   l:"Pacientes", i:Users},
    {k:"alert", l:"Alertas",   i:AlertTriangle},
    {k:"team",  l:"Equipe",    i:Shield},
  ];

  /* ─── Carregando dados do servidor ─── */
  if (!dbLoaded) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${G[800]},${G[900]})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", color:"#fff" }}>
        <div style={{ width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg,${G[400]},${G[600]})`, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Shield size={22} color="#fff"/>
        </div>
        <div style={{ fontSize:16, fontWeight:600 }}>Programa Ser Livre</div>
        <div style={{ fontSize:12, opacity:0.5, marginTop:6 }}>Carregando dados...</div>
        <div style={{ width:32, height:3, background:G[400], borderRadius:2, margin:"14px auto 0", animation:"pulse 1s infinite" }}/>
      </div>
    </div>
  );

  /* ─── Não logado ─── */
  if (!lg) return <Login onLogin={m => { setLg(true); setMode(m); }}/>;

  /* ─── PORTAL DO PACIENTE ─── */
  if (mode==="paciente") {
    const pp = ps[0];
    return (
      <div style={{ fontFamily:"'Outfit','Inter',system-ui,sans-serif", background:W[50], minHeight:"100vh", color:"#2C2C2A" }}>
        <div style={{ maxWidth:480, margin:"0 auto", padding:"10px 12px 40px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Shield size={16} color={G[500]}/>
              <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Ser Livre</span>
            </div>
            <div onClick={()=>setLg(false)} style={{ cursor:"pointer", padding:4 }}>
              <LogOut size={14} color="#bbb"/>
            </div>
          </div>
          <Portal p={pp} av={avs[pp.id]} setAv={url=>setAvs(pr=>({...pr,[pp.id]:url}))}/>
        </div>
      </div>
    );
  }

  /* ─── CONTEÚDO ADMIN ─── */
  const content = (
    <>
      {page==="dash"  && <Dash  ps={ps} onSel={go} mob={mob}/>}
      {page==="pat"   && <PList ps={ps} onSel={go} mob={mob} onAdd={()=>setNl(true)} onDelete={id=>{ setPs(prev=>prev.filter(x=>x.id!==id)); apiDeletePatient(id).catch(err=>console.warn('API delete failed:', err.message)); }}/>}
      {page==="det"   && sp && <PDetail p={sp} onBack={()=>setPage("pat")} mob={mob} avs={avs} setAvs={setAvs}
        onSaveScores={scores=>{ setPs(prev=>prev.map(x=>x.id===sp.id?{...x,history:[...x.history.slice(0,-1),{...x.history[x.history.length-1],...scores}]}:x)); addLog({action:"scores",patientId:sp.id,patientName:sp.name,detail:"Scores metabólicos atualizados"}); }}
        onAddWeighIn={entry=>{ setPs(prev=>prev.map(x=>x.id===sp.id?{...x,cw:entry.weight,history:[...x.history,entry]}:x)); }}
        onAddScoreMonth={({m,b,n})=>{ const mo=format(new Date(),"MMM/yy"); setPs(prev=>prev.map(x=>x.id===sp.id?{...x,scoreHistory:[...(x.scoreHistory||[]),{id:Date.now(),date:new Date().toISOString(),month:mo,m,b,n}]}:x)); }}
        onChangePlan={newPlan=>{ setPs(prev=>prev.map(x=>x.id===sp.id?{...x,plan:newPlan}:x)); }}
        activityLog={activityLog}
        onLog={addLog}
        onDelete={id=>{ setPs(prev=>prev.filter(x=>x.id!==id)); apiDeletePatient(id).catch(err=>console.warn('API delete failed:', err.message)); setPage("pat"); }}
        onFinish={id=>{ apiFinishProgram(id).catch(err=>console.warn('API finish failed:', err.message)); addLog({action:"finalizado",patientId:sp.id,patientName:sp.name,detail:"Programa finalizado"}); }}
        onRestart={id=>{ setPs(prev=>prev.map(x=>x.id===id?{...x,cycle:(x.cycle||1)+1,week:1}:x)); apiRestartProgram(id).catch(err=>console.warn('API restart failed:', err.message)); addLog({action:"reinicio",patientId:sp.id,patientName:sp.name,detail:`Novo ciclo iniciado: C${(sp.cycle||1)+1}`}); }}
        onEdit={upd=>{ setPs(prev=>prev.map(x=>x.id===sp.id?{...x,...upd}:x)); }}/>}
      {page==="alert" && <Alerts ps={ps} onSel={go}/>}
      {page==="team"  && <TeamP team={team} setTeam={setTeam} ta={ta} setTa={setTa} activityLog={activityLog}/>}
    </>
  );

  /* ─── MOBILE ─── */
  if (mob) return (
    <div style={{ fontFamily:"'Outfit','Inter',system-ui,sans-serif", background:W[50], minHeight:"100vh", color:"#2C2C2A", paddingBottom:62 }}>
      {/* Top bar */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"#fff", borderBottom:`1px solid ${G[200]}`, padding:"10px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {page==="det" && <div onClick={()=>setPage("pat")} style={{ cursor:"pointer", padding:3 }}><ArrowLeft size={16} color={G[700]}/></div>}
          <span style={{ fontSize:15, fontWeight:700, color:G[800] }}>{titles[page]}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ position:"relative", cursor:"pointer" }} onClick={()=>setPage("alert")}>
            <Bell size={16} color={G[600]}/>
            {ac>0 && <div style={{ position:"absolute", top:-3, right:-3, width:12, height:12, borderRadius:"50%", background:S.red, color:"#fff", fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{ac}</div>}
          </div>
          <div onClick={()=>setLg(false)} style={{ cursor:"pointer" }}><LogOut size={14} color="#bbb"/></div>
        </div>
      </div>
      {/* Conteúdo */}
      <div style={{ padding:"10px 12px" }}>
        {nl && <NewLeadModal onClose={()=>setNl(false)} onSave={np=>{ setPs(prev=>[...prev,np]); addLog({action:"cadastro",patientId:np.id,patientName:np.name,detail:"Novo paciente cadastrado"}); apiCreatePatient({ name:np.name, email:np.email, phone:np.phone, plan:np.plan, birthDate:np.birthDate, initialWeight:np.iw }).catch(err=>console.warn('API patient creation failed (SMTP may not be configured):', err.message)); }}/>}
        {content}</div>
      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:`1px solid ${G[200]}`, display:"flex", justifyContent:"space-around", padding:"6px 0 max(6px,env(safe-area-inset-bottom))", zIndex:50 }}>
        {nav.map(n => {
          const a = page===n.k || (n.k==="pat"&&page==="det");
          return (
            <div key={n.k} onClick={()=>{ setPage(n.k); setSid(null); }} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1, cursor:"pointer", padding:"3px 10px", position:"relative" }}>
              <n.i size={18} color={a?G[600]:"#ccc"}/>
              <span style={{ fontSize:9, fontWeight:a?600:400, color:a?G[600]:"#ccc" }}>{n.l}</span>
              {n.k==="alert" && ac>0 && <div style={{ position:"absolute", top:-1, right:4, width:10, height:10, borderRadius:"50%", background:S.red }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ─── DESKTOP ─── */
  return (
    <div style={{ fontFamily:"'Outfit','Inter',system-ui,sans-serif", background:W[50], minHeight:"100vh", color:"#2C2C2A" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:`linear-gradient(180deg,${G[800]},${G[900]})`, color:"#fff", position:"fixed", top:0, left:0, height:"100vh", zIndex:100, display:"flex", flexDirection:"column", transform:so?"none":"translateX(-220px)", transition:"transform 0.3s" }}>
        <div style={{ padding:"16px 14px", borderBottom:`1px solid ${G[700]}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Shield size={18} color={G[300]}/>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>Ser Livre</div>
              <div style={{ fontSize:9, opacity:0.4 }}>Dra. Mariana Wogel</div>
            </div>
          </div>
        </div>
        <div style={{ flex:1, paddingTop:8 }}>
          {nav.map(n => {
            const a = page===n.k || (n.k==="pat"&&page==="det");
            return (
              <div key={n.k} onClick={()=>{ setPage(n.k); setSid(null); }} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 14px", cursor:"pointer", fontSize:12, fontWeight:a?600:400, background:a?"rgba(255,255,255,0.1)":"transparent", borderLeft:a?`3px solid ${G[300]}`:"3px solid transparent", color:a?"#fff":"rgba(255,255,255,0.55)", transition:"all 0.15s" }}>
                <n.i size={15}/><span>{n.l}</span>
                {n.k==="alert" && ac>0 && <span style={{ marginLeft:"auto", background:S.red, color:"#fff", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:600 }}>{ac}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${G[700]}`, display:"flex", alignItems:"center", gap:7 }}>
          <Av name="Mariana Wogel" size={28} src={ta[1]}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:500 }}>Dra. Mariana</div>
            <div style={{ fontSize:9, opacity:0.3 }}>Admin</div>
          </div>
          <LogOut size={12} style={{ cursor:"pointer", opacity:0.3 }} onClick={()=>setLg(false)}/>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft:so?220:0, transition:"margin-left 0.3s", padding:"0 18px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${G[200]}`, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Menu size={16} color={G[700]} style={{ cursor:"pointer" }} onClick={()=>setSo(!so)}/>
            <h1 style={{ fontSize:17, fontWeight:700, color:G[800], margin:0 }}>{titles[page]}</h1>
          </div>
          <div style={{ position:"relative", cursor:"pointer" }} onClick={()=>setPage("alert")}>
            <Bell size={16} color={G[600]}/>
            {ac>0 && <div style={{ position:"absolute", top:-3, right:-3, width:12, height:12, borderRadius:"50%", background:S.red, color:"#fff", fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{ac}</div>}
          </div>
        </div>
        
        {nl && <NewLeadModal onClose={()=>setNl(false)} onSave={np=>{ setPs(prev=>[...prev,np]); addLog({action:"cadastro",patientId:np.id,patientName:np.name,detail:"Novo paciente cadastrado"}); apiCreatePatient({ name:np.name, email:np.email, phone:np.phone, plan:np.plan, birthDate:np.birthDate, initialWeight:np.iw }).catch(err=>console.warn('API patient creation failed (SMTP may not be configured):', err.message)); }}/>}
        {content}
      </div>
    </div>
  );
}
