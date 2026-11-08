// O que cada mascote ensina: o conceito em linguagem simples, um exemplo do dia a dia e onde a
// própria DevLand aplica aquilo. Texto de conteúdo, lido pela migration que o grava no banco.
export interface MascotLesson {
  explanation: string;
  realWorld: string;
  inProject: string;
}

export const MASCOT_LESSONS: Record<string, MascotLesson> = {
  "caranguejo-dos-conteineres": {
    explanation:
      "Um contêiner é uma caixinha que leva o programa junto com tudo de que ele precisa para rodar: " +
      "bibliotecas, configurações e a versão certa de cada ferramenta. Como a caixinha é sempre igual, " +
      "o programa funciona do mesmo jeito no computador de quem desenvolve, no servidor e na nuvem. " +
      "Acaba o famoso “na minha máquina funciona”.",
    realWorld:
      "É como mudar de casa com tudo em caixas etiquetadas: não importa o caminhão nem a cidade, o " +
      "conteúdo chega igual.",
    inProject:
      "A DevLand inteira roda em três contêineres (banco, API e loja) com um único comando: docker " +
      "compose up --build. As imagens rodam sem usuário root e passam por um scanner de " +
      "vulnerabilidades antes de irem para o Docker Hub.",
  },
  "lesminha-do-pipeline": {
    explanation:
      "Pipeline é uma esteira automática que confere e prepara o código a cada mudança. CI " +
      "(integração contínua) verifica se o código novo funciona junto com o resto; CD (entrega " +
      "contínua) empacota e publica o que passou. Cada etapa só começa quando a anterior fica verde, " +
      "e um erro para a esteira antes de chegar a quem usa.",
    realWorld:
      "Lembra uma fábrica de biscoitos: massa, forma, forno e embalagem, com controle de qualidade em " +
      "cada parada.",
    inProject:
      "Todo pull request da DevLand passa por lint, formatação, build, auditoria de dependências, " +
      "checagem do contrato da API, varredura de segredos e scanner das imagens. Quando algo entra " +
      "na main, as imagens novas são publicadas sozinhas no Docker Hub.",
  },
  "corujinha-das-branches": {
    explanation:
      "Controle de versão guarda a história de cada mudança no código: quem fez, quando e por quê. " +
      "Branches são galhos paralelos dessa história, onde dá para trabalhar numa novidade sem " +
      "atrapalhar o que já funciona. Quando o galho fica pronto, ele volta para o tronco por um merge.",
    realWorld:
      "Parece um documento compartilhado em que cada pessoa escreve o próprio rascunho antes de " +
      "juntar tudo no texto final, com o histórico de versões guardado.",
    inProject:
      "Cada mudança na DevLand nasce numa branch própria (feat/…, fix/…), entra na develop por pull " +
      "request e só depois vai para a main numa release. As mensagens de commit seguem um padrão " +
      "conferido automaticamente.",
  },
  "polvo-orquestrador": {
    explanation:
      "Orquestrar é coordenar vários serviços que precisam trabalhar juntos: em que ordem eles " +
      "sobem, como conversam e o que fazer quando um deles cai. Em vez de ligar cada peça na mão, " +
      "você descreve o conjunto e o orquestrador cuida do resto.",
    realWorld:
      "É o maestro de uma orquestra: cada músico sabe tocar, mas é o maestro que diz quando cada um " +
      "entra e mantém todo mundo no mesmo ritmo.",
    inProject:
      "O docker compose sobe o banco primeiro, espera ele ficar saudável, depois a API (que confere o " +
      "banco na rota /health) e só então a loja. Se um serviço cai, ele é reiniciado sozinho.",
  },
  "tartaruga-do-rollback": {
    explanation:
      "Deploy é colocar uma versão nova no ar. Às vezes ela traz um problema que os testes não " +
      "pegaram, e a saída mais segura é o rollback: voltar rapidinho para a última versão que " +
      "funcionava, investigar com calma e tentar de novo.",
    realWorld: "É o botão de desfazer de um editor de texto, só que para um site inteiro.",
    inProject:
      "Cada imagem da DevLand no Docker Hub ganha uma etiqueta com o código do commit (sha-…), e as " +
      "releases ganham número de versão (0.2.0). Para voltar, basta subir a etiqueta anterior.",
  },
  "abelha-dos-logs": {
    explanation:
      "Observabilidade é conseguir entender o que acontece dentro de um sistema pelo que ele " +
      "registra: logs (o diário de eventos), métricas (números ao longo do tempo) e traces (o " +
      "caminho de uma requisição). Sem isso, um erro em produção vira um mistério.",
    realWorld:
      "Funciona como a caixa-preta de um avião: quando algo dá errado, é ela que conta o que " +
      "aconteceu.",
    inProject:
      "A API da DevLand registra cada requisição em JSON estruturado, com tempo de resposta e código " +
      "de status. Um erro interno aparece completo no log, mas quem usa a loja vê só uma mensagem " +
      "genérica.",
  },
  "castor-do-cache": {
    explanation:
      "Cache é guardar uma resposta pronta perto de quem pede, para não buscar ou calcular tudo de " +
      "novo. Ele deixa o sistema mais rápido e mais leve, mas pede cuidado: um dado guardado tempo " +
      "demais pode ficar desatualizado.",
    realWorld:
      "É como deixar o café passado na garrafa térmica em vez de passar um novo a cada xícara.",
    inProject:
      "O nginx da DevLand manda o navegador guardar os arquivos da loja por um ano (eles mudam de " +
      "nome a cada versão), e as ilustrações dos mascotes ficam em cache por um dia.",
  },
  "raposa-dos-segredos": {
    explanation:
      "Segredos são senhas, tokens e chaves que dão acesso a sistemas. Eles nunca devem ficar no " +
      "código, que é copiado, compartilhado e guardado no histórico para sempre. O lugar deles é um " +
      "cofre: variáveis de ambiente e gerenciadores de segredos.",
    realWorld:
      "Ninguém cola a senha do banco num post-it na porta da geladeira, mesmo que só a família veja.",
    inProject:
      "O token do Docker Hub fica no GitHub Secrets, os valores locais ficam num .env fora do git e " +
      "o gitleaks procura segredos em cada pull request. E a loja segue a regra até no checkout: ela " +
      "nunca pede dados de cartão.",
  },
  "joao-de-barro-da-infraestrutura": {
    explanation:
      "Infraestrutura como código é descrever em arquivos de texto tudo de que um sistema precisa " +
      "para rodar: servidores, bancos de dados, redes e permissões. Uma ferramenta, como o " +
      "Terraform, lê essa descrição, mostra o que vai mudar e cria tudo do mesmo jeito, quantas " +
      "vezes for preciso. Nada de clicar em painéis e torcer para lembrar de cada passo.",
    realWorld:
      "É a planta de uma casa: com ela, qualquer equipe constrói a mesma casa, e uma reforma começa " +
      "mudando o desenho, não quebrando parede no improviso.",
    inProject:
      "O projeto da Vercel (site e API) e o banco PostgreSQL no Neon, com um banco separado para os " +
      "previews, são criados pelo Terraform a partir da pasta infra/. Antes de aplicar, o plan " +
      "mostra o que vai mudar, e o estado e as chaves ficam fora do git.",
  },
};
