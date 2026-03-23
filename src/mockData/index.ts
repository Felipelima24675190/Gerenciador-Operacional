import { Motorista, Linha, Ocorrencia } from '../types';
export { mockViagens } from './viagens';
export { mockMultas } from './antt';

export const mockMotoristas: Motorista[] = [
  { matricula: '1001', nome: 'João Silva', filial: 'Sul', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' },
  { matricula: '1002', nome: 'Maria Santos', filial: 'Norte', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' },
  { matricula: '1003', nome: 'Pedro Costa', filial: 'Sul', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' },
  { matricula: '1004', nome: 'Ana Lima', filial: 'Leste', area: 'Manutenção', status: 'ATIVO - EM OPERAÇÃO' },
  { matricula: '1005', nome: 'Carlos Souza', filial: 'Oeste', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' },
  { matricula: '1006', nome: 'Lucas Almeida', filial: 'Norte', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' },
  { matricula: '1007', nome: 'Julia Farias', filial: 'Oeste', area: 'Operação', status: 'ATIVO - EM OPERAÇÃO' },
];

export const mockLinhas: Linha[] = [
  { codigo: 'L01', nome: 'Centro - Terminal Sul' },
  { codigo: 'L02', nome: 'Terminal Norte - Shopping' },
  { codigo: 'L03', nome: 'Expresso Leste' },
  { codigo: 'L04', nome: 'Circular Oeste' },
];

// Gerar dados para a última semana
export const mockOcorrencias: Ocorrencia[] = [];
