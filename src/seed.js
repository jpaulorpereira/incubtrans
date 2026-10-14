// Dados iniciais de demonstração (com as correções pedidas na secção 11.9 da especificação).
// Uso: `npm run seed` (apaga e recria a base de dados) — também corre sozinho no primeiro arranque.
const fs = require('node:fs');
const { db, all, get, run, tx, DB_FILE } = require('./db');
const { hashPassword } = require('./lib/security');
const { slugify } = require('./lib/util');

const TERRITORIES = [
  ['Portugal', 'Bragança', 'Bragança', 41.8061, -6.7567], ['Portugal', 'Bragança', 'Mirandela', 41.4853, -7.1817], ['Portugal', 'Bragança', 'Vinhais', 41.8352, -7.0046],
  ['Portugal', 'Bragança', 'Macedo de Cavaleiros', 41.5380, -6.9612], ['Portugal', 'Bragança', 'Miranda do Douro', 41.4967, -6.2740],
  ['Portugal', 'Vila Real', 'Chaves', 41.7401, -7.4685], ['Portugal', 'Vila Real', 'Valpaços', 41.6070, -7.3113], ['Portugal', 'Vila Real', 'Vila Real', 41.3006, -7.7441],
  ['Portugal', 'Vila Real', 'Montalegre', 41.8245, -7.7906], ['Portugal', 'Vila Real', 'Boticas', 41.6891, -7.6654], ['Portugal', 'Vila Real', 'Vila Pouca de Aguiar', 41.5003, -7.6447],
  ['Portugal', 'Braga', 'Braga', 41.5454, -8.4265], ['Portugal', 'Braga', 'Guimarães', 41.4425, -8.2918], ['Portugal', 'Porto', 'Porto', 41.1579, -8.6291],
  ['Portugal', 'Viana do Castelo', 'Viana do Castelo', 41.6932, -8.8329], ['Portugal', 'Viana do Castelo', 'Valença', 42.0281, -8.6424],
  ['Espanha', 'Ourense', 'Verín', 41.9413, -7.4362], ['Espanha', 'Ourense', 'Ourense', 42.3358, -7.8639], ['Espanha', 'Ourense', 'Xinzo de Limia', 42.0634, -7.7240], ['Espanha', 'Ourense', 'Oímbra', 41.8856, -7.4718],
  ['Espanha', 'Pontevedra', 'Vigo', 42.2406, -8.7207], ['Espanha', 'Pontevedra', 'Pontevedra', 42.4310, -8.6444], ['Espanha', 'Pontevedra', 'Tui', 42.0474, -8.6447],
  ['Espanha', 'A Coruña', 'Santiago de Compostela', 42.8782, -8.5448], ['Espanha', 'A Coruña', 'A Coruña', 43.3623, -8.4115], ['Espanha', 'Lugo', 'Lugo', 43.0121, -7.5558],
];

const CATEGORIES = [
  ['Agroalimentar', 'Agroalimentario', 1], ['Turismo', 'Turismo', 1], ['Artesanato', 'Artesanía', 1], ['Tecnologia', 'Tecnología', 1],
  ['Vinhos e bebidas', 'Vinos y bebidas', 0], ['Serviços às empresas', 'Servicios a empresas', 1], ['Saúde e bem-estar', 'Salud y bienestar', 0], ['Indústria', 'Industria', 0], ['Cultura e lazer', 'Cultura y ocio', 0],
];

const EMAILS = [
  ['verificar_email', 'Confirmação do endereço de email no registo',
    'Confirme o seu email — {site}', 'Olá {name},\n\nObrigado por registar {entity} no {site}.\nConfirme o seu endereço de email através da ligação:\n{link}\n\nDepois da confirmação, a equipa INCUBTRANS irá validar a conta.',
    'Confirma tu email — {site}', 'Hola {name}:\n\nGracias por registrar {entity} en el {site}.\nConfirma tu dirección de email en el enlace:\n{link}\n\nTras la confirmación, el equipo INCUBTRANS validará la cuenta.'],
  ['conta_aprovada', 'Conta aprovada pelo administrador',
    'A sua conta foi aprovada — {site}', 'Olá {name},\n\nA conta de {entity} foi aprovada e o perfil já está público.\nEntre na sua área pessoal: {base_url}/entrar',
    'Tu cuenta ha sido aprobada — {site}', 'Hola {name}:\n\nLa cuenta de {entity} ha sido aprobada y el perfil ya es público.\nEntra en tu área personal: {base_url}/entrar'],
  ['conta_rejeitada', 'Registo rejeitado (com motivo)',
    'O seu registo não foi aprovado — {site}', 'Olá {name},\n\nO registo de {entity} não foi aprovado.\nMotivo: {reason}\n\nPara qualquer esclarecimento, responda a este email ou use {base_url}/contactos.',
    'Tu registro no ha sido aprobado — {site}', 'Hola {name}:\n\nEl registro de {entity} no ha sido aprobado.\nMotivo: {reason}\n\nPara cualquier aclaración, responde a este email o usa {base_url}/contactos.'],
  ['conta_suspensa', 'Conta suspensa',
    'A sua conta foi suspensa — {site}', 'Olá {name},\n\nA conta de {entity} foi suspensa e o perfil deixou de estar público.\nMotivo: {reason}',
    'Tu cuenta ha sido suspendida — {site}', 'Hola {name}:\n\nLa cuenta de {entity} ha sido suspendida y el perfil ha dejado de ser público.\nMotivo: {reason}'],
  ['conta_reativada', 'Conta reativada',
    'A sua conta foi reativada — {site}', 'Olá {name},\n\nA conta de {entity} foi reativada e o perfil voltou a estar público.',
    'Tu cuenta ha sido reactivada — {site}', 'Hola {name}:\n\nLa cuenta de {entity} ha sido reactivada y el perfil vuelve a ser público.'],
  ['recuperar_password', 'Recuperação de password',
    'Recuperação de password — {site}', 'Olá {name},\n\nPara definir uma nova password, use a ligação (válida durante 1 hora):\n{link}\n\nSe não pediu esta alteração, ignore este email.',
    'Recuperación de contraseña — {site}', 'Hola {name}:\n\nPara definir una nueva contraseña, usa el enlace (válido durante 1 hora):\n{link}\n\nSi no has solicitado este cambio, ignora este email.'],
  ['confirmar_avaliacao', 'Confirmação de avaliação por visitante',
    'Confirme a sua avaliação de {entity}', 'Olá,\n\nRecebemos a sua avaliação de {entity} ({rating}/5).\nPara a publicar, confirme através da ligação:\n{link}\n\nO seu email não é publicado nem usado para outros fins.',
    'Confirma tu valoración de {entity}', 'Hola:\n\nHemos recibido tu valoración de {entity} ({rating}/5).\nPara publicarla, confírmala en el enlace:\n{link}\n\nTu email no se publica ni se usa para otros fines.'],
  ['nova_avaliacao', 'Aviso à empresa de nova avaliação publicada',
    'Nova avaliação de {entity}', 'Olá {name},\n\n{entity} recebeu uma nova avaliação ({rating}/5). Pode responder publicamente na sua área: {base_url}/area/avaliacoes',
    'Nueva valoración de {entity}', 'Hola {name}:\n\n{entity} ha recibido una nueva valoración ({rating}/5). Puedes responder públicamente en tu área: {base_url}/area/avaliacoes'],
  ['destaque_decidido', 'Decisão sobre pedido de destaque',
    'Pedido de destaque: {decision}', 'Olá {name},\n\nO pedido de destaque de "{offer}" foi {decision}.\n{extra}',
    'Solicitud de destacado: {decision}', 'Hola {name}:\n\nLa solicitud de destacado de "{offer}" ha sido {decision}.\n{extra}'],
  ['selo_retirado', 'Selo "Verificado" retirado ou em revisão',
    'Selo "Verificado" em revisão — {site}', 'Olá {name},\n\nO selo "Verificado" de {entity} foi retirado ou está em revisão.\nMotivo: {reason}',
    'Sello "Verificado" en revisión — {site}', 'Hola {name}:\n\nEl sello "Verificado" de {entity} ha sido retirado o está en revisión.\nMotivo: {reason}'],
];

const PAGES = [
  ['sobre', 'Sobre o INCUBTRANS', 'Sobre INCUBTRANS',
    'O Marketplace INCUBTRANS é a montra digital da Eurorregião Galiza–Norte de Portugal. Reúne num só lugar as empresas da região e os seus produtos e serviços, as incubadoras que apoiam novos negócios e os agentes de desenvolvimento que dinamizam o território.\n\nA plataforma nasce do projeto INCUBTRANS — Incubadora Transfronteiriça da Eurorregião Galiza–Norte de Portugal, cofinanciado pela União Europeia através do Programa Interreg VI-A Espanha–Portugal (POCTEP) 2021–2027.\n\n## Ficha do projeto\n- Programa: Interreg VI-A Espanha–Portugal (POCTEP) 2021–2027\n- Duração: 01/01/2023 – 31/12/2026\n- Chefe de fila: Eurocidade Chaves–Verín AECT\n- Parceiros: ADRAT, IPB, ANJE, Fundación Galicia Europa, Universidade de Vigo, AJE Galicia',
    'El Marketplace INCUBTRANS es el escaparate digital de la Eurorregión Galicia–Norte de Portugal. Reúne en un solo lugar a las empresas de la región y sus productos y servicios, las incubadoras que apoyan nuevos negocios y los agentes de desarrollo que dinamizan el territorio.\n\nLa plataforma nace del proyecto INCUBTRANS — Incubadora Transfronteriza de la Eurorregión Galicia–Norte de Portugal, cofinanciado por la Unión Europea a través del Programa Interreg VI-A España–Portugal (POCTEP) 2021–2027.\n\n## Ficha del proyecto\n- Programa: Interreg VI-A España–Portugal (POCTEP) 2021–2027\n- Duración: 01/01/2023 – 31/12/2026\n- Jefe de fila: Eurociudad Chaves–Verín AECT\n- Socios: ADRAT, IPB, ANJE, Fundación Galicia Europa, Universidad de Vigo, AJE Galicia'],
  ['como-funciona', 'Como funciona', 'Cómo funciona',
    '## Para visitantes\n- Pesquise produtos, serviços, empresas, incubadoras e agentes de desenvolvimento.\n- Contacte diretamente as entidades por telefone, email, website ou redes sociais. A plataforma não processa encomendas nem pagamentos.\n- Avalie empresas sem criar conta: confirmamos a avaliação por email.\n\n## Para entidades\n- Registe a sua empresa, incubadora ou agente de desenvolvimento e confirme o email.\n- A equipa INCUBTRANS valida a conta; só então o perfil fica público. As empresas validadas recebem o selo "Verificado".\n- Cada entidade gere os seus próprios conteúdos e acompanha as estatísticas de visualizações e contactos.',
    '## Para visitantes\n- Busca productos, servicios, empresas, incubadoras y agentes de desarrollo.\n- Contacta directamente con las entidades por teléfono, email, web o redes sociales. La plataforma no procesa pedidos ni pagos.\n- Valora empresas sin crear cuenta: confirmamos la valoración por email.\n\n## Para entidades\n- Registra tu empresa, incubadora o agente de desarrollo y confirma el email.\n- El equipo INCUBTRANS valida la cuenta; solo entonces el perfil es público. Las empresas validadas reciben el sello "Verificado".\n- Cada entidad gestiona sus propios contenidos y consulta las estadísticas de visualizaciones y contactos.'],
  ['termos', 'Termos e Condições', 'Términos y Condiciones',
    '## 1. Objeto\nO Marketplace INCUBTRANS é uma montra institucional. Não é uma loja online: não processa encomendas nem pagamentos e não intermedeia relações comerciais.\n\n## 2. Contas\nSó as entidades (empresas, incubadoras e agentes de desenvolvimento) têm conta. As contas ficam pendentes até serem validadas pela equipa INCUBTRANS.\n\n## 3. Conteúdos\nCada entidade é responsável pelos conteúdos que publica. A equipa INCUBTRANS pode remover conteúdos que violem estes termos.\n\n## 4. Avaliações\nAs avaliações são confirmadas por email e moderadas. É aceite uma avaliação por email e por empresa.\n\n[Texto provisório — a validar pelos parceiros do projeto.]',
    '## 1. Objeto\nEl Marketplace INCUBTRANS es un escaparate institucional. No es una tienda online: no procesa pedidos ni pagos y no intermedia relaciones comerciales.\n\n## 2. Cuentas\nSolo las entidades (empresas, incubadoras y agentes de desarrollo) tienen cuenta. Las cuentas quedan pendientes hasta que las valida el equipo INCUBTRANS.\n\n## 3. Contenidos\nCada entidad es responsable de los contenidos que publica. El equipo INCUBTRANS puede retirar contenidos que vulneren estos términos.\n\n## 4. Valoraciones\nLas valoraciones se confirman por email y se moderan. Se acepta una valoración por email y por empresa.\n\n[Texto provisional — a validar por los socios del proyecto.]'],
  ['privacidade', 'Política de Privacidade e de Cookies', 'Política de Privacidad y de Cookies',
    '## Responsável pelo tratamento\n[A definir pelos parceiros: identificação do responsável ou responsáveis conjuntos e contacto para o exercício de direitos.]\n\n## Dados recolhidos\n- Contas de entidades: nome, email, dados da entidade.\n- Avaliações: o email serve apenas para confirmar a avaliação; não é publicado e é guardado de forma cifrada.\n- Estatísticas: contagem de visualizações e contactos, sem dados pessoais dos visitantes.\n\n## Os seus direitos\nNa Área Pessoal pode consultar, exportar e eliminar os seus dados.\n\n## Cookies\n- Necessários: sessão e preferências (idioma, consentimento).\n- Mapas (OpenStreetMap): só carregados depois do seu consentimento.\nNão usamos cookies de publicidade nem de analítica.',
    '## Responsable del tratamiento\n[A definir por los socios: identificación del responsable o corresponsables y contacto para el ejercicio de derechos.]\n\n## Datos recogidos\n- Cuentas de entidades: nombre, email, datos de la entidad.\n- Valoraciones: el email solo sirve para confirmar la valoración; no se publica y se guarda cifrado.\n- Estadísticas: recuento de visualizaciones y contactos, sin datos personales de los visitantes.\n\n## Tus derechos\nEn el Área Personal puedes consultar, exportar y eliminar tus datos.\n\n## Cookies\n- Necesarias: sesión y preferencias (idioma, consentimiento).\n- Mapas (OpenStreetMap): solo se cargan tras tu consentimiento.\nNo usamos cookies de publicidad ni de analítica.'],
];

const FAQS = [
  ['A plataforma vende produtos?', 'Não. O Marketplace INCUBTRANS é uma montra: os visitantes contactam diretamente as empresas, sem intermediação nem pagamentos.', '¿La plataforma vende productos?', 'No. El Marketplace INCUBTRANS es un escaparate: los visitantes contactan directamente con las empresas, sin intermediación ni pagos.'],
  ['Preciso de conta para contactar uma empresa?', 'Não. Os contactos estão publicados em cada página. Só as entidades têm conta.', '¿Necesito cuenta para contactar con una empresa?', 'No. Los contactos están publicados en cada página. Solo las entidades tienen cuenta.'],
  ['Como avalio uma empresa?', 'Na página da empresa, use "Avaliar esta empresa". Enviamos uma ligação para o seu email; a avaliação é publicada depois de confirmada.', '¿Cómo valoro una empresa?', 'En la página de la empresa, usa "Valorar esta empresa". Te enviamos un enlace al email; la valoración se publica tras confirmarla.'],
  ['O que significa o selo "Verificado"?', 'Que a equipa INCUBTRANS confirmou a existência legal da empresa (NIF/CIF), a sede ou atividade na Eurorregião e os contactos. A validação é revista anualmente.', '¿Qué significa el sello "Verificado"?', 'Que el equipo INCUBTRANS ha confirmado la existencia legal de la empresa (NIF/CIF), la sede o actividad en la Eurorregión y los contactos. La validación se revisa anualmente.'],
  ['Quanto custa registar a minha empresa?', 'O registo e a publicação de produtos e serviços são gratuitos.', '¿Cuánto cuesta registrar mi empresa?', 'El registro y la publicación de productos y servicios son gratuitos.'],
];

// Gerador pseudo-aleatório determinístico para as estatísticas de demonstração
function rng(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }

function seed() {
  const T = {};
  tx(() => {
    for (const [country, region, mun, lat, lng] of TERRITORIES) {
      T[mun] = Number(run('INSERT INTO territories(country, region, municipality, lat, lng) VALUES (?,?,?,?,?)', country, region, mun, lat, lng).lastInsertRowid);
    }
    const C = {};
    CATEGORIES.forEach(([pt, es, featured], i) => { C[pt] = Number(run('INSERT INTO categories(name_pt, name_es, sort, featured) VALUES (?,?,?,?)', pt, es, i, featured).lastInsertRowid); });
    for (const e of EMAILS) run('INSERT INTO email_templates(key, description, subject_pt, body_pt, subject_es, body_es) VALUES (?,?,?,?,?,?)', ...e);
    for (const p of PAGES) run('INSERT INTO pages(slug, title_pt, title_es, body_pt, body_es) VALUES (?,?,?,?,?)', ...p);
    FAQS.forEach((f, i) => run('INSERT INTO faqs(q_pt, a_pt, q_es, a_es, sort) VALUES (?,?,?,?,?)', ...f, i));

    const DEMO_PASS = hashPassword('Demo2026!');
    run(`INSERT INTO users(name, email, password_hash, role, status, email_verified) VALUES ('Equipa INCUBTRANS','admin@incubtrans.eu',?, 'admin','aprovada',1)`, hashPassword('Admin2026!'));

    function entity(e, user) {
      const id = Number(run(`INSERT INTO entities(type, slug, name, short_name, logo, cover, desc_pt, desc_es, support_pt, support_es, year, category_id, areas, services, startups, nif, phone, email, website, socials, contact_person, contact_person_public, verified, verified_at, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        e.type, slugify(e.short || e.name), e.name, e.short || null, e.logo || null, e.cover || null, e.desc_pt, e.desc_es || null, e.support_pt || null, e.support_es || null, e.year || null,
        e.cat ? C[e.cat] : null, JSON.stringify(e.areas || []), JSON.stringify(e.services || []), e.startups || null, e.nif || null, e.phone, e.email, e.website,
        JSON.stringify(e.socials || []), e.person || null, e.personPublic ? 1 : 0, e.verified ? 1 : 0, e.verified || null, e.created || '2024-01-10 10:00:00').lastInsertRowid);
      (e.locs || []).forEach((l, i) => run('INSERT INTO locations(entity_id, territory_id, address, phone, email, sort) VALUES (?,?,?,?,?,?)', id, T[l[0]], l[1] || null, l[2] || null, l[3] || null, i));
      run(`INSERT INTO users(name, email, password_hash, role, status, status_reason, email_verified, entity_id, created_at) VALUES (?,?,?,?,?,?,1,?,?)`,
        user.name, user.email, DEMO_PASS, e.type, user.status || 'aprovada', user.reason || null, id, e.created || '2024-01-10 10:00:00');
      return id;
    }

    // ---- Empresas ----
    const norpastel = entity({ type: 'empresa', name: 'NorPastel, Lda.', short: 'NorPastel', cat: 'Agroalimentar', nif: 'PT509123456', year: 2009,
      desc_pt: 'Pastelaria tradicional de Chaves que produz o autêntico Pastel de Chaves IGP, com receita artesanal e ingredientes da região.', desc_es: 'Pastelería tradicional de Chaves que elabora el auténtico Pastel de Chaves IGP, con receta artesanal e ingredientes de la región.',
      phone: '+351 254 123 456', email: 'info@norpastel.pt', website: 'https://norpastel.pt', socials: [{ net: 'Facebook', url: 'https://facebook.com/norpastel' }, { net: 'Instagram', url: 'https://instagram.com/norpastel' }],
      person: 'Marta Pires', personPublic: false, verified: '2026-01-15 10:00:00', locs: [['Chaves', 'Rua de Santo António 12']], created: '2024-01-12 09:00:00' }, { name: 'Marta Pires', email: 'info@norpastel.pt' });
    const tech = entity({ type: 'empresa', name: 'TechSolutions S.L.', short: 'TechSolutions', cat: 'Tecnologia', nif: 'ESB36123456', year: 2015,
      desc_pt: 'Consultora tecnológica de Vigo especializada em transformação digital de PME e administração local.', desc_es: 'Consultora tecnológica de Vigo especializada en transformación digital de pymes y administración local.',
      phone: '+34 986 100 200', email: 'hola@techsolutions.es', website: 'https://techsolutions.es', socials: [{ net: 'LinkedIn', url: 'https://linkedin.com/company/techsolutions' }],
      verified: '2026-02-01 10:00:00', locs: [['Vigo', 'Rúa do Príncipe 25']], created: '2024-01-14 09:00:00' }, { name: 'Xoán Otero', email: 'hola@techsolutions.es' });
    const quinta = entity({ type: 'empresa', name: 'Quinta Valle', cat: 'Vinhos e bebidas', nif: 'PT510987654', year: 1987,
      desc_pt: 'Produtor de vinhos de Valpaços, com vinhas próprias em Trás-os-Montes e exportação para vários países.', desc_es: 'Productor de vinos de Valpaços, con viñedos propios en Trás-os-Montes y exportación a varios países.',
      phone: '+351 278 200 300', email: 'geral@quintavalle.pt', website: 'https://quintavalle.pt', socials: [{ net: 'Instagram', url: 'https://instagram.com/quintavalle' }],
      verified: '2025-12-20 10:00:00', locs: [['Valpaços', 'Quinta do Vale, Valpaços']], created: '2024-01-20 09:00:00' }, { name: 'Rui Valle', email: 'geral@quintavalle.pt' });
    const termas = entity({ type: 'empresa', name: 'Termas ATB', cat: 'Turismo', nif: 'PT513456789', year: 2012,
      desc_pt: 'Operador de turismo termal e de natureza no Alto Tâmega e na Raia Seca.', desc_es: 'Operador de turismo termal y de naturaleza en el Alto Tâmega y la Raia Seca.',
      phone: '+351 276 300 400', email: 'reservas@termasatb.pt', website: 'https://termasatb.pt', verified: '2026-03-05 10:00:00',
      locs: [['Chaves', 'Largo das Caldas 3'], ['Verín', 'Rúa Laureano Peláez 4']], created: '2024-02-02 09:00:00' }, { name: 'Sofia Teixeira', email: 'reservas@termasatb.pt' });
    const coop = entity({ type: 'empresa', name: 'Cooperativa Agrícola de Montesinho', short: 'Coop. Montesinho', cat: 'Agroalimentar', nif: 'PT501234567', year: 1976,
      desc_pt: 'Cooperativa de produtores de castanha, mel e fumeiro da Terra Fria Transmontana.', desc_es: 'Cooperativa de productores de castaña, miel y embutidos de la Terra Fria Transmontana.',
      phone: '+351 273 400 500', email: 'geral@coopmontesinho.pt', website: 'https://coopmontesinho.pt', verified: '2026-04-10 10:00:00', locs: [['Bragança', 'Zona Industrial das Cantarias']], created: '2024-03-01 09:00:00' }, { name: 'António Gonçalves', email: 'geral@coopmontesinho.pt' });
    const olival = entity({ type: 'empresa', name: 'Olival do Tâmega', cat: 'Agroalimentar', nif: 'PT514111222', year: 2018,
      desc_pt: 'Lagar artesanal que produz azeite virgem extra a partir de olivais centenários.', desc_es: 'Almazara artesanal que produce aceite de oliva virgen extra a partir de olivares centenarios.',
      phone: '+351 278 500 600', email: 'info@olivaldotamega.pt', website: 'https://olivaldotamega.pt', verified: null, locs: [['Mirandela', 'Rua do Lagar 5']], created: '2024-03-15 09:00:00' }, { name: 'Helena Morais', email: 'info@olivaldotamega.pt' });
    const artesa = entity({ type: 'empresa', name: 'Olaria de Bisalhães', cat: 'Artesanato', nif: 'PT515333444', year: 2001,
      desc_pt: 'Oficina de olaria negra de Bisalhães, património cultural imaterial da UNESCO.', desc_es: 'Taller de alfarería negra de Bisalhães, patrimonio cultural inmaterial de la UNESCO.',
      phone: '+351 259 300 100', email: 'olaria@bisalhaes.pt', website: 'https://bisalhaes.pt', verified: '2026-05-02 10:00:00', locs: [['Vila Real', 'Bisalhães, Mondrões']], created: '2024-04-01 09:00:00' }, { name: 'Manuel Ramalho', email: 'olaria@bisalhaes.pt' });

    // ---- Incubadoras ----
    const brig = entity({ type: 'incubadora', name: 'Brigantia EcoPark', logo: '/img/seed/brigantia.png', year: 2016, startups: 67,
      desc_pt: 'O Brigantia EcoPark é um parque de ciência e tecnologia em Bragança que apoia startups e empresas tecnológicas com espaços de incubação, laboratórios e serviços de I&D para fomentar a inovação e a competitividade.',
      desc_es: 'El Brigantia EcoPark es un parque de ciencia y tecnología en Bragança que apoya a startups y empresas tecnológicas con espacios de incubación, laboratorios y servicios de I+D para fomentar la innovación y la competitividad.',
      areas: ['Inovação transfronteiriça', 'Desenvolvimento sustentável', 'Transformação digital', 'Inovação rural'], services: ['Acompanhamento', 'Cowork', 'Aceleração', 'Acesso a financiamento'],
      phone: '+351 273 123 123', email: 'info@brigantia.pt', website: 'https://brigantia.pt', socials: [{ net: 'LinkedIn', url: 'https://linkedin.com/company/brigantia-ecopark' }],
      locs: [['Bragança', 'Av. Cidade de León 506', '+351 273 123 123', 'braganca@brigantia.pt'], ['Mirandela', 'Rua de Baixo 215', '+351 273 123 124', 'mirandela@brigantia.pt']], created: '2024-01-10 09:00:00' }, { name: 'Paulo Rodrigues', email: 'info@brigantia.pt' });
    const incub = entity({ type: 'incubadora', name: 'Incubadora INCUBTRANS', short: 'INCUBTRANS', logo: '/img/seed/aect.png', year: 2023, startups: 15,
      desc_pt: 'A incubadora transfronteiriça INCUBTRANS apoia startups da Eurorregião Galiza–Norte de Portugal, com mentoria, orientação e ligação a uma rede de parceiros institucionais.',
      desc_es: 'La incubadora transfronteriza INCUBTRANS apoya a startups de la Eurorregión Galicia–Norte de Portugal, con mentoría, orientación y conexión con una red de socios institucionales.',
      areas: ['Desenvolvimento rural', 'Desenvolvimento sustentável', 'Transformação digital'], services: ['Mentoria', 'Networking', 'Internacionalização'],
      phone: '+351 276 100 100', email: 'geral@incubtrans.eu', website: 'https://incubtrans.eu', locs: [['Chaves', 'Av. da Trindade 100', '+351 276 100 100', 'chaves@incubtrans.eu'], ['Verín', 'Praza do Concello 1', '+34 988 414 000', 'verin@incubtrans.eu']], created: '2024-01-11 09:00:00' }, { name: 'Equipa Incubadora', email: 'incubadora@incubtrans.eu' });
    const bdig = entity({ type: 'incubadora', name: 'Bragança Digital', year: 2012, startups: 22,
      desc_pt: 'Incubadora de base tecnológica focada em software, IoT e economia digital, com forte ligação ao Instituto Politécnico de Bragança.', desc_es: 'Incubadora de base tecnológica centrada en software, IoT y economía digital, con fuerte vínculo con el Instituto Politécnico de Bragança.',
      areas: ['Transformação digital', 'Software', 'IoT'], services: ['Cowork', 'Mentoria técnica'], phone: '+351 273 300 300', email: 'info@bragancadigital.pt', website: 'https://bragancadigital.pt',
      locs: [['Bragança', 'Campus de Santa Apolónia', '+351 273 300 300', 'geral@bragancadigital.pt']], created: '2024-01-18 09:00:00' }, { name: 'Luís Fernandes', email: 'info@bragancadigital.pt' });
    const verin = entity({ type: 'incubadora', name: 'Viveiro de Empresas de Verín', year: 2008, startups: 18,
      desc_pt: 'Viveiro de empresas da Galiza orientado ao setor agroalimentar e ao turismo termal, com apoio à internacionalização transfronteiriça.', desc_es: 'Vivero de empresas de Galicia orientado al sector agroalimentario y al turismo termal, con apoyo a la internacionalización transfronteriza.',
      areas: ['Desenvolvimento rural', 'Agroalimentar', 'Turismo'], services: ['Acompanhamento', 'Acesso a financiamento'], phone: '+34 988 410 000', email: 'viveiro@verin.gal', website: 'https://verin.gal',
      locs: [['Verín', 'Polígono de Pazos', '+34 988 410 000', 'viveiro@verin.gal']], created: '2024-02-10 09:00:00' }, { name: 'Iria Domínguez', email: 'viveiro@verin.gal' });

    // ---- Agentes de desenvolvimento ----
    const adrat = entity({ type: 'agente', name: 'Associação de Desenvolvimento da Região do Alto Tâmega', short: 'ADRAT', logo: '/img/seed/adrat.png', year: 1991,
      desc_pt: 'A Associação de Desenvolvimento da Região do Alto Tâmega (ADRAT) é uma agência de desenvolvimento criada pela dinâmica e vontade das principais instituições do Alto Tâmega.', desc_es: 'La Asociación de Desarrollo de la Región del Alto Tâmega (ADRAT) es una agencia de desarrollo creada por la dinámica y voluntad de las principales instituciones del Alto Tâmega.',
      support_pt: 'Apoio técnico a promotores, candidaturas a fundos comunitários, animação territorial e cooperação transfronteiriça.', support_es: 'Apoyo técnico a promotores, candidaturas a fondos comunitarios, dinamización territorial y cooperación transfronteriza.',
      areas: ['Desenvolvimento rural', 'Desenvolvimento sustentável', 'Agricultura', 'Transformação digital'], phone: '+351 276 123 123', email: 'geral@adrat.pt', website: 'https://www.adrat.pt',
      socials: [{ net: 'Facebook', url: 'https://facebook.com/adrat.altotamega' }, { net: 'LinkedIn', url: 'https://linkedin.com/company/adrat' }], person: 'Ana Ferreira',
      locs: [['Chaves', 'Rua de Cima 215', '+351 276 123 123', 'geral@adrat.pt']], created: '2024-01-10 09:00:00' }, { name: 'Ana Ferreira', email: 'geral@adrat.pt' });
    const corane = entity({ type: 'agente', name: 'CORANE — Associação de Desenvolvimento dos Concelhos da Raia Nordestina', short: 'CORANE', year: 1995,
      desc_pt: 'A CORANE promove o desenvolvimento integrado dos concelhos da raia nordestina, dinamizando projetos de cooperação transfronteiriça e de valorização do território.', desc_es: 'CORANE promueve el desarrollo integrado de los municipios de la raya nordeste, dinamizando proyectos de cooperación transfronteriza y de valorización del territorio.',
      areas: ['Desenvolvimento rural', 'Cooperação transfronteiriça', 'Agricultura'], phone: '+351 273 320 000', email: 'corane@corane.pt', website: 'https://www.corane.pt',
      locs: [['Bragança', 'Largo do Toural, Bragança']], created: '2024-01-22 09:00:00' }, { name: 'Carlos Pires', email: 'corane@corane.pt' });
    const aect = entity({ type: 'agente', name: 'Eurocidade Chaves–Verín AECT', short: 'Eurocidade', logo: '/img/seed/aect.png', year: 2013,
      desc_pt: 'O Agrupamento Europeu de Cooperação Territorial Eurocidade Chaves–Verín gere serviços conjuntos e projetos comuns entre as duas cidades e é o chefe de fila do projeto INCUBTRANS.', desc_es: 'La Agrupación Europea de Cooperación Territorial Eurociudad Chaves–Verín gestiona servicios conjuntos y proyectos comunes entre ambas ciudades y es jefe de fila del proyecto INCUBTRANS.',
      areas: ['Cooperação transfronteiriça', 'Cidadania', 'Mobilidade'], phone: '+34 988 414 000', email: 'info@eurocidadechavesverin.eu', website: 'https://www.eurocidadechavesverin.eu',
      locs: [['Verín', 'Praza do Concello, Verín'], ['Chaves', 'Praça de Camões, Chaves']], created: '2024-01-12 09:00:00' }, { name: 'Gabinete Eurocidade', email: 'info@eurocidadechavesverin.eu' });

    // ---- Contas pendentes / suspensas para a demonstração da gestão ----
    entity({ type: 'empresa', name: 'Queijaria do Barroso', cat: 'Agroalimentar', nif: 'PT516777888', desc_pt: 'Queijos de cabra e ovelha do Barroso.', phone: '+351 276 500 100', email: 'geral@queijariabarroso.pt', website: 'https://queijariabarroso.pt', locs: [['Montalegre', 'Rua Direita 8']], created: '2026-10-02 10:00:00' }, { name: 'João Barroso', email: 'geral@queijariabarroso.pt', status: 'pendente' });
    entity({ type: 'empresa', name: 'Agro Verín S.L.', cat: 'Agroalimentar', nif: 'ESB32999888', desc_es: 'Hortalizas y conservas de la comarca de Verín.', phone: '+34 988 400 200', email: 'info@agroverin.es', website: 'https://agroverin.es', locs: [['Verín', 'Rúa Maior 20']], created: '2026-10-03 10:00:00' }, { name: 'Marta Lorenzo', email: 'info@agroverin.es', status: 'pendente' });
    entity({ type: 'incubadora', name: 'StartUp Ourense', desc_es: 'Aceleradora de startups de la provincia de Ourense.', areas: ['Tecnologia'], phone: '+34 988 300 300', email: 'ola@startupourense.gal', website: 'https://startupourense.gal', locs: [['Ourense', 'Rúa do Paseo 5']], created: '2026-10-05 10:00:00' }, { name: 'Brais Castro', email: 'ola@startupourense.gal', status: 'pendente' });
    entity({ type: 'agente', name: 'Associação Terras de Montalegre', desc_pt: 'Associação de desenvolvimento local do concelho de Montalegre.', areas: ['Desenvolvimento rural'], phone: '+351 276 510 000', email: 'geral@terrasmontalegre.pt', website: 'https://terrasmontalegre.pt', locs: [['Montalegre', 'Praça do Município']], created: '2026-10-06 10:00:00' }, { name: 'Rosa Dias', email: 'geral@terrasmontalegre.pt', status: 'pendente' });
    entity({ type: 'empresa', name: 'Fumeiro de Vinhais', cat: 'Agroalimentar', nif: 'PT517000111', desc_pt: 'Enchidos tradicionais de Vinhais.', phone: '+351 273 700 000', email: 'geral@fumeirovinhais.pt', website: 'https://fumeirovinhais.pt', locs: [['Vinhais', 'Rua Nova 3']], created: '2024-05-02 10:00:00' }, { name: 'Pedro Alves', email: 'geral@fumeirovinhais.pt', status: 'suspensa', reason: 'Contactos publicados não correspondem à empresa (denúncia confirmada).' });

    // ---- Produtos e serviços ----
    const offer = (o) => Number(run(`INSERT INTO offers(entity_id, kind, slug, title_pt, title_es, desc_pt, desc_es, category_id, tags, price_cents, price_type, images, status, featured_until, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, o.e, o.kind, slugify(o.pt), o.pt, o.es || null, o.dpt, o.des || null, C[o.cat], JSON.stringify(o.tags), o.price ?? null, o.pt_type || 'fixo',
      JSON.stringify(o.img ? [o.img] : []), o.status || 'ativo', o.featured || null, o.date).lastInsertRowid);
    const futureFeat = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 19).replace('T', ' ');
    const pastel = offer({ e: norpastel, kind: 'produto', pt: 'Pastel de Chaves', es: 'Pastel de Chaves', cat: 'Agroalimentar', tags: ['Pastel', 'Carne', 'IGP'], price: 2050, img: '/img/seed/pastel.png', featured: futureFeat, date: '2026-09-15 10:00:00',
      dpt: 'Iguaria da cidade de Chaves e uma das riquezas gastronómicas da região. Massa folhada estaladiça, preparada à base de carne de vitela. Caixa de 10 unidades.', des: 'Manjar de la ciudad de Chaves y una de las riquezas gastronómicas de la región. Hojaldre crujiente, elaborado a base de carne de ternera. Caja de 10 unidades.' });
    offer({ e: tech, kind: 'servico', pt: 'Consultoria em Transformação Digital', es: 'Consultoría en Transformación Digital', cat: 'Tecnologia', tags: ['Digital', 'TI', 'Inovação'], price: null, pt_type: 'consulta', img: '/img/seed/consultoria.jpg', featured: futureFeat, date: '2026-09-20 10:00:00',
      dpt: 'A consultoria em transformação digital ajuda organizações a usar a tecnologia para criar novos modelos de negócio, otimizar processos e melhorar a experiência do cliente.', des: 'La consultoría en transformación digital ayuda a las organizaciones a usar la tecnología para crear nuevos modelos de negocio, optimizar procesos y mejorar la experiencia del cliente.' });
    const vinho = offer({ e: quinta, kind: 'produto', pt: 'Vinho Valpaços Branco', es: 'Vino Valpaços Blanco', cat: 'Vinhos e bebidas', tags: ['Vinho', 'Branco', 'Trás-os-Montes'], price: 1500, pt_type: 'negociavel', img: '/img/seed/vinho.png', date: '2026-09-10 10:00:00',
      dpt: 'Os vinhos produzidos em Valpaços já podem ser encontrados em quase todo o mercado europeu, no Brasil, nos Estados Unidos e em Angola. Branco seco e elegante.', des: 'Los vinos producidos en Valpaços ya pueden encontrarse en casi todo el mercado europeo, en Brasil, Estados Unidos y Angola. Blanco seco y elegante.' });
    offer({ e: termas, kind: 'servico', pt: 'Tour Termal Verín–Chaves', es: 'Tour Termal Verín–Chaves', cat: 'Turismo', tags: ['Turismo', 'Termal', 'Experiência'], price: 12000, img: '/img/seed/termal.jpg', date: '2026-09-05 10:00:00',
      dpt: 'A Rota Termal e da Água Verín–Chaves–Vidago percorre o Vale do Alto Tâmega, entre o Norte de Portugal e o sudeste da Galiza. Inclui visita a três balneários e almoço.', des: 'La Ruta Termal y del Agua Verín–Chaves–Vidago recorre el Valle del Alto Tâmega, entre el Norte de Portugal y el sureste de Galicia. Incluye visita a tres balnearios y comida.' });
    offer({ e: coop, kind: 'produto', pt: 'Castanha da Terra Fria DOP', es: 'Castaña de la Terra Fria DOP', cat: 'Agroalimentar', tags: ['Castanha', 'DOP', 'Bio'], price: 890, date: '2026-08-28 10:00:00',
      dpt: 'Castanha de qualidade superior cultivada nos soutos da Terra Fria Transmontana, com denominação de origem protegida e sabor doce inconfundível. Saco de 1 kg.', des: 'Castaña de calidad superior cultivada en los sotos de la Terra Fria Transmontana, con denominación de origen protegida y sabor dulce inconfundible. Bolsa de 1 kg.' });
    offer({ e: coop, kind: 'produto', pt: 'Mel do Parque Natural de Montesinho', cat: 'Agroalimentar', tags: ['Mel', 'DOP'], price: 650, date: '2026-08-20 10:00:00',
      dpt: 'Mel de urze e castanheiro, com denominação de origem protegida, produzido no Parque Natural de Montesinho. Frasco de 500 g.' });
    offer({ e: olival, kind: 'produto', pt: 'Azeite Virgem Extra de Trás-os-Montes', es: 'Aceite Virgen Extra de Trás-os-Montes', cat: 'Agroalimentar', tags: ['Azeite', 'DOP', 'Artesanal'], price: 1200, date: '2026-08-15 10:00:00',
      dpt: 'Azeite virgem extra de produção artesanal, extraído a frio de olivais centenários de Trás-os-Montes. Frutado intenso e baixa acidez. Garrafa de 750 ml.', des: 'Aceite de oliva virgen extra de producción artesanal, extraído en frío de olivares centenarios de Trás-os-Montes. Frutado intenso y baja acidez. Botella de 750 ml.' });
    offer({ e: artesa, kind: 'produto', pt: 'Cântaro de barro negro de Bisalhães', es: 'Cántaro de barro negro de Bisalhães', cat: 'Artesanato', tags: ['Olaria', 'UNESCO', 'Feito à mão'], price: 4500, date: '2026-07-30 10:00:00',
      dpt: 'Peça de olaria negra cozida em soenga, segundo a técnica tradicional de Bisalhães. Cada peça é única.', des: 'Pieza de alfarería negra cocida en soenga, según la técnica tradicional de Bisalhães. Cada pieza es única.' });
    offer({ e: artesa, kind: 'servico', pt: 'Workshop de olaria tradicional', es: 'Taller de alfarería tradicional', cat: 'Cultura e lazer', tags: ['Workshop', 'Olaria'], price: 3500, date: '2026-07-25 10:00:00',
      dpt: 'Sessão de 3 horas na oficina, com introdução à roda de oleiro e à cozedura em soenga. Grupos até 8 pessoas.', des: 'Sesión de 3 horas en el taller, con introducción al torno de alfarero y a la cocción en soenga. Grupos de hasta 8 personas.' });
    offer({ e: tech, kind: 'servico', pt: 'Criação de lojas online para produtores', es: 'Creación de tiendas online para productores', cat: 'Serviços às empresas', tags: ['Digital', 'Comércio eletrónico'], price: 90000, pt_type: 'negociavel', date: '2026-07-10 10:00:00',
      dpt: 'Desenho e implementação de loja online para pequenos produtores, com formação incluída.', des: 'Diseño e implantación de tienda online para pequeños productores, con formación incluida.' });
    offer({ e: termas, kind: 'servico', pt: 'Passeio guiado pela Raia Seca', es: 'Paseo guiado por la Raia Seca', cat: 'Turismo', tags: ['Natureza', 'Raia'], price: null, pt_type: 'gratis', date: '2026-06-30 10:00:00',
      dpt: 'Passeio pedestre gratuito, no primeiro sábado de cada mês, pelos caminhos da antiga fronteira entre Chaves e Verín.', des: 'Paseo a pie gratuito, el primer sábado de cada mes, por los caminos de la antigua frontera entre Chaves y Verín.' });
    offer({ e: norpastel, kind: 'produto', pt: 'Folar de Chaves', es: 'Folar de Chaves', cat: 'Agroalimentar', tags: ['Folar', 'Páscoa'], price: 1800, date: '2026-04-01 10:00:00', status: 'inativo',
      dpt: 'Folar tradicional de carnes, disponível na época da Páscoa.' });
    offer({ e: quinta, kind: 'produto', pt: 'Vinho Valpaços Tinto Reserva', es: 'Vino Valpaços Tinto Reserva', cat: 'Vinhos e bebidas', tags: ['Vinho', 'Tinto', 'Reserva'], price: 2200, date: '2026-06-12 10:00:00',
      dpt: 'Tinto encorpado, estagiado 12 meses em barrica de carvalho.', des: 'Tinto con cuerpo, con 12 meses de crianza en barrica de roble.' });
    run(`INSERT INTO highlight_requests(offer_id, status, created_at, decided_at) VALUES (?, 'aprovado', '2026-09-24 10:00:00', '2026-09-25 10:00:00')`, pastel);
    run(`INSERT INTO highlight_requests(offer_id, status, created_at) VALUES (?, 'pendente', '2026-10-10 10:00:00')`, vinho);

    // ---- Programas, empresas incubadas, projetos, eventos ----
    const prog = (e, n, d, s, m) => run('INSERT INTO programs(entity_id, name, description, status, duration_months) VALUES (?,?,?,?,?)', e, n, d, s, m);
    prog(brig, 'Rural Innovation Center', 'Incubação especializada em AgTech e desenvolvimento rural sustentável, com foco na inovação para o interior.', 'ativo', 12);
    prog(brig, 'Programa de Aceleração TI', 'Programa de 6 meses para startups tecnológicas em fase inicial, com mentoria e acesso a financiamento.', 'ativo', 6);
    prog(brig, 'Bootcamp Agro 2024', 'Programa intensivo de validação de ideias agroalimentares.', 'terminado', 2);
    prog(incub, 'Incubação Empresarial', 'Apoio à criação e consolidação de empresas no território transfronteiriço durante 12 meses.', 'ativo', 12);
    prog(incub, 'Soft-landing Raia', 'Instalação temporária de empresas do outro lado da fronteira, com acompanhamento.', 'ativo', 3);
    prog(bdig, 'Pré-incubação Tech', 'Validação de ideias e desenvolvimento de MVP para fundadores em fase inicial.', 'ativo', 4);
    prog(verin, 'Agro-Incuba', 'Apoio especializado a projetos agroalimentares e de economia circular.', 'ativo', 10);
    const inc = (e, n, d, y, a, w) => run('INSERT INTO incubated(entity_id, name, description, year, area, website) VALUES (?,?,?,?,?,?)', e, n, d, y, a, w);
    inc(brig, 'Lumera', 'Iluminação inteligente para espaços públicos.', 2022, 'Tecnologia', 'https://www.lumera.pt'); inc(brig, 'AgriNova', 'Sensores para agricultura de precisão.', 2023, 'AgTech', 'https://www.agrinova.pt');
    inc(brig, 'BiteCode', 'Software para restauração.', 2021, 'Software', 'https://www.bitecode.pt'); inc(brig, 'Verdal', 'Cosmética natural com plantas de Montesinho.', 2024, 'Cosmética', 'https://www.verdal.pt');
    inc(incub, 'Verín Foods', 'Conservas gourmet da Raia.', 2024, 'Agroalimentar', null); inc(incub, 'TâmegaTech', 'Serviços de IoT para municípios.', 2024, 'Tecnologia', 'https://tamegatech.pt'); inc(incub, 'Raia Digital', 'Marketing digital para PME rurais.', 2025, 'Serviços', null);
    inc(bdig, 'Codewave', 'Desenvolvimento de software à medida.', 2019, 'Software', 'https://codewave.pt'); inc(bdig, 'SensorIQ', 'Monitorização ambiental.', 2021, 'IoT', null);
    inc(verin, 'Termalia', 'Cosmética termal.', 2020, 'Saúde e bem-estar', null); inc(verin, 'Hortagal', 'Horticultura biológica.', 2022, 'Agroalimentar', null);
    const proj = (e, n, d, s, a, b, p, w) => run('INSERT INTO projects(entity_id, name, description, status, start_date, end_date, partners, website) VALUES (?,?,?,?,?,?,?,?)', e, n, d, s, a, b, p, w);
    proj(adrat, 'INCUBTRANS', 'Incubadora Transfronteiriça da Eurorregião Galiza–Norte de Portugal — Interreg VI-A Espanha–Portugal (POCTEP) 2021–2027.', 'ativo', '2023-01-01', '2026-12-31', 'Eurocidade Chaves–Verín (chefe de fila), ADRAT, Fundación Galicia Europa, ANJE, Universidade de Vigo, IPB, AJE Galicia', 'https://www.incubtrans.eu');
    proj(adrat, 'COOPERA+', 'Rede de cooperação entre agentes económicos do Alto Tâmega e da Galiza.', 'ativo', '2024-03-01', '2027-02-28', 'ADRAT, Concello de Verín', null);
    proj(adrat, 'Alto Tâmega Rural 2020', 'Estratégia de desenvolvimento local de base comunitária.', 'terminado', '2016-01-01', '2023-06-30', 'ADRAT, municípios do Alto Tâmega', null);
    proj(corane, 'RAIA VIVA', 'Programa de valorização do património natural e cultural da raia transfronteiriça nordestina.', 'ativo', '2024-01-01', '2026-12-31', 'CORANE, Diputación de Zamora', null);
    proj(aect, 'INCUBTRANS', 'Chefe de fila do projeto de incubação transfronteiriça da Eurorregião Galiza–Norte de Portugal.', 'ativo', '2023-01-01', '2026-12-31', 'ADRAT, Fundación Galicia Europa, ANJE, Universidade de Vigo, IPB, AJE Galicia', 'https://www.incubtrans.eu');
    const post = (e, k, t, b, d, pl) => run('INSERT INTO posts(entity_id, kind, title, body, date, place) VALUES (?,?,?,?,?,?)', e, k, t, b, d, pl);
    post(brig, 'evento', 'Demo Day Rural Innovation 2026', 'Apresentação dos projetos incubados a investidores e parceiros.', '2026-11-20', 'Brigantia EcoPark, Bragança');
    post(brig, 'noticia', 'Brigantia EcoPark recebe 12 novas startups', 'A nova edição do programa de aceleração arrancou com 12 equipas dos dois lados da fronteira.', '2026-09-30', null);
    post(incub, 'evento', 'Encontro transfronteiriço de empreendedores', 'Sessão de networking entre empresas incubadas em Chaves e Verín.', '2026-11-06', 'Chaves');
    post(adrat, 'evento', 'Sessão de esclarecimento: apoios ao investimento rural', 'Apresentação dos apoios abertos para pequenas empresas do Alto Tâmega.', '2026-10-28', 'ADRAT, Chaves');
    post(adrat, 'noticia', 'ADRAT reforça cooperação com a Galiza', 'Assinado protocolo com o Concello de Verín para o projeto COOPERA+.', '2026-09-12', null);
    post(aect, 'noticia', 'Eurocidade lança cartão de cidadão eurocidadão 2026', 'Novos serviços partilhados entre Chaves e Verín.', '2026-09-01', null);

    // ---- Avaliações e denúncias ----
    const { emailHash } = require('./lib/security');
    run(`INSERT INTO reviews(entity_id, rating, comment, author_name, email_hash, status, reply, reply_at, created_at) VALUES (?,5,?,?,?,'publicada',?,?,?)`, norpastel, 'Os melhores pastéis de Chaves! Atendimento simpático e resposta rápida ao email.', 'Joana M.', emailHash('joana@example.com'), 'Muito obrigado, Joana! Esperamos vê-la em breve.', '2026-09-20 12:00:00', '2026-09-18 12:00:00');
    run(`INSERT INTO reviews(entity_id, rating, comment, author_name, email_hash, status, created_at) VALUES (?,4,?,?,?,'publicada',?)`, norpastel, 'Muito bons, recomendo.', 'Xosé', emailHash('xose@example.com'), '2026-09-25 12:00:00');
    const badRev = Number(run(`INSERT INTO reviews(entity_id, rating, comment, author_name, email_hash, status, created_at) VALUES (?,1,?,?,?,'publicada',?)`, quinta, 'Compre já em www.vinhos-baratos-xyz.com!!!', 'Promo', emailHash('spam@example.com'), '2026-10-08 12:00:00').lastInsertRowid);
    run(`INSERT INTO reviews(entity_id, rating, comment, author_name, email_hash, status, created_at) VALUES (?,5,?,?,?,'publicada',?)`, termas, 'Experiência fantástica, guia excelente.', 'Laura', emailHash('laura@example.com'), '2026-09-02 12:00:00');
    run(`INSERT INTO reports(target_type, target_id, reason, details, created_at) VALUES ('avaliacao', ?, 'spam', 'Publicidade a outro site.', '2026-10-09 09:00:00')`, badRev);
    run(`INSERT INTO reports(target_type, target_id, reason, details, created_at) VALUES ('oferta', ?, 'falso', 'O preço indicado não corresponde ao praticado.', '2026-10-11 09:00:00')`, vinho);

    // ---- Estatísticas de demonstração (90 dias) ----
    const r = rng(42);
    const channels = ['telefone', 'email', 'website', 'redes'];
    const offers = all(`SELECT id, entity_id FROM offers WHERE status = 'ativo'`);
    const ents = all('SELECT id FROM entities');
    const ins = db.prepare('INSERT INTO stats(entity_id, offer_id, type, channel, created_at) VALUES (?,?,?,?,?)');
    for (let d = 90; d >= 1; d--) {
      const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      for (const e of ents) {
        const v = Math.floor(r() * 5);
        for (let i = 0; i < v; i++) ins.run(e.id, null, 'view', null, `${day} 1${Math.floor(r() * 9)}:00:00`);
        if (r() < 0.25) ins.run(e.id, null, 'contact', channels[Math.floor(r() * 4)], `${day} 15:00:00`);
      }
      for (const o of offers) {
        const v = Math.floor(r() * 6);
        for (let i = 0; i < v; i++) ins.run(o.entity_id, o.id, 'view', null, `${day} 1${Math.floor(r() * 9)}:30:00`);
        if (r() < 0.22) ins.run(o.entity_id, o.id, 'contact', channels[Math.floor(r() * 4)], `${day} 16:00:00`);
      }
    }
    run(`INSERT INTO audit(user_email, action, target, details, created_at) VALUES ('sistema','seed','base de dados','Dados de demonstração carregados', datetime('now'))`);
  });
}

function isEmpty() { return get('SELECT COUNT(*) n FROM users').n === 0; }

if (require.main === module) {
  if (process.argv.includes('--reset')) {
    db.close();
    for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm']) fs.rmSync(f, { force: true });
    // reabre com o esquema limpo
    delete require.cache[require.resolve('./db')];
    delete require.cache[require.resolve('./lib/security')];
    delete require.cache[require.resolve('./seed')];
    const again = require('./seed');
    again.seed();
  } else if (isEmpty()) seed();
  console.log('Base de dados pronta:', DB_FILE);
}

module.exports = { seed, isEmpty };
