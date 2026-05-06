# Guia de Deploy - Tisgo News Portal

## Visão Geral

O Tisgo News Portal é um portal de notícias premium construído com React 19, TypeScript, Tailwind CSS 4, Express 4, tRPC 11 e Drizzle ORM. Este guia descreve como fazer deploy da aplicação.

## Pré-requisitos

- Node.js 22.13.0 ou superior
- pnpm 10.4.1 ou superior
- Banco de dados MySQL/TiDB
- Conta Manus para OAuth

## Variáveis de Ambiente Utilizadas

As seguintes variáveis são automaticamente injetadas pelo sistema Manus e utilizadas pela aplicação:

### OAuth e Autenticação

```bash
VITE_APP_ID              # ID da aplicação OAuth Manus
OAUTH_SERVER_URL         # URL do servidor OAuth (https://api.manus.im)
VITE_OAUTH_PORTAL_URL    # URL do portal de login OAuth Manus
JWT_SECRET               # Chave secreta para assinar cookies de sessão
```

### Banco de Dados

```bash
DATABASE_URL             # Connection string MySQL: mysql://user:pass@host:port/db
```

### Informações do Proprietário

```bash
OWNER_OPEN_ID            # ID único do proprietário (Manus OpenID)
OWNER_NAME               # Nome do proprietário
```

### APIs Manus

```bash
BUILT_IN_FORGE_API_URL   # URL da API Manus (https://api.manus.im)
BUILT_IN_FORGE_API_KEY   # Chave de API para backend (server-side)
VITE_FRONTEND_FORGE_API_URL   # URL da API Manus para frontend
VITE_FRONTEND_FORGE_API_KEY   # Chave de API para frontend
```

### Analytics (Opcional)

```bash
VITE_ANALYTICS_ENDPOINT  # Endpoint de analytics
VITE_ANALYTICS_WEBSITE_ID # ID do website para analytics
```

## Build e Deploy

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Build da Aplicação

```bash
pnpm build
```

Isso irá:
- Compilar o frontend React com Vite
- Compilar o servidor Express com esbuild
- Gerar arquivos otimizados em `dist/`

### 3. Aplicar Migrations do Banco de Dados

```bash
pnpm db:push
```

Isso irá criar as tabelas necessárias no banco de dados.

### 4. Iniciar a Aplicação

```bash
pnpm start
```

A aplicação será executada em `http://localhost:3000`.

## Estrutura de Diretórios

```
tisgo-news-portal/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas: Home, Article, Category, Search, Admin
│   │   ├── components/    # Componentes UI e layouts
│   │   ├── hooks/         # Custom hooks (useSEO, useAuth, etc)
│   │   ├── contexts/      # React contexts (ThemeContext)
│   │   ├── lib/           # tRPC client, utilitários
│   │   └── index.css      # Estilos globais com Tailwind
│   └── public/            # robots.txt, favicon.ico
├── server/                # Backend Express
│   ├── routers.ts         # Procedures tRPC (articles, categories, auth, sitemap)
│   ├── db.ts              # Query helpers
│   ├── articles-crud.ts   # Validação e funções CRUD de artigos
│   ├── sitemap.ts         # Geração de sitemap.xml
│   └── _core/             # Infraestrutura (OAuth, context, tRPC setup)
├── drizzle/               # Schema e migrations
│   ├── schema.ts          # Definição das tabelas
│   └── migrations/        # Arquivos SQL gerados
├── storage/               # Helpers de armazenamento em nuvem
├── shared/                # Código compartilhado (constantes, tipos)
└── package.json
```

## Banco de Dados

### Schema

O banco de dados possui as seguintes tabelas:

**users**
- id: int (PK)
- openId: varchar (unique, do OAuth Manus)
- name: text
- email: varchar
- role: enum ('user', 'admin')
- createdAt, updatedAt, lastSignedIn: timestamp

**articles**
- id: int (PK)
- title: varchar
- slug: varchar (unique)
- excerpt: text
- content: text
- author: varchar
- coverImage: varchar (nullable, URL)
- categoryId: int (FK)
- views: int (default 0)
- published: boolean
- createdAt, updatedAt, publishedAt: timestamp

**categories**
- id: int (PK)
- name: varchar
- slug: varchar (unique)
- description: text (nullable)
- icon: varchar (nullable, emoji)
- color: varchar (nullable, hex color)
- createdAt, updatedAt: timestamp

## Funcionalidades Principais

### Portal Público

- **Homepage**: Destaque de notícias, carrossel de manchetes, seções por categoria
- **Página de Artigo**: Layout editorial completo com imagem de capa, autor, data, conteúdo, botões de compartilhamento
- **Listagem por Categoria**: Grid responsivo com paginação
- **Busca**: Busca por título e conteúdo com página de resultados
- **Responsivo**: Design mobile-first com suporte a desktop

### Painel Administrativo

- **Dashboard**: Estatísticas de artigos, visualizações, categorias
- **CRUD de Artigos**: Criar, editar, excluir artigos com validação
- **Gerenciamento de Categorias**: Visualizar e gerenciar categorias
- **Proteção**: Acesso restrito a usuários com role 'admin'

### SEO

- **Meta Tags Dinâmicas**: Título, descrição, imagem por artigo
- **Open Graph**: Tags para compartilhamento em redes sociais
- **Schema.org**: JSON-LD NewsArticle estruturado
- **Sitemap**: Geração automática em `/api/trpc/sitemap.generate`
- **robots.txt**: Configurado para permitir crawling público

### Autenticação

- **OAuth Manus**: Login integrado
- **Roles**: Controle de acesso (admin/user)
- **Proteção de Rotas**: Admin routes protegidas no backend com `protectedProcedure`

## Testes

### Executar Testes

```bash
pnpm test
```

Testes incluem:
- Validação de schema CRUD de artigos
- Logout de autenticação
- Procedures tRPC de artigos

### Verificar TypeScript

```bash
pnpm check
```

## Desenvolvimento

### Modo Desenvolvimento

```bash
pnpm dev
```

Inicia o servidor com hot reload em `http://localhost:3000`.

### Adicionar Nova Funcionalidade

1. Atualizar schema em `drizzle/schema.ts`
2. Gerar migration: `pnpm drizzle-kit generate`
3. Adicionar query helpers em `server/db.ts`
4. Criar procedures em `server/routers.ts`
5. Implementar UI em `client/src/pages/` ou `client/src/components/`
6. Escrever testes em `server/*.test.ts`

## Troubleshooting

### Erro de Conexão ao Banco de Dados

Verifique se `DATABASE_URL` está correto:
```bash
mysql://user:password@localhost:3306/tisgo_news
```

### Erro de Autenticação OAuth

Verifique se `VITE_APP_ID` e `OAUTH_SERVER_URL` estão configurados.

### Erro de Build

Limpe cache e reinstale:
```bash
rm -rf node_modules dist .turbo
pnpm install
pnpm build
```

### Erro de Migrations

Verifique se o banco de dados está acessível e execute:
```bash
pnpm db:push
```

## Suporte

Para suporte, visite https://help.manus.im

## Licença

MIT
