import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, push, query, orderByChild, limitToLast, onValue, set, get, update } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDK5NptqXlsVg07eNs6nrSRq6cI67lNofA",
  authDomain: "nosso-mundo-62dd2.firebaseapp.com",
  databaseURL: "https://nosso-mundo-62dd2-default-rtdb.firebaseio.com",
  projectId: "nosso-mundo-62dd2",
  storageBucket: "nosso-mundo-62dd2.firebasestorage.app",
  messagingSenderId: "978695718076",
  appId: "1:978695718076:web:b48a833b5aaf374d2cfcb9"
};

const IMGBB_API_KEY = "28413a1b1873f6d2d6bb500849ccb23a";
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const USERS = {
  ana: { id: 'ana', nomeReal: 'Ana Beatriz', nomeExibicao: 'Linda', emoji: '💙', eu: 'Eu', slotDePost: 'minhas' },
  joao: { id: 'joao', nomeReal: 'João Vitor', nomeExibicao: 'Benzin', emoji: '💜', eu: 'Eu', slotDePost: 'dele' }
};

let usuarioAtual = null;
let galeria = { minhas: [], dele: [] };
let notasMural = [];

let tttBoard = Array(9).fill(null);
let tttActive = false;
let petState = null;
let listenerAtivo = false;
let isSleeping = false;
let sleepInterval = null;

// Estado do Chat
let chatListenerAtivo = false;
const userChatBgKey = 'chatBg_';
const userChatBubbleKey = 'chatBubble_';

const colorGameState = {
  sequence: [], playerIndex: 0, level: 0, playing: false, accepting: false, coinsEarned: 0,
  best: parseInt(localStorage.getItem('colorGameBest') || '0'), timeoutIds: []
};

const carCanvas = document.getElementById('carCanvas');
let ctx = null;
let canvasWidth = 0;
let canvasHeight = 0;

const carGameState = {
  running: false, speed: 6, distance: 0, coins: 0, tickRate: 30, intervalId: null,
  lastCoinCheck: 0, obstacles: [], lane: 1, carTargetX: 0, roadOffset: 0
};

// --- SISTEMA DE USUÁRIOS E NAVEGAÇÃO ---
function carregarUsuarioSalvo() {
  const salvo = localStorage.getItem('nossoCantinhoUsuario');
  if (salvo && USERS[salvo]) { usuarioAtual = USERS[salvo]; return true; }
  return false;
}
function salvarUsuario(id) { localStorage.setItem('nossoCantinhoUsuario', id); usuarioAtual = USERS[id]; }
function limparUsuario() { localStorage.removeItem('nossoCantinhoUsuario'); usuarioAtual = null; }
function getOutroUsuario() { return usuarioAtual.id === 'ana' ? USERS.joao : USERS.ana; }

document.querySelectorAll('.user-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    salvarUsuario(btn.dataset.user);
    aplicarUsuarioNaUI();
    showScreen('welcomeScreen');
    carregarTelaDeEntrada();
    carregarBichinho();
  });
});

document.getElementById('switchUserBtn').addEventListener('click', () => {
  if (confirm('Trocar de usuário? Você volta para a tela de escolha.')) {
    limparUsuario();
    showScreen('userChoiceScreen');
    document.getElementById('switchUserBtn').classList.remove('visible');
  }
});

function aplicarUsuarioNaUI() {
  if (!usuarioAtual) return;
  const outro = getOutroUsuario();
  
  document.getElementById('personalWelcome').textContent = `Que bom te ver por aqui ${usuarioAtual.emoji}`;
  document.getElementById('squareMineIcon').textContent = usuarioAtual.emoji;
  document.getElementById('squareMineTitle').textContent = `${usuarioAtual.eu} ${usuarioAtual.emoji}`;
  document.getElementById('squareMineDesc').textContent = 'Minhas fotos';
  document.getElementById('squareOtherIcon').textContent = outro.emoji;
  document.getElementById('squareOtherTitle').textContent = `${outro.nomeExibicao} ${outro.emoji}`;
  document.getElementById('squareOtherDesc').textContent = outro.id === 'ana' ? 'Fotos dela' : 'Fotos dele';
  
  document.getElementById('photoAuthorBadge').textContent = `${usuarioAtual.emoji} ${usuarioAtual.eu}`;
  document.getElementById('noteAuthorBadge').textContent = `${usuarioAtual.emoji} ${usuarioAtual.eu}`;
  document.getElementById('switchUserBtn').classList.add('visible');
  
  iniciarChat();
}

// --- CONTEÚDO E TELA DE ENTRADA ---
const cantadas = [
  "Você não é wifi, mas só de te ver eu já me conecto. 💙",
  "Se beleza fosse crime, você pegava prisão perpétua. E eu visitava todos os dias. 💜",
  "Você tem um mapa? Porque eu me perdi nos seus olhos. 👀",
  "Não sou fotógrafo, mas consigo imaginar a gente junto pra sempre. 📸",
  "Você acredita em amor à primeira vista, ou preciso passar de novo? 💘",
  "Se eu pudesse te dar uma coisa, te daria meus olhos, pra você ver o quanto é especial pra mim. ✨",
  "Você é a razão pela qual eu acredito que coisas boas acontecem com pessoas boas. 🌟",
  "Se cada vez que eu pensasse em você nascesse uma flor, o mundo seria um jardim. 🌷",
  "Você não é o sol, mas ilumina o meu dia inteiro. ☀️",
  "De todos os lugares que eu já fui, nenhum é tão bom quanto do seu lado. 🏡",
  "Meu lugar preferido no mundo é dentro do seu abraço. 🤗",
  "Você não é perfeito, e é exatamente por isso que eu te amo tanto. 💜",
  "O meu coração bate mais forte só de lembrar que você existe. 💓",
  "Não precisa de filtro, você já é a melhor versão de tudo. 📷",
  "Se eu tivesse que escolher entre você e o mundo inteiro, eu escolheria você. Sem pensar. 💙",
  "Você é a minha música favorita, aquela que eu escuto no repeat. 🎵",
  "Cada dia com você é um capítulo novo do meu livro favorito. 📖",
  "Você é a resposta de uma oração que eu nem sabia que tinha feito. 🙏",
  "Se amor fosse tempo, eu viveria pra sempre contigo. ⏳",
  "Você é meu lugar seguro, meu porto, meu lar. 💜"
];

const mensagens = {
  madrugada: [
    { titulo: "Boa madrugada 🌙", texto: "Os teus olhos viram o meu embrião; todos os dias determinados para mim foram escritos no teu livro antes de qualquer deles existir. — Salmos 139:16" },
    { titulo: "Silêncio da noite ✨", texto: "Mesmo quando tudo parece escuro, lembre-se: a lua também brilha no escuro. Você é luz, mesmo quando não percebe." },
    { titulo: "Descanso 🌌", texto: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei. — Mateus 11:28" }
  ],
  manha: [
    { titulo: "Bom dia ☀️", texto: "As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; renovam-se cada manhã. — Lamentações 3:22-23" },
    { titulo: "Novo começo 🌱", texto: "Hoje é uma página em branco. Escreva nela algo que te faça sorrir daqui a um ano." },
    { titulo: "Força pra hoje 💪", texto: "Posso todas as coisas naquele que me fortalece. — Filipenses 4:13" }
  ],
  tarde: [
    { titulo: "Boa tarde 🌻", texto: "Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu. — Eclesiastes 3:1" },
    { titulo: "Pausa consciente ☕", texto: "Respire. Você já fez muito até aqui. Permita-se descansar um instante sem culpa." },
    { titulo: "Perseverança 🍃", texto: "E não nos cansemos de fazer o bem, porque a seu tempo ceifaremos, se não houvermos desfalecido. — Gálatas 6:9" }
  ],
  noite: [
    { titulo: "Boa noite 🌙", texto: "Em paz me deitarei e dormirei, porque só tu, Senhor, me fazes habitar em segurança. — Salmos 4:8" },
    { titulo: "Fim de dia 🌆", texto: "Que a noite te envolva em calma e que os teus sonhos sejam doces como o teu sorriso." },
    { titulo: "Gratidão noturna ✨", texto: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti. — Números 6:24-25" }
  ]
};

function getPeriodoDoDia(hora) {
  if (hora >= 0 && hora < 6) return 'madrugada';
  if (hora >= 6 && hora < 12) return 'manha';
  if (hora >= 12 && hora < 18) return 'tarde';
  return 'noite';
}
function getSaudacao(hora) {
  if (hora >= 0 && hora < 6) return 'Boa madrugada 🌙';
  if (hora >= 6 && hora < 12) return 'Bom dia ☀️';
  if (hora >= 12 && hora < 18) return 'Boa tarde 🌻';
  return 'Boa noite 🌙';
}

function carregarTelaDeEntrada() {
  const agora = new Date();
  const hora = agora.getHours();
  const periodo = getPeriodoDoDia(hora);
  const lista = mensagens[periodo];
  const escolhida = lista[Math.floor(Math.random() * lista.length)];
  document.getElementById('greetingTime').textContent = getSaudacao(hora);
  document.getElementById('welcomeTitle').textContent = escolhida.titulo;
}

function revelarFrase() {
  const agora = new Date();
  const periodo = getPeriodoDoDia(agora.getHours());
  const ehCantada = Math.random() < 0.5;
  let texto, badge;
  if (ehCantada) {
    texto = cantadas[Math.floor(Math.random() * cantadas.length)];
    badge = '💌 Cantada especial';
  } else {
    const lista = mensagens[periodo];
    const escolhida = lista[Math.floor(Math.random() * lista.length)];
    texto = escolhida.texto;
    badge = '🌷 Frase do momento';
  }
  const reveal = document.getElementById('phraseReveal');
  reveal.style.opacity = 0;
  setTimeout(() => { reveal.textContent = texto; reveal.style.opacity = 1; }, 200);
  document.getElementById('phraseBadge').textContent = badge;
  document.getElementById('revealPhraseBtn').textContent = 'Ver outra 🌿';
  document.getElementById('enterButton').style.display = 'inline-block';
}

document.getElementById('revealPhraseBtn').addEventListener('click', revelarFrase);
document.getElementById('enterButton').addEventListener('click', () => showScreen('worldScreen'));

document.getElementById('openChatBtn').addEventListener('click', () => {
  showScreen('chatScreen');
  setTimeout(() => {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScreen('worldScreen'));
});

// --- CARROSSEL ---
let carrosselIndex = 0;
let carrosselTimer = null;
function juntarFotosDoDia() { return [...(galeria.minhas || []), ...(galeria.dele || [])]; }

function iniciarCarrossel() {
  const carrossel = document.getElementById('carousel');
  const dotsContainer = document.getElementById('carouselDots');
  const fotos = juntarFotosDoDia();
  carrossel.innerHTML = '';
  dotsContainer.innerHTML = '';
  if (carrosselTimer) clearInterval(carrosselTimer);

  if (fotos.length === 0) {
    carrossel.innerHTML = `<div class="carousel-empty"><span>📷</span><p>Ainda não há fotos do dia.</p><p style="font-size:0.8rem;">Adicione uma foto abaixo 💜</p></div>`;
    return;
  }

  fotos.forEach((foto, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide' + (i === 0 ? ' active' : '');
    slide.innerHTML = `<img src="${foto.url}" alt="${foto.legenda || ''}" loading="lazy">${foto.legenda ? `<div class="carousel-caption">${foto.legenda}</div>` : ''}`;
    carrossel.appendChild(slide);
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dotsContainer.appendChild(dot);
  });

  carrosselIndex = 0;
  carrosselTimer = setInterval(() => {
    const slides = carrossel.querySelectorAll('.carousel-slide');
    const dots = dotsContainer.querySelectorAll('.dot');
    slides[carrosselIndex].classList.remove('active');
    dots[carrosselIndex].classList.remove('active');
    carrosselIndex = (carrosselIndex + 1) % slides.length;
    slides[carrosselIndex].classList.add('active');
    dots[carrosselIndex].classList.add('active');
  }, 4000);
}

document.querySelectorAll('.photo-square').forEach(sq => {
  sq.addEventListener('click', () => {
    if (!usuarioAtual) return;
    const tipo = sq.dataset.gallery;
    const outro = getOutroUsuario();
    const slot = tipo === 'mine' ? usuarioAtual.slotDePost : outro.slotDePost;
    
    let titulo = '';
    if (tipo === 'mine') {
      titulo = `${usuarioAtual.eu} ${usuarioAtual.emoji}`;
    } else {
      titulo = `${outro.nomeExibicao} ${outro.emoji}`;
    }

    renderGallery(slot);
    document.getElementById('galleryTitle').textContent = titulo;
    showScreen('galleryScreen');
  });
});

function renderGallery(slot) {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '';
  const fotos = galeria[slot] || [];
  if (fotos.length === 0) {
    grid.innerHTML = `<div class="empty-gallery"><span>🖼️</span><p>Ainda não há fotos aqui.</p><p style="margin-top:8px;font-size:0.85rem;">Adicione uma foto no Nosso Mundo 💜</p></div>`;
    return;
  }
  fotos.forEach(foto => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.innerHTML = `<img src="${foto.url}" alt="${foto.legenda || ''}" loading="lazy">${foto.legenda ? `<div class="photo-caption">${foto.legenda}</div>` : ''}`;
    card.addEventListener('click', () => openModal(foto.url));
    grid.appendChild(card);
  });
}

function openModal(url) {
  document.getElementById('modalImage').src = url;
  document.getElementById('photoModal').classList.add('active');
}
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('photoModal').classList.remove('active');
});
document.getElementById('photoModal').addEventListener('click', (e) => {
  if (e.target.id === 'photoModal') e.currentTarget.classList.remove('active');
});

// --- UPLOAD DE FOTOS ---
document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
  if (!usuarioAtual) return;
  document.getElementById('photoInput').click();
});

document.getElementById('photoInput').addEventListener('change', async (event) => {
  const arquivo = event.target.files[0];
  if (!arquivo || !usuarioAtual) return;
  const btn = document.getElementById('uploadPhotoBtn');
  const textoOriginal = btn.textContent;
  btn.textContent = '⏳ Enviando...';
  btn.disabled = true;
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(arquivo);
    });
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', base64);
    const resposta = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
    if (!resposta.ok) throw new Error(`Erro no upload: ${resposta.status}`);
    const dados = await resposta.json();
    if (!dados.success || !dados.data || !dados.data.url) throw new Error('ImgBB não retornou o link da imagem.');
    const urlFoto = dados.data.url;
    const legenda = document.getElementById('photoCaption').value.trim();
    await push(ref(database, 'fotos'), {
      url: urlFoto, legenda, alvo: usuarioAtual.slotDePost,
      autor: usuarioAtual.id, timestamp: Date.now(),
      notaTexto: "", notaTimestamp: 0
    });
    document.getElementById('photoCaption').value = '';
    btn.textContent = '✅ Foto adicionada!';
    setTimeout(() => { btn.textContent = textoOriginal; btn.disabled = false; }, 2000);
  } catch (erro) {
    console.error('Erro ao enviar foto:', erro);
    alert('Não foi possível enviar a foto.\n\nDetalhe: ' + erro.message);
    btn.textContent = textoOriginal;
    btn.disabled = false;
  } finally {
    event.target.value = '';
  }
});

// --- NAVEGAÇÃO DE JOGOS ---
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const game = card.dataset.game;
    if (game === 'ranking') showScreen('rankingScreen');
    if (game === 'pet') showScreen('petGameScreen');
  });
});
document.getElementById('petSceneHome').addEventListener('click', () => showScreen('petGameScreen'));

// --- FRASE DO MOMENTO ---
function novaFraseAleatoria() {
  const agora = new Date();
  const periodo = getPeriodoDoDia(agora.getHours());
  const lista = mensagens[periodo];
  const escolhida = lista[Math.floor(Math.random() * lista.length)];
  document.getElementById('phraseText').textContent = escolhida.texto;
  document.getElementById('phraseAuthor').textContent = escolhida.titulo;
}
document.getElementById('newPhraseBtn').addEventListener('click', novaFraseAleatoria);
novaFraseAleatoria();

// --- MURAL (Legenda na foto) ---
document.getElementById('addNoteBtn').addEventListener('click', async () => {
  if (!usuarioAtual) return;
  const texto = document.getElementById('noteText').value.trim();
  if (!texto) { alert('Escreva uma mensagem 💜'); return; }

  const lista = galeria[usuarioAtual.slotDePost] || [];
  if (lista.length > 0) {
    const ultimaFoto = lista[lista.length - 1];
    await update(ref(database, 'fotos/' + ultimaFoto.id), {
      notaTexto: texto,
      notaTimestamp: Date.now(),
      notaAutor: usuarioAtual.id
    });
    document.getElementById('noteText').value = '';
    mostrarToast('💌 Legenda atualizada!');
  } else {
    mostrarToast('❌ Adicione uma foto primeiro!');
  }
});

function carregarMural() {
  const muralQuery = query(ref(database, 'mural'), orderByChild('timestamp'), limitToLast(50));
  onValue(muralQuery, (snapshot) => {
    notasMural = [];
    snapshot.forEach(child => notasMural.push({ id: child.key, ...child.val() }));
    notasMural.sort((a, b) => b.timestamp - a.timestamp);
    renderMural();
  });
}

function traduzirAutor(idAutor) {
  if (!usuarioAtual || !idAutor) return { nome: '?', emoji: '💙' };
  if (idAutor === usuarioAtual.id) return { nome: usuarioAtual.eu, emoji: usuarioAtual.emoji };
  const autor = USERS[idAutor];
  if (!autor) return { nome: '?', emoji: '💙' };
  return { nome: autor.nomeExibicao, emoji: autor.emoji };
}

function getUltimaFoto(slot) {
  const lista = galeria[slot] || [];
  return lista.length > 0 ? lista[lista.length - 1] : null;
}

function renderMural() {
  if (!usuarioAtual) return;
  const grid = document.getElementById('muralGrid');
  grid.innerHTML = '';
  const outro = getOutroUsuario();
  
  const tituloMine = `${usuarioAtual.eu} ${usuarioAtual.emoji}`;
  const tituloOther = `${outro.nomeExibicao} ${outro.emoji}`;

  const quadros = [
    { slot: usuarioAtual.slotDePost, titulo: tituloMine },
    { slot: outro.slotDePost, titulo: tituloOther }
  ];
  
  quadros.forEach(quadro => {
    const foto = getUltimaFoto(quadro.slot);
    const card = document.createElement('div');
    card.className = 'mural-card';
    
    const fotoHtml = foto
      ? `<div class="mural-photo" data-url="${foto.url}"><img src="${foto.url}" alt="${foto.legenda || ''}" loading="lazy"></div>`
      : `<div class="mural-photo"><div class="mural-photo-empty"><span>📷</span><p>Ainda sem fotos</p></div></div>`;
      
    let notaHtml = `<div class="mural-note">
        <div class="mural-note-badge">${quadro.titulo}</div>`;
        
    if (foto && foto.notaTexto) {
       const dataFormatada = new Date(foto.notaTimestamp).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const info = traduzirAutor(foto.notaAutor);
      notaHtml += `
        <div class="mural-note-author">${info.emoji} ${info.nome}</div>
        <div class="mural-note-text">${foto.notaTexto}</div>
        <div class="mural-note-date">${dataFormatada}</div>
      `;
    } else {
      notaHtml += `<p class="mural-note-empty">Sem legenda ainda. Vá em "Conversas 💬" para mandar um chat!</p>`;
    }
    notaHtml += `</div>`;
    
    card.innerHTML = fotoHtml + notaHtml;
    const fotoEl = card.querySelector('.mural-photo[data-url]');
    if (fotoEl) fotoEl.addEventListener('click', () => openModal(fotoEl.dataset.url));
    grid.appendChild(card);
  });
}

function carregarFotos() {
  const fotosQuery = query(ref(database, 'fotos'), orderByChild('timestamp'), limitToLast(100));
  onValue(fotosQuery, (snapshot) => {
    galeria = { minhas: [], dele: [] };
    snapshot.forEach(child => {
      const foto = child.val();
      if (foto.alvo && galeria[foto.alvo]) {
        galeria[foto.alvo].push({ 
          id: child.key, 
          url: foto.url, 
          legenda: foto.legenda || '',
          notaTexto: foto.notaTexto,
          notaTimestamp: foto.notaTimestamp,
          notaAutor: foto.notaAutor
        });
      }
    });
    iniciarCarrossel();
    renderMural();
  });
}

// ==========================================
// --- CHAT E PERSONALIZAÇÃO ---
// ==========================================
const chatMessagesRef = ref(database, 'chat');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMediaBtn = document.getElementById('chatMediaBtn');
const chatMediaInput = document.getElementById('chatMediaInput');
const chatContainer = document.getElementById('chatContainer');
const chatMessagesBox = document.getElementById('chatMessages');

let currentBubbleColor = '#005c4b';

function iniciarChat() {
  if (chatListenerAtivo || !usuarioAtual) return;
  chatListenerAtivo = true;

  const savedBg = localStorage.getItem(userChatBgKey + usuarioAtual.id) || 'bg-pattern';
  currentBubbleColor = localStorage.getItem(userChatBubbleKey + usuarioAtual.id) || '#005c4b';
  
  if (chatContainer) chatContainer.className = `chat-container ${savedBg}`;

  onValue(query(chatMessagesRef, orderByChild('timestamp'), limitToLast(100)), (snapshot) => {
    if (!chatMessagesBox) return;
    
    chatMessagesBox.innerHTML = '';
    const msgs = [];
    snapshot.forEach(child => msgs.push(child.val()));
    
    msgs.forEach(msg => {
      const isMine = msg.autor === usuarioAtual.id;
      const autorInfo = traduzirAutor(msg.autor);
      
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;
      
      const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let content = '';
      if (!isMine) {
        content += `<div style="font-size:0.7rem; font-weight:700; margin-bottom:4px; opacity:0.8;">${autorInfo.emoji} ${autorInfo.nome}</div>`;
      }
      
      if (msg.tipo === 'midia') {
        content += `<img src="${msg.url}" alt="Mídia" onclick="openModal('${msg.url}')">`;
      } else {
        content += `${msg.texto}`;
      }
      
      content += `<span class="chat-time">${time} ✓✓</span>`;
      bubble.innerHTML = content;
      
      if (isMine) {
        bubble.style.backgroundColor = currentBubbleColor;
      }
      
      chatMessagesBox.appendChild(bubble);
    });
    
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
  });
}

if (chatInput) {
  chatInput.addEventListener('input', function() {
    this.style.height = '44px';
    this.style.height = (this.scrollHeight) + 'px';
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatBtn.click();
    }
  });
}

if (sendChatBtn) {
  sendChatBtn.addEventListener('click', () => {
    const texto = chatInput.value.trim();
    if (!texto || !usuarioAtual) return;

    chatInput.value = '';
    chatInput.style.height = '44px';
    
    push(chatMessagesRef, {
      autor: usuarioAtual.id,
      texto: texto,
      tipo: 'texto',
      timestamp: Date.now()
    }).catch(err => {
      console.error("Erro ao enviar mensagem:", err);
      alert("Erro de conexão. Verifique as regras do Firebase.");
    });
  });
}

const btnThemeBg = document.getElementById('btnThemeBg');
if (btnThemeBg) {
  btnThemeBg.addEventListener('click', () => {
    const bgs = ['bg-pattern', 'bg-sky', 'bg-space', 'bg-hearts'];
    const currentClass = Array.from(chatContainer.classList).find(c => c.startsWith('bg-'));
    let nextIndex = (bgs.indexOf(currentClass) + 1) % bgs.length;
    
    chatContainer.classList.remove(...bgs);
    chatContainer.classList.add(bgs[nextIndex]);
    
    localStorage.setItem(userChatBgKey + usuarioAtual.id, bgs[nextIndex]);
    mostrarToast('🎨 Fundo alterado!');
  });

  btnThemeBg.addEventListener('dblclick', (e) => {
    e.preventDefault();
    document.getElementById('colorPickerContainer').style.display = 'block';
  });
}

const chatColorPicker = document.getElementById('chatColorPicker');
if (chatColorPicker) {
  chatColorPicker.addEventListener('input', (e) => {
    currentBubbleColor = e.target.value;
    localStorage.setItem(userChatBubbleKey + usuarioAtual.id, currentBubbleColor);
    document.querySelectorAll('.chat-bubble.mine').forEach(b => b.style.backgroundColor = currentBubbleColor);
  });
}

const btnGif = document.getElementById('btnGif');
if (btnGif) {
  btnGif.addEventListener('click', () => {
    const url = prompt('Cole o link do GIF (ex: termina com .gif):');
    if (!url || !url.startsWith('http')) return;

    push(chatMessagesRef, {
      autor: usuarioAtual.id,
      tipo: 'midia',
      url: url,
      timestamp: Date.now()
    }).then(() => {
      mostrarToast('🖼️ GIF enviado!');
    }).catch(err => {
      console.error(err);
      alert('Erro ao enviar. Verifique o link.');
    });
  });
}

if (chatMediaBtn) {
  chatMediaBtn.addEventListener('click', () => chatMediaInput.click());

  chatMediaInput.addEventListener('change', async (event) => {
    const arquivo = event.target.files[0];
    if (!arquivo || !usuarioAtual) return;

    chatMediaBtn.innerHTML = '⏳';
    chatMediaBtn.disabled = true;

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(arquivo);
      });

      const formData = new FormData();
      formData.append('key', IMGBB_API_KEY);
      formData.append('image', base64);

      const resposta = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
      const dados = await resposta.json();
      
      if (dados.success) {
        await push(chatMessagesRef, {
          autor: usuarioAtual.id,
          tipo: 'midia',
          url: dados.data.url,
          timestamp: Date.now()
        });
      }
    } catch (erro) {
      console.error(erro);
      alert('Não foi possível enviar a mídia.');
    } finally {
      chatMediaBtn.innerHTML = '📎';
      chatMediaBtn.disabled = false;
      event.target.value = '';
    }
  });
}

// --- LÓGICA DO BICHINHO E PONTUAÇÃO ---
function getPetRef() { return ref(database, 'bichinhos/' + usuarioAtual.id); }

async function carregarBichinho() {
  if (!usuarioAtual) return;
  const snap = await get(getPetRef());
  if (!snap.exists()) {
    const novo = { fome: 100, energia: 100, saude: 100, alegria: 100, moedas: 20, pontosCuidado: 0, pontosJogos: 0, lastUpdate: Date.now() };
    await set(getPetRef(), novo);
  } else {
    const agora = Date.now();
    const state = snap.val();
    const horas = (agora - (state.lastUpdate || agora)) / (1000 * 60 * 60);
    const decay = horas * 8;
    const decaido = {
      fome: Math.max(0, (state.fome ?? 100) - decay),
      energia: Math.max(0, (state.energia ?? 100) - decay),
      saude: Math.max(0, (state.saude ?? 100) - (decay * 0.5)),
      alegria: Math.max(0, (state.alegria ?? 100) - decay),
      moedas: state.moedas ?? 20,
      pontosCuidado: state.pontosCuidado || 0,
      pontosJogos: state.pontosJogos || 0,
      lastUpdate: agora
    };
    await update(getPetRef(), decaido);
  }
  if (!listenerAtivo) {
    onValue(getPetRef(), (snap) => {
      if (!snap.exists()) return;
      petState = snap.val();
      renderPet();
    });
    listenerAtivo = true;
  }
}

function renderPet() {
  if (!petState) return;
  document.getElementById('miniFome').style.width = petState.fome + '%';
  document.getElementById('miniEnergia').style.width = petState.energia + '%';
  document.getElementById('miniSaude').style.width = petState.saude + '%';
  document.getElementById('miniAlegria').style.width = petState.alegria + '%';
  document.getElementById('petCoins').textContent = petState.moedas || 0;
  
  const totalPontos = (petState.pontosCuidado || 0) + (petState.pontosJogos || 0);
  document.getElementById('petScoreBadge').textContent = `⭐ ${totalPontos} pts`;

  const media = (petState.fome + petState.energia + petState.saude + petState.alegria) / 4;
  let emoji = 'emoji-happy';
  if (media < 25) emoji = 'emoji-sad';
  else if (media < 50) emoji = 'emoji-meh';
  else if (media < 75) emoji = 'emoji-ok';
  
  const moyHome = document.getElementById('moyHome');
  const moyBig = document.getElementById('moyBig');
  [moyHome, moyBig].forEach(el => {
    if(el){
      el.classList.remove('emoji-happy', 'emoji-ok', 'emoji-meh', 'emoji-sad');
      el.classList.add(emoji);
    }
  });
}

function animarBichinho(tipo) {
  const moy = document.getElementById('moyBig');
  if (!moy) return;
  moy.classList.add(tipo === 'feliz' ? 'action-happy' : 'action-sad');
  setTimeout(() => moy.classList.remove('action-happy', 'action-sad'), 1000);
  
  const scene = document.getElementById('petMainScene');
  const effect = document.createElement('div');
  effect.className = 'effect-float';
  effect.style.left = (30 + Math.random() * 40) + '%';
  effect.style.bottom = '40%';
  effect.textContent = tipo === 'feliz' ? ['💜','✨','💙'][Math.floor(Math.random()*3)] : '💧';
  scene.appendChild(effect);
  setTimeout(() => effect.remove(), 1500);
}

function mostrarToast(msg) {
  const t = document.getElementById('petToast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

async function atualizarPet(changes) {
  if (!petState) return;
  const novo = { ...petState, ...changes, lastUpdate: Date.now() };
  await update(getPetRef(), novo);
}

async function adicionarMoedas(qtd) {
  if (!petState) return;
  await atualizarPet({ moedas: (petState.moedas || 0) + qtd });
}

// NOVA FUNÇÃO: ADICIONAR PONTOS ESPECÍFICOS
async function adicionarPontos(tipo, qtd) {
  if (!petState) return;
  if (tipo === 'jogo') {
    await atualizarPet({ pontosJogos: (petState.pontosJogos || 0) + qtd });
  } else if (tipo === 'cuidado') {
    await atualizarPet({ pontosCuidado: (petState.pontosCuidado || 0) + qtd });
  }
}

window.fecharOverlays = () => {
  document.querySelectorAll('.pet-overlay').forEach(el => el.classList.remove('active'));
  pararJogoCores();
  pararCarro();
};

window.abrirMercado = () => document.getElementById('overlayMercado').classList.add('active');
window.abrirHubJogos = () => document.getElementById('overlayHubJogos').classList.add('active');

window.comprarComida = async (nome, preco, fomeGanha, alegriaGanha) => {
  if ((petState.moedas || 0) < preco) { mostrarToast('❌ Moedas insuficientes!'); return; }
  window.fecharOverlays();
  animarBichinho('feliz');
  await atualizarPet({
    moedas: petState.moedas - preco,
    fome: Math.min(100, (petState.fome || 0) + fomeGanha),
    alegria: Math.min(100, (petState.alegria || 0) + alegriaGanha)
  });
  await adicionarPontos('jogo', 5); // Mercado é pontuação de jogo (interação)
  mostrarToast(`🍽️ Nhac! +${fomeGanha} fome`);
};

// --- JOGO DA VELHA ---
window.abrirJogoVelha = () => {
  document.getElementById('overlayHubJogos').classList.remove('active');
  document.getElementById('overlayJogoVelha').classList.add('active');
  iniciarJogoVelha();
};
window.fecharJogoVelha = () => {
  document.getElementById('overlayJogoVelha').classList.remove('active');
  document.getElementById('overlayHubJogos').classList.add('active');
};

function iniciarJogoVelha() {
  tttBoard = Array(9).fill(null);
  tttActive = true;
  document.getElementById('tttStatus').textContent = "Sua vez! (Você é o 💙)";
  renderTTT();
}

function renderTTT() {
  const grid = document.getElementById('tttGrid');
  grid.innerHTML = '';
  tttBoard.forEach((cell, i) => {
    const div = document.createElement('div');
    div.className = 'ttt-cell';
    div.textContent = cell || '';
    if (cell) div.style.cursor = 'default';
    else div.onclick = () => jogarTTT(i);
    grid.appendChild(div);
  });
}

async function jogarTTT(index) {
  if (!tttActive || tttBoard[index]) return;
  tttBoard[index] = '💙';
  renderTTT();

  if (verificarVitoria(tttBoard, '💙')) {
    tttActive = false;
    document.getElementById('tttStatus').textContent = "Você ganhou! 🎉 +10 moedas";
    await adicionarMoedas(10);
    await adicionarPontos('jogo', 10);
    if (petState) await atualizarPet({ alegria: Math.min(100, (petState.alegria||0) + 15) });
    mostrarToast('🏆 Vitória! +10 moedas');
    return;
  }
  if (tttBoard.every(c => c)) {
    tttActive = false;
    document.getElementById('tttStatus').textContent = "Empate! 🤝 +3 moedas";
    await adicionarMoedas(3);
    await adicionarPontos('jogo', 3);
    return;
  }
  document.getElementById('tttStatus').textContent = "Bichinho pensando... 🐰";
  setTimeout(async () => {
    const vazios = tttBoard.map((c, i) => c === null ? i : null).filter(v => v !== null);
    if (vazios.length > 0) {
      const escolha = vazios[Math.floor(Math.random() * vazios.length)];
      tttBoard[escolha] = '💜';
      renderTTT();
      if (verificarVitoria(tttBoard, '💜')) {
        tttActive = false;
        document.getElementById('tttStatus').textContent = "O bichinho ganhou! 🐰 +2 moedas";
        await adicionarMoedas(2);
        await adicionarPontos('jogo', 2);
        mostrarToast('🐰 Ele ganhou! +2 moedas');
        return;
      }
      if (tttBoard.every(c => c)) {
        tttActive = false;
        document.getElementById('tttStatus').textContent = "Empate! 🤝 +3 moedas";
        await adicionarMoedas(3);
        await adicionarPontos('jogo', 3);
        return;
      }
      document.getElementById('tttStatus').textContent = "Sua vez! (Você é o 💙)";
    }
  }, 800);
}

function verificarVitoria(b, p) {
  const linhas = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return linhas.some(l => l.every(i => b[i] === p));
}

// --- SEQUÊNCIA DE CORES ---
window.abrirJogoCores = () => {
  document.getElementById('overlayHubJogos').classList.remove('active');
  resetJogoCores();
  document.getElementById('overlayJogoCores').classList.add('active');
};
window.fecharJogoCores = () => {
  pararJogoCores();
  document.getElementById('overlayJogoCores').classList.remove('active');
  document.getElementById('overlayHubJogos').classList.add('active');
};

function resetJogoCores() {
  pararJogoCores();
  colorGameState.sequence = [];
  colorGameState.playerIndex = 0;
  colorGameState.level = 0;
  colorGameState.playing = false;
  colorGameState.accepting = false;
  colorGameState.coinsEarned = 0;
  document.getElementById('colorLevel').textContent = '0';
  document.getElementById('colorCoinsEarned').textContent = '0';
  document.getElementById('colorBest').textContent = colorGameState.best;
  document.getElementById('colorFeedback').textContent = 'Clique em "Começar" para iniciar';
  document.getElementById('colorFeedback').className = 'color-feedback';
  document.getElementById('colorStartBtn').textContent = '▶️ Começar';
  document.getElementById('colorStartBtn').disabled = false;
}

function pararJogoCores() {
  colorGameState.playing = false;
  colorGameState.accepting = false;
  colorGameState.timeoutIds.forEach(id => clearTimeout(id));
  colorGameState.timeoutIds = [];
  document.querySelectorAll('.color-pad').forEach(p => p.classList.remove('active'));
}

function flashPad(index, duration = 400) {
  const pad = document.querySelector(`.color-pad[data-color="${index}"]`);
  if (!pad) return;
  pad.classList.add('active');
  setTimeout(() => pad.classList.remove('active'), duration);
}

async function tocarSequencia() {
  colorGameState.accepting = false;
  const seq = colorGameState.sequence;
  for (let i = 0; i < seq.length; i++) {
    await new Promise(r => setTimeout(r, 300));
    flashPad(seq[i], 400);
    await new Promise(r => setTimeout(r, 500));
  }
  colorGameState.playerIndex = 0;
  colorGameState.accepting = true;
  document.getElementById('colorFeedback').textContent = 'Sua vez! Repita a sequência 🎯';
  document.getElementById('colorFeedback').className = 'color-feedback';
}

async function comecarJogoCores() {
  if (!usuarioAtual) return;
  pararJogoCores();
  colorGameState.sequence = [];
  colorGameState.level = 0;
  colorGameState.coinsEarned = 0;
  colorGameState.playing = true;
  document.getElementById('colorCoinsEarned').textContent = '0';
  document.getElementById('colorStartBtn').disabled = true;
  document.getElementById('colorStartBtn').textContent = '⏳ ...';
  await proximoNivelCores();
}

async function proximoNivelCores() {
  colorGameState.level++;
  document.getElementById('colorLevel').textContent = colorGameState.level;
  colorGameState.sequence.push(Math.floor(Math.random() * 4));
  document.getElementById('colorFeedback').textContent = 'Observe a sequência... 👀';
  document.getElementById('colorFeedback').className = 'color-feedback';
  await new Promise(r => setTimeout(r, 700));
  tocarSequencia();
}

async function jogadorClicouCor(index) {
  if (!colorGameState.accepting || !colorGameState.playing) return;
  flashPad(index, 250);
  const esperado = colorGameState.sequence[colorGameState.playerIndex];

  if (index !== esperado) {
    colorGameState.accepting = false;
    colorGameState.playing = false;
    document.getElementById('colorFeedback').textContent = `❌ Errou! Você chegou ao nível ${colorGameState.level}`;
    document.getElementById('colorFeedback').className = 'color-feedback bad';
    if (colorGameState.level - 1 > colorGameState.best) {
      colorGameState.best = colorGameState.level - 1;
      localStorage.setItem('colorGameBest', colorGameState.best);
      document.getElementById('colorBest').textContent = colorGameState.best;
    }
    document.getElementById('colorStartBtn').textContent = '🔄 Jogar Novamente';
    document.getElementById('colorStartBtn').disabled = false;
    return;
  }

  colorGameState.playerIndex++;

  if (colorGameState.playerIndex >= colorGameState.sequence.length) {
    colorGameState.accepting = false;
    const moedasGanhas = colorGameState.level > 5 ? 2 : 1;
    colorGameState.coinsEarned += moedasGanhas;
    document.getElementById('colorCoinsEarned').textContent = colorGameState.coinsEarned;
    document.getElementById('colorFeedback').textContent = `✅ Acertou! +${moedasGanhas} moeda${moedasGanhas > 1 ? 's' : ''}`;
    document.getElementById('colorFeedback').className = 'color-feedback good';
    await adicionarMoedas(moedasGanhas);
    await adicionarPontos('jogo', moedasGanhas * 2); // 2 pontos por moeda no jogo
    await new Promise(r => setTimeout(r, 900));
    if (colorGameState.playing) proximoNivelCores();
  }
}

document.querySelectorAll('.color-pad').forEach(pad => {
  pad.addEventListener('click', () => jogadorClicouCor(parseInt(pad.dataset.color)));
});

document.getElementById('colorStartBtn').addEventListener('click', () => {
  if (colorGameState.playing || colorGameState.accepting) {
    resetJogoCores();
    comecarJogoCores();
  } else {
    comecarJogoCores();
  }
});

// ==========================================
// --- JOGO DO CARRO ESTILO POU (TOP-DOWN) ---
// ==========================================
window.abrirJogoCarro = () => {
  document.getElementById('overlayHubJogos').classList.remove('active');
  resetCarro();
  document.getElementById('overlayJogoCarro').classList.add('active');
};

window.fecharJogoCarro = () => {
  pararCarro();
  document.getElementById('overlayJogoCarro').classList.remove('active');
  document.getElementById('overlayHubJogos').classList.add('active');
};

function resetCarro() {
  pararCarro();
  carGameState.speed = 6;
  carGameState.distance = 0;
  carGameState.coins = 0;
  carGameState.lastCoinCheck = 0;
  carGameState.obstacles = [];
  carGameState.lane = 1; 
  carGameState.carTargetX = 0; 
  carGameState.roadOffset = 0;
  
  atualizarHUDCarro();

  setTimeout(() => {
    if (carCanvas) {
      canvasWidth = carCanvas.clientWidth;
      canvasHeight = carCanvas.clientHeight;
      carCanvas.width = canvasWidth;
      carCanvas.height = canvasHeight;
      ctx = carCanvas.getContext('2d');
      desenharCenaCarro();
    }
  }, 50);
}

function atualizarHUDCarro() {
  document.getElementById('carDistance').textContent = Math.floor(carGameState.distance);
  document.getElementById('carCoins').textContent = carGameState.coins;
}

function drawCarTopDown(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(-25, -40, 50, 80, 10);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-25, -40, 50, 80, 15);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.roundRect(-20, -35, 40, 20, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.roundRect(-18, -10, 36, 25, 5); 
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.roundRect(-20, 20, 40, 15, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath();
  ctx.arc(-15, -35, 5, 0, Math.PI*2);
  ctx.arc(15, -35, 5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function desenharCenaCarro() {
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#2d6a1c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const roadWidth = canvasWidth * 0.6;
  const roadStart = (canvasWidth - roadWidth) / 2;
  
  ctx.fillStyle = '#444';
  ctx.fillRect(roadStart, 0, roadWidth, canvasHeight);
  
  ctx.fillStyle = '#fff';
  ctx.fillRect(roadStart, 0, 8, canvasHeight);
  ctx.fillRect(roadStart + roadWidth - 8, 0, 8, canvasHeight);

  ctx.fillStyle = '#ffd700';
  const lineOffset = (carGameState.roadOffset) % 60;
  
  for (let i = -60; i < canvasHeight + 60; i += 60) {
    const y = i + lineOffset;
    ctx.fillRect(roadStart + roadWidth * 0.33 - 4, y, 8, 30);
    ctx.fillRect(roadStart + roadWidth * 0.66 - 4, y, 8, 30);
  }

  const laneWidth = roadWidth / 3;
  const targetX = roadStart + (carGameState.lane * laneWidth) + (laneWidth / 2);
  
  if (carGameState.carTargetX === 0) carGameState.carTargetX = targetX;
  carGameState.carTargetX += (targetX - carGameState.carTargetX) * 0.2;

  const carY = canvasHeight * 0.75;

  carGameState.obstacles.forEach(obs => {
    if (obs.type === 'obstacle') {
      ctx.fillStyle = '#ff6b6b';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(obs.x - 20, obs.y - 30, 40, 60, 10);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(obs.x - 12, obs.y - 10, 24, 15, 5);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('$', obs.x - 5, obs.y + 6);
    }
  });

  const visualAngle = (targetX - carGameState.carTargetX) * 0.005;
  drawCarTopDown(ctx, carGameState.carTargetX, carY, visualAngle);
}

function tickCarro() {
  if (!carGameState.running) return;

  carGameState.roadOffset += carGameState.speed;
  carGameState.distance += carGameState.speed * 0.5;

  if (Math.random() < 0.03) {
    const lane = Math.floor(Math.random() * 3);
    const roadWidth = canvasWidth * 0.6;
    const roadStart = (canvasWidth - roadWidth) / 2;
    const laneWidth = roadWidth / 3;
    const xPos = roadStart + (lane * laneWidth) + (laneWidth / 2);
    
    const isCoin = Math.random() < 0.3;
    carGameState.obstacles.push({
      x: xPos,
      y: -100,
      type: isCoin ? 'coin' : 'obstacle',
      lane: lane
    });
  }

  carGameState.obstacles.forEach(obs => {
    obs.y += carGameState.speed * 1.5;
  });

  const carY = canvasHeight * 0.75;
  for (let i = carGameState.obstacles.length - 1; i >= 0; i--) {
    const obs = carGameState.obstacles[i];
    
    if (obs.y > canvasHeight + 100) {
      carGameState.obstacles.splice(i, 1);
      continue;
    }

    if (obs.lane === carGameState.lane && Math.abs(obs.y - carY) < 40) {
      if (obs.type === 'coin') {
        carGameState.coins++;
        adicionarMoedas(1);
        adicionarPontos('jogo', 2); // 2 pontos por moeda
        mostrarToast('🪙 +1 moeda!');
        atualizarHUDCarro();
        carGameState.obstacles.splice(i, 1);
      } else {
        carGameState.speed = 3;
        mostrarToast('💥 Bateu! Cuidado!');
        carGameState.obstacles.splice(i, 1);
      }
    }
  }

  if (carGameState.speed < 15) carGameState.speed += 0.005;

  atualizarHUDCarro();
  desenharCenaCarro();
}

function iniciarCarro() {
  if (carGameState.running) return;
  carGameState.running = true;
  carGameState.intervalId = setInterval(tickCarro, carGameState.tickRate);
}

function pararCarro() {
  carGameState.running = false;
  if (carGameState.intervalId) { clearInterval(carGameState.intervalId); carGameState.intervalId = null; }
}

const carWrapper = document.getElementById('carGameWrapper');
function handleCarInteraction(e) {
  if (!carGameState.running) iniciarCarro();

  const rect = carWrapper.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const x = clientX - rect.left;

  if (x < rect.width / 3) {
    if (carGameState.lane > 0) carGameState.lane--;
  } else if (x > rect.width * 2/3) {
    if (carGameState.lane < 2) carGameState.lane++;
  } else {
    carGameState.lane = 1;
  }
}

carWrapper.addEventListener('mousedown', handleCarInteraction);
carWrapper.addEventListener('touchstart', handleCarInteraction, { passive: false });
carWrapper.addEventListener('contextmenu', e => e.preventDefault());

// --- CUIDADOS ---
window.toggleDormir = async () => {
  const scene = document.getElementById('petMainScene');
  const btn = document.getElementById('btnDormir');
  if (!isSleeping) {
    isSleeping = true;
    scene.classList.add('sleeping');
    btn.innerHTML = '<span>☀️</span><small>Acordar</small>';
    
    // Adiciona pontos ao começar a dormir
    await adicionarPontos('cuidado', 2);
    
    sleepInterval = setInterval(async () => {
      if (!isSleeping || !petState) { clearInterval(sleepInterval); return; }
      if (petState.energia < 100) {
        await atualizarPet({ energia: Math.min(100, petState.energia + 2) });
      } else clearInterval(sleepInterval);
    }, 2000);
  } else {
    isSleeping = false;
    scene.classList.remove('sleeping');
    btn.innerHTML = '<span>💤</span><small>Dormir</small>';
    if (sleepInterval) clearInterval(sleepInterval);
    renderPet();
  }
};

window.usarRemedio = async () => {
  if (petState.saude >= 100) { mostrarToast('Ele já está saudável! 💜'); return; }
  animarBichinho('feliz');
  await atualizarPet({ saude: Math.min(100, (petState.saude||0) + 20) });
  await adicionarPontos('cuidado', 5);
  mostrarToast('💊 Saúde recuperada! +5 pts de cuidado');
};

// --- RANKING ---
const topScoresQuery = query(ref(database, 'bichinhos'), orderByChild('pontosJogos'));
onValue(topScoresQuery, (snapshot) => {
  const rankingList = document.getElementById('rankingList');
  rankingList.innerHTML = '';
  const usersArray = [];

  snapshot.forEach(child => {
    const data = child.val();
    const uid = child.key;
    if (USERS[uid]) {
      const pCuidado = data.pontosCuidado || 0;
      const pJogos = data.pontosJogos || 0;
      usersArray.push({
        id: uid,
        nome: USERS[uid].nomeReal,
        emoji: USERS[uid].emoji,
        cuidado: pCuidado,
        jogos: pJogos,
        total: pCuidado + pJogos
      });
    }
  });

  // Ordena pelo total
  usersArray.sort((a, b) => b.total - a.total);

  if (usersArray.length === 0) {
    rankingList.innerHTML = `<div class="ranking-empty"><span>🏆</span><p>O ranking ainda está vazio.</p></div>`;
    return;
  }

  // Pódio (Top 1)
  const top1 = usersArray[0];
  const podioHtml = `
    <div style="text-align: center; margin-bottom: 20px; background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 215, 0, 0.3);">
      <h2 style="font-size: 2rem; margin-bottom: 5px;">🥇 ${top1.emoji} ${top1.nome}</h2>
      <p style="font-size: 1.2rem; font-weight: 800; color: #ffd700;">${top1.total} Pontos Gerais</p>
    </div>
  `;
  
  let listHtml = '';
  usersArray.forEach((user, index) => {
    const isEven = index % 2 === 0;
    listHtml += `
      <li style="flex-direction: column; align-items: stretch; background: ${isEven ? 'rgba(62, 81, 184, 0.18)' : 'rgba(139, 92, 201, 0.08)'}; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 1.1rem; font-weight: 700; color: #fff;">${index + 1}º ${user.emoji} ${user.nome}</span>
          <strong style="font-size: 1.2rem; color: #ffd700;">${user.total} Total</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--texto-suave);">
          <span>🎮 Jogos: <strong>${user.jogos}</strong></span>
          <span>💖 Cuidado: <strong>${user.cuidado}</strong></span>
        </div>
      </li>
    `;
  });

  rankingList.innerHTML = podioHtml + listHtml;
});

// --- INICIALIZAÇÃO ---
carregarFotos();
carregarMural();

if (carregarUsuarioSalvo()) {
  aplicarUsuarioNaUI();
  showScreen('welcomeScreen');
  carregarTelaDeEntrada();
  carregarBichinho();
} else {
  showScreen('userChoiceScreen');
}