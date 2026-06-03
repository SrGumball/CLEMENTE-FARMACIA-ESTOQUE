import { useState, useEffect } from "react";
import { db } from "@/api/db";
import { useQuery } from "@tanstack/react-query";
import { Package, TrendingUp, TrendingDown, AlertTriangle, Clock, Boxes } from "lucide-react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {  format, subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import StatsCard from "@/components/dashboard/StatsCard";
import AlertCard from "@/components/dashboard/AlertCard";
import MovimentacaoChart from "@/components/dashboard/MovimentacaoChart";
import CategoriaChart from "@/components/dashboard/CategoriaChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => db.entities.Medicamento.list(),
  });

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['lotes'],
    queryFn: () => db.entities.Lote.list(),
  });

  const { data: entradas = [], isLoading: loadingEntradas } = useQuery({
    queryKey: ['entradas'],
    queryFn: () => db.entities.Entrada.list(),
  });

  const { data: saidas = [], isLoading: loadingSaidas } = useQuery({
    queryKey: ['saidas'],
    queryFn: () => db.entities.Saida.list(),
  });

  const isLoading = loadingMeds || loadingLotes || loadingEntradas || loadingSaidas;

  // Calcular estatísticas
  const totalMedicamentos = medicamentos.length;
  const totalEstoque = medicamentos.reduce((sum, m) => sum + (m.estoque_atual || 0), 0);

  // Medicamentos com estoque baixo
  const estoqueBaixo = medicamentos
    .filter(m => m.estoque_atual <= (m.estoque_minimo || 0) && m.ativo !== false)
    .map(m => ({
      nome: m.nome,
      atual: m.estoque_atual || 0,
      minimo: m.estoque_minimo || 0,
    }));

  // Lotes próximos do vencimento (60 dias)
  const hoje = new Date();
  const proximosVencer = lotes
    .filter(l => {
      if (l.quantidade_atual <= 0) return false;
      if (!l.data_validade) return false;
      const dataVenc = parseISO(l.data_validade);
      if (!isValid(dataVenc)) return false;
      const diasParaVencer = differenceInDays(dataVenc, hoje);
      // Entre 1 e 60 dias
      return diasParaVencer > 0 && diasParaVencer <= 60;
    })
    .map(l => ({
      nome: l.medicamento_nome,
      lote: l.numero_lote,
      validade: l.data_validade,
    }));

  // Lotes vencidos
  const vencidos = lotes
    .filter(l => {
      if (l.quantidade_atual <= 0) return false;
      if (!l.data_validade) return false;
      const dataVenc = parseISO(l.data_validade);
      if (!isValid(dataVenc)) return false;
      return dataVenc < hoje;
    })
    .map(l => ({
      nome: l.medicamento_nome,
      lote: l.numero_lote,
      validade: l.data_validade,
    }));

  // Dados para gráfico de movimentação (últimos 6 meses)
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const mesData = subMonths(hoje, i);
    const inicio = startOfMonth(mesData);
    const fim = endOfMonth(mesData);

    const entradasMes = entradas.filter(e => {
      if (!e.data_entrada) return false;
      const data = parseISO(e.data_entrada);
      return isValid(data) && data >= inicio && data <= fim;
    }).reduce((sum, e) => sum + (e.quantidade || 0), 0);

    const saidasMes = saidas.filter(s => {
      if (!s.data_saida) return false;
      const data = parseISO(s.data_saida);
      return isValid(data) && data >= inicio && data <= fim;
    }).reduce((sum, s) => sum + (s.quantidade || 0), 0);

    chartData.push({
      mes: format(mesData, "MMM", { locale: ptBR }),
      entradas: entradasMes,
      saidas: saidasMes,
    });
  }

  // Dados para gráfico de categorias
  const categoriaData = [];
  const categoriasContadas = {};
  medicamentos.forEach(m => {
    if (m.categoria) {
      categoriasContadas[m.categoria] = (categoriasContadas[m.categoria] || 0) + (m.estoque_atual || 0);
    }
  });
  Object.entries(categoriasContadas).forEach(([categoria, value]) => {
    if (value > 0) {
      categoriaData.push({ categoria, value });
    }
  });

  // Total entradas do mês
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  const entradasMesAtual = entradas
    .filter(e => {
      if (!e.data_entrada) return false;
      const data = parseISO(e.data_entrada);
      return isValid(data) && data >= inicioMes && data <= fimMes;
    })
    .reduce((sum, e) => sum + (e.quantidade || 0), 0);

  const saidasMesAtual = saidas
    .filter(s => {
      if (!s.data_saida) return false;
      const data = parseISO(s.data_saida);
      return isValid(data) && data >= inicioMes && data <= fimMes;
    })
    .reduce((sum, s) => sum + (s.quantidade || 0), 0);

  const { data: config = [] } = useQuery({
    queryKey: ["config"],
    queryFn: () => db.entities.Config.list(),
  });

  useEffect(() => {
    const lastBackup = config.find(c => c.key === "last_backup_date")?.value;
    if (lastBackup) {
      const parsedLastBackup = new Date(lastBackup);
      if (isValid(parsedLastBackup)) {
        const diff = differenceInDays(new Date(), parsedLastBackup);
        if (diff >= 15) {
          toast.warning(`Você não realiza um backup há ${diff} dias. Recomenda-se fazer um agora!`, {
            duration: 10000
          });
        }
      }
    } else if (!isLoading) {
      toast.info("Nenhum backup realizado ainda. Proteja seus dados!");
    }
  }, [config, isLoading]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 text-sm">Visão geral do estoque da farmácia</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Medicamentos"
          value={totalMedicamentos}
          subtitle="Produtos cadastrados"
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Unidades em Estoque"
          value={totalEstoque.toLocaleString('pt-BR')}
          subtitle="Total de itens"
          icon={Boxes}
          color="purple"
        />
        <StatsCard
          title="Entradas do Mês"
          value={entradasMesAtual.toLocaleString('pt-BR')}
          subtitle={format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Saídas do Mês"
          value={saidasMesAtual.toLocaleString('pt-BR')}
          subtitle={format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
          icon={TrendingDown}
          color="amber"
        />
      </div>

      {/* Alertas */}
      {(estoqueBaixo.length > 0 || proximosVencer.length > 0 || vencidos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AlertCard type="vencidos" items={vencidos} />
          <AlertCard type="vencimento" items={proximosVencer} />
          <AlertCard type="estoque_baixo" items={estoqueBaixo} />
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MovimentacaoChart data={chartData} />
        <CategoriaChart data={categoriaData} />
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-500 text-sm font-medium">
          Desenvolvido por <span
            className="text-indigo-600 font-semibold cursor-pointer hover:underline"
            onClick={() => openUrl('https://github.com/SrGumball/')}
          >
            Alef De Araujo Dias
          </span>
        </p>
      </div>
    </div>
  );
}
