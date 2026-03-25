// ============================================================
// APP PRINCIPAL — Programa Ser Livre (Frontend)
//
// Este é o ponto de entrada do frontend. Gerencia:
// - Login/autenticação
// - Navegação entre telas
// - Renderização do dashboard, pacientes, scores, etc.
//
// COMO FUNCIONA:
// 1. Usuário abre o site → vê tela de login
// 2. Faz login → recebe um token JWT
// 3. Token é salvo no localStorage
// 4. Todas as chamadas à API incluem o token
// 5. Backend verifica o token e retorna os dados permitidos
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import * as API from './utils/api';

// Cores da marca
const G = { 50:"#FBF7EE",100:"#F5ECDA",200:"#EBDAB5",300:"#D4B978",400:"#C4A44E",500:"#A8872E",600:"#8B6D1E",700:"#6E5517",800:"#4E3D12",900:"#332810" };
const ST = { red:"#C0392B",redBg:"#FDEDEC",yel:"#F39C12",yelBg:"#FEF9E7",grn:"#27AE60",grnBg:"#EAFAF1",pur:"#8E44AD",purBg:"#F4ECF7" };

// ── Componente de Login ──
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await API.seed();
      alert(res.data.message);
    } catch (err) {
      alert('Erro ao criar dados iniciais: ' + (err.response?.data?.error || err.message));
    }
    setSeeding(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await API.login(email, password);
      localStorage.setItem('serlivre_token', res.data.token);
      localStorage.setItem('serlivre_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao conectar');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh',background:`linear-gradient(135deg,${G[800]},${G[900]} 50%,#1a1a2e)`,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ width:'100%',maxWidth:380,background:'#fff',borderRadius:20,padding:'36px 28px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center',marginBottom:28 }}>
          <div style={{ fontSize:22,fontWeight:700,color:G[800] }}>Programa Ser Livre</div>
          <div style={{ fontSize:13,color:'#aaa',marginTop:4 }}>Instituto Dra. Mariana Wogel</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13,fontWeight:500,color:G[700],display:'block',marginBottom:4 }}>E-mail</label>
            <input style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${G[300]}`,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
              type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13,fontWeight:500,color:G[700],display:'block',marginBottom:4 }}>Senha</label>
            <input style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:`1px solid ${G[300]}`,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}
              type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && <div style={{ color:ST.red,fontSize:13,marginBottom:12,padding:'8px 12px',background:ST.redBg,borderRadius:8 }}>{error}</div>}

          <button type="submit" disabled={loading}
            style={{ width:'100%',padding:'12px',borderRadius:10,background:G[600],color:'#fff',fontSize:15,fontWeight:600,border:'none',cursor:'pointer',fontFamily:'inherit',opacity:loading?0.6:1 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ borderTop:`1px solid ${G[200]}`,marginTop:20,paddingTop:16,textAlign:'center' }}>
          <div style={{ fontSize:12,color:'#aaa',marginBottom:8 }}>Primeira vez? Crie os dados iniciais:</div>
          <button onClick={handleSeed} disabled={seeding}
            style={{ padding:'8px 16px',borderRadius:8,background:'transparent',border:`1px solid ${G[300]}`,color:G[700],fontSize:13,cursor:'pointer',fontFamily:'inherit' }}>
            {seeding ? 'Criando...' : 'Criar dados iniciais (seed)'}
          </button>
          <div style={{ fontSize:11,color:'#ccc',marginTop:6 }}>Depois use: mariana@institutowogel.com / 123456</div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard (após login) ──
function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (user.role !== 'PACIENTE') {
        const [dashRes, alertRes] = await Promise.all([API.getDashboard(), API.getAlerts()]);
        setData(dashRes.data);
        setAlerts(alertRes.data);
      } else {
        const patRes = await API.getPatients();
        setData({ patients: patRes.data, totalPatients: patRes.data.length });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding:40,textAlign:'center',color:G[600] }}>Carregando...</div>;

  const isPatient = user.role === 'PACIENTE';

  return (
    <div style={{ minHeight:'100vh',background:'#FEFCF9' }}>
      {/* Header */}
      <div style={{ background:'#fff',borderBottom:`1px solid ${G[200]}`,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:10 }}>
        <div>
          <div style={{ fontSize:17,fontWeight:700,color:G[800] }}>Ser Livre</div>
          <div style={{ fontSize:11,color:'#aaa' }}>Olá, {user.name.split(' ')[0]}</div>
        </div>
        <button onClick={onLogout} style={{ padding:'6px 14px',borderRadius:6,background:G[100],border:'none',color:G[700],fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Sair</button>
      </div>

      <div style={{ padding:16,maxWidth:900,margin:'0 auto' }}>
        {!isPatient && data && (
          <>
            {/* KPIs */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:10,marginBottom:16 }}>
              <KPI label="Pacientes" value={data.totalPatients} />
              <KPI label="Peso perdido" value={`${data.totalWeightLost}kg`} color={ST.grn} />
              <KPI label="Média/paciente" value={`${data.avgWeightLost}kg`} />
              <KPI label="Alertas vermelhos" value={data.redAlerts} color={data.redAlerts > 0 ? ST.red : ST.grn} />
            </div>

            {/* Alertas */}
            {alerts.length > 0 && (
              <div style={{ background:ST.redBg,borderRadius:12,border:`1px solid ${ST.red}30`,padding:'14px 16px',marginBottom:16 }}>
                <div style={{ fontWeight:600,color:ST.red,fontSize:14,marginBottom:8 }}>Alertas ativos</div>
                {alerts.slice(0,5).map(a => (
                  <div key={a.id} style={{ fontSize:13,padding:'6px 0',borderBottom:`1px solid ${ST.red}15` }}>
                    <span style={{ color:a.severity==='RED'?ST.red:ST.yel }}>{a.severity==='RED'?'🔴':'🟡'}</span> {a.patient?.user?.name} — {a.message}
                  </div>
                ))}
              </div>
            )}

            {/* Lista de pacientes */}
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${G[200]}`,padding:'14px 16px' }}>
              <div style={{ fontWeight:600,color:G[800],fontSize:15,marginBottom:12 }}>Pacientes</div>
              {data.patients?.map(p => (
                <div key={p.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${G[100]}` }}>
                  <div style={{ width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${G[400]},${G[600]})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:600,fontSize:13,flexShrink:0 }}>
                    {p.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600,fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:12,color:'#aaa' }}>{p.plan?.replace('_',' ')}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14,fontWeight:700,color:ST.grn }}>-{p.weightLost}kg</div>
                    {p.latestScore && <span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,
                      background:p.latestScore.statusMetabolico==='CRITICO'?ST.redBg:p.latestScore.statusMetabolico==='ELITE'?ST.purBg:ST.grnBg,
                      color:p.latestScore.statusMetabolico==='CRITICO'?ST.red:p.latestScore.statusMetabolico==='ELITE'?ST.pur:ST.grn }}>
                      {p.latestScore.statusMetabolico}
                    </span>}
                  </div>
                </div>
              ))}
              {(!data.patients || data.patients.length === 0) && (
                <div style={{ textAlign:'center',padding:20,color:'#aaa' }}>
                  Nenhum paciente cadastrado ainda.<br/>Use a API para cadastrar pacientes.
                </div>
              )}
            </div>
          </>
        )}

        {isPatient && data?.patients && data.patients[0] && (
          <PatientView patient={data.patients[0]} />
        )}

        {isPatient && (!data?.patients || data.patients.length === 0) && (
          <div style={{ textAlign:'center',padding:40,color:'#aaa' }}>Seu perfil de paciente ainda não foi criado pela equipe.</div>
        )}
      </div>
    </div>
  );
}

// ── KPI Card ──
function KPI({ label, value, color }) {
  return (
    <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${G[200]}`,padding:'12px 14px' }}>
      <div style={{ fontSize:10,color:G[600],fontWeight:500,textTransform:'uppercase',letterSpacing:'0.04em' }}>{label}</div>
      <div style={{ fontSize:22,fontWeight:700,color:color||G[800],marginTop:2 }}>{value}</div>
    </div>
  );
}

// ── Visualização do paciente (portal read-only) ──
function PatientView({ patient }) {
  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${G[700]},${G[900]})`,borderRadius:14,padding:'18px 16px',color:'#fff',marginBottom:16 }}>
        <div style={{ fontSize:11,opacity:0.5 }}>Programa Ser Livre</div>
        <div style={{ fontSize:20,fontWeight:700,marginTop:4 }}>Olá, {patient.user?.name?.split(' ')[0]}!</div>
        <div style={{ fontSize:12,opacity:0.6,marginTop:4 }}>Plano {patient.plan?.replace('_',' ')}</div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        <KPI label="Peso atual" value={`${patient.currentWeight}kg`} />
        <KPI label="Já perdeu" value={`-${(patient.initialWeight - patient.currentWeight).toFixed(1)}kg`} color={ST.grn} />
      </div>
      <div style={{ textAlign:'center',padding:20,color:'#aaa',fontSize:13,marginTop:16 }}>
        Seus scores e gráficos aparecerão aqui conforme a equipe preencher seus dados.
      </div>
    </div>
  );
}

// ── App Principal ──
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('serlivre_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => {
    localStorage.removeItem('serlivre_token');
    localStorage.removeItem('serlivre_user');
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
