// Perguntas dos quizzes, uma lista por conceito. Ficam no código, e não no banco, porque mudam
// junto com ele e passam por revisão em pull request; o banco guarda só o que acontece em uso
// (tentativas, respostas e moedas). Em cada pergunta, a primeira opção é a certa: a API embaralha
// a ordem a cada tentativa, e os ids das opções não revelam a posição.
export interface QuestionContent {
  // Identificador estável: as respostas gravadas no banco apontam para ele.
  key: string;
  prompt: string;
  // [certa, errada, errada]
  options: [string, string, string];
  // Aparece depois da resposta, certa ou errada: é a parte em que se aprende.
  explanation: string;
}

export interface QuizContent {
  // Mesmo slug do mascote do conceito, para o front mostrar o desenho dele no quiz.
  slug: string;
  title: string;
  concept: string;
  questions: QuestionContent[];
}

export const QUIZ_CONTENT: QuizContent[] = [
  {
    slug: "caranguejo-dos-conteineres",
    title: "O que são contêineres",
    concept: "Contêineres",
    questions: [
      {
        key: "conteineres-1",
        prompt: "O que vai dentro de uma imagem de contêiner?",
        options: [
          "A aplicação e tudo de que ela precisa para rodar: bibliotecas, configurações e ferramentas",
          "Só o código-fonte da aplicação",
          "Uma cópia inteira do computador de quem desenvolveu",
        ],
        explanation:
          "A imagem leva a aplicação junto com as dependências, por isso roda igual em qualquer máquina " +
          "com um motor de contêineres. Ela não copia o computador inteiro: é bem mais leve que uma " +
          "máquina virtual.",
      },
      {
        key: "conteineres-2",
        prompt: "Qual é a diferença entre imagem e contêiner?",
        options: [
          "A imagem é o modelo pronto; o contêiner é uma cópia dela em execução",
          "São a mesma coisa com nomes diferentes",
          "O contêiner é o modelo; a imagem é o programa em execução",
        ],
        explanation:
          "Pense na imagem como uma receita e no contêiner como o prato servido. Da mesma imagem dá para " +
          "subir vários contêineres iguais.",
      },
      {
        key: "conteineres-3",
        prompt: 'Por que contêineres ajudam a acabar com o "na minha máquina funciona"?',
        options: [
          "Porque o ambiente vai junto com a aplicação e é o mesmo em todo lugar",
          "Porque corrigem os bugs automaticamente",
          "Porque só rodam no computador de quem criou a imagem",
        ],
        explanation:
          "O problema costuma ser diferença de ambiente: outra versão de uma biblioteca, uma configuração " +
          "faltando. Com o ambiente empacotado, desenvolvimento, testes e produção rodam a mesma coisa.",
      },
      {
        key: "conteineres-4",
        prompt: "Para que serve um build em várias etapas (multi-stage) no Dockerfile?",
        options: [
          "Compilar numa etapa e copiar só o resultado para uma imagem final menor",
          "Rodar a aplicação em vários servidores ao mesmo tempo",
          "Dividir a imagem em pedaços para baixar mais rápido",
        ],
        explanation:
          "As ferramentas de compilação ficam só na primeira etapa. A imagem final leva apenas o que é " +
          "preciso para rodar: fica menor e com menos pontos de ataque. As imagens da DevLand são feitas " +
          "assim.",
      },
      {
        key: "conteineres-5",
        prompt: "Por que é boa prática o contêiner não rodar como root (administrador)?",
        options: [
          "Porque, se alguém invadir a aplicação, terá menos poder para causar estragos",
          "Porque o contêiner fica mais rápido",
          "Porque o root não consegue acessar a internet",
        ],
        explanation:
          "Rodar com um usuário comum limita o que uma invasão consegue fazer dentro do contêiner. A API e " +
          "a loja da DevLand rodam com usuários sem privilégios.",
      },
    ],
  },
  {
    slug: "lesminha-do-pipeline",
    title: "Como funciona um pipeline de CI/CD",
    concept: "CI/CD",
    questions: [
      {
        key: "cicd-1",
        prompt: "O que é integração contínua (CI)?",
        options: [
          "Juntar o código do time com frequência, com verificações automáticas a cada mudança",
          "Publicar o sistema uma vez por mês, tudo de uma vez",
          "Um programa que escreve código sozinho",
        ],
        explanation:
          "Na CI, cada mudança enviada passa por verificações automáticas, como testes e lint. Os " +
          "problemas aparecem cedo, quando ainda são pequenos e fáceis de corrigir.",
      },
      {
        key: "cicd-2",
        prompt: "Uma etapa do pipeline falhou. O que deve acontecer?",
        options: [
          "O pipeline para, e a mudança só segue depois de corrigida",
          "O pipeline ignora a falha e publica mesmo assim",
          "O pipeline apaga o código que falhou",
        ],
        explanation:
          "O pipeline é uma esteira com portões: se um fecha, nada passa. Assim uma mudança quebrada não " +
          "chega a quem usa o sistema.",
      },
      {
        key: "cicd-3",
        prompt: "Qual é a diferença entre entrega contínua e implantação contínua?",
        options: [
          "Na entrega, uma pessoa aprova a publicação; na implantação, a versão vai ao ar sozinha",
          "Não há diferença, são dois nomes para a mesma coisa",
          "A entrega é para sites e a implantação é para aplicativos de celular",
        ],
        explanation:
          "As duas automatizam o caminho até a produção. Na entrega contínua, o último passo é um botão " +
          "apertado por alguém; na implantação contínua, passou nas verificações, está no ar.",
      },
      {
        key: "cicd-4",
        prompt: "O que faz um lint?",
        options: [
          "Procura erros e desvios das regras do time no código, sem executá-lo",
          "Mede quantos acessos o sistema aguenta",
          "Registra quem alterou cada arquivo",
        ],
        explanation:
          "O lint lê o código e aponta variáveis esquecidas, padrões arriscados e fugas do estilo " +
          "combinado. É uma das primeiras etapas do pipeline da DevLand.",
      },
      {
        key: "cicd-5",
        prompt: "Por que o pipeline roda em cada pull request, e não só antes de publicar?",
        options: [
          "Para achar o problema na mudança que o causou, antes de ela se misturar com outras",
          "Para usar mais tempo de servidor",
          "Porque pull requests não podem ser revisados por pessoas",
        ],
        explanation:
          "Quanto mais cedo um erro aparece, mais fácil é saber de onde veio. Verificar cada pull request " +
          "mantém a branch principal sempre funcionando.",
      },
    ],
  },
  {
    slug: "corujinha-das-branches",
    title: "Controle de versão e branches",
    concept: "Controle de versão",
    questions: [
      {
        key: "versao-1",
        prompt: "Para que serve um commit?",
        options: [
          "Para guardar um ponto do histórico do código, com uma mensagem explicando a mudança",
          "Para apagar as versões antigas do código",
          "Para publicar o site na internet",
        ],
        explanation:
          "Cada commit é uma foto do código num momento, com autor, data e descrição. Com eles dá para " +
          "entender por que algo mudou e voltar atrás se precisar.",
      },
      {
        key: "versao-2",
        prompt: "Por que criar uma branch para cada mudança?",
        options: [
          "Para trabalhar sem mexer no código principal até a mudança ficar pronta",
          "Porque cada pessoa só pode editar um arquivo por vez",
          "Para deixar o repositório mais pesado",
        ],
        explanation:
          "A branch é uma linha paralela do histórico. A mudança é feita e revisada nela, e só entra na " +
          "principal quando está pronta. Na DevLand, cada branch nasce da develop.",
      },
      {
        key: "versao-3",
        prompt: "O que é um conflito de merge?",
        options: [
          "Duas mudanças alteraram o mesmo trecho, e uma pessoa precisa decidir como fica",
          "O repositório foi apagado por engano",
          "Duas pessoas tentaram fazer login ao mesmo tempo",
        ],
        explanation:
          "O controle de versão junta sozinho mudanças em lugares diferentes. Quando duas mexem na mesma " +
          "linha, ele pede ajuda: alguém escolhe uma versão ou combina as duas.",
      },
      {
        key: "versao-4",
        prompt: "Para que serve um pull request?",
        options: [
          "Para que outras pessoas revisem a mudança antes de ela entrar na branch principal",
          "Para baixar o código de outra pessoa sem permissão",
          "Para desfazer o último commit",
        ],
        explanation:
          "No pull request a mudança é discutida, revisada e verificada pelo pipeline. Na DevLand, toda " +
          "branch entra na develop por pull request.",
      },
      {
        key: "versao-5",
        prompt: "Por que uma boa mensagem de commit importa?",
        options: [
          "Porque explica para quem vier depois o que mudou e por quê",
          "Porque mensagens longas deixam o programa mais rápido",
          "Porque commits sem mensagem são apagados",
        ],
        explanation:
          "Meses depois, a mensagem é a pista para entender uma decisão. Padrões como Conventional " +
          "Commits (feat:, fix:) ainda permitem gerar notas de versão automaticamente.",
      },
    ],
  },
  {
    slug: "polvo-orquestrador",
    title: "Orquestração de serviços",
    concept: "Orquestração",
    questions: [
      {
        key: "orquestracao-1",
        prompt: "O que faz um orquestrador de contêineres?",
        options: [
          "Decide onde cada contêiner roda, troca os que falham e ajusta a quantidade de cópias",
          "Escreve o código da aplicação",
          "Substitui o banco de dados",
        ],
        explanation:
          "Com muitos contêineres, cuidar de cada um à mão fica inviável. O orquestrador recebe o estado " +
          'desejado (por exemplo, "três cópias da API") e trabalha para mantê-lo.',
      },
      {
        key: "orquestracao-2",
        prompt: "Um contêiner da API travou. O que um orquestrador faz?",
        options: [
          "Percebe pela verificação de saúde e sobe um novo no lugar",
          "Nada: alguém precisa notar e reiniciar à mão",
          "Desliga todos os outros contêineres por segurança",
        ],
        explanation:
          "Orquestradores consultam a saúde de cada serviço e substituem o que falha. A API da DevLand tem " +
          "a rota /health justamente para responder a essa pergunta.",
      },
      {
        key: "orquestracao-3",
        prompt: "O que significa escalar horizontalmente?",
        options: [
          "Colocar mais cópias da aplicação para dividir o trabalho",
          "Trocar o servidor por um mais potente",
          "Deixar a tela do site mais larga",
        ],
        explanation:
          "Escalar horizontalmente é somar cópias; verticalmente, é deixar uma máquina mais forte. Com " +
          "várias cópias, se uma cair, as outras continuam atendendo.",
      },
      {
        key: "orquestracao-4",
        prompt: "No Docker Compose, para que serve o depends_on com condição de saúde?",
        options: [
          "Para um serviço só subir depois que aquele de que ele depende estiver saudável",
          "Para dois serviços usarem a mesma porta",
          "Para apagar um serviço quando o outro parar",
        ],
        explanation:
          "Na DevLand, a API só sobe com o banco pronto, e a loja só sobe quando a API responde. Assim " +
          "ninguém tenta conversar com quem ainda está iniciando.",
      },
      {
        key: "orquestracao-5",
        prompt: "O que é um balanceador de carga?",
        options: [
          "Um serviço que distribui as requisições entre várias cópias da aplicação",
          "Uma ferramenta que mede quanto o servidor pesa",
          "Um tipo de banco de dados",
        ],
        explanation:
          "Ele recebe as requisições e reparte entre as cópias disponíveis, para que nenhuma fique " +
          "sobrecarregada enquanto outra está parada.",
      },
    ],
  },
  {
    slug: "tartaruga-do-rollback",
    title: "Deploy e rollback",
    concept: "Deploy",
    questions: [
      {
        key: "deploy-1",
        prompt: "O que é um rollback?",
        options: [
          "Voltar para a última versão que funcionava quando a nova dá problema",
          "Apagar todo o histórico de versões",
          "Manter duas versões no ar para sempre",
        ],
        explanation:
          "Se a versão nova quebra algo, o jeito mais rápido de normalizar é voltar à anterior e investigar " +
          "com calma depois.",
      },
      {
        key: "deploy-2",
        prompt: "Por que publicar imagens com etiquetas fixas, como 1.2.0 ou sha-3f8c2a1?",
        options: [
          "Para saber exatamente o que está no ar e conseguir voltar a uma versão específica",
          "Porque imagens sem etiqueta não funcionam",
          "Para deixar a imagem mais leve",
        ],
        explanation:
          "Com etiquetas fixas, cada versão continua disponível, e voltar atrás é subir a anterior. A " +
          "DevLand publica cada imagem com o código do commit e com o número da versão.",
      },
      {
        key: "deploy-3",
        prompt: "No versionamento semântico, o que indica a versão 2.4.1?",
        options: [
          "Major 2, minor 4, patch 1: a última mudança foi uma correção",
          "Que é a versão de número 241",
          "A data em que a versão foi publicada",
        ],
        explanation:
          "O patch sobe em correções, o minor em novidades compatíveis e o major quando algo muda de um " +
          "jeito que pode quebrar quem usa.",
      },
      {
        key: "deploy-4",
        prompt: "O que é um deploy canário?",
        options: [
          "Liberar a versão nova para uma parte pequena dos usuários antes de liberar para todos",
          "Publicar sempre de madrugada",
          "Publicar sem testes para ganhar tempo",
        ],
        explanation:
          "O nome vem dos canários que mineiros levavam para detectar gás. Se a versão nova der problema, " +
          "pouca gente é afetada e o rollback é rápido.",
      },
      {
        key: "deploy-5",
        prompt: "Por que as migrations de banco pedem cuidado num rollback?",
        options: [
          "Porque voltar o código não desfaz sozinho o que a migration mudou no banco",
          "Porque as migrations apagam o código antigo",
          "Porque o banco não guarda dados entre versões",
        ],
        explanation:
          "O código volta rápido, mas o banco pode ter ganhado colunas ou dados novos. Por isso cada " +
          "migration da DevLand tem também o passo de desfazer (down).",
      },
    ],
  },
  {
    slug: "abelha-dos-logs",
    title: "Logs e observabilidade",
    concept: "Observabilidade",
    questions: [
      {
        key: "observabilidade-1",
        prompt: "Para que servem os logs de uma aplicação?",
        options: [
          "Para registrar o que aconteceu e ajudar a investigar problemas",
          "Para guardar as senhas dos usuários",
          "Para deixar a aplicação mais rápida",
        ],
        explanation:
          "Os logs são o diário do sistema: requisições, erros e avisos ficam registrados com data e " +
          "hora. Sem eles, investigar um erro em produção vira adivinhação.",
      },
      {
        key: "observabilidade-2",
        prompt: "Por que gravar logs em JSON estruturado, e não em texto livre?",
        options: [
          "Porque dá para filtrar e buscar por campo, como status ou tempo de resposta",
          "Porque JSON sempre ocupa menos espaço",
          "Porque texto livre não pode ser salvo em arquivo",
        ],
        explanation:
          'Com campos nomeados, dá para perguntar "quais requisições levaram mais de 1 segundo?" em vez ' +
          "de ler linha por linha. A API da DevLand registra os logs em JSON.",
      },
      {
        key: "observabilidade-3",
        prompt: "O que não deve aparecer num log?",
        options: [
          "Senhas, tokens e outros dados sensíveis",
          "O código de status da resposta",
          "O tempo que a requisição levou",
        ],
        explanation:
          "Logs são lidos por várias pessoas e guardados por muito tempo. Um token num log é um segredo " +
          "vazado.",
      },
      {
        key: "observabilidade-4",
        prompt: "Qual é a diferença entre logs e métricas?",
        options: [
          "Logs contam cada evento; métricas são números agregados, como requisições por segundo",
          "Não há diferença",
          "Métricas são logs que foram apagados",
        ],
        explanation:
          'As métricas mostram a tendência ("os erros subiram às 14h"); os logs mostram o detalhe de cada ' +
          'caso ("esta requisição falhou por este motivo").',
      },
      {
        key: "observabilidade-5",
        prompt: "Para que serve um alerta de monitoramento?",
        options: [
          "Para avisar o time quando algo sai do normal, antes que muita gente perceba",
          "Para bloquear usuários quando o site fica lento",
          "Para enviar propaganda aos usuários",
        ],
        explanation:
          "Um bom alerta dispara por sintomas que importam, como muitos erros ou respostas lentas, e " +
          "chega a quem pode agir.",
      },
    ],
  },
  {
    slug: "castor-do-cache",
    title: "Cache e desempenho",
    concept: "Desempenho",
    questions: [
      {
        key: "desempenho-1",
        prompt: "O que é um cache?",
        options: [
          "Um lugar que guarda respostas prontas para reutilizar sem refazer o trabalho",
          "Uma cópia de segurança do banco de dados",
          "Um tipo de vírus",
        ],
        explanation:
          "Se a mesma pergunta chega muitas vezes, guardar a resposta poupa tempo e servidor. É deixar à " +
          "mão o que se usa sempre.",
      },
      {
        key: "desempenho-2",
        prompt: "Qual é o maior risco de um cache?",
        options: [
          "Mostrar uma informação antiga depois que o dado original mudou",
          "Deixar o sistema rápido demais",
          "Apagar o banco de dados",
        ],
        explanation:
          "É o cache desatualizado. Por isso ele precisa de prazo de validade ou de um jeito de ser " +
          "renovado quando o dado muda.",
      },
      {
        key: "desempenho-3",
        prompt: "Por que a DevLand põe um código de versão no endereço das imagens (?v=…)?",
        options: [
          "Para o navegador guardar a imagem por muito tempo e ainda buscar a nova quando ela mudar",
          "Para esconder a imagem de quem não adotou o mascote",
          "Porque todo endereço precisa ter números",
        ],
        explanation:
          "Com o código no endereço, a imagem pode ficar no cache do navegador por bastante tempo. Quando " +
          "o desenho muda, o endereço muda junto e o navegador baixa a versão nova.",
      },
      {
        key: "desempenho-4",
        prompt: "O que mede um teste de carga?",
        options: [
          "Como o sistema se comporta com muitos acessos ao mesmo tempo",
          "Quanto pesa o servidor",
          "Se o código segue as regras de estilo",
        ],
        explanation:
          "Ele simula muitos usuários e mede tempo de resposta e erros. Assim dá para conhecer o limite do " +
          "sistema antes que os usuários o encontrem.",
      },
      {
        key: "desempenho-5",
        prompt: "Por que um índice deixa as buscas no banco mais rápidas?",
        options: [
          "Porque o banco encontra as linhas direto, sem ler a tabela inteira",
          "Porque o índice apaga as linhas antigas",
          "Porque ele copia a tabela para o navegador",
        ],
        explanation:
          "É como o índice de um livro: em vez de folhear tudo, o banco vai direto à página. Em troca, " +
          "ocupa algum espaço e deixa as gravações um pouco mais lentas.",
      },
    ],
  },
  {
    slug: "raposa-dos-segredos",
    title: "Segredos e segurança",
    concept: "Segurança",
    questions: [
      {
        key: "seguranca-1",
        prompt: "Onde a senha do banco de dados não deve ficar?",
        options: [
          "No código do repositório",
          "Num cofre de segredos",
          "Numa variável de ambiente configurada no servidor",
        ],
        explanation:
          "O que entra no repositório fica no histórico, mesmo depois de apagado, e pode ser lido por " +
          "qualquer pessoa com acesso. Segredos ficam em variáveis de ambiente ou num cofre.",
      },
      {
        key: "seguranca-2",
        prompt:
          "Um token foi parar num commit que já está no repositório remoto. Qual é o primeiro passo?",
        options: [
          "Revogar o token e gerar outro",
          "Apagar o arquivo no próximo commit e seguir em frente",
          "Esperar para ver se alguém usa o token",
        ],
        explanation:
          "Apagar o arquivo não adianta: o token continua no histórico. O seguro é invalidar o token " +
          "vazado e trocar por um novo.",
      },
      {
        key: "seguranca-3",
        prompt: "Para que serve uma ferramenta como o gitleaks no pipeline?",
        options: [
          "Para procurar segredos esquecidos no código antes que vazem",
          "Para deixar o git mais rápido",
          "Para criar senhas fortes",
        ],
        explanation:
          "Ela procura nos commits padrões de chaves e tokens. Na DevLand, roda no pipeline e também antes " +
          "de cada commit.",
      },
      {
        key: "seguranca-4",
        prompt: "Por que variáveis que começam com VITE_ não podem guardar segredos?",
        options: [
          "Porque vão parar no código que o navegador baixa, à vista de qualquer pessoa",
          "Porque o Vite apaga essas variáveis",
          "Porque só aceitam números",
        ],
        explanation:
          "Tudo que o front usa é entregue ao navegador de quem visita o site. Segredos ficam só no " +
          "servidor.",
      },
      {
        key: "seguranca-5",
        prompt: "O que é o princípio do menor privilégio?",
        options: [
          "Dar a cada pessoa ou serviço só as permissões de que precisa",
          "Dar acesso de administrador a todos para evitar bloqueios",
          "Usar a senha mais curta possível",
        ],
        explanation:
          "Se uma conta ou serviço for invadido, o estrago fica limitado ao que ele podia fazer. O token " +
          "que o pipeline da DevLand usa no Docker Hub, por exemplo, só serve para publicar imagens.",
      },
    ],
  },
  {
    slug: "joao-de-barro-da-infraestrutura",
    title: "Infraestrutura como código",
    concept: "Infraestrutura como código",
    questions: [
      {
        key: "infra-1",
        prompt: "O que é infraestrutura como código?",
        options: [
          "Descrever servidores, bancos e redes em arquivos, que uma ferramenta usa para criar tudo",
          "Escrever o código da aplicação direto no servidor de produção",
          "Configurar cada servidor à mão pelo painel do provedor e anotar os passos",
        ],
        explanation:
          "Em vez de clicar num painel, você descreve o que quer em arquivos versionados. A ferramenta " +
          "lê a descrição e cria (ou ajusta) a infraestrutura do mesmo jeito, quantas vezes for preciso.",
      },
      {
        key: "infra-2",
        prompt: "O que o terraform plan mostra?",
        options: [
          "O que vai ser criado, alterado ou apagado, antes de mudar qualquer coisa",
          "O custo exato da infraestrutura no fim do mês",
          "Os bugs do código da aplicação",
        ],
        explanation:
          "O plan compara o que está descrito no código com o que existe de verdade e mostra a " +
          "diferença. Só o apply executa as mudanças: dá para revisar antes, como num pull request.",
      },
      {
        key: "infra-3",
        prompt: "Por que guardar a descrição da infraestrutura no git?",
        options: [
          "Para ter histórico, revisão por pull request e poder recriar tudo igual",
          "Porque o git deixa os servidores mais rápidos",
          "Para não precisar mais de backup do banco de dados",
        ],
        explanation:
          "Cada mudança vira um commit: dá para ver quem mudou o quê, revisar antes de aplicar e voltar " +
          "atrás. O backup continua necessário: o código descreve o banco, não guarda o que está " +
          "dentro dele.",
      },
      {
        key: "infra-4",
        prompt: "O que quer dizer que a infraestrutura como código é declarativa?",
        options: [
          "Você descreve o resultado que quer, e a ferramenta descobre os passos para chegar lá",
          "Você escreve cada comando na ordem exata em que ele deve rodar",
          "Cada recurso precisa ser declarado antes no painel do provedor",
        ],
        explanation:
          'Em vez de "crie um banco, depois um projeto, depois ligue os dois", você diz "quero um banco ' +
          'e um projeto ligados". Rodar de novo não duplica nada: se já está como descrito, nada muda.',
      },
      {
        key: "infra-5",
        prompt: "O que o arquivo de estado (state) do Terraform guarda?",
        options: [
          "O que a ferramenta já criou e o id de cada recurso, para comparar com o código",
          "O código-fonte da aplicação",
          "As senhas de quem usa o site",
        ],
        explanation:
          "Com o estado, o Terraform sabe que o banco descrito no código já existe e qual é o id dele. " +
          "Como ele pode conter dados sensíveis, como endereços de conexão com senha, o estado da " +
          "DevLand fica fora do git.",
      },
    ],
  },
];
