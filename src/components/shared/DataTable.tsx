import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  maxHeight?: string;
  stickyHeader?: boolean;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 50,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  maxHeight = '500px',
  stickyHeader = true,
  onRowClick,
  rowClassName,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      searchKeys.some(key => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const alignClass = (align?: string) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
      {searchable && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-button bg-slate-50 focus:ring-2 focus:ring-brand-400 focus:outline-none"
              aria-label={searchPlaceholder}
            />
          </div>
          <span className="text-2xs text-slate-400 ml-auto">
            {filtered.length.toLocaleString('pt-BR')} registro{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="overflow-x-auto" style={{ maxHeight }}>
        <table className="w-full text-xs">
          <thead className={`bg-slate-800 text-white text-2xs uppercase tracking-wide ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`px-3 py-2.5 font-bold ${alignClass(col.align)}`} style={col.width ? { width: col.width } : undefined}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-0">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paged.map((row, i) => {
                const globalIdx = safePage * pageSize + i;
                return (
                  <tr
                    key={globalIdx}
                    className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(row, globalIdx) || ''}`}
                    onClick={() => onRowClick?.(row, globalIdx)}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={`px-3 py-2.5 ${alignClass(col.align)}`}>
                        {col.render ? col.render(row, globalIdx) : (row[col.key] != null ? String(row[col.key]) : '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > pageSize && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-2xs font-medium text-slate-600 bg-white border border-gray-200 rounded-button disabled:opacity-40 hover:bg-gray-50"
            aria-label="Página anterior"
          >
            <ChevronLeft size={12} /> Anterior
          </button>
          <span className="text-2xs text-slate-500">
            Página {safePage + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="flex items-center gap-1 px-2.5 py-1 text-2xs font-medium text-slate-600 bg-white border border-gray-200 rounded-button disabled:opacity-40 hover:bg-gray-50"
            aria-label="Próxima página"
          >
            Próximo <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
