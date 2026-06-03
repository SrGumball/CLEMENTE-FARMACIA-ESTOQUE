import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxMedicamento } from "@/components/ui/combobox-medicamento";
import { AlertTriangle, PackageMinus } from "lucide-react";
import { toast } from "sonner";

const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = {
    medicamento_id: "",
    medicamento_nome: "",
    lote_id: "",
    numero_lote: "",
    quantidade: "",
    ala_id: "",
    ala_nome: "",
    data_saida: getLocalDateString(),
    motivo: "",
    observacao: "",
};

export default function SaidaForm({ open, onClose, onSave, initialData = null, medicamentos = [], lotes = [], alas = [], isLoading }) {
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setForm({
                    ...initialData,
                    ala_id: initialData.ala_id || "",
                });
            } else {
                setForm(emptyForm);
            }
        }
    }, [open, initialData]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleMedicamento = (id) => {
        const med = medicamentos.find((m) => m.id === id);
        setForm((prev) => ({
            ...prev,
            medicamento_id: id,
            medicamento_nome: med?.nome || "",
            lote_id: "", // Reset lot when medication changes
            numero_lote: ""
        }));
    };

    const handleLote = (id) => {
        const lote = lotes.find((l) => l.id === id);
        setForm((prev) => ({
            ...prev,
            lote_id: id,
            numero_lote: lote?.numero_lote || ""
        }));
    };

    const handleAla = (id) => {
        if (id === "__none__") {
            setForm((prev) => ({ ...prev, ala_id: "", ala_nome: "" }));
            return;
        }
        const ala = alas.find((a) => a.id === id);
        setForm((prev) => ({ ...prev, ala_id: id, ala_nome: ala?.nome || "" }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!form.medicamento_id) {
            toast.error("Selecione um medicamento");
            return;
        }
        if (!form.lote_id) {
            toast.error("Selecione um lote disponível");
            return;
        }
        if (!form.quantidade || Number(form.quantidade) <= 0) {
            toast.error("Informe uma quantidade válida");
            return;
        }

        const selectedLote = lotes.find(l => l.id === form.lote_id);
        if (selectedLote && Number(form.quantidade) > (selectedLote.quantidade_atual || 0)) {
            toast.error("Quantidade excede o estoque disponível no lote");
            return;
        }

        onSave({
            ...form,
            quantidade: Number(form.quantidade),
            ala_id: form.ala_id || null, // Garantir NULL para FK opcional
        });
    };

    const filteredLotes = lotes.filter(l => 
        l.medicamento_id === form.medicamento_id && 
        ((l.quantidade_atual || 0) > 0 || l.id === form.lote_id)
    );
    const currentLote = lotes.find(l => l.id === form.lote_id);
    const stockExceeded = currentLote && Number(form.quantidade) > (currentLote.quantidade_atual || 0);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageMinus className="w-5 h-5 text-red-500" />
                        {initialData ? "Editar Saída de Medicamento" : "Nova Saída de Medicamento"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Medicamento */}
                    <div>
                        <Label htmlFor="med-select">Medicamento <span className="text-red-500">*</span></Label>
                        <ComboboxMedicamento
                            medicamentos={medicamentos}
                            value={form.medicamento_id}
                            onChange={handleMedicamento}
                        />
                    </div>

                    {/* Lote */}
                    <div>
                        <Label htmlFor="lote-select">Lote <span className="text-red-500">*</span></Label>
                        <Select
                            value={form.lote_id}
                            onValueChange={handleLote}
                            disabled={!form.medicamento_id || filteredLotes.length === 0}
                        >
                            <SelectTrigger id="lote-select">
                                <SelectValue placeholder={
                                    !form.medicamento_id ? "Selecione um medicamento primeiro" :
                                        filteredLotes.length === 0 ? "Sem lotes disponíveis" : "Selecione o lote..."
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredLotes.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                        {l.numero_lote} (Stock: {l.quantidade_atual}) - Val: {l.data_validade}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {currentLote && (
                            <p className="text-xs text-slate-500 mt-1">
                                Estoque disponível neste lote: <span className="font-bold">{currentLote.quantidade_atual}</span>
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quantidade */}
                        <div>
                            <Label htmlFor="quantidade">Quantidade <span className="text-red-500">*</span></Label>
                            <Input
                                id="quantidade"
                                type="number"
                                min="1"
                                max={currentLote?.quantidade_atual}
                                placeholder="0"
                                value={form.quantidade}
                                onChange={handleChange("quantidade")}
                                required
                                className={stockExceeded ? "border-red-500 focus-visible:ring-red-400" : ""}
                            />
                            {stockExceeded && (
                                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Quantidade excede o estoque!
                                </p>
                            )}
                        </div>

                        {/* Data de Saída */}
                        <div>
                            <Label htmlFor="data-saida">Data de Saída</Label>
                            <Input
                                id="data-saida"
                                type="date"
                                value={form.data_saida}
                                onChange={handleChange("data_saida")}
                                required
                            />
                        </div>
                    </div>

                    {/* Ala / Destino */}
                    <div>
                        <Label htmlFor="ala-select">Ala / Setor de Destino</Label>
                        <Select value={form.ala_id || "__none__"} onValueChange={handleAla}>
                            <SelectTrigger id="ala-select">
                                <SelectValue placeholder="Selecione o destino..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">— Nenhum / Retirada Geral —</SelectItem>
                                {alas.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Motivo */}
                    <div>
                        <Label htmlFor="motivo">Motivo da Saída</Label>
                        <Input
                            id="motivo"
                            placeholder="Ex: Prescrição Médica, Vencimento..."
                            value={form.motivo}
                            onChange={handleChange("motivo")}
                        />
                    </div>

                    {/* Observação */}
                    <div>
                        <Label htmlFor="observacao">Observação</Label>
                        <Input
                            id="observacao"
                            placeholder="Opcional"
                            value={form.observacao}
                            onChange={handleChange("observacao")}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading ? "Salvando..." : "Confirmar Saída"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
