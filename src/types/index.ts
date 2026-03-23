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
  numeroLinha: string;
  atendimento: string;
  nomeLinha: string;
  sentido: string;
  pontoInicio: string;
  pontoFim: string;
  prevInicio: string; // Ex: 18/03/2026 04:00
  prevFim: string;    // Ex: 18/03/2026 09:00
  ordem: number; 
  grupoCor?: string;
  diasOperantes: number[]; // [0,1,2,3,4,5,6] onde 0 é Domingo
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
  matriculaMotorista: string;
  nomeMotorista: string;
  motoristaCulpado: 'SIM' | 'NÃO' | string;
  lancadoNoGlobus: 'SIM' | 'NÃO' | string;
  mesLancamento: string;
  gerente: string;
  tipoAvaria: string;
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
  autoInfracao: string;
  dataHora: string;
  empresa: string;
  setor: string;
  local: string;
  codigoInfracao: string;
  descricaoInfracao: string;
  matriculaMotorista: string;
  placaVeiculo: string;
  valor: number;
  status: 'Aguardando' | 'Defesa' | 'Pago' | 'Cancelado';
}
