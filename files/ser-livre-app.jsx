import { useState, useEffect, useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Users, LayoutDashboard, ClipboardCheck, AlertTriangle, FileText, Settings, LogOut, ChevronRight, Search, Bell, TrendingUp, Activity, Brain, Heart, Shield, Flame, Eye, Moon, Zap, User, Lock, Menu, X, ChevronDown, ChevronUp, Check, Download, Printer, Calendar, Clock, Plus, Filter, ArrowLeft } from "lucide-react";

// ===== BRAND COLORS =====
const gold = { 50: "#FBF7EE", 100: "#F5ECDA", 200: "#EBDAB5", 300: "#D4B978", 400: "#C4A44E", 500: "#A8872E", 600: "#8B6D1E", 700: "#6E5517", 800: "#4E3D12", 900: "#332810" };
const warm = { 50: "#FEFCF9", 100: "#FDF8F0", 200: "#FAF0E0", 300: "#F5E6CC", 400: "#E8D5B0" };
const status = { red: "#C0392B", redBg: "#FDEDEC", yellow: "#F39C12", yellowBg: "#FEF9E7", green: "#27AE60", greenBg: "#EAFAF1", purple: "#8E44AD", purpleBg: "#F4ECF7" };

// ===== MOCK DATA =====
const PLANS = [
  { id: "platinum_plus", name: "Platinum Plus", color: gold[500], tier: 1 },
  { id: "gold_plus", name: "Gold Plus", color: gold[400], tier: 1 },
  { id: "platinum", name: "Platinum", color: gold[500], tier: 2 },
  { id: "gold", name: "Gold", color: gold[400], tier: 2 },
  { id: "essential_plus", name: "Essential Plus", color: gold[300], tier: 3 },
  { id: "essential", name: "Essential", color: gold[300], tier: 3 },
];

const PLAN_FEATURES = {
  1: { terapiaInjetavel: "semanal", psicologaFreq: "semanal", treinos: 3, nutriCompleta: true, label: "Platinum Plus / Gold Plus" },
  2: { terapiaInjetavel: "quinzenal", psicologaFreq: "quinzenal", treinos: 2, nutriCompleta: false, label: "Platinum / Gold" },
  3: { terapiaInjetavel: null, psicologaFreq: null, treinos: 2, nutriCompleta: false, label: "Essential Plus / Essential" },
};

const mockPatients = [
  { id: 1, name: "Ana Carolina Silva", plan: "platinum_plus", cycle: 1, week: 6, age: 34, phone: "(24) 99912-3456", startDate: "2025-11-01", initialWeight: 89.5, currentWeight: 84.2, photo: null },
  { id: 2, name: "Beatriz Oliveira", plan: "gold", cycle: 1, week: 12, age: 41, phone: "(24) 99834-5678", startDate: "2025-09-15", initialWeight: 95.0, currentWeight: 86.8, photo: null },
  { id: 3, name: "Camila Ferreira", plan: "essential", cycle: 2, week: 3, age: 29, phone: "(24) 99756-7890", startDate: "2025-06-01", initialWeight: 78.3, currentWeight: 71.1, photo: null },
  { id: 4, name: "Daniela Costa", plan: "platinum", cycle: 1, week: 9, age: 37, phone: "(24) 99678-1234", startDate: "2025-10-01", initialWeight: 102.0, currentWeight: 93.5, photo: null },
  { id: 5, name: "Eduarda Mendes", plan: "gold_plus", cycle: 1, week: 4, age: 45, phone: "(24) 99590-2345", startDate: "2025-11-20", initialWeight: 88.0, currentWeight: 85.6, photo: null },
  { id: 6, name: "Fernanda Lima", plan: "essential_plus", cycle: 1, week: 15, age: 33, phone: "(24) 99412-3456", startDate: "2025-08-10", initialWeight: 74.5, currentWeight: 68.9, photo: null },
];

const generateScoreHistory = (patientId) => {
  const months = ["Mês 1", "Mês 2", "Mês 3", "Mês 4"];
  const base = patientId * 3;
  return months.map((m, i) => ({
    month: m,
    metabolico: Math.min(24, Math.max(8, 10 + base % 5 + i * 2 + Math.floor(Math.random() * 3))),
    bemEstar: Math.min(18, Math.max(6, 8 + base % 4 + i * 2 + Math.floor(Math.random() * 2))),
    mental: Math.min(9, Math.max(3, 4 + base % 2 + i + Math.floor(Math.random() * 2))),
  }));
};

const generateChecklist = (patientId, planTier) => {
  const weeks = {};
  const currentWeek = mockPatients.find(p => p.id === patientId)?.week || 1;
  for (let w = 1; w <= 16; w++) {
    const done = w < currentWeek;
    const partial = w === currentWeek;
    weeks[w] = {
      tirzepatida: done || (partial && Math.random() > 0.3),
      terapiaInjetavel: planTier <= 2 ? (done || (partial && Math.random() > 0.4)) : null,
      pesagem: done || (partial && Math.random() > 0.2),
      psicologaSessao: planTier <= 2 ? (done || (partial && Math.random() > 0.5)) : null,
      bioimpedancia: done || (partial && Math.random() > 0.3),
      treinos: Array.from({ length: PLAN_FEATURES[planTier].treinos }, () => done || (partial && Math.random() > 0.4)),
      nutricionista: w % 4 === 0 ? { avaliacaoCompleta: done, planoAlimentar: done, scoresClinicos: done } : null,
      dose: done ? `${2.5 + Math.floor(w / 4) * 2.5}mg` : (partial ? `${2.5 + Math.floor(w / 4) * 2.5}mg` : ""),
      obs: done && Math.random() > 0.7 ? "Paciente relatou leve náusea" : "",
    };
  }
  return weeks;
};

const mockScores = {
  1: { metabolico: { gorduraVisceral: 2, massaMuscular: 2, pcrUltra: 3, ferritina: 2, hbGlicada: 2, acidoUrico: 3, trigHdl: 2, circAbdominal: 2 }, bemEstar: { gastrointestinal: 2, libido: 2, dores: 3, autoestima: 2, energia: 2, sono: 3 }, mental: { consistencia: 2, gestaoEmocional: 2, movimento: 3 } },
  2: { metabolico: { gorduraVisceral: 3, massaMuscular: 3, pcrUltra: 2, ferritina: 3, hbGlicada: 3, acidoUrico: 2, trigHdl: 3, circAbdominal: 2 }, bemEstar: { gastrointestinal: 3, libido: 2, dores: 2, autoestima: 3, energia: 3, sono: 2 }, mental: { consistencia: 3, gestaoEmocional: 2, movimento: 3 } },
  3: { metabolico: { gorduraVisceral: 1, massaMuscular: 1, pcrUltra: 1, ferritina: 2, hbGlicada: 1, acidoUrico: 2, trigHdl: 1, circAbdominal: 1 }, bemEstar: { gastrointestinal: 1, libido: 1, dores: 2, autoestima: 1, energia: 1, sono: 2 }, mental: { consistencia: 1, gestaoEmocional: 1, movimento: 2 } },
  4: { metabolico: { gorduraVisceral: 2, massaMuscular: 3, pcrUltra: 2, ferritina: 2, hbGlicada: 2, acidoUrico: 2, trigHdl: 2, circAbdominal: 2 }, bemEstar: { gastrointestinal: 2, libido: 3, dores: 2, autoestima: 2, energia: 3, sono: 2 }, mental: { consistencia: 2, gestaoEmocional: 2, movimento: 2 } },
  5: { metabolico: { gorduraVisceral: 3, massaMuscular: 2, pcrUltra: 3, ferritina: 3, hbGlicada: 2, acidoUrico: 3, trigHdl: 2, circAbdominal: 3 }, bemEstar: { gastrointestinal: 3, libido: 3, dores: 3, autoestima: 2, energia: 2, sono: 3 }, mental: { consistencia: 2, gestaoEmocional: 3, movimento: 2 } },
  6: { metabolico: { gorduraVisceral: 2, massaMuscular: 2, pcrUltra: 2, ferritina: 1, hbGlicada: 3, acidoUrico: 2, trigHdl: 3, circAbdominal: 2 }, bemEstar: { gastrointestinal: 2, libido: 2, dores: 1, autoestima: 2, energia: 2, sono: 2 }, mental: { consistencia: 2, gestaoEmocional: 1, movimento: 2 } },
};

const teamMembers = [
  { id: 1, name: "Dra. Mariana Wogel", role: "medica", email: "dra.mariana@institutowogel.com" },
  { id: 2, name: "Juliana Santos", role: "enfermagem", email: "juliana@institutowogel.com" },
  { id: 3, name: "Patricia Almeida", role: "nutricionista", email: "patricia@institutowogel.com" },
  { id: 4, name: "Renata Barbosa", role: "psicologa", email: "renata@institutowogel.com" },
  { id: 5, name: "Carlos Trainador", role: "treinador", email: "carlos@pulsare.com" },
];

// ===== SCORE CALCULATION HELPERS =====
function calcMetabolico(s) {
  if (!s) return { total: 0, pilares: {} };
  const composicao = (s.gorduraVisceral || 0) + (s.massaMuscular || 0);
  const inflamacao = (s.pcrUltra || 0) + (s.ferritina || 0);
  const glicemico = (s.hbGlicada || 0) + (s.acidoUrico || 0);
  const cardiovascular = (s.trigHdl || 0) + (s.circAbdominal || 0);
  const total = composicao + inflamacao + glicemico + cardiovascular;
  return { total, pilares: { composicao, inflamacao, glicemico, cardiovascular } };
}

function calcBemEstar(s) {
  if (!s) return { total: 0 };
  return { total: (s.gastrointestinal || 0) + (s.libido || 0) + (s.dores || 0) + (s.autoestima || 0) + (s.energia || 0) + (s.sono || 0) };
}

function calcMental(s) {
  if (!s) return { total: 0 };
  return { total: (s.consistencia || 0) + (s.gestaoEmocional || 0) + (s.movimento || 0) };
}

function getMetabolicoStatus(total) {
  if (total >= 21) return { label: "Elite", color: status.purple, bg: status.purpleBg, emoji: "🟣", desc: "Corpo blindado" };
  if (total >= 17) return { label: "Saudável", color: status.green, bg: status.greenBg, emoji: "🟢", desc: "Liberdade metabólica" };
  if (total >= 13) return { label: "Transição", color: status.yellow, bg: status.yellowBg, emoji: "🟡", desc: "Metabolismo em alerta" };
  return { label: "Crítico", color: status.red, bg: status.redBg, emoji: "🔴", desc: "Metabolismo travado" };
}

function getBemEstarStatus(total) {
  if (total > 13) return { label: "Excelente", color: status.green, bg: status.greenBg, emoji: "🟢", desc: "Manter" };
  if (total >= 10) return { label: "Alerta", color: status.yellow, bg: status.yellowBg, emoji: "🟡", desc: "Nutricionista intervém" };
  return { label: "Crítico", color: status.red, bg: status.redBg, emoji: "🔴", desc: "Intervenção médica" };
}

function getMentalStatus(total) {
  if (total >= 8) return { label: "Elite", color: status.purple, bg: status.purpleBg, emoji: "🟣", desc: "Alta comportamental" };
  if (total >= 5) return { label: "Construção", color: status.yellow, bg: status.yellowBg, emoji: "🟡", desc: "Reforço nutri + psico" };
  return { label: "Recaída", color: status.red, bg: status.redBg, emoji: "🔴", desc: "Intervenção individual" };
}

function getInitials(name) {
  return name.split(" ").filter((_, i, arr) => i === 0 || i === arr.length - 1).map(n => n[0]).join("").toUpperCase();
}

// ===== STYLES =====
const styles = {
  app: { fontFamily: "'Crimson Pro', 'Georgia', serif", background: warm[50], minHeight: "100vh", color: "#2C2C2A" },
  sidebar: { width: 260, background: `linear-gradient(180deg, ${gold[800]} 0%, ${gold[900]} 100%)`, color: "#fff", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, transition: "transform 0.3s ease" },
  sidebarHidden: { transform: "translateX(-260px)" },
  logo: { padding: "24px 20px", borderBottom: `1px solid ${gold[700]}`, fontSize: 18, fontWeight: 600, letterSpacing: "0.02em" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, background: active ? "rgba(255,255,255,0.12)" : "transparent", borderLeft: active ? `3px solid ${gold[300]}` : "3px solid transparent", color: active ? "#fff" : "rgba(255,255,255,0.7)", transition: "all 0.2s" }),
  main: (sidebarOpen) => ({ marginLeft: sidebarOpen ? 260 : 0, transition: "margin-left 0.3s ease", padding: "0 24px 24px" }),
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${gold[200]}`, marginBottom: 24 },
  card: { background: "#fff", borderRadius: 12, border: `1px solid ${gold[200]}`, padding: "20px 24px", marginBottom: 16 },
  cardHeader: { fontSize: 16, fontWeight: 600, color: gold[800], marginBottom: 12 },
  badge: (color, bg) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color, background: bg }),
  btn: (variant = "primary") => ({
    display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.2s",
    ...(variant === "primary" ? { background: gold[600], color: "#fff" } : variant === "outline" ? { background: "transparent", border: `1px solid ${gold[400]}`, color: gold[700] } : { background: gold[100], color: gold[800] }),
  }),
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${gold[300]}`, fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fff" },
  select: { padding: "10px 14px", borderRadius: 8, border: `1px solid ${gold[300]}`, fontSize: 14, fontFamily: "inherit", background: "#fff", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 },
  th: { textAlign: "left", padding: "10px 14px", borderBottom: `2px solid ${gold[300]}`, color: gold[700], fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "12px 14px", borderBottom: `1px solid ${gold[100]}` },
  metric: { background: warm[100], borderRadius: 12, padding: "16px 20px", textAlign: "center" },
  metricValue: { fontSize: 28, fontWeight: 700, color: gold[800] },
  metricLabel: { fontSize: 12, color: gold[600], marginTop: 4, fontWeight: 500 },
  scoreCircle: (color) => ({ width: 48, height: 48, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }),
  tab: (active) => ({ padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, color: active ? gold[700] : "#888", borderBottom: active ? `2px solid ${gold[500]}` : "2px solid transparent", transition: "all 0.2s", background: "none", border: "none", borderBottomStyle: "solid" }),
  checkbox: (checked) => ({ width: 22, height: 22, borderRadius: 6, border: checked ? `2px solid ${status.green}` : `2px solid ${gold[300]}`, background: checked ? status.greenBg : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }),
  avatar: (size = 40) => ({ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${gold[400]}, ${gold[600]})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: size * 0.35, flexShrink: 0 }),
};

// ===== COMPONENTS =====
function ScoreSemaforo({ label, total, maxPts, statusFn }) {
  const st = statusFn(total);
  const pct = Math.round((total / maxPts) * 100);
  return (
    <div style={{ ...styles.card, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={styles.scoreCircle(st.color)}>{total}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: gold[800] }}>{label}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{total}/{maxPts} pontos</div>
        <div style={{ height: 6, background: gold[100], borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: st.color, borderRadius: 3, transition: "width 0.5s" }} />
        </div>
      </div>
      <div style={styles.badge(st.color, st.bg)}>{st.emoji} {st.label}</div>
    </div>
  );
}

function MetricCard({ value, label, icon: Icon, color }) {
  return (
    <div style={styles.metric}>
      {Icon && <Icon size={20} color={color || gold[500]} style={{ marginBottom: 4 }} />}
      <div style={{ ...styles.metricValue, color: color || gold[800] }}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function CheckItem({ checked, label, onToggle, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${gold[50]}` }}>
      <div style={styles.checkbox(checked)} onClick={onToggle}>{checked && <Check size={14} color={status.green} />}</div>
      <div>
        <div style={{ fontSize: 14, color: checked ? "#888" : gold[900], textDecoration: checked ? "line-through" : "none" }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "#aaa" }}>{sub}</div>}
      </div>
    </div>
  );
}

function ScoreInputRow({ label, description, value, onChange, options }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${gold[100]}` }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: gold[800], marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <div key={opt.value} onClick={() => onChange(opt.value)} style={{
            padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, transition: "all 0.2s", border: `1.5px solid ${value === opt.value ? gold[500] : gold[200]}`,
            background: value === opt.value ? gold[100] : "#fff", color: value === opt.value ? gold[800] : "#666", fontWeight: value === opt.value ? 600 : 400,
          }}>
            <div>{opt.value} pt{opt.value > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{opt.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== PAGES =====
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState("admin");
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${gold[800]} 0%, ${gold[900]} 50%, #1a1a2e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 20, padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${gold[400]}, ${gold[600]})`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={28} color="#fff" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: gold[800], fontFamily: "'Crimson Pro', serif" }}>Programa Ser Livre</div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Instituto Dra. Mariana Wogel</div>
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: gold[50], borderRadius: 10, padding: 3 }}>
          {[["admin", "Equipe"], ["paciente", "Paciente"]].map(([k, l]) => (
            <div key={k} onClick={() => setMode(k)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: mode === k ? 600 : 400, background: mode === k ? "#fff" : "transparent", color: mode === k ? gold[700] : "#888", boxShadow: mode === k ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>{l}</div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: gold[700], marginBottom: 6, display: "block" }}>E-mail</label>
          <input style={styles.input} value={email} onChange={e => setEmail(e.target.value)} placeholder={mode === "admin" ? "equipe@institutowogel.com" : "paciente@email.com"} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: gold[700], marginBottom: 6, display: "block" }}>Senha</label>
          <input style={styles.input} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
        </div>
        <button style={{ ...styles.btn("primary"), width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 15, borderRadius: 10 }} onClick={() => onLogin(mode)}>
          <Lock size={16} /> Entrar
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#aaa" }}>Demo: clique "Entrar" com qualquer dado</div>
      </div>
    </div>
  );
}

function DashboardPage({ patients, onSelectPatient }) {
  const alerts = patients.filter(p => {
    const sc = mockScores[p.id];
    if (!sc) return false;
    const m = calcMetabolico(sc.metabolico);
    const b = calcBemEstar(sc.bemEstar);
    return m.total <= 12 || b.total < 10;
  });
  const totalWeight = patients.reduce((acc, p) => acc + (p.initialWeight - p.currentWeight), 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricCard value={patients.length} label="Pacientes ativos" icon={Users} />
        <MetricCard value={alerts.length} label="Alertas ativos" icon={AlertTriangle} color={alerts.length > 0 ? status.red : gold[500]} />
        <MetricCard value={`${totalWeight.toFixed(1)}kg`} label="Peso total perdido" icon={TrendingUp} color={status.green} />
        <MetricCard value="16 sem" label="Duração do ciclo" icon={Calendar} />
      </div>
      {alerts.length > 0 && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${status.red}`, background: status.redBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} color={status.red} />
            <span style={{ fontWeight: 600, color: status.red }}>Alertas que necessitam atenção</span>
          </div>
          {alerts.map(p => {
            const sc = mockScores[p.id];
            const m = calcMetabolico(sc.metabolico);
            const b = calcBemEstar(sc.bemEstar);
            return (
              <div key={p.id} onClick={() => onSelectPatient(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", cursor: "pointer", borderRadius: 8, marginBottom: 4, background: "rgba(255,255,255,0.5)" }}>
                <div style={styles.avatar(32)}>{getInitials(p.name)}</div>
                <div style={{ flex: 1, fontSize: 14 }}>{p.name}</div>
                {m.total <= 12 && <span style={styles.badge(status.red, "#fff")}>Metabólico crítico: {m.total}pts</span>}
                {b.total < 10 && <span style={styles.badge(status.red, "#fff")}>Bem-estar crítico: {b.total}pts</span>}
                <ChevronRight size={16} color="#ccc" />
              </div>
            );
          })}
        </div>
      )}
      <div style={styles.card}>
        <div style={styles.cardHeader}>Pacientes por plano</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {PLANS.map(plan => {
            const count = patients.filter(p => p.plan === plan.id).length;
            return (
              <div key={plan.id} style={{ background: warm[100], borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: gold[700] }}>{count}</div>
                <div style={{ fontSize: 12, color: gold[600] }}>{plan.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>Visão rápida — todos os pacientes</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Paciente</th>
              <th style={styles.th}>Plano</th>
              <th style={styles.th}>Semana</th>
              <th style={styles.th}>Metabólico</th>
              <th style={styles.th}>Bem-estar</th>
              <th style={styles.th}>Mental</th>
              <th style={styles.th}>Evolução</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => {
              const sc = mockScores[p.id];
              const m = calcMetabolico(sc?.metabolico);
              const b = calcBemEstar(sc?.bemEstar);
              const mt = calcMental(sc?.mental);
              const mSt = getMetabolicoStatus(m.total);
              const bSt = getBemEstarStatus(b.total);
              const mtSt = getMentalStatus(mt.total);
              const wLoss = (p.initialWeight - p.currentWeight).toFixed(1);
              return (
                <tr key={p.id} onClick={() => onSelectPatient(p.id)} style={{ cursor: "pointer" }}>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={styles.avatar(32)}>{getInitials(p.name)}</div>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}><span style={{ fontSize: 12, color: gold[600] }}>{PLANS.find(pl => pl.id === p.plan)?.name}</span></td>
                  <td style={styles.td}><span style={{ fontWeight: 600 }}>{p.week}</span>/16</td>
                  <td style={styles.td}><span style={styles.badge(mSt.color, mSt.bg)}>{mSt.emoji} {m.total}</span></td>
                  <td style={styles.td}><span style={styles.badge(bSt.color, bSt.bg)}>{bSt.emoji} {b.total}</span></td>
                  <td style={styles.td}><span style={styles.badge(mtSt.color, mtSt.bg)}>{mtSt.emoji} {mt.total}</span></td>
                  <td style={styles.td}><span style={{ color: status.green, fontWeight: 600 }}>-{wLoss}kg</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PatientListPage({ patients, onSelect }) {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || p.plan === filterPlan;
    return matchSearch && matchPlan;
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={16} color="#aaa" style={{ position: "absolute", left: 12, top: 12 }} />
          <input style={{ ...styles.input, paddingLeft: 36 }} placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={styles.select} value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
          <option value="all">Todos os planos</option>
          {PLANS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={styles.btn("primary")}><Plus size={16} /> Novo paciente</button>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map(p => {
          const plan = PLANS.find(pl => pl.id === p.plan);
          const sc = mockScores[p.id];
          const m = calcMetabolico(sc?.metabolico);
          const mSt = getMetabolicoStatus(m.total);
          return (
            <div key={p.id} onClick={() => onSelect(p.id)} style={{ ...styles.card, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
              <div style={styles.avatar(48)}>{getInitials(p.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: gold[800] }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{plan?.name} • Ciclo {p.cycle} • Semana {p.week}/16</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={styles.badge(mSt.color, mSt.bg)}>{mSt.emoji} {mSt.label}</span>
                <div style={{ fontSize: 13, color: status.green, fontWeight: 600, marginTop: 4 }}>-{(p.initialWeight - p.currentWeight).toFixed(1)}kg</div>
              </div>
              <ChevronRight size={18} color="#ccc" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientDetailPage({ patient, onBack }) {
  const [tab, setTab] = useState("ficha");
  const plan = PLANS.find(p => p.id === patient.plan);
  const planTier = plan?.tier || 1;
  const features = PLAN_FEATURES[planTier];
  const sc = mockScores[patient.id];
  const met = calcMetabolico(sc?.metabolico);
  const bem = calcBemEstar(sc?.bemEstar);
  const men = calcMental(sc?.mental);
  const history = generateScoreHistory(patient.id);
  const [checklist, setChecklist] = useState(() => generateChecklist(patient.id, planTier));
  const [editingScores, setEditingScores] = useState(sc ? JSON.parse(JSON.stringify(sc)) : null);
  const [selectedWeek, setSelectedWeek] = useState(patient.week);

  const tabs = [
    { key: "ficha", label: "Ficha", icon: User },
    { key: "jornada", label: "Jornada", icon: ClipboardCheck },
    { key: "scores", label: "Scores", icon: Activity },
    { key: "graficos", label: "Gráficos", icon: TrendingUp },
    { key: "relatorio", label: "Relatório", icon: FileText },
  ];

  const radarData = [
    { pilar: "Composição", value: met.pilares.composicao, max: 6 },
    { pilar: "Inflamação", value: met.pilares.inflamacao, max: 6 },
    { pilar: "Glicêmico", value: met.pilares.glicemico, max: 6 },
    { pilar: "Cardiovascular", value: met.pilares.cardiovascular, max: 6 },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div onClick={onBack} style={{ cursor: "pointer", padding: 8, borderRadius: 8, background: gold[50] }}><ArrowLeft size={18} color={gold[700]} /></div>
        <div style={styles.avatar(48)}>{getInitials(patient.name)}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: gold[800] }}>{patient.name}</div>
          <div style={{ fontSize: 13, color: "#888" }}>{plan?.name} • {patient.age} anos • Ciclo {patient.cycle} • Semana {patient.week}/16</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${gold[200]}`, marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} style={styles.tab(tab === t.key)} onClick={() => setTab(t.key)}>
            <t.icon size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />{t.label}
          </button>
        ))}
      </div>

      {tab === "ficha" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            <MetricCard value={`${patient.initialWeight}kg`} label="Peso inicial" />
            <MetricCard value={`${patient.currentWeight}kg`} label="Peso atual" />
            <MetricCard value={`-${(patient.initialWeight - patient.currentWeight).toFixed(1)}kg`} label="Evolução" icon={TrendingUp} color={status.green} />
            <MetricCard value={`${Math.round(((patient.initialWeight - patient.currentWeight) / patient.initialWeight) * 100)}%`} label="Perda total" />
          </div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>Dados do paciente</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 14 }}>
              <div><span style={{ color: "#888" }}>Telefone:</span> {patient.phone}</div>
              <div><span style={{ color: "#888" }}>Plano:</span> {plan?.name}</div>
              <div><span style={{ color: "#888" }}>Início:</span> {patient.startDate}</div>
              <div><span style={{ color: "#888" }}>Ciclo:</span> {patient.cycle}</div>
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>Estrutura do plano — {features.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 14 }}>
              <div style={{ padding: "8px 12px", background: warm[100], borderRadius: 8 }}>Tirzepatida: semanal</div>
              <div style={{ padding: "8px 12px", background: warm[100], borderRadius: 8 }}>Terapia injetável: {features.terapiaInjetavel || "N/A"}</div>
              <div style={{ padding: "8px 12px", background: warm[100], borderRadius: 8 }}>Psicóloga: {features.psicologaFreq || "N/A"}</div>
              <div style={{ padding: "8px 12px", background: warm[100], borderRadius: 8 }}>Treinos: {features.treinos}x/semana</div>
              <div style={{ padding: "8px 12px", background: warm[100], borderRadius: 8 }}>Nutricionista: mensal {features.nutriCompleta ? "(completa)" : "(controle)"}</div>
              <div style={{ padding: "8px 12px", background: warm[100], borderRadius: 8 }}>Bioimpedância: semanal</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <ScoreSemaforo label="Saúde metabólica" total={met.total} maxPts={24} statusFn={getMetabolicoStatus} />
            <ScoreSemaforo label="Bem-estar" total={bem.total} maxPts={18} statusFn={getBemEstarStatus} />
            <ScoreSemaforo label="Blindagem mental" total={men.total} maxPts={9} statusFn={getMentalStatus} />
          </div>
        </div>
      )}

      {tab === "jornada" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(w => {
              const isSpecial = w === 8 || w === 16;
              const isCurrent = w === patient.week;
              const isDone = w < patient.week;
              return (
                <div key={w} onClick={() => setSelectedWeek(w)} style={{
                  width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: isCurrent ? 700 : 500, transition: "all 0.2s",
                  background: selectedWeek === w ? gold[600] : isDone ? status.greenBg : isCurrent ? gold[100] : "#fff",
                  color: selectedWeek === w ? "#fff" : isDone ? status.green : gold[800],
                  border: isSpecial ? `2px solid ${gold[500]}` : `1px solid ${gold[200]}`,
                }}>
                  {w}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 12, color: "#888" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: status.greenBg, border: `1px solid ${status.green}` }} /> Concluída</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: gold[100], border: `1px solid ${gold[300]}` }} /> Atual</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${gold[500]}` }} /> Marco (exames)</span>
          </div>
          {checklist[selectedWeek] && (
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={styles.cardHeader}>Semana {selectedWeek} {(selectedWeek === 8 || selectedWeek === 16) ? <span style={styles.badge(gold[700], gold[100])}>Exames Lab. {selectedWeek === 16 ? "+ Consulta Médica" : ""}</span> : null}</div>
                {checklist[selectedWeek].dose && <span style={{ fontSize: 13, color: gold[600] }}>Dose: {checklist[selectedWeek].dose}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: gold[700], padding: "8px 0", borderBottom: `1px solid ${gold[200]}` }}>Enfermagem</div>
                  <CheckItem checked={checklist[selectedWeek].tirzepatida} label={`Tirzepatida — ${checklist[selectedWeek].dose || "dose"}`} onToggle={() => {
                    setChecklist(prev => ({ ...prev, [selectedWeek]: { ...prev[selectedWeek], tirzepatida: !prev[selectedWeek].tirzepatida } }));
                  }} />
                  {features.terapiaInjetavel && <CheckItem checked={checklist[selectedWeek].terapiaInjetavel} label={`Terapia injetável (${features.terapiaInjetavel})`} onToggle={() => {
                    setChecklist(prev => ({ ...prev, [selectedWeek]: { ...prev[selectedWeek], terapiaInjetavel: !prev[selectedWeek].terapiaInjetavel } }));
                  }} />}
                  <CheckItem checked={checklist[selectedWeek].pesagem} label="Pesagem" onToggle={() => {
                    setChecklist(prev => ({ ...prev, [selectedWeek]: { ...prev[selectedWeek], pesagem: !prev[selectedWeek].pesagem } }));
                  }} />
                  {features.psicologaFreq && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: gold[700], padding: "8px 0", borderBottom: `1px solid ${gold[200]}`, marginTop: 8 }}>Psicóloga</div>
                      <CheckItem checked={checklist[selectedWeek].psicologaSessao} label={`Sessão ${features.psicologaFreq}`} onToggle={() => {
                        setChecklist(prev => ({ ...prev, [selectedWeek]: { ...prev[selectedWeek], psicologaSessao: !prev[selectedWeek].psicologaSessao } }));
                      }} />
                    </>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, color: gold[700], padding: "8px 0", borderBottom: `1px solid ${gold[200]}`, marginTop: 8 }}>Bioimpedância</div>
                  <CheckItem checked={checklist[selectedWeek].bioimpedancia} label="Avaliação semanal" onToggle={() => {
                    setChecklist(prev => ({ ...prev, [selectedWeek]: { ...prev[selectedWeek], bioimpedancia: !prev[selectedWeek].bioimpedancia } }));
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: gold[700], padding: "8px 0", borderBottom: `1px solid ${gold[200]}` }}>Pulsare (treino)</div>
                  {checklist[selectedWeek].treinos?.map((t, i) => (
                    <CheckItem key={i} checked={t} label={`Treino ${i + 1}`} onToggle={() => {
                      setChecklist(prev => {
                        const newTreinos = [...prev[selectedWeek].treinos];
                        newTreinos[i] = !newTreinos[i];
                        return { ...prev, [selectedWeek]: { ...prev[selectedWeek], treinos: newTreinos } };
                      });
                    }} />
                  ))}
                  {checklist[selectedWeek].nutricionista && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: gold[700], padding: "8px 0", borderBottom: `1px solid ${gold[200]}`, marginTop: 8 }}>Nutricionista (mensal)</div>
                      <CheckItem checked={checklist[selectedWeek].nutricionista.avaliacaoCompleta} label={features.nutriCompleta ? "Avaliação completa" : "Controle de adesão"} onToggle={() => {}} />
                      {features.nutriCompleta && <CheckItem checked={checklist[selectedWeek].nutricionista.planoAlimentar} label="Plano alimentar" onToggle={() => {}} />}
                      <CheckItem checked={checklist[selectedWeek].nutricionista.scoresClinicos} label="Preencher scores clínicos" onToggle={() => {}} />
                    </>
                  )}
                </div>
              </div>
              {checklist[selectedWeek].obs && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: warm[100], borderRadius: 8, fontSize: 13, color: "#888" }}>Obs: {checklist[selectedWeek].obs}</div>
              )}
            </div>
          )}
          <div style={styles.card}>
            <div style={styles.cardHeader}>Indicadores de evolução</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <MetricCard value={`${patient.initialWeight}kg`} label="Peso inicial" />
              <MetricCard value={`${patient.currentWeight}kg`} label="Peso atual" />
              <MetricCard value={`-${(patient.initialWeight - patient.currentWeight).toFixed(1)}kg`} label="Evolução" color={status.green} />
              <MetricCard value={`${Math.min(100, Math.round((patient.week / 16) * 100 + Math.random() * 10))}%`} label="Adesão ao plano" />
            </div>
          </div>
        </div>
      )}

      {tab === "scores" && editingScores && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>🧬 Score de saúde metabólica (8 a 24 pts)</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Quanto maior a pontuação, melhor o estado metabólico</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: gold[700], marginBottom: 8 }}>Pilar 1 — Composição corporal (até 6 pts)</div>
              <ScoreInputRow label="Gordura visceral" value={editingScores.metabolico.gorduraVisceral} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, gorduraVisceral: v } }))} options={[{ value: 1, label: "Alto risco (>10)" }, { value: 2, label: "Moderado (6-10)" }, { value: 3, label: "Ideal (1-5)" }]} />
              <ScoreInputRow label="Massa muscular" value={editingScores.metabolico.massaMuscular} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, massaMuscular: v } }))} options={[{ value: 1, label: "Abaixo do ideal" }, { value: 2, label: "Ideal" }, { value: 3, label: "Alta" }]} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: gold[700], marginBottom: 8 }}>Pilar 2 — Inflamação sistêmica (até 6 pts)</div>
              <ScoreInputRow label="PCR ultrassensível" value={editingScores.metabolico.pcrUltra} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, pcrUltra: v } }))} options={[{ value: 1, label: "Ativa (>10)" }, { value: 2, label: "Moderada (5-10)" }, { value: 3, label: "Baixo risco (<5)" }]} />
              <ScoreInputRow label="Ferritina" value={editingScores.metabolico.ferritina} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, ferritina: v } }))} options={[{ value: 1, label: "Elevada" }, { value: 2, label: "Moderada" }, { value: 3, label: "Normal" }]} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: gold[700], marginBottom: 8 }}>Pilar 3 — Controle glicêmico (até 6 pts)</div>
              <ScoreInputRow label="Hemoglobina glicada" value={editingScores.metabolico.hbGlicada} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, hbGlicada: v } }))} options={[{ value: 1, label: "Diabetes (>6,4%)" }, { value: 2, label: "RI (5,5-6,4%)" }, { value: 3, label: "Ideal (<5,4%)" }]} />
              <ScoreInputRow label="Ácido úrico" value={editingScores.metabolico.acidoUrico} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, acidoUrico: v } }))} options={[{ value: 1, label: "Elevado" }, { value: 2, label: "Limítrofe" }, { value: 3, label: "Ideal" }]} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: gold[700], marginBottom: 8 }}>Pilar 4 — Cardiovascular e lipídico (até 6 pts)</div>
              <ScoreInputRow label="Triglicerídeos / HDL" value={editingScores.metabolico.trigHdl} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, trigHdl: v } }))} options={[{ value: 1, label: ">4" }, { value: 2, label: "2-4" }, { value: 3, label: "<2" }]} />
              <ScoreInputRow label="Circunferência abdominal" value={editingScores.metabolico.circAbdominal} onChange={v => setEditingScores(prev => ({ ...prev, metabolico: { ...prev.metabolico, circAbdominal: v } }))} options={[{ value: 1, label: "Elevada" }, { value: 2, label: "Moderada" }, { value: 3, label: "Normal" }]} />
            </div>
            {(() => {
              const t = calcMetabolico(editingScores.metabolico);
              const s = getMetabolicoStatus(t.total);
              return <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: s.color }}>{s.emoji} Resultado: {t.total}/24 — {s.label}</span>
                <span style={{ fontSize: 13, color: s.color }}>{s.desc}</span>
              </div>;
            })()}
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>🧠 Score de criticidade e bem-estar (6 a 18 pts)</div>
            <ScoreInputRow label="Gastrointestinal" value={editingScores.bemEstar.gastrointestinal} onChange={v => setEditingScores(prev => ({ ...prev, bemEstar: { ...prev.bemEstar, gastrointestinal: v } }))} options={[{ value: 1, label: "Náuseas/vômitos" }, { value: 2, label: "Desconforto leve" }, { value: 3, label: "Normal" }]} />
            <ScoreInputRow label="Libido" value={editingScores.bemEstar.libido} onChange={v => setEditingScores(prev => ({ ...prev, bemEstar: { ...prev.bemEstar, libido: v } }))} options={[{ value: 1, label: "Queda acentuada" }, { value: 2, label: "Redução leve" }, { value: 3, label: "Normal" }]} />
            <ScoreInputRow label="Dores articulares/musculares" value={editingScores.bemEstar.dores} onChange={v => setEditingScores(prev => ({ ...prev, bemEstar: { ...prev.bemEstar, dores: v } }))} options={[{ value: 1, label: "Limitam treino" }, { value: 2, label: "Leve" }, { value: 3, label: "Sem dor" }]} />
            <ScoreInputRow label="Autoestima / Mental" value={editingScores.bemEstar.autoestima} onChange={v => setEditingScores(prev => ({ ...prev, bemEstar: { ...prev.bemEstar, autoestima: v } }))} options={[{ value: 1, label: "Desmotivação" }, { value: 2, label: "Oscilação" }, { value: 3, label: "Confiante" }]} />
            <ScoreInputRow label="Energia / Performance" value={editingScores.bemEstar.energia} onChange={v => setEditingScores(prev => ({ ...prev, bemEstar: { ...prev.bemEstar, energia: v } }))} options={[{ value: 1, label: "Cansaço extremo" }, { value: 2, label: "Oscilante" }, { value: 3, label: "Alta" }]} />
            <ScoreInputRow label="Sono e cefaleia" value={editingScores.bemEstar.sono} onChange={v => setEditingScores(prev => ({ ...prev, bemEstar: { ...prev.bemEstar, sono: v } }))} options={[{ value: 1, label: "Insônia/cefaleia" }, { value: 2, label: "Irregular" }, { value: 3, label: "Reparador" }]} />
            {(() => {
              const t = calcBemEstar(editingScores.bemEstar);
              const s = getBemEstarStatus(t.total);
              return <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: s.color }}>{s.emoji} Resultado: {t.total}/18 — {s.label}</span>
                <span style={{ fontSize: 13, color: s.color }}>{s.desc}</span>
              </div>;
            })()}
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>🧩 Score de blindagem mental e hábitos (3 a 9 pts)</div>
            <ScoreInputRow label="Consistência alimentar" value={editingScores.mental.consistencia} onChange={v => setEditingScores(prev => ({ ...prev, mental: { ...prev.mental, consistencia: v } }))} options={[{ value: 1, label: "Baixa adesão" }, { value: 2, label: "70-90%" }, { value: 3, label: ">90%" }]} />
            <ScoreInputRow label="Gestão emocional" value={editingScores.mental.gestaoEmocional} onChange={v => setEditingScores(prev => ({ ...prev, mental: { ...prev.mental, gestaoEmocional: v } }))} options={[{ value: 1, label: "Sem controle" }, { value: 2, label: "Identifica, cede" }, { value: 3, label: "Controla" }]} />
            <ScoreInputRow label="Movimento e presença" value={editingScores.mental.movimento} onChange={v => setEditingScores(prev => ({ ...prev, mental: { ...prev.mental, movimento: v } }))} options={[{ value: 1, label: "Sedentário" }, { value: 2, label: "Parcial" }, { value: 3, label: "Treino + mentoria" }]} />
            {(() => {
              const t = calcMental(editingScores.mental);
              const s = getMentalStatus(t.total);
              return <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: s.color }}>{s.emoji} Resultado: {t.total}/9 — {s.label}</span>
                <span style={{ fontSize: 13, color: s.color }}>{s.desc}</span>
              </div>;
            })()}
          </div>
          <button style={{ ...styles.btn("primary"), width: "100%", justifyContent: "center", padding: "14px", fontSize: 15 }}>Salvar scores do mês</button>
        </div>
      )}

      {tab === "graficos" && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>Radar — pilares metabólicos (atual)</div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} outerRadius={100}>
                <PolarGrid stroke={gold[200]} />
                <PolarAngleAxis dataKey="pilar" tick={{ fontSize: 13, fill: gold[700] }} />
                <PolarRadiusAxis domain={[0, 6]} tick={{ fontSize: 11, fill: "#aaa" }} />
                <Radar name="Score" dataKey="value" stroke={gold[500]} fill={gold[400]} fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>Evolução mensal — 3 scores</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke={gold[100]} />
                <XAxis dataKey="month" tick={{ fontSize: 13, fill: gold[700] }} />
                <YAxis tick={{ fontSize: 12, fill: "#aaa" }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${gold[200]}`, fontSize: 13 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="metabolico" name="Metabólico (0-24)" stroke={gold[500]} strokeWidth={2.5} dot={{ fill: gold[500], r: 4 }} />
                <Line type="monotone" dataKey="bemEstar" name="Bem-estar (0-18)" stroke={status.green} strokeWidth={2.5} dot={{ fill: status.green, r: 4 }} />
                <Line type="monotone" dataKey="mental" name="Mental (0-9)" stroke={status.purple} strokeWidth={2.5} dot={{ fill: status.purple, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>Classificação atual por score</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Saúde metabólica", total: met.total, max: 24, fn: getMetabolicoStatus },
                { label: "Bem-estar", total: bem.total, max: 18, fn: getBemEstarStatus },
                { label: "Blindagem mental", total: men.total, max: 9, fn: getMentalStatus },
              ].map((s, i) => {
                const st = s.fn(s.total);
                return (
                  <div key={i} style={{ textAlign: "center", padding: 20, background: st.bg, borderRadius: 12 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: st.color }}>{s.total}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>de {s.max} pts</div>
                    <div style={{ marginTop: 8, fontWeight: 600, color: st.color }}>{st.emoji} {st.label}</div>
                    <div style={{ fontSize: 12, color: st.color, marginTop: 4 }}>{st.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "relatorio" && (
        <div>
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={styles.cardHeader}>Relatório do paciente</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={styles.btn("outline")}><Printer size={14} /> Imprimir</button>
                <button style={styles.btn("primary")}><Download size={14} /> Gerar PDF</button>
              </div>
            </div>
            <div style={{ border: `1px solid ${gold[200]}`, borderRadius: 12, padding: 24 }}>
              <div style={{ textAlign: "center", borderBottom: `2px solid ${gold[300]}`, paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: gold[800] }}>Relatório de Acompanhamento</div>
                <div style={{ fontSize: 14, color: gold[600] }}>Programa Ser Livre — Instituto Dra. Mariana Wogel</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, fontSize: 14 }}>
                <div><strong>Paciente:</strong> {patient.name}</div>
                <div><strong>Plano:</strong> {plan?.name}</div>
                <div><strong>Ciclo:</strong> {patient.cycle} — Semana {patient.week}/16</div>
                <div><strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")}</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: gold[800], marginBottom: 12 }}>Resultados dos scores</div>
                {[
                  { label: "Saúde metabólica", total: met.total, max: 24, fn: getMetabolicoStatus },
                  { label: "Criticidade e bem-estar", total: bem.total, max: 18, fn: getBemEstarStatus },
                  { label: "Blindagem mental", total: men.total, max: 9, fn: getMentalStatus },
                ].map((s, i) => {
                  const st = s.fn(s.total);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${gold[100]}` }}>
                      <span>{s.label}</span>
                      <span style={styles.badge(st.color, st.bg)}>{st.emoji} {s.total}/{s.max} — {st.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: gold[800], marginBottom: 12 }}>Evolução de peso</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
                  <div><div style={{ fontSize: 20, fontWeight: 700 }}>{patient.initialWeight}kg</div><div style={{ fontSize: 12, color: "#888" }}>Peso inicial</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 700 }}>{patient.currentWeight}kg</div><div style={{ fontSize: 12, color: "#888" }}>Peso atual</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 700, color: status.green }}>-{(patient.initialWeight - patient.currentWeight).toFixed(1)}kg</div><div style={{ fontSize: 12, color: "#888" }}>Perdidos</div></div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: gold[800], marginBottom: 12 }}>Plano de ação</div>
                {met.total <= 12 && <div style={{ padding: "8px 12px", background: status.redBg, borderRadius: 8, marginBottom: 8, fontSize: 14 }}>🔴 <strong>Metabólico crítico:</strong> Iniciar protocolo de ataque + detox. Ajuste de dose terapêutica.</div>}
                {met.total >= 13 && met.total <= 16 && <div style={{ padding: "8px 12px", background: status.yellowBg, borderRadius: 8, marginBottom: 8, fontSize: 14 }}>🟡 <strong>Metabolismo em transição:</strong> Ajustes terapêuticos necessários. Manter acompanhamento intensivo.</div>}
                {met.total >= 17 && <div style={{ padding: "8px 12px", background: status.greenBg, borderRadius: 8, marginBottom: 8, fontSize: 14 }}>🟢 <strong>Metabolismo saudável:</strong> Manutenção. Continuar evolução positiva.</div>}
                {bem.total < 10 && <div style={{ padding: "8px 12px", background: status.redBg, borderRadius: 8, marginBottom: 8, fontSize: 14 }}>🔴 <strong>Bem-estar crítico:</strong> Intervenção médica necessária. Dra. Mariana notificada.</div>}
                {men.total <= 4 && <div style={{ padding: "8px 12px", background: status.redBg, borderRadius: 8, marginBottom: 8, fontSize: 14 }}>🔴 <strong>Risco de recaída:</strong> Sessão individual urgente com psicóloga + ajustes nutricionais.</div>}
              </div>
              <div style={{ marginTop: 24, borderTop: `1px solid ${gold[200]}`, paddingTop: 16, textAlign: "center", fontSize: 12, color: "#aaa" }}>
                <div>Dra. Mariana Wogel — CRM/RJ XXXXX | Nutróloga / Medicina Integrativa</div>
                <div>Praça São Sebastião 119 — Três Rios, RJ | @dramarianawogel</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsPage({ patients }) {
  const alertPatients = patients.map(p => {
    const sc = mockScores[p.id];
    if (!sc) return null;
    const m = calcMetabolico(sc.metabolico);
    const b = calcBemEstar(sc.bemEstar);
    const mt = calcMental(sc.mental);
    const alerts = [];
    if (m.total <= 12) alerts.push({ type: "red", label: "Metabólico crítico", score: `${m.total}/24`, action: "Ataque + detox" });
    if (m.total >= 13 && m.total <= 16) alerts.push({ type: "yellow", label: "Metabolismo em transição", score: `${m.total}/24`, action: "Ajustes terapêuticos" });
    if (b.total < 10) alerts.push({ type: "red", label: "Bem-estar crítico", score: `${b.total}/18`, action: "Intervenção médica" });
    if (b.total >= 10 && b.total <= 13) alerts.push({ type: "yellow", label: "Bem-estar em alerta", score: `${b.total}/18`, action: "Nutricionista intervém" });
    if (mt.total <= 4) alerts.push({ type: "red", label: "Risco de recaída", score: `${mt.total}/9`, action: "Sessão individual" });
    if (mt.total >= 5 && mt.total <= 7) alerts.push({ type: "yellow", label: "Mental em construção", score: `${mt.total}/9`, action: "Reforço nutri + psico" });
    return alerts.length > 0 ? { ...p, alerts } : null;
  }).filter(Boolean);

  const reds = alertPatients.filter(p => p.alerts.some(a => a.type === "red"));
  const yellows = alertPatients.filter(p => p.alerts.every(a => a.type === "yellow"));

  return (
    <div>
      {reds.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: status.red }} />
            <span style={{ fontWeight: 600, color: status.red, fontSize: 15 }}>Alertas vermelhos — intervenção da Dra. Mariana</span>
          </div>
          {reds.map(p => (
            <div key={p.id} style={{ ...styles.card, borderLeft: `4px solid ${status.red}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={styles.avatar(36)}>{getInitials(p.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{PLANS.find(pl => pl.id === p.plan)?.name} • Semana {p.week}</div>
                </div>
              </div>
              {p.alerts.filter(a => a.type === "red").map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: status.redBg, borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                  <span>🔴 {a.label} ({a.score})</span>
                  <span style={{ fontWeight: 600, color: status.red }}>{a.action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {yellows.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: status.yellow }} />
            <span style={{ fontWeight: 600, color: status.yellow, fontSize: 15 }}>Alertas amarelos — atenção da equipe</span>
          </div>
          {yellows.map(p => (
            <div key={p.id} style={{ ...styles.card, borderLeft: `4px solid ${status.yellow}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={styles.avatar(36)}>{getInitials(p.name)}</div>
                <div><div style={{ fontWeight: 600 }}>{p.name}</div></div>
              </div>
              {p.alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: status.yellowBg, borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                  <span>🟡 {a.label} ({a.score})</span>
                  <span style={{ fontWeight: 500, color: "#8B6914" }}>{a.action}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {alertPatients.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🟢</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: status.green }}>Todos os pacientes estão bem!</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Nenhum alerta ativo no momento</div>
        </div>
      )}
    </div>
  );
}

function TeamPage() {
  const roles = { medica: "Médica", enfermagem: "Enfermagem", nutricionista: "Nutricionista", psicologa: "Psicóloga", treinador: "Treinador" };
  const roleColors = { medica: gold[600], enfermagem: status.green, nutricionista: "#2980B9", psicologa: status.purple, treinador: "#E67E22" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: "#888" }}>{teamMembers.length} membros da equipe</div>
        <button style={styles.btn("primary")}><Plus size={16} /> Adicionar membro</button>
      </div>
      {teamMembers.map(m => (
        <div key={m.id} style={{ ...styles.card, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ ...styles.avatar(48), background: `linear-gradient(135deg, ${roleColors[m.role]}, ${roleColors[m.role]}cc)` }}>{getInitials(m.name)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
            <div style={{ fontSize: 13, color: "#888" }}>{m.email}</div>
          </div>
          <span style={styles.badge(roleColors[m.role], roleColors[m.role] + "18")}>{roles[m.role]}</span>
        </div>
      ))}
    </div>
  );
}

function PatientPortal({ patient }) {
  const sc = mockScores[patient.id];
  const met = calcMetabolico(sc?.metabolico);
  const bem = calcBemEstar(sc?.bemEstar);
  const men = calcMental(sc?.mental);
  const history = generateScoreHistory(patient.id);
  const plan = PLANS.find(p => p.id === patient.plan);

  return (
    <div>
      <div style={{ ...styles.card, background: `linear-gradient(135deg, ${gold[700]}, ${gold[900]})`, color: "#fff", marginBottom: 20 }}>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Programa Ser Livre</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Olá, {patient.name.split(" ")[0]}!</div>
        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Plano {plan?.name} • Semana {patient.week} de 16</div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, marginTop: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(patient.week / 16) * 100}%`, background: gold[300], borderRadius: 4 }} />
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>{Math.round((patient.week / 16) * 100)}% do ciclo concluído</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricCard value={`${patient.currentWeight}kg`} label="Peso atual" />
        <MetricCard value={`-${(patient.initialWeight - patient.currentWeight).toFixed(1)}kg`} label="Já perdeu" icon={TrendingUp} color={status.green} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: gold[800], marginBottom: 12 }}>Seus scores atuais</div>
      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <ScoreSemaforo label="Saúde metabólica" total={met.total} maxPts={24} statusFn={getMetabolicoStatus} />
        <ScoreSemaforo label="Bem-estar" total={bem.total} maxPts={18} statusFn={getBemEstarStatus} />
        <ScoreSemaforo label="Blindagem mental" total={men.total} maxPts={9} statusFn={getMentalStatus} />
      </div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>Sua evolução</div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke={gold[100]} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: gold[700] }} />
            <YAxis tick={{ fontSize: 11, fill: "#aaa" }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${gold[200]}`, fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="metabolico" name="Metabólico" stroke={gold[500]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="bemEstar" name="Bem-estar" stroke={status.green} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="mental" name="Mental" stroke={status.purple} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>Radar metabólico</div>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={[
            { pilar: "Composição", value: met.pilares.composicao },
            { pilar: "Inflamação", value: met.pilares.inflamacao },
            { pilar: "Glicêmico", value: met.pilares.glicemico },
            { pilar: "Cardiovascular", value: met.pilares.cardiovascular },
          ]} outerRadius={80}>
            <PolarGrid stroke={gold[200]} />
            <PolarAngleAxis dataKey="pilar" tick={{ fontSize: 12, fill: gold[700] }} />
            <PolarRadiusAxis domain={[0, 6]} tick={{ fontSize: 10, fill: "#aaa" }} />
            <Radar dataKey="value" stroke={gold[500]} fill={gold[400]} fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...styles.btn("outline"), flex: 1, justifyContent: "center" }}><Download size={14} /> Baixar relatório PDF</button>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userMode, setUserMode] = useState("admin");
  const [page, setPage] = useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedPatient = mockPatients.find(p => p.id === selectedPatientId);

  const handleLogin = (mode) => { setLoggedIn(true); setUserMode(mode); };
  const handleSelectPatient = (id) => { setSelectedPatientId(id); setPage("patient_detail"); };

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />;

  if (userMode === "paciente") {
    const portalPatient = mockPatients[0];
    return (
      <div style={styles.app}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={styles.avatar(36)}>{getInitials(portalPatient.name)}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{portalPatient.name}</div>
            </div>
            <div onClick={() => { setLoggedIn(false); setUserMode("admin"); }} style={{ cursor: "pointer", padding: 8 }}><LogOut size={18} color="#888" /></div>
          </div>
          <PatientPortal patient={portalPatient} />
        </div>
      </div>
    );
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "patients", label: "Pacientes", icon: Users },
    { key: "alerts", label: "Alertas", icon: AlertTriangle },
    { key: "team", label: "Equipe", icon: Shield },
    { key: "settings", label: "Configurações", icon: Settings },
  ];

  const pageTitle = {
    dashboard: "Dashboard",
    patients: "Pacientes",
    patient_detail: selectedPatient ? selectedPatient.name : "Paciente",
    alerts: "Central de alertas",
    team: "Equipe multidisciplinar",
    settings: "Configurações",
  };

  const alertCount = mockPatients.filter(p => {
    const sc = mockScores[p.id];
    if (!sc) return false;
    return calcMetabolico(sc.metabolico).total <= 12 || calcBemEstar(sc.bemEstar).total < 10;
  }).length;

  return (
    <div style={styles.app}>
      <div style={{ ...styles.sidebar, ...(sidebarOpen ? {} : styles.sidebarHidden) }}>
        <div style={styles.logo}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} color={gold[300]} />
            <div>
              <div style={{ fontFamily: "'Crimson Pro', serif" }}>Ser Livre</div>
              <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>Instituto Dra. Mariana Wogel</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, paddingTop: 12 }}>
          {navItems.map(item => (
            <div key={item.key} style={styles.navItem(page === item.key)} onClick={() => { setPage(item.key); setSelectedPatientId(null); }}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.key === "alerts" && alertCount > 0 && (
                <span style={{ marginLeft: "auto", background: status.red, color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{alertCount}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${gold[700]}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.avatar(32)}>MW</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Dra. Mariana</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Admin</div>
            </div>
            <LogOut size={16} style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.5 }} onClick={() => setLoggedIn(false)} />
          </div>
        </div>
      </div>
      <div style={styles.main(sidebarOpen)}>
        <div style={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Menu size={20} color={gold[700]} style={{ cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: gold[800], margin: 0, fontFamily: "'Crimson Pro', serif" }}>{pageTitle[page]}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setPage("alerts")}>
              <Bell size={20} color={gold[600]} />
              {alertCount > 0 && <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: status.red, color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{alertCount}</div>}
            </div>
          </div>
        </div>
        {page === "dashboard" && <DashboardPage patients={mockPatients} onSelectPatient={handleSelectPatient} />}
        {page === "patients" && <PatientListPage patients={mockPatients} onSelect={handleSelectPatient} />}
        {page === "patient_detail" && selectedPatient && <PatientDetailPage patient={selectedPatient} onBack={() => setPage("patients")} />}
        {page === "alerts" && <AlertsPage patients={mockPatients} />}
        {page === "team" && <TeamPage />}
        {page === "settings" && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>Configurações do sistema</div>
            <div style={{ fontSize: 14, color: "#888" }}>Configurações de planos, parâmetros de scores e preferências do sistema.</div>
            <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
              {PLANS.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: warm[100], borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Tier {p.tier} — {PLAN_FEATURES[p.tier].label}</div>
                  </div>
                  <button style={styles.btn("outline")}>Editar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
