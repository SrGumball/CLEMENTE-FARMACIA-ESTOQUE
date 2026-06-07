import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { parseISO, subDays, format, isValid } from "date-fns";
import { db } from "@/api/db";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, Trash2, Save, Upload, HardDrive, Settings, History, Calendar, Leaf, Waves, Sparkles, Box, Flower2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Configuracoes() {
    const queryClient = useQueryClient();
    const [currentTheme, setCurrentTheme] = useState(() => {
        const saved = localStorage.getItem("pharma_theme");
        if (saved) return saved;
        const savedDark = localStorage.getItem("pharma_dark_mode");
        if (savedDark === "true") return "dark";
        return "azul";
    });

    useEffect(() => {
        const isDark = currentTheme === "dark";
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        
        // Remove classes antigas de tema
        const themes = ["theme-verde", "theme-azul", "theme-roxo", "theme-ardosia", "theme-rosa"];
        themes.forEach(t => document.documentElement.classList.remove(t));
        
        if (!isDark && currentTheme !== "azul") {
            document.documentElement.classList.add(`theme-${currentTheme}`);
        }

        localStorage.setItem("pharma_theme", currentTheme);
        localStorage.setItem("pharma_dark_mode", JSON.stringify(isDark));
        window.dispatchEvent(new Event("storage"));
    }, [currentTheme]);

    const themeOptions = [
        { id: "verde", name: "Verde Suave", icon: Leaf, iconColor: "text-green-500", bgPreview: "bg-green-600", lightPreview: "bg-green-50" },
        { id: "azul", name: "Azul Oceano", icon: Waves, iconColor: "text-[#3b82f6]", bgPreview: "bg-[#2563eb]", lightPreview: "bg-[#eff6ff]" },
        { id: "roxo", name: "Roxo Elegante", icon: Sparkles, iconColor: "text-purple-500", bgPreview: "bg-purple-600", lightPreview: "bg-purple-50" },
        { id: "ardosia", name: "Ardósia", icon: Box, iconColor: "text-slate-500", bgPreview: "bg-slate-600", lightPreview: "bg-slate-50" },
        { id: "rosa", name: "Rosa", icon: Flower2, iconColor: "text-pink-500", bgPreview: "bg-pink-600", lightPreview: "bg-pink-50" },
        { id: "dark", name: "Dark Mode", icon: Moon, iconColor: "text-indigo-400", bgPreview: "bg-slate-900", lightPreview: "bg-slate-800" },
    ];

    const handleResetSystem = async () => {
        try {
            toast.loading("Limpando banco de dados...");
            await invoke("clear_all_data");
            await queryClient.invalidateQueries();
            toast.dismiss();
            toast.success("Banco de dados limpo com sucesso!");
        } catch (error) {
            toast.dismiss();
            console.error(error);
            toast.error("Erro ao limpar banco de dados");
        }
    };

    const handleDataCleanup = async () => {
        try {
            toast.loading("Limpando dados antigos (6 meses)...");
            const count = await invoke("bulk_cleanup", { monthsOld: 6 });
            await queryClient.invalidateQueries();
            toast.dismiss();
            toast.success(`Limpeza concluída! ${count} registros apagados.`);
        } catch (error) {
            toast.dismiss();
            console.error(error);
            toast.error("Erro ao realizar limpeza de dados");
        }
    };

    const handleBackup = async () => {
        try {
            const selected = await openDialog({
                directory: true,
                multiple: false,
                title: "Selecionar pasta para Backup"
            });

            if (selected) {
                toast.loading("Realizando backup...");
                const result = await invoke("backup_database", { destPath: selected });
                toast.dismiss();
                toast.success(`Backup realizado com sucesso em: ${result}`);
                queryClient.invalidateQueries({ queryKey: ["config"] });
            }
        } catch (error) {
            toast.dismiss();
            console.error(error);
            toast.error(`Erro ao realizar backup: ${error}`);
        }
    };

    const handleImportBackup = async () => {
        try {
            const selected = await openDialog({
                directory: false,
                multiple: false,
                title: "Selecionar arquivo de Backup",
                filters: [{
                    name: 'Arquivos SQLite',
                    extensions: ['db', 'sqlite', 'sqlite3']
                }]
            });

            if (selected) {
                toast.loading("Restaurando backup...");
                await invoke("import_backup", { backupPath: selected });
                await queryClient.invalidateQueries();
                toast.dismiss();
                toast.success("Backup restaurado com sucesso! O sistema recarregará os dados.");
                // Give time for toast, then reload window
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            toast.dismiss();
            console.error(error);
            toast.error(`Erro ao restaurar backup: ${error}`);
        }
    };


    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <Settings className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Configurações</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie a aparência e os dados do sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="w-5 h-5 text-amber-500" />
                            Aparência do Sistema
                        </CardTitle>
                        <CardDescription>
                            Personalize as cores e o tema do sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Paleta de Cores</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {themeOptions.map((theme) => {
                                    const isSelected = currentTheme === theme.id;
                                    return (
                                        <div 
                                            key={theme.id}
                                            onClick={() => setCurrentTheme(theme.id)}
                                            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-green-500 ring-4 ring-green-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                        >
                                            <div className="flex h-16">
                                                <div className={`w-1/3 ${theme.bgPreview}`}></div>
                                                <div className={`w-2/3 ${theme.lightPreview} flex flex-col justify-center px-4 gap-2 relative`}>
                                                    <div className={`h-2 w-3/4 rounded-full ${theme.bgPreview}`}></div>
                                                    <div className={`h-1.5 w-1/2 rounded-full ${theme.bgPreview} opacity-40`}></div>
                                                    {isSelected && (
                                                        <div className="absolute right-2 top-2 bg-white rounded-full shadow-sm">
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-3 flex items-center gap-2">
                                                <theme.icon className={`w-4 h-4 ${theme.iconColor}`} />
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{theme.name}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-blue-500" />
                            Backup e Restauração
                        </CardTitle>
                        <CardDescription>
                            Salve seus dados com segurança ou restaure um backup anterior
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">Fazer Backup</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Salva uma cópia de segurança do banco de dados.</p>
                            </div>
                            <Button variant="outline" onClick={handleBackup} className="gap-2">
                                <Save className="w-4 h-4" /> Exportar
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">Restaurar Backup</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Substitui os dados atuais por um backup.</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Upload className="w-4 h-4" /> Importar
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Restaurar Backup?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Atenção: Todos os dados atuais do sistema serão substituídos pelos dados do backup selecionado.
                                            Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleImportBackup} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                                            Confirmar Restauração
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>


                <Card className="md:col-span-2 border-red-200 dark:border-red-900">
                    <CardHeader className="bg-red-50 dark:bg-red-950/20 rounded-t-lg">
                        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                            <Trash2 className="w-5 h-5" />
                            Gerenciamento de Dados
                        </CardTitle>
                        <CardDescription className="text-red-600 dark:text-red-300">
                            Área de perigo. Ações aqui não podem ser desfeitas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 border border-red-100 dark:border-red-900 rounded-lg bg-white dark:bg-slate-800/50">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">Limpar Dados Antigos (+6 meses)</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Apaga registros de mais de 6 meses que estejam com estoque zerado no momento.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 w-full sm:w-auto">
                                        Iniciar Limpeza Segura
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Limpar dados antigos?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação irá apagar definitivamente lotes e medicamentos com mais de 6 meses
                                            cujo estoque atual seja 0. Tem certeza?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDataCleanup} className="bg-amber-600 hover:bg-amber-700 text-white border-0">
                                            Confirmar Limpeza
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 border border-red-100 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/10">
                            <div>
                                <p className="font-bold text-red-700 dark:text-red-400">Limpar TODO o Banco de Dados</p>
                                <p className="text-sm text-red-600 dark:text-red-300">
                                    Isso irá apagar permanentemente todos os medicamentos, lotes, entradas e saídas.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full sm:w-auto gap-2">
                                        <Trash2 className="w-4 h-4" />
                                        Limpar Banco de Dados
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação irá apagar <span className="font-bold underline">permanentemente todos os dados</span> de medicamentos, lotes, entradas, saídas e movimentações.
                                            Isso é recomendado apenas para limpar o sistema de testes antes de usar na produção.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetSystem} className="bg-red-600 hover:bg-red-700 text-white border-0">
                                            Confirmar Destruição de Dados
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
