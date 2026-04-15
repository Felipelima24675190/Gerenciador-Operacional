# Guia de Estilo Visual Unificado — Tema Neon Dashboard

Baseado nas imagens de referência "Performance" e "Shipment Delays" (dashboards escuros com Fúcsia Neon + Azul Lavanda).

Implementação de referência: `src/components/dashboard/NeonDashboardDemo.tsx`
Tokens Tailwind: `tailwind.config.js` → `colors.neon`

---

## 1. Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `neon.bg` | `#1e1136` | Fundo principal do dashboard (roxo escuro, acetinado) |
| `neon.surface` | `#2c194e` | Fundo de cartões / módulos (roxo levemente mais claro) |
| `neon.border` | `#3a2466` | Bordas / brilho interno sutil |
| `neon.muted` | `#6b4db8` | Acentos sutis |
| `neon.fuchsia` | `#ff2bd6` | **Cor dominante** — barras, linhas, KPIs, ícones |
| `neon.fuchsiaSoft` | `#ff7ae3` | Fúcsia mais suave para hover/áreas |
| `neon.lavender` | `#b6a6ff` | **Cor secundária** — série de comparação |
| `neon.lavenderSoft` | `#d4caff` | Lavanda suave |
| `neon.text` | `#f5f2ff` | Texto principal |
| `neon.textMuted` | `#b8aad6` | Texto de suporte / eixos |

Uso via Tailwind: `bg-neon-bg`, `text-neon-fuchsia`, `border-neon-border`, etc.

---

## 2. Tipografia

- Família: **Inter** (já configurada)
- Hierarquia:
  - **Título do dashboard**: `text-2xl font-black` — `#f5f2ff`
  - **Título de cartão**: `text-sm font-black tracking-wide` — `#f5f2ff`
  - **KPI numérico**: `text-2xl font-black` — `#ff2bd6` (Fúcsia)
  - **Rótulo KPI**: `text-[10px] font-bold uppercase tracking-wider` — `#f5f2ff`
  - **Texto auxiliar**: `text-xs font-bold` — `#b8aad6`
- Números PT-BR: vírgula para decimais, ponto para milhares (`806,4` · `3.590`)

---

## 3. Componentes

### 3.1. KPI Card
```
Fundo: neon.surface
Borda: 1px neon.border
Inset glow: inset 0 0 20px rgba(255,43,214,0.05)
Ícone: Lucide thin (strokeWidth=1.5), cor neon.fuchsia, 20px
Valor: 2xl, font-black, neon.fuchsia
Rótulo: 10px, bold, uppercase, tracking-wider, neon.text
Padding: 16px
Border-radius: 1rem (rounded-2xl)
```

### 3.2. Módulo / Panel
```
Fundo: neon.surface
Borda: 1px neon.border
Inset glow: inset 0 0 24px rgba(255,43,214,0.04)
Padding: 16px
Border-radius: 1rem
```

### 3.3. Gráfico de Rosquinha (Donut)
- `innerRadius: 55` / `outerRadius: 85` / `paddingAngle: 3`
- Stroke entre slices = cor `neon.surface` (dá sensação de separação)
- Cores: `neon.fuchsia` (primário), `neon.lavender` (secundário), `neon.fuchsiaSoft` (terciário)
- Label interna: apenas percentagem (`XX.X%`) quando ≥ 6%
- Legenda: texto `neon.text`, iconSize 10

### 3.4. Gráfico de Linha / Tendência
- Linha primária: `stroke={neon.fuchsia}`, `strokeWidth={2}`
- Linha de comparação: `stroke={neon.lavender}`, `strokeWidth={2}`
- Dots: `r=4`, fill = cor da linha, stroke = `neon.surface`, strokeWidth=2
- Grid: `strokeDasharray="3 3"` · `stroke: rgba(182,166,255,0.15)`
- Eixos: tick `10px`, fill `neon.textMuted`

### 3.5. Barras Horizontais (Top N)
- Layout `vertical`
- `fill={neon.fuchsia}` · `radius={[0,4,4,0]}`
- Grid apenas vertical (`horizontal={false}`)
- Hover cursor: `rgba(255,43,214,0.08)`
- Ícones de controle (Voltar / Zoom) em fúcsia, thin stroke

### 3.6. Barras Agrupadas (Comparativo)
- `Atual` = `neon.fuchsia`, `Anterior` = `neon.lavender`
- Cantos arredondados superiores: `radius={[4,4,0,0]}`

### 3.7. Gráfico de Área
- Gradiente linear vertical:
  - `0%`: `neon.fuchsia` @ opacity 0.6
  - `100%`: `neon.fuchsia` @ opacity 0.05
- Linha superior: `neon.fuchsia`, 2px
- Dots: `neon.lavender`, stroke `neon.surface`

### 3.8. Gráfico de Dispersão (Scatter)
- Pontos primários: `neon.fuchsia`
- Pontos secundários: `neon.lavender`
- Tamanhos variáveis entre 40–180 (prop `size`)

### 3.9. Mapa
- Contorno / preenchimento: `neon.bg` (mesmo roxo do fundo)
- Pins: bolhas `neon.fuchsia` com número branco em cima

---

## 4. Elementos Não-Gráficos

### 4.1. Filtros / Radio Pill
- Círculo vazio (`w-3 h-3 border-2`) → ativo recebe `box-shadow: 0 0 8px fúcsia` e preenche com `bg-fúcsia`
- Texto: `neon.textMuted` → `neon.fuchsia` quando ativo

### 4.2. Slider (Top N)
- Trilho: `bg-neon.border` · `h-2 rounded-full`
- Preenchimento: `bg-neon.fuchsia`
- Manivela: `w-4 h-4 rounded-full bg-neon.fuchsia` + `box-shadow: 0 0 10px fúcsia`

### 4.3. Input Numérico
- Fundo `neon.bg`, borda `neon.border`, texto `neon.fuchsia` font-black
- `rounded-lg`, padding 2/1.5

### 4.4. Tooltip
- Fundo `neon.surface`, borda 1px `neon.border`
- Label superior: `neon.lavender`, uppercase, 11px
- Valores: cor da série + valor em `font-black`
- Shadow: `shadow-lg`

### 4.5. Ícones
- **Sempre thin stroke**: `strokeWidth={1.5}` ou `={1}`
- Lucide icons: `Package`, `Users`, `MapPin`, `Clock`, `ZoomIn`, `ArrowLeft`
- Cor padrão: `neon.fuchsia`

### 4.6. Controles de Navegação
- Botões "Voltar" / "Zoom": texto fúcsia, ícone thin stroke à esquerda
- Sem fundo, apenas hover `underline` ou brilho

---

## 5. Layout

- Grid 12 colunas, gap 16px (`gap-4`)
- Bordas e paddings sempre múltiplos de 4
- `rounded-2xl` (1rem) para todos os módulos

### Composição recomendada (demo):
```
Linha 1 (KPIs + Donut + Line):   3 + 4 + 5  columns
Linha 2 (Bars + Area + Scatter): 5 + 4 + 3  columns
Linha 3 (Grouped Bars + Slider): 8 + 4      columns
```

---

## 6. Aplicação ao App Atrasos

O tema foi implementado como **opt-in** através de uma nova rota:
- **Sidebar**: "Performance (Neon)" (ícone `Gauge`)
- **Rota**: `dashboard-neon`
- **Componente**: `NeonDashboardDemo`
- **Dados**: consome `ocorrencias`, `motoristas`, `veiculos` existentes

Para migrar telas existentes, trocar:
- `bg-white` → `bg-neon-surface`
- `text-slate-800` → `text-neon-text`
- `border-gray-200` → `border-neon-border`
- Cores de data: `#10b981`/`#3b82f6` → `neon.fuchsia`/`neon.lavender`
- Grid cartesiano: `stroke-slate-200` → `rgba(182,166,255,0.15)`
