import { parseISO, isValid, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

const alertConfig = {
    vencidos: {
        title: "Medicamentos Vencidos",
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
    },
    vencimento: {
        title: "Próximos ao Vencimento (4 meses)",
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
    },
    estoque_baixo: {
        title: "Estoque Baixo",
        icon: AlertTriangle,
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
    },
};

export default function AlertCard({ type, items = [] }) {
    const config = alertConfig[type] || alertConfig.estoque_baixo;
    const Icon = config.icon;

    const getDaysColor = (days) => {
        if (days < 0) return "text-red-700 bg-red-100";
        if (days <= 30) return "text-red-600 bg-red-50 border border-red-200";
        if (days <= 60) return "text-orange-600 bg-orange-50 border border-orange-200";
        return "text-amber-600 bg-amber-50 border border-amber-200";
    };

    if (items.length === 0) {
        return (
            <Card className={`p-4 border ${config.border} ${config.bg} shadow-sm`}>
                <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <h3 className={`font-semibold text-sm ${config.color}`}>{config.title}</h3>
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>0</span>
                </div>
                <p className="text-sm text-slate-400">Nenhum item encontrado.</p>
            </Card>
        );
    }

    return (
        <Card className={`p-4 border ${config.border} ${config.bg} shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <h3 className={`font-semibold text-sm ${config.color}`}>{config.title}</h3>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {items.length}
                </span>
            </div>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
                {items.slice(0, 5).map((item, i) => {
                    const validadeDate = item.validade ? parseISO(item.validade) : null;
                    const daysLeft = validadeDate && isValid(validadeDate) ? differenceInDays(validadeDate, new Date()) : null;

                    return (
                        <li key={i} className="text-xs text-slate-600 flex justify-between items-center gap-2">
                            <span className="truncate">• {item.nome || item.medicamento || `Item ${i + 1}`}</span>
                            {(type === "vencimento" || type === "vencidos") && daysLeft !== null && (
                                <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] ${getDaysColor(daysLeft)}`}>
                                    {daysLeft < 0 ? "Vencido" : `${daysLeft} dias`}
                                </span>
                            )}
                        </li>
                    );
                })}
                {items.length > 5 && (
                    <li className="text-xs text-slate-400">... e mais {items.length - 5}</li>
                )}
            </ul>
        </Card>
    );
}
