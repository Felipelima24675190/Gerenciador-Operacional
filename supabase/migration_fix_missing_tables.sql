-- ============================================================
-- FIX: Tabelas que faltavam no migration.sql original
-- Execute este SQL no Supabase SQL Editor se você já rodou
-- o migration.sql anterior e está com problemas de dados
-- não carregando para outros usuários.
-- ============================================================

-- 1) Atualizar a função truncate_table para incluir novas tabelas
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

-- 2) Criar tabelas que faltavam

CREATE TABLE IF NOT EXISTS app_notifications (
  id TEXT PRIMARY KEY,
  tabela TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '',
  lida JSONB NOT NULL DEFAULT '{}'
);
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_app_notifications" ON app_notifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS dicionario_linhas (
  id TEXT PRIMARY KEY,
  sigla TEXT NOT NULL DEFAULT '',
  "nomeCompleto" TEXT NOT NULL DEFAULT ''
);
ALTER TABLE dicionario_linhas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_dicionario_linhas" ON dicionario_linhas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
DO $$ BEGIN
  CREATE POLICY "allow_all_manutencoes" ON manutencoes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_manutencoes_prefixo ON manutencoes (prefixo);

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
DO $$ BEGIN
  CREATE POLICY "allow_all_historico_manutencao" ON historico_manutencao FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_historico_manutencao_prefixo ON historico_manutencao (prefixo);

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
  status TEXT NOT NULL DEFAULT 'Em Análise' CHECK (status IN ('Em Análise','Concluído','Pendente Seguro'))
);
ALTER TABLE acidentes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "allow_all_acidentes" ON acidentes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Adicionar coluna linhaAssociada ao monitriips (se não existir)
DO $$ BEGIN
  ALTER TABLE monitriips ADD COLUMN "linhaAssociada" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
