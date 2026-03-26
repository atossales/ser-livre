import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { acceptInvite } from '../utils/api';

const G = {
  50:"#FBF7EE", 100:"#F5ECDA", 500:"#A8872E", 600:"#8B6D1E", 700:"#6E5517"
};

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      await acceptInvite(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao definir senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:G[50], display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui, sans-serif' }}>
      <div style={{ background:'white', borderRadius:12, padding:40, width:'100%', maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, background:G[100], borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <span style={{ fontSize:24 }}>🔐</span>
          </div>
          <h1 style={{ color:G[700], fontSize:22, fontWeight:700, margin:0 }}>Criar senha</h1>
          <p style={{ color:'#666', marginTop:8, fontSize:14 }}>Bem-vindo ao Programa Ser Livre!<br/>Defina sua senha de acesso.</p>
        </div>

        {done ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h2 style={{ color:G[600] }}>Senha criada!</h2>
            <p style={{ color:'#666' }}>Você já pode fazer login com sua nova senha.</p>
            <button
              onClick={() => navigate('/')}
              style={{ marginTop:24, background:G[600], color:'white', border:'none', borderRadius:8, padding:'12px 32px', fontSize:16, cursor:'pointer', width:'100%' }}
            >
              Ir para o Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background:'#FDEDEC', color:'#C0392B', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14 }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:G[700], marginBottom:6 }}>Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                style={{ width:'100%', padding:'10px 14px', border:`1px solid ${G[200]}`, borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:G[700], marginBottom:6 }}>Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                style={{ width:'100%', padding:'10px 14px', border:`1px solid ${G[200]}`, borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width:'100%', background:loading ? G[300] : G[600], color:'white', border:'none', borderRadius:8, padding:'12px', fontSize:16, cursor:loading ? 'not-allowed' : 'pointer', fontWeight:600 }}
            >
              {loading ? 'Salvando...' : 'Criar senha e entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
