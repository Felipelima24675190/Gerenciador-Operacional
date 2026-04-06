interface SkeletonProps {
  className?: string;
  lines?: number;
  type?: 'text' | 'card' | 'table' | 'chart';
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} aria-hidden="true" />;
}

export default function SkeletonLoader({ className = '', lines = 3, type = 'text' }: SkeletonProps) {
  if (type === 'card') {
    return (
      <div className={`bg-white rounded-card border border-gray-100 p-5 space-y-3 ${className}`} role="status" aria-label="Carregando">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-8 w-32" />
        <SkeletonLine className="h-3 w-40" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`space-y-2 ${className}`} role="status" aria-label="Carregando tabela">
        <SkeletonLine className="h-10 w-full rounded-lg" />
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className={`bg-white rounded-card border border-gray-100 p-5 ${className}`} role="status" aria-label="Carregando gráfico">
        <SkeletonLine className="h-3 w-48 mb-4" />
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="skeleton flex-1 rounded-t"
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Carregando">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={`w-${i === lines - 1 ? '2/3' : 'full'}`} />
      ))}
    </div>
  );
}
