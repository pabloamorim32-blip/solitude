/* Conteúdo do diário (jornada, metas, práticas). Edite aqui para ajustar textos sem mexer na lógica. */
(function () {
  'use strict';

  const DAYS = [
    {week:1,focus:'Mapeamento inicial',title:'Faça um primeiro retrato do dia',text:'Registre necessidade social, conforto sozinho, irritação, ruminação e prazer geral.',tip:'O primeiro registro é uma linha de base, não uma nota de aprovação.'},
    {week:1,focus:'Solitude curta',title:'Escolha uma atividade individual',text:'Experimente 10–15 minutos de algo escolhido por você e anote o motivo.',tip:'Se a duração não for confortável, reduza ou escolha só alguns minutos.'},
    {week:1,focus:'Gatilhos sociais',title:'Observe a vontade de procurar contato',text:'Registre três ocasiões em que procuraria alguém: interesse, tédio, afeto, solidão ou validação?',tip:'Conversar continua permitido. A pausa serve para abrir uma escolha.'},
    {week:1,focus:'Filtro estoico',title:'Separe fato e interpretação',text:'Aplique fato / influência possível / fora de alcance / ação em um contratempo real.',tip:'Não se culpe por uma emoção involuntária; oriente o comportamento posterior.'},
    {week:1,focus:'Solitude sem plateia',title:'Faça algo sem precisar relatar depois',text:'Escolha uma atividade individual e dispense a obrigação de publicar, contar ou receber reação.',tip:'O valor da atividade pode existir sem audiência.'},
    {week:1,focus:'Pausa antes de contatar',title:'Espere dez minutos, se a urgência for automática',text:'Faça uma pausa breve com uma atividade individual; depois decida livremente se quer conversar.',tip:'Não transforme a pausa em abstinência social ou exposição punitiva.'},
    {week:1,focus:'Revisão semanal',title:'Repare nos padrões da primeira semana',text:'Identifique o que foi escolhido, o que pesou e o que quer manter, simplificar ou abandonar.',tip:'Não avalie a semana pela quantidade de conversas.'},
    {week:2,focus:'Planejar um interesse',title:'Escolha algo que tenha valor para você',text:'Planeje uma atividade individual significativa e registre por que deseja fazê-la.',tip:'Pode ser leitura, música, instrumento, caminhada, criação ou investigação por interesse.'},
    {week:2,focus:'Solitude possível',title:'Experimente até trinta minutos, se confortável',text:'Observe prazer e motivação durante um período individual escolhido.',tip:'Tempo é opcional; qualidade da escolha vale mais que duração.'},
    {week:2,focus:'Dia sem meta social',title:'Deixe o dia acontecer sem cota de conversa',text:'Não estabeleça meta de conhecer ou abordar pessoas novas. Interações espontâneas seguem livres.',tip:'Um dia completo não depende de uma conversa nova.'},
    {week:2,focus:'Contato autêntico',title:'Se procurar alguém, note por quê',text:'Diferencie vontade genuína de conversar de necessidade de resposta ou confirmação.',tip:'Aproximação também pode ser uma escolha autônoma.'},
    {week:2,focus:'Limite cordial',title:'Diga não quando isso for verdadeiro',text:'Pratique dizer “hoje prefiro ficar só” quando for sincero e apropriado.',tip:'Clareza e respeito dispensam justificativas elaboradas.'},
    {week:2,focus:'Distância confortável',title:'Observe a convivência que faz sentido',text:'Reflita sobre frequência e intimidade desejadas, sem adotar um modelo externo.',tip:'Preferências podem variar entre pessoas e ao longo do tempo.'},
    {week:2,focus:'Revisão semanal',title:'Compare conforto, frustração e liberdade',text:'Reveja a semana e observe se afeto, prazer e interesses continuam presentes.',tip:'O objetivo não é reduzir relações por contagem.'},
    {week:3,focus:'Nomear sem suprimir',title:'Perceba a emoção antes de responder',text:'Quando surgir irritação, nomeie-a e, se possível, adie a resposta impulsiva.',tip:'Sentir raiva não obriga você a agir nem a fingir que ela não existe.'},
    {week:3,focus:'Contrafactual útil',title:'Extraia uma lição e encerre a repetição',text:'Diante de uma oportunidade perdida, procure uma informação nova e uma regra futura realizável.',tip:'Pensar no passado pode ajudar; repetir sem aprender mantém você preso.'},
    {week:3,focus:'Preocupação agendada',title:'Teste uma janela breve, se for útil',text:'Reserve 10–15 minutos para uma preocupação não urgente; se surgir antes, anote o tema e retome a atividade.',tip:'Separe ação possível, informação a buscar e incerteza que não pode resolver agora.'},
    {week:3,focus:'Resposta a crítica',title:'Separe informação de aprovação',text:'Verifique o que a crítica afirma, se há dado útil e se alguma mudança ou reparação cabe.',tip:'Um erro não define toda a sua identidade.'},
    {week:3,focus:'Silêncio intencional',title:'Faça uma atividade sem compartilhar atualizações',text:'Escolha um período de atenção individual, sem tornar o silêncio um teste de resistência.',tip:'A escolha pode incluir companhia em outro momento.'},
    {week:3,focus:'Reavaliação da raiva',title:'Separe conduta, intenção presumida e ação',text:'Descreva o que aconteceu e decida se cabe um limite, uma conversa, uma reparação ou nenhuma ação.',tip:'Aceitação não é tolerar desrespeito persistente.'},
    {week:3,focus:'Revisão semanal',title:'Observe o tempo de recuperação',text:'Anote quanto tempo uma frustração ocupou sua atenção e o que ajudou a retomar o presente.',tip:'A meta não é sentir menos emoções; é ter mais liberdade de resposta.'},
    {week:4,focus:'Projeto por escolha',title:'Lembre por que continua uma meta',text:'Escreva por que deseja continuar um projeto sem recorrer a status, comparação ou validação.',tip:'Escolhas são situadas; resultados não são promessas.'},
    {week:4,focus:'Fazer sem auditoria',title:'Execute vinte minutos sem se medir',text:'Faça uma atividade conhecida e adie a autoavaliação constante; ao final, reveja só o necessário.',tip:'A revisão técnica pode ser breve. O período não precisa virar uma auditoria.'},
    {week:4,focus:'Dia sem obrigação social',title:'Permita que não haja interação nova',text:'Deixe o dia transcorrer sem uma meta de contato e avalie-o por outras dimensões.',tip:'Mantenha contatos desejados, trabalho e responsabilidades.'},
    {week:4,focus:'Ação com incerteza',title:'Dê um passo concreto para o futuro',text:'Faça uma ação possível para uma meta e aceite que o resultado não está garantido.',tip:'Planejamento responsável pode coexistir com incerteza.'},
    {week:4,focus:'Pausa diante de crítica',title:'Responda ao que é pertinente',text:'Verifique se há algo a corrigir ou reparar; deixe de lado hostilidade sem prolongar a cena mental.',tip:'Limites e proteção continuam disponíveis.'},
    {week:4,focus:'Solitude livre',title:'Escolha duração, atividade e companhia',text:'Decida livremente se quer um período só, qual atividade e se deseja conviver.',tip:'Neste dia, não obedeça ao cronômetro.'},
    {week:4,focus:'Auditoria inicial',title:'Ajuste o que vem depois',text:'Compare a linha de base, identifique benefícios e custos e desenhe uma rotina permanente.',tip:'O dia 28 é um ponto de ajuste, não o fim do projeto.'}
  ];
  const DAILY_GOALS = [
    'Anotar como o dia foi, sem tentar melhorar a nota ou chegar a uma conclusão.',
    'Escolher uma atividade individual que desperte curiosidade, mesmo por poucos minutos.',
    'Perceber uma vontade de contato e nomear o que parece estar por trás dela.',
    'Escrever um fato, uma parte que posso influenciar e um próximo passo possível.',
    'Fazer algo de que gosto sem a obrigação de publicar ou contar depois.',
    'Se surgir um impulso automático, pausar brevemente e então escolher livremente.',
    'Anotar uma coisa que quero manter, simplificar ou deixar de lado na próxima semana.',
    'Reservar um espaço para um interesse que tenha valor para mim.',
    'Experimentar um período individual confortável, escolhendo eu mesmo a duração.',
    'Deixar de lado uma cota de conversa nova e perceber o que mais dá forma ao dia.',
    'Se eu procurar alguém, notar se quero a conversa ou uma confirmação específica.',
    'Dizer “não” com clareza e respeito quando isso corresponder ao que quero.',
    'Anotar qual frequência de contato parece boa para mim neste momento.',
    'Rever se meus interesses, afeto e prazer continuam tendo espaço.',
    'Dar nome a uma emoção antes de decidir o que fazer com ela.',
    'Tirar uma lição prática de algo que não saiu como eu queria e encerrar a revisão.',
    'Registrar uma preocupação e identificar uma ação pequena, se houver.',
    'Separar uma informação útil de uma busca por aprovação em uma crítica.',
    'Fazer uma atividade em silêncio escolhido, sem transformá-lo em prova de resistência.',
    'Decidir se cabe limite, conversa, reparação ou nenhuma ação neste momento.',
    'Notar o que ajudou a voltar ao presente depois de uma frustração.',
    'Escrever por que quero seguir um projeto, sem usar comparação como motivo.',
    'Dedicar vinte minutos a uma atividade sem me avaliar a cada instante.',
    'Permitir que hoje não haja uma interação nova, mantendo contatos que desejo.',
    'Dar um passo concreto em direção a algo importante, mesmo sem garantia de resultado.',
    'Responder ao que é pertinente em uma crítica e proteger meus limites quando necessário.',
    'Escolher com liberdade entre um tempo só, companhia ou uma mistura dos dois.',
    'Escolher um ajuste simples para a rotina que vem depois deste ciclo.'
  ];
  const PRACTICES = [
    {letter:'A',title:'Solitude com intenção',duration:'15–60 min como exemplo, não norma',text:'Planeje um momento individual com uma atividade de valor intrínseco.',steps:['Escolha leitura, música, instrumento, caminhada, criação ou investigação por interesse.','Antes, formule: “estou escolhendo este tempo para mim”.','Durante, dispense a obrigação de publicar, relatar ou receber reação.','Ao terminar, note conforto, interesse e vontade de compartilhar; não exija prazer máximo.'],basis:'Inspirado por pesquisa de autonomia e solitude escolhida. O projeto completo não foi testado como pacote.'},
    {letter:'B',title:'Vontade de conversar ≠ obrigação',duration:'Pausa de 10–15 min, se a vontade for automática',text:'A pausa pode devolver espaço para decidir. Conversar continua sendo uma possibilidade.',steps:['Identifique o gatilho: tédio, curiosidade, carinho, solidão, hábito ou procura de validação.','Se urgente e automático, faça uma pausa breve com uma atividade individual.','Depois, reavalie e decida livremente.'],basis:'Adaptação pedagógica para apoiar autonomia; não é abstinência social.'},
    {letter:'C',title:'Um dia completo sem contato novo',duration:'Até dois dias de teste por semana, se fizer sentido',text:'Perceba outras fontes de valor no cotidiano, sem cortar contatos desejados.',steps:['Não faça meta de falar com desconhecidos.','Mantenha interações naturais, trabalho, responsabilidades e contatos desejados.','À noite, liste três acontecimentos satisfatórios que não dependeram da atenção de outra pessoa.'],basis:'O número de dias e registros é uma adaptação, não um parâmetro testado.'},
    {letter:'D',title:'Filtro: fato, alcance, ação',duration:'Quando surgir um contratempo',text:'Descreva o acontecimento e escolha uma resposta proporcional.',steps:['Fato: descreva o ocorrido sem interpretação.','Influência possível: o que posso decidir, comunicar, preparar ou reparar?','Fora de alcance: opinião, decisão ou passado de outra pessoa.','Ação: resposta útil proporcional ou escolha consciente de não agir.'],basis:'Não use o filtro para se culpar por emoções que surgem automaticamente.'},
    {letter:'E',title:'Aprender uma vez',duration:'Quando voltar ao mesmo cenário mental',text:'Pergunte se o pensamento traz informação nova.',steps:['Se houver aprendizado, registre uma regra futura específica e realizável.','Se for repetição sem informação, reconheça que já processou o problema.','Retorne à tarefa presente, sabendo que a lembrança pode reaparecer.'],basis:'O objetivo não é apagar memórias ou proibir reflexão; é reduzir repetição improdutiva.'},
    {letter:'F',title:'Aceitação e equanimidade',duration:'90 segundos iniciais como janela de treino',text:'Note a emoção antes de agir; ela não precisa desaparecer para que você escolha.',steps:['Perceba a emoção no corpo e dê um nome simples.','Observe sem discutir se deveria estar sentindo isso.','Escolha uma ação compatível com seus interesses, mesmo com a emoção presente.'],basis:'90 segundos não são um tempo fisiológico universal nem promessa de extinguir uma emoção.'},
    {letter:'G',title:'Preocupação agendada',duration:'10–15 min, somente se útil',text:'Use uma janela breve para questões que não exigem resposta imediata.',steps:['Anote o tema quando ele surgir fora da janela e retome a atividade.','Na janela, separe decisão executável, informação a buscar e incerteza irredutível.','Planeje uma ação concreta; encerre a tentativa de prever todo resultado.'],basis:'Adaptação de técnica estudada em contexto clínico específico, com generalização limitada.'},
    {letter:'H',title:'Resposta deliberada à irritação',duration:'Quando recuperar equilíbrio suficiente',text:'Descreva o comportamento que ocorreu sem tratar uma intenção oculta como fato.',steps:['Avalie se cabe limite, conversa, reparação, denúncia ou nenhuma ação.','Se puder, responda após recuperar algum equilíbrio.','Permita desaprovação sem reproduzir a cena mental indefinidamente.'],basis:'Aceitar uma emoção não significa tolerar desrespeito ou abrir mão de proteção.'},
    {letter:'I',title:'Fazer sem auditoria',duration:'20 min como exercício escolhido',text:'Execute uma atividade conhecida sem autoavaliação constante.',steps:['Escolha instrumento, escrita, treino, caminhada ou estudo.','Planeje só o indispensável e execute.','Ao final, faça uma breve revisão técnica e encerre.'],basis:'Wu wei é uma lente filosófica; este exercício não é uma intervenção taoísta validada.'}
  ];
  const WEEK_LABELS = ['Consciência e linha de base','Solitude escolhida','Diminuir reatividade','Integração existencial'];
  const WEEK_FOCI = [
    'Perceber motivos da busca por companhia, reconhecer solitude autônoma e distinguir fatos de interpretações.',
    'Ampliar experiências individuais satisfatórias sem transformar intimidade ou reconhecimento em obrigação.',
    'Aceitar emoções, reduzir repetições mentais e responder com menos urgência a conflitos e incertezas.',
    'Combinar autonomia relacional, atenção ao presente e continuidade de objetivos sem apego excessivo a resultados.'
  ];

  /* Textos usados fora do ciclo de 28 dias (antes do início e depois do dia 28). */
  const PREP = {
    focus: 'Mapeamento inicial',
    title: 'Comece observando, sem corrigir nada',
    text: 'O primeiro registro pode estabelecer sua linha de base: necessidade de contato, conforto sozinho, reatividade, ruminação e prazer geral.',
    tip: 'O primeiro registro é uma linha de base, não uma nota de aprovação.',
    goal: 'Observar o dia como ele é, sem exigir uma mudança.'
  };
  const MAINT = {
    focus: 'Manutenção flexível',
    title: 'Pratique quando isso servir à sua vida',
    text: 'Escolha uma prática pequena, flexível e compatível com seus interesses.',
    tip: 'Pausas e ajustes fazem parte; nada aqui precisa ser compensado.',
    goal: 'Escolher uma prática pequena que combine com o momento, ou simplesmente registrar o dia.'
  };

  window.EM_DATA = Object.freeze({ DAYS, DAILY_GOALS, PRACTICES, WEEK_LABELS, WEEK_FOCI, PREP, MAINT });
})();
