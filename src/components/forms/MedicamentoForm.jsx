import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIAS = [
    "Analgésico",
    "Antitérmico",
    "Anti-inflamatório",
    "Antibiótico",
    "Antialérgico",
    "Antihipertensivo",
    "Antidiabético",
    "Controlado",
    "Psicotrópico",
    "Hormônio"
];

const APRESENTACOES = [
    "Comprimido",
    "Cápsula",
    "Gotas",
    "Xarope",
    "Injetável",
    "Pomada",
    "Creme",
    "Spray",
    "Supositório",
    "Envelope",
    "Shampoo",
    "Ampola",
    "Tubo",
    "Frasco",
    "Seringa",
    "Sachê"
];

const CATEGORIA_MAP = {
    "Analgésico": "analgesico",
    "Antitérmico": "antitermico",
    "Anti-inflamatório": "anti_inflamatorio",
    "Antibiótico": "antibiotico",
    "Antialérgico": "antialergico",
    "Antihipertensivo": "antihipertensivo",
    "Antidiabético": "antidiabetico",
    "Controlado": "controlado",
    "Psicotrópico": "psicotropico",
    "Hormônio": "hormonio"
};

const APRESENTACAO_MAP = {
    "Comprimido": "comprimido",
    "Cápsula": "capsula",
    "Gotas": "gotas",
    "Xarope": "xarope",
    "Injetável": "injetavel",
    "Pomada": "pomada",
    "Creme": "creme",
    "Spray": "spray",
    "Supositório": "supositorio",
    "Envelope": "envelope",
    "Shampoo": "shampoo",
    "Ampola": "ampola",
    "Tubo": "tubo",
    "Frasco": "frasco",
    "Seringa": "seringa",
    "Sachê": "sache"
};

// Inversa para preencher o select
const CATEGORIA_MAP_INV = Object.fromEntries(Object.entries(CATEGORIA_MAP).map(([k, v]) => [v, k]));
const APRESENTACAO_MAP_INV = Object.fromEntries(Object.entries(APRESENTACAO_MAP).map(([k, v]) => [v, k]));

export default function MedicamentoForm({ open, onClose, onSave, medicamento, isLoading }) {
    const [form, setForm] = useState({
        nome: "", codigo: "", principio_ativo: "", categoria: "", apresentacao: "",
        unidade_medida: "", estoque_minimo: 0, localizacao: "", observacoes: "",
    });

    useEffect(() => {
        if (medicamento) {
            setForm({
                nome: medicamento.nome || "",
                codigo: medicamento.codigo || "",
                principio_ativo: medicamento.principio_ativo || "",
                categoria: medicamento.categoria || "",
                apresentacao: medicamento.apresentacao || "",
                unidade_medida: medicamento.unidade_medida || "",
                estoque_minimo: medicamento.estoque_minimo || 0,
                localizacao: medicamento.localizacao || "",
                observacoes: medicamento.observacoes || "",
            });
        } else {
            setForm({ nome: "", codigo: "", principio_ativo: "", categoria: "", apresentacao: "", unidade_medida: "", estoque_minimo: 0, localizacao: "", observacoes: "" });
        }
    }, [medicamento, open]);

    const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });
    const handleSelectChange = (field) => (value) => setForm({ ...form, [field]: value });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!form.nome) {
            toast.error("O nome do medicamento é obrigatório");
            return;
        }
        if (!form.categoria) {
            toast.error("Selecione uma categoria");
            return;
        }
        if (!form.apresentacao) {
            toast.error("Selecione a forma farmacêutica");
            return;
        }

        onSave(form);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{medicamento ? "Editar Medicamento" : "Novo Medicamento"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Nome</Label>
                            <Input value={form.nome} onChange={handleChange("nome")} required />
                        </div>
                        <div>
                            <Label>Código (ID)</Label>
                            <Input value={form.codigo} onChange={handleChange("codigo")} placeholder="Ex: MED001" />
                        </div>
                        <div>
                            <Label>Princípio Ativo</Label>
                            <Input value={form.principio_ativo} onChange={handleChange("principio_ativo")} />
                        </div>
                        <div>
                            <Label>Categoria</Label>
                            <Select
                                value={CATEGORIA_MAP_INV[form.categoria] || form.categoria}
                                onValueChange={(val) => handleSelectChange("categoria")(CATEGORIA_MAP[val] || val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIAS.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Forma Farmacêutica</Label>
                            <Select
                                value={APRESENTACAO_MAP_INV[form.apresentacao] || form.apresentacao}
                                onValueChange={(val) => handleSelectChange("apresentacao")(APRESENTACAO_MAP[val] || val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {APRESENTACOES.map(apr => (
                                        <SelectItem key={apr} value={apr}>{apr}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>DOSAGEM</Label>
                            <Input value={form.unidade_medida} onChange={handleChange("unidade_medida")} placeholder="Ex: mg, ml, un" />
                        </div>
                        <div>
                            <Label>Estoque Mínimo</Label>
                            <Input type="number" value={form.estoque_minimo} onChange={handleChange("estoque_minimo")} />
                        </div>
                    </div>
                    <div>
                        <Label>Localização</Label>
                        <Input value={form.localizacao} onChange={handleChange("localizacao")} placeholder="Prateleira, Armário, etc" />
                    </div>
                    <div>
                        <Label>Observações</Label>
                        <Input value={form.observacoes} onChange={handleChange("observacoes")} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
