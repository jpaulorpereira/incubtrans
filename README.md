# Marketplace INCUBTRANS

Plataforma web do marketplace transfronteiriço INCUBTRANS (Norte de Portugal, Galiza e Castela e Leão). Foi construída a partir da especificação v3 (06/10/2026) e segue o design do protótipo.

## Como executar

Requisitos: Node.js 22.5 ou superior. A base de dados é SQLite, incluída no próprio Node, por isso não é preciso instalar mais nada.

```bash
npm install
npm start            # http://localhost:3000
npm run seed         # repõe os dados de demonstração (apaga a base de dados)
npm test             # testes dos fluxos principais
```

No primeiro arranque, a base de dados é criada em `data/` e carregada com os dados de demonstração.

## Acessos de demonstração

| Perfil | Email | Password |
|---|---|---|
| Administrador (em `/gestao`) | admin@incubtrans.eu | Admin2026! |
| Empresa | info@norpastel.pt, hola@techsolutions.es, reservas@termasatb.pt, … | Demo2026! |
| Incubadora | info@brigantia.pt, incubadora@incubtrans.eu, viveiro@verin.gal | Demo2026! |
| Agente de desenvolvimento | geral@adrat.pt, corane@corane.pt, info@eurocidadechavesverin.eu | Demo2026! |

Os dados de demonstração incluem também contas pendentes, para testar a validação pelo administrador, e uma conta suspensa.

O painel de administração está em `/gestao` e não aparece na navegação pública. O administrador entra pela página normal de entrada.

## Variáveis de ambiente

| Variável | Para que serve | Por omissão |
|---|---|---|
| `PORT` | Porta HTTP | 3000 |
| `BASE_URL` | Endereço público, usado nos links dos emails, no sitemap e no hreflang | http://localhost:PORT |
| `APP_SECRET` | Segredo das sessões e do hash dos emails das avaliações | gerado em `data/secret.key` |
| `DATA_DIR` | Pasta da base de dados e das imagens carregadas | `./data` |
| `HIGHLIGHT_DAYS` | Duração de um destaque, em dias | 30 |
| `NODE_ENV` | Em `production`, os cookies ficam marcados como `Secure` | — |

## O que está feito

Todos os requisitos funcionais RF-01 a RF-25 estão implementados:

- Registo por perfil com confirmação de email, e entrada única com encaminhamento automático para a área certa.
- Estados de conta pendente, aprovada, rejeitada e suspensa.
- Selo "Verificado" com validade anual. O selo é retirado quando a empresa muda o nome, o NIF ou a morada.
- Perfis públicos com logótipo, capa, contactos, redes sociais e várias localizações.
- Produtos e serviços com imagens (convertidas para WebP), preço no formato "20,50 €", e ativar, desativar e eliminar com confirmação.
- Listagens com pesquisa, filtros e ordenação.
- Páginas de detalhe para empresas, incubadoras e agentes.
- Programas, empresas incubadas, projetos, eventos e notícias.
- Mapa interativo (Leaflet com OpenStreetMap). Os mapas só carregam depois de aceitar os cookies de mapas.
- Avaliações sem conta:
  - Confirmação por email, uma avaliação por email e por empresa.
  - O email é guardado apenas em hash.
  - Proteção com CAPTCHA, campo isco (honeypot) e limite de pedidos.
  - A empresa pode responder.
- Estatísticas por entidade (visualizações, contactos por canal, taxa de contacto), sem dados pessoais.
- Destaques na página inicial com aprovação do administrador, com um máximo de um ativo ou pendente por empresa.
- Interface em PT e ES. Quando falta a tradução, aparece o texto original com aviso.
- Painel de administração com:
  - Contas, moderação, denúncias e destaques.
  - Categorias, territórios, páginas e FAQ.
  - Modelos de email, estatísticas, mensagens, auditoria e caixa de saída.
- Páginas institucionais, formulário de contactos e aviso de cookies.
- Exportação (JSON) e eliminação da própria conta, conforme o RGPD.
- Denúncias de conteúdos e de avaliações.
- Pesquisa global com sugestões.

Requisitos não funcionais:

- Design responsivo e funcionamento sem JavaScript.
- Segurança:
  - Passwords com scrypt e política mínima.
  - CSRF, limite de tentativas de entrada e cabeçalhos de segurança (CSP).
  - Emails ofuscados no HTML.
- SEO: URLs legíveis, metadados por idioma, `sitemap.xml`, `robots.txt` e JSON-LD.
- Registo de auditoria das ações administrativas.

## O que falta para produção

- **Envio real de emails.** Hoje todos os emails ficam na "Caixa de saída" do painel de administração. Falta ligar um servidor SMTP ou um serviço de envio no ficheiro `src/lib/mail.js`.
- **Alojamento, HTTPS e cópias de segurança diárias (RNF-07, RNF-09).** Também falta decidir quem aloja e mantém a plataforma.
- **Auditoria de acessibilidade WCAG 2.1 AA.** A base é semântica e acessível, mas não foi feita uma auditoria formal.
- **Decisões em aberto da especificação.** Estão ainda por decidir os limites finais de imagens e de produtos e os textos legais definitivos.
- **Mais idiomas.** Hoje a interface existe em PT e ES. A estrutura já permite acrescentar outros.

## Estrutura

```
src/server.js         arranque e middleware
src/db.js             esquema SQLite
src/seed.js           dados de demonstração
src/i18n.js           traduções PT/ES
src/lib/              segurança, emails, consultas, utilitários
src/routes/           público, autenticação, área reservada (/area), administração (/gestao)
views/                modelos EJS
public/               CSS, JS, fontes e imagens
test/                 testes dos fluxos (node:test)
```
