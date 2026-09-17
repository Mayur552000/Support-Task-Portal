import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const KPICard = ({ title, value, subtitle, type = 'info', onClick }) => {
  return (
    <div className={`kpi-card ${type}`} onClick={onClick} title="Click to drill down">
      <div className="kpi-header">
        <span>{title}</span>
        <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">
        <span>{subtitle}</span>
      </div>
    </div>
  );
};
