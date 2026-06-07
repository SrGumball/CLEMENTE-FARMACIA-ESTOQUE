import { useState, useRef } from "react";
import { db } from "@/api/db";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Boxes, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO, isValid, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeFormatDate, safeParseISO } from "@/utils/dateUtils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Printer, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { invoke } from "@tauri-apps/api/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS = {
  disponivel: "bg-emerald-100 text-emerald-700",
  vencido: "bg-red-100 text-red-700",
  esgotado: "bg-slate-100 text-slate-500",
};

export default function Estoque() {
  const queryClient = useQueryClient();
  const printRef = useRef();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [deleteLoteId, setDeleteLoteId] = useState(null);
  const [deleteMedId, setDeleteMedId] = useState(null);

  const { data: medicamentos = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => db.entities.Medicamento.list(),
  });

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['lotes'],
    queryFn: () => db.entities.Lote.list(),
  });

  const isLoading = loadingMeds || loadingLotes;
  const hoje = new Date();

  // Agrupar lotes por medicamento
  const estoquePorMedicamento = medicamentos
    .filter(m => m.ativo !== false)
    .map(med => {
      const lotesDoMed = lotes
        .filter(l => l.medicamento_id === med.id)
        .map(l => {
          const parsedValidade = safeParseISO(l.data_validade);
          const vencido = parsedValidade ? parsedValidade < hoje : false;
          const diasParaVencer = parsedValidade ? differenceInDays(parsedValidade, hoje) : 999;
          return {
            ...l,
            vencido,
            diasParaVencer,
            statusCalculado: vencido ? "vencido" : l.quantidade_atual <= 0 ? "esgotado" : "disponivel",
          };
        })
        .sort((a, b) => {
          const da = safeParseISO(a.data_validade);
          const db = safeParseISO(b.data_validade);
          if (!da) return 1;
          if (!db) return -1;
          return da - db;
        });

      return {
        ...med,
        lotes: lotesDoMed,
        isVelho: med.created_at && isValid(parseISO(med.created_at)) ? differenceInDays(hoje, parseISO(med.created_at)) > 180 : false,
        temAlerta: (med.estoque_atual || 0) <= (med.estoque_minimo || 0),
        temVencido: lotesDoMed.some(l => l.vencido && l.quantidade_atual > 0),
        temProximoVencer: lotesDoMed.some(l => !l.vencido && l.diasParaVencer <= 30 && l.quantidade_atual > 0),
      };
    });

  const filteredEstoque = estoquePorMedicamento.filter(med => {
    const matchSearch =
      med.nome?.toLowerCase().includes(search.toLowerCase()) ||
      med.principio_ativo?.toLowerCase().includes(search.toLowerCase());

    if (filterStatus === "all") return matchSearch;
    if (filterStatus === "baixo") return matchSearch && med.temAlerta;
    if (filterStatus === "vencido") return matchSearch && med.temVencido;
    if (filterStatus === "proximo_vencer") return matchSearch && med.temProximoVencer;
    return matchSearch;
  }).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  const handleExportCSV = () => {
    try {
      const headers = ["Medicamento", "Dosagem", "Lote", "Validade", "Quantidade", "Status"];
      const rows = [];

      filteredEstoque.forEach(med => {
        if (med.lotes.length === 0) {
          rows.push([
            med.nome,
            med.unidade_medida || "-",
            "Sem Lote",
            "-",
            med.estoque_atual || 0,
            med.temAlerta ? "Estoque Baixo" : "OK"
          ]);
        } else {
          med.lotes.forEach(lote => {
            rows.push([
              med.nome,
              med.unidade_medida || "-",
              lote.numero_lote,
              safeFormatDate(lote.data_validade),
              lote.quantidade_atual,
              lote.statusCalculado === "disponivel" ? "Disponivel" : lote.statusCalculado === "vencido" ? "Vencido" : "Esgotado"
            ]);
          });
        }
      });

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `estoque-${format(hoje, "dd-MM-yyyy")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar CSV");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteLote = async () => {
    if (!deleteLoteId) return;
    try {
      toast.loading("Excluindo lote...");
      await invoke("delete_lote_cascade", { loteId: deleteLoteId });
      toast.dismiss();
      toast.success("Lote excluído com sucesso.");
      queryClient.invalidateQueries();
    } catch (error) {
      toast.dismiss();
      toast.error(`Erro: ${error}`);
    } finally {
      setDeleteLoteId(null);
    }
  };

  const handleDeleteMedicamento = async () => {
    if (!deleteMedId) return;
    try {
      toast.loading("Excluindo medicamento...");
      await invoke("delete_medicamento_cascade", { medicamentoId: deleteMedId });
      toast.dismiss();
      toast.success("Medicamento excluído com sucesso.");
      queryClient.invalidateQueries();
    } catch (error) {
      toast.dismiss();
      toast.error(`Erro: ${error}`);
    } finally {
      setDeleteMedId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Estoque</h1>
          <p className="text-slate-500 text-sm">Visualização detalhada por lote e validade</p>
        </div>
        <div className="flex gap-2 no-print">
          <AlertDialog open={!!deleteLoteId} onOpenChange={(open) => !open && setDeleteLoteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Lote Permamentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso fará com que toda a rastreabilidade deste lote (entradas, saídas e empréstimos) seja apagada. Deseja prosseguir?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLote} className="bg-red-600 hover:bg-red-700 text-white border-0">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!deleteMedId} onOpenChange={(open) => !open && setDeleteMedId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Medicamento Permamentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este medicamento, seus lotes, e toda sua história serão permanentemente excluídos. Certeza?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMedicamento} className="bg-red-600 hover:bg-red-700 text-white border-0">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleExportCSV} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-red-600 hover:bg-red-700 text-white border-0">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou princípio ativo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="baixo">Estoque Baixo</SelectItem>
              <SelectItem value="vencido">Com Vencidos</SelectItem>
              <SelectItem value="proximo_vencer">Próximos a Vencer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Estoque List */}
      <Card className="border-0 shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredEstoque.length === 0 ? (
          <div className="text-center py-12">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum medicamento encontrado</p>
          </div>
        ) : (
          <Accordion type="multiple" className="divide-y">
            {filteredEstoque.map((med) => (
              <AccordionItem key={med.id} value={med.id} className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-3">
                      <div className="text-left flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit font-mono text-[10px] uppercase">
                          {med.codigo || "S/C"}
                        </Badge>
                        <p className="font-medium text-slate-800">{med.nome}</p>
                        {med.unidade_medida && (
                          <p className="text-xs text-slate-500">{med.unidade_medida}</p>
                        )}
                      </div>
                      {med.temVencido && (
                        <Badge className="bg-red-100 text-red-700 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Vencido
                        </Badge>
                      )}
                      {med.temProximoVencer && !med.temVencido && (
                        <Badge className="bg-amber-100 text-amber-700 gap-1">
                          <Clock className="w-3 h-3" />
                          Vencendo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Estoque Total</p>
                        <Badge
                          className={
                            med.temAlerta
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }
                        >
                          {med.estoque_atual || 0} unidades
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Lotes</p>
                        <p className="font-medium">{med.lotes.length}</p>
                      </div>
                      {(!med.estoque_atual || med.estoque_atual <= 0) && med.lotes.length === 0 && (
                        <div className="ml-2 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors pointer-events-auto z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteMedId(med.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  {med.lotes.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">Nenhum lote cadastrado</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Lote</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead className="text-center">Quantidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {med.lotes.map((lote) => (
                          <TableRow key={lote.id}>
                            <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {safeFormatDate(lote.data_validade)}
                                {!lote.vencido && lote.diasParaVencer <= 30 && lote.quantidade_atual > 0 && (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    {lote.diasParaVencer} dias
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {lote.quantidade_atual || 0}
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[lote.statusCalculado]}>
                                {lote.statusCalculado === "disponivel" ? "Disponível" :
                                  lote.statusCalculado === "vencido" ? "Vencido" : "Esgotado"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(lote.quantidade_atual <= 0 || lote.vencido) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteLoteId(lote.id);
                                  }}
                                  title="Apagar lote zerado ou vencido"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>

      {/* ÁREA DE IMPRESSÃO - Relatório Detalhado */}
      <div className="hidden print-only mt-0" ref={printRef}>
        <div className="text-center mb-8 pb-6 border-b-2 border-indigo-600">
          <div className="flex justify-between items-center mb-4">
            <div className="text-left">
              <p className="text-indigo-600 font-bold text-xl uppercase tracking-tight">FARMÁCIA CLEMENTE FERREIRA</p>
              <p className="text-slate-500 text-xs">Sistema de Controle Farmacêutico</p>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono">
              <p>Gerado em:</p>
              <p>{format(hoje, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1 uppercase tracking-widest">Relatório Detalhado de Estoque</h1>
          <p className="text-slate-500 text-sm font-medium">Posição por Lote e Validade</p>
        </div>

        <Table className="border-collapse border border-slate-200">
          <TableHeader>
            <TableRow className="bg-slate-100 border-b-2 border-slate-300">
              <TableHead className="text-indigo-700 font-bold text-xs uppercase p-2 border border-slate-200">Cód.</TableHead>
              <TableHead className="text-indigo-700 font-bold text-xs uppercase p-2 border border-slate-200">Medicamento</TableHead>
              <TableHead className="text-indigo-700 font-bold text-xs uppercase p-2 border border-slate-200">Lote</TableHead>
              <TableHead className="text-indigo-700 font-bold text-xs uppercase p-2 border border-slate-200">Validade</TableHead>
              <TableHead className="text-indigo-700 font-bold text-xs uppercase p-2 border border-slate-200 text-center">Quant.</TableHead>
              <TableHead className="text-indigo-700 font-bold text-xs uppercase p-2 border border-slate-200">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEstoque.flatMap(med =>
              med.lotes.length > 0 ? med.lotes.map(lote => (
                <TableRow key={lote.id} className="border-b border-slate-200">
                  <TableCell className="p-2 border border-slate-200 font-mono text-[10px]">{med.codigo || "S/C"}</TableCell>
                  <TableCell className="p-2 border border-slate-200">
                    <p className="font-semibold text-xs">{med.nome}</p>
                    {med.unidade_medida && <p className="text-[10px] text-slate-500">{med.unidade_medida}</p>}
                  </TableCell>
                  <TableCell className="p-2 border border-slate-200 text-xs">{lote.numero_lote}</TableCell>
                  <TableCell className="p-2 border border-slate-200 text-xs">
                    {safeFormatDate(lote.data_validade)}
                  </TableCell>
                  <TableCell className="p-2 border border-slate-200 text-center font-bold text-xs">
                    {lote.quantidade_atual}
                  </TableCell>
                  <TableCell className="p-2 border border-slate-200 text-[10px] uppercase font-medium">
                    {lote.statusCalculado === "disponivel" ? "Disponível" :
                      lote.statusCalculado === "vencido" ? "Vencido" : "Esgotado"}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow key={`no-lote-${med.id}`} className="border-b border-slate-200">
                  <TableCell className="p-2 border border-slate-200 font-mono text-[10px]">{med.codigo || "S/C"}</TableCell>
                  <TableCell className="p-2 border border-slate-200">
                    <p className="font-semibold text-xs">{med.nome}</p>
                    {med.unidade_medida && <p className="text-[10px] text-slate-500">{med.unidade_medida}</p>}
                  </TableCell>
                  <TableCell className="p-2 border border-slate-200 text-xs italic text-slate-400">Sem Lote</TableCell>
                  <TableCell className="p-2 border border-slate-200 text-xs">-</TableCell>
                  <TableCell className="p-2 border border-slate-200 text-center font-bold text-xs">{med.estoque_atual || 0}</TableCell>
                  <TableCell className="p-2 border border-slate-200 text-[10px] uppercase font-medium">
                    {med.temAlerta ? "Estoque Baixo" : "OK"}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            background-color: white !important;
          }
          .no-print, nav, header, footer, button, [data-state="closed"], [data-state="open"], aside { display: none !important; }
          .print-only { display: block !important; }
          .p-6 { padding: 0 !important; }
          
          .border-b-2.border-indigo-600 {
            border-bottom-color: #4f46e5 !important;
            border-bottom-width: 2px !important;
          }
          
          .text-indigo-600 { color: #4f46e5 !important; }
          .text-indigo-700 { color: #4338ca !important; }
          
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
        }
      `}</style>
    </div>
  );
}
