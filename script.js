// 1. CONFIGURAÇÃO FIREBASE (SUBSTITUA PELOS SEUS DADOS)
const firebaseConfig = {
    apiKey: "AIzaSyDHeKmPj6HLxfY03_2udH06DAGOeld5Xho",
    authDomain: "ecoalgayer.firebaseapp.com",
    projectId: "ecoalgayer",
    storageBucket: "ecoalgayer.firebasestorage.app",
    messagingSenderId: "935459907204",
    appId: "1:935459907204:web:178f8160c9afa8f5d944d1",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const usuarios = [
    {user: 'marcio', pass: '1297', nome: 'Marcio', admin: true},
    {user: 'ale', pass: '2002', nome: 'Alessandra', admin: true},
    {user: 'lari', pass: 'lari0210', nome: 'Larissa', admin: false},
    {user: 'edu', pass: '131005', nome: 'Eduardo', admin: false},
    {user: 'lipe', pass: '1802', nome: 'Filipe', admin: true}
];

let dadosApp = {
    reservas: {},
    reservasIniciais: {},
    historico: [],
    gastosHoje: 0,
    ultimoMesAcesso: new Date().getMonth()
};

// LOGIN E CONEXÃO
function fazerLogin() {
    const uInput = document.getElementById('user').value.toLowerCase();
    const pInput = document.getElementById('pass').value;
    const validado = usuarios.find(u => u.user === uInput && u.pass === pInput);
    
    if (validado) {
        window.usuarioLogado = validado;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome-msg').innerText = `Olá, ${validado.nome}`;
        if (validado.admin) document.getElementById('area-admin').style.display = 'block';
        conectarNuvem();
    } else { alert("Senha incorreta!"); }
}

function conectarNuvem() {
    db.collection("financas").doc("central").onSnapshot((doc) => {
        if (doc.exists) {
            dadosApp = doc.data();
            verificarViradaMes();
            atualizarInterface();
        } else { salvarDados(); }
    });
}

function salvarDados() {
    db.collection("financas").doc("central").set(dadosApp);
}

// LOGICA FINANCEIRA
function gerenciarReserva() {
    const nome = prompt("Nome da Reserva:");
    if (!nome) return;
    const valor = parseFloat(prompt(`Valor planejado para ${nome}:`, "0"));
    if (isNaN(valor)) return;
    dadosApp.reservas[nome] = valor;
    dadosApp.reservasIniciais[nome] = valor;
    salvarDados();
}

function salvarCompra() {
    const valor = parseFloat(document.getElementById('valor-compra').value);
    const desc = document.getElementById('desc-compra').value;
    const cat = document.getElementById('select-reserva').value;
    if (!valor || !desc || !cat) return alert("Preencha tudo!");

    dadosApp.reservas[cat] -= valor;
    dadosApp.gastosHoje += valor;
    dadosApp.historico.unshift({ 
        desc, valor, quem: window.usuarioLogado.nome, data: new Date().toLocaleDateString() 
    });
    salvarDados();
    fecharModal();
}

// VIRADA DE MÊS AUTOMÁTICA
async function verificarViradaMes() {
    const mesAtual = new Date().getMonth();
    if (dadosApp.ultimoMesAcesso !== mesAtual) {
        if (dadosApp.historico.length > 0) {
            baixarRelatorioPDF();
            dadosApp.gastosHoje = 0;
            dadosApp.historico = [];
            for (let cat in dadosApp.reservasIniciais) {
                dadosApp.reservas[cat] = dadosApp.reservasIniciais[cat];
            }
        }
        dadosApp.ultimoMesAcesso = mesAtual;
        salvarDados();
    }
}

// PDF E INTERFACE
async function baixarRelatorioPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Relatório Mensal EcoAlgayer", 14, 20);
    doc.autoTable({
        startY: 30,
        head: [['Data', 'Item', 'Valor', 'Quem']],
        body: dadosApp.historico.map(h => [h.data, h.desc, `R$ ${h.valor.toFixed(2)}`, h.quem])
    });
    doc.save(`Relatorio_EcoAlgayer_${new Date().getMonth()}.pdf`);
}

function atualizarInterface() {
    document.getElementById('total-gasto').innerText = dadosApp.gastosHoje.toLocaleString('pt-br', {minimumFractionDigits:2});
    const container = document.getElementById('cards-reservas');
    const select = document.getElementById('select-reserva');
    const totalPlanejado = Object.values(dadosApp.reservasIniciais).reduce((a,b) => a+b, 0) || 1000;
    document.getElementById('progress-bar').style.width = Math.min((dadosApp.gastosHoje / totalPlanejado) * 100, 100) + "%";

    container.innerHTML = "";
    select.innerHTML = '<option value="">Onde gastou?</option>';
    for (let cat in dadosApp.reservas) {
        const saldo = dadosApp.reservas[cat];
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
        container.innerHTML += `
            <div class="card-reserva animate-pop ${saldo < 0 ? 'negative' : ''}">
                <small>${cat}</small>
                <p>R$ ${saldo.toLocaleString('pt-br', {minimumFractionDigits:2})}</p>
            </div>`;
    }
}

// UI HELPERS
function abrirModal() { document.getElementById('modal-compra').style.display='flex'; }
function fecharModal() { document.getElementById('modal-compra').style.display='none'; }
function abrirMenu() { document.getElementById('modal-opcoes').style.display='flex'; }
function fecharMenu() { document.getElementById('modal-opcoes').style.display='none'; }
function alternarTema() { document.body.classList.toggle('dark-mode'); }
function logoff() { location.reload(); }
function mostrarHistorico() {
    document.getElementById('lista-historico').innerHTML = dadosApp.historico.map(h => `<tr><td>${h.desc}</td><td>R$ ${h.valor.toFixed(2)}</td><td>${h.quem}</td></tr>`).join('');
    document.getElementById('modal-historico').style.display='flex';
}
function resetarDados() { if(confirm("Apagar tudo na nuvem?")) { dadosApp = {reservas:{},reservasIniciais:{},historico:[],gastosHoje:0,ultimoMesAcesso:new Date().getMonth()}; salvarDados(); } }
function excluirReserva() {
    const nome = prompt("Nome da reserva para excluir:");
    if(dadosApp.reservas[nome]) { delete dadosApp.reservas[nome]; delete dadosApp.reservasIniciais[nome]; salvarDados(); }
}