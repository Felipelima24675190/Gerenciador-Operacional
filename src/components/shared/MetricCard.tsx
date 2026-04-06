import { LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

type CardSize = 'sm' | 'md' | 'lg';
type CardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'dark';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  size?: CardSize;
  variant?: CardVariant;
  trend?: {
    value: number;     // percentage
    label?: string;    // e.g. "vs período anterior"
    invertColor?: boolean; // true = up is bad (default for most operational metrics)
  };
  unit?: string;       // "R$", "%", "km"
  unitPosition?: 'prefix' | 'suffix';
  subValue?: string;
  className?: string;
}

const SIZE_CONFIG: Record<CardSize, { padding: string; valueSize: string; labelSize: string; iconSize: number; iconPadding: string }> = {
  sm: { padding: 'p-3', valueSize: 'text-lg font-black', labelSize: 'text-2xs', iconSize: 16, iconPadding: 'p-2' },
  md: { padding: 'p-4', valueSize: 'text-2xl font-black', labelSize: 'text-2xs', iconSize: 20, iconPadding: 'p-2.5' },
  lg: { padding: 'p-5', valueSize: 'text-3xl font-bold', labelSize: 'text-xs', iconSize: 24, iconPadding: 'p-3' },
};

const VARIANT_CONFIG: Record<CardVariant, { bg: string; border: string; iconBg: string; iconColor: string; valueCls: string }> = {
  default: { bg: 'bg-white', border: 'border-gray-200', iconBg: 'bg-brand-50', iconColor: 'text-brand-600', valueCls: 'text-slate-800' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', valueCls: 'text-emerald-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', valueCls: 'text-amber-800' },
  danger: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', valueCls: 'text-red-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', valueCls: 'text-blue-800' },
  dark: { bg: 'bg-slate-800', border: 'border-slate-700', iconBg: 'bg-slate-700', iconColor: 'text-slate-300', valueCls: 'text-white' },
};

function formatValue(value: string | number, unit?: string, unitPosition?: 'prefix' | 'suffix'): React.ReactNode {
  const formatted = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
  if (!unit) return formatted;
  if (unitPosition === 'prefix' || unit === 'R$') {
    return <>{unit} {formatted}</>;
  }
  return <>{formatted}{unit}</>;
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  size = 'md',
  variant = 'default',
  trend,
  unit,
  unitPosition,
  subValue,
  className,
}: MetricCardProps) {
  const s = SIZE_CONFIG[size];
  const v = VARIANT_CONFIG[variant];
  const isDark = variant === 'dark';
  const labelColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const trendUp = trend && trend.value > 0;
  const trendDown = trend && trend.value < 0;
  const trendIsGood = trend ? (trend.invertColor ? trendDown : trendUp) : false;
  const trendColor = trend?.value === 0 ? 'text-slate-400 bg-slate-100' :
    trendIsGood ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100';

  return (
    <div className={twMerge(clsx(
      'rounded-card border shadow-card hover:shadow-card-hover transition-shadow',
      v.bg, v.border, s.padding, className,
    ))}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={clsx('font-bold uppercase tracking-tight', s.labelSize, labelColor)}>{label}</p>
          <p className={clsx('mt-1', s.valueSize, v.valueCls)}>
            {formatValue(value, unit, unitPosition)}
          </p>
          {subValue && (
            <p className={clsx('text-2xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{subValue}</p>
          )}
          {trend && trend.value !== undefined && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className={clsx('text-2xs font-bold px-1.5 py-0.5 rounded', trendColor)}>
                {trendUp ? '▲' : trendDown ? '▼' : '='} {Math.abs(trend.value).toFixed(1)}%
              </span>
              {trend.label && (
                <span className={clsx('text-2xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('rounded-xl shrink-0', s.iconPadding, v.iconBg, v.iconColor)}>
            <Icon size={s.iconSize} />
          </div>
        )}
      </div>
    </div>
  );
}
