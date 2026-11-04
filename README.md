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
