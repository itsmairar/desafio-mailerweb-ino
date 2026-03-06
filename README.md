# MailerWeb Meeting Room Booking System

Solução do Desafio Fullstack MailerWeb! Este repositório contém uma aplicação robusta de agendamento de salas com um sistema de mensageria assíncrono projetado em cima do padrão Outbox.

## Stack Tecnológico

**Backend:**
- Python 3.11, FastAPI
- PostgreSQL, SQLAlchemy Async (`asyncpg`), Pydantic
- Pytest para suíte de testes (Testes Unitários e de Integração)
- AsyncIO / FastAPI-Mail para mensageria SMTP Worker local
- Docker \u0026 Docker Compose

**Frontend:**
- Next.js 14 (App Router)
- React, TypeScript, Tailwind CSS
- Context API (Autenticação JWT Global)
- Axios, React-Hot-Toast (UX/UI Errors), Lucide Icons
- Vitest \u0026 React Testing Library (Suíte de Testes UI / Interceptação Axios)

---

## Decisões Técnicas \u0026 Arquitetura

### Padrão Transacional e Concorrência (Prevenção de Overlap)
Uma das regras do desafio era: *"Duas requisições simultâneas não devem criar reservas conflitantes"*.
-  **Estratégia Escolhida (Row-Level Lock):** O backend foi modelado usando Transações ACID de Bancos Relacionais com clausulas de bloqueio explícito a nível de linha no banco de dados, utilizando `SELECT ... FOR UPDATE`.
- Toda validação de intersecção em `BookingService.check_overlap` utiliza o `.with_for_update()` do SQLAlchemy. Isso garante que, se duas requisições chegarem ao exato mesmo milissegundo tentando aprovar um Slot, o PostgreSQL vai enfileirar as transações e a segunda sofrerá bloqueio, lançando o erro seguro `HTTP 409 Conflict`.

### Sistema de Notificação (Transactional Outbox Pattern)
Para proibir o antipadrão da Perda de Mensagem (Falha Dual de DB vs Sistema de E-mail):
1. Quando uma reserva é inserida/editada, um evento `OutboxEvent` entra pendente em formato JSON binário.
2. A atualização da Reserva e a inserção no Outbox compartilham estritamente o **mesmo objeto de commit `session.commit()`**, garantindo atomicidade absoluta.
3. Um Worker puramente Assíncrono (`worker.py`) roda em *looping background container*, buscando batches pendentes via `skip_locked=True` para prevenir concorrência de multithread workers (Idempotência), processa o envio com 3 níveis de *Retry* via FastAPI-Mail e sela como `PROCESSED`.

### Frontend Patterns (SOLID)
A camada do App isola estritamente responsabilidades. Os Componentes de UX e Modais não manipulam APIs diretamente. Empregamos a injeção de camadas limpas (`src/services/api.ts` e classes de serviços de Modelo) e Context API reativa de proteção JWT para trancar navegação não-autenticada.

---

## Como Rodar a Aplicação

A infraestrutura inteira do projeto foi conteinerizada com Docker Compose de forma unificada. A aplicação dispensa inteiramente a criação de arquivos `.env` manuais localmente, pois as chaves do Banco, JWT e contêineres SMTP (MailHog) já vêm nativamente injetadas na estrutura global do `docker-compose.yml` para faciliar a imersão na avaliação técnica.

### 1. Rodar a Stack Inteira (Docker)
Na raiz do diretório do repositório (`desafio-mailerweb-ino/`) que possui o `docker-compose.yml`, execute:

```bash
docker compose up --build -d
```

O orquestrador subirá simultaneamente 5 Máquinas Independentes:
-  **Banco:** PostgreSQL Server (`localhost:5434`)
-  **API Backend:** FastAPI Webserver (`http://localhost:8000`)
-  **Worker E-mails:** Processo independente em shell consumindo eventos de e-mails via `worker.py`
-  **Frontend App:** Next.js Server App (`http://localhost:3000`)
-  **MailHog (Caixa de Entrada UI):** Servidor SMTP fake interceptor (`localhost:8025`) para verificação dos disparos de e-mail.

### 2. Acessar a Plataforma

-  **Frontend UI (App):** Acesse **[http://localhost:3000](http://localhost:3000)** no navegador. Registre uma conta no formulário e faça suas reservas de teste!
-  **Backend API Docs (Swagger):** Acesse **[http://localhost:8000/docs](http://localhost:8000/docs)**.
-  **MENSAGENS DE EMAIL / MAILHOG:** Acesse **[http://localhost:8025](http://localhost:8025)** no seu navegador. Este é um interceptador local de E-mails! Ao fazer uma reserva no Frontend, nosso Worker processará e enviará a notificação em tempo real para ESTA interface. Portanto, você verá a exata notificação HTML simulada como se estivesse abrindo sua própria caixa de e-mails, mas de forma segura, sem afetar ou necessitar contas SMTP externas! Dentro do Mailhog, basta clicar no e-mail recebido, ir na aba chamada **"HTML"** e visualizar as tags montadas automaticamente.

---

## Testes

### Executando Testes Backend (Pytest)
```bash
# Na pasta /backend do repositório
docker compose run --rm api pytest -v
```
*(Cobre validações de tempo, limites de horas (15m, 8h), concorrência de Locks `FOR UPDATE`, idempotência de outbox e proteção contra falsificações JWT/Overlaps).*

### Executando Testes Frontend (Vitest)
```bash
# Na pasta /frontend do repositório
cd frontend
npm install
npx vitest run
```
*(Realiza simulação JSDOM do browser. Testa fluxo completo de Formulário de Agendamento, Interceptação de Erro HTTP 409 [Overlap Conflito de Horário] com Hot Toasts Red Error na tela, e Renderizações da Switch Register/Login formadas por Mocks Limpos de API Rest).*

---