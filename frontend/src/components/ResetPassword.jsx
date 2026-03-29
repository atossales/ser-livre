import { useState } from 'react';
import { supabase } from '../utils/supabase';

const G = { 50:'#F0F7F3', 200:'#C8DDD0', 600:'#4A7C59', 700:'#3D6B4A', 800:'#2E5438' };

export function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Senha deve ter ao menos 8 caracteres.');
    if (password !== confirm) return setError('Senhas não coincidem.');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(err.message);
    setSuccess(true);
    setTimeout(() => onDone && onDone(), 2500);
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#3D6B4A,#2E5438)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      fontFamily:"'Outfit','Inter',system-ui,sans-serif" }}>
      <div style={{ background:'#fff', width:'100%', maxWidth:380, borderRadius:16, padding:28,
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'#2E5438', marginBottom:4 }}>
          Criar nova senha
        </div>
        <div style={{ fontSize:12, color:'#888', marginBottom:22 }}>
          Digite sua nova senha para acessar o Ser Livre.
        </div>
        {success ? (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>&#x2705;</div>
            <div style={{ fontWeight:600, color:'#4A7C59', fontSize:14 }}>Senha atualizada!</div>
            <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>Redirecionando para o login...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:500, color:'#3D6B4A', display:'block', marginBottom:4 }}>Nova senha</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #C8DDD0',
                  fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:500, color:'#3D6B4A', display:'block', marginBottom:4 }}>Confirmar senha</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #C8DDD0',
                  fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
            </div>
            {error && (
              <div style={{ color:'#e53e3e', fontSize:12, marginBottom:12, padding:'8px 10px',
                background:'#fff5f5', borderRadius:6 }}>{error}</div>
            )}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'11px', borderRadius:8, background:'#4A7C59',
                color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
                fontFamily:'inherit', opacity:loading?0.7:1 }}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
