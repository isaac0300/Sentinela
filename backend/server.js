const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

// ==================== BANCO DE DADOS ====================

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      altas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];
  if (!db.altas) db.altas = [];
  if (!db.tv_chamada) db.tv_chamada = null;
  if (!db.tv_historico) db.tv_historico = [];

  return db;
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// ==================== LOGIN ====================

app.post("/login", (req, res) => {
  const db = readDB();

  const user = db.usuarios.find(
    u =>
      u.usuario === req.body.usuario &&
      u.senha === req.body.senha
  );

  if (!user) {
    return res.status(401).json({
      erro: "Login inválido"
    });
  }

  res.json(user);
});

// ==================== ATENDIMENTO ====================

app.post("/atendimento", (req, res) => {
  const db = readDB();

  const paciente = {
    id: Date.now(),
    nome: req.body.nome,
    documento: req.body.documento,
    cpf: req.body.documento,
    dataNascimento: req.body.dataNascimento,
    sexo: req.body.sexo,
    nomeMae: req.body.nomeMae,
    estadoCivil: req.body.estadoCivil,
    endereco: req.body.endereco,
    telefone: req.body.telefone,
    email: req.body.email,
    contatoEmergencia: req.body.contatoEmergencia,
    telefoneEmergencia: req.body.telefoneEmergencia,
    tipo: req.body.tipo,
    status: "triagem",
    createdAt: new Date().toISOString()
  };

  db.pacientes.push(paciente);
  writeDB(db);

  res.status(201).json(paciente);
});

app.get("/pacientes", (req, res) => {
  const db = readDB();
  res.json(db.pacientes);
});

// ==================== TRIAGEM ====================

app.post("/triagem", (req, res) => {
  const db = readDB();

  let risco = req.body.risco;

  if (req.body.temperatura >= 39) {
    risco = "vermelho";
  } else if (req.body.temperatura >= 38) {
    risco = "amarelo";
  } else if (!risco) {
    risco = "verde";
  }

  const triagem = {
    id: Date.now(),
    nome: req.body.nome,
    sintoma: req.body.sintoma,
    temperatura: req.body.temperatura,
    alergia: req.body.alergia,
    observacao: req.body.observacao,
    risco,
    status: "aguardando_medico",
    createdAt: new Date().toISOString()
  };

  db.triagens.push(triagem);
  writeDB(db);

  res.status(201).json(triagem);
});

app.get("/triagens", (req, res) => {
  const db = readDB();
  res.json(db.triagens);
});

// ==================== TV ====================

app.post("/tv/chamar", (req, res) => {
  const db = readDB();

  const chamada = {
    id: Date.now().toString(),
    localTipo: req.body.localTipo,
    localNumero: req.body.localNumero,
    paciente: req.body.paciente,
    hora: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  db.tv_chamada = chamada;
  db.tv_historico.unshift(chamada);

  if (db.tv_historico.length > 5) {
    db.tv_historico.pop();
  }

  writeDB(db);

  res.json(chamada);
});

app.get("/tv/chamada", (req, res) => {
  const db = readDB();

  res.json({
    chamada: db.tv_chamada,
    historico: db.tv_historico
  });
});

// ==================== MEDICAÇÕES ====================

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

app.get("/medicacoes", (req, res) => {
  const db = readDB();
  res.json(db.consultas);
});

// ==================== CONSULTA MÉDICA ====================

app.post("/consulta", (req, res) => {
  const db = readDB();

  const consulta = {
    id: Date.now(),
    paciente: req.body.paciente,
    diagnostico: req.body.diagnostico,
    medicacao: req.body.medicacao,
    obs: req.body.obs,
    createdAt: new Date().toISOString()
  };

  db.consultas.push(consulta);
  writeDB(db);

  res.status(201).json(consulta);
});

// ==================== ALTA MÉDICA ====================

app.post("/alta", (req, res) => {
  const db = readDB();

  const {
    id,
    diagnosticoFinal,
    orientacoes,
    observacoesAlta
  } = req.body;

  if (!id) {
    return res.status(400).json({
      erro: "ID do paciente não informado."
    });
  }

  const triagem = db.triagens.find(
    t => String(t.id) === String(id)
  );

  if (!triagem) {
    return res.status(404).json({
      erro: "Paciente não encontrado."
    });
  }

  if (!diagnosticoFinal) {
    return res.status(400).json({
      erro: "Informe o diagnóstico final."
    });
  }

  if (!orientacoes) {
    return res.status(400).json({
      erro: "Informe as orientações ao paciente."
    });
  }

  const alta = {
    id: Date.now(),
    pacienteId: triagem.id,
    paciente: triagem.nome,
    diagnosticoFinal,
    orientacoes,
    observacoesAlta: observacoesAlta || "",
    createdAt: new Date().toISOString()
  };

  db.altas.push(alta);

  triagem.status = "alta";
  triagem.altaId = alta.id;
  triagem.altaEm = alta.createdAt;

  writeDB(db);

  res.status(201).json({
    sucesso: true,
    mensagem: "Alta realizada com sucesso.",
    alta
  });
});

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🏥 Hospital Pro rodando na porta ${PORT}`);
});
