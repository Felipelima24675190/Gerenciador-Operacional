import { LucideIcon } from 'lucide-react';
import MetricCard from '../shared/MetricCard';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'red' | 'blue' | 'orange' | 'green';
}

// Backward-compatible wrapper that maps old StatCard API to MetricCard
const COLOR_MAP: Record<string, 'danger' | 'info' | 'warning' | 'success'> = {
  red: 'danger',
  blue: 'info',
  orange: 'warning',
  green: 'success',
};

export default function StatCard({ title, value, icon, trend, trendUp, color = 'blue' }: StatCardProps) {
  return (
    <MetricCard
      label={title}
      value={value}
      icon={icon}
      size="lg"
      variant={COLOR_MAP[color] || 'default'}
      trend={trend ? { value: trendUp ? 5 : -5, label: trend } : undefined}
    />
  );
}
