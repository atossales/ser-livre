import React from 'react';

/**
 * Componente de notificações toast.
 * Acessível: usa role="alert" / aria-live para leitores de tela.
 * Inclui botão de fechar manual.
 *
 * @param {{ toasts: Array<{id:string, msg:string, type:'success'|'error'|'warning'}>, onClose?: (id:string)=>void }} props
 */
export function Toast({ toasts, onClose }) {
  if (!toasts?.length) return null;

  const colors = {
    error:   { bg: '#dc2626', border: '#b91c1c' },
    warning: { bg: '#d97706', border: '#b45309' },
    success: { bg: '#16a34a', border: '#15803d' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 340,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        const c = colors[t.type] || colors.success;
        return (
          <div
            key={t.id}
            role="alert"
            aria-live={t.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            style={{
              padding: '12px 14px 12px 16px',
              borderRadius: 10,
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              pointerEvents: 'auto',
              minWidth: 220,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 14, flexShrink: 0 }}>
              {t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '✓'}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.msg}</span>
            {onClose && (
              <button
                onClick={() => onClose(t.id)}
                aria-label="Fechar notificação"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
