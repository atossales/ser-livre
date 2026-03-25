import { useState, useEffect, useRef, useCallback } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, BarChart, Bar, Cell
} from "recharts";
import * as API from "./utils/api";

/* ═══ BRAND ═══ */
const G={50:"#FBF7EE",100:"#F5ECDA",200:"#EBDAB5",300:"#D4B978",400:"#C4A44E",500:"#A8872E",600:"#8B6D1E",700:"#6E5517",800:"#4E3D12",900:"#332810"};
const S={red:"#C0392B",redBg:"#FDEDEC",yel:"#F39C12",yelBg:"#FEF9E7",grn:"#27AE60",grnBg:"#EAFAF1",pur:"#8E44AD",purBg:"#F4ECF7",blu:"#2980B9",bluBg:"#EBF5FB"};
const PLANS={PLATINUM_PLUS:"Platinum Plus",GOLD_PLUS:"Gold Plus",PLATINUM:"Platinum",GOLD:"Gold",ESSENTIAL_PLUS:"Essential Plus",ESSENTIAL:"Essential"};
const ROLES={MEDICA:"Médica",ENFERMAGEM:"Enfermagem",NUTRICIONISTA:"Nutricionista",PSICOLOGA:"Psicóloga",TREINADOR:"Treinador",ADMIN:"Admin",PACIENTE:"Paciente"};
const STAFF_ROLES=["ADMIN","MEDICA","ENFERMAGEM","NUTRICIONISTA","PSICOLOGA","TREINADOR"];

/* ═══ SCORE HELPERS ═══ */
const stMet=t=>t>=21?{l:"Elite",c:S.pur,bg:S.purBg,e:"🟣"}:t>=17?{l:"Saudável",c:S.grn,bg:S.grnBg,e:"🟢"}:t>=13?{l:"Transição",c:S.yel,bg:S.yelBg,e:"🟡"}:{l:"Crítico",c:S.red,bg:S.redBg,e:"🔴"};
const stBem=t=>t>13?{l:"Excelente",c:S.grn,bg:S.grnBg,e:"🟢"}:t>=10?{l:"Alerta",c:S.yel,bg:S.yelBg,e:"🟡"}:{l:"Crítico",c:S.red,bg:S.redBg,e:"🔴"};
const stMen=t=>t>=8?{l:"Elite",c:S.pur,bg:S.purBg,e:"🟣"}:t>=5?{l:"Construção",c:S.yel,bg:S.yelBg,e:"🟡"}:{l:"Recaída",c:S.red,bg:S.redBg,e:"🔴"};
const ini=n=>(n||"").split(" ").filter((_,i,a)=>i===0||i===a.length-1).map(w=>w?w[0]:"").join("").toUpperCase();

/* ═══ RESPONSIVE ═══ */
const useMob=()=>{const[m,s]=useState(window.innerWidth<768);useEffect(()=>{const h=()=>s(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};

/* ═══════════════════ REUSABLE COMPONENTS ═══════════════════ */

function Av({name,size=40,src,onEdit}){
  const ref=useRef();
  return(<div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    {src?<img src={src} alt="" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover"}}/>:
    <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${G[400]},${G[600]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:size*.35,fontFamily:"inherit"}}>{ini(name)}</div>}
    {onEdit&&<><input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)onEdit(f);}}/><div onClick={()=>ref.current?.click()} style={{position:"absolute",bottom:-2,right:-2,width:Math.max(18,size*.38),height:Math.max(18,size*.38),borderRadius:"50%",background:G[500],border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><span style={{fontSize:Math.max(8,size*.16),color:"#fff"}}>📷</span></div></>}
  </div>);
}

const Bg=({children,color=G[700],bg=G[100]})=><span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,color,background:bg,whiteSpace:"nowrap"}}>{children}</span>;

function Mt({value,label,icon,color,sub}){
  return(<div style={{background:"#fff",borderRadius:12,border:`1px solid ${G[200]}`,padding:"12px 14px"}}>
    <div style={{fontSize:10,color:G[600],fontWeight:500,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:color||G[800],lineHeight:1.2,marginTop:2}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"#aaa",marginTop:1}}>{sub}</div>}
  </div>);
}

function SBar({label,total,max,fn}){
  const s=fn(total);const p=Math.round(total/max*100);
  return(<div style={{background:"#fff",borderRadius:12,border:`1px solid ${G[200]}`,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
    <div style={{width:38,height:38,borderRadius:"50%",background:s.c,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>{total}</div>
    <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:G[800]}}>{label}</div>
    <div style={{height:5,background:G[100],borderRadius:3,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:s.c,borderRadius:3,transition:"width .5s"}}/></div></div>
    <Bg color={s.c} bg={s.bg}>{s.e} {s.l}</Bg>
  </div>);
}

function CI({checked,label,onChange,disabled}){
  return(<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${G[50]}`}}>
    <div onClick={disabled?undefined:onChange} style={{width:20,height:20,borderRadius:5,border:checked?`2px solid ${S.grn}`:`2px solid ${G[300]}`,background:checked?S.grnBg:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:disabled?"default":"pointer",flexShrink:0,opacity:disabled?.6:1}}>{checked&&<span style={{color:S.grn,fontSize:12}}>✓</span>}</div>
    <span style={{fontSize:12,color:checked?"#bbb":G[900],textDecoration:checked?"line-through":"none"}}>{label}</span>
  </div>);
}

function ScoreBtn({value,selected,label,onClick}){
  return(<div onClick={onClick} style={{padding:"6px 12px",borderRadius:7,cursor:"pointer",fontSize:11,border:`1.5px solid ${selected?G[500]:G[200]}`,background:selected?G[100]:"#fff",color:selected?G[800]:"#888",fontWeight:selected?600:400,transition:"all .15s",textAlign:"center"}}><div>{value}pt{value>1?"s":""}</div><div style={{fontSize:9,color:"#aaa",marginTop:1}}>{label}</div></div>);
}

const Card=({children,style:sx})=><div style={{background:"#fff",borderRadius:12,border:`1px solid ${G[200]}`,padding:"14px 16px",...sx}}>{children}</div>;
const Title=({children})=><div style={{fontSize:14,fontWeight:600,color:G[800],marginBottom:10}}>{children}</div>;

/* ═══════════════════ LOGIN PAGE ═══════════════════ */
function LoginPage({onLogin}){
  const[email,setEmail]=useState("");const[pw,setPw]=useState("");const[err,setErr]=useState("");const[loading,setLoading]=useState(false);const[seeding,setSeeding]=useState(false);

  const doSeed=async()=>{setSeeding(true);try{const r=await API.seed();alert(r.data.message);}catch(e){alert("Erro: "+(e.response?.data?.error||e.message));}setSeeding(false);};
  const doLogin=async(e)=>{e.preventDefault();setLoading(true);setErr("");try{const r=await API.login(email,pw);localStorage.setItem("sl_token",r.data.token);localStorage.setItem("sl_user",JSON.stringify(r.data.user));onLogin(r.data.user);}catch(e){setErr(e.response?.data?.error||"Erro ao conectar");}setLoading(false);};

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G[800]},${G[900]} 50%,#1a1a2e)`,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:380,background:"#fff",borderRadius:20,padding:"36px 28px",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${G[400]},${G[600]})`,margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff"}}>🛡</div>
          <div style={{fontSize:22,fontWeight:700,color:G[800]}}>Programa Ser Livre</div>
          <div style={{fontSize:12,color:"#aaa",marginTop:3}}>Instituto Dra. Mariana Wogel</div>
        </div>
        <form onSubmit={doLogin}>
          <div style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:500,color:G[700],display:"block",marginBottom:4}}>E-mail</label>
            <input style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${G[300]}`,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required/></div>
          <div style={{marginBottom:20}}><label style={{fontSize:12,fontWeight:500,color:G[700],display:"block",marginBottom:4}}>Senha</label>
            <input style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${G[300]}`,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required/></div>
          {err&&<div style={{color:S.red,fontSize:12,marginBottom:12,padding:"8px 12px",background:S.redBg,borderRadius:8}}>{err}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,background:G[600],color:"#fff",fontSize:14,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit",opacity:loading?.6:1}}>{loading?"Entrando...":"Entrar"}</button>
        </form>
        <div style={{borderTop:`1px solid ${G[200]}`,marginTop:20,paddingTop:16,textAlign:"center"}}>
          <div style={{fontSize:11,color:"#aaa",marginBottom:8}}>Primeira vez? Crie os dados iniciais:</div>
          <button onClick={doSeed} disabled={seeding} style={{padding:"8px 16px",borderRadius:8,background:"transparent",border:`1px solid ${G[300]}`,color:G[700],fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{seeding?"Criando...":"Criar dados iniciais"}</button>
          <div style={{fontSize:10,color:"#ccc",marginTop:6}}>Depois: mariana@institutowogel.com / 123456</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ NEW PATIENT MODAL ═══════════════════ */
function NewPatientModal({onClose,onCreated,token}){
  const[f,setF]=useState({name:"",email:"",phone:"",plan:"ESSENTIAL",initialWeight:"",password:"123456"});
  const[loading,setLoading]=useState(false);const[err,setErr]=useState("");
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  const submit=async(e)=>{e.preventDefault();setLoading(true);setErr("");
    try{await API.createPatient({...f,initialWeight:parseFloat(f.initialWeight)});onCreated();onClose();}
    catch(e){setErr(e.response?.data?.error||"Erro ao cadastrar");}setLoading(false);};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,padding:"24px",width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontSize:18,fontWeight:700,color:G[800]}}>Novo paciente</span>
          <span onClick={onClose} style={{cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</span>
        </div>
        <form onSubmit={submit}>
          {[["name","Nome completo","text"],["email","E-mail","email"],["phone","Telefone","text"],["initialWeight","Peso inicial (kg)","number"]].map(([k,l,t])=>(
            <div key={k} style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:500,color:G[700],display:"block",marginBottom:4}}>{l}</label>
              <input style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${G[300]}`,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} type={t} value={f[k]} onChange={e=>set(k,e.target.value)} required/></div>
          ))}
          <div style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:500,color:G[700],display:"block",marginBottom:4}}>Plano</label>
            <select style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${G[300]}`,fontSize:13,fontFamily:"inherit",background:"#fff"}} value={f.plan} onChange={e=>set("plan",e.target.value)}>
              {Object.entries(PLANS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
          <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:500,color:G[700],display:"block",marginBottom:4}}>Senha inicial</label>
            <input style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${G[300]}`,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} value={f.password} onChange={e=>set("password",e.target.value)}/></div>
          {err&&<div style={{color:S.red,fontSize:12,marginBottom:12,padding:"8px",background:S.redBg,borderRadius:8}}>{err}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"12px",borderRadius:10,background:G[600],color:"#fff",fontSize:14,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit"}}>{loading?"Salvando...":"Cadastrar paciente"}</button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════ SCORE FORM ═══════════════════ */
function ScoreForm({cycleId,month,onSaved}){
  const[d,setD]=useState({gorduraVisceral:2,massaMuscular:2,pcrUltrassensivel:2,ferritina:2,hemoglobinaGlicada:2,acidoUrico:2,triglicerideosHdl:2,circAbdominal:2,gastrointestinal:2,libido:2,doresArticulares:2,autoestimaMental:2,energiaPerformance:2,sonoCefaleia:2,consistenciaAlimentar:2,gestaoEmocional:2,movimentoPresenca:2});
  const[saving,setSaving]=useState(false);
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const tMet=d.gorduraVisceral+d.massaMuscular+d.pcrUltrassensivel+d.ferritina+d.hemoglobinaGlicada+d.acidoUrico+d.triglicerideosHdl+d.circAbdominal;
  const tBem=d.gastrointestinal+d.libido+d.doresArticulares+d.autoestimaMental+d.energiaPerformance+d.sonoCefaleia;
  const tMen=d.consistenciaAlimentar+d.gestaoEmocional+d.movimentoPresenca;
  const sMet=stMet(tMet);const sBem=stBem(tBem);const sMen=stMen(tMen);

  const save=async()=>{setSaving(true);try{await API.saveScores({...d,cycleId,month});onSaved();}catch(e){alert("Erro: "+(e.response?.data?.error||e.message));}setSaving(false);};

  const Section=({title,items})=>(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:600,color:G[700],marginBottom:6}}>{title}</div>
      {items.map(it=>(
        <div key={it.k} style={{padding:"8px 0",borderBottom:`1px solid ${G[100]}`}}>
          <div style={{fontSize:12,fontWeight:600,color:G[800],marginBottom:4}}>{it.l}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{it.o.map(o=><ScoreBtn key={o.v} value={o.v} label={o.l} selected={d[it.k]===o.v} onClick={()=>set(it.k,o.v)}/>)}</div>
        </div>
      ))}
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Card><Title>🧬 Saúde metabólica (8-24 pts)</Title>
        <Section title="Composição corporal" items={[{k:"gorduraVisceral",l:"Gordura visceral",o:[{v:1,l:">10"},{v:2,l:"6-10"},{v:3,l:"1-5"}]},{k:"massaMuscular",l:"Massa muscular",o:[{v:1,l:"Baixa"},{v:2,l:"Ideal"},{v:3,l:"Alta"}]}]}/>
        <Section title="Inflamação sistêmica" items={[{k:"pcrUltrassensivel",l:"PCR ultra",o:[{v:1,l:">10"},{v:2,l:"5-10"},{v:3,l:"<5"}]},{k:"ferritina",l:"Ferritina",o:[{v:1,l:"Elevada"},{v:2,l:"Moderada"},{v:3,l:"Normal"}]}]}/>
        <Section title="Controle glicêmico" items={[{k:"hemoglobinaGlicada",l:"Hb glicada",o:[{v:1,l:">6,4%"},{v:2,l:"5,5-6,4%"},{v:3,l:"<5,4%"}]},{k:"acidoUrico",l:"Ácido úrico",o:[{v:1,l:"Elevado"},{v:2,l:"Limítrofe"},{v:3,l:"Ideal"}]}]}/>
        <Section title="Cardiovascular" items={[{k:"triglicerideosHdl",l:"Trig/HDL",o:[{v:1,l:">4"},{v:2,l:"2-4"},{v:3,l:"<2"}]},{k:"circAbdominal",l:"Circ. abdominal",o:[{v:1,l:"Elevada"},{v:2,l:"Moderada"},{v:3,l:"Normal"}]}]}/>
        <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:sMet.bg}}><span style={{fontWeight:600,color:sMet.c,fontSize:12}}>{sMet.e} {tMet}/24 — {sMet.l}</span></div>
      </Card>

      <Card><Title>🧠 Bem-estar (6-18 pts)</Title>
        {[{k:"gastrointestinal",l:"Gastrointestinal",o:[{v:1,l:"Náusea"},{v:2,l:"Leve"},{v:3,l:"Normal"}]},{k:"libido",l:"Libido",o:[{v:1,l:"Queda"},{v:2,l:"Redução"},{v:3,l:"Normal"}]},{k:"doresArticulares",l:"Dores",o:[{v:1,l:"Limitam"},{v:2,l:"Leve"},{v:3,l:"Sem"}]},{k:"autoestimaMental",l:"Autoestima",o:[{v:1,l:"Frustração"},{v:2,l:"Oscila"},{v:3,l:"Confiante"}]},{k:"energiaPerformance",l:"Energia",o:[{v:1,l:"Baixa"},{v:2,l:"Oscila"},{v:3,l:"Alta"}]},{k:"sonoCefaleia",l:"Sono",o:[{v:1,l:"Insônia"},{v:2,l:"Irregular"},{v:3,l:"Reparador"}]}].map(it=>(
          <div key={it.k} style={{padding:"8px 0",borderBottom:`1px solid ${G[100]}`}}><div style={{fontSize:12,fontWeight:600,color:G[800],marginBottom:4}}>{it.l}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{it.o.map(o=><ScoreBtn key={o.v} value={o.v} label={o.l} selected={d[it.k]===o.v} onClick={()=>set(it.k,o.v)}/>)}</div></div>
        ))}
        <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:sBem.bg}}><span style={{fontWeight:600,color:sBem.c,fontSize:12}}>{sBem.e} {tBem}/18 — {sBem.l}</span></div>
      </Card>

      <Card><Title>🧩 Mental (3-9 pts)</Title>
        {[{k:"consistenciaAlimentar",l:"Consistência alimentar",o:[{v:1,l:"Baixa"},{v:2,l:"70-90%"},{v:3,l:">90%"}]},{k:"gestaoEmocional",l:"Gestão emocional",o:[{v:1,l:"Sem"},{v:2,l:"Identifica"},{v:3,l:"Controla"}]},{k:"movimentoPresenca",l:"Movimento",o:[{v:1,l:"Sedentário"},{v:2,l:"Parcial"},{v:3,l:"Completo"}]}].map(it=>(
          <div key={it.k} style={{padding:"8px 0",borderBottom:`1px solid ${G[100]}`}}><div style={{fontSize:12,fontWeight:600,color:G[800],marginBottom:4}}>{it.l}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{it.o.map(o=><ScoreBtn key={o.v} value={o.v} label={o.l} selected={d[it.k]===o.v} onClick={()=>set(it.k,o.v)}/>)}</div></div>
        ))}
        <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:sMen.bg}}><span style={{fontWeight:600,color:sMen.c,fontSize:12}}>{sMen.e} {tMen}/9 — {sMen.l}</span></div>
      </Card>

      <button onClick={save} disabled={saving} style={{width:"100%",padding:"12px",borderRadius:10,background:G[600],color:"#fff",fontSize:14,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit"}}>{saving?"Salvando...":"Salvar scores do mês"}</button>
    </div>
  );
}

/* ═══════════════════ DASHBOARD ═══════════════════ */
function DashboardPage({user,onSelectPatient,mob}){
  const[data,setData]=useState(null);const[alerts,setAlerts]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{try{const[d,a]=await Promise.all([API.getDashboard(),API.getAlerts()]);setData(d.data);setAlerts(a.data);}catch(e){console.error(e);}setLoading(false);};

  if(loading)return<div style={{padding:40,textAlign:"center",color:G[600]}}>Carregando dashboard...</div>;
  if(!data)return<div style={{padding:40,textAlign:"center",color:S.red}}>Erro ao carregar dados</div>;

  const gc=mob?"1fr":"repeat(4,1fr)";const gc2=mob?"1fr":"1fr 1fr";
  const redAlerts=alerts.filter(a=>a.severity==="RED");
  const yelAlerts=alerts.filter(a=>a.severity==="YELLOW");

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:gc,gap:8}}>
        <Mt value={data.totalPatients} label="Pacientes ativos"/>
        <Mt value={`${data.totalWeightLost}kg`} label="Peso total perdido" color={S.grn}/>
        <Mt value={`${data.avgWeightLost}kg`} label="Média por paciente"/>
        <Mt value={data.redAlerts} label="Alertas vermelhos" color={data.redAlerts>0?S.red:S.grn}/>
      </div>

      {redAlerts.length>0&&(
        <Card style={{borderLeft:`4px solid ${S.red}`,background:S.redBg}}>
          <Title>🔴 Alertas vermelhos — atenção imediata</Title>
          {redAlerts.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,marginBottom:3,background:"rgba(255,255,255,.6)"}}>
              <Av name={a.patient?.user?.name||"?"} size={26}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500}}>{a.patient?.user?.name}</div><div style={{fontSize:10,color:S.red}}>{a.message}</div></div>
              <div style={{fontSize:10,color:S.red,fontWeight:600}}>{a.action?.split(".")[0]}</div>
            </div>
          ))}
        </Card>
      )}

      {yelAlerts.length>0&&(
        <Card style={{borderLeft:`4px solid ${S.yel}`}}>
          <Title>🟡 Alertas amarelos — equipe atenta</Title>
          {yelAlerts.slice(0,5).map(a=>(
            <div key={a.id} style={{fontSize:12,padding:"4px 0",borderBottom:`1px solid ${G[100]}`}}>
              <span style={{fontWeight:500}}>{a.patient?.user?.name}</span> — {a.message}
            </div>
          ))}
        </Card>
      )}

      <Card>
        <Title>Pacientes</Title>
        {data.patients?.length===0&&<div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:13}}>Nenhum paciente cadastrado ainda.</div>}
        {data.patients?.map(p=>(
          <div key={p.id} onClick={()=>onSelectPatient(p.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${G[100]}`,cursor:"pointer"}}>
            <Av name={p.name} size={36} src={p.avatarUrl}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
              <div style={{fontSize:11,color:"#aaa"}}>{PLANS[p.plan]||p.plan}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:700,color:S.grn}}>-{p.weightLost}kg</div>
              {p.latestScore&&<Bg color={stMet(p.latestScore.totalMetabolico).c} bg={stMet(p.latestScore.totalMetabolico).bg}>{stMet(p.latestScore.totalMetabolico).e} {p.latestScore.totalMetabolico}</Bg>}
            </div>
            <span style={{color:"#ddd",fontSize:14}}>›</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ═══════════════════ PATIENT DETAIL ═══════════════════ */
function PatientDetailPage({patientId,onBack,mob,user}){
  const[p,setP]=useState(null);const[tab,setTab]=useState("ficha");const[loading,setLoading]=useState(true);
  useEffect(()=>{load();},[patientId]);
  const load=async()=>{setLoading(true);try{const r=await API.getPatient(patientId);setP(r.data);}catch(e){console.error(e);}setLoading(false);};

  if(loading)return<div style={{padding:40,textAlign:"center",color:G[600]}}>Carregando...</div>;
  if(!p)return<div style={{padding:40,textAlign:"center",color:S.red}}>Paciente não encontrado</div>;

  const name=p.user?.name||"Paciente";
  const plan=PLANS[p.plan]||p.plan;
  const wLost=Math.round((p.initialWeight-p.currentWeight)*10)/10;
  const cycle=p.cycles?.[0];
  const scores=cycle?.scores||[];
  const latestScore=scores[scores.length-1];
  const tMet=latestScore?.totalMetabolico||0;
  const tBem=latestScore?.totalBemEstar||0;
  const tMen=latestScore?.totalMental||0;
  const isStaff=STAFF_ROLES.includes(user.role);

  const tabs=isStaff?[{k:"ficha",l:"Ficha"},{k:"scores",l:"Scores"},{k:"graficos",l:"Gráficos"}]:[{k:"ficha",l:"Meus dados"},{k:"graficos",l:"Evolução"}];

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div onClick={onBack} style={{cursor:"pointer",padding:4,borderRadius:6,background:G[50]}}><span style={{fontSize:16}}>←</span></div>
        <Av name={name} size={40} src={p.user?.avatarUrl} onEdit={isStaff?async(file)=>{try{await API.updateAvatar(p.userId,file);load();}catch(e){}}:undefined}/>
        <div style={{minWidth:0}}><div style={{fontSize:mob?15:17,fontWeight:700,color:G[800],overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
          <div style={{fontSize:11,color:"#aaa"}}>{plan} • Ciclo {cycle?.number||1} • Sem {cycle?.currentWeek||1}/16</div></div>
      </div>

      <div style={{display:"flex",borderBottom:`1px solid ${G[200]}`,marginBottom:14,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"7px 14px",fontSize:12,fontWeight:tab===t.k?600:400,color:tab===t.k?G[700]:"#aaa",borderBottom:tab===t.k?`2px solid ${G[500]}`:"2px solid transparent",background:"none",border:"none",borderBottomStyle:"solid",whiteSpace:"nowrap",fontFamily:"inherit",cursor:"pointer"}}>{t.l}</button>)}
      </div>

      {tab==="ficha"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:6}}>
            <Mt value={`${p.initialWeight}kg`} label="Peso inicial"/>
            <Mt value={`${p.currentWeight}kg`} label="Peso atual"/>
            <Mt value={`-${wLost}kg`} label="Evolução" color={S.grn}/>
            <Mt value={`${p.initialWeight>0?Math.round(wLost/p.initialWeight*100):0}%`} label="Perda total"/>
          </div>
          {latestScore&&<div style={{display:"grid",gap:6}}>
            <SBar label="Saúde metabólica" total={tMet} max={24} fn={stMet}/>
            <SBar label="Bem-estar" total={tBem} max={18} fn={stBem}/>
            <SBar label="Blindagem mental" total={tMen} max={9} fn={stMen}/>
          </div>}
          {!latestScore&&<Card><div style={{textAlign:"center",padding:16,color:"#aaa",fontSize:13}}>Nenhum score registrado ainda.{isStaff&&" Vá na aba Scores para preencher."}</div></Card>}
          {p.alerts?.length>0&&(
            <Card style={{borderLeft:`4px solid ${S.red}`}}>
              <Title>Alertas ativos</Title>
              {p.alerts.map(a=>(
                <div key={a.id} style={{fontSize:12,padding:"6px 8px",background:a.severity==="RED"?S.redBg:S.yelBg,borderRadius:6,marginBottom:3}}>
                  {a.severity==="RED"?"🔴":"🟡"} {a.message} — <strong>{a.action?.split(".")[0]}</strong>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab==="scores"&&isStaff&&(
        <ScoreForm cycleId={cycle?.id} month={(scores.length||0)+1} onSaved={load}/>
      )}

      {tab==="graficos"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {scores.length>0?(
            <>
              <Card>
                <Title>Evolução dos scores</Title>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={scores.map((s,i)=>({m:`Mês ${s.month}`,met:s.totalMetabolico,bem:s.totalBemEstar,men:s.totalMental}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="m" tick={{fontSize:10,fill:G[700]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}}/>
                    <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Legend iconType="circle" wrapperStyle={{fontSize:10}}/>
                    <Line type="monotone" dataKey="met" name="Metabólico" stroke={G[500]} strokeWidth={2} dot={{r:3}}/>
                    <Line type="monotone" dataKey="bem" name="Bem-estar" stroke={S.grn} strokeWidth={2} dot={{r:3}}/>
                    <Line type="monotone" dataKey="men" name="Mental" stroke={S.pur} strokeWidth={2} dot={{r:3}}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              {latestScore&&<Card>
                <Title>Radar metabólico (último mês)</Title>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={[
                    {p:"Composição",v:latestScore.gorduraVisceral+latestScore.massaMuscular},
                    {p:"Inflamação",v:latestScore.pcrUltrassensivel+latestScore.ferritina},
                    {p:"Glicêmico",v:latestScore.hemoglobinaGlicada+latestScore.acidoUrico},
                    {p:"Cardiovascular",v:latestScore.triglicerideosHdl+latestScore.circAbdominal}
                  ]} outerRadius={65}><PolarGrid stroke={G[200]}/><PolarAngleAxis dataKey="p" tick={{fontSize:10,fill:G[700]}}/><PolarRadiusAxis domain={[0,6]} tick={{fontSize:8,fill:"#ddd"}}/><Radar dataKey="v" stroke={G[500]} fill={G[400]} fillOpacity={.2} strokeWidth={2}/></RadarChart>
                </ResponsiveContainer>
              </Card>}
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:8}}>
                {[{l:"Metabólico",t:tMet,m:24,fn:stMet},{l:"Bem-estar",t:tBem,m:18,fn:stBem},{l:"Mental",t:tMen,m:9,fn:stMen}].map((s,i)=>{const st=s.fn(s.t);return<div key={i} style={{textAlign:"center",padding:14,background:st.bg,borderRadius:10}}><div style={{fontSize:28,fontWeight:700,color:st.c}}>{s.t}</div><div style={{fontSize:9,color:"#aaa"}}>de {s.m}</div><div style={{fontSize:11,fontWeight:600,color:st.c,marginTop:4}}>{st.e} {st.l}</div></div>;})}
              </div>
            </>
          ):(
            <Card><div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:13}}>Nenhum score registrado ainda. Os gráficos aparecerão quando a equipe preencher os scores.</div></Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ PATIENTS LIST ═══════════════════ */
function PatientsPage({onSelect,mob,onNew}){
  const[patients,setPatients]=useState([]);const[q,setQ]=useState("");const[loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{try{const r=await API.getPatients();setPatients(r.data);}catch(e){}setLoading(false);};

  const filtered=patients.filter(p=>(p.user?.name||"").toLowerCase().includes(q.toLowerCase()));

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:140,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:9,color:"#bbb",fontSize:14}}>🔍</span>
          <input style={{width:"100%",padding:"8px 10px 8px 32px",borderRadius:8,border:`1px solid ${G[300]}`,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}} placeholder="Buscar paciente..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <button onClick={onNew} style={{padding:"8px 16px",borderRadius:8,background:G[600],color:"#fff",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"inherit"}}>+ Novo</button>
      </div>
      {loading?<div style={{padding:20,textAlign:"center",color:G[600]}}>Carregando...</div>:
      filtered.length===0?<div style={{padding:20,textAlign:"center",color:"#aaa"}}>Nenhum paciente encontrado</div>:
      <div style={{display:"grid",gap:6}}>
        {filtered.map(p=>{
          const name=p.user?.name||"Paciente";
          const wl=Math.round((p.initialWeight-p.currentWeight)*10)/10;
          const score=p.cycles?.[0]?.scores?.[0];
          const met=score?.totalMetabolico;const ms=met?stMet(met):null;
          return(
            <div key={p.id} onClick={()=>onSelect(p.id)} style={{background:"#fff",borderRadius:10,border:`1px solid ${G[200]}`,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <Av name={name} size={mob?36:40} src={p.user?.avatarUrl}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div><div style={{fontSize:10,color:"#aaa"}}>{PLANS[p.plan]||p.plan}</div></div>
              <div style={{textAlign:"right"}}>{ms&&<Bg color={ms.c} bg={ms.bg}>{ms.e} {met}</Bg>}<div style={{fontSize:12,color:S.grn,fontWeight:600,marginTop:2}}>-{wl}kg</div></div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

/* ═══════════════════ ALERTS PAGE ═══════════════════ */
function AlertsPage({onSelect}){
  const[alerts,setAlerts]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{try{const r=await API.getAlerts();setAlerts(r.data);}catch(e){}setLoading(false);};
  const reds=alerts.filter(a=>a.severity==="RED");const yels=alerts.filter(a=>a.severity==="YELLOW");

  if(loading)return<div style={{padding:20,textAlign:"center",color:G[600]}}>Carregando...</div>;
  return(
    <div>
      {reds.length>0&&<div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><div style={{width:9,height:9,borderRadius:"50%",background:S.red}}/><span style={{fontWeight:600,color:S.red,fontSize:13}}>Vermelhos — Dra. Mariana</span></div>
        {reds.map(a=><div key={a.id} onClick={()=>onSelect?.(a.patientId)} style={{background:"#fff",borderRadius:8,borderLeft:`4px solid ${S.red}`,padding:"10px 12px",marginBottom:5,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><Av name={a.patient?.user?.name||""} size={24}/><span style={{fontWeight:600,fontSize:12}}>{a.patient?.user?.name}</span></div>
          <div style={{fontSize:11,padding:"3px 8px",background:S.redBg,borderRadius:5}}>🔴 {a.message} — <strong>{a.action?.split(".")[0]}</strong></div>
        </div>)}
      </div>}
      {yels.length>0&&<div>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><div style={{width:9,height:9,borderRadius:"50%",background:S.yel}}/><span style={{fontWeight:600,color:S.yel,fontSize:13}}>Amarelos — equipe</span></div>
        {yels.map(a=><div key={a.id} style={{background:"#fff",borderRadius:8,borderLeft:`4px solid ${S.yel}`,padding:"10px 12px",marginBottom:5}}>
          <div style={{fontSize:12}}><strong>{a.patient?.user?.name}</strong> — {a.message}</div>
        </div>)}
      </div>}
      {alerts.length===0&&<div style={{textAlign:"center",padding:30}}><div style={{fontSize:32}}>🟢</div><div style={{fontSize:14,fontWeight:600,color:S.grn,marginTop:6}}>Todos os pacientes estão bem!</div></div>}
    </div>
  );
}

/* ═══════════════════ PATIENT PORTAL ═══════════════════ */
function PatientPortal({user,mob}){
  const[patients,setPatients]=useState([]);const[selId,setSelId]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{try{const r=await API.getPatients();setPatients(r.data);if(r.data.length>0)setSelId(r.data[0].id);}catch(e){}setLoading(false);};

  if(loading)return<div style={{padding:40,textAlign:"center",color:G[600]}}>Carregando seus dados...</div>;
  if(patients.length===0)return<div style={{padding:40,textAlign:"center",color:"#aaa"}}>Seu perfil de paciente ainda não foi criado pela equipe.</div>;

  const p=patients[0];
  const name=p.user?.name||"Paciente";
  const plan=PLANS[p.plan]||p.plan;
  const wl=Math.round((p.initialWeight-p.currentWeight)*10)/10;
  const cycle=p.cycles?.[0];
  const scores=cycle?.scores||[];
  const latest=scores[scores.length-1];
  const tMet=latest?.totalMetabolico||0;const tBem=latest?.totalBemEstar||0;const tMen=latest?.totalMental||0;
  const pct=cycle?Math.round(cycle.currentWeek/16*100):0;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:`linear-gradient(135deg,${G[700]},${G[900]})`,borderRadius:14,padding:"18px 16px",color:"#fff"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <Av name={name} size={44} src={p.user?.avatarUrl} onEdit={async(file)=>{try{await API.updateAvatar(p.userId,file);load();}catch(e){}}}/>
          <div><div style={{fontSize:10,opacity:.5}}>Programa Ser Livre</div><div style={{fontSize:18,fontWeight:700}}>Olá, {name.split(" ")[0]}!</div></div>
        </div>
        <div style={{fontSize:11,opacity:.6}}>Plano {plan} • Semana {cycle?.currentWeek||1}/16</div>
        <div style={{height:6,background:"rgba(255,255,255,.15)",borderRadius:3,marginTop:8,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:G[300],borderRadius:3}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,opacity:.4,marginTop:3}}><span>Início</span><span>{pct}%</span><span>Alta</span></div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Mt value={`${p.currentWeight}kg`} label="Peso atual"/>
        <Mt value={`-${wl}kg`} label="Já perdeu" color={S.grn}/>
      </div>

      {latest?(
        <>
          <div style={{fontSize:13,fontWeight:600,color:G[800]}}>Seus scores atuais</div>
          <SBar label="Saúde metabólica" total={tMet} max={24} fn={stMet}/>
          <SBar label="Bem-estar" total={tBem} max={18} fn={stBem}/>
          <SBar label="Blindagem mental" total={tMen} max={9} fn={stMen}/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {[{l:"Met",t:tMet,m:24,fn:stMet},{l:"Bem",t:tBem,m:18,fn:stBem},{l:"Ment",t:tMen,m:9,fn:stMen}].map((s,i)=>{const st=s.fn(s.t);return<div key={i} style={{textAlign:"center",padding:12,background:st.bg,borderRadius:10}}><div style={{fontSize:24,fontWeight:700,color:st.c}}>{s.t}</div><div style={{fontSize:8,color:"#aaa"}}>de {s.m}</div><div style={{fontSize:10,fontWeight:600,color:st.c,marginTop:3}}>{st.e} {st.l}</div></div>;})}
          </div>

          {scores.length>1&&<Card>
            <Title>Evolução dos scores</Title>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={scores.map(s=>({m:`Mês ${s.month}`,met:s.totalMetabolico,bem:s.totalBemEstar,men:s.totalMental}))}>
                <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="m" tick={{fontSize:9,fill:G[700]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}}/>
                <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Legend iconType="circle" wrapperStyle={{fontSize:9}}/>
                <Line type="monotone" dataKey="met" name="Met" stroke={G[500]} strokeWidth={2} dot={{r:2}}/>
                <Line type="monotone" dataKey="bem" name="Bem" stroke={S.grn} strokeWidth={2} dot={{r:2}}/>
                <Line type="monotone" dataKey="men" name="Mental" stroke={S.pur} strokeWidth={2} dot={{r:2}}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>}

          <Card>
            <Title>Radar metabólico</Title>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={[
                {p:"Composição",v:latest.gorduraVisceral+latest.massaMuscular},
                {p:"Inflamação",v:latest.pcrUltrassensivel+latest.ferritina},
                {p:"Glicêmico",v:latest.hemoglobinaGlicada+latest.acidoUrico},
                {p:"Cardiovascular",v:latest.triglicerideosHdl+latest.circAbdominal}
              ]} outerRadius={60}><PolarGrid stroke={G[200]}/><PolarAngleAxis dataKey="p" tick={{fontSize:10,fill:G[700]}}/><PolarRadiusAxis domain={[0,6]} tick={{fontSize:8,fill:"#ddd"}}/><Radar dataKey="v" stroke={G[500]} fill={G[400]} fillOpacity={.2} strokeWidth={2}/></RadarChart>
            </ResponsiveContainer>
          </Card>
        </>
      ):(
        <Card><div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:13}}>Seus scores e gráficos aparecerão aqui quando a equipe preencher seus dados.</div></Card>
      )}

      <div style={{textAlign:"center",fontSize:9,color:"#ccc",padding:"8px 0"}}>Instituto Dra. Mariana Wogel • Dados preenchidos pela equipe clínica</div>
    </div>
  );
}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App(){
  const[user,setUser]=useState(()=>{const s=localStorage.getItem("sl_user");return s?JSON.parse(s):null;});
  const[page,setPage]=useState("dash");
  const[selPatientId,setSelPatientId]=useState(null);
  const[showNewPatient,setShowNewPatient]=useState(false);
  const[sideOpen,setSideOpen]=useState(true);
  const mob=useMob();

  const logout=()=>{localStorage.removeItem("sl_token");localStorage.removeItem("sl_user");setUser(null);};
  const goPatient=id=>{setSelPatientId(id);setPage("detail");};
  const isStaff=user&&STAFF_ROLES.includes(user.role);

  if(!user)return<LoginPage onLogin={u=>setUser(u)}/>;

  // ── PATIENT VIEW ──
  if(!isStaff){
    return(
      <div style={{fontFamily:"'Crimson Pro','Georgia',serif",background:"#FEFCF9",minHeight:"100vh",color:"#2C2C2A"}}>
        <div style={{maxWidth:480,margin:"0 auto",padding:"10px 12px 40px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>🛡</span><span style={{fontSize:13,fontWeight:600,color:G[800]}}>Ser Livre</span></div>
            <button onClick={logout} style={{padding:"4px 12px",borderRadius:6,background:G[100],border:"none",color:G[700],fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Sair</button>
          </div>
          <PatientPortal user={user} mob={true}/>
        </div>
      </div>
    );
  }

  // ── STAFF VIEW ──
  const nav=[{k:"dash",l:"Dashboard",e:"📊"},{k:"pat",l:"Pacientes",e:"👥"},{k:"alert",l:"Alertas",e:"🔔"}];
  const titles={dash:"Dashboard",pat:"Pacientes",detail:selPatientId?"Paciente":"",alert:"Alertas"};

  // Mobile layout
  if(mob){
    return(
      <div style={{fontFamily:"'Crimson Pro','Georgia',serif",background:"#FEFCF9",minHeight:"100vh",color:"#2C2C2A",paddingBottom:62}}>
        {showNewPatient&&<NewPatientModal onClose={()=>setShowNewPatient(false)} onCreated={()=>setPage("pat")}/>}
        <div style={{position:"sticky",top:0,zIndex:50,background:"#fff",borderBottom:`1px solid ${G[200]}`,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {page==="detail"&&<span onClick={()=>setPage("pat")} style={{cursor:"pointer",fontSize:16}}>←</span>}
            <span style={{fontSize:15,fontWeight:700,color:G[800]}}>{titles[page]}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"#aaa"}}>Olá, {user.name?.split(" ")[0]}</span>
            <button onClick={logout} style={{padding:"4px 10px",borderRadius:6,background:G[100],border:"none",color:G[700],fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>Sair</button>
          </div>
        </div>
        <div style={{padding:"10px 12px"}}>
          {page==="dash"&&<DashboardPage user={user} onSelectPatient={goPatient} mob={true}/>}
          {page==="pat"&&<PatientsPage onSelect={goPatient} mob={true} onNew={()=>setShowNewPatient(true)}/>}
          {page==="detail"&&selPatientId&&<PatientDetailPage patientId={selPatientId} onBack={()=>setPage("pat")} mob={true} user={user}/>}
          {page==="alert"&&<AlertsPage onSelect={goPatient}/>}
        </div>
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:`1px solid ${G[200]}`,display:"flex",justifyContent:"space-around",padding:"6px 0 max(6px,env(safe-area-inset-bottom))",zIndex:50}}>
          {nav.map(n=>{const a=page===n.k||(n.k==="pat"&&page==="detail");return(
            <div key={n.k} onClick={()=>{setPage(n.k);setSelPatientId(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,cursor:"pointer",padding:"3px 10px"}}>
              <span style={{fontSize:18}}>{n.e}</span><span style={{fontSize:9,fontWeight:a?600:400,color:a?G[600]:"#ccc"}}>{n.l}</span>
            </div>);})}
        </div>
      </div>
    );
  }

  // Desktop layout
  return(
    <div style={{fontFamily:"'Crimson Pro','Georgia',serif",background:"#FEFCF9",minHeight:"100vh",color:"#2C2C2A"}}>
      {showNewPatient&&<NewPatientModal onClose={()=>setShowNewPatient(false)} onCreated={()=>setPage("pat")}/>}
      <div style={{width:220,background:`linear-gradient(180deg,${G[800]},${G[900]})`,color:"#fff",position:"fixed",top:0,left:0,height:"100vh",zIndex:100,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${G[700]}`}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:18}}>🛡</span><div><div style={{fontSize:14,fontWeight:600}}>Ser Livre</div><div style={{fontSize:9,opacity:.4}}>Dra. Mariana Wogel</div></div></div>
        </div>
        <div style={{flex:1,paddingTop:8}}>
          {nav.map(n=>{const a=page===n.k||(n.k==="pat"&&page==="detail");return(
            <div key={n.k} onClick={()=>{setPage(n.k);setSelPatientId(null);}} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 14px",cursor:"pointer",fontSize:12,fontWeight:a?600:400,background:a?"rgba(255,255,255,.1)":"transparent",borderLeft:a?`3px solid ${G[300]}`:"3px solid transparent",color:a?"#fff":"rgba(255,255,255,.55)",transition:"all .15s"}}>
              <span>{n.e}</span><span>{n.l}</span>
            </div>);})}
        </div>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${G[700]}`,display:"flex",alignItems:"center",gap:7}}>
          <Av name={user.name} size={28}/><div style={{flex:1}}><div style={{fontSize:11,fontWeight:500}}>{user.name?.split(" ")[0]}</div><div style={{fontSize:9,opacity:.3}}>{ROLES[user.role]}</div></div>
          <span onClick={logout} style={{cursor:"pointer",opacity:.4,fontSize:12}}>⎋</span>
        </div>
      </div>
      <div style={{marginLeft:220,padding:"0 18px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${G[200]}`,marginBottom:16}}>
          <h1 style={{fontSize:17,fontWeight:700,color:G[800],margin:0}}>{titles[page]}</h1>
        </div>
        {page==="dash"&&<DashboardPage user={user} onSelectPatient={goPatient} mob={false}/>}
        {page==="pat"&&<PatientsPage onSelect={goPatient} mob={false} onNew={()=>setShowNewPatient(true)}/>}
        {page==="detail"&&selPatientId&&<PatientDetailPage patientId={selPatientId} onBack={()=>setPage("pat")} mob={false} user={user}/>}
        {page==="alert"&&<AlertsPage onSelect={goPatient}/>}
      </div>
    </div>
  );
}
