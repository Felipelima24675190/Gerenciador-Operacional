import { Calendar } from 'lucide-react';

interface FilterItem {
  id: string;
  label: string;
  type: 'date' | 'select' | 'text';
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterItem[];
  className?: string;
}

export default function FilterBar({ filters, className = '' }: FilterBarProps) {
  return (
    <div className={`bg-white rounded-card border border-gray-200 shadow-card p-4 flex flex-wrap items-end gap-4 ${className}`}>
      {filters.map(f => (
        <div key={f.id} className="flex flex-col gap-1">
          <label htmlFor={f.id} className="text-2xs font-bold text-slate-500 uppercase tracking-wide">
            {f.label}
          </label>
          {f.type === 'date' ? (
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id={f.id}
                type="date"
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              />
            </div>
          ) : f.type === 'select' ? (
            <select
              id={f.id}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            >
              {f.options?.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              id={f.id}
              type="text"
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              placeholder={f.placeholder}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
          )}
        </div>
      ))}
    </div>
  );
}
