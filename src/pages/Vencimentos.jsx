import { useState, useMemo } from "react";
import { db } from "@/api/db";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, parseISO, isValid, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarX2,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Paleta de cores por categoria ───────────────────────────────────────────
const CATEGORIA_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200", dot: "bg-fuchsia-500" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200", dot: "bg-lime-500" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
];

// Mapeamento estável de categoria → cor
let _catMap = {};
let _catCounter = 0;
function getCategoriaColor(categoria) {
  const key = (categoria || "Sem categoria").toLowerCase().trim();
  if (!_catMap[key]) {
    _catMap[key] = CATEGORIA_COLORS[_catCounter % CATEGORIA_COLORS.length];
    _catCounter++;
  }
  return _catMap[key];
}

// ─── Faixas de urgência ───────────────────────────────────────────────────────
const TABS = [
  {
    key: "vencidos",
    label: "Vencidos",
    icon: XCircle,
    iconColor: "text-red-600",
    activeBg: "bg-red-600",
    activeText: "text-white",
    inactiveBg: "bg-white hover:bg-red-50",
    inactiveText: "text-red-600",
    border: "border-red-300",
    cardBg: "bg-red-50",
    cardBorder: "border-red-200",
    rowHighlight: "bg-red-50",
    badgeCls: "bg-red-100 text-red-800",
    filter: (dias) => dias < 0,
    diasLabel: (dias) => `${Math.abs(dias)}d atrás`,
    diasCls: "text-red-700 font-black",
    emptyMsg: "Nenhum medicamento vencido com estoque ativo.",
  },
  {
    key: "30dias",
    label: "Até 30 dias",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
    activeBg: "bg-orange-600",
    activeText: "text-white",
    inactiveBg: "bg-white hover:bg-orange-50",
    inactiveText: "text-orange-600",
    border: "border-orange-300",
    cardBg: "bg-orange-50",
    cardBorder: "border-orange-200",
    rowHighlight: "bg-orange-50",
    badgeCls: "bg-orange-100 text-orange-800",
    filter: (dias) => dias >= 1 && dias <= 30,
    diasLabel: (dias) => `${dias}d`,
    diasCls: "text-orange-700 font-bold",
    emptyMsg: "Nenhum medicamento vencendo nos próximos 30 dias.",
  },
  {
    key: "60dias",
    label: "31–60 dias",
    icon: Clock,
    iconColor: "text-yellow-600",
    activeBg: "bg-yellow-500",
    activeText: "text-white",
    inactiveBg: "bg-white hover:bg-yellow-50",
    inactiveText: "text-yellow-700",
    border: "border-yellow-300",
    cardBg: "bg-yellow-50",
    cardBorder: "border-yellow-200",
    rowHighlight: "bg-yellow-50",
    badgeCls: "bg-yellow-100 text-yellow-800",
    filter: (dias) => dias >= 31 && dias <= 60,
    diasLabel: (dias) => `${dias}d`,
    diasCls: "text-yellow-700 font-semibold",
    emptyMsg: "Nenhum medicamento vencendo entre 31 e 60 dias.",
  },
  {
    key: "120dias",
    label: "61–120 dias",
    icon: CheckCircle2,
    iconColor: "text-amber-600",
    activeBg: "bg-amber-500",
    activeText: "text-white",
    inactiveBg: "bg-white hover:bg-amber-50",
    inactiveText: "text-amber-700",
    border: "border-amber-300",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-200",
    rowHighlight: "bg-amber-50",
    badgeCls: "bg-amber-100 text-amber-800",
    filter: (dias) => dias >= 61 && dias <= 120,
    diasLabel: (dias) => `${dias}d`,
    diasCls: "text-amber-700",
    emptyMsg: "Nenhum medicamento vencendo entre 61 e 120 dias.",
  },
];

// ─── Barra de urgência visual ──────────────────────────────────────────────────
function UrgencyBar({ dias }) {
  if (dias < 0) {
    return (
      <div className="w-full h-1.5 rounded-full bg-red-200 overflow-hidden">
        <div className="h-full w-full bg-red-600 rounded-full" />
      </div>
    );
  }
  const max = 120;
  const pct = Math.min(100, Math.max(0, 100 - (dias / max) * 100));
  const barColor =
    dias <= 30 ? "bg-orange-500" : dias <= 60 ? "bg-yellow-400" : "bg-amber-400";
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function Vencimentos() {
  const [abaAtiva, setAbaAtiva] = useState("vencidos");
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");

  const hoje = new Date();

  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ["medicamentos"],
    queryFn: () => db.entities.Medicamento.list(),
  });

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ["lotes"],
    queryFn: () => db.entities.Lote.list(),
  });

  const isLoading = loadingMeds || loadingLotes;

  // Enriquecer lotes com dados do medicamento
  const lotesEnriquecidos = useMemo(() => {
    return lotes
      .filter((l) => {
        if (l.quantidade_atual <= 0) return false;
        if (!l.data_validade) return false;
        const parsedDate = parseISO(l.data_validade);
        if (!isValid(parsedDate)) return false;
        const dias = differenceInDays(parsedDate, hoje);
        return dias < 0 || dias <= 120;
      })
      .map((l) => {
        const med = medicamentos.find((m) => m.id === l.medicamento_id);
        const parsedDate = parseISO(l.data_validade);
        const dias = differenceInDays(parsedDate, hoje);
        return {
          ...l,
          medicamento_nome_display: l.medicamento_nome || med?.nome || "Desconhecido",
          codigo: med?.codigo || "S/C",
          categoria: med?.categoria || "Sem categoria",
          dias,
          validadeFormatada: isValid(parsedDate) ? format(parsedDate, "dd/MM/yyyy", { locale: ptBR }) : "—",
        };
      })
      .sort((a, b) => a.dias - b.dias);
  }, [lotes, medicamentos]);

  // Contadores por aba
  const contadores = useMemo(() => {
    const r = {};
    TABS.forEach((tab) => {
      r[tab.key] = lotesEnriquecidos.filter((l) => tab.filter(l.dias)).length;
    });
    return r;
  }, [lotesEnriquecidos]);

  // Categorias disponíveis
  const categorias = useMemo(() => {
    const s = new Set(lotesEnriquecidos.map((l) => l.categoria));
    return Array.from(s).sort();
  }, [lotesEnriquecidos]);

  // Aba e filtros ativos
  const tabAtual = TABS.find((t) => t.key === abaAtiva);
  const TabIcon = tabAtual?.icon;

  const itensFiltrados = useMemo(() => {
    return lotesEnriquecidos
      .filter((l) => tabAtual?.filter(l.dias))
      .filter((l) => {
        if (filterCategoria !== "all" && l.categoria !== filterCategoria) return false;
        if (search) {
          const s = search.toLowerCase();
          return (
            l.medicamento_nome_display?.toLowerCase().includes(s) ||
            l.numero_lote?.toLowerCase().includes(s) ||
            l.categoria?.toLowerCase().includes(s)
          );
        }
        return true;
      });
  }, [lotesEnriquecidos, tabAtual, search, filterCategoria]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <CalendarX2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Controle de Vencimentos</h1>
              <p className="text-slate-500 text-sm">Medicamentos vencidos ou com vencimento nos próximos 120 dias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = abaAtiva === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setAbaAtiva(tab.key)}
                className={`
                  rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer
                  ${isActive ? `${tab.activeBg} ${tab.activeText} border-transparent shadow-lg scale-[1.02]` : `bg-white ${tab.border} hover:shadow-md`}
                `}
              >
                <div className={`flex items-center gap-2 mb-2`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : tab.iconColor}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-white/80" : "text-slate-500"}`}>
                    {tab.label}
                  </span>
                </div>
                <p className={`text-3xl font-black leading-none ${isActive ? "text-white" : tab.iconColor}`}>
                  {contadores[tab.key]}
                </p>
                <p className={`text-xs mt-1 ${isActive ? "text-white/60" : "text-slate-400"}`}>
                  {contadores[tab.key] === 1 ? "lote" : "lotes"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Legenda de categorias */}
      {!isLoading && categorias.length > 0 && (
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Categorias presentes
          </p>
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => {
              const c = getCategoriaColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategoria(filterCategoria === cat ? "all" : cat)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                    ${filterCategoria === cat ? `${c.bg} ${c.text} ${c.border} shadow-sm scale-105` : `bg-white ${c.border} ${c.text} hover:${c.bg}`}
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {cat}
                </button>
              );
            })}
            {filterCategoria !== "all" && (
              <button
                onClick={() => setFilterCategoria("all")}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                × Limpar filtro
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Busca */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Buscar por medicamento, lote ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Tabela principal */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {/* Cabeçalho da aba ativa */}
        {tabAtual && (
          <div className={`px-6 py-4 ${tabAtual.cardBg} border-b ${tabAtual.cardBorder} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              {TabIcon && <TabIcon className={`w-5 h-5 ${tabAtual.iconColor}`} />}
              <h2 className={`font-bold text-base ${tabAtual.iconColor}`}>
                {tabAtual.label}
                {tabAtual.key === "vencidos" && " — com estoque ativo"}
                {tabAtual.key === "30dias" && " — Crítico"}
                {tabAtual.key === "60dias" && " — Atenção"}
                {tabAtual.key === "120dias" && " — Vigilância preventiva"}
              </h2>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${tabAtual.badgeCls}`}>
              {itensFiltrados.length} {itensFiltrados.length === 1 ? "item" : "itens"}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{tabAtual?.emptyMsg}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicamento</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lote</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Validade</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dias</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd.</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Urgência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensFiltrados.map((lote, idx) => {
                  const catColor = getCategoriaColor(lote.categoria);
                  const isVencido = lote.dias < 0;

                  return (
                    <tr
                      key={lote.id}
                      className={`hover:brightness-[0.97] transition-colors ${isVencido ? "bg-red-50/60" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    >
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {lote.codigo}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 text-sm leading-tight">{lote.medicamento_nome_display}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
                          {lote.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {lote.numero_lote}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-slate-700">
                        {lote.validadeFormatada}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-bold ${tabAtual?.diasCls}`}>
                          {tabAtual?.diasLabel(lote.dias)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold text-sm ${isVencido ? "text-red-700" : "text-slate-700"}`}>
                          {(lote.quantidade_atual || 0).toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <UrgencyBar dias={lote.dias} />
                        <p className="text-[10px] text-center text-slate-400 mt-1">
                          {isVencido ? "VENCIDO" : lote.dias <= 30 ? "CRÍTICO" : lote.dias <= 60 ? "ATENÇÃO" : "VIGILÂNCIA"}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
