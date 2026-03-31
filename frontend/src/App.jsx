import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { forgotPassword as apiForgotPassword, createPatient as apiCreatePatient, updatePatient as apiUpdatePatient, deletePatient as apiDeletePatient, finishProgram as apiFinishProgram, restartProgram as apiRestartProgram, saveScores as apiSaveScores, saveWeekCheck as apiSaveWeekCheck, resolveAlert as apiResolveAlert, getAppointments, createAppointment, deleteAppointment, getDashboard, getMessages, sendMessage, getStaff, updateUserProfile, updateUserEmail, updateUserPassword, updateStaffRole, deleteStaff, getActivity, logActivity, register as apiRegister, sendWhatsAppMsg, getWhatsAppStatus, getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate, generateMessage, saveCircumference as apiSaveCircumference, getCircumferences as apiGetCircumferences, updateAvatar } from './utils/api';
import { supabase } from './utils/supabase';
import { ResetPassword } from './components/ResetPassword';
import { Toast } from './components/Toast';
import { AlertCard } from './components/AlertCard';
import { WeighInModal } from './components/WeighInModal';
import { calcularMetabolico, calcularBemEstar, calcularMental, calcularEngajamento, formatarPeso, formatarPerda } from './utils/calculations';
import html2pdf from "html2pdf.js";
import { subDays, isAfter, format, differenceInYears, setYear, isBefore, addDays, parseISO, differenceInDays } from "date-fns";

// Formata data com segurança — retorna "—" se a data for nula ou inválida
const safeFmt = (dateStr, fmt) => {
  if (!dateStr) return "—";
  try { const d = new Date(dateStr); if (isNaN(d.getTime())) return "—"; return format(d, fmt); }
  catch { return "—"; }
};

// Máscara de telefone/WhatsApp: (XX) XXXXX-XXXX
const maskPhone = (value) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return d.length ? `(${d}` : '';
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
};
import * as Lucide from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area,
  PieChart, Pie
} from "recharts";
import {
  Users, LayoutDashboard, ClipboardCheck, AlertTriangle, FileText,
  LogOut, ChevronRight, Search, Bell, TrendingUp, TrendingDown,
  Activity, Shield, User, Lock, Menu, Check, Download,
  ArrowLeft, Camera, Star, Award, Flame, Target, Zap, BarChart3,
  Trophy, CalendarDays, Weight, Home, Heart, Brain, RefreshCw, Plus, Settings, UserPlus, Cake, FileSignature, Save,
  MessageCircle, Send, ChevronLeft, ChevronRight as ChevronRightIcon,
  Eye, EyeOff, X, Mail
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

const TODAY = new Date();
const fmt   = d => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}`; };
const addD  = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };


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
  // Lê do scoreHistory (scores clínicos salvos via API)
  const scoreHist = p.scoreHistory || [];
  const last = scoreHist[scoreHist.length - 1];
  if (!last) return acc;
  acc[p.id] = { m: last.m || {}, b: last.b || {}, n: last.n || {} };
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



// Gera estrutura de checklist com base em weekChecks reais do banco.
// Semanas passadas (i < currentWeek): marcadas como concluídas.
// Semana atual e futuras: false — estado real vem do banco (weekChecks).
const genCL = (p, tier, weekChecks = []) => {
  const w = p?.week || 1;
  const f = TIER[tier];
  const r = {};
  // Indexar weekChecks por weekNumber para lookup O(1)
  const wkMap = {};
  (weekChecks || []).forEach(wc => { wkMap[wc.weekNumber] = wc; });
  for (let i=1; i<=16; i++) {
    const past = i < w;
    const wc   = wkMap[i]; // dados reais do banco para essa semana
    r[i] = {
      tirz: wc ? !!wc.tirzepatida   : past,
      ter:  f.ter ? (wc ? !!wc.terapia    : past) : null,
      peso: wc ? !!wc.pesagem        : past,
      psi:  f.psi ? (wc ? !!wc.psicologia : past) : null,
      bio:  wc ? !!wc.bioimpedancia  : past,
      tr:   Array.from({length:f.tr}, (_, ti) => wc ? !!(wc[`tr${ti}`] ?? wc.treino) : past),
      nu:   i%4===1 ? { av: wc ? !!wc.nutriAvaliacao : past, pl: wc ? !!wc.nutriPlano : past, sc: wc ? !!wc.nutriScore : past } : null,
      dose: wc?.tirzepatidaDose || (i<=4?"2.5mg":i<=8?"5mg":i<=12?"7.5mg":"10mg"),
      concluida: wc ? true : past,
      weekDate: wc?.weekDate || null,
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

/* ════════════════════════════════════════════
   COMPONENTE — PROFILE MODAL
═══════════════════════════════════════════════ */
function ProfileModal({ user, avatarSrc, onClose, onUpdate, toast }) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [birthDate, setBirthDate] = useState(user.birthDate || '');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(avatarSrc || null);

  const inputStyle = {
    width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${G[200]}`,
    fontSize:13, fontFamily:"inherit", color:G[800], background:"#fff",
    outline:"none", boxSizing:"border-box"
  };
  const labelStyle = { fontSize:11, fontWeight:600, color:G[600], marginBottom:3, display:"block" };
  const btnStyle = (bg, color) => ({
    padding:"9px 20px", borderRadius:8, border:"none", background:bg,
    color, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
    opacity: saving ? 0.6 : 1, transition:"opacity 0.15s"
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update name/phone
      await updateUserProfile(user.id, { name, phone });
      // Update email if changed
      if (email !== user.email) {
        await updateUserEmail(user.id, { email });
      }
      // Update localStorage and parent state
      const updated = { ...user, name, email, phone: phone || user.phone, birthDate };
      localStorage.setItem('serlivre_user', JSON.stringify(updated));
      onUpdate(updated);
      toast('Dados atualizados com sucesso!', 'success');
    } catch (err) {
      toast(err?.response?.data?.error || 'Erro ao salvar dados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 8) {
      toast('A senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      toast('As senhas não coincidem.', 'error');
      return;
    }
    setSavingPw(true);
    try {
      await updateUserPassword(user.id, { password: newPw });
      toast('Senha alterada com sucesso!', 'success');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast(err?.response?.data?.error || 'Erro ao alterar senha.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const handleAvatarEdit = async (dataUrl) => {
    setLocalAvatar(dataUrl);
    try {
      // Convert dataUrl to file and upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'avatar.jpg', { type: blob.type });
      await updateAvatar(user.id, file);
      toast('Foto atualizada!', 'success');
    } catch (err) {
      toast('Erro ao atualizar foto.', 'error');
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:420, maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px 14px", borderBottom:`1px solid ${G[100]}` }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:G[800] }}>Meu perfil</h3>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={18} color={G[500]}/>
          </div>
        </div>

        <div style={{ padding:"20px" }}>
          {/* Avatar */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
            <Av name={name || 'U'} size={72} src={localAvatar} onEdit={handleAvatarEdit}/>
          </div>

          {/* Name */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Seu nome"/>
          </div>

          {/* Email */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} type="email" placeholder="seu@email.com"/>
          </div>

          {/* Phone */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Telefone</label>
            <input value={phone} onChange={e => setPhone(maskPhone(e.target.value))} style={inputStyle} type="tel" placeholder="(00) 00000-0000"/>
          </div>

          {/* Birth date */}
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Data de nascimento</label>
            <input value={birthDate} onChange={e => setBirthDate(e.target.value)} style={inputStyle} type="date"/>
          </div>

          {/* Role info (read-only) */}
          <div style={{ marginBottom:18, padding:"10px 14px", background:G[50], borderRadius:8, border:`1px solid ${G[200]}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", fontWeight:600 }}>Cargo</div>
                <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>
                  {user.role === 'ADMIN' ? 'Administrador(a)' : user.role === 'MEDICA' ? 'Médico(a)' : user.role === 'ENFERMAGEM' ? 'Enfermagem' : user.role === 'NUTRICIONISTA' ? 'Nutricionista' : user.role === 'PSICOLOGA' ? 'Psicóloga' : user.role || 'Equipe'}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"#aaa", textTransform:"uppercase", fontWeight:600 }}>Desde</div>
                <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '—'}</div>
              </div>
            </div>
          </div>

          {/* Save profile button */}
          <button onClick={handleSaveProfile} disabled={saving} style={btnStyle(G[600], '#fff')}>
            {saving ? 'Salvando...' : 'Salvar dados'}
          </button>

          {/* Divider */}
          <div style={{ borderTop:`1px solid ${G[200]}`, margin:"22px 0 18px" }}/>

          {/* Password section */}
          <h4 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:G[700], display:"flex", alignItems:"center", gap:6 }}>
            <Lock size={14}/> Alterar senha
          </h4>

          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Nova senha</label>
            <div style={{ position:"relative" }}>
              <input value={newPw} onChange={e => setNewPw(e.target.value)}
                type={showPw ? "text" : "password"} style={{ ...inputStyle, paddingRight:36 }}
                placeholder="Minimo 8 caracteres"/>
              <div onClick={() => setShowPw(!showPw)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", cursor:"pointer", display:"flex" }}>
                {showPw ? <EyeOff size={15} color={G[400]}/> : <Eye size={15} color={G[400]}/>}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={labelStyle}>Confirmar nova senha</label>
            <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              type={showPw ? "text" : "password"} style={inputStyle}
              placeholder="Repita a senha"/>
          </div>

          <button onClick={handleChangePassword} disabled={savingPw}
            style={{ ...btnStyle("transparent", G[700]), border:`1px solid ${G[300]}` }}>
            {savingPw ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>
      </div>
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
  const [dashData, setDashData] = useState(null);
  useEffect(() => {
    getDashboard().then(r => setDashData(r.data)).catch(() => {});
  }, [ps]);

  // ── Filtro de período: filtra pacientes com atividade E limita dados ao período ──
  const filteredPs = useMemo(() => {
    if (df === "all") return ps;
    const daysMap = { week: 7, month: 30, quarter: 90, "120d": 120 };
    const days = daysMap[df];
    if (!days) return ps;
    const cutoff = subDays(new Date(), days);
    const inRange = (d) => d && isAfter(new Date(d), cutoff);
    // Filtra pacientes que tiveram qualquer atividade no período
    return ps.filter(p => {
      if ((p.history || []).some(h => inRange(h.date))) return true;
      if ((p.circumferenceHistory || []).some(c => inRange(c.date))) return true;
      if ((p.scoreHistory || []).some(s => inRange(s.date))) return true;
      if (inRange(p.sd)) return true;
      return false;
    }).map(p => ({
      // Clona paciente com históricos filtrados pelo período
      ...p,
      history: (p.history || []).filter(h => inRange(h.date)),
      circumferenceHistory: (p.circumferenceHistory || []).filter(c => inRange(c.date)),
      scoreHistory: (p.scoreHistory || []).filter(s => inRange(s.date)),
    }));
  }, [ps, df]);

  const SC = genSC(filteredPs);

  // Composição corporal média atual
  const avgMM = filteredPs.length ? +(filteredPs.reduce((a,p)=>{ const h=p.history||[]; const last=h[h.length-1]; return a+(last?.massaMagra||0); },0)/filteredPs.length).toFixed(1) : 0;
  const avgMG = filteredPs.length ? +(filteredPs.reduce((a,p)=>{ const h=p.history||[]; const last=h[h.length-1]; return a+(last?.massaGordura||0); },0)/filteredPs.length).toFixed(1) : 0;
  const avgPctMM = filteredPs.length ? +(filteredPs.reduce((a,p)=>{ const h=p.history||[]; const last=h[h.length-1]; const tot=(last?.massaMagra||0)+(last?.massaGordura||0); return a+(tot>0?((last?.massaMagra||0)/tot*100):0); },0)/filteredPs.length).toFixed(1) : 0;
  const avgPctMG = filteredPs.length ? +(100-avgPctMM).toFixed(1) : 0;

  // Histórico de composição (para gráfico)
  const compHist = (() => {
    const weeks = {};
    filteredPs.forEach(p => { (p.history||[]).forEach((h,i) => { const k=`S${i+1}`; if(!weeks[k]) weeks[k]={s:k,mm:0,mg:0,n:0}; weeks[k].mm+=(h.massaMagra||0); weeks[k].mg+=(h.massaGordura||0); weeks[k].n++; }); });
    return Object.values(weeks).map(w=>({s:w.s, mm:w.n?+(w.mm/w.n).toFixed(1):0, mg:w.n?+(w.mg/w.n).toFixed(1):0}));
  })();

  const tl   = filteredPs.reduce((a,p) => a+(p.iw-p.cw), 0);
  const ae   = filteredPs.length ? Math.round(filteredPs.reduce((a,p) => a+p.eng, 0)/filteredPs.length) : 0;
  const cr   = filteredPs.filter(p => { const sc=SC[p.id]; return sc&&(cM(sc.m)<=12||cB(sc.b)<10); });
  const el   = filteredPs.filter(p => { const sc=SC[p.id]; return sc&&cM(sc.m)>=21; });
  const rTod = filteredPs.filter(p => p.nr && fmt(p.nr)===fmt(TODAY));
  const rWk  = filteredPs.filter(p => { if(!p.nr)return false; const d=new Date(p.nr).getTime(); return d>=TODAY.getTime()&&d<=addD(TODAY,7).getTime(); }).sort((a,b)=>new Date(a.nr)-new Date(b.nr));
  const top  = useMemo(() => filteredPs.map(p=>({...p,pct:(p.iw>0?((p.iw-p.cw)/p.iw*100):0)})).sort((a,b)=>b.pct-a.pct).slice(0,3), [filteredPs]);
  const pavg = useMemo(() => {
    const s={c:0,i:0,g:0,v:0,n:0};
    filteredPs.forEach(p => { const sc=SC[p.id]; if(!sc)return; const pm=pM(sc.m); s.c+=pm.comp; s.i+=pm.infl; s.g+=pm.glic; s.v+=pm.card; s.n++; });
    const n=s.n||1;
    return [{p:"Composição",v:+(s.c/n).toFixed(1)},{p:"Inflamação",v:+(s.i/n).toFixed(1)},{p:"Glicêmico",v:+(s.g/n).toFixed(1)},{p:"Cardiovascular",v:+(s.v/n).toFixed(1)}];
  }, [filteredPs]);
  const engD = useMemo(() => filteredPs.map(p=>({n:p.name.split(" ")[0],e:p.eng})).sort((a,b)=>b.e-a.e), [filteredPs]);
  const wbw  = useMemo(() => {
    const w=[];
    for(let i=1;i<=16;i++){let s=0,n=0; filteredPs.forEach(p=>{const h=p.history||[];if(h[i-1]!==undefined){s+=p.iw-(h[i-1]?.weight||0);n++;}}); w.push({s:`S${i}`,v:n?+(s/n).toFixed(1):0});}
    return w;
  }, [filteredPs]);

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
        <Mt value={dashData?.activePatients ?? filteredPs.length} label="Pacientes ativos"   icon={Users}        trend={12}/>
        <Mt value={cr.length}          label="Críticos"            icon={AlertTriangle} color={cr.length?S.red:S.grn} sub={cr.length?cr.map(p=>p.name.split(" ")[0]).join(", "):"Nenhum"}/>
        <Mt value={`${(dashData?.totalWeightLost ?? tl).toFixed(1)}kg`} label="Peso total perdido" icon={TrendingUp}   color={S.grn} trend={8}/>
        <Mt value={`${dashData?.avgEngagement ?? ae}%`}  label="Engajamento médio"  icon={Flame}         color={(dashData?.avgEngagement??ae)>=80?S.grn:(dashData?.avgEngagement??ae)>=60?S.yel:S.red}/>
      </div>

      {/* KPIs linha 2 */}
      <div style={{ display:"grid", gridTemplateColumns:gc, gap:8 }}>
        <Mt value={`${(dashData?.totalPatients??filteredPs.length)>0?((dashData?.totalWeightLost??tl)/(dashData?.totalPatients??filteredPs.length)).toFixed(1):"0.0"}kg`} label="Média por paciente"  icon={Weight}/>
        <Mt value={el.length}          label="Score elite"         icon={Trophy}        color={S.pur} sub={el.map(p=>p.name.split(" ")[0]).join(", ")||"—"}/>
        <Mt value={rTod.length}        label="Retornos hoje"       icon={CalendarDays}  color={S.blue} sub={rTod.map(p=>p.name.split(" ")[0]).join(", ")||"Nenhum"}/>
        <Mt value={`${dashData?.alerts?.red ?? cr.length}`} label="Alertas vermelhos" icon={AlertTriangle} color={S.red}/>
      </div>

      {/* KPIs composição corporal */}
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)", gap:8 }}>
        <Mt value={`${avgMM}kg`}    label="Massa magra média"   icon={Activity} color={S.blue}  sub={`${avgPctMM}% do peso`}/>
        <Mt value={`${avgMG}kg`}    label="Massa gorda média"   icon={Weight}   color={S.yel}   sub={`${avgPctMG}% do peso`}/>
        <Mt value={`${(dashData?.totalWeightLost ?? tl).toFixed(1)}kg`} label="Perda total"   icon={TrendingDown} color={S.grn}/>
        <Mt value={`${dashData?.avgEngagement ?? ae}%`} label="Engajamento"         icon={Flame}    color={(dashData?.avgEngagement??ae)>=80?S.grn:S.yel}/>
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
          <tbody>{filteredPs.map(p => {
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
        {f.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"#aaa" }}>
            {ps.length === 0 ? (
              <>
                <Users size={36} color={G[300]} style={{ margin:"0 auto 12px", display:"block" }}/>
                <div style={{ fontSize:14, fontWeight:600, color:G[700], marginBottom:6 }}>Nenhum paciente cadastrado</div>
                <div style={{ fontSize:12, marginBottom:16 }}>Cadastre o primeiro paciente do programa.</div>
                <button onClick={onAdd} style={{ padding:"9px 20px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                  + Cadastrar primeiro paciente
                </button>
              </>
            ) : (
              <>
                <Search size={28} color={G[300]} style={{ margin:"0 auto 10px", display:"block" }}/>
                <div style={{ fontSize:13, fontWeight:600, color:G[700], marginBottom:4 }}>Nenhum resultado</div>
                <div style={{ fontSize:12 }}>Tente outro nome ou filtro de plano.</div>
              </>
            )}
          </div>
        )}
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
  const [relDe,        setRelDe]        = useState("");
  const [relAte,       setRelAte]       = useState("");
  const [relComp,      setRelComp]      = useState(false);
  const [generatingPdf,setGeneratingPdf]= useState(false);

  const sh = p.scoreHistory || [];
  const shFilt = relDe||relAte ? sh.filter(s => {
    const d = new Date(s.date);
    if(relDe && d < new Date(relDe)) return false;
    if(relAte && d > new Date(relAte)) return false;
    return true;
  }) : sh;
  const histFilt = relDe||relAte ? (p.history||[]).filter(h => {
    const d = new Date(h.date);
    if(relDe && d < new Date(relDe)) return false;
    if(relAte && d > new Date(relAte)) return false;
    return true;
  }) : (p.history||[]);

  const comp1 = shFilt[0];
  const comp2 = shFilt[shFilt.length-1];
  const pHist = p.history||[];
  const lastH = pHist[pHist.length-1];
  const mmLast = lastH?.massaMagra||0;
  const mgLast = lastH?.massaGordura||0;
  const totComp = (mmLast+mgLast)||1;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Controles de período e PDF */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:6 }}>
          <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Relatório Clínico</span>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>setRelComp(!relComp)} style={{ fontSize:11, padding:"6px 12px", borderRadius:7, background:relComp?G[600]:G[50], color:relComp?"#fff":G[700], border:`1px solid ${G[300]}`, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>📊 Comparativo</button>
            <button
              disabled={generatingPdf}
              onClick={async () => {
                const el = document.getElementById(`rel-${p.id}`);
                if (!el) return;
                setGeneratingPdf(true);
                try {
                  await html2pdf().set({
                    margin:[10,10,10,10],
                    filename:`relatorio-${p.name}.pdf`,
                    html2canvas:{scale:2,useCORS:true,letterRendering:true},
                    jsPDF:{format:"a4",orientation:"portrait",unit:"mm"},
                    pagebreak:{mode:["css","legacy"],before:".pdf-page-break",avoid:".pdf-no-break"}
                  }).from(el).save();
                } finally {
                  setGeneratingPdf(false);
                }
              }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:7, background:generatingPdf?G[400]:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:generatingPdf?"not-allowed":"pointer", fontFamily:"inherit", opacity:generatingPdf?0.7:1 }}
            >
              <Download size={13}/>{generatingPdf ? "Gerando..." : "PDF"}
            </button>
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
      <div id={`rel-${p.id}`} style={{ display:"flex", flexDirection:"column", gap:0, background:"#fff", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

        {/* ═══════════ PAGE 1: Análise Global ═══════════ */}
        {(() => {
          const heightM = (p.height || 165) / 100;
          const weight = p.cw || p.iw || 70;
          const age = calcAge(p.birthDate);
          const leanMass = mmLast;
          const fatMass = mgLast;
          const totalMass = (leanMass + fatMass) || weight;
          const fatPct = totalMass > 0 ? (fatMass / totalMass * 100) : 0;
          const leanPct = totalMass > 0 ? (leanMass / totalMass * 100) : 0;
          const imc = heightM > 0 ? (weight / (heightM * heightM)) : 0;
          const imm = heightM > 0 ? (leanMass / (heightM * heightM)) : 0;
          const img = heightM > 0 ? (fatMass / (heightM * heightM)) : 0;
          const waterL = (leanMass * 0.723);
          const waterPct = weight > 0 ? (waterL / weight * 100) : 0;
          const ger = 500 + (22 * leanMass);

          // Previous values
          const prevH = pHist.length >= 2 ? pHist[pHist.length - 2] : null;
          const prevWeight = prevH?.weight || p.iw || weight;
          const prevLean = prevH?.massaMagra || 0;
          const prevFat = prevH?.massaGordura || 0;
          const prevTotal = (prevLean + prevFat) || prevWeight;
          const prevFatPct = prevTotal > 0 ? (prevFat / prevTotal * 100) : 0;
          const prevImm = heightM > 0 ? (prevLean / (heightM * heightM)) : 0;
          const prevImg = heightM > 0 ? (prevFat / (heightM * heightM)) : 0;

          const deltaW = weight - prevWeight;
          const deltaFat = fatMass - prevFat;
          const deltaLean = leanMass - prevLean;
          const deltaFatPct = fatPct - prevFatPct;
          const deltaImm = imm - prevImm;
          const deltaImg = img - prevImg;

          // Circumference data
          const circAll = p.circumferenceHistory || [];
          const circFilt = relDe||relAte ? circAll.filter(c => {
            const d = new Date(c.date);
            if(relDe && d < new Date(relDe)) return false;
            if(relAte && d > new Date(relAte)) return false;
            return true;
          }) : circAll;
          const lastC = circFilt[circFilt.length - 1];
          const prevC = circFilt.length >= 2 ? circFilt[circFilt.length - 2] : null;
          const cintura = lastC?.cintura || 0;
          const quadril = lastC?.quadril || 0;
          const prevCintura = prevC?.cintura || 0;
          const prevQuadril = prevC?.quadril || 0;
          const rce = heightM > 0 ? (cintura / 100 / heightM) : 0;
          const rcq = quadril > 0 ? (cintura / quadril) : 0;
          const prevRce = heightM > 0 ? (prevCintura / 100 / heightM) : 0;
          const prevRcq = prevQuadril > 0 ? (prevCintura / prevQuadril) : 0;
          const iconicidade = cintura > 0 && weight > 0 && heightM > 0
            ? ((cintura / 100) / (0.109 * Math.sqrt(weight / heightM)))
            : 0;
          const prevIconicidade = prevCintura > 0 && prevWeight > 0 && heightM > 0
            ? ((prevCintura / 100) / (0.109 * Math.sqrt(prevWeight / heightM)))
            : 0;

          // IMC classification
          const imcClass = imc < 18.5 ? { l:"Baixo peso", c:"#3498DB" }
            : imc < 25 ? { l:"Eutrofia", c:S.grn }
            : imc < 30 ? { l:"Sobrepeso", c:S.yel }
            : { l:"Obesidade", c:S.red };

          // Fat% classification (female)
          const fatClass = fatPct < 15 ? { l:"Atenção", c:"#3498DB" }
            : fatPct <= 25 ? { l:"Baixo risco", c:S.grn }
            : fatPct <= 32 ? { l:"Risco moderado", c:S.yel }
            : { l:"Alto risco", c:S.red };

          // IMM classification (female)
          const immClass = imm < 15 ? { l:"Baixo", c:S.red }
            : imm <= 18 ? { l:"Adequado", c:S.grn }
            : { l:"Alto", c:S.blue };

          // IMG classification (female)
          const imgClass = img < 5 ? { l:"Baixo", c:S.blue }
            : img <= 9 ? { l:"Adequado", c:S.grn }
            : { l:"Alto", c:S.red };

          // Cintura classification (female)
          const cintClass = cintura < 80 ? { l:"Baixo risco", c:S.grn }
            : cintura <= 88 ? { l:"Risco moderado", c:S.yel }
            : { l:"Alto risco", c:S.red };

          // RCE classification
          const rceClass = rce < 0.5 ? { l:"Baixo risco", c:S.grn }
            : rce <= 0.6 ? { l:"Risco moderado", c:S.yel }
            : { l:"Alto risco", c:S.red };

          // RCQ classification (female)
          const rcqClass = rcq < 0.85 ? { l:"Adequado", c:S.grn }
            : { l:"Inadequado", c:S.red };

          // Conicidade classification (female)
          const conicClass = iconicidade < 1.18 ? { l:"Adequado", c:S.grn }
            : iconicidade <= 1.22 ? { l:"Moderado", c:S.yel }
            : { l:"Inadequado", c:S.red };

          // IMM grid position
          const immRow = imm < 15 ? 0 : imm <= 18 ? 1 : 2;
          const imgCol = img < 5 ? 0 : img <= 9 ? 1 : 2;

          // Delta badge helper
          const DeltaBadge = ({ val, invert=false, unit="kg" }) => {
            if (val == null || isNaN(val) || val === 0) return null;
            const good = invert ? val > 0 : val < 0;
            const color = good ? S.grn : S.red;
            const bg = good ? S.grnBg : S.redBg;
            return <span style={{ display:"inline-flex", alignItems:"center", padding:"1px 6px", borderRadius:10, fontSize:9, fontWeight:600, color, background:bg, marginLeft:4 }}>{val > 0 ? "+" : ""}{val.toFixed(1)}{unit}</span>;
          };

          // Section title helper
          const SectionTitle = ({ children }) => (
            <div style={{ borderLeft:`4px solid ${G[500]}`, background:G[50], padding:"8px 12px", marginBottom:10, pageBreakInside:"avoid" }}>
              <span style={{ fontSize:13, fontWeight:700, color:G[800] }}>{children}</span>
            </div>
          );

          // Classification bar helper
          const ClassBar = ({ zones, value, prevValue, height=14 }) => {
            const total = zones.reduce((s, z) => s + z.width, 0);
            let cumPct = 0;
            const markerPos = (() => {
              let pos = 0;
              for (const z of zones) {
                const zonePct = (z.width / total) * 100;
                if (value <= z.max) {
                  const within = z.max === z.min ? 0.5 : (value - z.min) / (z.max - z.min);
                  return pos + within * zonePct;
                }
                pos += zonePct;
              }
              return 100;
            })();
            const prevPos = prevValue != null ? (() => {
              let pos = 0;
              for (const z of zones) {
                const zonePct = (z.width / total) * 100;
                if (prevValue <= z.max) {
                  const within = z.max === z.min ? 0.5 : (prevValue - z.min) / (z.max - z.min);
                  return pos + within * zonePct;
                }
                pos += zonePct;
              }
              return 100;
            })() : null;
            return (
              <div style={{ position:"relative", marginTop:6, marginBottom:prevValue != null ? 20 : 6 }}>
                <div style={{ display:"flex", height, borderRadius:4, overflow:"hidden" }}>
                  {zones.map((z, i) => (
                    <div key={i} style={{ flex:z.width, background:z.color, position:"relative" }}>
                      <span style={{ position:"absolute", bottom:-14, left:"50%", transform:"translateX(-50%)", fontSize:8, color:"#999", whiteSpace:"nowrap" }}>{z.label}</span>
                    </div>
                  ))}
                </div>
                {/* Current marker */}
                <div style={{ position:"absolute", top:-4, left:`${Math.min(Math.max(markerPos, 1), 99)}%`, transform:"translateX(-50%)" }}>
                  <div style={{ width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderTop:`6px solid ${G[800]}` }} />
                </div>
                {/* Previous marker */}
                {prevPos != null && (
                  <div style={{ position:"absolute", top:-4, left:`${Math.min(Math.max(prevPos, 1), 99)}%`, transform:"translateX(-50%)" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#ccc", border:"1px solid #999" }} />
                  </div>
                )}
              </div>
            );
          };

          // Donut data
          const donutData = [
            { name:"Massa gorda", value:parseFloat(fatPct.toFixed(1)), fill:G[500] },
            { name:"Massa magra", value:parseFloat(leanPct.toFixed(1)), fill:"#27AE60" }
          ];

          // Ser Livre Score calculation
          const scoreIndicators = [];
          // Fat% score (0-100): 15-25 is ideal for women
          if (fatPct > 0) scoreIndicators.push(fatPct <= 25 ? 100 : fatPct <= 32 ? 60 : fatPct < 15 ? 50 : 20);
          if (img > 0) scoreIndicators.push(img <= 9 ? 100 : img <= 13 ? 60 : 20);
          if (imm > 0) scoreIndicators.push(imm >= 15 && imm <= 18 ? 100 : imm >= 13 ? 60 : 20);
          if (cintura > 0) {
            scoreIndicators.push(rce < 0.5 ? 100 : rce <= 0.6 ? 60 : 20);
            if (quadril > 0) scoreIndicators.push(rcq < 0.85 ? 100 : 20);
            if (iconicidade > 0) scoreIndicators.push(iconicidade < 1.18 ? 100 : iconicidade <= 1.22 ? 60 : 20);
          }
          const serLivreScore = scoreIndicators.length > 0
            ? Math.round(scoreIndicators.reduce((a, b) => a + b, 0) / scoreIndicators.length)
            : 0;
          const scoreColor = serLivreScore >= 80 ? S.grn : serLivreScore >= 50 ? S.yel : S.red;

          // Mini chart helper
          const MiniChart = ({ data, dataKey, color="#2980B9", height:h=60 }) => (
            <div style={{ width:"100%", height:h }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top:2, right:2, bottom:2, left:2 }}>
                  <defs>
                    <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
                      <stop offset="100%" stopColor={color} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#grad-${dataKey})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );

          return (
            <>
            {/* PAGE 1 */}
            <div style={{ padding:"18px 16px", pageBreakInside:"avoid" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", border:`1px solid ${G[300]}`, borderRadius:8, padding:"14px 16px", marginBottom:14, background:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <img src="https://i.imgur.com/iI43uBa.png" alt="Logo" onError={e=>{ e.target.src="https://i.imgur.com/iI43uBa.jpg"; }} style={{ width:48, height:48, borderRadius:6, objectFit:"contain" }}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:G[800] }}>Instituto Dra. Mariana Wogel</div>
                    <div style={{ fontSize:10, color:G[500] }}>Programa Ser Livre</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:G[800], textTransform:"uppercase" }}>{p.name}</div>
                  <div style={{ fontSize:10, color:"#888" }}>Feminino | {age} anos | {heightM.toFixed(2)}m</div>
                  <div style={{ fontSize:10, color:"#888" }}>Semana {p.week}/16 — Ciclo {p.cycle}</div>
                  <div style={{ fontSize:10, color:"#888" }}>Avaliacao em: {format(new Date(), "dd/MM/yyyy")}</div>
                  {relComp && histFilt.length >= 2 && (
                    <div style={{ fontSize:9, color:G[500], marginTop:2, fontStyle:"italic" }}>
                      Comparativo: {safeFmt(histFilt[0]?.date,'dd/MM/yy')} → {safeFmt(histFilt[histFilt.length-1]?.date,'dd/MM/yy')}
                    </div>
                  )}
                  {(relDe||relAte) && (
                    <div style={{ fontSize:9, color:G[500] }}>Periodo: {relDe||"inicio"} a {relAte||"hoje"}</div>
                  )}
                </div>
              </div>

              {/* Dados do paciente + peso */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                <div style={{ padding:"10px 12px", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8 }}>
                  <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", fontWeight:600 }}>Peso inicial</div>
                  <div style={{ fontSize:18, fontWeight:700, color:G[800] }}>{p.iw}kg</div>
                </div>
                <div style={{ padding:"10px 12px", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8 }}>
                  <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", fontWeight:600 }}>Peso atual</div>
                  <div style={{ fontSize:18, fontWeight:700, color:G[800] }}>{p.cw}kg</div>
                </div>
                <div style={{ padding:"10px 12px", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8 }}>
                  <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", fontWeight:600 }}>Evolucao</div>
                  <div style={{ fontSize:18, fontWeight:700, color: (p.iw-p.cw)>0 ? S.grn : (p.iw-p.cw)<0 ? S.red : G[800] }}>-{(p.iw-p.cw).toFixed(1)}kg</div>
                </div>
                <div style={{ padding:"10px 12px", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8 }}>
                  <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", fontWeight:600 }}>Perda total</div>
                  <div style={{ fontSize:18, fontWeight:700, color: S.grn }}>{p.iw>0 ? (((p.iw-p.cw)/p.iw)*100).toFixed(1) : "0.0"}%</div>
                </div>
              </div>

              {/* Dados da ficha */}
              <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap", fontSize:11, color:G[700] }}>
                <span>Telefone: <strong>{p.phone||"—"}</strong></span>
                <span>Plano: <strong>{plan?.name||p.plan}</strong></span>
                <span>Inicio: <strong>{safeFmt(p.sd,'dd/MM/yyyy')}</strong></span>
                <span>Ciclo: <strong>{p.cycle}</strong></span>
              </div>

              {/* Scores clinicos com barras — só mostra se tem score registrado */}
              {(met > 0 || be > 0 || mn > 0) ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                {[{l:"Saude metabolica",t:met,m:24,fn:sM,c:"#27AE60"},{l:"Bem-estar",t:be,m:18,fn:sB,c:"#F39C12"},{l:"Blindagem mental",t:mn,m:9,fn:sN,c:"#F39C12"}].map((s,i) => {
                  const st=s.fn(s.t);
                  const pct = Math.min(100, (s.t/s.m*100));
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff", borderRadius:8, border:`1px solid ${G[200]}` }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:st.c, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>{s.t}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:G[800], marginBottom:4 }}>{s.l}</div>
                        <div style={{ height:6, background:G[100], borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:st.c, borderRadius:3 }}/>
                        </div>
                      </div>
                      <Bg color={st.c} bg={st.bg}>{st.l}</Bg>
                    </div>
                  );
                })}
              </div>
              ) : (
              <div style={{ padding:"12px 14px", background:"#fff", borderRadius:8, border:`1px solid ${G[200]}`, marginBottom:14, textAlign:"center" }}>
                <div style={{ fontSize:12, color:"#aaa" }}>Scores clínicos ainda não registrados</div>
                <div style={{ fontSize:10, color:"#ccc", marginTop:2 }}>Registre na aba Scores para visualizar aqui</div>
              </div>
              )}

              {/* Composicao corporal */}
              {(mmLast > 0 || mgLast > 0) && (
                <div style={{ padding:"14px", background:"#fff", border:`1px solid ${G[200]}`, borderRadius:8, marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:G[800], marginBottom:10 }}>Composicao corporal</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                    <div style={{ textAlign:"center", padding:"10px 8px", background:S.blueBg, borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:S.blue }}>{mmLast.toFixed(1)}kg</div>
                      <div style={{ fontSize:10, color:S.blue, fontWeight:600 }}>Massa Magra</div>
                      <div style={{ fontSize:10, color:"#aaa" }}>{(mmLast/totComp*100).toFixed(1)}% do total</div>
                    </div>
                    <div style={{ textAlign:"center", padding:"10px 8px", background:S.yelBg, borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:700, color:S.yel }}>{mgLast.toFixed(1)}kg</div>
                      <div style={{ fontSize:10, color:S.yel, fontWeight:600 }}>Massa Gorda</div>
                      <div style={{ fontSize:10, color:"#aaa" }}>{(mgLast/totComp*100).toFixed(1)}% do total</div>
                    </div>
                  </div>
                  <div style={{ height:7, borderRadius:4, overflow:"hidden", display:"flex" }}>
                    <div style={{ width:`${(mmLast/totComp*100).toFixed(1)}%`, background:S.blue }}/>
                    <div style={{ width:`${(mgLast/totComp*100).toFixed(1)}%`, background:S.yel }}/>
                  </div>
                </div>
              )}

              {/* Analise global da composicao corporal */}
              <SectionTitle>Analise global da composicao corporal</SectionTitle>
              <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
                {/* Donut chart */}
                <div style={{ width:180, height:180, flexShrink:0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}
                        label={({ name, value }) => `${value}%`} labelLine={false}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Info list */}
                <div style={{ flex:1, fontSize:11, lineHeight:1.8, minWidth:200 }}>
                  <div style={{ marginBottom:4 }}>
                    <strong>Peso:</strong> {weight.toFixed(1)} kg <DeltaBadge val={deltaW} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
                    <span style={{ display:"inline-block", width:10, height:10, background:G[500], borderRadius:2 }}/>
                    <strong>Massa gorda:</strong> {fatMass.toFixed(1)} kg <DeltaBadge val={deltaFat} />
                  </div>
                  <div style={{ fontSize:9, color:"#888", marginLeft:14, marginBottom:4 }}>Representa toda a massa de gordura presente no corpo.</div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
                    <span style={{ display:"inline-block", width:10, height:10, background:S.grn, borderRadius:2 }}/>
                    <strong>Massa magra:</strong> {leanMass.toFixed(1)} kg <DeltaBadge val={deltaLean} invert />
                  </div>
                  <div style={{ fontSize:9, color:"#888", marginLeft:14, marginBottom:4 }}>Representa o conjunto de musculos, ossos, orgaos e agua.</div>
                  <div style={{ marginBottom:2 }}>
                    <span style={{ color:S.blue }}>&#9679;</span> <strong>Agua corporal:</strong> {waterL.toFixed(1)} L ({waterPct.toFixed(1)}% do peso)
                  </div>
                  <div>
                    <span style={{ color:S.yel }}>&#9679;</span> <strong>Gasto energetico de repouso:</strong> {ger.toFixed(0)} kcal
                  </div>
                </div>
              </div>

              {/* IMC */}
              <SectionTitle>Indice de massa corporal (IMC)</SectionTitle>
              <div style={{ marginBottom:16, padding:"0 4px" }}>
                <div style={{ fontSize:12, marginBottom:4 }}>
                  <strong style={{ fontSize:18, color:imcClass.c }}>{imc.toFixed(1)}</strong> kg/m2 — <span style={{ color:imcClass.c, fontWeight:600 }}>{imcClass.l}</span>
                </div>
                <div style={{ fontSize:9, color:"#888", marginBottom:6 }}>Baixo peso {'<'}18.5 | Eutrofia 18.5-24.9 | Sobrepeso 25-29.9 | Obesidade {'>'}=30</div>
                <ClassBar zones={[
                  { min:0, max:18.5, width:18.5, color:"#85C1E9", label:"Baixo peso" },
                  { min:18.5, max:25, width:6.5, color:"#82E0AA", label:"Eutrofia" },
                  { min:25, max:30, width:5, color:"#F9E79F", label:"Sobrepeso" },
                  { min:30, max:50, width:20, color:"#F1948A", label:"Obesidade" }
                ]} value={imc} />
              </div>

              {/* Percentual de gordura */}
              <SectionTitle>Percentual de gordura</SectionTitle>
              <div style={{ marginBottom:16, padding:"0 4px" }}>
                <div style={{ fontSize:12, marginBottom:4 }}>
                  <strong style={{ fontSize:18, color:fatClass.c }}>{fatPct.toFixed(1)}%</strong> <DeltaBadge val={deltaFatPct} unit="%" />
                </div>
                <div style={{ fontSize:9, color:"#888", marginBottom:6 }}>Avaliacao do percentual de gordura corporal com base em referencias para mulheres.</div>
                <ClassBar zones={[
                  { min:0, max:15, width:15, color:"#85C1E9", label:"Atencao <15%" },
                  { min:15, max:25, width:10, color:"#82E0AA", label:"Baixo risco 15-25%" },
                  { min:25, max:32, width:7, color:"#F9E79F", label:"Moderado 25-32%" },
                  { min:32, max:55, width:23, color:"#F1948A", label:"Alto risco >32%" }
                ]} value={fatPct} prevValue={prevH ? prevFatPct : null} />
                {prevH && (
                  <div style={{ fontSize:8, color:"#aaa", marginTop:16, display:"flex", gap:12 }}>
                    <span>&#9660; Atual</span> <span>&#9679; Anterior</span>
                  </div>
                )}
              </div>

              {/* IMM and IMG side by side */}
              <SectionTitle>Indice de massa magra (IMM) e Indice de massa gorda (IMG)</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                {/* IMM */}
                <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:10 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:4 }}>Indice de massa magra</div>
                  <div style={{ fontSize:16, fontWeight:700, color:immClass.c }}>{imm.toFixed(1)} <span style={{ fontSize:10, fontWeight:400 }}>kg/m2</span> <DeltaBadge val={deltaImm} invert unit="" /></div>
                  <ClassBar zones={[
                    { min:0, max:15, width:15, color:"#F1948A", label:"Baixo <15" },
                    { min:15, max:18, width:3, color:"#82E0AA", label:"Adequado 15-18" },
                    { min:18, max:30, width:12, color:"#85C1E9", label:"Alto >18" }
                  ]} value={imm} prevValue={prevH ? prevImm : null} />
                  <div style={{ fontSize:9, color:"#888", marginTop:16 }}>Resultado: <strong style={{ color:immClass.c }}>{immClass.l}</strong></div>
                </div>
                {/* IMG */}
                <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:10 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:4 }}>Indice de massa gorda</div>
                  <div style={{ fontSize:16, fontWeight:700, color:imgClass.c }}>{img.toFixed(1)} <span style={{ fontSize:10, fontWeight:400 }}>kg/m2</span> <DeltaBadge val={deltaImg} unit="" /></div>
                  <ClassBar zones={[
                    { min:0, max:5, width:5, color:"#85C1E9", label:"Baixo <5" },
                    { min:5, max:9, width:4, color:"#82E0AA", label:"Adequado 5-9" },
                    { min:9, max:25, width:16, color:"#F1948A", label:"Alto >9" }
                  ]} value={img} prevValue={prevH ? prevImg : null} />
                  <div style={{ fontSize:9, color:"#888", marginTop:16 }}>Resultado: <strong style={{ color:imgClass.c }}>{imgClass.l}</strong></div>
                </div>
              </div>

              {/* Relacao Massa magra X Massa gorda */}
              <SectionTitle>Relacao Massa magra X Massa gorda</SectionTitle>
              <div style={{ display:"flex", gap:16, marginBottom:10, flexWrap:"wrap" }}>
                {/* Quadrant chart */}
                <div style={{ flexShrink:0 }}>
                  <table style={{ borderCollapse:"collapse", fontSize:9 }}>
                    <thead>
                      <tr>
                        <th style={{ width:60 }}/>
                        <th style={{ padding:4, textAlign:"center", color:"#888", fontWeight:500 }}>IMG Baixo</th>
                        <th style={{ padding:4, textAlign:"center", color:"#888", fontWeight:500 }}>IMG Adequado</th>
                        <th style={{ padding:4, textAlign:"center", color:"#888", fontWeight:500 }}>IMG Alto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["Alto","Adequada","Baixo"].map((rowLabel, ri) => {
                        const rowIdx = 2 - ri;
                        return (
                          <tr key={ri}>
                            <td style={{ padding:4, fontWeight:500, color:"#888", textAlign:"right" }}>IMM {rowLabel}</td>
                            {[0,1,2].map(ci => {
                              const isHere = rowIdx === immRow && ci === imgCol;
                              const cellColors = [
                                ["#EBF5FB","#E8F8F5","#FEF9E7"],
                                ["#E8F8F5","#EAFAF1","#FDEDEC"],
                                ["#FEF9E7","#FDEDEC","#FDEDEC"]
                              ];
                              return (
                                <td key={ci} style={{ width:56, height:40, textAlign:"center", border:"1px solid #eee", background:cellColors[ri][ci], position:"relative" }}>
                                  {isHere && <div style={{ width:14, height:14, borderRadius:"50%", background:S.grn, border:"2px solid #fff", boxShadow:"0 0 4px rgba(0,0,0,0.2)", margin:"auto" }}/>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Explanation */}
                <div style={{ flex:1, fontSize:10, color:"#666", lineHeight:1.6, minWidth:180 }}>
                  <p style={{ margin:"0 0 4px" }}><strong>IMM (Indice de Massa Magra):</strong> Avalia a quantidade de massa magra em relacao a altura. Valores adequados indicam boa preservacao muscular.</p>
                  <p style={{ margin:"0 0 4px" }}><strong>IMG (Indice de Massa Gorda):</strong> Avalia a quantidade de gordura em relacao a altura. Valores elevados indicam excesso de adiposidade.</p>
                  <p style={{ margin:0 }}>A combinacao desses indices permite classificar a composicao corporal de forma mais precisa que o IMC isolado.</p>
                </div>
              </div>
            </div>

            {/* ═══════════ PAGE 2: Perimetros e Indices ═══════════ */}
            <div className="pdf-page-break" />
            <div style={{ padding:"18px 16px", pageBreakInside:"avoid" }}>

              {/* Silhueta adaptativa com medidas */}
              <SectionTitle>Perimetros corporais</SectionTitle>
              <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
                {/* SVG Silhouette — multi-part female body */}
                {(() => {
                  // Referências femininas saudáveis (cm)
                  const ref = { busto:88, cintura:68, quadril:96, braco:28, pant:36 };
                  const cur = {
                    busto: lastC?.torax || ref.busto,
                    cintura: lastC?.cintura || ref.cintura,
                    quadril: lastC?.quadril || ref.quadril,
                    braco: lastC?.braco || ref.braco,
                    pant: lastC?.panturrilha || ref.pant
                  };
                  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
                  const sc = k => clamp(cur[k] / ref[k], 0.85, 1.35);
                  const cx = 100;
                  // Builds separate body parts for a given set of scale factors
                  const mkParts = (s) => {
                    const bw = 24*s.busto, cw = 18*s.cintura, qw = 26*s.quadril, aw = 6*s.braco, pw = 7*s.pant;
                    return {
                      head: `M${cx} 12 C${cx+12} 12 ${cx+15} 22 ${cx+15} 32 C${cx+15} 42 ${cx+12} 50 ${cx} 50 C${cx-12} 50 ${cx-15} 42 ${cx-15} 32 C${cx-15} 22 ${cx-12} 12 ${cx} 12 Z`,
                      neck: `M${cx-4} 50 L${cx+4} 50 L${cx+5} 60 L${cx-5} 60 Z`,
                      torso: `M${cx-bw} 65 C${cx-bw-2} 80 ${cx-bw+2} 90 ${cx-bw+1} 100 C${cx-cw+4} 120 ${cx-cw} 135 ${cx-cw} 140 C${cx-cw-1} 155 ${cx-qw+4} 165 ${cx-qw} 175 L${cx-qw+3} 190 L${cx-6} 192 L${cx+6} 192 L${cx+qw-3} 190 L${cx+qw} 175 C${cx+qw-4} 165 ${cx+cw+1} 155 ${cx+cw} 140 C${cx+cw} 135 ${cx+cw-4} 120 ${cx+bw-1} 100 C${cx+bw-2} 90 ${cx+bw+2} 80 ${cx+bw} 65 Q${cx+5} 62 ${cx+5} 60 L${cx-5} 60 Q${cx-5} 62 ${cx-bw} 65 Z`,
                      armL: `M${cx-bw} 67 C${cx-bw-6} 70 ${cx-bw-10} 80 ${cx-bw-12} 95 C${cx-bw-13} 105 ${cx-bw-11} 115 ${cx-bw-10} 125 Q${cx-bw-9} 135 ${cx-bw-7} 140 L${cx-bw-7+aw} 140 Q${cx-bw-5+aw} 135 ${cx-bw-4+aw} 125 C${cx-bw-3+aw} 115 ${cx-bw-5+aw} 105 ${cx-bw-4+aw} 95 C${cx-bw-2+aw} 85 ${cx-bw+aw} 75 ${cx-bw+1} 70 Z`,
                      armR: `M${cx+bw} 67 C${cx+bw+6} 70 ${cx+bw+10} 80 ${cx+bw+12} 95 C${cx+bw+13} 105 ${cx+bw+11} 115 ${cx+bw+10} 125 Q${cx+bw+9} 135 ${cx+bw+7} 140 L${cx+bw+7-aw} 140 Q${cx+bw+5-aw} 135 ${cx+bw+4-aw} 125 C${cx+bw+3-aw} 115 ${cx+bw+5-aw} 105 ${cx+bw+4-aw} 95 C${cx+bw+2-aw} 85 ${cx+bw-aw} 75 ${cx+bw-1} 70 Z`,
                      legL: `M${cx-6} 192 L${cx-qw+3} 190 C${cx-qw+1} 210 ${cx-pw-4} 250 ${cx-pw-2} 280 C${cx-pw-1} 300 ${cx-pw} 320 ${cx-pw+1} 338 L${cx-pw-3} 348 L${cx-1} 348 L${cx-1} 338 C${cx-2} 310 ${cx-3} 260 ${cx-4} 220 Z`,
                      legR: `M${cx+6} 192 L${cx+qw-3} 190 C${cx+qw-1} 210 ${cx+pw+4} 250 ${cx+pw+2} 280 C${cx+pw+1} 300 ${cx+pw} 320 ${cx+pw-1} 338 L${cx+pw+3} 348 L${cx+1} 348 L${cx+1} 338 C${cx+2} 310 ${cx+3} 260 ${cx+4} 220 Z`,
                    };
                  };
                  const ideal = mkParts({ busto:1, cintura:1, quadril:1, braco:1, pant:1 });
                  const actual = mkParts({ busto:sc('busto'), cintura:sc('cintura'), quadril:sc('quadril'), braco:sc('braco'), pant:sc('pant') });
                  const renderBody = (parts, fill, stroke, sw, dash, op) => (
                    <>
                      {Object.values(parts).map((d,i) => (
                        <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash||"none"} strokeLinejoin="round" opacity={op||1}/>
                      ))}
                    </>
                  );
                  const bwActual = 24*sc('busto'), cwActual = 18*sc('cintura'), qwActual = 26*sc('quadril');
                  return (
                    <div style={{ width:210, flexShrink:0, position:"relative", padding:"10px 0" }}>
                      <svg viewBox="0 0 200 360" width="200" height="360" style={{ display:"block", margin:"0 auto" }}>
                        <defs>
                          <linearGradient id="bgIdeal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.grn} stopOpacity="0.08"/><stop offset="100%" stopColor={S.grn} stopOpacity="0.02"/></linearGradient>
                          <linearGradient id="bgActual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={G[400]} stopOpacity="0.25"/><stop offset="50%" stopColor={G[300]} stopOpacity="0.15"/><stop offset="100%" stopColor={G[200]} stopOpacity="0.08"/></linearGradient>
                        </defs>
                        {/* Ideal body (green dashed) */}
                        {renderBody(ideal, "url(#bgIdeal)", S.grn, "0.8", "3,3", 0.5)}
                        {/* Actual body (gold filled) */}
                        {renderBody(actual, "url(#bgActual)", G[500], "1", null, 1)}
                        {/* Measurement lines */}
                        <line x1="12" y1="110" x2={cx-bwActual-12} y2="110" stroke={G[400]} strokeWidth="0.5" strokeDasharray="2,2"/>
                        <line x1={cx+bwActual+14} y1="85" x2="192" y2="85" stroke={G[400]} strokeWidth="0.5" strokeDasharray="2,2"/>
                        <line x1={cx+cwActual+4} y1="140" x2="192" y2="140" stroke={G[400]} strokeWidth="0.5" strokeDasharray="2,2"/>
                        <line x1={cx+qwActual+4} y1="178" x2="192" y2="178" stroke={G[400]} strokeWidth="0.5" strokeDasharray="2,2"/>
                        <line x1="12" y1="305" x2={cx-7*sc('pant')-2} y2="305" stroke={G[400]} strokeWidth="0.5" strokeDasharray="2,2"/>
                      </svg>
                      {/* Labels */}
                      <div style={{ position:"absolute", left:0, top:103, fontSize:9, color:G[800], fontWeight:700, textAlign:"right", width:30 }}>
                        {cur.braco}<div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Braço</div>
                      </div>
                      <div style={{ position:"absolute", right:0, top:77, fontSize:9, color:G[800], fontWeight:700 }}>
                        {cur.busto}<div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Tórax</div>
                      </div>
                      <div style={{ position:"absolute", right:0, top:132, fontSize:9, color:G[800], fontWeight:700 }}>
                        {cur.cintura}<div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Cintura</div>
                      </div>
                      <div style={{ position:"absolute", right:0, top:170, fontSize:9, color:G[800], fontWeight:700 }}>
                        {cur.quadril}<div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Quadril</div>
                      </div>
                      <div style={{ position:"absolute", left:0, top:298, fontSize:9, color:G[800], fontWeight:700, textAlign:"right", width:30 }}>
                        {cur.pant}<div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Pant.</div>
                      </div>
                      {/* Legend */}
                      <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:8, fontSize:8, color:"#aaa" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:14, height:2, background:G[500], display:"inline-block" }}/>Atual</span>
                        <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:14, height:0, borderTop:`1.5px dashed ${S.grn}`, display:"inline-block" }}/>Ideal</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Risk bars */}
                <div style={{ flex:1, minWidth:200 }}>
                  {/* Cintura */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>
                      Cintura: <strong>{cintura || "--"} cm</strong>
                      {prevC && cintura > 0 && <DeltaBadge val={cintura - prevCintura} unit="cm" />}
                    </div>
                    {cintura > 0 && <ClassBar zones={[
                      { min:0, max:80, width:80, color:"#82E0AA", label:"Baixo risco <80" },
                      { min:80, max:88, width:8, color:"#F9E79F", label:"Moderado 80-88" },
                      { min:88, max:130, width:42, color:"#F1948A", label:"Alto risco >88" }
                    ]} value={cintura} prevValue={prevCintura || null} />}
                  </div>
                  {/* Quadril */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>
                      Quadril: <strong>{quadril || "--"} cm</strong>
                      {prevC && quadril > 0 && <DeltaBadge val={quadril - prevQuadril} unit="cm" />}
                    </div>
                  </div>
                  {/* RCE */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>
                      Razao cintura-estatura: <strong>{rce > 0 ? rce.toFixed(2) : "--"}</strong>
                      {prevC && rce > 0 && <DeltaBadge val={rce - prevRce} unit="" />}
                    </div>
                    {rce > 0 && <ClassBar zones={[
                      { min:0, max:0.5, width:50, color:"#82E0AA", label:"Baixo risco <0.5" },
                      { min:0.5, max:0.6, width:10, color:"#F9E79F", label:"Moderado 0.5-0.6" },
                      { min:0.6, max:1.0, width:40, color:"#F1948A", label:"Alto risco >0.6" }
                    ]} value={rce} prevValue={prevRce || null} />}
                  </div>
                  {/* RCQ */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>
                      Razao cintura/quadril: <strong>{rcq > 0 ? rcq.toFixed(2) : "--"}</strong>
                      {prevC && rcq > 0 && <DeltaBadge val={rcq - prevRcq} unit="" />}
                    </div>
                    {rcq > 0 && <ClassBar zones={[
                      { min:0, max:0.85, width:85, color:"#82E0AA", label:"Adequado <0.85" },
                      { min:0.85, max:1.2, width:35, color:"#F1948A", label:"Inadequado >=0.85" }
                    ]} value={rcq} prevValue={prevRcq || null} />}
                  </div>
                  <div style={{ fontSize:9, color:"#888", marginTop:8, lineHeight:1.5 }}>
                    Os perimetros corporais sao medidas complementares que auxiliam na avaliacao da distribuicao de gordura e risco cardiometabolico.
                  </div>
                </div>
              </div>

              {/* Indice de conicidade */}
              <SectionTitle>Indice de conicidade</SectionTitle>
              <div style={{ marginBottom:16, padding:"0 4px" }}>
                <div style={{ fontSize:12, marginBottom:4 }}>
                  <strong style={{ fontSize:18, color:conicClass.c }}>{iconicidade > 0 ? iconicidade.toFixed(2) : "--"}</strong>
                  {prevC && iconicidade > 0 && <DeltaBadge val={iconicidade - prevIconicidade} unit="" />}
                </div>
                <div style={{ fontSize:9, color:"#888", marginBottom:6 }}>Avalia o formato corporal: valores mais baixos indicam formato bicocavo (menor risco), enquanto valores elevados indicam formato cilindrico a biconico (maior risco cardiovascular).</div>
                {iconicidade > 0 && <ClassBar zones={[
                  { min:0, max:1.18, width:60, color:"#82E0AA", label:"Adequado <1.18" },
                  { min:1.18, max:1.22, width:10, color:"#F9E79F", label:"Moderado 1.18-1.22" },
                  { min:1.22, max:1.6, width:30, color:"#F1948A", label:"Inadequado >1.22" }
                ]} value={iconicidade} prevValue={prevIconicidade || null} />}
              </div>

              {/* Resumo de indicadores */}
              <SectionTitle>Resumo de indicadores</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:16 }}>
                {[
                  { label:"Percentual de gordura", val:fatClass.l, c:fatClass.c },
                  { label:"Indice de massa gorda", val:imgClass.l, c:imgClass.c },
                  { label:"Indice de massa magra", val:immClass.l, c:immClass.c },
                  { label:"Razao cintura/estatura", val:cintura > 0 ? rceClass.l : "--", c:cintura > 0 ? rceClass.c : "#aaa" },
                  { label:"Razao cintura/quadril", val:rcq > 0 ? rcqClass.l : "--", c:rcq > 0 ? rcqClass.c : "#aaa" },
                  { label:"Indice de conicidade", val:iconicidade > 0 ? conicClass.l : "--", c:iconicidade > 0 ? conicClass.c : "#aaa" }
                ].map((ind, i) => (
                  <div key={i} style={{ textAlign:"center", padding:"8px 6px", border:`1px solid ${G[200]}`, borderRadius:8, background:"#fff" }}>
                    <div style={{ fontSize:9, color:"#888", marginBottom:3 }}>{ind.label}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:ind.c }}>{ind.val}</div>
                  </div>
                ))}
              </div>

              {/* Ser Livre Score */}
              <SectionTitle>Ser Livre Score</SectionTitle>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:10 }}>
                <div style={{ width:80, height:80, borderRadius:"50%", border:`4px solid ${scoreColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
                  <div style={{ fontSize:24, fontWeight:700, color:scoreColor }}>{serLivreScore}</div>
                  <div style={{ fontSize:8, color:"#888" }}>/100</div>
                </div>
                <div style={{ fontSize:10, color:"#666", maxWidth:250 }}>
                  Score composto baseado na media de todos os indicadores corporais avaliados, normalizado para uma escala de 0 a 100.
                </div>
              </div>
            </div>

            {/* ═══════════ PAGE 3: Historico de avaliacoes ═══════════ */}
            <div className="pdf-page-break" />
            <div style={{ padding:"18px 16px" }}>

              <SectionTitle>Evolucao dos indicadores</SectionTitle>
              {/* Evolution charts - 2 column grid */}
              {histFilt.length > 1 && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  {/* Peso */}
                  <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:10, pageBreakInside:"avoid" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Peso <DeltaBadge val={deltaW} /></div>
                    <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>{weight.toFixed(1)} kg</div>
                    <MiniChart data={histFilt.map(h => ({ v:h.weight }))} dataKey="v" color={G[600]} />
                  </div>
                  {/* Fat % */}
                  <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:10, pageBreakInside:"avoid" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Percentual de gordura <DeltaBadge val={deltaFatPct} unit="%" /></div>
                    <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>{fatPct.toFixed(1)}%</div>
                    <MiniChart data={histFilt.map(h => { const t=(h.massaMagra||0)+(h.massaGordura||0)||1; return { v: (h.massaGordura||0)/t*100 }; })} dataKey="v" color={S.yel} />
                  </div>
                  {/* Lean mass */}
                  <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:10, pageBreakInside:"avoid" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Massa magra <DeltaBadge val={deltaLean} invert /></div>
                    <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>{leanMass.toFixed(1)} kg</div>
                    <MiniChart data={histFilt.map(h => ({ v:h.massaMagra||0 }))} dataKey="v" color={S.grn} />
                  </div>
                  {/* Fat mass */}
                  <div style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:10, pageBreakInside:"avoid" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Massa gorda <DeltaBadge val={deltaFat} /></div>
                    <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>{fatMass.toFixed(1)} kg</div>
                    <MiniChart data={histFilt.map(h => ({ v:h.massaGordura||0 }))} dataKey="v" color={S.red} />
                  </div>
                </div>
              )}

              {/* Indicadores reference table */}
              <SectionTitle>Tabela de indicadores</SectionTitle>
              <div style={{ overflowX:"auto", marginBottom:16 }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                  <thead>
                    <tr style={{ background:G[50] }}>
                      <th style={{ textAlign:"left", padding:"6px 8px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600 }}>Indicador</th>
                      <th style={{ textAlign:"left", padding:"6px 8px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600 }}>Referencia</th>
                      {prevH && <th style={{ textAlign:"center", padding:"6px 8px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600 }}>{safeFmt(prevH.date, "dd/MM/yy")}</th>}
                      <th style={{ textAlign:"center", padding:"6px 8px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600 }}>{lastH ? safeFmt(lastH.date, "dd/MM/yy") : "Atual"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label:"IMG (kg/m2)", ref:"5 - 9", prev:prevImg.toFixed(1), cur:img.toFixed(1), c:imgClass.c },
                      { label:"IMM (kg/m2)", ref:"15 - 18", prev:prevImm.toFixed(1), cur:imm.toFixed(1), c:immClass.c },
                      { label:"Razao cintura/estatura", ref:"< 0.5", prev:prevRce > 0 ? prevRce.toFixed(2) : "--", cur:rce > 0 ? rce.toFixed(2) : "--", c:rceClass.c },
                      { label:"Razao cintura/quadril", ref:"< 0.85", prev:prevRcq > 0 ? prevRcq.toFixed(2) : "--", cur:rcq > 0 ? rcq.toFixed(2) : "--", c:rcqClass.c },
                      { label:"Indice de conicidade", ref:"< 1.18", prev:prevIconicidade > 0 ? prevIconicidade.toFixed(2) : "--", cur:iconicidade > 0 ? iconicidade.toFixed(2) : "--", c:conicClass.c }
                    ].map((row, i) => (
                      <tr key={i} style={{ background:i % 2 === 0 ? "#fff" : G[50] }}>
                        <td style={{ padding:"5px 8px", borderBottom:`1px solid ${G[100]}`, fontWeight:600 }}>{row.label}</td>
                        <td style={{ padding:"5px 8px", borderBottom:`1px solid ${G[100]}`, color:"#888" }}>{row.ref}</td>
                        {prevH && <td style={{ padding:"5px 8px", borderBottom:`1px solid ${G[100]}`, textAlign:"center" }}>{row.prev}</td>}
                        <td style={{ padding:"5px 8px", borderBottom:`1px solid ${G[100]}`, textAlign:"center", fontWeight:600, color:row.c }}>{row.cur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Circumference evolution charts */}
              {circFilt.length > 1 && (
                <>
                  <SectionTitle>Evolucao de perimetros</SectionTitle>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                    {CIRC_FIELDS.map(f => {
                      const curVal = lastC?.[f.key];
                      const prevVal = prevC?.[f.key];
                      const delta = (curVal != null && prevVal != null) ? curVal - prevVal : null;
                      return (
                        <div key={f.key} style={{ border:`1px solid ${G[200]}`, borderRadius:8, padding:8, pageBreakInside:"avoid" }}>
                          <div style={{ fontSize:10, fontWeight:600, color:G[700], marginBottom:2 }}>
                            {f.label}: {curVal != null ? `${curVal} cm` : "--"}
                            {delta !== null && <DeltaBadge val={delta} unit="cm" />}
                          </div>
                          <MiniChart
                            data={circFilt.map(c => ({ v: c[f.key] || 0 }))}
                            dataKey="v"
                            color={G[500]}
                            height={45}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Scores clinicos */}
              <SectionTitle>Scores clinicos atuais</SectionTitle>
              <div style={{ marginBottom:12 }}>
                {[{l:"Saude metabolica",t:met,m:24,fn:sM},{l:"Bem-estar",t:be,m:18,fn:sB},{l:"Blindagem mental",t:mn,m:9,fn:sN}].map((s,i) => {
                  const st=s.fn(s.t);
                  return <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${G[100]}`, flexWrap:"wrap", gap:3 }}><span style={{ fontSize:12 }}>{s.l}</span><div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:80, height:6, background:G[100], borderRadius:3, overflow:"hidden" }}><div style={{ height:"100%", width:`${(s.t/s.m*100).toFixed(0)}%`, background:st.c, borderRadius:3 }}/></div><Bg color={st.c} bg={st.bg}>{st.e} {s.t}/{s.m} — {st.l}</Bg></div></div>;
                })}
              </div>

              {/* Comparativo mensal (se ativado e houver dados) */}
              {relComp && shFilt.length >= 2 && (
                <div style={{ marginBottom:12, pageBreakInside:"avoid" }}>
                  <SectionTitle>Comparativo: {comp1.month} - {comp2.month}</SectionTitle>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8 }}>
                    {[{l:"Metabolico",c1:cM(comp1.m),c2:cM(comp2.m),max:24,fn:sM},{l:"Bem-estar",c1:cB(comp1.b),c2:cB(comp2.b),max:18,fn:sB},{l:"Mental",c1:cN(comp1.n),c2:cN(comp2.n),max:9,fn:sN}].map((s,i)=>{
                      const d=s.c2-s.c1; const st=s.fn(s.c2);
                      return <div key={i} style={{ textAlign:"center", padding:"10px 8px", background:st.bg, borderRadius:8 }}>
                        <div style={{ fontSize:11, color:st.c, fontWeight:600 }}>{s.l}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:st.c }}>{s.c2}/{s.max}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:d>0?S.grn:d<0?S.red:"#aaa", marginTop:3 }}>{d>0?"+":""}{d!==0?d:"="} pts</div>
                        <div style={{ fontSize:9, color:"#aaa" }}>era {s.c1}</div>
                      </div>;
                    })}
                  </div>
                </div>
              )}

              {/* Plano de acao */}
              <SectionTitle>Plano de acao</SectionTitle>
              <div style={{ marginBottom:12 }}>
                {met<=12 && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11, border:`1px solid #F5B7B1` }}><strong style={{ color:S.red }}>Metabolico critico</strong> — Protocolo de ataque + detox</div>}
                {be<10   && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11, border:`1px solid #F5B7B1` }}><strong style={{ color:S.red }}>Bem-estar critico</strong> — Intervencao medica imediata</div>}
                {met>=13 && met<=16 && <div style={{ padding:"6px 10px", background:S.yelBg, borderRadius:6, marginBottom:4, fontSize:11, border:`1px solid #F9E79F` }}><strong style={{ color:S.yel }}>Transicao metabolica</strong> — Ajustes terapeuticos</div>}
                {met>=17 && <div style={{ padding:"6px 10px", background:S.grnBg, borderRadius:6, marginBottom:4, fontSize:11, border:`1px solid #ABEBC6` }}><strong style={{ color:S.grn }}>Saudavel</strong> — Manutencao + evolucao continua</div>}
                {mn<=4   && <div style={{ padding:"6px 10px", background:S.redBg, borderRadius:6, marginBottom:4, fontSize:11, border:`1px solid #F5B7B1` }}><strong style={{ color:S.red }}>Risco de recaida</strong> — Sessao individual com psicologa</div>}
                {be>=10&&be<=13&&met>=17 && <div style={{ padding:"6px 10px", background:S.yelBg, borderRadius:6, marginBottom:4, fontSize:11, border:`1px solid #F9E79F` }}><strong style={{ color:S.yel }}>Bem-estar em alerta</strong> — Nutricionista intervem</div>}
              </div>

              {/* Rodape */}
              <div style={{ textAlign:"center", padding:"16px 0 8px", borderTop:`1px solid ${G[200]}`, fontSize:10, color:"#999", marginTop:10 }}>
                <div style={{ fontWeight:600, color:G[700] }}>Dra. Mariana Wogel — Nutrologa</div>
                <div>Praca Sao Sebastiao 119 — Tres Rios, RJ</div>
                <div style={{ fontSize:9, color:"#ccc", marginTop:4 }}>Relatorio gerado em {format(new Date(),"dd/MM/yyyy 'as' HH:mm")}</div>
              </div>
            </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   DETALHE DO PACIENTE (5 abas)
═══════════════════════════════════════════════ */
function PDetail({  p, onBack, mob, avs, setAvs, onSaveScores, onAddWeighIn, onAddCircumference, onLog, onAddScoreMonth, onChangePlan, activityLog, onDelete, onFinish, onRestart, onEdit, onSendMsg, messages, setMessages, currentUser }) {
  const SC = genSC([p]);
  const [tab, setTab]   = useState("ficha");
  const plan = PLANS.find(x=>x.id===p.plan);
  const tier = plan?.tier || 1;
  const ft   = TIER[tier];
  const sc   = SC[p.id];
  const met  = cM(sc?.m); const be = cB(sc?.b); const mn = cN(sc?.n);
  const pm   = sc ? pM(sc.m) : {comp:0,infl:0,glic:0,card:0};
  // Histórico de evolução de scores (dados REAIS, não mock)
  const hist = (p.scoreHistory || []).map(s => ({
    mo: s.month || safeFmt(s.date, 'MMM/yy'),
    met: cM(s.m), be: cB(s.b), mn: cN(s.n),
  }));
  const [cl, setCl]   = useState(() => genCL(p, tier, p._activeCycle?.weekChecks || []));
  const [savingWeek, setSavingWeek] = useState(false);
  // Estado para edição de scores — inicializa com o último score ou valores padrão (2 = moderado)
  const DEFAULT_SCORE = { m:{gv:2,mm:2,pcr:2,fer:2,hb:2,au:2,th:2,ca:2}, b:{gi:2,lib:2,dor:2,au:2,en:2,so:2}, n:{co:2,ge:2,mv:2} };
  const [es, setEs]          = useState(JSON.parse(JSON.stringify(DEFAULT_SCORE)));
  const [scoreFormOpen, setScoreFormOpen] = useState(false);
  // Seletor de período do score — datas livres (início e fim da semana)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [scoreStartDate, setScoreStartDate] = useState(todayStr);
  const [scoreEndDate,   setScoreEndDate]   = useState(todayStr);
  // scoreRef continua sendo o valor serializado salvo no DB
  const buildScoreRef = (s, e) => {
    const sf = s ? format(new Date(s+'T12:00:00'), 'dd/MM/yy') : '?';
    const ef = e ? format(new Date(e+'T12:00:00'), 'dd/MM/yy') : '?';
    return `${sf} — ${ef}`;
  };
  const [scoreRef, setScoreRef] = useState(() => buildScoreRef(todayStr, todayStr));
  const [sw, setSw]   = useState(p.week);
  const [showWeighIn, setShowWeighIn] = useState(false);
  const [showCircumferenceModal, setShowCircumferenceModal] = useState(false);
  const [medView, setMedView] = useState("avaliacao");
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [newPlanId, setNewPlanId] = useState(p.plan);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(p.name);
  const [editPhone, setEditPhone] = useState(p.phone||'');
  const [editEmail, setEditEmail] = useState(p.email||'');
  const [editBirth, setEditBirth] = useState(p.birthDate||'');

  const tabs = [
    {k:"ficha",          l:"Ficha",      i:User},
    {k:"jornada",        l:"Jornada",    i:ClipboardCheck},
    {k:"scores",         l:"Scores",     i:Activity},
    {k:"evolucao",       l:"Evolução",   i:TrendingUp},
    {k:"graficos",       l:"Gráficos",   i:BarChart3},
    {k:"circunferencias",l:"Medidas",    i:Lucide.Ruler},
    {k:"msgs",           l:"Mensagens",  i:MessageCircle},
    {k:"rel",            l:"Relatório",  i:FileText},
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
                    { label:"Telefone / WhatsApp", val:editPhone, set:setEditPhone, type:"tel", ph:"(24) 99999-0000" },
                    { label:"Data de nascimento", val:editBirth, set:setEditBirth, type:"date" },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom:12 }}>
                      <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
                      <input type={f.type} value={f.val} placeholder={f.ph||""}
                        onChange={e=>f.set(f.type==='tel' ? maskPhone(e.target.value) : e.target.value)}
                        style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>{ const upd={name:editName,email:editEmail,phone:editPhone,birthDate:editBirth}; onEdit&&onEdit(upd); setShowEditModal(false); }} style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Salvar</button>
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
            const _ph = p.history||[];
            const last = _ph[_ph.length-1] || {};
            const mm = last.massaMagra || 0;
            const mg = last.massaGordura || 0;
            const tot = mm + mg || 1;
            const pctMM = (mm/tot*100).toFixed(1);
            const pctMG = (mg/tot*100).toFixed(1);
            return (
              <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Composição corporal</span>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    <button onClick={()=>setShowWeighIn(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7, background:G[600], color:"#fff", fontSize:11, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}><Plus size={11}/>Registrar pesagem</button>
                    <button onClick={()=>setShowCircumferenceModal(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:7, background:"#fff", color:G[700], fontSize:11, fontWeight:600, border:`1px solid ${G[300]}`, cursor:"pointer", fontFamily:"inherit" }}>📏 Medidas</button>
                  </div>
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
                {(p.history||[]).length > 1 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:6 }}>Histórico de pesagens</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:320 }}>
                        <thead><tr>{["Data","Peso","MM (kg)","%MM","MG (kg)","%MG"].map(h=><th key={h} style={{ textAlign:"left", padding:"4px 6px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                        <tbody>{[...(p.history||[])].reverse().map((h,i)=>{ const t=(h.massaMagra||0)+(h.massaGordura||0)||1; return <tr key={i} style={{ background:i===0?G[50]:"transparent" }}><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:"#aaa", fontSize:10 }}>{safeFmt(h.date,"dd/MM/yy")}</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, fontWeight:i===0?600:400 }}>{h.weight.toFixed(1)}kg</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.blue }}>{(h.massaMagra||0).toFixed(1)}</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.blue }}>{(h.massaMagra||0)>0?(h.massaMagra/t*100).toFixed(0):"-"}%</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.yel }}>{(h.massaGordura||0).toFixed(1)}</td><td style={{ padding:"5px 6px", borderBottom:`1px solid ${G[50]}`, color:S.yel }}>{(h.massaGordura||0)>0?(h.massaGordura/t*100).toFixed(0):"-"}%</td></tr>; })}
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
                    <div style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap" }}>{safeFmt(a.date,"dd/MM HH:mm")}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Curva de peso</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={(p.history||[]).map((h,i)=>({s:`S${i+1}`,w:h.weight}))}>
                <defs><linearGradient id="gpp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={G[500]} stopOpacity={0.25}/><stop offset="100%" stopColor={G[500]} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis domain={["dataMin-2","dataMax+1"]} tick={{fontSize:9,fill:"#bbb"}}/>
                <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Area type="monotone" dataKey="w" stroke={G[500]} fill="url(#gpp)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {showWeighIn && <WeighInModal p={p} onClose={()=>setShowWeighIn(false)} onSave={(entry)=>{ onAddWeighIn && onAddWeighIn(entry); setShowWeighIn(false); }} onLog={onLog} onSendMsg={onSendMsg}/>}
          {showCircumferenceModal && <CircumferenceModal p={p} onClose={()=>setShowCircumferenceModal(false)} onSave={()=>{ onAddCircumference && onAddCircumference(); }} onLog={onLog}/>}
        </div>
      )}

      {/* ABA JORNADA */}
      {tab==="jornada" && (
        <div>
          <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
            {Array.from({length:16},(_,i)=>i+1).map(w => {
              const sp=w===8||w===16; const cur=w===p.week; const done=cl[w]?.concluida;
              const isSel = sw===w;
              return <div key={w} onClick={()=>setSw(w)} style={{ width:30, height:30, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:11, fontWeight:cur||isSel?700:500, background:isSel?G[600]:done?S.grnBg:cur?G[100]:"#fff", color:isSel?"#fff":done?S.grn:G[800], border:sp?`2px solid ${G[500]}`:`1px solid ${done?S.grn:G[200]}`, position:"relative" }}>
                {w}
                {done && !isSel && <div style={{ position:"absolute", top:-3, right:-3, width:8, height:8, borderRadius:"50%", background:S.grn, border:"1.5px solid #fff" }}/>}
              </div>;
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
              {/* Botão Concluir / Reabrir semana */}
              <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${G[200]}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                {cl[sw].concluida ? (
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, background:S.grnBg, border:`1px solid ${S.grn}`, flex:1 }}>
                      <Check size={14} color={S.grn}/>
                      <span style={{ fontSize:12, fontWeight:600, color:S.grn }}>Semana {sw} concluída</span>
                    </div>
                    <button
                      disabled={savingWeek}
                      onClick={async () => {
                        setSavingWeek(true);
                        setCl(pr => ({ ...pr, [sw]: { ...pr[sw], concluida: false } }));
                        setSavingWeek(false);
                      }}
                      style={{ padding:"8px 14px", borderRadius:8, background:"#fff", border:`1px solid ${G[300]}`, color:G[600], fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                      Reabrir
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={savingWeek}
                    onClick={async () => {
                      const cycleId = p._activeCycle?.id;
                      if (!cycleId) return;
                      setSavingWeek(true);
                      try {
                        const w = cl[sw];
                        await apiSaveWeekCheck({
                          cycleId,
                          weekNumber: sw,
                          tirzepatida: !!w.tirz,
                          tirzepatidaDose: w.dose || "2.5mg",
                          terapiaInjetavel: w.ter != null ? !!w.ter : undefined,
                          pesagem: !!w.peso,
                          sessaoPsicologia: w.psi != null ? !!w.psi : undefined,
                          bioimpedancia: !!w.bio,
                          treino1: w.tr?.[0] || false,
                          treino2: w.tr?.[1] || false,
                          treino3: w.tr?.[2] != null ? w.tr[2] : undefined,
                          nutriAvaliacaoCompleta: w.nu ? !!w.nu.av : undefined,
                          nutriPlanoAlimentar: w.nu ? !!w.nu.pl : undefined,
                          nutriScoresClinicos: w.nu ? !!w.nu.sc : undefined,
                          weekDate: w.weekDate || new Date().toISOString(),
                        });
                        setCl(pr => ({ ...pr, [sw]: { ...pr[sw], concluida: true } }));
                        onLog && onLog({ action:"checklist", patientId:p.id, patientName:p.name, detail:`Semana ${sw} concluída` });
                      } catch (err) {
                        console.error('Erro ao salvar semana:', err);
                      } finally {
                        setSavingWeek(false);
                      }
                    }}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 16px", borderRadius:8, background:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:savingWeek?"wait":"pointer", fontFamily:"inherit", opacity:savingWeek?0.7:1 }}>
                    <Check size={14}/>{savingWeek ? "Salvando..." : `Concluir semana ${sw}`}
                  </button>
                )}
              </div>
            </div>
            </div>
          )}
        </div>
      )}

      {/* ABA SCORES */}
      {tab==="scores" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* Header com botão novo score */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>Histórico de scores</div>
            <button onClick={()=>{ setEs(JSON.parse(JSON.stringify(DEFAULT_SCORE))); setScoreRef(buildScoreRef(todayStr, todayStr)); setScoreFormOpen(true); }} style={{ padding:"7px 14px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>+ Novo score</button>
          </div>

          {/* Lista de scores históricos */}
          {(p.scoreHistory||[]).length===0 ? (
            <div style={{ textAlign:"center", padding:40, color:"#ccc", background:"#fff", borderRadius:10, border:`1px solid ${G[200]}` }}>
              <Activity size={32} color="#ddd" style={{ margin:"0 auto 8px", display:"block" }}/>
              <div style={{ fontSize:13 }}>Nenhum score registrado</div>
              <div style={{ fontSize:11, marginTop:4 }}>Clique em "+ Novo score" para registrar</div>
            </div>
          ) : (
            [...(p.scoreHistory||[])].reverse().map((s, i) => {
              const tm=cM(s.m), tb=cB(s.b), tn=cN(s.n);
              const stm=sM(tm), stb=sB(tb), stn=sN(tn);
              return (
                <div key={s.id||i} style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div>
                      {/* Exibe o período do score — suporta formato antigo S01 e novo dd/MM/yy — dd/MM/yy */}
                      {s.month?.startsWith('S') ? (
                        <>
                          <span style={{ fontSize:13, fontWeight:700, color:G[800] }}>Semana {parseInt(s.month.slice(1,3))}</span>
                          <span style={{ fontSize:11, color:"#aaa", marginLeft:6 }}>{s.month.split(' — ')[1] || ''}</span>
                        </>
                      ) : s.month?.includes(' — ') ? (
                        <>
                          <span style={{ fontSize:12, fontWeight:700, color:G[800] }}>📅 {s.month.split(' — ')[0]}</span>
                          <span style={{ fontSize:11, color:"#aaa", marginLeft:4 }}>→ {s.month.split(' — ')[1]}</span>
                        </>
                      ) : (
                        <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>{s.month}</span>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:"#aaa" }}>{s.date ? format(new Date(s.date),"dd/MM/yy") : ""}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                    {[{l:"Metabólico",v:tm,max:24,st:stm},{l:"Bem-estar",v:tb,max:18,st:stb},{l:"Mental",v:tn,max:9,st:stn}].map((x,j)=>(
                      <div key={j} style={{ background:x.st.bg, borderRadius:8, padding:"8px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:x.st.c, fontWeight:600 }}>{x.l}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:x.st.c }}>{x.v}</div>
                        <div style={{ fontSize:9, color:"#aaa" }}>/ {x.max}</div>
                        <div style={{ fontSize:9, fontWeight:600, color:x.st.c }}>{x.st.e} {x.st.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Modal novo score */}
          {scoreFormOpen && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"20px 0" }} onClick={e=>e.target===e.currentTarget&&setScoreFormOpen(false)}>
              <div style={{ background:"#f5f5f3", borderRadius:14, width:"min(520px,95vw)", padding:"16px", display:"flex", flexDirection:"column", gap:10, margin:"auto" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:G[800] }}>Novo score clínico</div>
                  <button onClick={()=>setScoreFormOpen(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa", lineHeight:1 }}>✕</button>
                </div>
                {/* Período de referência — datas livres */}
                <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"10px 14px" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:G[700], marginBottom:2 }}>Período de referência</div>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:8 }}>Informe o início e fim da semana em que este score foi coletado</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div>
                      <label style={{ fontSize:10, fontWeight:500, color:G[600], display:"block", marginBottom:3 }}>Início da semana</label>
                      <input type="date" value={scoreStartDate}
                        onChange={e=>{ setScoreStartDate(e.target.value); setScoreRef(buildScoreRef(e.target.value, scoreEndDate)); }}
                        style={{ width:"100%", padding:"8px 10px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:500, color:G[600], display:"block", marginBottom:3 }}>Fim da semana</label>
                      <input type="date" value={scoreEndDate}
                        onChange={e=>{ setScoreEndDate(e.target.value); setScoreRef(buildScoreRef(scoreStartDate, e.target.value)); }}
                        style={{ width:"100%", padding:"8px 10px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                    </div>
                  </div>
                  {scoreRef && <div style={{ fontSize:10, color:G[500], marginTop:6, textAlign:"center" }}>📅 Período: <strong>{scoreRef}</strong></div>}
                </div>
                {/* Metabólico */}
                <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>🧬 Saúde metabólica (8-24)</div>
                  <div style={{ fontSize:11, color:G[600], marginBottom:8 }}>Pilar 1 — Composição corporal</div>
                  <SI label="Gordura visceral" value={es.m.gv} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,gv:v}}))} opts={[{v:1,l:">10"},{v:2,l:"6-10"},{v:3,l:"1-5"}]}/>
                  <SI label="Massa muscular"   value={es.m.mm} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,mm:v}}))} opts={[{v:1,l:"Baixa"},{v:2,l:"Ideal"},{v:3,l:"Alta"}]}/>
                  <div style={{ fontSize:11, color:G[600], marginTop:8, marginBottom:4 }}>Pilar 2 — Inflamação</div>
                  <SI label="PCR ultra" value={es.m.pcr} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,pcr:v}}))} opts={[{v:1,l:">10"},{v:2,l:"5-10"},{v:3,l:"<5"}]}/>
                  <SI label="Ferritina" value={es.m.fer} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,fer:v}}))} opts={[{v:1,l:"Elevada"},{v:2,l:"Moderada"},{v:3,l:"Normal"}]}/>
                  <div style={{ fontSize:11, color:G[600], marginTop:8, marginBottom:4 }}>Pilar 3 — Controle glicêmico</div>
                  <SI label="Hb glicada" value={es.m.hb} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,hb:v}}))} opts={[{v:1,l:">6,4%"},{v:2,l:"5,5-6,4%"},{v:3,l:"<5,4%"}]}/>
                  <SI label="Ác. úrico"  value={es.m.au} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,au:v}}))} opts={[{v:1,l:"Elevado"},{v:2,l:"Limítrofe"},{v:3,l:"Ideal"}]}/>
                  <div style={{ fontSize:11, color:G[600], marginTop:8, marginBottom:4 }}>Pilar 4 — Cardiovascular</div>
                  <SI label="Trig/HDL"   value={es.m.th} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,th:v}}))} opts={[{v:1,l:">4"},{v:2,l:"2-4"},{v:3,l:"<2"}]}/>
                  <SI label="Circ. abd." value={es.m.ca} onChange={v=>setEs(pr=>({...pr,m:{...pr.m,ca:v}}))} opts={[{v:1,l:"Elevada"},{v:2,l:"Moderada"},{v:3,l:"Normal"}]}/>
                  {(()=>{ const t=cM(es.m); const s=sM(t); return <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:s.bg, display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600, color:s.c, fontSize:12 }}>{s.e} {t}/24 — {s.l}</span><span style={{ fontSize:11, color:s.c }}>{s.d}</span></div>; })()}
                </div>
                {/* Bem-estar */}
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
                {/* Mental */}
                <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>🧩 Blindagem mental (3-9)</div>
                  <SI label="Consistência alimentar" value={es.n.co} onChange={v=>setEs(pr=>({...pr,n:{...pr.n,co:v}}))} opts={[{v:1,l:"Baixa"},{v:2,l:"70-90%"},{v:3,l:">90%"}]}/>
                  <SI label="Gestão emocional"       value={es.n.ge} onChange={v=>setEs(pr=>({...pr,n:{...pr.n,ge:v}}))} opts={[{v:1,l:"Sem"},{v:2,l:"Identifica"},{v:3,l:"Controla"}]}/>
                  <SI label="Movimento"              value={es.n.mv} onChange={v=>setEs(pr=>({...pr,n:{...pr.n,mv:v}}))} opts={[{v:1,l:"Sedentário"},{v:2,l:"Parcial"},{v:3,l:"Completo"}]}/>
                  {(()=>{ const t=cN(es.n); const s=sN(t); return <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:s.bg, display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600, color:s.c, fontSize:12 }}>{s.e} {t}/9 — {s.l}</span><span style={{ fontSize:11, color:s.c }}>{s.d}</span></div>; })()}
                </div>
                <button onClick={()=>{ onSaveScores&&onSaveScores(es,scoreRef); onLog&&onLog({action:"scores",patientId:p.id,patientName:p.name,detail:"Scores metabólicos atualizados"}); setScoreFormOpen(false); }} style={{ width:"100%", padding:"11px", borderRadius:8, background:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>💾 Salvar score</button>
              </div>
            </div>
          )}
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

      {/* ABA MENSAGENS */}
      {/* ABA CIRCUNFERÊNCIAS */}
      {tab==="circunferencias" && (() => {
        const circ = p.circumferenceHistory || [];
        const hist = p.history || [];
        const COLORS = { torax:S.blue, abdomen:S.red, cintura:S.grn, quadril:S.yel, coxa:"#8E44AD", panturrilha:S.pur, braco:"#E67E22", antebraco:"#D35400" };
        const lastCirc = circ[circ.length - 1];
        const prevCirc = circ[circ.length - 2];
        const lastBody = hist[hist.length - 1];
        const prevBody = hist[hist.length - 2];
        const heightCm = p.height || 165;
        const heightM = heightCm / 100;
        const curWeight = lastBody?.weight || p.cw || null;
        const prevWeight = prevBody?.weight || p.iw || null;
        const curMagra = lastBody?.massaMagra || null;
        const prevMagra = prevBody?.massaMagra || null;
        const curGorda = lastBody?.massaGordura || null;
        const prevGorda = prevBody?.massaGordura || null;
        const fatPct = (curWeight && curGorda) ? ((curGorda / curWeight) * 100) : null;
        const prevFatPct = (prevWeight && prevGorda) ? ((prevGorda / prevWeight) * 100) : null;
        const leanPct = fatPct != null ? (100 - fatPct) : null;
        const waterEst = curMagra ? (curMagra * 0.723) : null;
        const ger = curMagra ? Math.round(500 + 22 * curMagra) : null;
        const imc = curWeight ? (curWeight / (heightM * heightM)) : null;
        const prevImc = prevWeight ? (prevWeight / (heightM * heightM)) : null;
        const imm = curMagra ? (curMagra / (heightM * heightM)) : null;
        const img = curGorda ? (curGorda / (heightM * heightM)) : null;
        const prevImm = prevMagra ? (prevMagra / (heightM * heightM)) : null;
        const prevImg = prevGorda ? (prevGorda / (heightM * heightM)) : null;
        const cintura = lastCirc?.cintura || null;
        const quadril = lastCirc?.quadril || null;
        const prevCintura = prevCirc?.cintura || null;
        const prevQuadril = prevCirc?.quadril || null;
        const rcq = (cintura && quadril) ? (cintura / quadril) : null;
        const rce = cintura ? (cintura / heightCm) : null;
        const ic = (cintura && curWeight) ? ((cintura / 100) / (0.109 * Math.sqrt(curWeight / heightM))) : null;

        // Helpers
        const delta = (cur, prev, inv) => {
          if (cur == null || prev == null) return null;
          const d = cur - prev;
          const better = inv ? d < 0 : d > 0;
          return { val: d, better };
        };
        const DeltaBadge = ({ cur, prev, inv, unit, dec }) => {
          const d = delta(cur, prev, inv);
          if (!d) return null;
          const txt = `${d.val > 0 ? '+' : ''}${d.val.toFixed(dec||1)}${unit||''}`;
          return <span style={{ fontSize:9, fontWeight:600, padding:"1px 5px", borderRadius:4, marginLeft:4, background: d.better ? S.grnBg : S.redBg, color: d.better ? S.grn : S.red }}>{txt}</span>;
        };

        // Classification bar component
        const ClassBar = ({ value, zones, unit, height }) => {
          if (value == null) return null;
          const h = height || 14;
          const totalRange = zones[zones.length - 1].max - zones[0].min;
          const clamp = Math.max(zones[0].min, Math.min(zones[zones.length - 1].max, value));
          const pct = ((clamp - zones[0].min) / totalRange) * 100;
          return (
            <div style={{ position:"relative", width:"100%", marginTop:4 }}>
              <div style={{ display:"flex", height:h, borderRadius:h/2, overflow:"hidden" }}>
                {zones.map((z, i) => {
                  const w = ((z.max - z.min) / totalRange) * 100;
                  return <div key={i} style={{ width:`${w}%`, background:z.color, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:7, color:"#fff", fontWeight:600, textShadow:"0 1px 2px rgba(0,0,0,0.3)" }}>{z.label}</span></div>;
                })}
              </div>
              <div style={{ position:"absolute", top:-3, left:`calc(${pct}% - 5px)`, width:10, height:h+6, borderRadius:3, background:"#333", border:"2px solid #fff", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
              <div style={{ fontSize:9, fontWeight:600, color:G[800], marginTop:4 }}>{value.toFixed(1)}{unit||''}</div>
            </div>
          );
        };

        // Get classification
        const classify = (val, zones) => {
          if (val == null) return { label:"--", color:"#aaa" };
          for (const z of zones) { if (val >= z.min && val < z.max) return { label:z.label, color:z.color }; }
          return { label:zones[zones.length-1].label, color:zones[zones.length-1].color };
        };

        // Zone definitions (female)
        const IMC_ZONES = [
          { min:14, max:18.5, label:"Baixo peso", color:S.blue },
          { min:18.5, max:25, label:"Eutrofia", color:S.grn },
          { min:25, max:30, label:"Sobrepeso", color:S.yel },
          { min:30, max:45, label:"Obesidade", color:S.red },
        ];
        const FAT_ZONES = [
          { min:5, max:15, label:"Atencao", color:S.blue },
          { min:15, max:25, label:"Baixo risco", color:S.grn },
          { min:25, max:32, label:"Moderado", color:S.yel },
          { min:32, max:50, label:"Alto risco", color:S.red },
        ];
        const IMM_ZONES = [
          { min:10, max:15, label:"Baixo", color:S.yel },
          { min:15, max:18, label:"Adequado", color:S.grn },
          { min:18, max:26, label:"Alto", color:S.blue },
        ];
        const IMG_ZONES = [
          { min:1, max:5, label:"Baixo", color:S.blue },
          { min:5, max:9, label:"Adequado", color:S.grn },
          { min:9, max:20, label:"Alto", color:S.red },
        ];
        const CINTURA_ZONES = [
          { min:55, max:80, label:"Baixo risco", color:S.grn },
          { min:80, max:88, label:"Moderado", color:S.yel },
          { min:88, max:130, label:"Alto risco", color:S.red },
        ];
        const RCE_ZONES = [
          { min:0.3, max:0.5, label:"Baixo risco", color:S.grn },
          { min:0.5, max:0.6, label:"Moderado", color:S.yel },
          { min:0.6, max:0.9, label:"Alto risco", color:S.red },
        ];
        const RCQ_ZONES = [
          { min:0.5, max:0.85, label:"Adequado", color:S.grn },
          { min:0.85, max:1.1, label:"Inadequado", color:S.red },
        ];
        const IC_ZONES = [
          { min:0.9, max:1.18, label:"Adequado", color:S.grn },
          { min:1.18, max:1.22, label:"Moderado", color:S.yel },
          { min:1.22, max:1.5, label:"Inadequado", color:S.red },
        ];

        // Card style
        const cardS = { background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px 16px", marginBottom:0 };
        const secTitle = (t) => <div style={{ fontSize:13, fontWeight:700, color:G[800], marginBottom:10 }}>{t}</div>;
        const infoRow = (label, val, unit, deltaCur, deltaPrev, inv) => (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${G[50]}` }}>
            <span style={{ fontSize:11, color:G[600] }}>{label}</span>
            <span style={{ fontSize:13, fontWeight:700, color:G[800] }}>
              {val != null ? `${typeof val === 'number' ? val.toFixed(1) : val}${unit||''}` : "--"}
              {deltaCur != null && deltaPrev != null && <DeltaBadge cur={deltaCur} prev={deltaPrev} inv={inv} unit={unit} dec={1}/>}
            </span>
          </div>
        );

        // Donut chart data
        const donutData = fatPct != null ? [
          { name:"Gordura", value: Math.round(fatPct * 10) / 10 },
          { name:"Massa magra", value: Math.round(leanPct * 10) / 10 },
        ] : [];
        const DONUT_COLORS = [G[400], S.grn];

        // Female SVG silhouette — separate shapes per body part for proportional rendering
        const FemaleSilhouette = () => {
          const lastC = lastCirc;
          const prevC = prevCirc;
          // Measurements with sensible defaults
          const m = {
            torax: lastC?.torax || 90,
            cintura: lastC?.cintura || 70,
            quadril: lastC?.quadril || 98,
            braco: lastC?.braco || 30,
            antebraco: lastC?.antebraco || 24,
            coxa: lastC?.coxa || 56,
            panturrilha: lastC?.panturrilha || 36,
          };
          // Ideal references (healthy female)
          const ideal = { torax:88, cintura:68, quadril:96, braco:28, antebraco:22, coxa:54, panturrilha:34 };

          // Scale: how much wider each body part is vs ideal (clamped 0.9-1.3)
          const sc = (key) => Math.max(0.9, Math.min(1.3, m[key] / ideal[key]));

          // Center X and body proportions
          const svgCx = 105;

          // Body part widths (half-width in SVG units)
          const hw = {
            head: 13, neck: 5,
            shoulder: 26 * sc('torax'),
            bust: 24 * sc('torax'),
            waist: 18 * sc('cintura'),
            hip: 27 * sc('quadril'),
            upperArm: 5.5 * sc('braco'),
            forearm: 4.5 * sc('antebraco'),
            thigh: 10 * sc('coxa'),
            calf: 6 * sc('panturrilha'),
            ankle: 4, foot: 5,
          };

          // Ideal widths for dashed outline
          const ihw = { shoulder: 26, bust: 24, waist: 18, hip: 27, upperArm: 5.5, forearm: 4.5, thigh: 10, calf: 6 };

          // Y positions
          const yp = { head:12, neck:48, shoulder:60, bust:85, waist:125, hip:160, crotch:180, midThigh:220, knee:260, midCalf:295, ankle:325, foot:335 };

          // Build torso path with smooth curves
          const torsoPath = (w) => `
            M${svgCx-w.shoulder} ${yp.shoulder}
            C${svgCx-w.bust} ${yp.bust-10} ${svgCx-w.bust} ${yp.bust} ${svgCx-w.bust} ${yp.bust}
            C${svgCx-w.waist-2} ${yp.waist-15} ${svgCx-w.waist} ${yp.waist} ${svgCx-w.waist} ${yp.waist}
            C${svgCx-w.hip+5} ${yp.hip-15} ${svgCx-w.hip} ${yp.hip} ${svgCx-w.hip} ${yp.hip}
            L${svgCx-w.hip+4} ${yp.crotch}
            L${svgCx+w.hip-4} ${yp.crotch}
            L${svgCx+w.hip} ${yp.hip}
            C${svgCx+w.hip} ${yp.hip} ${svgCx+w.hip-5} ${yp.hip-15} ${svgCx+w.waist} ${yp.waist}
            C${svgCx+w.waist} ${yp.waist} ${svgCx+w.waist+2} ${yp.waist-15} ${svgCx+w.bust} ${yp.bust}
            C${svgCx+w.bust} ${yp.bust} ${svgCx+w.bust} ${yp.bust-10} ${svgCx+w.shoulder} ${yp.shoulder}
            Q${svgCx+w.neck+2} ${yp.shoulder-2} ${svgCx+w.neck} ${yp.neck}
            L${svgCx-w.neck} ${yp.neck}
            Q${svgCx-w.neck-2} ${yp.shoulder-2} ${svgCx-w.shoulder} ${yp.shoulder}
            Z`;

          const fillActual = `${G[300]}44`;
          const strokeActual = G[500];
          const fillIdeal = `${S.grn}15`;
          const strokeIdeal = S.grn;

          const actualTorso = torsoPath(hw);
          const idealTorso = torsoPath({...hw, shoulder:ihw.shoulder, bust:ihw.bust, waist:ihw.waist, hip:ihw.hip});

          // Measurement line helper
          const mLine = (x1,y1,x2,y2) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={G[300]} strokeWidth="0.5" strokeDasharray="2,2"/>;

          // Delta badge for labels
          const dBadge = (cur, prev) => {
            if (!prev) return null;
            const d = (cur - prev).toFixed(1);
            const isGood = parseFloat(d) < 0;
            return <span style={{ fontSize:7, fontWeight:600, color: isGood ? S.grn : parseFloat(d) > 0 ? S.red : '#aaa', marginLeft:2 }}>{parseFloat(d)>0?'+':''}{d}</span>;
          };

          return (
            <div style={{ width:220, flexShrink:0, position:"relative" }}>
              <svg viewBox="0 0 210 350" width="210" height="350" style={{ display:"block", margin:"0 auto" }}>
                <defs>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={G[300]} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={G[200]} stopOpacity="0.1"/>
                  </linearGradient>
                </defs>

                {/* HEAD */}
                <ellipse cx={svgCx} cy={yp.head+15} rx={hw.head} ry={17} fill={fillActual} stroke={strokeActual} strokeWidth="1"/>
                {/* NECK */}
                <rect x={svgCx-hw.neck} y={yp.neck} width={hw.neck*2} height={12} rx={3} fill={fillActual} stroke={strokeActual} strokeWidth="0.8"/>

                {/* IDEAL TORSO (dashed green) */}
                <path d={idealTorso} fill={fillIdeal} stroke={strokeIdeal} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.5"/>
                {/* ACTUAL TORSO */}
                <path d={actualTorso} fill="url(#gActual)" stroke={strokeActual} strokeWidth="1"/>

                {/* ARMS */}
                {['left','right'].map(side => {
                  const dir = side === 'left' ? -1 : 1;
                  const sx = svgCx + dir * (hw.shoulder + 2);
                  const ua = hw.upperArm * 2;
                  const fa = hw.forearm * 2;
                  return <g key={side}>
                    {/* Upper arm */}
                    <path d={`M${sx} ${yp.shoulder+3} C${sx+dir*2} ${yp.shoulder+15} ${sx+dir*3} ${yp.bust} ${sx+dir*2} ${yp.waist-5} L${sx+dir*(2-ua)} ${yp.waist-5} C${sx+dir*(3-ua)} ${yp.bust} ${sx+dir*(2-ua)} ${yp.shoulder+15} ${sx+dir*(-ua+2)} ${yp.shoulder+3} Z`}
                      fill={fillActual} stroke={strokeActual} strokeWidth="0.8"/>
                    {/* Forearm */}
                    <path d={`M${sx+dir*2} ${yp.waist-3} C${sx+dir*2} ${yp.waist+10} ${sx+dir*1} ${yp.waist+25} ${sx} ${yp.waist+35} L${sx+dir*(-fa)} ${yp.waist+35} C${sx+dir*(1-fa)} ${yp.waist+25} ${sx+dir*(2-fa)} ${yp.waist+10} ${sx+dir*(2-fa)} ${yp.waist-3} Z`}
                      fill={fillActual} stroke={strokeActual} strokeWidth="0.8"/>
                    {/* Hand */}
                    <ellipse cx={sx+dir*(-fa/2+1)} cy={yp.waist+38} rx={3} ry={4} fill={fillActual} stroke={strokeActual} strokeWidth="0.5"/>
                  </g>;
                })}

                {/* LEGS */}
                {['left','right'].map(side => {
                  const dir = side === 'left' ? -1 : 1;
                  const lx = svgCx + dir * (hw.hip * 0.35);
                  const th = hw.thigh;
                  const ca = hw.calf;
                  return <g key={`leg_${side}`}>
                    {/* Thigh */}
                    <path d={`M${lx-th} ${yp.crotch} C${lx-th} ${yp.midThigh-15} ${lx-ca-1} ${yp.knee-10} ${lx-ca} ${yp.knee} L${lx+ca} ${yp.knee} C${lx+ca+1} ${yp.knee-10} ${lx+th} ${yp.midThigh-15} ${lx+th} ${yp.crotch} Z`}
                      fill={fillActual} stroke={strokeActual} strokeWidth="0.8"/>
                    {/* Calf */}
                    <path d={`M${lx-ca} ${yp.knee+1} C${lx-ca-1} ${yp.midCalf-10} ${lx-4} ${yp.ankle-5} ${lx-4} ${yp.ankle} L${lx+4} ${yp.ankle} C${lx+4} ${yp.ankle-5} ${lx+ca+1} ${yp.midCalf-10} ${lx+ca} ${yp.knee+1} Z`}
                      fill={fillActual} stroke={strokeActual} strokeWidth="0.8"/>
                    {/* Foot */}
                    <ellipse cx={lx} cy={yp.foot} rx={hw.foot} ry={3} fill={fillActual} stroke={strokeActual} strokeWidth="0.5"/>
                  </g>;
                })}

                {/* MEASUREMENT LINES */}
                {mLine(8, yp.bust, svgCx-hw.shoulder-3, yp.bust)}
                {mLine(svgCx+hw.shoulder+8, yp.shoulder+10, 200, yp.shoulder+10)}
                {mLine(svgCx+hw.waist+3, yp.waist, 200, yp.waist)}
                {mLine(svgCx+hw.hip+3, yp.hip, 200, yp.hip)}
                {mLine(8, yp.midThigh, svgCx-hw.hip*0.35-hw.thigh-2, yp.midThigh)}
                {mLine(8, yp.midCalf+5, svgCx-hw.hip*0.35-hw.calf-2, yp.midCalf+5)}
                {mLine(svgCx+hw.shoulder+12, yp.waist+15, 200, yp.waist+15)}
              </svg>

              {/* LABELS with values and deltas */}
              <div style={{ position:"absolute", left:0, top: 152, fontSize:9, fontWeight:700, color:G[800], textAlign:"right", width:30 }}>
                {m.braco}{dBadge(m.braco, prevC?.braco)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Braco</div>
              </div>
              <div style={{ position:"absolute", right:0, top: 62, fontSize:9, fontWeight:700, color:G[800] }}>
                {m.torax}{dBadge(m.torax, prevC?.torax)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Torax</div>
              </div>
              <div style={{ position:"absolute", right:0, top: 118, fontSize:9, fontWeight:700, color:G[800] }}>
                {m.cintura}{dBadge(m.cintura, prevC?.cintura)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Cintura</div>
              </div>
              <div style={{ position:"absolute", right:0, top: 152, fontSize:9, fontWeight:700, color:G[800] }}>
                {m.quadril}{dBadge(m.quadril, prevC?.quadril)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Quadril</div>
              </div>
              <div style={{ position:"absolute", left:0, top: 210, fontSize:9, fontWeight:700, color:G[800], textAlign:"right", width:30 }}>
                {m.coxa}{dBadge(m.coxa, prevC?.coxa)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Coxa</div>
              </div>
              <div style={{ position:"absolute", left:0, top: 282, fontSize:9, fontWeight:700, color:G[800], textAlign:"right", width:30 }}>
                {m.panturrilha}{dBadge(m.panturrilha, prevC?.panturrilha)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Pant.</div>
              </div>
              <div style={{ position:"absolute", right:0, top: 190, fontSize:9, fontWeight:700, color:G[800] }}>
                {m.antebraco}{dBadge(m.antebraco, prevC?.antebraco)}
                <div style={{ fontSize:7, color:"#aaa", fontWeight:500 }}>Antebraco</div>
              </div>

              {/* Legend */}
              <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:4, fontSize:8, color:"#aaa" }}>
                <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:14, height:2, background:G[500], display:"inline-block" }}/>Atual</span>
                <span style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:14, height:0, borderTop:`1.5px dashed ${S.grn}`, display:"inline-block" }}/>Ideal</span>
              </div>
            </div>
          );
        };

        // Measurement labels for silhouette (legacy — kept for compatibility)
        const SilLabel = ({ label, val, prev, top, left, right, align }) => (
          <div style={{ position:"absolute", top, left, right, textAlign:align||"left", minWidth:70 }}>
            <div style={{ fontSize:9, color:G[500], fontWeight:600 }}>{label}</div>
            <div style={{ fontSize:12, fontWeight:700, color:G[800] }}>
              {val != null ? `${val}cm` : "--"}
              {val != null && prev != null && <DeltaBadge cur={val} prev={prev} inv={true} unit="cm" dec={1}/>}
            </div>
          </div>
        );

        // Summary indicator
        const SummaryBadge = ({ label, zones, value }) => {
          const c = classify(value, zones);
          return (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:"#fff", borderRadius:8, border:`1px solid ${G[200]}` }}>
              <span style={{ fontSize:11, color:G[700] }}>{label}</span>
              <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:10, background: c.color === S.grn ? S.grnBg : c.color === S.yel ? S.yelBg : c.color === S.red ? S.redBg : S.blueBg, color:c.color }}>{c.label}</span>
            </div>
          );
        };

        // Evolution chart data
        const chartData = circ.map((c, i) => ({
          label: safeFmt(c.date, 'dd/MM/yy'),
          torax: c.torax, abdomen: c.abdomen, cintura: c.cintura,
          quadril: c.quadril, coxa: c.coxa, panturrilha: c.panturrilha, braco: c.braco, antebraco: c.antebraco,
        }));

        const noData = !curWeight && circ.length === 0;

        return (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* Header with toggle and button */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", background:G[100], borderRadius:8, overflow:"hidden" }}>
                {[{k:"avaliacao",l:"Avaliacao atual"},{k:"historico",l:"Historico"}].map(v => (
                  <button key={v.k} onClick={()=>setMedView(v.k)} style={{ padding:"6px 14px", fontSize:11, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit", background:medView===v.k?G[600]:"transparent", color:medView===v.k?"#fff":G[600], borderRadius:medView===v.k?6:0 }}>{v.l}</button>
                ))}
              </div>
              <button onClick={()=>setShowCircumferenceModal(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                + Nova medicao
              </button>
            </div>

            {noData && (
              <div style={{ textAlign:"center", padding:40, color:"#aaa", background:"#fff", borderRadius:10, border:`1px solid ${G[200]}` }}>
                <div style={{ fontSize:32, marginBottom:8 }}>Medidas</div>
                <div style={{ fontSize:13, fontWeight:600, color:G[700], marginBottom:4 }}>Sem dados registrados</div>
                <div style={{ fontSize:11 }}>Registre medidas apos consulta com a nutricionista</div>
              </div>
            )}

            {/* ===== AVALIACAO ATUAL ===== */}
            {medView === "avaliacao" && !noData && (<>

              {/* Section 1: Analise Global da Composicao Corporal */}
              {(fatPct != null || curWeight) && (
                <div style={cardS}>
                  {secTitle("Analise Global da Composicao Corporal")}
                  <div style={{ display:"flex", gap:16, flexDirection:mob?"column":"row", alignItems:mob?"stretch":"flex-start" }}>
                    {/* Donut chart */}
                    {fatPct != null && (
                      <div style={{ width:mob?"100%":180, minWidth:160, display:"flex", justifyContent:"center", position:"relative" }}>
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                              {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]}/>)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
                          <div style={{ fontSize:20, fontWeight:800, color:G[700] }}>{fatPct.toFixed(1)}%</div>
                          <div style={{ fontSize:8, color:G[500] }}>gordura</div>
                          <div style={{ fontSize:11, fontWeight:600, color:S.grn }}>{leanPct.toFixed(1)}%</div>
                          <div style={{ fontSize:8, color:G[500] }}>magra</div>
                        </div>
                      </div>
                    )}
                    {/* Info cards */}
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                      {infoRow("Peso", curWeight, "kg", curWeight, prevWeight, true)}
                      {curGorda != null && infoRow("Massa gorda", curGorda, "kg", curGorda, prevGorda, true)}
                      {curMagra != null && infoRow("Massa magra", curMagra, "kg", curMagra, prevMagra, false)}
                      {waterEst != null && infoRow("Agua corporal est.", waterEst, "L")}
                      {ger != null && infoRow("Gasto energ. repouso", ger, " kcal")}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: IMC */}
              {imc != null && (
                <div style={cardS}>
                  {secTitle("IMC - Indice de Massa Corporal")}
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
                    <span style={{ fontSize:22, fontWeight:800, color:G[800] }}>{imc.toFixed(1)}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:classify(imc, IMC_ZONES).color, padding:"2px 8px", borderRadius:6, background: classify(imc, IMC_ZONES).color === S.grn ? S.grnBg : classify(imc, IMC_ZONES).color === S.yel ? S.yelBg : classify(imc, IMC_ZONES).color === S.red ? S.redBg : S.blueBg }}>
                      {classify(imc, IMC_ZONES).label}
                    </span>
                    <DeltaBadge cur={imc} prev={prevImc} inv={true} dec={1}/>
                  </div>
                  <ClassBar value={imc} zones={IMC_ZONES} unit=" kg/m2"/>
                </div>
              )}

              {/* Section 3: Percentual de Gordura */}
              {fatPct != null && (
                <div style={cardS}>
                  {secTitle("Percentual de Gordura")}
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
                    <span style={{ fontSize:22, fontWeight:800, color:G[800] }}>{fatPct.toFixed(1)}%</span>
                    <span style={{ fontSize:12, fontWeight:600, color:classify(fatPct, FAT_ZONES).color, padding:"2px 8px", borderRadius:6, background: classify(fatPct, FAT_ZONES).color === S.grn ? S.grnBg : classify(fatPct, FAT_ZONES).color === S.yel ? S.yelBg : classify(fatPct, FAT_ZONES).color === S.red ? S.redBg : S.blueBg }}>
                      {classify(fatPct, FAT_ZONES).label}
                    </span>
                    <DeltaBadge cur={fatPct} prev={prevFatPct} inv={true} unit="%" dec={1}/>
                  </div>
                  <ClassBar value={fatPct} zones={FAT_ZONES} unit="%"/>
                </div>
              )}

              {/* Section 4: IMM e IMG */}
              {(imm != null || img != null) && (
                <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:10 }}>
                  {imm != null && (
                    <div style={cardS}>
                      {secTitle("IMM - Indice de Massa Magra")}
                      <div style={{ fontSize:20, fontWeight:800, color:G[800], marginBottom:2 }}>{imm.toFixed(1)} <span style={{ fontSize:11, fontWeight:500 }}>kg/m2</span></div>
                      <DeltaBadge cur={imm} prev={prevImm} inv={false} dec={1}/>
                      <ClassBar value={imm} zones={IMM_ZONES} unit=" kg/m2"/>
                    </div>
                  )}
                  {img != null && (
                    <div style={cardS}>
                      {secTitle("IMG - Indice de Massa Gorda")}
                      <div style={{ fontSize:20, fontWeight:800, color:G[800], marginBottom:2 }}>{img.toFixed(1)} <span style={{ fontSize:11, fontWeight:500 }}>kg/m2</span></div>
                      <DeltaBadge cur={img} prev={prevImg} inv={true} dec={1}/>
                      <ClassBar value={img} zones={IMG_ZONES} unit=" kg/m2"/>
                    </div>
                  )}
                </div>
              )}

              {/* Section 5 & 6: Silhueta + Perimetros */}
              {lastCirc && (
                <div style={cardS}>
                  {secTitle("Silhueta e Perimetros")}
                  <div style={{ display:"flex", gap:16, flexDirection:mob?"column":"row" }}>
                    {/* Silhouette — self-contained with labels */}
                    <FemaleSilhouette/>
                    {/* Perimetros e Razoes */}
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                      {cintura != null && (
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Cintura: {cintura}cm <DeltaBadge cur={cintura} prev={prevCintura} inv={true} unit="cm" dec={1}/></div>
                          <ClassBar value={cintura} zones={CINTURA_ZONES} unit="cm"/>
                        </div>
                      )}
                      {quadril != null && (
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Quadril: {quadril}cm <DeltaBadge cur={quadril} prev={prevQuadril} inv={true} unit="cm" dec={1}/></div>
                        </div>
                      )}
                      {rce != null && (
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Razao cintura-estatura</div>
                          <ClassBar value={rce} zones={RCE_ZONES}/>
                        </div>
                      )}
                      {rcq != null && (
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:2 }}>Razao cintura/quadril</div>
                          <ClassBar value={rcq} zones={RCQ_ZONES}/>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 7: Indice de Conicidade */}
              {ic != null && (
                <div style={cardS}>
                  {secTitle("Indice de Conicidade")}
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
                    <span style={{ fontSize:20, fontWeight:800, color:G[800] }}>{ic.toFixed(2)}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:classify(ic, IC_ZONES).color, padding:"2px 8px", borderRadius:6, background: classify(ic, IC_ZONES).color === S.grn ? S.grnBg : classify(ic, IC_ZONES).color === S.yel ? S.yelBg : S.redBg }}>
                      {classify(ic, IC_ZONES).label}
                    </span>
                  </div>
                  <ClassBar value={ic} zones={IC_ZONES}/>
                  <div style={{ display:"flex", gap:20, marginTop:10, fontSize:10, color:G[600] }}>
                    <span>Biconcavo (baixo risco)</span>
                    <span>Cilindrico</span>
                    <span>Biconico (alto risco)</span>
                  </div>
                </div>
              )}

              {/* Section 8: Resumo de Indicadores */}
              {(fatPct != null || imc != null || cintura != null) && (
                <div style={cardS}>
                  {secTitle("Resumo de Indicadores")}
                  <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:6 }}>
                    {fatPct != null && <SummaryBadge label="Percentual de gordura" zones={FAT_ZONES} value={fatPct}/>}
                    {img != null && <SummaryBadge label="Indice de massa gorda" zones={IMG_ZONES} value={img}/>}
                    {imm != null && <SummaryBadge label="Indice de massa magra" zones={IMM_ZONES} value={imm}/>}
                    {rce != null && <SummaryBadge label="Razao cintura/estatura" zones={RCE_ZONES} value={rce}/>}
                    {rcq != null && <SummaryBadge label="Razao cintura/quadril" zones={RCQ_ZONES} value={rcq}/>}
                    {ic != null && <SummaryBadge label="Indice de conicidade" zones={IC_ZONES} value={ic}/>}
                  </div>
                </div>
              )}
            </>)}

            {/* ===== HISTORICO ===== */}
            {medView === "historico" && (<>
              {/* Evolution charts for circumferences */}
              {chartData.length > 1 && (
                <div style={cardS}>
                  {secTitle("Evolucao das medidas (cm)")}
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top:5, right:10, bottom:5, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/>
                      <XAxis dataKey="label" tick={{ fontSize:9, fill:G[600] }}/>
                      <YAxis tick={{ fontSize:9, fill:"#bbb" }} domain={["dataMin-2","dataMax+2"]}/>
                      <Tooltip contentStyle={{ borderRadius:8, fontSize:11 }}/>
                      <Legend wrapperStyle={{ fontSize:10 }}/>
                      {CIRC_FIELDS.map(f => (
                        <Line key={f.key} type="monotone" dataKey={f.key} name={f.label}
                          stroke={COLORS[f.key] || G[500]} strokeWidth={2} dot={{ r:3 }} connectNulls/>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Weight evolution */}
              {hist.length > 1 && (
                <div style={cardS}>
                  {secTitle("Evolucao do peso (kg)")}
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={hist.map(h => ({ label: safeFmt(h.date, 'dd/MM/yy'), peso: h.weight, magra: h.massaMagra, gorda: h.massaGordura }))} margin={{ top:5, right:10, bottom:5, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/>
                      <XAxis dataKey="label" tick={{ fontSize:9, fill:G[600] }}/>
                      <YAxis tick={{ fontSize:9, fill:"#bbb" }}/>
                      <Tooltip contentStyle={{ borderRadius:8, fontSize:11 }}/>
                      <Legend wrapperStyle={{ fontSize:10 }}/>
                      <Area type="monotone" dataKey="peso" name="Peso" stroke={G[500]} fill={G[100]} strokeWidth={2}/>
                      <Area type="monotone" dataKey="magra" name="Massa magra" stroke={S.grn} fill={S.grnBg} strokeWidth={2}/>
                      <Area type="monotone" dataKey="gorda" name="Massa gorda" stroke={S.red} fill={S.redBg} strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Indicators table with reference values */}
              <div style={cardS}>
                {secTitle("Tabela de indicadores")}
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:400 }}>
                    <thead>
                      <tr>
                        {["Indicador","Referencia","Anterior","Atual","Status"].map(h => (
                          <th key={h} style={{ textAlign:"left", padding:"5px 8px", borderBottom:`2px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:700, textTransform:"uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label:"IMC", ref:"18.5-24.9", prev:prevImc, cur:imc, zones:IMC_ZONES, unit:"", dec:1 },
                        { label:"% Gordura", ref:"15-25%", prev:prevFatPct, cur:fatPct, zones:FAT_ZONES, unit:"%", dec:1 },
                        { label:"IMM", ref:"15-18 kg/m2", prev:prevImm, cur:imm, zones:IMM_ZONES, unit:"", dec:1 },
                        { label:"IMG", ref:"5-9 kg/m2", prev:prevImg, cur:img, zones:IMG_ZONES, unit:"", dec:1 },
                        { label:"Razao C/E", ref:"<0.5", prev:null, cur:rce, zones:RCE_ZONES, unit:"", dec:2 },
                        { label:"Razao C/Q", ref:"<0.85", prev:null, cur:rcq, zones:RCQ_ZONES, unit:"", dec:2 },
                        { label:"Ind. Conicidade", ref:"<1.18", prev:null, cur:ic, zones:IC_ZONES, unit:"", dec:2 },
                      ].map((r, i) => {
                        const cls = classify(r.cur, r.zones);
                        return (
                          <tr key={i} style={{ background:i%2===0?"#fff":G[50] }}>
                            <td style={{ padding:"6px 8px", fontWeight:600, color:G[800] }}>{r.label}</td>
                            <td style={{ padding:"6px 8px", color:G[500], fontSize:10 }}>{r.ref}</td>
                            <td style={{ padding:"6px 8px", color:"#aaa" }}>{r.prev != null ? r.prev.toFixed(r.dec) : "--"}</td>
                            <td style={{ padding:"6px 8px", fontWeight:600, color:G[800] }}>{r.cur != null ? `${r.cur.toFixed(r.dec)}${r.unit}` : "--"}</td>
                            <td style={{ padding:"6px 8px" }}>
                              <span style={{ fontSize:9, fontWeight:600, padding:"2px 7px", borderRadius:8, color:cls.color, background: cls.color===S.grn?S.grnBg : cls.color===S.yel?S.yelBg : cls.color===S.red?S.redBg : S.blueBg }}>{cls.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Circumference history table */}
              {circ.length > 0 && (
                <div style={cardS}>
                  {secTitle("Historico de circunferencias")}
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, minWidth:420 }}>
                      <thead>
                        <tr>
                          {["Data","Torax","Abdomen","Cintura","Quadril","Panturrilha","Braco"].map(h=>(
                            <th key={h} style={{ textAlign:"left", padding:"4px 7px", borderBottom:`1px solid ${G[200]}`, fontSize:9, color:G[600], fontWeight:600, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...circ].reverse().map((c,i)=>(
                          <tr key={c.id||i} style={{ background:i===0?G[50]:"transparent" }}>
                            <td style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, color:"#aaa", fontSize:10, whiteSpace:"nowrap" }}>{safeFmt(c.date,"dd/MM/yy")}</td>
                            {CIRC_FIELDS.map(f=>(
                              <td key={f.key} style={{ padding:"5px 7px", borderBottom:`1px solid ${G[50]}`, fontWeight:i===0?600:400, color:COLORS[f.key]||G[700] }}>
                                {c[f.key]!=null?`${c[f.key]}cm`:"--"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>)}
          </div>
        );
      })()}
      {showCircumferenceModal && tab==="circunferencias" && <CircumferenceModal p={p} onClose={()=>setShowCircumferenceModal(false)} onSave={()=>{ onAddCircumference && onAddCircumference(); }} onLog={onLog}/>}

      {tab==="msgs" && (
        <MiniChat
          p={p}
          messages={messages}
          setMessages={setMessages}
          onLog={onLog}
        />
      )}

      {/* ABA RELATÓRIO */}
      {tab==="rel" && <RelTab p={p} mob={mob} plan={plan} met={met} be={be} mn={mn}/>}
    </div>
  );
}

/* ════════════════════════════════════════════
   MINI CHAT — Mensagens dentro da ficha do paciente
═══════════════════════════════════════════════ */
function MiniChat({ p, messages, setMessages, onLog }) {
  const [text, setText] = useState('');
  const [apiMsgs, setApiMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [whatsappMode, setWhatsappMode] = useState(!!p.phone);
  const [autoSignature, setAutoSignature] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const userRaw = useMemo(() => { try { return JSON.parse(localStorage.getItem('serlivre_user')||'{}'); } catch { return {}; } }, []);
  const userName = userRaw.name || 'Equipe';

  // Load messages from API on mount — normalize to { id, date, senderName, role, text, channel }
  const loadMessages = useCallback(async () => {
    try {
      const r = await getMessages(p.id);
      const raw = Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : [];
      const normalized = raw.map(m => ({
        id: m.id,
        date: m.createdAt || m.date,
        senderName: m.sentBy?.name || m.senderName || '',
        role: (m.sentBy?.role === 'PACIENTE') ? 'paciente' : 'admin',
        text: m.body || m.text || '',
        channel: m.channel || 'interno',
        patientId: m.patientId,
      }));
      setApiMsgs(normalized);
    } catch { setApiMsgs([]); }
    finally { setLoading(false); }
  }, [p.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Load templates on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await getMessageTemplates();
        setTemplates(Array.isArray(r.data||r) ? (r.data||r) : []);
      } catch { setTemplates([]); }
    })();
  }, []);

  // Use API messages as single source of truth (no optimistic updates = no duplicates)
  const allMessages = useMemo(() => {
    return [...apiMsgs].sort((a,b) => new Date(a.date||a.createdAt) - new Date(b.date||b.createdAt));
  }, [apiMsgs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Insert text at cursor position
  const insertAtCursor = useCallback((val) => {
    const el = inputRef.current;
    if (!el) { setText(prev => prev + val); return; }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + val + after;
    setText(newText);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + val.length; });
  }, [text]);

  // Send handler
  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending) return;

    const channel = whatsappMode && p.phone ? 'whatsapp' : 'interno';
    const finalText = autoSignature ? `${t}\n\n\u2014 ${userName}, Instituto Dra. Mariana Wogel` : t;

    setText('');
    setSending(true);

    setSendError(null);
    // Mostra imediatamente na UI (optimistic)
    const tempMsg = {
      id: 'pending_'+Date.now(),
      date: new Date().toISOString(),
      senderName: userName,
      role: 'admin',
      text: finalText,
      channel,
      patientId: p.id,
    };
    setApiMsgs(prev => [...prev, tempMsg]);

    try {
      // Salva no log de mensagens (sempre — é o histórico)
      await sendMessage({ patientId: p.id, body: finalText, channel });
      // Se WhatsApp, também dispara pelo endpoint de WA
      if (channel === 'whatsapp' && p.phone) {
        try {
          await sendWhatsAppMsg({ phone: p.phone, message: finalText, patientId: p.id });
        } catch (waErr) {
          console.warn('WhatsApp send failed (msg saved internally):', waErr?.message);
        }
      }
      // Recarrega mensagens reais da API (substitui o optimistic)
      setTimeout(() => loadMessages(), 500);
    } catch (err) {
      console.error('MiniChat send error:', err);
      const errMsg = err?.response?.data?.error || err?.message || 'Erro ao enviar';
      setSendError(errMsg);
      // Remove msg optimistic e restaura texto
      setApiMsgs(prev => prev.filter(m => m.id !== tempMsg.id));
      setText(t);
    } finally {
      setSending(false);
    }
  };

  // AI generation types
  const AI_TYPES = [
    { id:'boas_vindas',    label:'Boas-vindas' },
    { id:'inicio_semana',  label:'Inicio de semana' },
    { id:'resultado_pesagem', label:'Resultado de pesagem' },
    { id:'lembrete_consulta', label:'Lembrete de consulta' },
    { id:'lembrete_exames',   label:'Lembrete de exames' },
    { id:'conclusao',         label:'Conclusao do programa' },
  ];

  const handleAIGenerate = async (type) => {
    setShowAI(false);
    setGeneratingAI(true);
    try {
      const r = await generateMessage({ type, patientId: p.id });
      const body = r.data?.message || r.data?.body || r.message || r.body || '';
      if (body) setText(body);
    } catch (err) { console.error('AI generate error:', err); }
    finally { setGeneratingAI(false); }
  };

  // Smart shortcuts — insert contextual paragraphs, not raw values
  const sPlan = PLANS.find(x => x.id === p.plan);
  const sHeightM = (p.height || 165) / 100;
  const sImc = p.cw ? (p.cw / (sHeightM * sHeightM)).toFixed(1) : null;
  const sLastScore = (p.scoreHistory || []).slice(-1)[0];
  const sLastCirc = (p.circumferenceHistory || []).slice(-1)[0];
  const sPerda = (p.iw - p.cw).toFixed(1);
  const sMet = sLastScore ? cM(sLastScore.m) : null;
  const sBe = sLastScore ? cB(sLastScore.b) : null;
  const sMn = sLastScore ? cN(sLastScore.n) : null;
  const shortcuts = [
    { label:'Resultado da pesagem', icon:'⚖️', value: `Peso atual: ${p.cw}kg\nPeso inicial: ${p.iw}kg\nPerda total: ${sPerda}kg${sImc ? `\nIMC: ${sImc}` : ''}` },
    { label:'Composição corporal', icon:'🧬', value: (() => {
      const h = (p.history||[]).slice(-1)[0];
      if (!h || (!h.massaMagra && !h.massaGordura)) return 'Sem dados de composição corporal registrados.';
      const t = (h.massaMagra||0)+(h.massaGordura||0)||1;
      return `Massa magra: ${(h.massaMagra||0).toFixed(1)}kg (${(h.massaMagra/t*100).toFixed(0)}%)\nMassa gorda: ${(h.massaGordura||0).toFixed(1)}kg (${(h.massaGordura/t*100).toFixed(0)}%)`;
    })() },
    { label:'Scores clínicos', icon:'📊', value: sMet != null ? `Saúde metabólica: ${sMet}/24 — ${sM(sMet).l}\nBem-estar: ${sBe}/18 — ${sB(sBe).l}\nBlindagem mental: ${sMn}/9 — ${sN(sMn).l}` : 'Sem scores registrados.' },
    { label:'Medidas corporais', icon:'📏', value: sLastCirc ? `Medição de ${safeFmt(sLastCirc.date,'dd/MM/yy')}:\n${CIRC_FIELDS.map(f => sLastCirc[f.key] != null ? `${f.label}: ${sLastCirc[f.key]}cm` : null).filter(Boolean).join('\n')}` : 'Sem medições registradas.' },
    { label:'Dados do programa', icon:'📋', value: `Plano: ${sPlan?.name || p.plan}\nCiclo: C${p.cycle} — Semana: S${p.week}/16\nInício: ${safeFmt(p.sd,'dd/MM/yyyy')}` },
    { label:'Saudação', icon:'👋', value: `Olá ${p.name.split(' ')[0]}, tudo bem?` },
    { label:'Parabéns pela perda', icon:'🎉', value: `Parabéns ${p.name.split(' ')[0]}! Você já perdeu ${sPerda}kg desde o início do programa. Continue firme!` },
    { label:'Lembrete de pesagem', icon:'🔔', value: `Olá ${p.name.split(' ')[0]}, lembre-se de registrar sua pesagem desta semana. Estamos na semana ${p.week} do ciclo ${p.cycle}.` },
  ];

  const WA_GREEN = '#25D366';
  const isWA = whatsappMode && p.phone;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 280px)', minHeight:300, background:'#fff', borderRadius:10, border:`1px solid ${isWA ? WA_GREEN : G[200]}`, overflow:'hidden', position:'relative' }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${isWA ? WA_GREEN+'44' : G[200]}`, background: isWA ? '#dcf8c6' : G[50], display:'flex', alignItems:'center', gap:8 }}>
        <MessageCircle size={14} color={isWA ? WA_GREEN : G[600]}/>
        <span style={{ fontSize:12, fontWeight:600, color: isWA ? '#075e54' : G[800] }}>Conversa com {p.name.split(' ')[0]}</span>
        <span style={{ fontSize:10, color:'#aaa', marginLeft:4 }}>{allMessages.length} mensagem{allMessages.length!==1?'s':''}</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          {p.phone && (
            <button onClick={() => setWhatsappMode(!whatsappMode)}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:600, border:`1px solid ${whatsappMode ? WA_GREEN : G[300]}`, background: whatsappMode ? WA_GREEN : 'transparent', color: whatsappMode ? '#fff' : G[600], cursor:'pointer', fontFamily:'inherit' }}>
              {whatsappMode ? '\uD83D\uDCF1 WhatsApp' : '\uD83D\uDCAC Interno'}
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? (
          <div style={{ textAlign:'center', color:'#aaa', fontSize:12, marginTop:40 }}>Carregando mensagens...</div>
        ) : allMessages.length === 0 ? (
          <div style={{ textAlign:'center', color:'#ccc', fontSize:12, marginTop:40 }}>
            <MessageCircle size={32} color="#ddd" style={{ marginBottom:8 }}/>
            <div>Nenhuma mensagem ainda</div>
            <div style={{ fontSize:10, marginTop:4 }}>Envie a primeira mensagem para {p.name.split(' ')[0]}</div>
          </div>
        ) : allMessages.map((m, i) => {
          const isAdmin = m.role === 'admin' || m.role !== 'paciente';
          const isWhatsApp = m.channel === 'whatsapp';
          return (
            <div key={m.id||i} style={{ display:'flex', flexDirection:'column', alignItems:isAdmin?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'80%', background: isAdmin ? (isWhatsApp ? '#dcf8c6' : G[600]) : '#f0f0f0', color: isAdmin ? (isWhatsApp ? '#075e54' : '#fff') : G[800], borderRadius:isAdmin?'12px 12px 2px 12px':'12px 12px 12px 2px', padding:'8px 12px', fontSize:12, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {m.text || m.body}
              </div>
              <div style={{ fontSize:9, color:'#aaa', marginTop:2, paddingInline:4, display:'flex', gap:4, alignItems:'center' }}>
                {m.senderName || userName} {'\u00B7'} {safeFmt(m.date || m.createdAt,'dd/MM HH:mm')}
                {isWhatsApp && <span style={{ color: WA_GREEN, fontWeight:600 }}>WA</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Action bar */}
      <div style={{ padding:'4px 12px', borderTop:`1px solid ${G[100]}`, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', background:G[50] }}>
        <button onClick={() => { setShowTemplates(!showTemplates); setShowShortcuts(false); setShowAI(false); }}
          style={{ padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:500, border:`1px solid ${showTemplates ? G[500] : G[200]}`, background: showTemplates ? G[100] : '#fff', color:G[700], cursor:'pointer', fontFamily:'inherit' }}>
          {'\uD83D\uDCCB'} Templates
        </button>
        <button onClick={() => { setShowShortcuts(!showShortcuts); setShowTemplates(false); setShowAI(false); }}
          style={{ padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:500, border:`1px solid ${showShortcuts ? G[500] : G[200]}`, background: showShortcuts ? G[100] : '#fff', color:G[700], cursor:'pointer', fontFamily:'inherit' }}>
          {'\u26A1'} Atalhos
        </button>
        <button onClick={() => { setShowAI(!showAI); setShowTemplates(false); setShowShortcuts(false); }}
          disabled={generatingAI}
          style={{ padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:500, border:`1px solid ${showAI ? S.pur : G[200]}`, background: showAI ? S.purBg : '#fff', color: generatingAI ? '#aaa' : S.pur, cursor: generatingAI ? 'wait' : 'pointer', fontFamily:'inherit' }}>
          {generatingAI ? '\u23F3 Gerando...' : '\u2728 IA'}
        </button>
        <label style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:10, color:G[600], cursor:'pointer', userSelect:'none' }}>
          <input type="checkbox" checked={autoSignature} onChange={e => setAutoSignature(e.target.checked)} style={{ width:12, height:12, accentColor:G[600] }}/>
          Auto-assinatura
        </label>
      </div>

      {/* Floating panels */}
      {showTemplates && (
        <div style={{ position:'absolute', bottom:110, left:12, right:12, background:'#fff', border:`1px solid ${G[200]}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', maxHeight:200, overflowY:'auto', zIndex:10, padding:8 }}>
          <div style={{ fontSize:10, fontWeight:600, color:G[600], marginBottom:6, paddingInline:4 }}>Selecione um template</div>
          {templates.length === 0 ? (
            <div style={{ fontSize:11, color:'#aaa', textAlign:'center', padding:12 }}>Nenhum template cadastrado</div>
          ) : templates.map(tpl => {
            const cat = TPL_CATEGORIES[tpl.category] || TPL_CATEGORIES.custom;
            return (
              <div key={tpl.id} onClick={() => { setText(applyTemplateVars(tpl.body, p)); setShowTemplates(false); inputRef.current?.focus(); }}
                style={{ padding:'6px 8px', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', gap:8, marginBottom:2 }}
                onMouseEnter={e => e.currentTarget.style.background = G[50]}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:cat.bg, color:cat.color, fontWeight:600, whiteSpace:'nowrap' }}>{cat.label}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:G[800] }}>{tpl.name}</div>
                  <div style={{ fontSize:10, color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{applyTemplateVars(tpl.body, p).substring(0, 60)}...</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showShortcuts && (
        <div style={{ position:'absolute', bottom:110, left:12, right:12, background:'#fff', border:`1px solid ${G[200]}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', maxHeight:240, overflowY:'auto', zIndex:10, padding:8 }}>
          <div style={{ fontSize:10, fontWeight:600, color:G[600], marginBottom:6, paddingInline:4 }}>Clique para inserir no texto</div>
          {shortcuts.map((s, i) => (
            <div key={i} onClick={() => { insertAtCursor(s.value); setShowShortcuts(false); }}
              style={{ padding:'6px 8px', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'flex-start', gap:8, marginBottom:2 }}
              onMouseEnter={e => e.currentTarget.style.background = G[50]}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize:14, flexShrink:0 }}>{s.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:600, color:G[800] }}>{s.label}</div>
                <div style={{ fontSize:10, color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.value.split('\n')[0]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAI && (
        <div style={{ position:'absolute', bottom:110, left:12, right:200, background:'#fff', border:`1px solid ${S.pur}33`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', zIndex:10, padding:8 }}>
          <div style={{ fontSize:10, fontWeight:600, color:S.pur, marginBottom:6, paddingInline:4 }}>Gerar mensagem com IA</div>
          {AI_TYPES.map(t => (
            <div key={t.id} onClick={() => handleAIGenerate(t.id)}
              style={{ padding:'6px 10px', borderRadius:6, cursor:'pointer', fontSize:11, color:G[800] }}
              onMouseEnter={e => e.currentTarget.style.background = S.purBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {t.label}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {sendError && (
        <div style={{ padding:'6px 12px', background:'#fef2f2', borderTop:'1px solid #fecaca', fontSize:11, color:'#dc2626', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Erro: {sendError}</span>
          <span onClick={()=>setSendError(null)} style={{ cursor:'pointer', fontWeight:600, padding:'0 4px' }}>✕</span>
        </div>
      )}
      {/* Input area */}
      <div style={{ padding:'8px 12px', borderTop:`1px solid ${G[200]}`, display:'flex', gap:8, alignItems:'flex-end' }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={isWA ? 'Mensagem via WhatsApp... (Enter para enviar)' : 'Digite uma mensagem... (Enter para enviar)'}
          rows={2}
          style={{ flex:1, padding:'8px 10px', borderRadius:8, border:`1px solid ${isWA ? WA_GREEN : G[300]}`, fontSize:12, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.5 }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{ padding:'8px 14px', background: sending ? '#ccc' : (text.trim() ? (isWA ? WA_GREEN : G[600]) : '#e0e0e0'), color: text.trim() && !sending ? '#fff' : '#aaa', border:'none', borderRadius:8, cursor: text.trim() && !sending ? 'pointer' : 'default', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, height:38 }}>
          <Send size={13}/>{sending ? '...' : ''}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ALERTAS
═══════════════════════════════════════════════ */
function Alerts({ ps, onSel, onResolve }) {
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
            <div key={p.id} style={{ background:"#fff", borderRadius:8, borderLeft:`4px solid ${S.red}`, padding:"10px 12px", marginBottom:5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div onClick={()=>onSel(p.id)} style={{ display:"flex", alignItems:"center", gap:8, flex:1, cursor:"pointer" }}><Av name={p.name} size={24}/><span style={{ fontWeight:600, fontSize:12 }}>{p.name}</span></div>
                <button onClick={e=>{ e.stopPropagation(); onResolve && onResolve(p.id); }} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:S.grnBg, border:`1px solid ${S.grn}`, color:S.grn, cursor:"pointer", fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap" }}>✓ Resolver</button>
              </div>
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
            <div key={p.id} style={{ background:"#fff", borderRadius:8, borderLeft:`4px solid ${S.yel}`, padding:"10px 12px", marginBottom:5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div onClick={()=>onSel(p.id)} style={{ display:"flex", alignItems:"center", gap:8, flex:1, cursor:"pointer" }}><Av name={p.name} size={24}/><span style={{ fontWeight:600, fontSize:12 }}>{p.name}</span></div>
                <button onClick={e=>{ e.stopPropagation(); onResolve && onResolve(p.id); }} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, background:S.grnBg, border:`1px solid ${S.grn}`, color:S.grn, cursor:"pointer", fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap" }}>✓ Resolver</button>
              </div>
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
function TeamP({ team, setTeam, ta, setTa, activityLog, onToast, currentUser }) {
  const [sel,        setSel]        = useState(null); // membro selecionado
  const [showNew,    setShowNew]    = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [confirmDelMember, setConfirmDelMember] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MEDICA';

  const handleDeleteMember = async () => {
    if (!confirmDelMember) return;
    setDeleting(true);
    try {
      await deleteStaff(confirmDelMember.id);
      setTeam(prev => prev.filter(m => m.id !== confirmDelMember.id));
      setConfirmDelMember(null);
      if (sel === confirmDelMember.id) setSel(null);
      onToast?.('Membro excluído com sucesso.', 'success');
    } catch (err) {
      onToast?.(err?.response?.data?.error || 'Erro ao excluir membro.', 'error');
    } finally { setDeleting(false); }
  };

  const handleSaveEdit = async () => {
    if (!editMember) return;
    try {
      // Salva perfil (nome, telefone, especialidade)
      await updateUserProfile(editMember.id, { name: editMember.name, phone: editMember.phone, specialty: editMember.specialty }).catch(()=>{});
      // Salva role se mudou
      const original = team.find(x => x.id === editMember.id);
      if (original?.role !== editMember.role) {
        await updateStaffRole(editMember.id, editMember.role);
      }
      setTeam(prev => prev.map(x => x.id === editMember.id ? { ...x, ...editMember } : x));
      setEditMember(null);
      onToast?.('Membro atualizado com sucesso.', 'success');
    } catch (err) {
      onToast?.(err?.response?.data?.error || 'Erro ao salvar alterações.', 'error');
    }
  };

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
                <div style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap" }}>{safeFmt(a.date,"dd/MM HH:mm")}</div>
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
                <button onClick={handleSaveEdit}
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
        {canManage && <button onClick={()=>setShowNew(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:8, background:G[600], color:"#fff", fontSize:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}><Plus size={13}/>Novo membro</button>}
      </div>
      {team.map(m => {
        const roleInfo = ROLES.find(r=>r.id===m.role) || { label: m.label||m.role, color: m.color };
        const mLog = activityLog.filter(a=>a.memberId===m.id);
        const isMe = m.id === currentUser?.id;
        return (
          <div key={m.id} style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
            <Av name={m.name} size={46} src={ta[m.id]} onEdit={url=>setTa(pr=>({...pr,[m.id]:url}))}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name}</div>
                {isMe && <span style={{ fontSize:9, background:G[100], color:G[700], borderRadius:4, padding:"1px 5px", fontWeight:600 }}>Você</span>}
              </div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{m.specialty} • {m.email}</div>
              <div style={{ fontSize:10, color:"#bbb", marginTop:2 }}>{mLog.length} atividades registradas</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end" }}>
              <Bg color={roleInfo.color} bg={roleInfo.color+"22"}>{roleInfo.label}</Bg>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:2 }}>
                <div onClick={()=>setSel(m.id)} style={{ fontSize:10, color:G[600], cursor:"pointer", textDecoration:"underline" }}>Histórico</div>
                {canManage && !isMe && (
                  <>
                    <span style={{ color:"#ccc", fontSize:10 }}>|</span>
                    <div onClick={()=>setEditMember({...m})} style={{ fontSize:10, color:G[500], cursor:"pointer" }} title="Editar">✏️</div>
                    <div onClick={()=>setConfirmDelMember({ id: m.id, name: m.name })} style={{ fontSize:10, color:S.red, cursor:"pointer" }} title="Excluir">🗑️</div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal confirmação exclusão de membro */}
      {confirmDelMember && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:340, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:'#1a1a1a' }}>Excluir membro?</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:24, lineHeight:1.5 }}>
              <strong>{confirmDelMember.name}</strong> será removido(a) do sistema e perderá o acesso. Esta ação não pode ser desfeita.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleDeleteMember} disabled={deleting}
                style={{ flex:1, padding:11, background:S.red, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:deleting?0.7:1 }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
              <button onClick={()=>setConfirmDelMember(null)} disabled={deleting}
                style={{ flex:1, padding:11, background:G[100], color:G[800], border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showNew && <NewMemberModal onClose={()=>setShowNew(false)} onSave={async (nm) => {
        try {
          await apiRegister({ name: nm.name, email: nm.email, role: nm.role?.toUpperCase() || 'ENFERMAGEM', phone: nm.phone || '' });
          getStaff().then(r => setTeam(r.data)).catch(() => {});
          setShowNew(false);
        } catch (err) { console.error('Erro ao criar membro:', err.message); onToast?.(err.response?.data?.error || 'Erro ao criar membro. Verifique os dados.', 'error'); }
      }}/>}
    </div>
  );
}

/* ════════════════════════════════════════════
   AGENDA / CALENDÁRIO DE RETORNOS
═══════════════════════════════════════════════ */
const APPT_TYPES = [
  { id:'CONSULTA_MEDICA', label:'Consulta Médica',     icon:'🩺', reminder:true },
  { id:'CONSULTA_NUTRI',  label:'Consulta Nutrição',   icon:'🥗', reminder:true },
  { id:'EXAME',           label:'Exame Laboratorial',  icon:'🔬', reminder:true },
  { id:'OUTRO',           label:'Outro',               icon:'📌', reminder:false },
];

function NovoEventoModal({ ps, onClose, onSave }) {
  const [type,       setType]       = useState('CONSULTA_MEDICA');
  const [patientId,  setPatientId]  = useState('');
  const [title,      setTitle]      = useState('');
  const [date,       setDate]       = useState('');
  const [time,       setTime]       = useState('');
  const [notes,      setNotes]      = useState('');
  const [reminder,   setReminder]   = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const selType = APPT_TYPES.find(t => t.id === type);

  const save = async () => {
    if (!date) { setErr('Selecione a data.'); return; }
    setSaving(true); setErr('');
    try {
      const dateTime = time ? `${date}T${time}:00` : `${date}T08:00:00`;
      await onSave({
        patientId: patientId ? parseInt(patientId) : null,
        type,
        title: title || selType.label,
        date: dateTime,
        notes,
        sendReminder: reminder && selType.reminder,
      });
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Erro ao salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:400, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:15, fontWeight:700, color:G[800], marginBottom:16 }}>📅 Novo Evento</div>

        {/* Tipo */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:6 }}>TIPO</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {APPT_TYPES.map(t => (
              <div key={t.id} onClick={()=>{ setType(t.id); setReminder(t.reminder); }}
                style={{ padding:'8px 10px', borderRadius:8, border:`2px solid ${type===t.id?G[600]:G[200]}`,
                  background:type===t.id?G[50]:'#fff', cursor:'pointer', fontSize:12, fontWeight:type===t.id?600:400,
                  color:type===t.id?G[700]:G[600], display:'flex', alignItems:'center', gap:5 }}>
                <span>{t.icon}</span>{t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Paciente */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:5 }}>PACIENTE (opcional)</div>
          <select value={patientId} onChange={e=>setPatientId(e.target.value)}
            style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:`1px solid ${G[200]}`, fontSize:13, fontFamily:'inherit', background:'#fff', color:G[800] }}>
            <option value="">— Sem paciente específico —</option>
            {ps.map(p => <option key={p.id} value={p.id}>{p.user?.name || p.name}</option>)}
          </select>
        </div>

        {/* Título */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:5 }}>TÍTULO</div>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={selType?.label}
            style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:`1px solid ${G[200]}`, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}/>
        </div>

        {/* Data e Hora */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:5 }}>DATA *</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:`1px solid ${date?G[300]:G[200]}`, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:5 }}>HORA</div>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)}
              style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:`1px solid ${G[200]}`, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }}/>
          </div>
        </div>

        {/* Notas */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:5 }}>OBSERVAÇÕES</div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Notas internas..."
            style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:`1px solid ${G[200]}`, fontSize:13, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}/>
        </div>

        {/* Lembrete WhatsApp */}
        {selType?.reminder && (
          <div onClick={()=>setReminder(r=>!r)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:8, background:reminder?G[50]:'#f9f9f9',
              border:`1px solid ${reminder?G[300]:G[100]}`, cursor:'pointer', marginBottom:16 }}>
            <div style={{ width:20, height:20, borderRadius:4, background:reminder?G[600]:'#e5e7eb', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {reminder && <span style={{ color:'#fff', fontSize:12, lineHeight:1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:G[800] }}>📱 Enviar lembrete WhatsApp</div>
              <div style={{ fontSize:10, color:'#aaa' }}>Mensagem automática 24h antes da consulta</div>
            </div>
          </div>
        )}

        {err && <div style={{ color:'#dc2626', fontSize:12, marginBottom:12 }}>{err}</div>}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${G[200]}`, background:'#fff', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding:'9px 20px', borderRadius:8, border:'none', background:saving?G[400]:G[600], color:'#fff', fontSize:13, fontWeight:600, cursor:saving?'default':'pointer', fontFamily:'inherit' }}>
            {saving ? 'Salvando...' : 'Salvar evento'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Agenda({ ps, onSel, mob }) {
  const [viewDate,   setViewDate]   = useState(new Date());
  const [selDay,     setSelDay]     = useState(null);
  const [apptData,   setApptData]   = useState([]);
  const [showModal,  setShowModal]  = useState(false);
  const [deleting,   setDeleting]   = useState(null);

  const loadAppts = useCallback(async () => {
    try {
      const r = await getAppointments();
      setApptData(Array.isArray(r.data) ? r.data : []);
    } catch { setApptData([]); }
  }, []);

  useEffect(() => { loadAppts(); }, [loadAppts]);

  const handleCreateAppt = async (data) => {
    await createAppointment(data);
    await loadAppts();
  };

  const handleDeleteAppt = async (id) => {
    setDeleting(id);
    try { await deleteAppointment(id); await loadAppts(); }
    catch { /* silently fail */ }
    finally { setDeleting(null); }
  };

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Retornos dos pacientes (campo nr)
  const patientReturnAppts = useMemo(() =>
    ps.map(p => {
      if (!p.nr) return null;
      const d = new Date(p.nr);
      return isNaN(d.getTime()) ? null : { p, d, source: 'patient' };
    }).filter(Boolean),
  [ps]);

  // Agendamentos da API
  const apiAppts = useMemo(() =>
    apptData.map(a => ({
      a,
      d: new Date(a.date),
      source: 'api',
      label: a.title || APPT_TYPES.find(t=>t.id===a.type)?.label || a.type,
      patientName: a.patient?.user?.name || null,
      typeInfo: APPT_TYPES.find(t=>t.id===a.type),
    })).filter(item => !isNaN(item.d.getTime())),
  [apptData]);

  // Todos os dias com eventos para o calendário
  const getDayItems = (day) => {
    const byDay = (d) => d.getFullYear()===year && d.getMonth()===month && d.getDate()===day;
    return [
      ...patientReturnAppts.filter(a => byDay(a.d)).map(a => ({ type:'return', ...a })),
      ...apiAppts.filter(a => byDay(a.d)).map(a => ({ type:'appt', ...a })),
    ];
  };

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const today  = new Date();
  const isToday = d => d===today.getDate() && month===today.getMonth() && year===today.getFullYear();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Próximos retornos (pacientes)
  const upcoming = patientReturnAppts.filter(a => a.d >= todayMidnight).sort((a,b)=>a.d-b.d).slice(0, 10);
  // Próximos agendamentos
  const upcomingAppts = apiAppts.filter(a => a.d >= todayMidnight).sort((a,b)=>a.d-b.d).slice(0, 10);

  const MN = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const MS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const DN = ["D","S","T","Q","Q","S","S"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {showModal && <NovoEventoModal ps={ps} onClose={()=>setShowModal(false)} onSave={handleCreateAppt}/>}

      {/* Calendário + botão Novo Evento */}
      <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div onClick={()=>{ setViewDate(new Date(year,month-1,1)); setSelDay(null); }}
              style={{ cursor:"pointer", padding:"4px 8px", borderRadius:7, background:G[50], border:`1px solid ${G[200]}` }}>
              <ChevronLeft size={14} color={G[700]}/>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:G[800] }}>{MN[month]} {year}</span>
            <div onClick={()=>{ setViewDate(new Date(year,month+1,1)); setSelDay(null); }}
              style={{ cursor:"pointer", padding:"4px 8px", borderRadius:7, background:G[50], border:`1px solid ${G[200]}` }}>
              <ChevronRightIcon size={14} color={G[700]}/>
            </div>
          </div>
          <button onClick={()=>setShowModal(true)}
            style={{ padding:"6px 12px", borderRadius:8, border:"none", background:G[600], color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
            + Novo Evento
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", textAlign:"center", marginBottom:4 }}>
          {DN.map((d,i) => <div key={i} style={{ fontSize:9, color:"#bbb", fontWeight:600, padding:"2px 0" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
          {Array.from({length:totalCells},(_,i) => {
            const day   = i - firstDay + 1;
            const valid = day >= 1 && day <= daysInMonth;
            const items = valid ? getDayItems(day) : [];
            const hasReturn = items.some(x=>x.type==='return');
            const hasAppt   = items.some(x=>x.type==='appt');
            const isTod = valid && isToday(day);
            const isSel = valid && selDay===day;
            return (
              <div key={i} onClick={()=>valid && setSelDay(selDay===day ? null : day)}
                style={{ padding:"5px 2px", textAlign:"center", borderRadius:7, cursor:valid?"pointer":"default",
                  background:isSel?G[600]:isTod?G[100]:"transparent", minHeight:32 }}>
                {valid && <>
                  <div style={{ fontSize:11, fontWeight:isTod||isSel?700:400,
                    color:isSel?"#fff":isTod?G[700]:"#555" }}>{day}</div>
                  <div style={{ display:"flex", justifyContent:"center", gap:1, marginTop:2 }}>
                    {hasReturn && <div style={{ width:5,height:5,borderRadius:"50%", background:isSel?"rgba(255,255,255,0.8)":G[500] }}/>}
                    {hasAppt   && <div style={{ width:5,height:5,borderRadius:"50%", background:isSel?"rgba(255,255,255,0.8)":"#f59e0b" }}/>}
                  </div>
                </>}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:12, marginTop:10, justifyContent:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#888" }}>
            <div style={{ width:7,height:7,borderRadius:"50%",background:G[500] }}/> Retorno paciente
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#888" }}>
            <div style={{ width:7,height:7,borderRadius:"50%",background:"#f59e0b" }}/> Consulta/Exame
          </div>
        </div>
      </div>

      {/* Eventos do dia selecionado */}
      {selDay && (() => {
        const items = getDayItems(selDay);
        return (
          <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[300]}`, padding:"12px 14px" }}>
            <div style={{ fontSize:12, fontWeight:600, color:G[800], marginBottom:8 }}>
              {selDay} de {MN[month]}
              <span style={{ fontSize:11, fontWeight:400, color:"#aaa", marginLeft:6 }}>{items.length} evento{items.length!==1?"s":""}</span>
            </div>
            {items.length === 0 ? (
              <div style={{ color:"#ccc", fontSize:12, textAlign:"center", padding:"12px 0" }}>Nenhum evento neste dia</div>
            ) : items.map((item, i, arr) => item.type === 'return' ? (
              <div key={`r${i}`} onClick={()=>onSel(item.p.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                  borderBottom:i<arr.length-1?`1px solid ${G[50]}`:"none", cursor:"pointer" }}>
                <div style={{ width:32,height:32,borderRadius:8,background:G[50],display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>🔄</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:G[800] }}>{item.p.user?.name || item.p.name}</div>
                  <div style={{ fontSize:10, color:"#aaa" }}>Retorno · S{item.p.week}/16</div>
                </div>
                <ChevronRightIcon size={14} color={G[400]}/>
              </div>
            ) : (
              <div key={`a${item.a.id}`}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                  borderBottom:i<arr.length-1?`1px solid ${G[50]}`:"none" }}>
                <div style={{ width:32,height:32,borderRadius:8,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                  {item.typeInfo?.icon || '📌'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:G[800] }}>{item.label}</div>
                  <div style={{ fontSize:10, color:"#aaa" }}>
                    {item.d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                    {item.patientName ? ` · ${item.patientName}` : ''}
                    {item.a.sendReminder ? ' · 📱' : ''}
                  </div>
                </div>
                <button onClick={()=>handleDeleteAppt(item.a.id)} disabled={deleting===item.a.id}
                  style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${G[200]}`, background:"#fff", cursor:"pointer", fontSize:11, color:"#dc2626" }}>
                  {deleting===item.a.id ? '...' : 'Remover'}
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Próximos agendamentos */}
      {upcomingAppts.length > 0 && (
        <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>🗓 Próximas consultas e exames</div>
          {upcomingAppts.map((a,i,arr) => {
            const isNow = a.d.toDateString()===today.toDateString();
            const diff  = Math.ceil((a.d - todayMidnight) / 86400000);
            return (
              <div key={a.a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                borderBottom:i<arr.length-1?`1px solid ${G[50]}`:"none" }}>
                <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:isNow?S.grn:"#f59e0b" }}>{a.d.getDate()}</div>
                  <div style={{ fontSize:9, color:"#aaa" }}>{MS[a.d.getMonth()]}</div>
                </div>
                <div style={{ width:30,height:30,borderRadius:7,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>
                  {a.typeInfo?.icon||'📌'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:G[800], overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize:10, color:"#aaa" }}>
                    {a.d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                    {a.patientName ? ` · ${a.patientName}` : ''}
                  </div>
                </div>
                <Bg color={isNow?S.grn:diff<=2?S.red:diff<=5?S.yel:G[500]}
                    bg={isNow?S.grnBg:diff<=2?S.redBg:diff<=5?S.yelBg:G[50]}>
                  {isNow?"Hoje":`${diff}d`}
                </Bg>
              </div>
            );
          })}
        </div>
      )}

      {/* Próximos retornos de pacientes */}
      <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:10 }}>📅 Próximos retornos</div>
        {upcoming.length === 0 ? (
          <div style={{ textAlign:"center", padding:"20px 0", color:"#ccc", fontSize:12 }}>
            Nenhum retorno agendado
          </div>
        ) : upcoming.map((a,i,arr) => {
          const isNow = a.d.toDateString() === today.toDateString();
          const diff  = Math.ceil((a.d - todayMidnight) / 86400000);
          const plan  = PLANS.find(x=>x.id===a.p.plan);
          return (
            <div key={i} onClick={()=>onSel(a.p.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                borderBottom:i<arr.length-1?`1px solid ${G[50]}`:"none", cursor:"pointer" }}>
              <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:isNow?S.grn:G[600] }}>{a.d.getDate()}</div>
                <div style={{ fontSize:9, color:"#aaa" }}>{MS[a.d.getMonth()]}</div>
              </div>
              <Av name={a.p.user?.name || a.p.name} size={32}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:G[800], overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.p.user?.name || a.p.name}</div>
                <div style={{ fontSize:10, color:"#aaa" }}>{plan?.name} · S{a.p.week}/16</div>
              </div>
              <Bg color={isNow?S.grn:diff<=2?S.red:diff<=5?S.yel:G[500]}
                  bg={isNow?S.grnBg:diff<=2?S.redBg:diff<=5?S.yelBg:G[50]}>
                {isNow?"Hoje":`${diff}d`}
              </Bg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MENSAGENS
═══════════════════════════════════════════════ */

// Substitui variáveis de template com dados do paciente
function applyTemplateVars(body, patient) {
  if (!patient) return body;
  const name = patient.user?.name || patient.name || '';
  const plan = PLANS.find(x => x.id === patient.plan)?.name || patient.plan || '';
  const week = patient.cycles?.[0]?.currentWeek || patient.week || '—';
  const initialW = patient.initialWeight || '—';
  const currentW = patient.currentWeight || '—';
  const diff = patient.initialWeight && patient.currentWeight
    ? (patient.initialWeight - patient.currentWeight).toFixed(1) : '—';
  const startDate = patient.startDate ? new Date(patient.startDate).toLocaleDateString('pt-BR') : '—';
  const leanMass = patient.leanMass || '—';
  const fatMass = patient.fatMass || '—';
  const cycle = patient.cycles?.[0]?.cycleNumber || patient.cycle || '—';
  const eventDate = patient.eventDate ? new Date(patient.eventDate).toLocaleDateString('pt-BR') : '—';
  const professional = patient.professional || '—';
  return body
    .replace(/\{\{nome\}\}/g, name)
    .replace(/\{\{plano\}\}/g, plan)
    .replace(/\{\{semana\}\}/g, week)
    .replace(/\{\{peso_inicial\}\}/g, initialW)
    .replace(/\{\{peso_atual\}\}/g, currentW)
    .replace(/\{\{variacao_peso\}\}/g, diff)
    .replace(/\{\{peso_perdido\}\}/g, diff)
    .replace(/\{\{data_inicio\}\}/g, startDate)
    .replace(/\{\{massa_magra\}\}/g, leanMass)
    .replace(/\{\{massa_gorda\}\}/g, fatMass)
    .replace(/\{\{ciclo\}\}/g, cycle)
    .replace(/\{\{data_evento\}\}/g, eventDate)
    .replace(/\{\{profissional\}\}/g, professional);
}

const TPL_CATEGORIES = {
  boas_vindas: { label:'Boas-vindas', color:'#10b981', bg:'#d1fae5' },
  resultado:   { label:'Resultado',   color:'#3b82f6', bg:'#dbeafe' },
  conquista:   { label:'Conquista',   color:'#f59e0b', bg:'#fef3c7' },
  lembrete:    { label:'Lembrete',    color:'#8b5cf6', bg:'#ede9fe' },
  agendamento: { label:'Agendamento', color:'#06b6d4', bg:'#cffafe' },
  custom:      { label:'Personalizado', color:'#6b7280', bg:'#f3f4f6' },
};

function Mensagens({ ps, messages, setMessages, mob, patientMode, patientPid }) {
  // ── Main tab state ──
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'historico'
  const [templates, setTemplates] = useState([]);
  const [loadingTpls, setLoadingTpls] = useState(true);
  const [historyMsgs, setHistoryMsgs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Template CRUD modal ──
  const [tplModal, setTplModal] = useState(null); // null | 'new' | {id,...}
  const [tplForm, setTplForm] = useState({ name:'', category:'boas_vindas', body:'' });
  const [savingTpl, setSavingTpl] = useState(false);
  const tplBodyRef = useRef(null);

  // ── Broadcast wizard ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizStep, setWizStep] = useState(1); // 1=template, 2=patients, 3=preview
  const [wizCatFilter, setWizCatFilter] = useState('todos');
  const [wizSelTpl, setWizSelTpl] = useState(null);
  const [wizCustomMsg, setWizCustomMsg] = useState(false);
  const [wizCustomBody, setWizCustomBody] = useState('');
  const [wizSelPatients, setWizSelPatients] = useState([]);
  const [wizOverrides, setWizOverrides] = useState({});
  const [wizSending, setWizSending] = useState(false);
  const [wizSearchPat, setWizSearchPat] = useState('');

  // ── Available template variables ──
  const ALL_VARS = ['nome','plano','peso_inicial','peso_atual','peso_perdido','variacao_peso','massa_magra','massa_gorda','semana','ciclo','data_inicio','data_evento','profissional'];

  // ── Load templates on mount ──
  const loadTemplates = useCallback(async () => {
    setLoadingTpls(true);
    try {
      const r = await getMessageTemplates();
      setTemplates(Array.isArray(r.data) ? r.data : []);
    } catch { setTemplates([]); }
    finally { setLoadingTpls(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Load history when tab switches ──
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await getMessages();
      setHistoryMsgs(Array.isArray(r.data) ? r.data : []);
    } catch { setHistoryMsgs([]); }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { if (activeTab === 'historico') loadHistory(); }, [activeTab, loadHistory]);

  // ── Extract variables from body ──
  const extractVars = (body) => {
    if (!body) return [];
    const matches = body.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{|\}/g, '')))];
  };

  // ── Template CRUD ──
  const openNewTpl = () => {
    setTplForm({ name:'', category:'boas_vindas', body:'' });
    setTplModal('new');
  };

  const insertVarAtCursor = (varName) => {
    const ta = tplBodyRef.current;
    const tag = `{{${varName}}}`;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = tplForm.body;
      const newBody = text.substring(0, start) + tag + text.substring(end);
      setTplForm(p => ({ ...p, body: newBody }));
      setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + tag.length; }, 0);
    } else {
      setTplForm(p => ({ ...p, body: p.body + tag }));
    }
  };

  const handleSaveTpl = async () => {
    if (!tplForm.name.trim() || !tplForm.body.trim()) return;
    setSavingTpl(true);
    try {
      if (tplModal === 'new') {
        await createMessageTemplate({ name: tplForm.name.trim(), category: tplForm.category, body: tplForm.body.trim() });
      } else {
        await updateMessageTemplate(tplModal.id, { name: tplForm.name.trim(), category: tplForm.category, body: tplForm.body.trim() });
      }
      setTplModal(null);
      await loadTemplates();
    } catch(e) { console.error('Erro ao salvar template:', e); }
    finally { setSavingTpl(false); }
  };

  const handleDuplicate = async (tpl) => {
    try {
      await createMessageTemplate({ name: `${tpl.name} (copia)`, category: tpl.category, body: tpl.body });
      await loadTemplates();
    } catch(e) { console.error('Erro ao duplicar template:', e); }
  };

  // ── Wizard send logic ──
  const wizBody = wizCustomMsg ? wizCustomBody : (wizSelTpl?.body || '');
  const wizVars = extractVars(wizBody);
  const wizFirstPatient = wizSelPatients.length > 0 ? ps.find(p => p.id === wizSelPatients[0]) : null;

  const renderPreview = () => {
    let text = wizBody;
    // Apply overrides first
    Object.entries(wizOverrides).forEach(([k, v]) => {
      if (v.trim()) text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v.trim());
    });
    // Then apply patient vars for remaining
    text = applyTemplateVars(text, wizFirstPatient);
    return text;
  };

  const handleWizardSend = async () => {
    setWizSending(true);
    try {
      for (const pid of wizSelPatients) {
        const patient = ps.find(p => p.id === pid);
        if (!patient) continue;
        let text = wizBody;
        Object.entries(wizOverrides).forEach(([k, v]) => {
          if (v.trim()) text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v.trim());
        });
        text = applyTemplateVars(text, patient);
        const hasPhone = !!patient.phone;
        await sendMessage({ patientId: pid, body: text, channel: hasPhone ? 'whatsapp' : 'interno' });
        if (hasPhone) {
          try { await sendWhatsAppMsg({ phone: patient.phone, message: text, patientId: pid }); } catch {}
        }
      }
      setWizardOpen(false);
      setWizStep(1);
      setWizSelTpl(null);
      setWizSelPatients([]);
      setWizOverrides({});
      setWizCustomMsg(false);
      setWizCustomBody('');
    } catch(e) { console.error('Erro ao enviar mensagens:', e); }
    finally { setWizSending(false); }
  };

  // ── Filtered patients for wizard step 2 ──
  const filteredPatients = useMemo(() => {
    if (!wizSearchPat.trim()) return ps;
    const q = wizSearchPat.toLowerCase();
    return ps.filter(p => {
      const name = (p.user?.name || p.name || '').toLowerCase();
      return name.includes(q);
    });
  }, [ps, wizSearchPat]);

  const patientsWithWA = wizSelPatients.filter(pid => {
    const p = ps.find(x => x.id === pid);
    return p?.phone;
  }).length;

  // ── Shared styles ──
  const pillActive = { padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit' };
  const btnOutline = { padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
    border:`1.5px solid ${G[400]}`, background:'#fff', color:G[700], display:'inline-flex', alignItems:'center', gap:6 };
  const btnGold = { padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
    border:'none', background:G[600], color:'#fff', display:'inline-flex', alignItems:'center', gap:6 };

  // ══════════════════════════════════════════
  //  RENDER: Novo Template Modal
  // ══════════════════════════════════════════
  const tplModalEl = tplModal !== null && (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) setTplModal(null); }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:540,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)', maxHeight:'90vh', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>
            {tplModal === 'new' ? 'Novo template' : 'Editar template'}
          </div>
          <div onClick={() => setTplModal(null)} style={{ cursor:'pointer', width:28, height:28, borderRadius:'50%',
            background:G[50], display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Lucide.X size={14} color={G[600]}/>
          </div>
        </div>

        {/* Name + Category row */}
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap: mob?'wrap':'nowrap' }}>
          <div style={{ flex:1, minWidth: mob?'100%':200 }}>
            <label style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:4, display:'block' }}>Nome do template</label>
            <input value={tplForm.name} onChange={e => setTplForm(p => ({ ...p, name:e.target.value }))}
              placeholder="Ex: Lembrete de consulta"
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${G[300]}`,
                fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:4, display:'block' }}>Categoria</label>
            <select value={tplForm.category} onChange={e => setTplForm(p => ({ ...p, category:e.target.value }))}
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${G[300]}`,
                fontSize:12, fontFamily:'inherit', background:'#fff', outline:'none', boxSizing:'border-box' }}>
              {Object.entries(TPL_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Variable insertion row */}
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:6, display:'block' }}>Inserir variavel no cursor:</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {ALL_VARS.map(v => (
              <span key={v} onClick={() => insertVarAtCursor(v)}
                style={{ padding:'3px 8px', borderRadius:12, border:`1px solid ${G[300]}`, fontSize:10, fontWeight:500,
                  color:G[700], background:G[50], cursor:'pointer', fontFamily:'inherit' }}>
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>

        {/* Body textarea */}
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:4, display:'block' }}>Texto da mensagem</label>
          <textarea ref={tplBodyRef} value={tplForm.body} onChange={e => setTplForm(p => ({ ...p, body:e.target.value }))}
            placeholder={'Ola {{nome}},\n\nSua mensagem aqui...'}
            rows={8}
            style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${G[300]}`,
              fontSize:12, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}/>
          <div style={{ fontSize:10, color:'#aaa', textAlign:'right', marginTop:2 }}>{tplForm.body.length} caracteres</div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <button onClick={handleSaveTpl} disabled={savingTpl || !tplForm.name.trim() || !tplForm.body.trim()}
            style={{ ...btnGold, flex:1, justifyContent:'center', padding:'11px 16px', fontSize:13,
              opacity: (!tplForm.name.trim() || !tplForm.body.trim()) ? 0.5 : 1 }}>
            {savingTpl ? 'Salvando...' : 'Salvar template'}
          </button>
          <button onClick={() => setTplModal(null)}
            style={{ ...btnOutline, flex:1, justifyContent:'center', padding:'11px 16px', fontSize:13 }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════
  //  RENDER: Broadcast Wizard Modal
  // ══════════════════════════════════════════
  const wizardModal = wizardOpen && (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) setWizardOpen(false); }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Wizard header with step indicators */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${G[100]}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:16, fontWeight:700, color:G[800] }}>Disparar mensagem</div>
            <div onClick={() => setWizardOpen(false)} style={{ cursor:'pointer', width:28, height:28, borderRadius:'50%',
              background:G[50], display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Lucide.X size={14} color={G[600]}/>
            </div>
          </div>
          {/* Step indicators */}
          <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
            {[{n:1,label:'Template'},{n:2,label:'Pacientes'},{n:3,label:'Preview'}].map((s, i) => (
              <div key={s.n} style={{ display:'flex', alignItems:'center', gap:4 }}>
                {i > 0 && <div style={{ width:24, height:1, background:G[200] }}/>}
                <div style={{ width:24, height:24, borderRadius:'50%', fontSize:11, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: wizStep >= s.n ? G[600] : G[100],
                  color: wizStep >= s.n ? '#fff' : G[400] }}>
                  {s.n}
                </div>
                <span style={{ fontSize:11, fontWeight: wizStep === s.n ? 700 : 400,
                  color: wizStep === s.n ? G[800] : '#aaa' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>

          {/* ── Step 1: Template selection ── */}
          {wizStep === 1 && (
            <div>
              {/* Category filter pills */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
                {[{id:'todos', label:'Todos'}, ...Object.entries(TPL_CATEGORIES).map(([k,v]) => ({id:k, label:v.label}))].map(c => (
                  <button key={c.id} onClick={() => setWizCatFilter(c.id)}
                    style={{ ...pillActive,
                      background: wizCatFilter === c.id ? G[600] : '#fff',
                      color: wizCatFilter === c.id ? '#fff' : G[700],
                      border: wizCatFilter === c.id ? `1.5px solid ${G[600]}` : `1.5px solid ${G[200]}` }}>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Custom message checkbox */}
              <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, cursor:'pointer' }}>
                <input type="checkbox" checked={wizCustomMsg} onChange={e => setWizCustomMsg(e.target.checked)}
                  style={{ width:16, height:16, accentColor:G[600] }}/>
                <span style={{ fontSize:12, color:G[800], fontWeight:500 }}>Escrever mensagem personalizada</span>
              </label>

              {wizCustomMsg ? (
                <textarea value={wizCustomBody} onChange={e => setWizCustomBody(e.target.value)}
                  placeholder={'Ola {{nome}},\n\nSua mensagem aqui...'}
                  rows={6}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${G[300]}`,
                    fontSize:12, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}/>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {templates
                    .filter(t => wizCatFilter === 'todos' || t.category === wizCatFilter)
                    .map(tpl => {
                      const cat = TPL_CATEGORIES[tpl.category] || TPL_CATEGORIES.custom;
                      const isSelected = wizSelTpl?.id === tpl.id;
                      return (
                        <div key={tpl.id} onClick={() => setWizSelTpl(tpl)}
                          style={{ padding:'12px 14px', borderRadius:10, cursor:'pointer',
                            border: isSelected ? `2px solid ${G[600]}` : `1px solid ${G[100]}`,
                            background: isSelected ? G[50] : '#fff', transition:'all 0.15s' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:18, height:18, borderRadius:'50%',
                              border: isSelected ? `5px solid ${G[600]}` : `2px solid ${G[300]}`,
                              background: isSelected ? '#fff' : '#fff', flexShrink:0, boxSizing:'border-box' }}/>
                            <span style={{ fontSize:13, fontWeight:600, color:G[800], flex:1 }}>{tpl.name}</span>
                            <span style={{ fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:10,
                              color:cat.color, background:cat.bg }}>{cat.label}</span>
                          </div>
                          <div style={{ fontSize:11, color:'#999', marginTop:6, marginLeft:26, lineHeight:1.4,
                            overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
                            WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                            {tpl.body.substring(0, 150)}
                          </div>
                        </div>
                      );
                    })}
                  {templates.filter(t => wizCatFilter === 'todos' || t.category === wizCatFilter).length === 0 && (
                    <div style={{ padding:24, textAlign:'center', color:'#ccc', fontSize:12 }}>
                      Nenhum template nesta categoria.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Patient selection ── */}
          {wizStep === 2 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>
                  {wizSelPatients.length} selecionado{wizSelPatients.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <span onClick={() => setWizSelPatients(ps.map(p => p.id))}
                    style={{ fontSize:11, color:G[600], cursor:'pointer', fontWeight:600 }}>Todos</span>
                  <span onClick={() => setWizSelPatients([])}
                    style={{ fontSize:11, color:S.red, cursor:'pointer', fontWeight:600 }}>Limpar</span>
                </div>
              </div>
              {/* Search */}
              <div style={{ position:'relative', marginBottom:12 }}>
                <Search size={14} color="#aaa" style={{ position:'absolute', left:10, top:9 }}/>
                <input value={wizSearchPat} onChange={e => setWizSearchPat(e.target.value)}
                  placeholder="Buscar paciente..."
                  style={{ width:'100%', padding:'8px 12px 8px 30px', borderRadius:8, border:`1px solid ${G[200]}`,
                    fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {filteredPatients.map(p => {
                  const name = p.user?.name || p.name || '—';
                  const phone = p.phone ? maskPhone(p.phone) : null;
                  const checked = wizSelPatients.includes(p.id);
                  return (
                    <div key={p.id} onClick={() => {
                      setWizSelPatients(prev => checked ? prev.filter(x => x !== p.id) : [...prev, p.id]);
                    }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8,
                        cursor:'pointer', background: checked ? G[50] : '#fff',
                        border: checked ? `1px solid ${G[300]}` : `1px solid ${G[50]}`, transition:'all 0.12s' }}>
                      <input type="checkbox" checked={checked} readOnly
                        style={{ width:16, height:16, accentColor:G[600], flexShrink:0, pointerEvents:'none' }}/>
                      <Av name={name} size={32}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:G[800] }}>{name}</div>
                        {phone && <div style={{ fontSize:10, color:'#aaa' }}>{phone}</div>}
                      </div>
                      {p.phone && (
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#25D366', flexShrink:0 }}
                          title="Tem WhatsApp"/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {wizStep === 3 && (
            <div>
              {wizFirstPatient && (
                <div style={{ fontSize:11, color:'#999', textAlign:'center', marginBottom:12, fontStyle:'italic' }}>
                  -- dados do primeiro paciente selecionado --
                </div>
              )}

              {/* Preview box */}
              <div style={{ background:G[50], borderRadius:10, padding:'14px 16px', marginBottom:16,
                border:`1px solid ${G[200]}`, whiteSpace:'pre-line', fontSize:12, color:G[800], lineHeight:1.6 }}>
                {renderPreview()}
              </div>

              {/* Variable overrides */}
              {wizVars.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:G[700], marginBottom:8 }}>
                    Sobrescrever variaveis (opcional):
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {wizVars.map(v => (
                      <div key={v} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <label style={{ fontSize:11, color:G[600], fontWeight:600, minWidth:100 }}>{`{{${v}}}`}</label>
                        <input value={wizOverrides[v] || ''} onChange={e => setWizOverrides(p => ({ ...p, [v]:e.target.value }))}
                          placeholder={`Valor para ${v}`}
                          style={{ flex:1, padding:'7px 10px', borderRadius:6, border:`1px solid ${G[200]}`,
                            fontSize:11, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send info bar */}
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 14px', display:'flex',
                justifyContent:'space-between', alignItems:'center', border:'1px solid #bbf7d0' }}>
                <span style={{ fontSize:12, color:G[800] }}>
                  Enviar para <strong>{wizSelPatients.length}</strong> paciente{wizSelPatients.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>
                  {patientsWithWA} com WhatsApp
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard footer */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${G[100]}`, display:'flex', gap:10, flexShrink:0 }}>
          {wizStep > 1 && (
            <button onClick={() => setWizStep(s => s - 1)}
              style={{ ...btnOutline, flex:1, justifyContent:'center' }}>
              <ChevronLeft size={14}/> Voltar
            </button>
          )}
          {wizStep < 3 && (
            <button onClick={() => setWizStep(s => s + 1)}
              disabled={(wizStep === 1 && !wizCustomMsg && !wizSelTpl) || (wizStep === 2 && wizSelPatients.length === 0)}
              style={{ ...btnGold, flex:1, justifyContent:'center',
                opacity: ((wizStep === 1 && !wizCustomMsg && !wizSelTpl) || (wizStep === 2 && wizSelPatients.length === 0)) ? 0.5 : 1 }}>
              Proximo <ChevronRightIcon size={14}/>
            </button>
          )}
          {wizStep === 3 && (
            <button onClick={handleWizardSend} disabled={wizSending}
              style={{ ...btnGold, flex:1, justifyContent:'center', background: wizSending ? G[300] : '#16a34a' }}>
              {wizSending ? 'Enviando...' : (
                <><Send size={14}/> Enviar mensagens</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════
  //  RENDER: Templates grid
  // ══════════════════════════════════════════
  const templatesGrid = (
    <div style={{ display:'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap:12, marginTop:16 }}>
      {loadingTpls ? (
        <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'#aaa', fontSize:12 }}>Carregando templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'#ccc', fontSize:12 }}>
          Nenhum template. Crie o primeiro clicando em "+ Novo template".
        </div>
      ) : templates.map(tpl => {
        const cat = TPL_CATEGORIES[tpl.category] || TPL_CATEGORIES.custom;
        const preview = applyTemplateVars(tpl.body, ps[0]);
        const vars = extractVars(tpl.body);
        return (
          <div key={tpl.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${G[200]}`,
            padding:'16px 18px', display:'flex', flexDirection:'column', gap:8 }}>
            {/* Top row: name + duplicate */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:G[800], flex:1, overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tpl.name}</span>
              <button onClick={() => handleDuplicate(tpl)}
                style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${G[300]}`, background:'#fff',
                  fontSize:10, fontWeight:600, color:G[700], cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                Duplicar
              </button>
            </div>
            {/* Category badge */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:10,
                color:cat.color, background:cat.bg }}>{cat.label}</span>
              {tpl.isSystem && (
                <span style={{ fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:10,
                  color:'#6b7280', background:'#f3f4f6' }}>sistema</span>
              )}
            </div>
            {/* Preview */}
            <div style={{ fontSize:11, color:'#999', lineHeight:1.4,
              overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
              WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
              {preview.substring(0, 160)}
            </div>
            {/* Variable tags */}
            {vars.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:2 }}>
                {vars.map(v => (
                  <span key={v} style={{ fontSize:9, padding:'2px 6px', borderRadius:10,
                    border:`1px solid ${G[200]}`, color:G[600], background:'#fff' }}>
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Historico sub-filter state ──
  const [histFilter, setHistFilter] = useState('todas'); // 'todas' | 'sent' | 'failed'
  const [resendingId, setResendingId] = useState(null);

  const handleResend = async (msg) => {
    const patient = ps.find(p => p.id === msg.patientId);
    if (!patient?.phone) return;
    setResendingId(msg.id);
    try {
      await sendWhatsAppMsg({ phone: patient.phone, message: msg.body, patientId: msg.patientId });
      // Reload history to reflect updated status
      await loadHistory();
    } catch (e) {
      console.error('Resend failed:', e);
    } finally {
      setResendingId(null);
    }
  };

  const filteredHistory = useMemo(() => {
    if (histFilter === 'todas') return historyMsgs;
    if (histFilter === 'sent') return historyMsgs.filter(m => m.status === 'sent' || !m.status);
    if (histFilter === 'failed') return historyMsgs.filter(m => m.status === 'failed' || m.status === 'error');
    return historyMsgs;
  }, [historyMsgs, histFilter]);

  // ══════════════════════════════════════════
  //  RENDER: Historico list
  // ══════════════════════════════════════════
  const historicoList = (
    <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:16 }}>
      {/* Sub-filter pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {[['todas','Todas'],['sent','Enviadas'],['failed','Falhas']].map(([k,l]) => (
          <button key={k} onClick={() => setHistFilter(k)}
            style={{ ...pillActive,
              background: histFilter === k ? G[600] : '#fff',
              color: histFilter === k ? '#fff' : G[700],
              border: histFilter === k ? `1.5px solid ${G[600]}` : `1.5px solid ${G[200]}` }}>
            {l}
          </button>
        ))}
        <span style={{ fontSize:11, color:'#aaa', marginLeft:4 }}>
          {filteredHistory.length} mensagem{filteredHistory.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loadingHistory ? (
        <div style={{ padding:40, textAlign:'center', color:'#aaa', fontSize:12 }}>Carregando historico...</div>
      ) : filteredHistory.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'#ccc', fontSize:12 }}>
          {histFilter === 'todas' ? 'Nenhuma mensagem enviada ainda.' : `Nenhuma mensagem com status "${histFilter === 'sent' ? 'enviada' : 'falha'}".`}
        </div>
      ) : filteredHistory.map(m => {
        const patient = ps.find(p => p.id === m.patientId);
        const patientName = patient?.user?.name || patient?.name || 'Paciente';
        const senderName = m.sentBy?.name || '—';
        const phone = patient?.phone ? maskPhone(patient.phone) : null;
        const tplName = m.templateName || null;
        const tplCat = m.templateCategory ? (TPL_CATEGORIES[m.templateCategory] || TPL_CATEGORIES.custom) : null;
        const isWA = m.channel === 'whatsapp';
        const isFailed = m.status === 'failed' || m.status === 'error';
        const statusColor = isFailed ? S.red : S.grn;
        const statusLabel = isFailed ? 'Falhou' : 'Enviado';
        const statusBg = isFailed ? S.redBg : S.grnBg;
        return (
          <div key={m.id} style={{ background:'#fff', borderRadius:10, border:`1px solid ${isFailed ? `${S.red}30` : G[100]}`,
            padding:'14px 16px', display:'flex', flexDirection:'column', gap:6 }}>
            {/* Top row */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Av name={patientName} size={28}/>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:13, fontWeight:700, color:G[800] }}>{patientName}</span>
                {phone && <span style={{ fontSize:10, color:'#bbb', marginLeft:6 }}>{phone}</span>}
              </div>
              {/* Channel badge */}
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:10,
                color: isWA ? '#25D366' : G[600],
                background: isWA ? '#25D36615' : G[50] }}>
                {isWA ? 'WhatsApp' : 'Interno'}
              </span>
              {tplName && tplCat && (
                <span style={{ fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:10,
                  color:tplCat.color, background:tplCat.bg }}>{tplName}</span>
              )}
              <span style={{ fontSize:10, color:'#aaa', flexShrink:0 }}>
                {safeFmt(m.createdAt, 'dd/MM HH:mm')}
              </span>
            </div>
            {/* Body preview */}
            <div style={{ fontSize:11, color:'#999', lineHeight:1.4,
              overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
              WebkitLineClamp:2, WebkitBoxOrient:'vertical', paddingLeft:36 }}>
              {m.body || ''}
            </div>
            {/* Bottom row */}
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:36 }}>
              {/* Status badge */}
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
                color: statusColor, background: statusBg }}>
                {statusLabel}
              </span>
              <span style={{ fontSize:10, color:'#bbb' }}>por {senderName}</span>
              {/* Resend button for failed messages */}
              {isFailed && isWA && patient?.phone && (
                <button onClick={() => handleResend(m)} disabled={resendingId === m.id}
                  style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:600,
                    border:`1px solid ${G[400]}`, background:'#fff', color:G[700], cursor:'pointer', fontFamily:'inherit',
                    opacity: resendingId === m.id ? 0.5 : 1 }}>
                  {resendingId === m.id ? 'Reenviando...' : 'Reenviar'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ══════════════════════════════════════════
  //  MAIN RETURN
  // ══════════════════════════════════════════
  return (
    <>
      {tplModalEl}
      {wizardModal}
      <div>
        {/* Header row: title + actions */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:10, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:G[800], margin:0 }}>Comunicacao</h2>
            {/* Toggle pills */}
            <div style={{ display:'flex', gap:4, background:G[50], borderRadius:22, padding:3 }}>
              <button onClick={() => setActiveTab('templates')}
                style={{ ...pillActive,
                  background: activeTab === 'templates' ? G[600] : 'transparent',
                  color: activeTab === 'templates' ? '#fff' : G[700] }}>
                Templates
              </button>
              <button onClick={() => setActiveTab('historico')}
                style={{ ...pillActive,
                  background: activeTab === 'historico' ? G[600] : 'transparent',
                  color: activeTab === 'historico' ? '#fff' : G[700] }}>
                Historico
              </button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={openNewTpl} style={btnOutline}>
              <Plus size={14}/> Novo template
            </button>
            <button onClick={() => { setWizardOpen(true); setWizStep(1); setWizSelTpl(null); setWizSelPatients([]); setWizOverrides({}); setWizCustomMsg(false); setWizCustomBody(''); }}
              style={btnGold}>
              <Zap size={14}/> Disparar mensagem
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'templates' ? templatesGrid : historicoList}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   MINHA SEMANA — Tab do portal do paciente
═══════════════════════════════════════════════ */
function MinhaSemana({ p }) {
  const activeCycle = p?._activeCycle;
  const currentWeek = activeCycle?.currentWeek || p?.week || 1;
  const totalWeeks  = 16;
  const pctPrograma = Math.min(100, Math.round((currentWeek / totalWeeks) * 100));

  // Percentual de perda de peso atingido
  const perdaKg  = p?.iw && p?.cw ? Math.max(0, p.iw - p.cw) : 0;
  const pctPerda = p?.iw > 0 ? Math.min(100, Math.round((perdaKg / p.iw) * 100)) : 0;

  // Mensagem motivacional baseada no % de perda
  const motivacao = (() => {
    if (pctPerda >= 15) return { emoji: "🏆", texto: "Resultado excepcional! Você transformou seu corpo e sua saúde. Continue!" };
    if (pctPerda >= 10) return { emoji: "🌟", texto: "Incrível! Você ultrapassou a marca de 10% de perda. Seu metabolismo está livre!" };
    if (pctPerda >= 7)  return { emoji: "🔥", texto: "Ótimo progresso! Você está quebrando o set point metabólico. Continue firme!" };
    if (pctPerda >= 4)  return { emoji: "💪", texto: "Boa evolução! Seu corpo já sente a diferença. Mantenha a consistência!" };
    if (pctPerda >= 1)  return { emoji: "🌱", texto: "Início promissor! Cada passo conta. Confie no processo Ser Livre!" };
    return { emoji: "🚀", texto: "Sua jornada começa agora. A equipe está aqui por você!" };
  })();

  // Checklist da semana atual a partir do ciclo ativo
  const weekChecks = activeCycle?.weekChecks || [];
  // Pega o weekCheck da semana atual (ou o mais recente)
  const checkAtual = weekChecks.find(wc => wc.weekNumber === currentWeek) || weekChecks[weekChecks.length - 1] || null;

  // Monta items do checklist para exibição
  const checkItems = [
    { label: "Tirzepatida aplicada",    feito: !!checkAtual?.tirzepatida },
    { label: "Pesagem semanal",         feito: !!checkAtual?.pesoRegistrado },
    { label: "Bioimpedância",           feito: !!checkAtual?.bioimpedancia },
    { label: "Consulta de terapia",     feito: !!checkAtual?.terapia },
    { label: "Consulta psicológica",    feito: !!checkAtual?.psicologia },
    { label: "Treino de resistência",   feito: !!(checkAtual?.treinos && checkAtual.treinos[0]) },
  ].filter(item => item.label); // remove nulls

  const totalItems = checkItems.length;
  const feitos     = checkItems.filter(i => i.feito).length;
  const pctSemana  = totalItems > 0 ? Math.round((feitos / totalItems) * 100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Progresso do programa */}
      <div style={{ background:`linear-gradient(135deg,${G[700]},${G[900]})`, borderRadius:14, padding:"18px 16px", color:"#fff" }}>
        <div style={{ fontSize:11, opacity:0.6, marginBottom:4 }}>Progresso no programa</div>
        <div style={{ fontSize:20, fontWeight:700, marginBottom:2 }}>
          Semana {currentWeek} de {totalWeeks}
        </div>
        <div style={{ fontSize:11, opacity:0.5, marginBottom:10 }}>{pctPrograma}% concluído</div>
        <div style={{ height:8, background:"rgba(255,255,255,0.15)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pctPrograma}%`, background:G[300], borderRadius:4, transition:"width 0.5s" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, opacity:0.4, marginTop:3 }}>
          <span>Semana 1</span><span>Semana 16</span>
        </div>
      </div>

      {/* Mensagem motivacional */}
      {perdaKg > 0 && (
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
          <div style={{ fontSize:22, marginBottom:6 }}>{motivacao.emoji}</div>
          <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:3 }}>
            Você perdeu {perdaKg.toFixed(1).replace(".",",")} kg ({pctPerda}%)
          </div>
          <div style={{ fontSize:12, color:"#666", lineHeight:1.5 }}>{motivacao.texto}</div>
        </div>
      )}

      {/* Checklist da semana atual */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:600, color:G[800] }}>Checklist — Semana {currentWeek}</div>
          <div style={{ fontSize:11, fontWeight:600, color: pctSemana === 100 ? S.grn : G[500] }}>
            {feitos}/{totalItems} itens
          </div>
        </div>

        {/* Barra de progresso da semana */}
        <div style={{ height:6, background:G[100], borderRadius:3, overflow:"hidden", marginBottom:12 }}>
          <div style={{ height:"100%", width:`${pctSemana}%`, background: pctSemana === 100 ? S.grn : G[500], borderRadius:3, transition:"width 0.4s" }}/>
        </div>

        {checkItems.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom: i < checkItems.length - 1 ? `1px solid ${G[50]}` : "none" }}>
            <div style={{ width:20, height:20, borderRadius:5, background:item.feito ? S.grnBg : G[100], border:`2px solid ${item.feito ? S.grn : G[300]}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {item.feito && <Check size={11} color={S.grn}/>}
            </div>
            <span style={{ fontSize:12, color: item.feito ? "#bbb" : G[800], textDecoration: item.feito ? "line-through" : "none", flex:1 }}>
              {item.label}
            </span>
            {item.feito && <span style={{ fontSize:10, color:S.grn, fontWeight:600 }}>✓</span>}
          </div>
        ))}

        {totalItems === 0 && (
          <div style={{ textAlign:"center", color:"#ccc", fontSize:12, padding:"12px 0" }}>
            Nenhum item registrado para esta semana ainda.
          </div>
        )}

        <div style={{ fontSize:9, color:"#ccc", marginTop:8, textAlign:"center" }}>
          Preenchido pela equipe clínica — visualização apenas
        </div>
      </div>

      {/* Resumo de perda de peso */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color:G[700] }}>{p?.cw || "—"}kg</div>
          <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>Peso atual</div>
        </div>
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${perdaKg > 0 ? S.grn : G[200]}`, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color: perdaKg > 0 ? S.grn : "#bbb" }}>
            {perdaKg > 0 ? `-${perdaKg.toFixed(1).replace(".",",")}kg` : "—"}
          </div>
          <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>Perda total</div>
        </div>
      </div>
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
  // Histórico real de scores mensais (do ciclo ativo via normalizePatient)
  const hist = (p.scoreHistory || []).map(s => ({
    mo:  s.month || `Mês`,
    met: cM(s.m),
    be:  cB(s.b),
    mn:  cN(s.n),
  }));
  const plan = PLANS.find(x=>x.id===p.plan);
  const pct  = Math.round(p.week/16*100);
  // Checklist real da semana atual
  const activeCycle = p._activeCycle;
  const currentWeek = activeCycle?.currentWeek || p?.week || 1;
  const checkAtual  = (activeCycle?.weekChecks || []).find(wc => wc.weekNumber === currentWeek)
                    || (activeCycle?.weekChecks || []).slice(-1)[0] || null;
  const tasks = [
    { d: !!checkAtual?.tirzepatida,     l: "Tirzepatida aplicada" },
    { d: !!checkAtual?.pesoRegistrado,  l: "Pesagem semanal" },
    { d: !!checkAtual?.bioimpedancia,   l: "Bioimpedância" },
    { d: !!checkAtual?.terapia,         l: "Consulta de terapia" },
    { d: !!(checkAtual?.treinos?.[0]),  l: "Treino de resistência" },
  ];

  return (
    <div id={`portal-rel-${p.id}`} style={{ display:"flex", flexDirection:"column", gap:12 }}>
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
          <AreaChart data={(p.history||[]).map((h,i)=>({s:`S${i+1}`,w:h.weight}))}>
            <defs><linearGradient id="gpt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={S.grn} stopOpacity={0.2}/><stop offset="100%" stopColor={S.grn} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="s" tick={{fontSize:9,fill:G[600]}}/><YAxis domain={["dataMin-2","dataMax+1"]} tick={{fontSize:9,fill:"#bbb"}}/>
            <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Area type="monotone" dataKey="w" stroke={S.grn} fill="url(#gpt)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Evolução scores */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${G[200]}`, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:6 }}>Evolução dos scores</div>
        {hist.length > 0 ? (
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={hist}>
              <CartesianGrid strokeDasharray="3 3" stroke={G[100]}/><XAxis dataKey="mo" tick={{fontSize:9,fill:G[700]}}/><YAxis tick={{fontSize:9,fill:"#bbb"}}/>
              <Tooltip contentStyle={{borderRadius:8,fontSize:11}}/><Legend iconType="circle" wrapperStyle={{fontSize:9}}/>
              <Line type="monotone" dataKey="met" name="Met"    stroke={G[500]} strokeWidth={2} dot={{r:2}}/>
              <Line type="monotone" dataKey="be"  name="Bem"    stroke={S.grn}  strokeWidth={2} dot={{r:2}}/>
              <Line type="monotone" dataKey="mn"  name="Mental" stroke={S.pur}  strokeWidth={2} dot={{r:2}}/>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign:"center", color:"#ccc", fontSize:12, padding:"24px 0" }}>
            Histórico de scores disponível após a primeira consulta de retorno.
          </div>
        )}
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

/* WeighInModal extraído para frontend/src/components/WeighInModal.jsx */

/* ════════════════════════════════════════════
   MODAL REGISTRAR CIRCUNFERÊNCIA
   Separado da pesagem — preenchido após consulta
   com a nutricionista. Suporta data retroativa.
═══════════════════════════════════════════════ */
const CIRC_FIELDS = [
  { key:"torax",       label:"Tórax",       ph:"100.0" },
  { key:"abdomen",     label:"Abdômen",     ph:"90.0"  },
  { key:"cintura",     label:"Cintura",     ph:"85.0"  },
  { key:"quadril",     label:"Quadril",     ph:"100.0" },
  { key:"coxa",        label:"Coxa",        ph:"55.0"  },
  { key:"panturrilha", label:"Panturrilha", ph:"38.0"  },
  { key:"braco",       label:"Braço",       ph:"32.0"  },
  { key:"antebraco",   label:"Antebraço",   ph:"24.0"  },
];

function CircumferenceModal({ p, onClose, onSave, onLog }) {
  const [date, setDate]   = useState(format(new Date(),'yyyy-MM-dd'));
  const [vals, setVals]   = useState({ torax:"", abdomen:"", cintura:"", quadril:"", coxa:"", panturrilha:"", braco:"", antebraco:"" });
  const [body, setBody]   = useState({ peso:"", gordura:"", massaMagra:"", massaGorda:"" });
  const [obs,  setObs]    = useState("");
  const [err,  setErr]    = useState("");
  const [saving, setSaving] = useState(false);

  // Pré-popula com a última medição do paciente (se existir)
  useEffect(() => {
    const last = (p.circumferenceHistory || []).slice(-1)[0];
    if (last) setVals({ torax: last.torax||"", abdomen: last.abdomen||"", cintura: last.cintura||"", quadril: last.quadril||"", coxa: last.coxa||"", panturrilha: last.panturrilha||"", braco: last.braco||"", antebraco: last.antebraco||"" });
  }, []);

  const hasValue = Object.values(vals).some(v => v && parseFloat(v) > 0);

  const handleSave = async () => {
    if (!hasValue && !body.peso) return setErr("Preencha pelo menos uma medida ou o peso.");
    setSaving(true); setErr("");
    try {
      const cycleId = p._activeCycle?.id;
      if (!cycleId) throw new Error("Paciente sem ciclo ativo");

      // Save circumferences if any value provided
      if (hasValue) {
        const entry = await apiSaveCircumference({ cycleId, date, ...vals, observations: obs || undefined });
        onLog && onLog({ action:"circunferencia", patientId: p.id, patientName: p.name, detail: `Circunferências registradas em ${format(new Date(date+'T12:00:00'),'dd/MM/yy')}` });
      }

      // Save body composition via weekcheck if weight provided
      if (body.peso && parseFloat(body.peso) > 0) {
        const weekNumber = p.week || 1;
        await apiSaveWeekCheck({
          cycleId,
          weekNumber,
          pesoRegistrado: parseFloat(body.peso),
          massaMagra:     body.massaMagra ? parseFloat(body.massaMagra) : undefined,
          massaGordura:   body.massaGorda ? parseFloat(body.massaGorda) : undefined,
          weekDate:       date ? new Date(date+'T12:00:00').toISOString() : new Date().toISOString(),
          sendWhatsApp:   false,
        });
        onLog && onLog({ action:"composicao_corporal", patientId: p.id, patientName: p.name, detail: `Composição corporal registrada: ${body.peso}kg${body.gordura ? `, ${body.gordura}% gordura` : ''}` });
      }

      onSave && onSave();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Erro ao salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  const BODY_FIELDS = [
    { key:"peso", label:"Peso (kg)", ph: p.cw ? String(p.cw) : "70.0" },
    { key:"gordura", label:"% Gordura", ph:"25.0" },
    { key:"massaMagra", label:"Massa magra (kg)", ph:"45.0" },
    { key:"massaGorda", label:"Massa gorda (kg)", ph:"20.0" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:440, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontSize:15, fontWeight:700, color:G[800] }}>Registrar medidas</span>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50], fontSize:13, color:"#aaa" }}>X</div>
        </div>
        <div style={{ fontSize:11, color:"#aaa", marginBottom:14 }}>{p.name} -- Preencher apos consulta com a nutricionista</div>

        {err && <div style={{ color:"#C0392B", fontSize:12, marginBottom:10, padding:"8px 10px", background:"#fef2f2", borderRadius:6 }}>{err}</div>}

        {/* Data */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Data da avaliacao</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
          <div style={{ fontSize:10, color:"#aaa", marginTop:3 }}>Pode informar uma data retroativa para alinhar com dados anteriores</div>
        </div>

        {/* Body composition (optional) */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:G[700], marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${G[200]}` }}>Composicao corporal (opcional)</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {BODY_FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize:10, fontWeight:500, color:G[700], marginBottom:2, display:"block" }}>{f.label}</label>
                <input type="number" step="0.1" value={body[f.key]} placeholder={f.ph}
                  onChange={e=>setBody(pr=>({...pr,[f.key]:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Circumference fields */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:600, color:G[700], marginBottom:8, paddingBottom:4, borderBottom:`1px solid ${G[200]}` }}>Circunferencias (cm)</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {CIRC_FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize:10, fontWeight:500, color:G[700], marginBottom:2, display:"block" }}>{f.label} (cm)</label>
                <input type="number" step="0.1" value={vals[f.key]} placeholder={f.ph}
                  onChange={e=>setVals(pr=>({...pr,[f.key]:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Última medição para referência */}
        {(p.circumferenceHistory||[]).length > 0 && (() => {
          const last = p.circumferenceHistory.slice(-1)[0];
          return (
            <div style={{ background:G[50], borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:10, color:G[700] }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Ultima medicao: {safeFmt(last.date,'dd/MM/yy')}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px" }}>
                {CIRC_FIELDS.map(f => last[f.key] ? <span key={f.key}>{f.label}: <strong>{last[f.key]}cm</strong></span> : null)}
              </div>
            </div>
          );
        })()}

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Observacoes (opcional)</label>
          <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2} placeholder="Ex: medicao pos-consulta nutricao semana 8"
            style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", resize:"none", boxSizing:"border-box" }}/>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity:saving?0.7:1 }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={onClose} style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
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
  const [err,       setErr]       = useState("");

  const handleSave = () => {
    if (!nome.trim()) return setErr("Informe o nome.");
    if (!email.trim()) return setErr("Informe o e-mail.");
    setErr("");
    const roleInfo = ROLES.find(r=>r.id===role);
    const nm = { id: crypto.randomUUID(), name: nome.trim(), role, label: roleInfo?.label||role, specialty, email, phone, color: roleInfo?.color||G[600], createdAt: new Date().toISOString() };
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
          { label:"Telefone / WhatsApp", val:phone, set:setPhone, type:"tel", ph:"(24) 99999-0000" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
            <input type={f.type} value={f.val}
              onChange={e=>f.set(f.type==='tel' ? maskPhone(e.target.value) : e.target.value)} placeholder={f.ph}
              style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          {err && <div style={{ color:"#e53e3e", fontSize:12, marginBottom:8 }}>{err}</div>}
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
  const [altura, setAltura] = useState("");
  const [plan, setPlan]   = useState("essential");
  const [err,  setErr]    = useState("");
  // Circunferências iniciais (opcionais — para pacientes em execução)
  const [showCirc, setShowCirc]           = useState(false);
  const [circDate, setCircDate]           = useState(format(new Date(),'yyyy-MM-dd'));
  const [torax, setTorax]                 = useState("");
  const [abdomen, setAbdomen]             = useState("");
  const [cintura, setCintura]             = useState("");
  const [quadril, setQuadril]             = useState("");
  const [panturrilha, setPanturrilha]     = useState("");
  const [braco, setBraco]                 = useState("");
  const [coxa, setCoxa]                   = useState("");
  const [antebraco, setAntebraco]         = useState("");

  const handleSave = () => {
    const w = parseFloat(peso);
    if (!nome.trim() || !nasc || !w) return setErr("Preencha nome, nascimento e peso.");
    if (!email.trim()) return setErr("Preencha o e-mail do paciente.");
    setErr("");
    const np = {
      id: crypto.randomUUID(), name: nome.trim(), plan, cycle: 1, week: 1,
      birthDate: nasc, phone, email, sd: new Date().toISOString(),
      iw: w, cw: w, height: altura ? parseFloat(altura) : undefined,
      history: [], scoreHistory: [], circumferenceHistory: [],
      nr: addDays(new Date(), 7).toISOString(), eng: 100,
      // Circunferências iniciais (enviadas ao backend junto com o paciente)
      ...(showCirc && { circumferenceDate: circDate, torax, abdomen, cintura, quadril, coxa, panturrilha, braco, antebraco })
    };
    onSave(np);
    onClose();
  };

  const circFields = [
    { label:"Tórax",      val:torax,       set:setTorax,       ph:"100.0" },
    { label:"Abdômen",    val:abdomen,     set:setAbdomen,     ph:"90.0"  },
    { label:"Cintura",    val:cintura,     set:setCintura,     ph:"85.0"  },
    { label:"Quadril",    val:quadril,     set:setQuadril,     ph:"100.0" },
    { label:"Coxa",       val:coxa,        set:setCoxa,        ph:"55.0"  },
    { label:"Panturrilha",val:panturrilha, set:setPanturrilha, ph:"38.0"  },
    { label:"Braço",      val:braco,       set:setBraco,       ph:"32.0"  },
    { label:"Antebraço",  val:antebraco,   set:setAntebraco,   ph:"24.0"  },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:440, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", maxHeight:"92vh", overflowY:"auto", margin:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontSize:16, fontWeight:700, color:G[800] }}>Novo paciente</span>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50] }}>✕</div>
        </div>

        {/* Dados principais */}
        {[
          { label:"Nome completo", val:nome, set:setNome, type:"text", ph:"Ana Carolina Silva" },
          { label:"E-mail *", val:email, set:setEmail, type:"email", ph:"paciente@email.com" },
          { label:"Data de nascimento", val:nasc, set:setNasc, type:"date", ph:"" },
          { label:"Peso inicial (kg)", val:peso, set:setPeso, type:"number", ph:"80.5" },
          { label:"Altura (cm)", val:altura, set:setAltura, type:"number", ph:"165" },
          { label:"Telefone / WhatsApp", val:phone, set:setPhone, type:"tel", ph:"(24) 99999-0000" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
            <input type={f.type} value={f.val}
              onChange={e=>f.set(f.type==='tel' ? maskPhone(e.target.value) : e.target.value)} placeholder={f.ph}
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

        {/* Seção de circunferências — expansível */}
        <div style={{ border:`1px solid ${showCirc ? G[400] : G[200]}`, borderRadius:10, marginBottom:16, overflow:"hidden" }}>
          <div onClick={()=>setShowCirc(!showCirc)} style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", background:showCirc?G[50]:"#fff" }}>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:G[800] }}>📏 Circunferências iniciais</span>
              <span style={{ fontSize:10, color:"#aaa", marginLeft:6 }}>(opcional — para dados retroativos)</span>
            </div>
            <span style={{ fontSize:12, color:G[600] }}>{showCirc ? "▲" : "▼"}</span>
          </div>
          {showCirc && (
            <div style={{ padding:"12px 14px", borderTop:`1px solid ${G[200]}` }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Data da medição</label>
                <input type="date" value={circDate} onChange={e=>setCircDate(e.target.value)}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                <div style={{ fontSize:10, color:"#aaa", marginTop:3 }}>Pode ser uma data retroativa se já tem acompanhamento</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {circFields.map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize:10, fontWeight:500, color:G[700], marginBottom:2, display:"block" }}>{f.label} (cm)</label>
                    <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} step="0.1"
                      style={{ width:"100%", padding:"7px 9px", borderRadius:6, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {err && <div style={{ color:"#e53e3e", fontSize:12, marginBottom:8 }}>{err}</div>}
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
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [fpEmail,    setFpEmail]    = useState('');
  const [fpSent,     setFpSent]     = useState(false);
  const [fpLoading,  setFpLoading]  = useState(false);
  const [fpError,    setFpError]    = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) return setError('Informe e-mail e senha.');
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      const token    = data.session.access_token;
      const meta     = data.user.user_metadata;
      const role     = meta?.role?.toLowerCase() || 'admin';
      localStorage.setItem('serlivre_token', token);
      localStorage.setItem('serlivre_user',  JSON.stringify({ id: data.user.id, email: data.user.email, name: meta?.name || email, role }));
      onLogin(role === 'paciente' ? 'paciente' : 'admin');
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : err.message || 'Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
            {error && <div style={{ background:"#FDEDEC", color:"#C0392B", padding:"9px 12px", borderRadius:8, marginBottom:14, fontSize:12 }}>{error}</div>}
            <form onSubmit={handleLogin}>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>E-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                placeholder="email@institutowogel.com"
                style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>Senha</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"11px", borderRadius:9, background:loading?G[400]:G[600], color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Lock size={14}/>{loading ? "Entrando..." : "Entrar"}
            </button>
            </form>
            <div style={{ textAlign:"center", marginTop:10 }}>
              <span onClick={()=>setForgotMode(true)} style={{ fontSize:11, color:G[600], cursor:"pointer", textDecoration:"underline" }}>Esqueceu a senha?</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   NORMALIZAÇÃO — converte resposta da API para
   o formato interno usado pela UI
═══════════════════════════════════════════════ */

/**
 * Converte um paciente retornado pela API real para o formato
 * interno que a UI consome. Os campos `iw`, `cw`, `name`, etc.
 * são mantidos para compatibilidade com todos os componentes.
 */
function normalizePatient(p) {
  const activeCycle = (p.cycles || []).find(c => c.status === 'ACTIVE') || (p.cycles || [])[0] || null;

  // Histórico de pesagens: derivado dos weekChecks do ciclo ativo
  const history = activeCycle
    ? (activeCycle.weekChecks || [])
        .filter(wc => wc.pesoRegistrado)
        .map((wc, i) => ({
          date:         wc.weekDate || wc.createdAt || new Date().toISOString(),
          weight:       wc.pesoRegistrado || 0,
          massaMagra:   wc.massaMagra   || 0,
          massaGordura: wc.massaGordura || 0,
          // scores clínicos armazenados como JSON no weekCheck se disponíveis
          m: wc.scoresM || {},
          b: wc.scoresB || {},
          n: wc.scoresN || {},
        }))
    : [];

  // Histórico de scores mensais: derivado dos scores do ciclo ativo
  const scoreHistory = activeCycle
    ? (activeCycle.scores || []).map((s, i) => ({
        id:    s.id,
        date:  s.createdAt || new Date().toISOString(),
        month: s.month     || `Mês ${i + 1}`,
        m: { gv: s.gorduraVisceral||2, mm: s.massaMuscular||2, pcr: s.pcrUltrassensivel||2, fer: s.ferritina||2, hb: s.hemoglobinaGlicada||2, au: s.acidoUrico||2, th: s.triglicerideosHdl||2, ca: s.circAbdominal||2 },
        b: { gi: s.gastrointestinal||2, lib: s.libido||2, dor: s.doresArticulares||2, au: s.autoestimaMental||2, en: s.energiaPerformance||2, so: s.sonoCefaleia||2 },
        n: { co: s.consistenciaAlimentar||2, ge: s.gestaoEmocional||2, mv: s.movimentoPresenca||2 },
      }))
    : [];

  return {
    // identificadores — id agora é Int do banco
    id:     p.id,
    userId: p.userId,

    // dados do usuário (user é a conta de auth)
    name:      p.user?.name      || '',
    email:     p.user?.email     || '',
    phone:     p.user?.phone     || '',
    avatarUrl: p.user?.avatarUrl || null,

    // dados do paciente
    plan:      (p.plan || 'ESSENTIAL').toLowerCase(),
    birthDate: p.birthDate ? p.birthDate.split('T')[0] : '',
    sd:        p.startDate ? p.startDate.split('T')[0] : p.createdAt ? p.createdAt.split('T')[0] : '',

    // altura e pesos
    height: p.height || null,
    iw:  p.initialWeight  || 0,
    cw:  p.currentWeight  || p.initialWeight || 0,

    // ciclo e semana (do ciclo ativo)
    cycle: activeCycle?.number      || 1,
    week:  activeCycle?.currentWeek || 1,

    // próximo retorno — não existe no banco ainda; calculado a partir da semana atual
    nr: activeCycle
      ? addDays(new Date(), Math.max(0, ((activeCycle.currentWeek || 1) * 7) - differenceInDays(new Date(), new Date(p.createdAt || new Date())))).toISOString()
      : addDays(new Date(), 7).toISOString(),

    // engajamento — derivado do percentual de itens do checklist completados
    eng: (() => {
      if (!activeCycle || !(activeCycle.weekChecks || []).length) return 0;
      const wcs = activeCycle.weekChecks;
      const done = wcs.filter(wc => wc.pesoRegistrado || wc.tirzepatida || wc.pesagem).length;
      return Math.round((done / Math.max(wcs.length, 1)) * 100);
    })(),

    // histórico de pesagens e scores
    history,
    scoreHistory,

    // histórico de circunferências (do ciclo ativo, ordenado por data)
    circumferenceHistory: activeCycle
      ? (activeCycle.circumferences || []).map(c => ({
          id:           c.id,
          date:         c.date,
          torax:        c.torax       != null ? Number(c.torax)       : null,
          abdomen:      c.abdomen     != null ? Number(c.abdomen)     : null,
          cintura:      c.cintura     != null ? Number(c.cintura)     : null,
          quadril:      c.quadril     != null ? Number(c.quadril)     : null,
          panturrilha:  c.panturrilha != null ? Number(c.panturrilha) : null,
          braco:        c.braco       != null ? Number(c.braco)       : null,
          coxa:         c.coxa        != null ? Number(c.coxa)        : null,
          antebraco:    c.antebraco   != null ? Number(c.antebraco)   : null,
          observations: c.observations || null,
        }))
      : [],

    // ciclo completo para referência
    _activeCycle: activeCycle,
    _cycles:      p.cycles || [],
  };
}

/* ════════════════════════════════════════════
   APP PRINCIPAL
═══════════════════════════════════════════════ */
export default function App() {
  const [ps,          setPs]          = useState([]);
  const [team,        setTeam]        = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [messages,    setMessages]    = useState([]);
  const [dbLoaded,    setDbLoaded]    = useState(false);
  const [toasts,      setToasts]      = useState([]);
  const [confirmDel,  setConfirmDel]  = useState(null); // { id, name, redirect }
  const [reloading,   setReloading]   = useState(false);

  const toast = (msg, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  // Carrega dados do servidor na inicialização
  useEffect(() => {
    const token = localStorage.getItem('serlivre_token');
    if (!token) {
      // Sem token: não há dados para carregar — mostra tela de login
      setDbLoaded(true);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/patients', { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pData]) => {
      if (Array.isArray(pData) && pData.length > 0) {
        setPs(pData.map(normalizePatient));
      }
      setDbLoaded(true);
    }).catch(() => setDbLoaded(true));
  }, []);

  // Mensagens são persistidas diretamente via POST /api/messages (ver componente Mensagens)
  // Não usar mais saveToApi para mensagens — rota /api/state/* não existe para esse fim

  const addLog = ({ action, patientId, patientName, detail }) => {
    // Usa dados reais do usuário logado (não hardcoded)
    const userRaw = (() => { try { return JSON.parse(localStorage.getItem('serlivre_user') || '{}'); } catch { return {}; } })();
    const entry = { id: crypto.randomUUID(), date: new Date().toISOString(), memberId: userRaw.id || '', memberName: userRaw.name || 'Usuário', action, patientId, patientName, detail };
    setActivityLog(prev=>[entry,...prev]);
    logActivity({ action, patientId, patientName, detail }).catch(() => {});
  };

  // Recarrega lista de pacientes da API real
  const reloadPatients = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem('serlivre_token');
    if (!token) return;
    setReloading(true);
    // Tenta até 2 vezes em caso de falha de rede
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const r = await fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) {
            setPs(data.map(normalizePatient));
            setReloading(false);
            return; // sucesso
          }
        } else if (r.status === 401) {
          // Token expirado — força logout
          localStorage.removeItem('serlivre_token');
          localStorage.removeItem('serlivre_user');
          setLg(false);
          setReloading(false);
          return;
        }
      } catch (e) {
        console.error(`[reloadPatients] tentativa ${attempt} falhou:`, e.message);
        if (attempt === 2 && !silent) {
          toast('Falha ao carregar pacientes. Verifique a conexão e recarregue a página.', 'error');
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
      }
    }
    setReloading(false);
  }, []);

  const SC = genSC(ps);

  const [lg,      setLg]      = useState(!!localStorage.getItem('serlivre_token'));
  const [isReset, setIsReset] = useState(false);
  const [mode, setMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('serlivre_user') || '{}').role === 'paciente' ? 'paciente' : 'admin'; }
    catch { return 'admin'; }
  });
  // Usuário logado atual (lido do localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('serlivre_user') || '{}'); } catch { return {}; }
  });
  const [showProfile, setShowProfile] = useState(false);
  const [page, setPage] = useState("dash");

  // Detectar se veio de link de reset de senha
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setIsReset(true);
    }
  }, []);

  // Carrega equipe e activity log após login
  useEffect(() => {
    if (lg && mode !== 'paciente') {
      getStaff().then(r => setTeam(r.data)).catch(() => {});
      getActivity().then(r => setActivityLog(r.data)).catch(() => {});
    }
  }, [lg, mode]);

  const doLogout = () => {
    localStorage.removeItem('serlivre_token');
    localStorage.removeItem('serlivre_user');
    supabase.auth.signOut().catch(() => {});
    setLg(false);
    setPs([]);
    setPage("dash");
    setCurrentUser({});
  };
  const [sid,  setSid]  = useState(null);
  const [so,   setSo]   = useState(true);
  const [avs,  setAvs]  = useState({});
  const [ta,   setTa]   = useState({});
  const [nl,   setNl]   = useState(false);
  const mob = useMob();
  const sp  = ps.find(p => p.id===sid);

  // Navega para detalhe do paciente e carrega dados completos (com weekChecks e scores)
  const go  = useCallback(async (id) => {
    setSid(id);
    setPage("det");
    const token = localStorage.getItem('serlivre_token');
    if (!token) return;
    try {
      const r = await fetch(`/api/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const full = await r.json();
        setPs(prev => prev.map(x => x.id === id ? normalizePatient(full) : x));
      }
    } catch (e) {
      console.error('Falha ao carregar detalhe do paciente:', e.message);
    }
  }, []);

  /* alertas críticos */
  const ac = ps.filter(p => { const sc=SC[p.id]; return sc&&(cM(sc.m)<=12||cB(sc.b)<10); }).length;

  /* mensagens não lidas */
  const unreadMsgs = messages.filter(m => !m.read && m.role !== "admin").length;

  const titles = { dash:"Dashboard", pat:"Pacientes", det:sp?.name||"", alert:"Central de alertas", team:"Equipe", agenda:"Agenda", msg:"Mensagens" };
  const nav = [
    {k:"dash",  l:"Dashboard", i:LayoutDashboard},
    {k:"pat",   l:"Pacientes", i:Users},
    {k:"agenda",l:"Agenda",    i:CalendarDays},
    {k:"msg",   l:"Mensagens", i:MessageCircle},
    {k:"alert", l:"Alertas",   i:AlertTriangle},
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

  /* ─── Reset de senha ─── */
  if (isReset) return <ResetPassword onDone={() => { setIsReset(false); window.location.hash = ''; }}/>;

  /* ─── Não logado ─── */
  if (!lg) return <Login onLogin={async (m) => {
    setLg(true);
    setMode(m);
    try { setCurrentUser(JSON.parse(localStorage.getItem('serlivre_user') || '{}')); } catch (_) {}
    setPage("dash");
    setDbLoaded(false);
    try { await reloadPatients(); } catch (_) {}
    setDbLoaded(true);
  }}/>;

  /* ─── PORTAL DO PACIENTE ─── */
  if (mode==="paciente") {
    const pp = ps[0];
    // Paciente ainda carregando — spinner animado real
    if (!pp) return (
      <>
        <style>{`@keyframes spin-portal{to{transform:rotate(360deg)}}@keyframes pulse-bar{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
        <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${G[800]},${G[900]})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center", color:"#fff" }}>
            <div style={{ width:48, height:48, border:"3px solid rgba(255,255,255,0.2)", borderTopColor:"#fff", borderRadius:"50%", margin:"0 auto 16px", animation:"spin-portal 0.9s linear infinite" }}/>
            <div style={{ fontSize:14, fontWeight:600 }}>Carregando seu perfil...</div>
            <div style={{ fontSize:11, opacity:0.5, marginTop:6 }}>Aguarde um instante</div>
            <div style={{ width:32, height:3, background:G[400], borderRadius:2, margin:"14px auto 0", animation:"pulse-bar 1.5s ease-in-out infinite" }}/>
          </div>
        </div>
      </>
    );
    return (
      <div style={{ fontFamily:"'Outfit','Inter',system-ui,sans-serif", background:W[50], minHeight:"100vh", color:"#2C2C2A" }}>
        <div style={{ maxWidth:480, margin:"0 auto", padding:"10px 12px 80px" }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Shield size={16} color={G[500]}/>
              <span style={{ fontSize:13, fontWeight:600, color:G[800] }}>Ser Livre</span>
            </div>
            <div onClick={doLogout} style={{ cursor:"pointer", padding:4 }}>
              <LogOut size={14} color="#bbb"/>
            </div>
          </div>
          {/* Conteúdo por aba */}
          {page==="dash"    && <Portal p={pp} av={avs[pp.id]} setAv={url=>setAvs(pr=>({...pr,[pp.id]:url}))}/>}
          {page==="semana"  && <MinhaSemana p={pp}/>}
          {page==="msg"     && <Mensagens ps={ps} messages={messages} setMessages={setMessages} mob patientMode patientPid={pp?.id}/>}
          {page==="agenda"  && (
            <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${G[200]}`, padding:"16px 14px", display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ fontSize:13, fontWeight:600, color:G[800], marginBottom:4 }}>📅 Seu próximo retorno</div>
              {pp?.nr ? (
                <>
                  <div style={{ textAlign:"center", padding:"20px 0" }}>
                    <div style={{ fontSize:34, fontWeight:700, color:G[600] }}>{new Date(pp.nr).getDate()}</div>
                    <div style={{ fontSize:13, color:"#aaa" }}>
                      {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][new Date(pp.nr).getMonth()]} {new Date(pp.nr).getFullYear()}
                    </div>
                    {(() => {
                      const diff = Math.ceil((new Date(pp.nr) - new Date()) / 86400000);
                      return diff >= 0
                        ? <Bg color={diff===0?S.grn:diff<=3?S.yel:G[500]} bg={diff===0?S.grnBg:diff<=3?S.yelBg:G[50]} style={{marginTop:8,display:"inline-block"}}>{diff===0?"Hoje!":diff===1?"Amanhã":`Em ${diff} dias`}</Bg>
                        : <Bg color={S.red} bg={S.redBg}>Retorno vencido há {Math.abs(diff)} dias</Bg>;
                    })()}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", textAlign:"center" }}>
                    Semana {pp.week}/16 · Ciclo {pp.cycle}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:"center", color:"#ccc", fontSize:12, padding:"20px 0" }}>
                  Nenhum retorno agendado
                </div>
              )}
            </div>
          )}
        </div>
        {/* Bottom nav do paciente */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:`1px solid ${G[200]}`,
          display:"flex", justifyContent:"space-around", padding:"6px 0 max(6px,env(safe-area-inset-bottom))", zIndex:50 }}>
          {[{k:"dash",l:"Início",i:Home},{k:"semana",l:"Semana",i:ClipboardCheck},{k:"msg",l:"Mensagens",i:MessageCircle},{k:"agenda",l:"Agenda",i:CalendarDays}].map(n=>{
            const a=page===n.k;
            const badge=n.k==="msg"&&unreadMsgs>0;
            return (
              <div key={n.k} onClick={()=>setPage(n.k)}
                style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:1,cursor:"pointer",padding:"3px 20px",position:"relative",flex:1 }}>
                <n.i size={20} color={a?G[600]:"#ccc"}/>
                <span style={{ fontSize:9, fontWeight:a?600:400, color:a?G[600]:"#ccc" }}>{n.l}</span>
                {badge && <div style={{ position:"absolute",top:-1,right:"25%",width:10,height:10,borderRadius:"50%",background:G[500] }}/>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── Handlers de ações sobre pacientes ─── */

  // Criar paciente via API real e recarregar lista
  const handleCreatePatient = async (np) => {
    try {
      await apiCreatePatient({
        name:          np.name,
        email:         np.email,
        phone:         np.phone,
        plan:          (np.plan || 'essential').toUpperCase(),
        birthDate:     np.birthDate || undefined,
        initialWeight: np.iw,
        height:        np.height   || undefined,
        // Circunferências iniciais (opcionais — retroativas)
        ...(np.circumferenceDate && { circumferenceDate: np.circumferenceDate }),
        ...(np.torax        && { torax:       np.torax       }),
        ...(np.abdomen      && { abdomen:     np.abdomen     }),
        ...(np.cintura      && { cintura:     np.cintura     }),
        ...(np.quadril      && { quadril:     np.quadril     }),
        ...(np.panturrilha  && { panturrilha: np.panturrilha }),
        ...(np.braco        && { braco:       np.braco       }),
      });
      await reloadPatients();
      toast(`Paciente ${np.name} cadastrado com sucesso!`, 'success');
      addLog({ action:"cadastro", patientId: 0, patientName: np.name, detail:"Novo paciente cadastrado" });
    } catch (err) {
      toast(err?.response?.data?.error || err?.message || 'Erro ao cadastrar paciente. Tente novamente.', 'error');
    }
  };

  // Excluir paciente — aguarda confirmação da API antes de remover da UI
  const handleDeletePatient = (id, redirect = false) => {
    const patient = ps.find(p => p.id === id);
    const name = patient?.name || patient?.user?.name || 'este paciente';
    setConfirmDel({ id, name, redirect });
  };

  const doDeletePatient = async () => {
    if (!confirmDel) return;
    const { id, redirect } = confirmDel;
    setConfirmDel(null);
    try {
      await apiDeletePatient(id);
      setPs(prev => prev.filter(x => x.id !== id));
      if (redirect) setPage('pat');
      toast('Paciente excluído com sucesso.', 'success');
    } catch (err) {
      toast(err?.response?.data?.error || 'Erro ao excluir paciente. Tente novamente.', 'error');
    }
  };

  // Salvar scores — persiste via API e atualiza lista local
  const handleSaveScores = async (scores, monthRef) => {
    const mo = monthRef || format(new Date(), "MMM/yy");
    // Atualiza scoreHistory local imediatamente
    setPs(prev => prev.map(x => {
      if (x.id !== sp.id) return x;
      const sh = x.scoreHistory || [];
      const exists = sh.findIndex(s => s.month === mo);
      const entry = { id: crypto.randomUUID(), date: new Date().toISOString(), month: mo, m: scores.m, b: scores.b, n: scores.n };
      const newSh = exists >= 0 ? sh.map((s,i) => i===exists ? entry : s) : [...sh, entry];
      return { ...x, scoreHistory: newSh };
    }));
    addLog({ action:"scores", patientId: sp.id, patientName: sp.name, detail:"Scores metabólicos atualizados" });

    // Persiste via API se houver ciclo ativo
    const cycleId = sp._activeCycle?.id;
    if (cycleId && scores.m && scores.b && scores.n) {
      const sm = scores.m; const sb = scores.b; const sn = scores.n;
      apiSaveScores({
        cycleId,
        month: mo,
        gorduraVisceral:       sm.gv  || 2,
        massaMuscular:         sm.mm  || 2,
        pcrUltrassensivel:     sm.pcr || 2,
        ferritina:             sm.fer || 2,
        hemoglobinaGlicada:    sm.hb  || 2,
        acidoUrico:            sm.au  || 2,
        triglicerideosHdl:     sm.th  || 2,
        circAbdominal:         sm.ca  || 2,
        gastrointestinal:      sb.gi  || 2,
        libido:                sb.lib || 2,
        doresArticulares:      sb.dor || 2,
        autoestimaMental:      sb.au  || 2,
        energiaPerformance:    sb.en  || 2,
        sonoCefaleia:          sb.so  || 2,
        consistenciaAlimentar: sn.co  || 2,
        gestaoEmocional:       sn.ge  || 2,
        movimentoPresenca:     sn.mv  || 2,
      }).then(() => reloadPatients()).catch(err => { console.error('Scores API failed:', err.message); toast(err.response?.data?.error || 'Erro ao salvar. Tente novamente.', 'error'); });
    }
  };

  // Adicionar pesagem — persiste via weekCheck API
  const handleAddWeighIn = async (entry) => {
    setPs(prev => prev.map(x => x.id === sp.id ? { ...x, cw: entry.weight, history: [...(x.history || []), entry] } : x));
    const cycleId    = sp._activeCycle?.id;
    const weekNumber = sp.week || 1;
    if (cycleId) {
      apiSaveWeekCheck({
        cycleId,
        weekNumber,
        pesoRegistrado: entry.weight,
        massaMagra:     entry.massaMagra   || undefined,
        massaGordura:   entry.massaGordura || undefined,
        weekDate:       entry.date         || new Date().toISOString(),
        sendWhatsApp:   entry.sendWhatsApp || false,  // backend envia WhatsApp se true
      }).then(() => reloadPatients()).catch(err => { console.error('WeekCheck API failed:', err.message); toast(err.response?.data?.error || 'Erro ao salvar. Tente novamente.', 'error'); });
    }
  };

  // Recarregar pacientes após nova circunferência (o modal salva via API por conta própria)
  const handleAddCircumference = () => {
    reloadPatients({ silent: true });
  };

  // Adicionar score mensal ao histórico local (mantido por compatibilidade)
  const handleAddScoreMonth = ({ m, b, n }, mo) => {
    const month = mo || format(new Date(), "MMM/yy");
    setPs(prev => prev.map(x => x.id === sp.id
      ? { ...x, scoreHistory: [...(x.scoreHistory || []), { id: crypto.randomUUID(), date: new Date().toISOString(), month, m, b, n }] }
      : x
    ));
  };

  // Alterar plano via API real
  const handleChangePlan = async (newPlan) => {
    const prev = ps.find(x => x.id === sp.id)?.plan;
    setPs(p => p.map(x => x.id === sp.id ? { ...x, plan: newPlan } : x));
    try {
      await apiUpdatePatient(sp.id, { plan: newPlan.toUpperCase() });
      toast('Plano alterado com sucesso!', 'success');
    } catch (err) {
      // Rollback UI em caso de erro
      setPs(p => p.map(x => x.id === sp.id ? { ...x, plan: prev } : x));
      toast(err?.response?.data?.error || 'Erro ao alterar plano. Tente novamente.', 'error');
    }
  };

  // Editar dados via API real
  const handleEdit = async (upd) => {
    setPs(prev => prev.map(x => x.id === sp.id ? { ...x, ...upd } : x));
    try {
      await apiUpdatePatient(sp.id, {
        phone:     upd.phone     || undefined,
        birthDate: upd.birthDate || undefined,
        // name e email são no user — o backend aceita via PUT /patients/:id → user
      });
    } catch (err) {
      console.error('Patient edit failed:', err.message);
      toast(err.response?.data?.error || 'Erro ao salvar. Tente novamente.', 'error');
    }
  };

  // Finalizar programa
  const handleFinish = async (id) => {
    try {
      await apiFinishProgram(id);
      await reloadPatients();
    } catch (err) {
      console.error('API finish failed:', err.message);
      toast(err.response?.data?.error || 'Erro ao salvar. Tente novamente.', 'error');
    }
    addLog({ action:"finalizado", patientId: sp.id, patientName: sp.name, detail:"Programa finalizado" });
  };

  // Reiniciar programa (novo ciclo)
  const handleRestart = async (id) => {
    try {
      await apiRestartProgram(id);
      await reloadPatients();
    } catch (err) {
      console.error('API restart failed:', err.message);
      toast(err.response?.data?.error || 'Erro ao reiniciar programa. Tente novamente.', 'error');
      setPs(prev => prev.map(x => x.id === id ? { ...x, cycle: (x.cycle || 1) + 1, week: 1 } : x));
    }
    addLog({ action:"reinicio", patientId: sp.id, patientName: sp.name, detail:`Novo ciclo iniciado: C${(sp.cycle || 1) + 1}` });
  };

  // Resolver alerta
  const handleResolveAlert = async (alertId) => {
    try {
      await apiResolveAlert(alertId);
      toast('Alerta resolvido!');
    } catch (err) {
      console.error('Resolve alert failed:', err.message);
      toast('Erro ao resolver alerta', 'error');
    }
  };

  /* ─── CONTEÚDO ADMIN ─── */
  const content = (
    <>
      {page==="dash"  && <Dash  ps={ps} onSel={go} mob={mob}/>}
      {page==="pat"   && <PList ps={ps} onSel={go} mob={mob} onAdd={()=>setNl(true)} onDelete={handleDeletePatient}/>}
      {page==="det"   && sp && <PDetail p={sp} onBack={()=>setPage("pat")} mob={mob} avs={avs} setAvs={setAvs}
        onSaveScores={handleSaveScores}
        onAddWeighIn={handleAddWeighIn}
        onAddCircumference={handleAddCircumference}
        onAddScoreMonth={handleAddScoreMonth}
        onChangePlan={handleChangePlan}
        activityLog={activityLog}
        onLog={addLog}
        onDelete={id=>{ handleDeletePatient(id, true); }}
        onFinish={handleFinish}
        onRestart={handleRestart}
        onEdit={handleEdit}
        messages={messages}
        setMessages={setMessages}
        currentUser={currentUser}
        onSendMsg={msg=>setMessages(prev=>[...prev,msg])}/>}
      {page==="alert" && <Alerts ps={ps} onSel={go} onResolve={handleResolveAlert}/>}
      {page==="team"  && <TeamP team={team} setTeam={setTeam} ta={ta} setTa={setTa} activityLog={activityLog} onToast={toast} currentUser={currentUser}/>}
      {page==="agenda"&& <Agenda ps={ps} onSel={go} mob={mob}/>}
      {page==="msg"   && <Mensagens ps={ps} messages={messages} setMessages={setMessages} mob={mob}/>}
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
          {reloading && <span style={{ fontSize:10, color:G[400], marginLeft:6, fontWeight:400 }}>↻</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ cursor:"pointer" }} onClick={()=>setShowProfile(true)}>
            <Av name={currentUser.name || 'U'} size={24} src={ta[currentUser.id]}/>
          </div>
          <div style={{ position:"relative", cursor:"pointer" }} onClick={()=>setPage("alert")}>
            <Bell size={16} color={G[600]}/>
            {ac>0 && <div style={{ position:"absolute", top:-3, right:-3, width:12, height:12, borderRadius:"50%", background:S.red, color:"#fff", fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{ac}</div>}
          </div>
          <div onClick={doLogout} style={{ cursor:"pointer" }}><LogOut size={14} color="#bbb"/></div>
        </div>
      </div>
      {/* Conteúdo */}
      <div style={{ padding:"10px 12px" }}>
        {nl && <NewLeadModal onClose={()=>setNl(false)} onSave={np=>{ setNl(false); handleCreatePatient(np); }}/>}
        {content}</div>
      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:`1px solid ${G[200]}`, display:"flex", justifyContent:"space-around", padding:"6px 0 max(6px,env(safe-area-inset-bottom))", zIndex:50 }}>
        {nav.map(n => {
          const a = page===n.k || (n.k==="pat"&&page==="det");
          return (
            <div key={n.k} onClick={()=>{ setPage(n.k); setSid(null); }} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1, cursor:"pointer", padding:"3px 6px", position:"relative", flex:1 }}>
              <n.i size={18} color={a?G[600]:"#ccc"}/>
              <span style={{ fontSize:8, fontWeight:a?600:400, color:a?G[600]:"#ccc" }}>{n.l}</span>
              {n.k==="alert" && ac>0 && <div style={{ position:"absolute", top:-1, right:4, width:10, height:10, borderRadius:"50%", background:S.red }}/>}
              {n.k==="msg" && unreadMsgs>0 && <div style={{ position:"absolute", top:-1, right:4, width:10, height:10, borderRadius:"50%", background:G[500] }}/>}
            </div>
          );
        })}
      </div>
      {/* Toast unificado — mobile (bottom elevado para não sobrepor nav) */}
      <div style={{ position:'fixed', bottom:72, right:12, zIndex:9999 }}>
        <Toast toasts={toasts} onClose={(id) => setToasts(p => p.filter(t => t.id !== id))} />
      </div>
      {/* Modal confirmação de exclusão */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:340, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:'#1a1a1a' }}>Excluir paciente?</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:24, lineHeight:1.5 }}>
              Esta ação é permanente. Todos os dados de <strong>{confirmDel.name}</strong> serão excluídos do sistema.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #ddd', background:'#fff', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                Cancelar
              </button>
              <button onClick={doDeletePatient} style={{ padding:'9px 18px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Profile Modal — mobile */}
      {showProfile && <ProfileModal user={currentUser} avatarSrc={ta[currentUser.id]} onClose={()=>setShowProfile(false)} onUpdate={u=>{ setCurrentUser(u); setShowProfile(false); }} toast={toast}/>}
    </div>
  );

  /* ─── DESKTOP ─── */
  return (
    <div style={{ fontFamily:"'Outfit','Inter',system-ui,sans-serif", background:W[50], minHeight:"100vh", color:"#2C2C2A" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:`linear-gradient(180deg,${G[800]},${G[900]})`, color:"#fff", position:"fixed", top:0, left:0, height:"100vh", zIndex:100, display:"flex", flexDirection:"column", transform:so?"none":"translateX(-220px)", transition:"transform 0.3s" }}>
        <div style={{ padding:"16px 14px", borderBottom:`1px solid ${G[700]}`, cursor:"pointer" }} onClick={()=>{ setPage("dash"); setSid(null); }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Shield size={18} color={G[300]}/>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>Ser Livre</div>
              <div style={{ fontSize:9, opacity:0.4 }}>Dra. Mariana Wogel</div>
            </div>
          </div>
        </div>
        <div style={{ flex:1, paddingTop:8 }}>
          {[...nav, {k:"team", l:"Equipe", i:Shield}].map(n => {
            const a = page===n.k || (n.k==="pat"&&page==="det");
            return (
              <div key={n.k} onClick={()=>{ setPage(n.k); setSid(null); }} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 14px", cursor:"pointer", fontSize:12, fontWeight:a?600:400, background:a?"rgba(255,255,255,0.1)":"transparent", borderLeft:a?`3px solid ${G[300]}`:"3px solid transparent", color:a?"#fff":"rgba(255,255,255,0.55)", transition:"all 0.15s" }}>
                <n.i size={15}/><span>{n.l}</span>
                {n.k==="alert" && ac>0 && <span style={{ marginLeft:"auto", background:S.red, color:"#fff", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:600 }}>{ac}</span>}
                {n.k==="msg" && unreadMsgs>0 && <span style={{ marginLeft:"auto", background:G[400], color:"#fff", borderRadius:8, padding:"1px 6px", fontSize:9, fontWeight:600 }}>{unreadMsgs}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${G[700]}`, display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flex:1, cursor:"pointer" }} onClick={()=>setShowProfile(true)}>
            <Av name={currentUser.name || 'Usuário'} size={28} src={ta[currentUser.id]}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:500 }}>{(currentUser.name || 'Usuário').split(' ').slice(0,2).join(' ')}</div>
              <div style={{ fontSize:9, opacity:0.3 }}>{currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'MEDICA' ? 'Médica' : currentUser.role || 'Equipe'}</div>
            </div>
          </div>
          <LogOut size={12} style={{ cursor:"pointer", opacity:0.3 }} onClick={doLogout}/>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft:so?220:0, transition:"margin-left 0.3s", padding:"0 18px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${G[200]}`, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Menu size={16} color={G[700]} style={{ cursor:"pointer" }} onClick={()=>setSo(!so)}/>
            <h1 onClick={()=>{ setPage("dash"); setSid(null); }} style={{ fontSize:17, fontWeight:700, color:G[800], margin:0, cursor:"pointer" }}>
            {titles[page]}
            {reloading && <span style={{ fontSize:11, color:G[400], marginLeft:8, fontWeight:400 }}>↻ atualizando...</span>}
          </h1>
          </div>
          <div style={{ position:"relative", cursor:"pointer" }} onClick={()=>setPage("alert")}>
            <Bell size={16} color={G[600]}/>
            {ac>0 && <div style={{ position:"absolute", top:-3, right:-3, width:12, height:12, borderRadius:"50%", background:S.red, color:"#fff", fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{ac}</div>}
          </div>
        </div>
        
        {nl && <NewLeadModal onClose={()=>setNl(false)} onSave={np=>{ setNl(false); handleCreatePatient(np); }}/>}
        {content}
      </div>
      {/* Toast unificado — desktop */}
      <Toast toasts={toasts} onClose={(id) => setToasts(p => p.filter(t => t.id !== id))} />
      {/* Modal confirmação de exclusão */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:32, maxWidth:380, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:10, color:'#1a1a1a' }}>Excluir paciente?</div>
            <div style={{ fontSize:13, color:'#666', marginBottom:28, lineHeight:1.6 }}>
              Esta ação é permanente e não pode ser desfeita. Todos os dados de <strong>{confirmDel.name}</strong> serão removidos do sistema.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:'10px 20px', borderRadius:8, border:'1px solid #ddd', background:'#fff', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                Cancelar
              </button>
              <button onClick={doDeletePatient} style={{ padding:'10px 20px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Profile Modal */}
      {showProfile && <ProfileModal user={currentUser} avatarSrc={ta[currentUser.id]} onClose={()=>setShowProfile(false)} onUpdate={u=>{ setCurrentUser(u); setShowProfile(false); }} toast={toast}/>}
    </div>
  );
}
