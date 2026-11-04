# Tarefas

Aplicação de gerenciamento de tarefas com Next.js 15, React e TypeScript.
A interface usa Tailwind CSS.

As dependências PostCSS, usada pelo Next.js, e minimatch, usada pelo parser
TypeScript, estão fixadas em `overrides` para incluir correções de segurança.
O parser e o plugin TypeScript do ESLint usam a mesma versão, compatível com ESLint 9.

## Requisitos

- Node.js 24.13.1, indicado no arquivo `.nvmrc`.
- npm 11.

## Execução local

```sh
npm ci
npm run dev
```

Abra http://localhost:3000.

## Verificações

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Para executar o build de produção:

```sh
npm start
```

## Testes

`npm test` executa os testes com o runner nativo do Node.js e suporte a
TypeScript pelo `tsx`. Arquivos de teste usam o sufixo `.test.ts` e ficam
próximos do módulo testado em `src/`.

Os testes usam `node:test` e as assertions de `node:assert/strict`.

## Contrato de tarefas

O contrato e as regras de entrada ficam em `src/lib/tarefa-schema.ts`.
Os tipos TypeScript são inferidos dos schemas Zod.

Uma tarefa contém `id` no formato UUID, `titulo`, `descricao` opcional e
`dataCriacao` como timestamp ISO 8601 em UTC.

O título recebe `trim` e deve ter de 1 a 120 caracteres após a normalização.
A descrição aceita até 2.000 caracteres e preserva espaços e quebras de linha.
A criação aceita apenas título e descrição. A atualização exige também o id
da tarefa e não aceita uma nova data de criação. Campos adicionais são rejeitados.
