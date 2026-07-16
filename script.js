// ============================================================
// 1. BANCO DE DADOS (simulado com localStorage)
// ============================================================
const DB_KEY = 'sistemaCadastrosDB';

// Estrutura inicial
const defaultDatabase = {
    estados: [
        { nome: "Acre", codigoIBGE: 12 },
        { nome: "Alagoas", codigoIBGE: 27 },
        { nome: "Amazonas", codigoIBGE: 13 },
        { nome: "Amapá", codigoIBGE: 16 },
        { nome: "Bahia", codigoIBGE: 29 },
        { nome: "Ceará", codigoIBGE: 23 },
        { nome: "Distrito Federal", codigoIBGE: 53 },
        { nome: "Espírito Santo", codigoIBGE: 32 },
        { nome: "Goiás", codigoIBGE: 52 },
        { nome: "Maranhão", codigoIBGE: 21 },
        { nome: "Minas Gerais", codigoIBGE: 31 },
        { nome: "Mato Grosso do Sul", codigoIBGE: 50 },
        { nome: "Mato Grosso", codigoIBGE: 51 },
        { nome: "Pará", codigoIBGE: 15 },
        { nome: "Paraíba", codigoIBGE: 25 },
        { nome: "Pernambuco", codigoIBGE: 26 },
        { nome: "Piauí", codigoIBGE: 22 },
        { nome: "Paraná", codigoIBGE: 41 },
        { nome: "Rio de Janeiro", codigoIBGE: 33 },
        { nome: "Rio Grande do Norte", codigoIBGE: 24 },
        { nome: "Rondônia", codigoIBGE: 11 },
        { nome: "Roraima", codigoIBGE: 14 },
        { nome: "Rio Grande do Sul", codigoIBGE: 43 },
        { nome: "Santa Catarina", codigoIBGE: 42 },
        { nome: "Sergipe", codigoIBGE: 28 },
        { nome: "São Paulo", codigoIBGE: 35 },
        { nome: "Tocantins", codigoIBGE: 17 },
    ],
    municipios: [],
    localidades: [],
    proximoCodigoMunicipio: 1,
    proximoCodigoLocalidade: 1,
};

// Carrega ou inicializa o banco
function loadDatabase() {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Mescla com o default para garantir que todos os campos existam
            return { ...defaultDatabase, ...parsed };
        } catch {
            return JSON.parse(JSON.stringify(defaultDatabase));
        }
    }
    return JSON.parse(JSON.stringify(defaultDatabase));
}

function saveDatabase(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Banco em memória (sincronizado com localStorage)
let database = loadDatabase();

// ============================================================
// 2. UTILITÁRIOS
// ============================================================
function mostrarMensagem(texto, tipo = 'sucesso') {
    const msg = document.getElementById('mensagem');
    msg.textContent = texto;
    msg.className = tipo; // 'sucesso' ou 'erro'
    msg.style.display = 'block';
    // Esconde após 5 segundos
    clearTimeout(msg._timeout);
    msg._timeout = setTimeout(() => {
        msg.style.display = 'none';
    }, 5000);
}

function validarDecimal(valor) {
    return /^-?\d+(\.\d+)?$/.test(valor);
}

// Sanitização básica (escape HTML)
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================
// 3. FUNÇÕES DE UI (ocultar/mostrar seções)
// ============================================================
function hideAllSections() {
    document.getElementById('municipioForm').classList.add('hidden');
    document.getElementById('localidadeForm').classList.add('hidden');
    document.getElementById('consultarRelatorioSection').classList.add('hidden');
}

function showSection(elementId) {
    hideAllSections();
    document.getElementById(elementId).classList.remove('hidden');
}

// ============================================================
// 4. POPULAR DROPDOWNS
// ============================================================
function preencherDropdownEstados() {
    const select = document.getElementById('estadoVinculado');
    select.innerHTML = '<option value="">Selecione um estado</option>';
    database.estados.forEach(estado => {
        const opt = document.createElement('option');
        opt.value = estado.codigoIBGE;
        opt.textContent = estado.nome;
        select.appendChild(opt);
    });
}

function preencherDropdownMunicipios() {
    const select = document.getElementById('municipioVinculado');
    select.innerHTML = '<option value="">Selecione um município</option>';
    database.municipios.forEach(municipio => {
        const opt = document.createElement('option');
        opt.value = municipio.codigo;
        opt.textContent = municipio.nome;
        select.appendChild(opt);
    });
}

// ============================================================
// 5. VALIDAÇÕES DE FORMULÁRIO
// ============================================================
function validarFormMunicipio() {
    const nome = document.getElementById('municipioNome').value.trim();
    const estado = document.getElementById('estadoVinculado').value;
    if (!nome) {
        mostrarMensagem('O nome do município é obrigatório.', 'erro');
        return false;
    }
    if (!estado) {
        mostrarMensagem('Selecione um estado para vincular.', 'erro');
        return false;
    }
    return true;
}

function validarFormLocalidade() {
    // Campos obrigatórios (todos os que têm required)
    const inputs = document.querySelectorAll('#formLocalidade [required]');
    for (let input of inputs) {
        if (!input.value.trim()) {
            const label = input.closest('.form-group')?.querySelector('label')?.textContent || 'Campo';
            mostrarMensagem(`O campo "${label.trim()}" é obrigatório.`, 'erro');
            input.focus();
            return false;
        }
    }
    // Validar números (>=0) para campos tipo number
    const numeros = document.querySelectorAll('#formLocalidade input[type="number"]');
    for (let input of numeros) {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) {
            const label = input.closest('.form-group')?.querySelector('label')?.textContent || 'Campo numérico';
            mostrarMensagem(`O campo "${label.trim()}" deve ser um número não negativo.`, 'erro');
            input.focus();
            return false;
        }
    }
    // Validar longitude/latitude (se preenchidos)
    const long = document.getElementById('longitude').value.trim();
    if (long && !validarDecimal(long)) {
        mostrarMensagem('Longitude deve ser um número decimal (ex: -45.1234).', 'erro');
        document.getElementById('longitude').focus();
        return false;
    }
    const lat = document.getElementById('latitude').value.trim();
    if (lat && !validarDecimal(lat)) {
        mostrarMensagem('Latitude deve ser um número decimal (ex: -22.9876).', 'erro');
        document.getElementById('latitude').focus();
        return false;
    }
    return true;
}

// ============================================================
// 6. CADASTROS
// ============================================================
function cadastrarMunicipio() {
    if (!validarFormMunicipio()) return false;

    const nome = document.getElementById('municipioNome').value.trim();
    const estadoID = parseInt(document.getElementById('estadoVinculado').value);
    const estado = database.estados.find(e => e.codigoIBGE === estadoID);
    if (!estado) {
        mostrarMensagem('Estado não encontrado.', 'erro');
        return false;
    }

    const novoMunicipio = {
        codigo: database.proximoCodigoMunicipio++,
        nome: nome,
        estado: estado.nome,
        nrs: document.getElementById('NRSVinculado').value,
        baseRegional: document.getElementById('baseRegional').value,
    };
    database.municipios.push(novoMunicipio);
    saveDatabase(database);
    preencherDropdownMunicipios();
    mostrarMensagem(`Município "${nome}" cadastrado com sucesso!`, 'sucesso');
    document.getElementById('formMunicipio').reset();
    return true;
}

function cadastrarLocalidade() {
    if (!validarFormLocalidade()) return false;

    // Coleta todos os campos (usando os ids)
    const campos = [
        'localidadeNome', 'municipioVinculado', 'status', 'classificacao',
        'quantidadeResidentes', 'quantidadeComercios', 'quantidadeConstrucoes',
        'quantidadeHabitantes', 'quantidadePontoEstrategico', 'quantidadeTerrenosBaldios',
        'possuiEnergiaEletrica', 'possuiAguaEncanada', 'possuiTratamentoEsgoto',
        'possuiLavanderiaColetiva', 'possuiColetaLixo', 'possuiRedeTelefonica',
        'possuiInternet', 'possuiTransportePublico', 'possuiRuaPavimentada',
        'possuiEscolaCreche', 'possuiPostoSaude', 'possuiPACSPFS', 'possuiAcessoPermanente',
        'possuiCachorro', 'possuiGato', 'possuiRoedores', 'possuiMalaria',
        'possuiDengue', 'possuiEsquistossomose', 'possuiLeishmaniose',
        'possuiFebreMaculosa', 'possuiPeste', 'possuiChagas', 'possuiFebreAmarela',
        'longitude', 'latitude', 'altitude', 'distanciaCentro'
    ];

    const dados = {};
    for (let id of campos) {
        const el = document.getElementById(id);
        dados[id] = el ? el.value.trim() : '';
    }

    // Verifica se o município existe
    const municipioCod = parseInt(dados.municipioVinculado);
    const municipio = database.municipios.find(m => m.codigo === municipioCod);
    if (!municipio) {
        mostrarMensagem('Município selecionado não encontrado.', 'erro');
        return false;
    }

    const localidade = {
        codigo: database.proximoCodigoLocalidade++,
        nome: dados.localidadeNome,
        municipio: municipio.nome,
        municipioCodigo: municipio.codigo,
        status: dados.status,
        classificacao: dados.classificacao,
        quantidadeResidentes: parseInt(dados.quantidadeResidentes) || 0,
        quantidadeComercios: parseInt(dados.quantidadeComercios) || 0,
        quantidadeConstrucoes: parseInt(dados.quantidadeConstrucoes) || 0,
        quantidadeHabitantes: parseInt(dados.quantidadeHabitantes) || 0,
        quantidadePontoEstrategico: parseInt(dados.quantidadePontoEstrategico) || 0,
        quantidadeTerrenosBaldios: parseInt(dados.quantidadeTerrenosBaldios) || 0,
        possuiEnergiaEletrica: dados.possuiEnergiaEletrica,
        possuiAguaEncanada: dados.possuiAguaEncanada,
        possuiTratamentoEsgoto: dados.possuiTratamentoEsgoto,
        possuiLavanderiaColetiva: dados.possuiLavanderiaColetiva,
        possuiColetaLixo: dados.possuiColetaLixo,
        possuiRedeTelefonica: dados.possuiRedeTelefonica,
        possuiInternet: dados.possuiInternet,
        possuiTransportePublico: dados.possuiTransportePublico,
        possuiRuaPavimentada: dados.possuiRuaPavimentada,
        possuiEscolaCreche: dados.possuiEscolaCreche,
        possuiPostoSaude: dados.possuiPostoSaude,
        possuiPACSPFS: dados.possuiPACSPFS,
        possuiAcessoPermanente: dados.possuiAcessoPermanente,
        possuiCachorro: parseInt(dados.possuiCachorro) || 0,
        possuiGato: parseInt(dados.possuiGato) || 0,
        possuiRoedores: dados.possuiRoedores,
        possuiMalaria: dados.possuiMalaria,
        possuiDengue: dados.possuiDengue,
        possuiEsquistossomose: dados.possuiEsquistossomose,
        possuiLeishmaniose: dados.possuiLeishmaniose,
        possuiFebreMaculosa: dados.possuiFebreMaculosa,
        possuiPeste: dados.possuiPeste,
        possuiChagas: dados.possuiChagas,
        possuiFebreAmarela: dados.possuiFebreAmarela,
        longitude: dados.longitude || '',
        latitude: dados.latitude || '',
        altitude: dados.altitude || '',
        distanciaCentro: dados.distanciaCentro || '',
    };

    database.localidades.push(localidade);
    saveDatabase(database);
    mostrarMensagem(`Localidade "${localidade.nome}" cadastrada com sucesso!`, 'sucesso');
    document.getElementById('formLocalidade').reset();
    // Atualiza relatório se estiver visível
    if (!document.getElementById('consultarRelatorioSection').classList.contains('hidden')) {
        gerarRelatorioLocalidades();
    }
    return true;
}

// ============================================================
// 7. RELATÓRIO (seguro, sem innerHTML com dados do usuário)
// ============================================================
function gerarRelatorioLocalidades() {
    const container = document.getElementById('relatorio');
    container.innerHTML = ''; // limpa

    if (database.localidades.length === 0) {
        container.innerHTML = '<p>Nenhuma localidade cadastrada.</p>';
        return;
    }

    // Título
    const titulo = document.createElement('h3');
    titulo.textContent = `Total de localidades: ${database.localidades.length}`;
    container.appendChild(titulo);

    database.localidades.forEach((loc, index) => {
        const card = document.createElement('div');
        card.className = 'localidade-card';

        // Lista de campos a exibir (label + chave)
        const campos = [
            ['Nome', 'nome'],
            ['Município', 'municipio'],
            ['Status', 'status'],
            ['Classificação', 'classificacao'],
            ['Residentes', 'quantidadeResidentes'],
            ['Comércios', 'quantidadeComercios'],
            ['Construções', 'quantidadeConstrucoes'],
            ['Habitantes', 'quantidadeHabitantes'],
            ['Pontos Estratégicos', 'quantidadePontoEstrategico'],
            ['Terrenos Baldios', 'quantidadeTerrenosBaldios'],
            ['Energia Elétrica', 'possuiEnergiaEletrica'],
            ['Água Encanada', 'possuiAguaEncanada'],
            ['Tratamento Esgoto', 'possuiTratamentoEsgoto'],
            ['Lavanderia Coletiva', 'possuiLavanderiaColetiva'],
            ['Coleta de Lixo', 'possuiColetaLixo'],
            ['Rede Telefônica', 'possuiRedeTelefonica'],
            ['Internet', 'possuiInternet'],
            ['Transporte Público', 'possuiTransportePublico'],
            ['Rua Pavimentada', 'possuiRuaPavimentada'],
            ['Escola/Creche', 'possuiEscolaCreche'],
            ['Posto de Saúde', 'possuiPostoSaude'],
            ['PACS/PFS', 'possuiPACSPFS'],
            ['Acesso Permanente', 'possuiAcessoPermanente'],
            ['Cachorros', 'possuiCachorro'],
            ['Gatos', 'possuiGato'],
            ['Roedores', 'possuiRoedores'],
            ['Malária', 'possuiMalaria'],
            ['Dengue', 'possuiDengue'],
            ['Esquistossomose', 'possuiEsquistossomose'],
            ['Leishmaniose', 'possuiLeishmaniose'],
            ['Febre Maculosa', 'possuiFebreMaculosa'],
            ['Peste', 'possuiPeste'],
            ['Chagas', 'possuiChagas'],
            ['Febre Amarela', 'possuiFebreAmarela'],
            ['Longitude', 'longitude'],
            ['Latitude', 'latitude'],
            ['Altitude', 'altitude'],
            ['Distância do Centro', 'distanciaCentro'],
        ];

        campos.forEach(([label, key]) => {
            const p = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = label + ': ';
            p.appendChild(strong);
            const span = document.createElement('span');
            // Escape para evitar XSS
            span.textContent = escapeHTML(loc[key] ?? '');
            p.appendChild(span);
            card.appendChild(p);
        });

        container.appendChild(card);
    });
}

// ============================================================
// 8. EVENT LISTENERS
// ============================================================
// Botões principais
document.getElementById('btnConsulta').addEventListener('click', () => {
    showSection('consultarRelatorioSection');
    gerarRelatorioLocalidades();
});

document.getElementById('btnCadastrarMunicipio').addEventListener('click', () => {
    showSection('municipioForm');
    preencherDropdownEstados();
});

document.getElementById('btnCadastrarLocalidade').addEventListener('click', () => {
    showSection('localidadeForm');
    preencherDropdownMunicipios();
});

// Botão Reset: limpa formulários, esconde seções e mantém dados
document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('formMunicipio').reset();
    document.getElementById('formLocalidade').reset();
    hideAllSections();
    mostrarMensagem('Página resetada (dados permanecem salvos).', 'sucesso');
});

// Botões sem ação ainda (Gestão, Transferência, Relatórios)
document.querySelectorAll('#btnGestao, #btnTransferencia, #btnRelatorios').forEach(btn => {
    btn.addEventListener('click', () => {
        mostrarMensagem(`Funcionalidade "${btn.textContent}" em desenvolvimento.`, 'erro');
    });
});

// Submissão dos formulários
document.getElementById('formMunicipio').addEventListener('submit', (e) => {
    e.preventDefault();
    cadastrarMunicipio();
});

document.getElementById('formLocalidade').addEventListener('submit', (e) => {
    e.preventDefault();
    cadastrarLocalidade();
});

// Validação em tempo real para longitude/latitude (apenas aviso)
document.getElementById('longitude').addEventListener('blur', function() {
    if (this.value && !validarDecimal(this.value)) {
        mostrarMensagem('Longitude deve ser um número decimal.', 'erro');
        this.focus();
    }
});
document.getElementById('latitude').addEventListener('blur', function() {
    if (this.value && !validarDecimal(this.value)) {
        mostrarMensagem('Latitude deve ser um número decimal.', 'erro');
        this.focus();
    }
});

// ============================================================
// 9. INICIALIZAÇÃO
// ============================================================
preencherDropdownEstados();
preencherDropdownMunicipios();
// Mostra o relatório se houver dados (opcional)
if (database.localidades.length > 0) {
    // não exibe automaticamente, mas pode ser feito
}
console.log('Sistema de Cadastros inicializado com sucesso!');