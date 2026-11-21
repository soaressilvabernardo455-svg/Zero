# ZERO

ZERO é um FPS arcade 3D para navegador, pensado para celular e PC.

## Requisitos
- Node.js 20+
- Navegador moderno com WebGL 2
- Conexão com a internet para carregar Three.js pelo CDN

## Executar
1. Instale Node.js.
2. Execute \`npm install\`.
3. Execute \`npm start\`.
4. Abra \`http://localhost:3000\`.

## Controles
- PC: WASD para mover, mouse para olhar, clique para disparar, Espaço para pular, R para recarregar, C para alternar câmera.
- Celular: joystick esquerdo para mover, arraste o lado direito para olhar e use os botões na tela.

## Estado desta versão
- Cena 3D procedural, mapa de treino, obstáculos e alvos móveis.
- Câmera em primeira pessoa, terceira pessoa e frontal.
- Disparo arcade com projéteis de energia, recarga e munição.
- Controles adaptados para toque e teclado/mouse.
- Configurações de sensibilidade e qualidade.
- Servidor Express com rota de saúde.

Multiplayer, salas online, bots avançados e matchmaking ficam para a próxima etapa. Esta versão não deve ser considerada multiplayer.

## Verificações
Execute \`npm test\` para validar as funções básicas de configuração e movimento.
