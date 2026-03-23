import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'red' | 'blue' | 'orange' | 'green';
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  color = 'blue' 
}: StatCardProps) {
  const bgColors = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600'
  };

  const trendColors = trendUp ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-sm font-medium">
              <span className={trendColors}>{trend}</span>
              <span className="text-gray-400 font-normal">vs última semana</span>
            </div>
          )}
        </div>
        
        <div className={twMerge(clsx("p-4 rounded-full", bgColors[color]))}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}
