import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Trophy, CalendarDays, Weight, Home, Heart, Brain, RefreshCw
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
const fmt   = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
const addD  = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };

/* ════════════════════════════════════════════
   DADOS MOCK — PACIENTES
═══════════════════════════════════════════════ */
const PAT = [
  { id:1, name:"Ana Carolina Silva",  plan:"platinum_plus",  cycle:1, week:6,  age:34, phone:"(24) 99912-3456", sd:"01/11/2025", iw:89.5,  cw:84.2, ww:[89.5,88.8,87.9,87.1,85.8,84.2], nr:addD(TODAY,2),  eng:92 },
  { id:2, name:"Beatriz Oliveira",    plan:"gold",           cycle:1, week:12, age:41, phone:"(24) 99834-5678", sd:"15/09/2025", iw:95.0,  cw:86.8, ww:[95,94.1,93,91.8,90.5,89.8,89,88.3,87.9,87.5,87.1,86.8], nr:addD(TODAY,5),  eng:88 },
  { id:3, name:"Camila Ferreira",     plan:"essential",      cycle:2, week:3,  age:29, phone:"(24) 99756-7890", sd:"01/06/2025", iw:78.3,  cw:71.1, ww:[78.3,76.5,74.2], nr:addD(TODAY,0),  eng:95 },
  { id:4, name:"Daniela Costa",       plan:"platinum",       cycle:1, week:9,  age:37, phone:"(24) 99678-1234", sd:"01/10/2025", iw:102.0, cw:93.5, ww:[102,100.8,99.5,98.2,97,96.1,95.3,94.5,93.5], nr:addD(TODAY,1),  eng:78 },
  { id:5, name:"Eduarda Mendes",      plan:"gold_plus",      cycle:1, week:4,  age:45, phone:"(24) 99590-2345", sd:"20/11/2025", iw:88.0,  cw:85.6, ww:[88,87.2,86.5,85.6], nr:addD(TODAY,8),  eng:65 },
  { id:6, name:"Fernanda Lima",       plan:"essential_plus", cycle:1, week:15, age:33, phone:"(24) 99412-3456", sd:"10/08/2025", iw:74.5,  cw:68.9, ww:[74.5,73.8,73.2,72.5,72,71.4,71,70.6,70.2,69.8,69.5,69.3,69.1,68.9,68.9], nr:addD(TODAY,-1), eng:97 },
  { id:7, name:"Gabriela Rocha",      plan:"platinum_plus",  cycle:1, week:10, age:38, phone:"(24) 99333-1111", sd:"10/10/2025", iw:91.2,  cw:83.4, ww:[91.2,90.1,89,87.8,86.9,86,85.3,84.5,83.9,83.4], nr:addD(TODAY,3),  eng:91 },
  { id:8, name:"Helena Martins",      plan:"gold",           cycle:1, week:7,  age:52, phone:"(24) 99222-2222", sd:"05/11/2025", iw:98.7,  cw:93.1, ww:[98.7,97.8,97,96.2,95.3,94.2,93.1], nr:addD(TODAY,4),  eng:72 },
];

/* ════════════════════════════════════════════
   DADOS MOCK — SCORES
═══════════════════════════════════════════════ */
const SC = {
  1:{ m:{gv:2,mm:2,pcr:3,fer:2,hb:2,au:3,th:2,ca:2}, b:{gi:2,lib:2,dor:3,au:2,en:2,so:3}, n:{co:2,ge:2,mv:3} },
  2:{ m:{gv:3,mm:3,pcr:2,fer:3,hb:3,au:2,th:3,ca:2}, b:{gi:3,lib:2,dor:2,au:3,en:3,so:2}, n:{co:3,ge:2,mv:3} },
  3:{ m:{gv:1,mm:1,pcr:1,fer:2,hb:1,au:2,th:1,ca:1}, b:{gi:1,lib:1,dor:2,au:1,en:1,so:2}, n:{co:1,ge:1,mv:2} },
  4:{ m:{gv:2,mm:3,pcr:2,fer:2,hb:2,au:2,th:2,ca:2}, b:{gi:2,lib:3,dor:2,au:2,en:3,so:2}, n:{co:2,ge:2,mv:2} },
  5:{ m:{gv:3,mm:2,pcr:3,fer:3,hb:2,au:3,th:2,ca:3}, b:{gi:3,lib:3,dor:3,au:2,en:2,so:3}, n:{co:2,ge:3,mv:2} },
  6:{ m:{gv:2,mm:2,pcr:2,fer:1,hb:3,au:2,th:3,ca:2}, b:{gi:2,lib:2,dor:1,au:2,en:2,so:2}, n:{co:2,ge:1,mv:2} },
  7:{ m:{gv:3,mm:3,pcr:3,fer:2,hb:3,au:3,th:3,ca:3}, b:{gi:3,lib:3,dor:3,au:3,en:3,so:3}, n:{co:3,ge:3,mv:3} },
  8:{ m:{gv:2,mm:2,pcr:1,fer:2,hb:2,au:1,th:2,ca:1}, b:{gi:1,lib:2,dor:1,au:2,en:2,so:1}, n:{co:2,ge:1,mv:2} },
};

const TEAM = [
  { id:1, name:"Dra. Mariana Wogel", role:"Médica",        color:G[600] },
  { id:2, name:"Juliana Santos",     role:"Enfermagem",     color:S.grn  },
  { id:3, name:"Patricia Almeida",   role:"Nutricionista",  color:S.blue },
  { id:4, name:"Renata Barbosa",     role:"Psicóloga",      color:S.pur  },
  { id:5, name:"Carlos Silva",       role:"Treinador",      color:"#E67E22" },
];

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
const ini = n => n.split(" ").filter((_,i,a) => i===0||i===a.length-1).map(w=>w[0]).join("").toUpperCase();

const HIST = id => [1,2,3,4].map((m,i) => ({
  mo:`Mês ${m}`,
  met: Math.min(24, Math.max(8,  10 + id%5*2 + i*2)),
  be:  Math.min(18, Math.max(6,   8 + id%4*2 + i*2)),
  mn:  Math.min(9,  Math.max(3,   4 + id%2   + i  )),
}));

const genCL = (pid, tier) => {
  const p = PAT.find(x => x.id===pid);
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
      nu:   i%4===0 ? {av:d, pl:d, sc:d} : null,
      dose: d||pt ? `${2.5+Math.floor(i/4)*2.5}mg` : "",
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
function Dash({ ps, onSel, mob }) {
  const [df, setDf] = useState("all");

  const tl   = ps.reduce((a,p) => a+(p.iw-p.cw), 0);
  const ae   = Math.round(ps.reduce((a,p) => a+p.eng, 0)/ps.length);
  const cr   = ps.filter(p => { const sc=SC[p.id]; return sc&&(cM(sc.m)<=12||cB(sc.b)<10); });
  const el   = ps.filter(p => { const sc=SC[p.id]; return sc&&cM(sc.m)>=21; });
  const rTod = ps.filter(p => p.nr && fmt(p.nr)===fmt(TODAY));
  const rWk  = ps.filter(p => { if(!p.nr)return false; const d=p.nr.getTime(); return d>=TODAY.getTime()&&d<=addD(TODAY,7).getTime(); }).sort((a,b)=>a.nr-b.nr);
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
    for(let i=1;i<=16;i++){let s=0,n=0; ps.forEach(p=>{if(p.ww[i-1]!==undefined){s+=p.iw-p.ww[i-1];n++;}}); w.push({s:`S${i}`,v:n?+(s/n).toFixed(1):0});}
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
        {[["all","Todos"],["week","7d"],["month","30d"],["quarter","90d"]].map(([k,l]) => (
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

      {/* Calendário + Conquistas */}
      <div style={{ display:"grid", gridTemplateColumns:gc2, gap:12 }}>
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Retornos próximos 7 dias</span>
            <CalendarDays size={15} color={G[400]}/>
          </div>
          {rWk.length===0 ? <div style={{ fontSize:12, color:"#ccc", padding:8, textAlign:"center" }}>Nenhum</div>
            : rWk.map(p => {
              const isT=fmt(p.nr)===fmt(TODAY); const past=p.nr<TODAY;
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
function PList({ ps, onSel, mob }) {
  const [q,  setQ]  = useState("");
  const [fp, setFp] = useState("all");
  const f = ps.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) && (fp==="all"||p.plan===fp));

  return (
    <div>
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
            <div key={p.id} onClick={()=>onSel(p.id)} style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"10px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <Av name={p.name} size={mob?36:40}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                <div style={{ fontSize:10, color:"#aaa" }}>{PLANS.find(x=>x.id===p.plan)?.name} • S{p.week}/16 • {p.age}a</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <Bg color={ms.c} bg={ms.bg}>{ms.e}{ms.l}</Bg>
                <div style={{ fontSize:11, color:S.grn, fontWeight:600, marginTop:2 }}>-{(p.iw-p.cw).toFixed(1)}kg</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   DETALHE DO PACIENTE (5 abas)
═══════════════════════════════════════════════ */
function PDetail({ p, onBack, mob, avs, setAvs }) {
  const [tab, setTab]   = useState("ficha");
  const plan = PLANS.find(x=>x.id===p.plan);
  const tier = plan?.tier || 1;
  const ft   = TIER[tier];
  const sc   = SC[p.id];
  const met  = cM(sc?.m); const be = cB(sc?.b); const mn = cN(sc?.n);
  const pm   = sc ? pM(sc.m) : {comp:0,infl:0,glic:0,card:0};
  const hist = HIST(p.id);
  const [cl, setCl]   = useState(() => genCL(p.id, tier));
  const [es, setEs]   = useState(sc ? JSON.parse(JSON.stringify(sc)) : null);
  const [sw, setSw]   = useState(p.week);

  const tabs = [
    {k:"ficha",   l:"Ficha",     i:User},
    {k:"jornada", l:"Jornada",   i:ClipboardCheck},
    {k:"scores",  l:"Scores",    i:Activity},
    {k:"graficos",l:"Gráficos",  i:BarChart3},
    {k:"rel",     l:"Relatório", i:FileText},
  ];

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <div onClick={onBack} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}><ArrowLeft size={16} color={G[700]}/></div>
        <Av name={p.name} size={40} src={avs[p.id]} onEdit={url=>setAvs(prev=>({...prev,[p.id]:url}))}/>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:mob?15:17, fontWeight:700, color:G[800], overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
          <div style={{ fontSize:11, color:"#aaa" }}>{plan?.name} • {p.age}a • C{p.cycle} • S{p.week}/16</div>
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
            <div style={{ fontWeight:600, color:G[800], marginBottom:8 }}>Dados do paciente</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" }}>
              <div><span style={{ color:"#aaa" }}>Telefone: </span>{p.phone}</div>
              <div><span style={{ color:"#aaa" }}>Plano: </span>{plan?.name}</div>
              <div><span style={{ color:"#aaa" }}>Início: </span>{p.sd}</div>
              <div><span style={{ color:"#aaa" }}>Ciclo: </span>{p.cycle}</div>
            </div>
          </div>
          <div style={{ display:"grid", gap:6 }}>
            <SBar label="Saúde metabólica" total={met} max={24} fn={sM}/>
            <SBar label="Bem-estar"         total={be}  max={18} fn={sB}/>
            <SBar label="Blindagem mental"  total={mn}  max={9}  fn={sN}/>
          </div>
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Curva de peso</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={p.ww.map((w,i)=>({s:`S${i+1}`,w}))}>
                <defs><linearGradient id="gpp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={G[500]} stopOpacity={0.25}/><stop offset="100%" stopColor={G[500]} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis domain={["dataMin-2","dataMax+1"]} tick={{fontSize:9,fill:"#bbb"}}/>
                <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Area type="monotone" dataKey="w" stroke={G[500]} fill="url(#gpp)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
            <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Semana {sw} {(sw===8||sw===16) && <Bg color={G[700]} bg={G[100]}>Exames{sw===16?" + Consulta":""}</Bg>}</span>
                {cl[sw].dose && <span style={{ fontSize:11, color:G[600] }}>Dose: {cl[sw].dose}</span>}
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
                    <CI checked={cl[sw].nu.av} label={ft.nf?"Avaliação completa":"Controle adesão"} onToggle={()=>{}}/>
                    {ft.nf && <CI checked={cl[sw].nu.pl} label="Plano alimentar" onToggle={()=>{}}/>}
                    <CI checked={cl[sw].nu.sc} label="Preencher scores" onToggle={()=>{}}/>
                  </>}
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
          <button onClick={()=>alert("Scores salvos com sucesso!")} style={{ width:"100%", padding:"11px", borderRadius:8, background:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>Salvar scores</button>
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
      {tab==="rel" && (
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:mob?"12px":"18px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:6 }}>
            <span style={{ fontSize:14, fontWeight:600, color:G[800] }}>Relatório</span>
            <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}><Download size={13}/>PDF</button>
          </div>
          <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:mob?10:16 }}>
            <div style={{ textAlign:"center", paddingBottom:12, borderBottom:`2px solid ${G[300]}`, marginBottom:14 }}>
              <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>Relatório de Acompanhamento</div>
              <div style={{ fontSize:11, color:G[600] }}>Programa Ser Livre — Instituto Dra. Mariana Wogel</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:6, marginBottom:14, fontSize:12 }}>
              <div><strong>Paciente:</strong> {p.name}</div>
              <div><strong>Plano:</strong> {plan?.name}</div>
              <div><strong>Ciclo:</strong> {p.cycle} — S{p.week}/16</div>
              <div><strong>Data:</strong> {fmt(TODAY)}/2026</div>
            </div>
            {[{l:"Saúde metabólica",t:met,m:24,fn:sM},{l:"Bem-estar",t:be,m:18,fn:sB},{l:"Mental",t:mn,m:9,fn:sN}].map((s,i) => {
              const st=s.fn(s.t);
              return <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${G[100]}`, flexWrap:"wrap", gap:3 }}><span style={{ fontSize:12 }}>{s.l}</span><Bg color={st.c} bg={st.bg}>{st.e} {s.t}/{s.m} — {st.l}</Bg></div>;
            })}
            <div style={{ marginTop:14, fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Plano de ação</div>
            {met<=12 && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🔴 <strong>Metabólico crítico</strong> — Protocolo de ataque + detox</div>}
            {be<10   && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🔴 <strong>Bem-estar crítico</strong> — Intervenção médica</div>}
            {met>=13 && met<=16 && <div style={{ padding:"6px 10px", background:S.yelBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🟡 <strong>Transição metabólica</strong> — Ajustes terapêuticos</div>}
            {met>=17 && <div style={{ padding:"6px 10px", background:S.grnBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🟢 <strong>Saudável</strong> — Manutenção + evolução</div>}
            {mn<=4   && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11 }}>🔴 <strong>Risco recaída</strong> — Sessão individual psicóloga</div>}
            <div style={{ marginTop:16, borderTop:`1px solid ${G[200]}`, paddingTop:10, textAlign:"center", fontSize:10, color:"#ccc" }}>
              Dra. Mariana Wogel — Nutróloga<br/>Praça São Sebastião 119 — Três Rios, RJ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   ALERTAS
═══════════════════════════════════════════════ */
function Alerts({ ps, onSel }) {
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
function TeamP({ ta, setTa }) {
  return (
    <div>
      {TEAM.map(m => (
        <div key={m.id} style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
          <Av name={m.name} size={46} src={ta[m.id]} onEdit={url=>setTa(pr=>({...pr,[m.id]:url}))}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name}</div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>Instituto Dra. Mariana Wogel</div>
          </div>
          <Bg color={m.color} bg={m.color+"22"}>{m.role}</Bg>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   PORTAL DO PACIENTE (Read-only)
═══════════════════════════════════════════════ */
function Portal({ p, av, setAv }) {
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
          <AreaChart data={p.ww.map((w,i)=>({s:`S${i+1}`,w}))}>
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

      <button style={{ width:"100%", padding:"10px", borderRadius:8, background:"transparent", border:`1px solid ${G[300]}`, color:G[700], fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
        <Download size={13}/>Baixar relatório PDF
      </button>
      <div style={{ textAlign:"center", fontSize:9, color:"#ccc", padding:"6px 0" }}>Instituto Dra. Mariana Wogel • Dados preenchidos pela equipe clínica</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════ */
function Login({ onLogin }) {
  const [mode, setMode] = useState("admin");
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
        <div style={{ textAlign:"center", marginTop:10, fontSize:10, color:"#ccc" }}>Demo: clique Entrar com qualquer dado</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   APP PRINCIPAL
═══════════════════════════════════════════════ */
export default function App() {
  const [lg,   setLg]   = useState(false);
  const [mode, setMode] = useState("admin");
  const [page, setPage] = useState("dash");
  const [sid,  setSid]  = useState(null);
  const [so,   setSo]   = useState(true);
  const [avs,  setAvs]  = useState({});
  const [ta,   setTa]   = useState({});
  const mob = useMob();
  const sp  = PAT.find(p => p.id===sid);
  const go  = id => { setSid(id); setPage("det"); };

  /* alertas críticos */
  const ac = PAT.filter(p => { const sc=SC[p.id]; return sc&&(cM(sc.m)<=12||cB(sc.b)<10); }).length;

  const titles = { dash:"Dashboard", pat:"Pacientes", det:sp?.name||"", alert:"Central de alertas", team:"Equipe" };
  const nav = [
    {k:"dash",  l:"Dashboard", i:LayoutDashboard},
    {k:"pat",   l:"Pacientes", i:Users},
    {k:"alert", l:"Alertas",   i:AlertTriangle},
    {k:"team",  l:"Equipe",    i:Shield},
  ];

  /* ─── Não logado ─── */
  if (!lg) return <Login onLogin={m => { setLg(true); setMode(m); }}/>;

  /* ─── PORTAL DO PACIENTE ─── */
  if (mode==="paciente") {
    const pp = PAT[0];
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
      {page==="dash"  && <Dash  ps={PAT} onSel={go} mob={mob}/>}
      {page==="pat"   && <PList ps={PAT} onSel={go} mob={mob}/>}
      {page==="det"   && sp && <PDetail p={sp} onBack={()=>setPage("pat")} mob={mob} avs={avs} setAvs={setAvs}/>}
      {page==="alert" && <Alerts ps={PAT} onSel={go}/>}
      {page==="team"  && <TeamP ta={ta} setTa={setTa}/>}
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
      <div style={{ padding:"10px 12px" }}>{content}</div>
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
        {content}
      </div>
    </div>
  );
}
