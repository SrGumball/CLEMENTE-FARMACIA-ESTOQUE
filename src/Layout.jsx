import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import logo from "./assets/logo.png";

import {
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  Boxes,
  Building2,
  FileText,
  Hospital,
  HandHelping,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Moon,
  Sun,
  ClipboardCheck,
  Settings,
  CalendarX2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from "sonner";
// import AuthDialog from "./components/AuthDialog";


const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Medicamentos", icon: Package, page: "Medicamentos" },
  { name: "Entradas", icon: PackagePlus, page: "Entradas" },
  { name: "Saídas", icon: PackageMinus, page: "Saidas" },
  { name: "Empréstimos", icon: HandHelping, page: "Emprestimos" },
  { name: "Estoque", icon: Boxes, page: "Estoque" },
  { name: "Vencimentos", icon: CalendarX2, page: "Vencimentos" },
  { name: "Alas", icon: Hospital, page: "Alas" },
  { name: "Fornecedores", icon: Building2, page: "Fornecedores" },
  { name: "Balanço", icon: ClipboardCheck, page: "Inventario" },
  { name: "Relatórios", icon: FileText, page: "Relatorios" },
  { name: "Configurações", icon: Settings, page: "Configuracoes" },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("pharma_dark_mode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {

    setUser({ full_name: "Administrador", email: "local@farmacia.clemente" });
  }, []);


  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("pharma_dark_mode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    // Autenticação local desativada - sistema offline
    setShowAuthDialog(false);
  }, []);


  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
  };

  const handleLogout = () => {

    console.log("Logout local");
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Toaster position="top-right" richColors />
      {/* <AuthDialog open={showAuthDialog} onSuccess={handleAuthSuccess} /> */}


      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100">Clemente Ferreira</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-50 transition-transform duration-300 flex flex-col",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">Clemente Ferreira</h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">Controle de Estoque</p>
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-blue-600 dark:text-blue-400")} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User */}
        {user && (
          <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="max-w-[120px]">
                  <p className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{user.full_name || "Usuário"}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}