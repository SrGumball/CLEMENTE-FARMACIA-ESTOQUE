import { Card } from "@/components/ui/card";

export default function MovimentacaoChart({ data = [] }) {
    const maxValue = Math.max(...data.flatMap(d => [d.entradas || 0, d.saidas || 0]), 1);

    return (
        <Card className="p-6 border-0 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Movimentações (últimos 6 meses)</h3>
            <div className="flex items-end gap-2 h-48">
                {data.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex gap-1 items-end w-full h-40">
                            <div
                                className="flex-1 bg-blue-400 rounded-t-sm"
                                style={{ height: `${(item.entradas / maxValue) * 100}%`, minHeight: item.entradas ? "4px" : "0" }}
                                title={`Entradas: ${item.entradas}`}
                            />
                            <div
                                className="flex-1 bg-amber-400 rounded-t-sm"
                                style={{ height: `${(item.saidas / maxValue) * 100}%`, minHeight: item.saidas ? "4px" : "0" }}
                                title={`Saídas: ${item.saidas}`}
                            />
                        </div>
                        <span className="text-xs text-slate-500 capitalize">{item.mes}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-3 h-3 bg-blue-400 rounded-sm" /> Entradas
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-3 h-3 bg-amber-400 rounded-sm" /> Saídas
                </div>
            </div>
        </Card>
    );
}
