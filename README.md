# ZERO — Arena

ZERO é um FPS arcade 3D para navegador, com controles para celular e PC e salas multiplayer online.

## O que está nesta versão
- Arena sci-fi refeita com iluminação, materiais, marcações, módulos de cobertura e melhor leitura visual.
- Personagem com silhueta humanoide segmentada e alvos robóticos detalhados.
- Câmera em primeira pessoa e dois modos de terceira pessoa, com prevenção de atravessamento de obstáculos.
- Controles de toque, joystick, olhar por arrasto, disparo, pulo e corrida; teclado e mouse no PC.
- Lobby com treino solo, partida rápida, criação de sala, entrada por código, lista de jogadores e prontidão.
- Salas Socket.IO com até 6 participantes e sincronização em tempo real da posição dos jogadores e efeitos de disparo visíveis para a equipe.
- Qualidade gráfica ajustável para equilibrar visual e desempenho em celulares.

## Executar
Requer Node.js 20+.

npm install
npm start

Abra http://localhost:3000.

## Controles
- PC: WASD, mouse, clique para disparar, Espaço para pular, Shift para correr, R para recarregar, C para alternar câmera e Esc para pausar.
- Celular: joystick esquerdo, arraste a área direita para olhar e use os botões de disparo, pulo e corrida.

## Multiplayer
Crie uma sala e compartilhe o código de seis caracteres, ou use Partida Rápida. Todos os participantes precisam marcar "Ficar pronto"; o líder da sala inicia a partida quando houver pelo menos dois jogadores. Esta versão sincroniza a presença e a movimentação dos jogadores na arena de treino. O efeito de disparos também é mostrado aos outros participantes. Progresso de alvos, pontuação compartilhada, combate entre jogadores, matchmaking por região e persistência de salas ainda não fazem parte desta etapa.

## Verificações locais
npm test
npm run check

A cena usa Three.js via CDN, então é necessária conexão com a internet para carregá-la no navegador.
