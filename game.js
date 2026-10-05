const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('message');
ctx.imageSmoothingEnabled = false;

const keys = {};
const controls = {
  p1: { left: 'a', right: 'd', jump: 'w', punch: 'f', kick: 'g' },
  p2: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', punch: 'Slash', kick: 'Period' },
};

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: 610,
  matchState: 'title',
  timer: 99,
  hintFlash: 0,
  bannerText: 'PRESS START',
};

const players = [
  {
    id: 'p1',
    name: 'PLAYER 1',
    x: 250,
    y: 0,
    width: 96,
    height: 180,
    vx: 0,
    vy: 0,
    hp: 100,
    facing: 1,
    color: '#2b74ff',
    accent: '#dfe7ff',
    skin: '#f7d2ad',
    hair: '#192f44',
    onGround: false,
    attack: null,
    attackTimer: 0,
    attackCooldown: 0,
    hitFreeze: 0,
    lastHitBy: null,
    number: 10,
    controls: controls.p1,
  },
  {
    id: 'p2',
    name: 'PLAYER 2',
    x: 950,
    y: 0,
    width: 96,
    height: 180,
    vx: 0,
    vy: 0,
    hp: 100,
    facing: -1,
    color: '#e5a03d',
    accent: '#fff1cf',
    skin: '#f0c8a0',
    hair: '#3b1f10',
    onGround: false,
    attack: null,
    attackTimer: 0,
    attackCooldown: 0,
    hitFreeze: 0,
    lastHitBy: null,
    number: 9,
    controls: controls.p2,
  },
];

let lastTime = 0;

function resetMatch() {
  world.matchState = 'fight';
  world.timer = 99;
  world.hintFlash = 0;
  world.bannerText = 'FIGHT!';
  messageEl.textContent = 'FIGHT!';
  messageEl.classList.add('visible');

  players.forEach((player, index) => {
    player.hp = 100;
    player.vx = 0;
    player.vy = 0;
    player.attack = null;
    player.attackTimer = 0;
    player.attackCooldown = 0;
    player.hitFreeze = 0;
    player.lastHitBy = null;
    player.x = index === 0 ? 250 : 950;
    player.y = 0;
    player.facing = index === 0 ? 1 : -1;
    player.onGround = false;
  });
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = true;

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (world.matchState !== 'fight') {
      resetMatch();
    }
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAngle(angle) {
  return angle < -Math.PI ? angle + Math.PI * 2 : angle;
}

function canMove(player) {
  return !player.hitFreeze && world.matchState === 'fight';
}

function attack(player, opponent, type) {
  if (player.attackCooldown > 0 || player.attackTimer > 0 || world.matchState !== 'fight') {
    return;
  }

  player.attack = type;
  player.attackTimer = type === 'punch' ? 0.28 : 0.42;
  player.attackCooldown = type === 'punch' ? 0.32 : 0.56;

  const reach = type === 'punch' ? 110 : 138;
  const punchWindow = type === 'punch' ? 0.16 : 0.2;
  const isInRange = Math.abs(player.x - opponent.x) < reach && Math.abs(player.y - opponent.y) < 70;
  if (isInRange && player.attackTimer > punchWindow) {
    const dmg = type === 'punch' ? 12 : 18;
    opponent.hp = clamp(opponent.hp - dmg, 0, 100);
    opponent.hitFreeze = 0.14;
    opponent.vx = (opponent.x - player.x) * 0.2;
    opponent.vy = -7;
    opponent.lastHitBy = player.id;
  }
}

function updatePlayer(player, opponent, dt) {
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.hitFreeze = Math.max(0, player.hitFreeze - dt);

  if (player.attackTimer > 0) {
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    if (player.attackTimer === 0) {
      player.attack = null;
    }
  }

  if (player.hitFreeze <= 0 && canMove(player)) {
    let inputX = 0;
    if (keys[player.controls.left]) inputX -= 1;
    if (keys[player.controls.right]) inputX += 1;
    if (inputX !== 0) {
      player.vx = inputX * 280;
      player.facing = inputX > 0 ? 1 : -1;
    } else {
      player.vx *= 0.72;
      if (Math.abs(player.vx) < 1) player.vx = 0;
    }

    if (player.onGround && keys[player.controls.jump]) {
      player.vy = -720;
      player.onGround = false;
    }

    if (keys[player.controls.punch]) {
      attack(player, opponent, 'punch');
      keys[player.controls.punch] = false;
    }

    if (keys[player.controls.kick]) {
      attack(player, opponent, 'kick');
      keys[player.controls.kick] = false;
    }
  }

  if (!player.onGround) {
    player.vy += 1120 * dt;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, 70, world.width - 90);

  if (player.y >= world.groundY - player.height) {
    player.y = world.groundY - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  const towardOpponent = player.x < opponent.x ? 1 : -1;
  player.facing = towardOpponent;
}

function update(dt) {
  if (world.matchState === 'title') {
    world.hintFlash += dt;
    messageEl.textContent = 'PRESS START';
    messageEl.classList.toggle('visible', Math.sin(world.hintFlash * 8) > 0);
    return;
  }

  if (world.matchState === 'fight') {
    world.timer = Math.max(0, world.timer - dt);
    if (world.timer <= 0) {
      const p1Life = players[0].hp;
      const p2Life = players[1].hp;
      if (p1Life === p2Life) {
        world.bannerText = 'DRAW';
      } else {
        world.bannerText = p1Life > p2Life ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
      }
      world.matchState = 'result';
      messageEl.textContent = world.bannerText;
      messageEl.classList.add('visible');
      return;
    }

    if (players[0].hp <= 0 || players[1].hp <= 0) {
      world.matchState = 'result';
      world.bannerText = players[0].hp > players[1].hp ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
      messageEl.textContent = world.bannerText;
      messageEl.classList.add('visible');
      return;
    }

    updatePlayer(players[0], players[1], dt);
    updatePlayer(players[1], players[0], dt);

    if (Math.abs(players[0].x - players[1].x) < 90) {
      const separation = (90 - Math.abs(players[0].x - players[1].x)) * 0.05;
      players[0].x += players[0].x < players[1].x ? -separation : separation;
      players[1].x += players[1].x < players[0].x ? -separation : separation;
    }

    players[0].x = clamp(players[0].x, 80, world.width - 90);
    players[1].x = clamp(players[1].x, 80, world.width - 90);

    if (players[0].attack && players[0].attackTimer > 0.15) {
      const touch = Math.abs(players[0].x - players[1].x) < 110 && Math.abs(players[0].y - players[1].y) < 120;
      if (touch && players[1].hitFreeze <= 0) {
        const dmg = players[0].attack === 'punch' ? 12 : 18;
        players[1].hp = clamp(players[1].hp - dmg, 0, 100);
        players[1].hitFreeze = 0.12;
        players[1].vx = players[1].x >= players[0].x ? 140 : -140;
        players[1].vy = -200;
      }
    }

    if (players[1].attack && players[1].attackTimer > 0.15) {
      const touch = Math.abs(players[1].x - players[0].x) < 110 && Math.abs(players[1].y - players[0].y) < 120;
      if (touch && players[0].hitFreeze <= 0) {
        const dmg = players[1].attack === 'punch' ? 12 : 18;
        players[0].hp = clamp(players[0].hp - dmg, 0, 100);
        players[0].hitFreeze = 0.12;
        players[0].vx = players[0].x >= players[1].x ? 140 : -140;
        players[0].vy = -200;
      }
    }

    if (players[0].hp <= 0 || players[1].hp <= 0) {
      world.matchState = 'result';
      world.bannerText = players[0].hp > players[1].hp ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
      messageEl.textContent = world.bannerText;
      messageEl.classList.add('visible');
    }
  }

  if (world.matchState === 'result') {
    messageEl.classList.add('visible');
    if (keys['enter'] || keys[' ']) {
      resetMatch();
      keys['enter'] = false;
      keys[' '] = false;
    }
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#31203e');
  sky.addColorStop(0.25, '#7d5f8d');
  sky.addColorStop(0.52, '#eaa661');
  sky.addColorStop(0.8, '#d86446');
  sky.addColorStop(1, '#4b253f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 201, 94, 0.85)';
  ctx.beginPath();
  ctx.arc(1015, 125, 85, 0, Math.PI * 2);
  ctx.fill();

  drawMountain(0, 380, 250, 220, '#534587');
  drawMountain(180, 360, 270, 230, '#4a395f');
  drawMountain(430, 390, 250, 180, '#533a60');
  drawMountain(680, 350, 260, 190, '#6d5771');
  drawMountain(920, 370, 240, 200, '#533d5f');

  ctx.fillStyle = '#1a2f3c';
  ctx.fillRect(0, 510, canvas.width, 210);

  drawTemple(80, 250, 160, 120);
  drawTemple(960, 250, 160, 120);

  ctx.fillStyle = '#0a171d';
  ctx.fillRect(0, 560, canvas.width, 160);
  ctx.fillStyle = '#7d4f5f';
  ctx.fillRect(0, 562, canvas.width, 8);

  for (let i = 0; i < 32; i++) {
    const x = (i * 43) % canvas.width;
    const y = 500 + (i % 6) * 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(x, y, 2, 10);
  }

  drawLantern(140, 255, '#f4d48a');
  drawLantern(1145, 255, '#f7d487');
  drawTrees();
  drawWaterfall();
  drawBridge();
}

function drawMountain(baseX, baseY, width, height, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY + height);
  ctx.lineTo(baseX + width * 0.18, baseY + height * 0.24);
  ctx.lineTo(baseX + width * 0.49, baseY + height * 0.7);
  ctx.lineTo(baseX + width * 0.75, baseY + height * 0.18);
  ctx.lineTo(baseX + width, baseY + height);
  ctx.closePath();
  ctx.fill();
}

function drawTemple(x, y, w, h) {
  ctx.fillStyle = '#d5bcae';
  ctx.fillRect(x + 36, y + 14, w - 72, h - 10);
  ctx.fillStyle = '#f9cf82';
  ctx.fillRect(x + 12, y + 14, w - 24, 18);
  ctx.fillStyle = '#7d5f61';
  ctx.fillRect(x + 28, y + 32, 10, h - 22);
  ctx.fillRect(x + w - 38, y + 32, 10, h - 22);
  ctx.fillStyle = '#b74043';
  ctx.fillRect(x + 22, y + 80, w - 44, 24);
  ctx.fillStyle = '#2b2f58';
  ctx.fillRect(x + 48, y + 54, w - 96, h - 40);
}

function drawTrees() {
  ctx.fillStyle = '#6e2a2e';
  ctx.fillRect(60, 438, 10, 80);
  ctx.fillRect(1170, 446, 10, 80);

  for (let i = 0; i < 16; i++) {
    const x = 25 + i * 70;
    const y = 430 + (i % 3) * 18;
    ctx.fillStyle = '#fa9cc9';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 16, y + 10, 18, 0, Math.PI * 2);
    ctx.arc(x - 14, y + 8, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLantern(x, y, color) {
  ctx.fillStyle = '#3d2d1f';
  ctx.fillRect(x, y + 12, 8, 72);
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y, 32, 18);
  ctx.fillRect(x - 10, y + 18, 28, 30);
  ctx.fillStyle = '#f5d777';
  ctx.fillRect(x - 4, y + 24, 16, 12);
}

function drawWaterfall() {
  ctx.fillStyle = '#0a7cb3';
  ctx.beginPath();
  ctx.moveTo(810, 490);
  ctx.lineTo(865, 490);
  ctx.lineTo(860, 620);
  ctx.lineTo(812, 620);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8ecfef';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(820 + i * 4, 500 + (i % 3) * 20, 2, 92);
  }
}

function drawBridge() {
  ctx.fillStyle = '#5a3b2d';
  ctx.fillRect(220, 540, 840, 26);
  for (let x = 260; x < 1050; x += 80) {
    ctx.fillRect(x, 518, 12, 78);
  }
}

function drawPlayer(player) {
  const px = player.x;
  const py = player.y;
  const stance = player.attack ? 0.1 : 0;

  ctx.save();
  ctx.translate(px, py + 30);
  ctx.scale(player.facing, 1);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 170, 52, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  const armSwing = player.attack === 'punch' ? 26 : player.attack === 'kick' ? 12 : 0;
  const legSwing = player.attack === 'kick' ? 26 : 10;

  ctx.fillStyle = player.hair;
  ctx.fillRect(-30, -102, 60, 18);

  ctx.fillStyle = player.skin;
  ctx.beginPath();
  ctx.arc(0, -80, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.fillRect(-12, -88, 5, 5);
  ctx.fillRect(7, -88, 5, 5);
  ctx.fillStyle = '#d16d4c';
  ctx.fillRect(-12, -70, 24, 6);

  ctx.fillStyle = player.color;
  ctx.fillRect(-36, -50, 72, 82);
  ctx.fillStyle = player.accent;
  ctx.fillRect(-30, -36, 60, 10);
  ctx.fillRect(-5, -50, 10, 82);
  ctx.fillRect(-24, 8, 16, 58);
  ctx.fillRect(10, 8, 16, 58);

  ctx.fillStyle = '#fff';
  ctx.fillRect(-18, 36, 36, 24);

  ctx.fillStyle = '#e3eefc';
  ctx.fillRect(-30, 18, 18, 72);
  ctx.fillRect(12, 18, 18, 72);

  ctx.fillStyle = '#fff';
  ctx.fillRect(-34, 90, 18, 68);
  ctx.fillRect(16, 90, 18, 68);

  ctx.fillStyle = '#f5f7fb';
  ctx.fillRect(-38, 154, 26, 20);
  ctx.fillRect(12, 154, 26, 20);

  ctx.fillStyle = '#d4d93d';
  ctx.fillRect(-20, 158, 14, 12);
  ctx.fillRect(6, 158, 14, 12);

  ctx.fillStyle = player.color;
  ctx.fillRect(-52, -20, 16, 58);
  ctx.fillRect(36, -20, 16, 58);

  ctx.fillStyle = '#f0d9b5';
  ctx.fillRect(-52, -12, 14, 14);
  ctx.fillRect(38, -12, 14, 14);

  ctx.fillStyle = player.color;
  ctx.fillRect(-54, -4, 14, 56);
  ctx.fillRect(40, -4, 14, 56);

  ctx.fillStyle = '#f7d2ad';
  ctx.fillRect(-26, 18, 12, 12);
  ctx.fillRect(14, 18, 12, 12);

  ctx.fillStyle = '#1b2244';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(String(player.number), -8, 10);

  if (player.attack === 'punch') {
    ctx.fillStyle = player.color;
    ctx.fillRect(48, -22, 46, 16);
    ctx.fillRect(92, -18, 16, 12);
  }

  if (player.attack === 'kick') {
    ctx.fillStyle = player.color;
    ctx.fillRect(40, 30, 56, 18);
    ctx.fillRect(94, 28, 20, 18);
  }

  ctx.restore();
}

function drawUI() {
  ctx.fillStyle = '#112245';
  ctx.fillRect(18, 21, 310, 88);
  ctx.fillRect(952, 21, 310, 88);

  ctx.strokeStyle = '#f8d767';
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 21, 310, 88);
  ctx.strokeRect(952, 21, 310, 88);

  ctx.fillStyle = '#ebf5ff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('PLAYER 1', 128, 44);
  ctx.fillText('PLAYER 2', 1046, 44);

  ctx.fillStyle = '#2d4b9c';
  ctx.fillRect(122, 56, 172, 26);
  ctx.fillRect(986, 56, 172, 26);
  ctx.fillStyle = '#f7d767';
  ctx.fillRect(122, 56, (players[0].hp / 100) * 172, 26);
  ctx.fillRect(986 + (100 - players[1].hp) / 100 * 172, 56, (players[1].hp / 100) * 172, 26);

  ctx.fillStyle = '#f4dc75';
  ctx.fillRect(474, 28, 330, 80);
  ctx.strokeStyle = '#f4dc75';
  ctx.strokeRect(474, 28, 330, 80);
  ctx.fillStyle = '#1d2754';
  ctx.fillRect(504, 42, 270, 54);
  ctx.fillStyle = '#ffb33a';
  ctx.font = '900 52px sans-serif';
  ctx.fillText(String(Math.ceil(world.timer)), 560, 80);

  ctx.fillStyle = '#ef5f44';
  ctx.fillRect(500, 42, 260, 4);

  if (world.matchState === 'title') {
    ctx.fillStyle = '#fff8d0';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('PRESS START', 790, 83);
  }
}

function draw() {
  drawBackground();
  drawPlayer(players[0]);
  drawPlayer(players[1]);
  drawUI();
}

function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.032);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(tick);
}

function setStartState() {
  world.matchState = 'title';
  world.timer = 99;
  messageEl.textContent = 'PRESS START';
  messageEl.classList.add('visible');
}

setStartState();
requestAnimationFrame(tick);
