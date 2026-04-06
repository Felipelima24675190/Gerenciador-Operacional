import EmptyState from './EmptyState';
import { BarChart3 } from 'lucide-react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  actions?: React.ReactNode;
}

export default function ChartCard({
  title,
  children,
  height = 'h-64',
  isEmpty = false,
  emptyMessage = 'Sem dados no período',
  className = '',
  actions,
}: ChartCardProps) {
  return (
    <div className={`bg-white rounded-card border border-gray-200 shadow-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-2xs font-black text-slate-600 uppercase tracking-tight">{title}</h4>
        {actions}
      </div>
      {isEmpty ? (
        <EmptyState icon={BarChart3} title={emptyMessage} description="" />
      ) : (
        <div className={height}>{children}</div>
      )}
    </div>
  );
}
