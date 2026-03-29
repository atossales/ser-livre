import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Card de alerta clínico com botão para resolver.
 *
 * @param {{ alert: object, onResolve?: (id:number|string)=>void }} props
 */
export function AlertCard({ alert, onResolve }) {
  const isRed = alert.severity === 'RED';
  return (
    <div style={{
      background: isRed ? '#fef2f2' : '#fffbeb',
      border: `1px solid ${isRed ? '#fecaca' : '#fde68a'}`,
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <AlertTriangle
        size={18}
        color={isRed ? '#dc2626' : '#d97706'}
        style={{ marginTop: 2, flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: isRed ? '#991b1b' : '#92400e' }}>
          {alert.patient?.user?.name || 'Paciente'}
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{alert.message}</div>
        {alert.action && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' }}>
            → {alert.action}
          </div>
        )}
      </div>
      {onResolve && (
        <button
          onClick={() => onResolve(alert.id)}
          style={{
            background: 'none',
            border: `1px solid ${isRed ? '#dc2626' : '#d97706'}`,
            color: isRed ? '#dc2626' : '#d97706',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✓ Resolver
        </button>
      )}
    </div>
  );
}
