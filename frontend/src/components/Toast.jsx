import React from 'react';

/**
 * Componente de notificações toast.
 * Renderiza uma pilha de toasts no canto inferior direito da tela.
 *
 * @param {{ toasts: Array<{id:number, msg:string, type:'success'|'error'|'warning'}> }} props
 */
export function Toast({ toasts }) {
  if (!toasts?.length) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 320,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px',
          borderRadius: 10,
          background: t.type === 'error'
            ? '#dc2626'
            : t.type === 'warning'
            ? '#d97706'
            : '#16a34a',
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '✓'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
