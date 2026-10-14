// Textos da interface em português e espanhol.
// Para acrescentar outro idioma (ex.: galego, inglês), basta adicionar um objeto com as mesmas chaves
// e incluir o código em LANGS; as chaves em falta caem para português.
const LANGS = ['pt', 'es'];

const pt = {
  site: { name: 'Marketplace INCUBTRANS', tagline: 'Montra digital da Eurorregião Galiza–Norte de Portugal' },
  nav: { home: 'Início', produtos: 'Produtos & Serviços', incubadoras: 'Incubadoras', agentes: 'Agentes de Desenvolvimento', mapa: 'Mapa', entrar: 'Entrar / Registar', area: 'Área Pessoal', sair: 'Sair', menu: 'Menu', gestao: 'Gestão' },
  hero: {
    title: 'Descubra produtos únicos e ligue-se a produtores locais',
    sub: 'Marketplace onde empresas promovem os seus produtos e serviços, incubadoras partilham conhecimento e agentes de desenvolvimento dinamizam o ecossistema territorial transfronteiriço.',
    searchPh: 'Pesquisar produtos, serviços, empresas, incubadoras, agentes ou localidades…',
    cta1: 'Explorar Produtos e Serviços', cta2: 'Conhecer Incubadoras', cta3: 'Conhecer Agentes de Desenvolvimento',
  },
  stats: { produtos: 'Produtos & Serviços', empresas: 'Empresas', incubadoras: 'Incubadoras', territorios: 'Concelhos / concellos cobertos' },
  home: {
    categoriasT: 'Categorias em destaque', categoriasS: 'Explore a oferta do território por setor',
    destaqueT: 'Produtos e serviços em destaque', destaqueS: 'Promovidos por empresas locais',
    recentesT: 'Produtos e serviços recentes', recentesS: 'As últimas novidades das empresas da região',
    incubT: 'Incubadoras', incubS: 'Apoio ao desenvolvimento de startups e inovação',
    agentT: 'Agentes de Desenvolvimento', agentS: 'Apoio ao desenvolvimento da região',
    mapaT: 'Mapa do território', mapaS: 'Empresas, incubadoras e agentes de desenvolvimento da Eurorregião',
    ctaEmpresaT: 'Registe a sua empresa', ctaEmpresaS: 'Divulgue os seus produtos e serviços em toda a Eurorregião, sem custos e sem intermediários.',
    ctaIncubT: 'Descubra as incubadoras da região', ctaIncubS: 'Programas de incubação, aceleração e apoio a novos negócios dos dois lados da fronteira.',
  },
  btn: {
    verTodos: 'Ver todos', verDetalhes: 'Ver detalhes', verCompleto: 'Ver detalhes completos', contactar: 'Contactar', telefonar: 'Telefonar', email: 'Email', website: 'Website',
    guardar: 'Guardar', guardarAlt: 'Guardar alterações', cancelar: 'Cancelar', eliminar: 'Eliminar', editar: 'Editar', adicionar: 'Adicionar', voltar: 'Voltar',
    pesquisar: 'Pesquisar', filtrar: 'Aplicar filtros', limpar: 'Limpar filtros', entrar: 'Entrar', registar: 'Criar conta', recuperar: 'Recuperar password', enviar: 'Enviar',
    ativar: 'Ativar', desativar: 'Desativar', confirmar: 'Confirmar', denunciar: 'Denunciar', responder: 'Responder', avaliar: 'Avaliar esta empresa', pedirDestaque: 'Pedir destaque',
    exportar: 'Exportar os meus dados', eliminarConta: 'Eliminar conta', aceitarTodos: 'Aceitar todos', rejeitar: 'Só necessários', configurar: 'Configurar', ativarMapa: 'Permitir mapas e ver o mapa',
  },
  lbl: {
    produto: 'Produto', servico: 'Serviço', destaque: 'Destaque', negociavel: 'Negociável', consulta: 'Sob consulta', gratis: 'Gratuito', verificado: 'Verificado', verificadoEm: 'Verificado em',
    especializacoes: 'Áreas de especialização', areasAtuacao: 'Áreas de atuação', servicos: 'Serviços prestados', programas: 'Programas disponíveis', projetos: 'Projetos',
    incubadas: 'Empresas incubadas', eventos: 'Eventos e notícias', evento: 'Evento', noticia: 'Notícia', localizacoes: 'Localizações', contactos: 'Contactos', redes: 'Redes sociais',
    pessoaContacto: 'Pessoa de contacto', desde: 'Desde', startups: 'startups', meses: 'meses', programasAtivos: 'Programas ativos', anosExp: 'Anos de experiência', startupsInc: 'Startups incubadas',
    projetosAtivos: 'Projetos ativos', parceiros: 'Parceiros', periodo: 'Período',
    ordenar: 'Ordenar por', recentes: 'Mais recentes', antigos: 'Mais antigos', nomeAZ: 'Nome (A–Z)', precoAsc: 'Preço (menor)', precoDesc: 'Preço (maior)', melhorAvaliadas: 'Melhor avaliadas',
    resultados: 'resultados', resultado: 'resultado', semResultados: 'Não encontrámos resultados com estes critérios.', tipo: 'Tipo', todos: 'Todos', categoria: 'Categoria', area: 'Área',
    localizacao: 'Localização', pais: 'País', grelha: 'Grelha', lista: 'Lista', publicado: 'Publicado em', tags: 'Etiquetas', infoVendedor: 'Informações da empresa', infoContacto: 'Contactos diretos',
    verEmpresa: 'Ver página da empresa', relacionados: 'Produtos e serviços relacionados', avaliacoes: 'Avaliações', avaliacao: 'avaliação', semAvaliacoes: 'Esta empresa ainda não tem avaliações.',
    respostaEmpresa: 'Resposta da empresa', ofertaEmpresa: 'Produtos e serviços', setor: 'Setor', missao: 'Missão', apoio: 'Apoio especializado', pagina: 'Página', de: 'de',
    anterior: 'Anterior', seguinte: 'Seguinte', ativo: 'Ativo', inativo: 'Inativo', terminado: 'Terminado', pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada', suspensa: 'Suspensa',
    empresa: 'Empresa', incubadora: 'Incubadora', agente: 'Agente de Desenvolvimento', admin: 'Administrador', obrigatorio: 'obrigatório', opcional: 'opcional', semDados: 'Sem dados para mostrar.',
    visualizacoes: 'Visualizações', contactosN: 'Contactos', taxaContacto: 'Taxa de contacto', original: 'Conteúdo disponível apenas no idioma original.',
    capturaT: 'Verificação anti-spam', capturaQ: 'Quanto é', ultimos: 'Últimos', dias: 'dias', ano: 'Ano', website: 'Website',
  },
  map: { title: 'Mapa', sub: 'Vista geográfica de empresas, incubadoras e agentes de desenvolvimento', consentT: 'O mapa usa um serviço externo', consentS: 'Os mosaicos do mapa são carregados a partir do OpenStreetMap. Para os ver, permita os cookies e serviços de mapas.', tipos: 'Tipo de entidade', abrir: 'Abrir página', entidades: 'entidades no mapa', lista: 'Entidades listadas' },
  auth: {
    loginT: 'Aceder à sua Área Pessoal', loginS: 'Inicie sessão para gerir o seu perfil, conteúdos e estatísticas.', email: 'Email', password: 'Password', esqueceu: 'Esqueceu a password?', semConta: 'Ainda não tem conta?', registe: 'Registe a sua entidade',
    erroLogin: 'Email ou password incorretos.', bloqueado: 'Demasiadas tentativas. Tente novamente dentro de alguns minutos.', naoVerificado: 'Confirme primeiro o seu email. Reenviámos a ligação de confirmação.',
    rejeitada: 'O registo desta conta foi rejeitado.', suspensa: 'Esta conta está suspensa. Contacte a equipa INCUBTRANS.', motivo: 'Motivo',
    registoT: 'Registo de entidade', registoS: 'Escolha o perfil, preencha os dados e confirme o seu email. A conta fica pendente até ser validada pela equipa INCUBTRANS.',
    perfil: 'Perfil', perfilEmpresa: 'Empresa / Vendedor', perfilEmpresaD: 'Microempresa, PME, produtor local ou prestador de serviços', perfilIncub: 'Incubadora / Instituição', perfilIncubD: 'Estrutura de apoio ao empreendedorismo', perfilAgente: 'Agente de Desenvolvimento', perfilAgenteD: 'Entidade de desenvolvimento territorial',
    nomeResp: 'O seu nome', nomeEntidade: 'Nome da entidade', nif: 'NIF / CIF', confirmPass: 'Confirmar password', politicaPass: 'Mínimo 8 caracteres, com letras e números.', aceito: 'Li e aceito os Termos e Condições e a Política de Privacidade.',
    registoOkT: 'Confirme o seu email', registoOkS: 'Enviámos uma ligação de confirmação para {email}. Depois de confirmar, a equipa INCUBTRANS irá validar a sua conta.',
    verificadoOkT: 'Email confirmado', verificadoOkS: 'Obrigado. A sua conta fica agora a aguardar validação pela equipa INCUBTRANS. Será notificado por email.', tokenInvalido: 'Esta ligação é inválida ou já expirou.',
    recuperarT: 'Recuperar password', recuperarS: 'Indique o email da conta. Se existir, enviamos uma ligação para definir nova password.', recuperarOk: 'Se o email estiver registado, receberá uma ligação dentro de instantes.',
    novaPassT: 'Definir nova password', novaPassOk: 'Password alterada. Já pode entrar.',
    errNome: 'Indique o nome.', errEmail: 'Indique um email válido.', errEmailExiste: 'Já existe uma conta com este email.', errPass: 'A password deve ter pelo menos 8 caracteres, com letras e números.', errPassIgual: 'As passwords não coincidem.', errTermos: 'Tem de aceitar os termos.', errCaptcha: 'A verificação anti-spam está errada.', errPerfil: 'Escolha um perfil.', errLimite: 'Demasiados pedidos. Tente mais tarde.',
  },
  review: {
    title: 'Avaliar esta empresa', sub: 'Não precisa de conta. Enviamos uma ligação para o seu email para confirmar a avaliação. O email não é publicado.', nota: 'Classificação', comentario: 'Comentário', nome: 'Nome a mostrar', email: 'O seu email',
    enviadaT: 'Confirme a sua avaliação', enviadaS: 'Enviámos uma ligação para o seu email. A avaliação só é publicada depois de confirmada.', jaExiste: 'Já existe uma avaliação deste email para esta empresa.', confirmadaT: 'Avaliação publicada', confirmadaS: 'Obrigado pela sua avaliação.', anonimo: 'Visitante', errNota: 'Escolha uma classificação de 1 a 5.',
  },
  report: { title: 'Denunciar conteúdo', sub: 'Diga-nos o que está errado. A equipa INCUBTRANS analisa todas as denúncias.', motivo: 'Motivo', detalhes: 'Detalhes', motivos: { spam: 'Spam ou publicidade enganosa', improprio: 'Conteúdo impróprio ou ofensivo', falso: 'Informação falsa ou enganadora', direitos: 'Violação de direitos (imagens, marcas)', outro: 'Outro' }, ok: 'Obrigado. A denúncia foi registada e será analisada.' },
  area: {
    titulo: { empresa: 'Área da Empresa', incubadora: 'Área da Incubadora', agente: 'Área do Agente de Desenvolvimento' },
    sub: { empresa: 'Gerir os seus produtos e serviços', incubadora: 'Gerir programas, empresas incubadas e eventos', agente: 'Gerir projetos, áreas de atuação e eventos' },
    tabs: { dash: 'Painel', perfil: 'Perfil', ofertas: 'Produtos e Serviços', programas: 'Programas', incubadas: 'Empresas incubadas', projetos: 'Projetos', posts: 'Eventos e notícias', avaliacoes: 'Avaliações', stats: 'Estatísticas', conta: 'Conta e dados' },
    pendenteT: 'Conta a aguardar validação', pendenteS: 'O seu perfil ainda não é público. A equipa INCUBTRANS irá validar a conta e será notificado por email. Entretanto pode preencher o perfil e os conteúdos.',
    revalidarT: 'Selo "Verificado" em revisão', revalidarS: 'Alterou dados que exigem nova validação (nome, NIF ou morada). O selo volta a aparecer depois de revisto pela equipa.',
    verPublica: 'Ver página pública', totalOfertas: 'Produtos e serviços ativos', mediaAval: 'Avaliação média', recentes: 'Conteúdos recentes', nenhum: 'Ainda não há conteúdos.',
    novaOferta: 'Adicionar produto ou serviço', editarOferta: 'Editar produto ou serviço', tipo: 'Tipo', titulo_: 'Título', tituloEs: 'Título em espanhol', descricao: 'Descrição', descricaoEs: 'Descrição em espanhol', traducao: 'Tradução para espanhol (opcional)', traducaoPt: 'Tradução para português (opcional)',
    categoria: 'Categoria', escolher: 'Selecionar…', etiquetas: 'Etiquetas', etiquetasAj: 'Separadas por vírgulas, máximo 5.', preco: 'Preço (€)', tipoPreco: 'Tipo de preço', estado: 'Estado',
    imagens: 'Imagens', imagensAj: 'Até 5 imagens JPG, PNG ou WebP, máximo 2 MB cada. São redimensionadas automaticamente.', removerImg: 'Remover', confirmEliminar: 'Tem a certeza? Esta ação não pode ser anulada.',
    destaqueAtivo: 'Em destaque até', destaquePendente: 'Pedido de destaque em análise', destaqueRegra: 'O destaque dura 30 dias e cada empresa pode ter um destaque ativo ou pendente de cada vez.', destaquePedido: 'Pedido de destaque enviado ao administrador.', destaqueLimite: 'Já tem um destaque ativo ou pendente.',
    dadosEntidade: 'Dados da entidade', logo: 'Logótipo', capa: 'Imagem de destaque', ano: 'Ano de criação', setor: 'Setor de atividade', areas: 'Áreas', areasAj: 'Separadas por vírgulas.', servicos: 'Serviços', apoio: 'Descrição do tipo de apoio',
    contactos: 'Contactos', redes: 'Redes sociais', pessoa: 'Pessoa de contacto', pessoaPublica: 'Publicar a pessoa de contacto (tenho o consentimento dela)', localizacoes: 'Localizações', territorio: 'Concelho / concello', morada: 'Morada', coordenadas: 'Coordenadas (lat, lng)', coordAj: 'Opcional: se vazio, usa o centro do concelho.', addLocal: 'Adicionar localização',
    nome: 'Nome', descricao_: 'Descrição', duracao: 'Duração (meses)', inicio: 'Início', fim: 'Fim', parceiros: 'Parceiros', website: 'Website', ano_: 'Ano', area_: 'Área', data: 'Data', local: 'Local', texto: 'Texto', tipoPost: 'Tipo',
    guardado: 'Alterações guardadas.', eliminado: 'Eliminado.', criado: 'Criado com sucesso.', resposta: 'A sua resposta pública', denunciarAval: 'Denunciar avaliação',
    passAtual: 'Password atual', passNova: 'Nova password', passOk: 'Password alterada.', passErr: 'A password atual está errada.', idioma: 'Idioma preferido',
    exportarS: 'Descarregue todos os dados da sua conta e da sua entidade em formato JSON.', eliminarS: 'Elimina definitivamente a conta, o perfil público e todos os conteúdos. Esta ação não pode ser anulada.', eliminarConfirm: 'Escreva ELIMINAR para confirmar',
    porProduto: 'Por produto/serviço', porCategoria: 'Por categoria', porCanal: 'Contactos por canal', porDia: 'Visualizações e contactos por dia', perfilPub: 'Página pública',
    canais: { telefone: 'Telefone', email: 'Email', website: 'Website', redes: 'Redes sociais' },
  },
  admin: {
    titulo: 'Área de Administração', sub: 'Painel global de gestão da plataforma',
    tabs: { dash: 'Resumo', contas: 'Contas e validação', moderacao: 'Moderação', destaques: 'Destaques', categorias: 'Categorias', territorios: 'Localizações', paginas: 'Páginas', emails: 'Emails automáticos', stats: 'Estatísticas', mensagens: 'Mensagens', auditoria: 'Auditoria', caixa: 'Caixa de saída' },
  },
  cookies: { text: 'Usamos cookies necessários ao funcionamento do site. Com o seu consentimento, carregamos também o mapa (OpenStreetMap). Não usamos cookies de publicidade nem de analítica.', link: 'Política de Privacidade e Cookies', necessarios: 'Necessários (sempre ativos)', mapas: 'Mapas (OpenStreetMap)', guardar: 'Guardar preferências', gerir: 'Gerir cookies' },
  contact: {
    band: 'Contactos e Ajuda', bandSub: 'Fale com a equipa INCUBTRANS', title: 'Envie-nos uma mensagem', sub: 'Respondemos no prazo de 2 dias úteis, em português ou espanhol.', nome: 'Nome', email: 'Email', entidade: 'Empresa / Entidade', assunto: 'Assunto', mensagem: 'Mensagem',
    assuntos: ['Informação geral', 'Registo de empresa', 'Registo de incubadora ou agente', 'Apoio técnico na plataforma', 'Imprensa e comunicação'], rgpd: 'Aceito que os meus dados sejam usados apenas para responder a este pedido, de acordo com a Política de Privacidade.',
    erro: 'Preencha o nome, um email válido, a mensagem e aceite a Política de Privacidade.', okT: 'Mensagem enviada', okS: 'Obrigado pelo contacto. A equipa INCUBTRANS responderá para o email indicado.', faq: 'Perguntas frequentes', secretariado: 'Secretariado técnico', horario: 'Segunda a sexta, 9h00–17h00 (hora de Portugal)', parceiros: 'Parceiros do projeto',
  },
  foot: { sobre: 'Sobre', comoFunciona: 'Como funciona', contactos: 'Contactos e Ajuda', termos: 'Termos e Condições', privacidade: 'Privacidade e Cookies', funding: 'Desenvolvido no âmbito do projeto INCUBTRANS, cofinanciado pela União Europeia através do Programa Interreg VI-A Espanha–Portugal (POCTEP) 2021–2027.' },
  err: { notFoundT: 'Página não encontrada', notFoundS: 'A página que procura não existe ou foi removida.', forbiddenT: 'Acesso reservado', forbiddenS: 'Não tem permissão para aceder a esta página.', serverT: 'Ocorreu um erro', serverS: 'Tente novamente dentro de instantes.', csrf: 'A sessão expirou. Recarregue a página e tente de novo.', upload: 'Ficheiro inválido: use JPG, PNG ou WebP até 2 MB.' },
};

const es = {
  site: { name: 'Marketplace INCUBTRANS', tagline: 'Escaparate digital de la Eurorregión Galicia–Norte de Portugal' },
  nav: { home: 'Inicio', produtos: 'Productos y Servicios', incubadoras: 'Incubadoras', agentes: 'Agentes de Desarrollo', mapa: 'Mapa', entrar: 'Entrar / Registrarse', area: 'Área Personal', sair: 'Salir', menu: 'Menú', gestao: 'Gestión' },
  hero: {
    title: 'Descubre productos únicos y conecta con productores locales',
    sub: 'Marketplace donde las empresas promocionan sus productos y servicios, las incubadoras comparten conocimiento y los agentes de desarrollo dinamizan el ecosistema territorial transfronterizo.',
    searchPh: 'Buscar productos, servicios, empresas, incubadoras, agentes o localidades…',
    cta1: 'Explorar Productos y Servicios', cta2: 'Conocer Incubadoras', cta3: 'Conocer Agentes de Desarrollo',
  },
  stats: { produtos: 'Productos y Servicios', empresas: 'Empresas', incubadoras: 'Incubadoras', territorios: 'Concelhos / concellos cubiertos' },
  home: {
    categoriasT: 'Categorías destacadas', categoriasS: 'Explora la oferta del territorio por sector',
    destaqueT: 'Productos y servicios destacados', destaqueS: 'Promocionados por empresas locales',
    recentesT: 'Productos y servicios recientes', recentesS: 'Las últimas novedades de las empresas de la región',
    incubT: 'Incubadoras', incubS: 'Apoyo al desarrollo de startups e innovación',
    agentT: 'Agentes de Desarrollo', agentS: 'Apoyo al desarrollo de la región',
    mapaT: 'Mapa del territorio', mapaS: 'Empresas, incubadoras y agentes de desarrollo de la Eurorregión',
    ctaEmpresaT: 'Registra tu empresa', ctaEmpresaS: 'Da a conocer tus productos y servicios en toda la Eurorregión, sin costes y sin intermediarios.',
    ctaIncubT: 'Descubre las incubadoras de la región', ctaIncubS: 'Programas de incubación, aceleración y apoyo a nuevos negocios a ambos lados de la frontera.',
  },
  btn: {
    verTodos: 'Ver todos', verDetalhes: 'Ver detalles', verCompleto: 'Ver detalles completos', contactar: 'Contactar', telefonar: 'Llamar', email: 'Email', website: 'Web',
    guardar: 'Guardar', guardarAlt: 'Guardar cambios', cancelar: 'Cancelar', eliminar: 'Eliminar', editar: 'Editar', adicionar: 'Añadir', voltar: 'Volver',
    pesquisar: 'Buscar', filtrar: 'Aplicar filtros', limpar: 'Limpiar filtros', entrar: 'Entrar', registar: 'Crear cuenta', recuperar: 'Recuperar contraseña', enviar: 'Enviar',
    ativar: 'Activar', desativar: 'Desactivar', confirmar: 'Confirmar', denunciar: 'Denunciar', responder: 'Responder', avaliar: 'Valorar esta empresa', pedirDestaque: 'Solicitar destacado',
    exportar: 'Exportar mis datos', eliminarConta: 'Eliminar cuenta', aceitarTodos: 'Aceptar todas', rejeitar: 'Solo necesarias', configurar: 'Configurar', ativarMapa: 'Permitir mapas y ver el mapa',
  },
  lbl: {
    produto: 'Producto', servico: 'Servicio', destaque: 'Destacado', negociavel: 'Negociable', consulta: 'A consultar', gratis: 'Gratuito', verificado: 'Verificado', verificadoEm: 'Verificado el',
    especializacoes: 'Áreas de especialización', areasAtuacao: 'Áreas de actuación', servicos: 'Servicios prestados', programas: 'Programas disponibles', projetos: 'Proyectos',
    incubadas: 'Empresas incubadas', eventos: 'Eventos y noticias', evento: 'Evento', noticia: 'Noticia', localizacoes: 'Ubicaciones', contactos: 'Contactos', redes: 'Redes sociales',
    pessoaContacto: 'Persona de contacto', desde: 'Desde', startups: 'startups', meses: 'meses', programasAtivos: 'Programas activos', anosExp: 'Años de experiencia', startupsInc: 'Startups incubadas',
    projetosAtivos: 'Proyectos activos', parceiros: 'Socios', periodo: 'Periodo',
    ordenar: 'Ordenar por', recentes: 'Más recientes', antigos: 'Más antiguos', nomeAZ: 'Nombre (A–Z)', precoAsc: 'Precio (menor)', precoDesc: 'Precio (mayor)', melhorAvaliadas: 'Mejor valoradas',
    resultados: 'resultados', resultado: 'resultado', semResultados: 'No hemos encontrado resultados con estos criterios.', tipo: 'Tipo', todos: 'Todos', categoria: 'Categoría', area: 'Área',
    localizacao: 'Ubicación', pais: 'País', grelha: 'Cuadrícula', lista: 'Lista', publicado: 'Publicado el', tags: 'Etiquetas', infoVendedor: 'Información de la empresa', infoContacto: 'Contactos directos',
    verEmpresa: 'Ver página de la empresa', relacionados: 'Productos y servicios relacionados', avaliacoes: 'Valoraciones', avaliacao: 'valoración', semAvaliacoes: 'Esta empresa aún no tiene valoraciones.',
    respostaEmpresa: 'Respuesta de la empresa', ofertaEmpresa: 'Productos y servicios', setor: 'Sector', missao: 'Misión', apoio: 'Apoyo especializado', pagina: 'Página', de: 'de',
    anterior: 'Anterior', seguinte: 'Siguiente', ativo: 'Activo', inativo: 'Inactivo', terminado: 'Finalizado', pendente: 'Pendiente', aprovada: 'Aprobada', rejeitada: 'Rechazada', suspensa: 'Suspendida',
    empresa: 'Empresa', incubadora: 'Incubadora', agente: 'Agente de Desarrollo', admin: 'Administrador', obrigatorio: 'obligatorio', opcional: 'opcional', semDados: 'No hay datos para mostrar.',
    visualizacoes: 'Visualizaciones', contactosN: 'Contactos', taxaContacto: 'Tasa de contacto', original: 'Contenido disponible solo en el idioma original.',
    capturaT: 'Verificación anti-spam', capturaQ: 'Cuánto es', ultimos: 'Últimos', dias: 'días', ano: 'Año', website: 'Web',
  },
  map: { title: 'Mapa', sub: 'Vista geográfica de empresas, incubadoras y agentes de desarrollo', consentT: 'El mapa usa un servicio externo', consentS: 'Las teselas del mapa se cargan desde OpenStreetMap. Para verlas, permite las cookies y servicios de mapas.', tipos: 'Tipo de entidad', abrir: 'Abrir página', entidades: 'entidades en el mapa', lista: 'Entidades listadas' },
  auth: {
    loginT: 'Accede a tu Área Personal', loginS: 'Inicia sesión para gestionar tu perfil, contenidos y estadísticas.', email: 'Email', password: 'Contraseña', esqueceu: '¿Olvidaste la contraseña?', semConta: '¿Aún no tienes cuenta?', registe: 'Registra tu entidad',
    erroLogin: 'Email o contraseña incorrectos.', bloqueado: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.', naoVerificado: 'Confirma primero tu email. Hemos reenviado el enlace de confirmación.',
    rejeitada: 'El registro de esta cuenta ha sido rechazado.', suspensa: 'Esta cuenta está suspendida. Contacta con el equipo INCUBTRANS.', motivo: 'Motivo',
    registoT: 'Registro de entidad', registoS: 'Elige el perfil, completa los datos y confirma tu email. La cuenta queda pendiente hasta que la valide el equipo INCUBTRANS.',
    perfil: 'Perfil', perfilEmpresa: 'Empresa / Vendedor', perfilEmpresaD: 'Microempresa, pyme, productor local o prestador de servicios', perfilIncub: 'Incubadora / Institución', perfilIncubD: 'Estructura de apoyo al emprendimiento', perfilAgente: 'Agente de Desarrollo', perfilAgenteD: 'Entidad de desarrollo territorial',
    nomeResp: 'Tu nombre', nomeEntidade: 'Nombre de la entidad', nif: 'NIF / CIF', confirmPass: 'Confirmar contraseña', politicaPass: 'Mínimo 8 caracteres, con letras y números.', aceito: 'He leído y acepto los Términos y Condiciones y la Política de Privacidad.',
    registoOkT: 'Confirma tu email', registoOkS: 'Hemos enviado un enlace de confirmación a {email}. Después de confirmarlo, el equipo INCUBTRANS validará tu cuenta.',
    verificadoOkT: 'Email confirmado', verificadoOkS: 'Gracias. Tu cuenta queda pendiente de validación por el equipo INCUBTRANS. Recibirás un aviso por email.', tokenInvalido: 'Este enlace no es válido o ha caducado.',
    recuperarT: 'Recuperar contraseña', recuperarS: 'Indica el email de la cuenta. Si existe, te enviamos un enlace para definir una nueva contraseña.', recuperarOk: 'Si el email está registrado, recibirás un enlace en unos instantes.',
    novaPassT: 'Definir nueva contraseña', novaPassOk: 'Contraseña cambiada. Ya puedes entrar.',
    errNome: 'Indica el nombre.', errEmail: 'Indica un email válido.', errEmailExiste: 'Ya existe una cuenta con este email.', errPass: 'La contraseña debe tener al menos 8 caracteres, con letras y números.', errPassIgual: 'Las contraseñas no coinciden.', errTermos: 'Debes aceptar los términos.', errCaptcha: 'La verificación anti-spam es incorrecta.', errPerfil: 'Elige un perfil.', errLimite: 'Demasiadas solicitudes. Inténtalo más tarde.',
  },
  review: {
    title: 'Valorar esta empresa', sub: 'No necesitas cuenta. Te enviamos un enlace a tu email para confirmar la valoración. El email no se publica.', nota: 'Puntuación', comentario: 'Comentario', nome: 'Nombre a mostrar', email: 'Tu email',
    enviadaT: 'Confirma tu valoración', enviadaS: 'Hemos enviado un enlace a tu email. La valoración solo se publica después de confirmarla.', jaExiste: 'Ya existe una valoración de este email para esta empresa.', confirmadaT: 'Valoración publicada', confirmadaS: 'Gracias por tu valoración.', anonimo: 'Visitante', errNota: 'Elige una puntuación de 1 a 5.',
  },
  report: { title: 'Denunciar contenido', sub: 'Cuéntanos qué está mal. El equipo INCUBTRANS analiza todas las denuncias.', motivo: 'Motivo', detalhes: 'Detalles', motivos: { spam: 'Spam o publicidad engañosa', improprio: 'Contenido inapropiado u ofensivo', falso: 'Información falsa o engañosa', direitos: 'Vulneración de derechos (imágenes, marcas)', outro: 'Otro' }, ok: 'Gracias. La denuncia se ha registrado y será analizada.' },
  area: {
    titulo: { empresa: 'Área de la Empresa', incubadora: 'Área de la Incubadora', agente: 'Área del Agente de Desarrollo' },
    sub: { empresa: 'Gestiona tus productos y servicios', incubadora: 'Gestiona programas, empresas incubadas y eventos', agente: 'Gestiona proyectos, áreas de actuación y eventos' },
    tabs: { dash: 'Panel', perfil: 'Perfil', ofertas: 'Productos y Servicios', programas: 'Programas', incubadas: 'Empresas incubadas', projetos: 'Proyectos', posts: 'Eventos y noticias', avaliacoes: 'Valoraciones', stats: 'Estadísticas', conta: 'Cuenta y datos' },
    pendenteT: 'Cuenta pendiente de validación', pendenteS: 'Tu perfil aún no es público. El equipo INCUBTRANS validará la cuenta y recibirás un aviso por email. Mientras tanto puedes completar el perfil y los contenidos.',
    revalidarT: 'Sello "Verificado" en revisión', revalidarS: 'Has cambiado datos que requieren una nueva validación (nombre, NIF o dirección). El sello vuelve a aparecer tras la revisión del equipo.',
    verPublica: 'Ver página pública', totalOfertas: 'Productos y servicios activos', mediaAval: 'Valoración media', recentes: 'Contenidos recientes', nenhum: 'Aún no hay contenidos.',
    novaOferta: 'Añadir producto o servicio', editarOferta: 'Editar producto o servicio', tipo: 'Tipo', titulo_: 'Título', tituloEs: 'Título en español', descricao: 'Descripción', descricaoEs: 'Descripción en español', traducao: 'Traducción al español (opcional)', traducaoPt: 'Traducción al portugués (opcional)',
    categoria: 'Categoría', escolher: 'Seleccionar…', etiquetas: 'Etiquetas', etiquetasAj: 'Separadas por comas, máximo 5.', preco: 'Precio (€)', tipoPreco: 'Tipo de precio', estado: 'Estado',
    imagens: 'Imágenes', imagensAj: 'Hasta 5 imágenes JPG, PNG o WebP, máximo 2 MB cada una. Se redimensionan automáticamente.', removerImg: 'Quitar', confirmEliminar: '¿Seguro? Esta acción no se puede deshacer.',
    destaqueAtivo: 'Destacado hasta', destaquePendente: 'Solicitud de destacado en análisis', destaqueRegra: 'El destacado dura 30 días y cada empresa puede tener un destacado activo o pendiente a la vez.', destaquePedido: 'Solicitud de destacado enviada al administrador.', destaqueLimite: 'Ya tienes un destacado activo o pendiente.',
    dadosEntidade: 'Datos de la entidad', logo: 'Logotipo', capa: 'Imagen destacada', ano: 'Año de creación', setor: 'Sector de actividad', areas: 'Áreas', areasAj: 'Separadas por comas.', servicos: 'Servicios', apoio: 'Descripción del tipo de apoyo',
    contactos: 'Contactos', redes: 'Redes sociales', pessoa: 'Persona de contacto', pessoaPublica: 'Publicar la persona de contacto (tengo su consentimiento)', localizacoes: 'Ubicaciones', territorio: 'Concelho / concello', morada: 'Dirección', coordenadas: 'Coordenadas (lat, lng)', coordAj: 'Opcional: si está vacío, se usa el centro del municipio.', addLocal: 'Añadir ubicación',
    nome: 'Nombre', descricao_: 'Descripción', duracao: 'Duración (meses)', inicio: 'Inicio', fim: 'Fin', parceiros: 'Socios', website: 'Web', ano_: 'Año', area_: 'Área', data: 'Fecha', local: 'Lugar', texto: 'Texto', tipoPost: 'Tipo',
    guardado: 'Cambios guardados.', eliminado: 'Eliminado.', criado: 'Creado correctamente.', resposta: 'Tu respuesta pública', denunciarAval: 'Denunciar valoración',
    passAtual: 'Contraseña actual', passNova: 'Nueva contraseña', passOk: 'Contraseña cambiada.', passErr: 'La contraseña actual no es correcta.', idioma: 'Idioma preferido',
    exportarS: 'Descarga todos los datos de tu cuenta y de tu entidad en formato JSON.', eliminarS: 'Elimina definitivamente la cuenta, el perfil público y todos los contenidos. Esta acción no se puede deshacer.', eliminarConfirm: 'Escribe ELIMINAR para confirmar',
    porProduto: 'Por producto/servicio', porCategoria: 'Por categoría', porCanal: 'Contactos por canal', porDia: 'Visualizaciones y contactos por día', perfilPub: 'Página pública',
    canais: { telefone: 'Teléfono', email: 'Email', website: 'Web', redes: 'Redes sociales' },
  },
  admin: {
    titulo: 'Área de Administración', sub: 'Panel global de gestión de la plataforma',
    tabs: { dash: 'Resumen', contas: 'Cuentas y validación', moderacao: 'Moderación', destaques: 'Destacados', categorias: 'Categorías', territorios: 'Ubicaciones', paginas: 'Páginas', emails: 'Emails automáticos', stats: 'Estadísticas', mensagens: 'Mensajes', auditoria: 'Auditoría', caixa: 'Bandeja de salida' },
  },
  cookies: { text: 'Usamos cookies necesarias para el funcionamiento del sitio. Con tu consentimiento, cargamos también el mapa (OpenStreetMap). No usamos cookies de publicidad ni de analítica.', link: 'Política de Privacidad y Cookies', necessarios: 'Necesarias (siempre activas)', mapas: 'Mapas (OpenStreetMap)', guardar: 'Guardar preferencias', gerir: 'Gestionar cookies' },
  contact: {
    band: 'Contacto y Ayuda', bandSub: 'Habla con el equipo INCUBTRANS', title: 'Envíanos un mensaje', sub: 'Respondemos en un plazo de 2 días hábiles, en portugués o español.', nome: 'Nombre', email: 'Email', entidade: 'Empresa / Entidad', assunto: 'Asunto', mensagem: 'Mensaje',
    assuntos: ['Información general', 'Registro de empresa', 'Registro de incubadora o agente', 'Soporte técnico de la plataforma', 'Prensa y comunicación'], rgpd: 'Acepto que mis datos se utilicen únicamente para responder a esta solicitud, de acuerdo con la Política de Privacidad.',
    erro: 'Completa el nombre, un email válido, el mensaje y acepta la Política de Privacidad.', okT: 'Mensaje enviado', okS: 'Gracias por contactar. El equipo INCUBTRANS responderá al email indicado.', faq: 'Preguntas frecuentes', secretariado: 'Secretaría técnica', horario: 'De lunes a viernes, 9:00–17:00 (hora de Portugal)', parceiros: 'Socios del proyecto',
  },
  foot: { sobre: 'Acerca de', comoFunciona: 'Cómo funciona', contactos: 'Contacto y Ayuda', termos: 'Términos y Condiciones', privacidade: 'Privacidad y Cookies', funding: 'Desarrollado en el marco del proyecto INCUBTRANS, cofinanciado por la Unión Europea a través del Programa Interreg VI-A España–Portugal (POCTEP) 2021–2027.' },
  err: { notFoundT: 'Página no encontrada', notFoundS: 'La página que buscas no existe o ha sido eliminada.', forbiddenT: 'Acceso reservado', forbiddenS: 'No tienes permiso para acceder a esta página.', serverT: 'Se ha producido un error', serverS: 'Inténtalo de nuevo en unos instantes.', csrf: 'La sesión ha caducado. Recarga la página e inténtalo de nuevo.', upload: 'Archivo no válido: usa JPG, PNG o WebP de hasta 2 MB.' },
};

const DICTS = { pt, es };

function lookup(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function translator(lang) {
  const d = DICTS[lang] || pt;
  return function t(key, vars) {
    let v = lookup(d, key);
    if (v === undefined) v = lookup(pt, key);
    if (v === undefined) return key;
    if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    return v;
  };
}

// Conteúdo introduzido pelas entidades: usa o idioma pedido e, se não houver tradução, o original.
function pick(row, field, lang) {
  if (!row) return '';
  const other = lang === 'pt' ? 'es' : 'pt';
  return row[`${field}_${lang}`] || row[`${field}_${other}`] || '';
}
function isFallback(row, field, lang) {
  return !!row && !row[`${field}_${lang}`] && !!row[`${field}_${lang === 'pt' ? 'es' : 'pt'}`];
}

module.exports = { LANGS, DICTS, translator, pick, isFallback };
