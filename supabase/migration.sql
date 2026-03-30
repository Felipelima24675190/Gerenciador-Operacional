-- ============================================================
-- Supabase Migration — App Atrasos
-- Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Função utilitária para limpar tabela (usada pelo app para sync)
CREATE OR REPLACE FUNCTION truncate_table(tname TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed TEXT[] := ARRAY[
    'app_users','motoristas','viagens','ocorrencias','veiculos',
    'excessos_velocidade','paradas_indevidas','avarias','resumos_avaria',
    'multas_antt','antt_code_descriptions','multas_transito',
    'registros_ociosidade','registros_linhas',
    'ociosidades_motorista','monitriips','eventos_motorista',
    'app_notifications','dicionario_linhas','manutencoes',
    'historico_manutencao','acidentes'
  ];
BEGIN
  IF NOT (tname = ANY(allowed)) THEN
    RAISE EXCEPTION 'Tabela "%" não permitida', tname;
  END IF;
  EXECUTE format('DELETE FROM %I', tname);
END;
$$;

-- ============================================================
-- 1. Usuários do App
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','viewer')),
  titulo TEXT
);

-- ============================================================
-- 2. Motoristas
-- ============================================================
CREATE TABLE IF NOT EXISTS motoristas (
  matricula TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  filial TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 3. Viagens (Base de Linhas)
-- ============================================================
CREATE TABLE IF NOT EXISTS viagens (
  id TEXT PRIMARY KEY,
  "numeroLinha" TEXT NOT NULL DEFAULT '',
  atendimento TEXT NOT NULL DEFAULT '',
  "nomeLinha" TEXT NOT NULL DEFAULT '',
  sentido TEXT NOT NULL DEFAULT '',
  "pontoInicio" TEXT NOT NULL DEFAULT '',
  "pontoFim" TEXT NOT NULL DEFAULT '',
  "prevInicio" TEXT NOT NULL DEFAULT '',
  "prevFim" TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  "grupoCor" TEXT,
  "diasOperantes" INTEGER[] NOT NULL DEFAULT '{}'
);

-- ============================================================
-- 4. Ocorrências Diárias (Pontualidade)
-- ============================================================
CREATE TABLE IF NOT EXISTS ocorrencias (
  id TEXT PRIMARY KEY,
  "numeroLinha" TEXT NOT NULL DEFAULT '',
  atendimento TEXT NOT NULL DEFAULT '',
  "nomeLinha" TEXT NOT NULL DEFAULT '',
  sentido TEXT NOT NULL DEFAULT '',
  "pontoInicio" TEXT NOT NULL DEFAULT '',
  "pontoFim" TEXT NOT NULL DEFAULT '',
  veiculo TEXT NOT NULL DEFAULT '',
  "matriculaMotorista" TEXT NOT NULL DEFAULT '',
  "prevInicio" TEXT NOT NULL DEFAULT '',
  "prevFim" TEXT NOT NULL DEFAULT '',
  "realInicio" TEXT NOT NULL DEFAULT '',
  "realFim" TEXT NOT NULL DEFAULT '',
  "diffMinutosInicio" REAL NOT NULL DEFAULT 0,
  "statusInicio" TEXT NOT NULL DEFAULT 'No Horário',
  "diffMinutosFim" REAL NOT NULL DEFAULT 0,
  "statusFim" TEXT NOT NULL DEFAULT 'No Horário',
  "realInicioOriginalVazio" BOOLEAN NOT NULL DEFAULT FALSE,
  "realFimOriginalVazio" BOOLEAN NOT NULL DEFAULT FALSE,
  "motivoAtraso" TEXT
);

-- ============================================================
-- 5. Veículos
-- ============================================================
CREATE TABLE IF NOT EXISTS veiculos (
  id TEXT PRIMARY KEY,
  prefixo TEXT NOT NULL DEFAULT '',
  placa TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL DEFAULT '',
  "anoFabricacao" INTEGER NOT NULL DEFAULT 0,
  "anoModelo" INTEGER NOT NULL DEFAULT 0,
  marca TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  eixos INTEGER NOT NULL DEFAULT 0,
  poltronas INTEGER NOT NULL DEFAULT 0,
  potencia INTEGER NOT NULL DEFAULT 0,
  chassi TEXT NOT NULL DEFAULT '',
  renavam TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 6. Excessos de Velocidade
-- ============================================================
CREATE TABLE IF NOT EXISTS excessos_velocidade (
  id TEXT PRIMARY KEY,
  matricula TEXT NOT NULL DEFAULT '',
  "tempoExcedidoMinutos" REAL NOT NULL DEFAULT 0,
  "velocidadeMediaKmh" REAL NOT NULL DEFAULT 0,
  endereco TEXT NOT NULL DEFAULT '',
  "dataOcorrencia" TEXT NOT NULL DEFAULT '',
  "inicioFimOcorrencia" TEXT NOT NULL DEFAULT '',
  "nomeLinha" TEXT NOT NULL DEFAULT '',
  veiculo TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 7. Paradas Indevidas
-- ============================================================
CREATE TABLE IF NOT EXISTS paradas_indevidas (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '',
  linha TEXT NOT NULL DEFAULT '',
  sentido TEXT NOT NULL DEFAULT '',
  "horarioLinha" TEXT NOT NULL DEFAULT '',
  matricula TEXT NOT NULL DEFAULT '',
  motorista TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  veiculo TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  inicio TEXT NOT NULL DEFAULT '',
  fim TEXT NOT NULL DEFAULT '',
  "tempoParado" TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 8. Avarias
-- ============================================================
CREATE TABLE IF NOT EXISTS avarias (
  id TEXT PRIMARY KEY,
  veiculo TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '',
  "motoristaIdentificado" TEXT NOT NULL DEFAULT '',
  "matriculaMotorista" TEXT NOT NULL DEFAULT '',
  "motoristaCulpado" TEXT NOT NULL DEFAULT '',
  "lancadoNoGlobus" TEXT NOT NULL DEFAULT '',
  "mesLancamento" TEXT NOT NULL DEFAULT '',
  gerente TEXT NOT NULL DEFAULT '',
  "descricaoAvaria" TEXT NOT NULL DEFAULT '',
  "tipoAvaria" TEXT NOT NULL DEFAULT '',
  "causaAvaria" TEXT NOT NULL DEFAULT '',
  "acaoTomada" TEXT NOT NULL DEFAULT '',
  horario TEXT NOT NULL DEFAULT '',
  "valorAvaria" REAL NOT NULL DEFAULT 0,
  "valorCobrado" REAL NOT NULL DEFAULT 0
);

-- ============================================================
-- 9. Resumos de Avaria
-- ============================================================
CREATE TABLE IF NOT EXISTS resumos_avaria (
  "key" TEXT PRIMARY KEY,
  "tipoAvaria" TEXT NOT NULL DEFAULT '',
  frontal TEXT NOT NULL DEFAULT '',
  "lateral" TEXT NOT NULL DEFAULT '',
  traseira TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 10. Multas ANTT
-- ============================================================
CREATE TABLE IF NOT EXISTS multas_antt (
  id TEXT PRIMARY KEY,
  "autoInfracao" TEXT NOT NULL DEFAULT '',
  "dataHora" TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  setor TEXT NOT NULL DEFAULT '',
  terminal TEXT NOT NULL DEFAULT '',
  "codigoInfracao" TEXT NOT NULL DEFAULT '',
  "descricaoInfracao" TEXT NOT NULL DEFAULT '',
  "matriculaMotorista" TEXT,
  "placaVeiculo" TEXT,
  "prefixoVeiculo" TEXT,
  valor REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aguardando'
);

-- ============================================================
-- 11. Descrições de Código ANTT
-- ============================================================
CREATE TABLE IF NOT EXISTS antt_code_descriptions (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 12. Multas de Trânsito
-- Modelo baseado no CSV: DATA DA INFRAÇÃO; VEÍCULO; ORGÃO ATUADOR;
-- DESCRIÇÃO DA MULTA; NÚMERO DO AUTO; VALOR COBRADO; VALOR RECUPERADO;
-- MOTORISTA IDENTIFICADO?; MATRÍCULA; NOME DO MOTORISTA; GESTOR;
-- FILIAL; ENVIADO AO GERENTE?; GERENTE DEVOLVEU?; LANÇADO NO GLOBUS?; OBSERVAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS multas_transito (
  id TEXT PRIMARY KEY,
  "dataInfracao" TEXT NOT NULL DEFAULT '',
  veiculo TEXT NOT NULL DEFAULT '',
  "orgaoAtuador" TEXT NOT NULL DEFAULT '',
  "descricaoMulta" TEXT NOT NULL DEFAULT '',
  "numeroAuto" TEXT NOT NULL DEFAULT '',
  "valorCobrado" REAL NOT NULL DEFAULT 0,
  "valorRecuperado" REAL NOT NULL DEFAULT 0,
  "motoristaIdentificado" BOOLEAN NOT NULL DEFAULT FALSE,
  "matriculaMotorista" TEXT NOT NULL DEFAULT '',
  "nomeMotorista" TEXT NOT NULL DEFAULT '',
  gestor TEXT NOT NULL DEFAULT '',
  filial TEXT NOT NULL DEFAULT '',
  "enviadoGerente" TEXT NOT NULL DEFAULT '',
  "gerenteDevolveu" TEXT NOT NULL DEFAULT '',
  "lancadoGlobus" TEXT NOT NULL DEFAULT '',
  observacao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aguardando'
);

-- ============================================================
-- 13. Registros de Ociosidade (Quilometragem por veículo/dia)
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_ociosidade (
  id TEXT PRIMARY KEY,
  prefixo TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '',
  "operacionalKm" REAL NOT NULL DEFAULT 0,
  "ociosaKm" REAL NOT NULL DEFAULT 0,
  "totalKm" REAL NOT NULL DEFAULT 0
);

-- ============================================================
-- 14. Registros de Linhas (Quilometragem por linha)
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_linhas (
  id TEXT PRIMARY KEY,
  "numeroLinha" TEXT NOT NULL DEFAULT '',
  km REAL NOT NULL DEFAULT 0,
  veiculos TEXT[] NOT NULL DEFAULT '{}',
  "pendenteCadastro" BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- Row Level Security — Políticas permissivas (acesso total)
-- Para um app interno, permite leitura/escrita via anon key.
-- Em produção, adicione políticas mais restritivas.
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'app_users','motoristas','viagens','ocorrencias','veiculos',
    'excessos_velocidade','paradas_indevidas','avarias','resumos_avaria',
    'multas_antt','antt_code_descriptions','multas_transito',
    'registros_ociosidade','registros_linhas'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "allow_all_%s" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- Índices úteis para consultas frequentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ocorrencias_motorista ON ocorrencias ("matriculaMotorista");
CREATE INDEX IF NOT EXISTS idx_ocorrencias_linha ON ocorrencias ("numeroLinha");
CREATE INDEX IF NOT EXISTS idx_viagens_linha ON viagens ("numeroLinha");
CREATE INDEX IF NOT EXISTS idx_excessos_matricula ON excessos_velocidade (matricula);
CREATE INDEX IF NOT EXISTS idx_avarias_motorista ON avarias ("matriculaMotorista");
CREATE INDEX IF NOT EXISTS idx_multas_antt_placa ON multas_antt ("placaVeiculo");
CREATE INDEX IF NOT EXISTS idx_multas_transito_motorista ON multas_transito ("matriculaMotorista");
CREATE INDEX IF NOT EXISTS idx_registros_ociosidade_prefixo ON registros_ociosidade (prefixo);
CREATE INDEX IF NOT EXISTS idx_veiculos_prefixo ON veiculos (prefixo);

-- ============================================================
-- 15. Ociosidade de Motoristas
-- ============================================================
CREATE TABLE IF NOT EXISTS ociosidades_motorista (
  id TEXT PRIMARY KEY,
  "dataHora" TEXT NOT NULL,
  data TEXT NOT NULL,
  "codigoLinha" TEXT NOT NULL,
  "nomeLinha" TEXT NOT NULL,
  sentido TEXT,
  prefixo TEXT,
  matricula TEXT NOT NULL,
  "eventoOcorrido" TEXT,
  "tempoMinutos" INTEGER NOT NULL DEFAULT 0,
  endereco TEXT
);
ALTER TABLE ociosidades_motorista ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ociosidades_motorista" ON ociosidades_motorista FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ociosidades_matricula ON ociosidades_motorista (matricula);
CREATE INDEX IF NOT EXISTS idx_ociosidades_data ON ociosidades_motorista (data);

-- ============================================================
-- 16. Monitriip
-- ============================================================
CREATE TABLE IF NOT EXISTS monitriips (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  "partidaPrevista" TEXT,
  partida TEXT,
  chegada TEXT,
  servico TEXT NOT NULL,
  "viagemValida" BOOLEAN NOT NULL DEFAULT false,
  "atraso30min" BOOLEAN NOT NULL DEFAULT false,
  "vendaPassagem" INTEGER NOT NULL DEFAULT 0,
  "cancelPassagem" INTEGER NOT NULL DEFAULT 0,
  embarque INTEGER NOT NULL DEFAULT 0,
  "noShow" INTEGER NOT NULL DEFAULT 0,
  "inicioFimViagem" TEXT,
  "jornadaMotorista" TEXT,
  "detectorParada" TEXT,
  "velTempoLocalizacao" TEXT,
  "velTempLocMinima" TEXT
);
ALTER TABLE monitriips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_monitriips" ON monitriips FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_monitriips_data ON monitriips (data);
CREATE INDEX IF NOT EXISTS idx_monitriips_servico ON monitriips (servico);

-- ============================================================
-- 17. Eventos de Motorista (Histórico de Presença)
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos_motorista (
  id TEXT PRIMARY KEY,
  matricula TEXT NOT NULL,
  data TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('FALTA','ATESTADO','FOLGA','TRABALHADO')),
  observacao TEXT
);
ALTER TABLE eventos_motorista ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_eventos_motorista" ON eventos_motorista FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_eventos_motorista_matricula ON eventos_motorista (matricula);
CREATE INDEX IF NOT EXISTS idx_eventos_motorista_data ON eventos_motorista (data);

-- ============================================================
-- 18. Notificações do App
-- ============================================================
CREATE TABLE IF NOT EXISTS app_notifications (
  id TEXT PRIMARY KEY,
  tabela TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '',
  lida JSONB NOT NULL DEFAULT '{}'
);
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_app_notifications" ON app_notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 19. Dicionário de Linhas (abreviações)
-- ============================================================
CREATE TABLE IF NOT EXISTS dicionario_linhas (
  id TEXT PRIMARY KEY,
  sigla TEXT NOT NULL DEFAULT '',
  "nomeCompleto" TEXT NOT NULL DEFAULT ''
);
ALTER TABLE dicionario_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_dicionario_linhas" ON dicionario_linhas FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 20. Manutenções (veículos atualmente na oficina)
-- ============================================================
CREATE TABLE IF NOT EXISTS manutencoes (
  id TEXT PRIMARY KEY,
  prefixo TEXT NOT NULL DEFAULT '',
  "retidoDesde" TEXT NOT NULL DEFAULT '',
  "kmAtual" REAL NOT NULL DEFAULT 0,
  "descricaoServico" TEXT NOT NULL DEFAULT '',
  "statusManutencao" TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  "previsaoLiberacao" TEXT NOT NULL DEFAULT ''
);
ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_manutencoes" ON manutencoes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_manutencoes_prefixo ON manutencoes (prefixo);

-- ============================================================
-- 21. Histórico de Manutenção
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_manutencao (
  id TEXT PRIMARY KEY,
  prefixo TEXT NOT NULL DEFAULT '',
  "descricaoServico" TEXT NOT NULL DEFAULT '',
  "dataEntrada" TEXT NOT NULL DEFAULT '',
  "dataSaida" TEXT NOT NULL DEFAULT '',
  "tempoOficinaHoras" REAL NOT NULL DEFAULT 0,
  "previsaoLiberacao" TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  "kmAtual" REAL NOT NULL DEFAULT 0
);
ALTER TABLE historico_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_historico_manutencao" ON historico_manutencao FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_historico_manutencao_prefixo ON historico_manutencao (prefixo);

-- ============================================================
-- 22. Acidentes
-- ============================================================
CREATE TABLE IF NOT EXISTS acidentes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '',
  hora TEXT NOT NULL DEFAULT '',
  "prefixoVeiculo" TEXT NOT NULL DEFAULT '',
  "placaVeiculo" TEXT NOT NULL DEFAULT '',
  "matriculaMotorista" TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  "tipoAcidente" TEXT NOT NULL DEFAULT '',
  gravidade TEXT NOT NULL DEFAULT 'Leve' CHECK (gravidade IN ('Leve','Moderado','Grave')),
  fotos JSONB NOT NULL DEFAULT '[]',
  "avariaVinculadaId" TEXT,
  "valorEstimado" REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Em Análise' CHECK (status IN ('Em Análise','Concluído','Pendente Seguro')),
  "causaAvaria" TEXT,
  "acaoTomada" TEXT
);
ALTER TABLE acidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_acidentes" ON acidentes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Coluna linhaAssociada em monitriips (adicionada posteriormente)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE monitriips ADD COLUMN IF NOT EXISTS "linhaAssociada" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
