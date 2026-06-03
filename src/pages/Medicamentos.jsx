import { useState } from "react";
import { db } from "@/api/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Package, Printer, Settings2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MedicamentoForm from "@/components/forms/MedicamentoForm";

const CATEGORIA_LABELS = {
  analgesico: "Analgésico",
  antitermico: "Antitérmico",
  anti_inflamatorio: "Anti-inflamatório",
  antibiotico: "Antibiótico",
  antialergico: "Antialérgico",
  antihipertensivo: "Antihipertensivo",
  antidiabetico: "Antidiabético",
  controlado: "Controlado",
  psicotropico: "Psicotrópico",
  hormonio: "Hormônio",
};

const APRESENTACAO_LABELS = {
  comprimido: "Comprimido",
  capsula: "Cápsula",
  gotas: "Gotas",
  xarope: "Xarope",
  injetavel: "Injetável",
  pomada: "Pomada",
  creme: "Creme",
  spray: "Spray",
  supositorio: "Supositório",
  envelope: "Envelope",
  shampoo: "Shampoo",
  ampola: "Ampola",
  tubo: "Tubo",
  frasco: "Frasco",
  seringa: "Seringa",
  sache: "Sachê",
};

export default function Medicamentos() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    codigo: true,
    medicamento: true,
    categoria: true,
    apresentacao: true,
    dosagem: true,
    estoque: true,
    acoes: true
  });

  const queryClient = useQueryClient();

  const { data: medicamentos = [], isLoading } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: () => db.entities.Medicamento.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Medicamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      setFormOpen(false);
      toast.success("Medicamento cadastrado com sucesso!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Medicamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      setFormOpen(false);
      setEditingMed(null);
      toast.success("Medicamento atualizado com sucesso!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Medicamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicamentos'] });
      toast.success("Medicamento excluído com sucesso!");
    },
  });

  const handleSave = (data) => {
    if (editingMed) {
      updateMutation.mutate({ id: editingMed.id, data });
    } else {
      createMutation.mutate({ ...data, estoque_atual: 0 });
    }
  };

  const handleEdit = (med) => {
    setEditingMed(med);
    setFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir este medicamento?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredMeds = medicamentos.filter(m =>
    m.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.principio_ativo?.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo_barras?.includes(search)
  ).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  return (
    <div className="p-6 space-y-4 h-[calc(100vh)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Medicamentos</h1>
          <p className="text-slate-500 text-sm">Cadastro e gerenciamento de medicamentos</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white border-0 gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Lista
          </Button>
          <Button onClick={() => { setEditingMed(null); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Medicamento
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <Settings2 className="w-4 h-4 mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.keys(visibleColumns).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  className="capitalize"
                  checked={visibleColumns[col]}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({ ...prev, [col]: checked }))
                  }
                >
                  {col === "codigo" ? "Cód." :
                    col === "apresentacao" ? "Apresentação" :
                      col === "acoes" ? "Ações" : col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, princípio ativo ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm relative h-[calc(100vh-280px)]">
        <Table className="min-w-[1000px] w-full" containerClassName="absolute inset-0 border-0">
          <TableHeader className="sticky top-0 z-20 shadow-sm bg-white">
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {visibleColumns.codigo && <TableHead className="w-24">Código</TableHead>}
              {visibleColumns.medicamento && <TableHead>Medicamento</TableHead>}
              {visibleColumns.categoria && <TableHead>Categoria</TableHead>}
              {visibleColumns.apresentacao && <TableHead>Apresentação</TableHead>}
              {visibleColumns.dosagem && <TableHead>Dosagem</TableHead>}
              {visibleColumns.estoque && <TableHead className="text-center">Estoque</TableHead>}
              {visibleColumns.acoes && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredMeds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhum medicamento encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredMeds.map((med) => (
                <TableRow key={med.id} className="hover:bg-slate-50/50">
                  {visibleColumns.codigo && (
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {med.codigo || "S/C"}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.medicamento && (
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">{med.nome}</p>
                        {med.principio_ativo && (
                          <p className="text-xs text-slate-500">{med.principio_ativo}</p>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.categoria && (
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORIA_LABELS[med.categoria] || med.categoria}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.apresentacao && (
                    <TableCell className="text-slate-600">
                      {APRESENTACAO_LABELS[med.apresentacao] || med.apresentacao}
                    </TableCell>
                  )}
                  {visibleColumns.dosagem && (
                    <TableCell className="text-slate-600">{med.unidade_medida || "-"}</TableCell>
                  )}
                  {visibleColumns.estoque && (
                    <TableCell className="text-center">
                      <Badge
                        className={
                          (med.estoque_atual || 0) <= (med.estoque_minimo || 0)
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {med.estoque_atual || 0}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.acoes && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(med)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(med.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <MedicamentoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        medicamento={editingMed}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* ÁREA DE IMPRESSÃO */}
      <div id="print-area" className="hidden print-only mt-8">
        <div className="text-center mb-8 pb-6 border-b-2 border-blue-600">
          <div className="flex justify-between items-center mb-4">
            <div className="text-left">
              <p className="text-blue-600 font-bold text-xl uppercase tracking-tight">FARMÁCIA CLEMENTE FERREIRA</p>
              <p className="text-slate-500 text-xs">Sistema de Controle Farmacêutico</p>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono">
              <p>Gerado em:</p>
              <p>{format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1 uppercase tracking-widest">Catálogo de Medicamentos</h1>
          <p className="text-slate-500 text-sm font-medium">Listagem Geral de Itens Cadastrados</p>
        </div>

        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-blue-600 py-2 px-3 text-xs font-semibold text-left w-20">Cód.</th>
              <th className="border border-blue-600 py-2 px-3 text-xs font-semibold text-left">Nome / Princípio Ativo</th>
              <th className="border border-blue-600 py-2 px-3 text-xs font-semibold text-left">Categoria</th>
              <th className="border border-blue-600 py-2 px-3 text-xs font-semibold text-left">Apres. / Dosagem</th>
              <th className="border border-blue-600 py-2 px-3 text-xs font-semibold text-center">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeds.map((med, idx) => (
              <tr key={med.id} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                <td className="border border-slate-200 py-2 px-3 text-[10px] font-mono whitespace-nowrap">
                  {med.codigo || "S/C"}
                </td>
                <td className="border border-slate-200 py-2 px-3 text-sm">
                  <p className="font-bold">{med.nome}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{med.principio_ativo || ""}</p>
                </td>
                <td className="border border-slate-200 py-2 px-3 text-xs">
                  {CATEGORIA_LABELS[med.categoria] || med.categoria}
                </td>
                <td className="border border-slate-200 py-2 px-3 text-xs">
                  {APRESENTACAO_LABELS[med.apresentacao] || med.apresentacao} - {med.unidade_medida || ""}
                </td>
                <td className="border border-slate-200 py-2 px-3 text-center font-bold text-blue-700 text-sm">
                  {med.estoque_atual || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            background-color: white !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }
          
          .no-print, nav, header, footer, button, [role="combobox"], [role="menu"] { display: none !important; }
          .print-only { display: block !important; }
          .p-6 { padding: 0 !important; }
          
          .bg-white { border: none !important; padding: 0 !important; }
          
          table { 
            width: 100% !important;
            page-break-inside: auto;
            border-collapse: collapse !important;
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          
          h1, h2, h3 { 
            page-break-after: avoid; 
            color: black !important;
          }
          
          .border-b-2.border-blue-600 {
            border-bottom-color: #2563eb !important;
            border-bottom-width: 2px !important;
          }
          
          .bg-blue-600 { background-color: #2563eb !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .text-blue-700 { color: #1d4ed8 !important; }
        }
      `}</style>
    </div>
  );
}
