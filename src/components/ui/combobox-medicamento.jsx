import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function ComboboxMedicamento({
    medicamentos = [],
    value,
    onChange,
    placeholder = "Selecione o medicamento..."
}) {
    const [open, setOpen] = React.useState(false)

    // O componente recebe os medicamentos inteiros como options
    const selectedMed = medicamentos.find((m) => m.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-auto min-h-10 text-left px-3 py-2 bg-white"
                >
                    {selectedMed ? (
                        <div className="flex items-center gap-2 truncate overflow-hidden">
                            {selectedMed.codigo && (
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase shrink-0 text-slate-600 border border-slate-200">
                                    {selectedMed.codigo}
                                </span>
                            )}
                            <span className="truncate">
                                {selectedMed.nome}
                                {selectedMed.unidade_medida ? ` - ${selectedMed.unidade_medida}` : ""}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-lg border-slate-200" align="start">
                <Command
                    filter={(val, search) => {
                        // Command inyecting 'val' logic handles the value as lower-cased item.value
                        // For custom searching based on the item properties we find it
                        const med = medicamentos.find(m => m.id === val || m.id.toLowerCase() === val);
                        if (!med) return 0;

                        const term = search.toLowerCase();
                        if (med.nome.toLowerCase().includes(term)) return 1;
                        if (med.codigo && med.codigo.toLowerCase().includes(term)) return 1;
                        return 0;
                    }}
                >
                    <CommandInput placeholder="Buscar por código ou nome..." className="h-10 text-sm" />
                    <CommandEmpty className="py-6 text-center text-sm text-slate-500">Nenhum medicamento encontrado.</CommandEmpty>
                    <CommandList
                        className="max-h-[250px] overflow-y-auto w-full"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandGroup className="px-1 py-1">
                            {medicamentos.map((m) => (
                                <CommandItem
                                    key={m.id}
                                    value={m.id} // value passes through filter
                                    onSelect={(selectedVal) => {
                                        // Cmdk returns the internal lowercase value representing the id if there are uppercase on id (ex utils.uuid)
                                        // We must match it back to the original case if our ids have case sensitivity
                                        const correctMed = medicamentos.find(med => med.id.toLowerCase() === selectedVal || med.id === selectedVal);
                                        if (correctMed) {
                                            onChange(correctMed.id === value ? "" : correctMed.id)
                                        } else {
                                            onChange(selectedVal === value ? "" : selectedVal)
                                        }
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "flex flex-col items-start px-3 py-2 text-sm cursor-pointer rounded-sm w-full my-0.5 relative",
                                        value === m.id ? "bg-emerald-50 text-emerald-900 data-[selected=true]:bg-emerald-100" : "data-[selected=true]:bg-slate-100"
                                    )}
                                >
                                    <div className="flex items-center gap-2 w-full pr-6">
                                        {m.codigo && (
                                            <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase shrink-0 text-slate-600">
                                                {m.codigo}
                                            </span>
                                        )}
                                        <span className="truncate flex-1 text-left">
                                            {m.nome}
                                            {m.unidade_medida ? ` - ${m.unidade_medida}` : ""}
                                        </span>
                                    </div>
                                    {value === m.id && (
                                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
