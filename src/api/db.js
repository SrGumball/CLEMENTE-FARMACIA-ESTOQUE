import { invoke } from '@tauri-apps/api/core';

const createEntityProxy = (entityName) => ({
    list: (orderBy) => invoke('list_entities', { name: entityName, orderBy }),
    create: (data) => invoke('create_entity', { name: entityName, data }),
    update: (id, data) => invoke('update_entity', { name: entityName, id, data }),
    delete: (id) => invoke('delete_entity', { name: entityName, id }),
    get: (id) => invoke('get_entity', { name: entityName, id }),
});

export const db = {
    entities: {
        Medicamento: createEntityProxy('Medicamento'),
        Lote: createEntityProxy('Lote'),
        Entrada: createEntityProxy('Entrada'),
        Saida: createEntityProxy('Saida'),
        Fornecedor: createEntityProxy('Fornecedor'),
        Ala: createEntityProxy('Ala'),
        Emprestimo: createEntityProxy('Emprestimo'),
        Categoria: createEntityProxy('Categoria'),
        Inventario: createEntityProxy('Inventario'),
        InventarioItem: createEntityProxy('InventarioItem'),
        Config: createEntityProxy('Config'),
    }
};
