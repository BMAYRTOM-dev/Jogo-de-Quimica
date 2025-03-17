// Importa funções do Firebase para salvar a pontuação e obter o ranking
import { saveScore, getRanking } from './firebase.js';

// Variável para armazenar o nome do jogador
let playerName = '';

// Função para atualizar a exibição do ranking na tela
async function updateRanking() {
  // Obtém todos os elementos HTML que exibem o ranking
  const rankingLists = document.getElementsByClassName('rankingList');

  // Busca o ranking atualizado do Firebase
  const ranking = await getRanking();

  // Itera sobre cada lista de ranking e atualiza o conteúdo
  Array.from(rankingLists).forEach(rankingList => {
    rankingList.innerHTML = ranking
      .map((entry, index) => `
        <p>${index + 1}. ${entry.name}: ${entry.score}</p>
      `)
      .join('');
  });

  // Exibe a seção de ranking na tela
  document.getElementById('ranking').style.display = 'block';
}

// Obtém o elemento canvas e seu contexto para desenhar o jogo
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da tela de game over e pontuação final
const gameOverScreen = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');

// Objeto que representa o Pac-Man (jogador)
const pacMan = { x: 300, y: 300, size: 20, dx: 0, dy: 0, speed: 2, mouthState: 0 };

// Lista de moléculas que o jogador pode coletar
const molecules = [];

// Pontuação do jogador e estado do jogo (se está rodando ou não)
let score = 0;
let gameRunning = true;

// Objeto com as imagens das moléculas
const moleculeImages = {
  'Álcool': 'alcool.webp',
  'Cetona': 'cetona.png',
  'Éster': 'ester.png',
  'Aldeído': 'aldeido.png',
  'Ácido': 'acido.png'
};

// Configuração do joystick virtual
const manager = nipplejs.create({
  zone: document.getElementById('joystick'),
  mode: 'dynamic',
  position: { left: '50px', top: '50px' },
  color: 'white',
  size: 100
});

// Evento que detecta o movimento do joystick
manager.on('move', (evt, data) => {
  const force = data.force; // Força do movimento
  const angle = data.angle.radian; // Ângulo do movimento

  // Atualiza a direção do Pac-Man com base no movimento do joystick
  pacMan.dx = Math.cos(angle) * force * pacMan.speed;
  pacMan.dy = Math.sin(angle) * -force * pacMan.speed;
});

// Evento que detecta quando o joystick é solto
manager.on('end', () => {
  pacMan.dx = 0;
  pacMan.dy = 0;
});

// Atualiza score na tela
const updateScore = () => {
  document.getElementById("scoreLabel").textContent = "Pontuação: " + score
}

// Função para desenhar o Pac-Man na tela
function drawPacMan() {
  ctx.shadowColor = 'yellow'; // Sombra amarela para efeito visual
  ctx.shadowBlur = 15; // Intensidade da sombra
  ctx.beginPath();

  // Calcula o ângulo da boca do Pac-Man para simular a animação de abertura e fechamento
  const mouthAngle = 0.1 * Math.PI * (Math.sin(pacMan.mouthState) + 1);
  ctx.arc(pacMan.x, pacMan.y, pacMan.size, mouthAngle, 2 * Math.PI - mouthAngle);
  ctx.lineTo(pacMan.x, pacMan.y);
  ctx.fillStyle = 'yellow'; // Cor do Pac-Man
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0; // Remove a sombra após desenhar
  pacMan.mouthState += 0.2; // Atualiza o estado da boca para animação
}

// Função para desenhar as moléculas na tela
function drawMolecules() {
  molecules.forEach(m => {
    const img = new Image();
    img.src = moleculeImages[m.label]; // Carrega a imagem da molécula

    // Efeito de pulso (aumenta e diminui o tamanho da molécula)
    const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
    const size = 30 * scale;

    // Efeito de rotação (faz a molécula girar)
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Date.now() / 1000);

    // Se for um ácido, aplica um efeito de fade out (desaparecimento gradual)
    if (m.label === 'Ácido') {
      ctx.globalAlpha = Math.min(1, m.timer / 2000); // Fade out
    }

    // Desenha a molécula na tela
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  });
}

// Função para gerar moléculas na tela
function spawnMolecules(count = 3) {
  const functions = Object.keys(moleculeImages); // Tipos de moléculas disponíveis
  for (let i = 0; i < count; i++) {
    const label = functions[Math.floor(Math.random() * functions.length)]; // Escolhe um tipo aleatório
    const molecule = {
      x: Math.random() * canvas.width, // Posição X aleatória
      y: Math.random() * canvas.height, // Posição Y aleatória
      label: label // Tipo da molécula
    };

    // Se for um ácido, adiciona um temporizador para desaparecer após 5 segundos
    if (label === 'Ácido') {
      molecule.timer = 5000; // 5 segundos em milissegundos
    }

    molecules.push(molecule); // Adiciona a molécula à lista
  }
}

// Função principal de atualização do jogo
function update() {
  if (!gameRunning) return; // Se o jogo não estiver rodando, não faz nada

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas para o próximo frame

  // Atualiza a posição do Pac-Man com base na direção (dx e dy)
  pacMan.x += pacMan.dx;
  pacMan.y += pacMan.dy;

  // Verifica se o Pac-Man saiu da tela e o reposiciona no lado oposto
  if (pacMan.x < 0) pacMan.x = canvas.width;
  if (pacMan.x > canvas.width) pacMan.x = 0;
  if (pacMan.y < 0) pacMan.y = canvas.height;
  if (pacMan.y > canvas.height) pacMan.y = 0;

  // Atualiza o temporizador dos ácidos e remove os expirados
  molecules.forEach((m, i) => {
    if (m.label === 'Ácido' && m.timer !== undefined) {
      m.timer -= 16.67; // Aproximadamente 1 frame (60 FPS)
      if (m.timer <= 0) {
        molecules.splice(i, 1); // Remove o ácido expirado
      }
    }
  });

  // Verifica colisões entre o Pac-Man e as moléculas
  molecules.forEach((m, i) => {
    const dist = Math.hypot(pacMan.x - m.x, pacMan.y - m.y); // Distância entre Pac-Man e a molécula
    if (dist < pacMan.size + 10) { // Se houver colisão
      if (m.label === 'Ácido') {
        endGame(); // Se for um ácido, termina o jogo
      } else {
        score += 10; // Incrementa a pontuação
        updateScore()
        pacMan.speed += 0.2; // Aumenta a velocidade do Pac-Man
        molecules.splice(i, 1); // Remove a molécula coletada
        if (molecules.length < 10) {
          spawnMolecules(2); // Gera mais 2 moléculas
        }
      }
    }
  });

  // Desenha o Pac-Man e as moléculas na tela
  drawPacMan();
  drawMolecules();

  // Chama a função update novamente para o próximo frame
  requestAnimationFrame(update);
}

// Função para encerrar o jogo
function endGame() {
  gameRunning = false; // Para o jogo
  finalScore.textContent = `Sua pontuação: ${score}`; // Exibe a pontuação final
  gameOverScreen.style.display = 'block'; // Mostra a tela de game over

  // Salva a pontuação apenas se o jogador coletou pontos
  if (score > 0) {
    saveScore(playerName, score).then(updateRanking); // Salva no Firebase e atualiza o ranking
  }
}

// Função para reiniciar o jogo
function restartGame() {
  score = 0; // Zera a pontuação
  updateScore()
  pacMan.x = 300; // Reposiciona o Pac-Man
  pacMan.y = 300;
  pacMan.speed = 4; // Reseta a velocidade
  molecules.length = 0; // Limpa a lista de moléculas
  spawnMolecules(); // Gera novas moléculas
  gameOverScreen.style.display = 'none'; // Esconde a tela de game over
  gameRunning = true; // Reinicia o jogo
  update(); // Começa a atualização do jogo
}
document.querySelector('#restartGame').addEventListener('click', restartGame);

// Função para iniciar o jogo
function startGame() {
  playerName = document.getElementById('playerName').value.trim(); // Obtém o nome do jogador

  if (!playerName) {
    alert("Por favor, digite seu nome!"); // Alerta se o nome não for informado
    return;
  }

  // Esconde a tela inicial
  document.getElementById('startScreen').style.display = 'none';

  // Mostra os elementos do jogo
  document.getElementById('scoreLabel').style.display = 'block';
  document.getElementById('rankingGame').style.display = 'block';
  document.getElementById('gameCanvas').style.display = 'block';
  document.getElementById('joystick').style.display = 'block';

  // Inicia o jogo
  spawnMolecules(); // Gera as moléculas iniciais
  update(); // Começa a atualização do jogo
}
document.querySelector('#startGame').addEventListener('click', startGame);

// Atualiza o ranking ao carregar a página
updateRanking();