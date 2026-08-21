import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ArrowDownCircle, 
  ArrowUpCircle 
} from 'lucide-react';
import { getStatusColor } from '../../utils/formatters';

export const StatusBadge = ({ 
  status, 
  size = 'md', 
  showIcon = true 
}) => {
  const colors = getStatusColor(status);

  const getIcon = () => {
    const iconSize = size === 'sm' ? 12 : 14;
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle2 size={iconSize} className="shrink-0" />;
      case 'PENDING':
        return <Clock size={iconSize} className="shrink-0" />;
      case 'MISMATCH':
        return <AlertTriangle size={iconSize} className="shrink-0" />;
      case 'NOT_RECEIVED':
        return <XCircle size={iconSize} className="shrink-0" />;
      case 'UNDERPAID':
        return <ArrowDownCircle size={iconSize} className="shrink-0" />;
      case 'OVERPAID':
        return <ArrowUpCircle size={iconSize} className="shrink-0" />;
      default:
        return null;
    }
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-bold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3 py-1.5 font-extrabold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${colors.badge} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {showIcon && getIcon()}
      <span className="tracking-wide uppercase font-mono">{status.replace('_', ' ')}</span>
    </span>
  );
};
