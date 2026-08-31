const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

// Banco
const DB_FILE = path.join(__dirname, "../backend/db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];
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


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {
  const db = readDB();

  const user = db.usuarios.find(u =>
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


// =====================================================
// ATENDIMENTO - CADASTRAR PACIENTE
// =====================================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),

      // DADOS PESSOAIS
      nome: req.body.nome,
      documento: req.body.documento,

      // Mantém compatibilidade com partes antigas
      cpf: req.body.documento,

      dataNascimento: req.body.dataNascimento,
      sexo: req.body.sexo,
      nomeMae: req.body.nomeMae,
      estadoCivil: req.body.estadoCivil,

      // CONTATO
      endereco: req.body.endereco,
      telefone: req.body.telefone,
      email: req.body.email,

      // EMERGÊNCIA
      contatoEmergencia: req.body.contatoEmergencia,
      telefoneEmergencia: req.body.telefoneEmergencia,

      // ATENDIMENTO
      tipo: req.body.tipo,

      // STATUS
      status: "triagem",

      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);

    writeDB(db);

    res.status(201).json(paciente);

  } catch (error) {

    console.error("Erro ao cadastrar paciente:", error);

    res.status(500).json({
      erro: "Erro ao salvar paciente",
      detalhes: error.message
    });
  }
});


// =====================================================
// LISTAR PACIENTES
// =====================================================

app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.pacientes);

  } catch (error) {

    console.error("Erro ao buscar pacientes:", error);

    res.status(500).json({
      erro: "Erro ao buscar pacientes"
    });
  }
});


// =====================================================
// BUSCAR UM PACIENTE PELO ID
// =====================================================

app.get("/pacientes/:id", (req, res) => {
  try {
    const db = readDB();

    const paciente = db.pacientes.find(
      p => String(p.id) === String(req.params.id)
    );

    if (!paciente) {
      return res.status(404).json({
        erro: "Paciente não encontrado"
      });
    }

    res.json(paciente);

  } catch (error) {

    console.error("Erro ao buscar paciente:", error);

    res.status(500).json({
      erro: "Erro ao buscar paciente"
    });
  }
});


// =====================================================
// TRIAGEM
// =====================================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;

    const temperatura = Number(req.body.temperatura);

    if (temperatura >= 39) {
      risco = "vermelho";
    } else if (temperatura >= 38) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),

      pacienteId: req.body.pacienteId || null,

      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura: temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,

      risco,

      status: "aguardando_medico",

      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);

    // Atualiza o paciente para informar
    // que ele já passou pela triagem
    if (req.body.pacienteId) {

      const paciente = db.pacientes.find(
        p => String(p.id) === String(req.body.pacienteId)
      );

      if (paciente) {
        paciente.status = "aguardando_medico";
      }
    }

    writeDB(db);

    res.status(201).json(triagem);

  } catch (error) {

    console.error("Erro ao salvar triagem:", error);

    res.status(500).json({
      erro: "Erro ao salvar triagem",
      detalhes: error.message
    });
  }
});


// =====================================================
// LISTAR TRIAGENS
// =====================================================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();

    res.json(db.triagens);

  } catch (error) {

    console.error("Erro ao buscar triagens:", error);

    res.status(500).json({
      erro: "Erro ao buscar triagens"
    });
  }
});


// =====================================================
// TV - CHAMAR PACIENTE
// =====================================================

app.post("/tv/chamar", (req, res) => {
  try {
    const db = readDB();

    const chamada = {
      id: Date.now().toString(),

      localTipo: req.body.localTipo,
      localNumero: req.body.localNumero,
      paciente: req.body.paciente,

      hora: new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )
    };

    db.tv_chamada = chamada;

    db.tv_historico.unshift(chamada);

    if (db.tv_historico.length > 5) {
      db.tv_historico.pop();
    }

    writeDB(db);

    res.json(chamada);

  } catch (error) {

    console.error("Erro ao chamar paciente na TV:", error);

    res.status(500).json({
      erro: "Erro ao chamar paciente na TV"
    });
  }
});


// =====================================================
// TV - CONSULTAR CHAMADA
// =====================================================

app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    res.json({
      chamada: db.tv_chamada,
      historico: db.tv_historico
    });

  } catch (error) {

    console.error("Erro ao buscar chamada da TV:", error);

    res.status(500).json({
      erro: "Erro ao buscar chamada da TV"
    });
  }
});


// =====================================================
// LISTA DE MEDICAÇÕES
// =====================================================

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


// =====================================================
// CONSULTA MÉDICA
// =====================================================

app.post("/consulta", (req, res) => {
  try {
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

  } catch (error) {

    console.error("Erro ao salvar consulta:", error);

    res.status(500).json({
      erro: "Erro ao salvar consulta"
    });
  }
});


// =====================================================
// MEDICAÇÕES
// =====================================================

app.get("/medicacoes", (req, res) => {
  const db = readDB();

  res.json(db.consultas);
});


// =====================================================
// EXPORTAÇÃO PARA VERCEL
// =====================================================

module.exports = app;
