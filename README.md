# Farmácia Clemente — Sistema de Gestão de Medicamentos

Sistema desktop offline para gerenciamento de estoque farmacêutico, construído com **Tauri** (Rust) e **React**.

## Tecnologias

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Tauri (Rust)
- **Banco de Dados:** SQLite (local, salvo no AppData)

## Funcionalidades

- Dashboard com visão geral do estoque
- Cadastro de medicamentos, lotes e categorias
- Registro de entradas e saídas
- Controle de empréstimos
- Gestão de fornecedores e alas/setores
- Relatórios

## Instalação

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

O executável será gerado em `src-tauri/target/release/`.

## Banco de Dados

O SQLite é salvo automaticamente no diretório AppData do usuário. Não é necessária nenhuma configuração externa.
