import { Card } from "@/components/ui/card";

const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100" },
    green: { bg: "bg-green-50", text: "text-green-600", icon: "bg-green-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", icon: "bg-amber-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100" },
    red: { bg: "bg-red-50", text: "text-red-600", icon: "bg-red-100" },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, color = "blue" }) {
    const c = colorMap[color] || colorMap.blue;

    return (
        <Card className={`p-6 border-0 shadow-sm ${c.bg}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                {Icon && (
                    <div className={`p-3 rounded-xl ${c.icon}`}>
                        <Icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                )}
            </div>
        </Card>
    );
}
