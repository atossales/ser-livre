import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AcceptInvite from './pages/AcceptInvite';
import ResetPassword from './pages/ResetPassword';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#FEFCF9", padding:20 }}>
          <div style={{ textAlign:"center", maxWidth:400 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>&#9888;&#65039;</div>
            <h2 style={{ color:"#4E3D12", marginBottom:8 }}>Algo deu errado</h2>
            <p style={{ color:"#888", fontSize:14, marginBottom:20 }}>Ocorreu um erro inesperado. Tente recarregar a pagina.</p>
            <button onClick={()=>window.location.reload()} style={{ padding:"10px 24px", borderRadius:8, background:"#7A6C4F", color:"#fff", border:"none", fontSize:14, fontWeight:600, cursor:"pointer" }}>
              Recarregar pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/convite/:token" element={<AcceptInvite />} />
        <Route path="/redefinir-senha/:token" element={<ResetPassword />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
);
