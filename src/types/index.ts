export type StatusMotorista = 'ATIVO - EM OPERAÇÃO' | 'DESLIGADO' | 'INSS' | 'INSTRUTOR';

export interface Motorista {
  matricula: string;
  nome: string;
  filial: string;
  area: string;
  status: StatusMotorista;
}

export interface Linha {
  codigo: string;
  nome: string;
}

export interface Viagem {
  id: string;
  numeroLinha: string;       // Line identifier (used for matching across reports)
  atendimento: string;       // Display name: "ORIGEM X DESTINO"
  nomeLinha: string;         // Full line name from xlsx: "RECIFE(PE) X PETROLINA(PE)"
  sentido: string;           // "IDA" | "VOLTA" | "Ida" | "Volta"
  pontoInicio: string;       // Origin city
  pontoFim: string;          // Destination city
  prevInicio: string;        // Ex: 18/03/2026 04:00
  prevFim: string;           // Ex: 18/03/2026 09:00 (may be empty for xlsx imports)
  ordem: number;
  grupoCor?: string;
  diasOperantes: number[];   // [0,1,2,3,4,5,6] onde 0 é Domingo
  // New fields from xlsx import
  servico?: string;          // 8-digit ANTT service code (e.g., "10202990")
  empresa?: string;          // "VIACAO PROGRESSO" | "VIACAO CRUZEIRO"
  regiao?: string;           // "LITORAL" | "NORDESTE" | "NORTE"
  origem?: string;           // Origin with state: "RECIFE(PE)"
  destino?: string;          // Destination with state: "PETROLINA(PE)"
  horarioSaida?: string;     // Departure time HH:MM
}

export interface Veiculo {
  id: string;
  prefixo: string;
  placa: string;
  empresa: string;
  status: string; // ATIVO, MANUTENÇÃO, INATIVO
  uf: string;
  anoFabricacao: number;
  anoModelo: number;
  marca: string;
  modelo: string;
  tipo: string;
  eixos: number;
  poltronas: number;
  potencia: number;
  chassi: string;
  renavam: string;
  litValidade?: string;  // DD/MM/YYYY
  tcoValidade?: string;  // DD/MM/YYYY
}

export interface ExcessoVelocidade {
  id: string;
  matricula: string;
  tempoExcedidoMinutos: number;
  velocidadeMediaKmh: number;
  endereco: string;
  dataOcorrencia: string;
  inicioFimOcorrencia: string;
  nomeLinha: string;
  veiculo: string;
}

export interface ParadaIndevida {
  id: string;
  data: string;
  linha: string;
  sentido: string;
  horarioLinha: string;
  matricula: string;
  motorista: string;
  area: string;
  veiculo: string;
  local: string;
  inicio: string;
  fim: string;
  tempoParado: string;
}

export interface Avaria {
  id: string;
  veiculo: string;
  data: string;
  motoristaIdentificado: 'SIM' | 'NÃO' | string;
  matriculaMotorista: string;
  motoristaCulpado: 'SIM' | 'NÃO' | string;
  lancadoNoGlobus: 'SIM' | 'NÃO' | string;
  mesLancamento: string;
  gerente: string;
  descricaoAvaria: string;
  tipoAvaria: string;
  causaAvaria: string;
  acaoTomada: string;
  horario: string;
  valorAvaria: number;
  valorCobrado: number;
}

export interface MultaANTT {
  id: string;
  autoInfracao: string;
  dataHora: string;
  empresa: string; // PROGRESSO ou CRUZEIRO
  setor: string;   // ATRASO, OPERAÇÃO, MANUTENÇÃO, COMERCIAL, RH
  terminal: string; // RECIFE-PE, JOÃO PESSOA-PB, etc.
  codigoInfracao: string;
  descricaoInfracao: string;
  matriculaMotorista?: string;
  placaVeiculo?: string;
  prefixoVeiculo?: string; // Bate com a base de veículos futuramente
  valor: number;
  status: 'Aguardando' | 'Defesa' | 'Pago' | 'Cancelado';
}

export interface Ocorrencia {
  id: string;
  numeroLinha: string;
  atendimento: string;
  nomeLinha: string;
  sentido: string;
  pontoInicio: string;
  pontoFim: string;
  veiculo: string;
  matriculaMotorista: string;
  prevInicio: string; // Ex: 18/03/2026 04:00
  prevFim: string;
  realInicio: string;
  realFim: string;
  
  // Dados calculados
  diffMinutosInicio: number;
  statusInicio: TipoStatus;
  diffMinutosFim: number;
  statusFim: TipoStatus;
  
  realInicioOriginalVazio: boolean;
  realFimOriginalVazio: boolean;
  motivoAtraso?: string;
}

export type TipoStatus = 'Atraso' | 'Adiantamento' | 'No Horário';

export type UserRole = 'admin' | 'viewer';

export interface User {
  id: string;
  username: string;
  password?: string; // Only used for mock/storage for now
  nome: string;
  role: UserRole;
  titulo?: string; // Cargo ou Função do usuário
}

export interface OcorrenciaCalculada extends Ocorrencia {
  diferencaMinutos: number; // realized - predicted
  status: TipoStatus;
}

export interface AnttCodeDescription {
  codigo: string;
  descricao: string;
  valor: number;
}

export interface ManutencaoVeiculo {
  id: string;
  prefixo: string;           // VEICULO (prefixo)
  retidoDesde: string;       // RETIDO DESDE (DD/MM/YYYY)
  kmAtual: number;           // KM ATUAL
  descricaoServico: string;  // DESCRIÇÃO DE SERVIÇOS
  statusManutencao: string;  // STATUS (texto livre da planilha)
  local: string;             // LOCAL
  previsaoLiberacao: string; // PREV. LIB. (DD/MM/YYYY)
}

export interface HistoricoManutencao {
  id: string;
  prefixo: string;
  descricaoServico: string;
  dataEntrada: string;
  dataSaida: string;
  tempoOficinaHoras: number;
  previsaoLiberacao: string;
  local: string;
  kmAtual: number;
}

export interface AcidenteFoto {
  id: string;
  url: string;        // base64 data URL
  descricao: string;  // description of what the photo shows
}

export interface Acidente {
  id: string;
  data: string;              // DD/MM/YYYY
  hora: string;
  prefixoVeiculo: string;
  placaVeiculo: string;
  matriculaMotorista: string;
  local: string;
  descricao: string;
  tipoAcidente: string;      // Colisão, Tombamento, Atropelamento, etc.
  gravidade: 'Leve' | 'Moderado' | 'Grave';
  fotos: AcidenteFoto[];
  avariaVinculadaId?: string; // ID da avaria vinculada
  valorEstimado: number;
  status: 'Em Análise' | 'Concluído' | 'Pendente Seguro';
  causaAvaria?: string;
  acaoTomada?: string;
}

export interface ResumoAvaria {
  key: string; // "${data}_${veiculo}"
  tipoAvaria: string;
  frontal: string;
  lateral: string;
  traseira: string;
}

export interface RegistroOciosidade {
  id: string;
  prefixo: string;
  data: string; // DD/MM/YYYY
  operacionalKm: number;
  ociosaKm: number;
  totalKm: number;
}

export interface RegistroLinha {
  id: string;
  numeroLinha: string;
  km: number;
  veiculos: string[]; // prefixes that ran on this line
  pendenteCadastro: boolean; // true if not found in viagens base
}

export interface MultaTransito {
  id: string;
  dataInfracao: string;        // DD/MM/YYYY
  veiculo: string;             // prefixo do veículo
  orgaoAtuador: string;        // DNIT, PREF. DE PE, etc.
  descricaoMulta: string;
  numeroAuto: string;
  valorCobrado: number;
  valorRecuperado: number;
  motoristaIdentificado: boolean;
  matriculaMotorista: string;
  nomeMotorista: string;       // nome conforme CSV
  gestor: string;
  filial: string;              // filial conforme CSV
  enviadoGerente: string;
  gerenteDevolveu: string;
  lancadoGlobus: string;
  observacao: string;
  status: 'Aguardando' | 'Defesa' | 'Pago' | 'Cancelado';
}

export interface OciosidadeMotorista {
  id: string;
  prefixo: string;                // Descrição da Unidade (vehicle prefix)
  data: string;                   // DD/MM/YYYY extracted from Data column
  dataHora: string;               // full datetime from Data column
  areaFinal: string;              // Área Final
  areaInicial: string;            // Área Inicial
  combustivelMl: number;          // Combustível Usado (ml)
  distanciaKm: number;            // Distância da Viagem (decimal km)
  eficiencia: number;             // Eficiência (km/l)
  paradoMotorLigadoMin: number;   // Parado c/ Motor Ligado → minutes
  tempoMovimentoMin: number;      // Tempo em Movimento → minutes
  tempoParadoMin: number;         // Tempo Total Parado → minutes
  tempoTotalMin: number;          // Total → minutes
}

export interface Monitriip {
  id: string;
  data: string;                   // DD/MM/YYYY extracted from col[0]
  partidaPrevista: string;
  partida: string;
  chegada: string;
  servico: string;
  viagemValida: boolean;
  atraso30min: boolean;
  vendaPassagem: number;
  cancelPassagem: number;
  embarque: number;
  noShow: number;
  inicioFimViagem: string;        // "N/A" or numeric string
  jornadaMotorista: string;
  detectorParada: string;
  velTempoLocalizacao: string;    // values >100 or <10 indicate GPS failure
  velTempLocMinima: string;
  linhaAssociada?: string;        // Line name from base de linhas (selected during import)
}

export type TipoEventoMotorista = 'FALTA' | 'ATESTADO' | 'FOLGA' | 'TRABALHADO';

export interface EventoMotorista {
  id: string;
  matricula: string;
  data: string;        // DD/MM/YYYY
  tipo: TipoEventoMotorista;
  observacao?: string;
}

export interface LinhaAbreviacao {
  id: string;
  sigla: string;
  nomeCompleto: string;
}

export interface AppNotification {
  id: string;
  tabela: string;
  descricao: string;
  data: string;
  lida: Record<string, boolean>; // userId -> true if read
}
