import { Ocorrencia, TipoStatus } from '../types';
import { parse, differenceInMinutes, addDays, isValid, parseISO } from 'date-fns';

export function parseDateTime(dateTimeStr: string): Date {
  if (!dateTimeStr) return new Date(NaN);
  
  const trimmed = dateTimeStr.trim();
  
  // Try DD/MM/YYYY HH:mm
  let parsed = parse(trimmed, 'dd/MM/yyyy HH:mm', new Date());
  if (isValid(parsed)) return parsed;
  
  // Try YYYY-MM-DD HH:mm
  parsed = parse(trimmed, 'yyyy-MM-dd HH:mm', new Date());
  if (isValid(parsed)) return parsed;

  // Try ISO format
  parsed = parseISO(trimmed);
  if (isValid(parsed)) return parsed;

  // Try parsing just the time if it's HH:mm and assume current day (fallback for manual edits)
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  return new Date(NaN);
}

export function calcularStatus(diff: number): TipoStatus {
  // Atraso: > 5 min
  // Adiantamento: < -5 min (ou seja, mais de 5 min adiantado)
  if (diff > 5) return 'Atraso';
  if (diff < -5) return 'Adiantamento';
  return 'No Horário';
}

/**
 * Processa ocorrência considerando a Jornada de Trabalho.
 * Se o horário realizado for muito distante do previsto (ex: virada de dia), 
 * o sistema tenta ajustar a data para o dia seguinte se necessário.
 */
export function processarOcorrenciaIndividual(o: Partial<Ocorrencia>): Ocorrencia {
  const prevIn = o.prevInicio || '';
  const prevOut = o.prevFim || '';
  
  let realIn = o.realInicio || '';
  let realOut = o.realFim || '';
  
  const realInicioOriginalVazio = !realIn;
  const realFimOriginalVazio = !realOut;
  
  if (realInicioOriginalVazio) realIn = prevIn;
  if (realFimOriginalVazio) realOut = prevOut;
  
  let dtPrevIn = parseDateTime(prevIn);
  let dtRealIn = parseDateTime(realIn);
  let dtPrevOut = parseDateTime(prevOut);
  let dtRealOut = parseDateTime(realOut);
  
  if (!isValid(dtPrevIn) || !isValid(dtRealIn)) {
    return {
      ...o as any,
      realInicio: realIn,
      realFim: realOut,
      diffMinutosInicio: 0,
      statusInicio: 'No Horário',
      diffMinutosFim: 0,
      statusFim: 'No Horário',
      realInicioOriginalVazio,
      realFimOriginalVazio
    };
  }

  // Lógica de Virada de Dia (Jornada)
  // Se o Previsto Fim for antes do Previsto Início (ex: 23:00 -> 02:00), o fim é no dia seguinte
  if (dtPrevOut < dtPrevIn) {
    dtPrevOut = addDays(dtPrevOut, 1);
  }

  // Ajuste do Realizado: Se o realizado for muito anterior ao previsto (ex: começou 23:55 mas a data era dia seguinte)
  // Ou se o realizado foi após a meia noite e a data ainda marca o dia anterior.
  const diffInRaw = differenceInMinutes(dtRealIn, dtPrevIn);
  if (diffInRaw < -1200) dtRealIn = addDays(dtRealIn, 1); // Provável virada de dia não computada na data
  if (diffInRaw > 1200) dtRealIn = addDays(dtRealIn, -1);

  const diffOutRaw = differenceInMinutes(dtRealOut, dtPrevOut);
  if (diffOutRaw < -1200) dtRealOut = addDays(dtRealOut, 1);
  if (diffOutRaw > 1200) dtRealOut = addDays(dtRealOut, -1);

  const diffIn = differenceInMinutes(dtRealIn, dtPrevIn);
  const diffOut = differenceInMinutes(dtRealOut, dtPrevOut);

  // Regra de Sequência: Apenas a primeira viagem da jornada/grupo é passível de penalidade?
  // Essa lógica será aplicada no Dashboard filtrando os dados processados.

  return {
    ...o as any,
    realInicio: realIn,
    realFim: realOut,
    diffMinutosInicio: diffIn,
    statusInicio: calcularStatus(diffIn),
    diffMinutosFim: diffOut,
    statusFim: calcularStatus(diffOut),
    realInicioOriginalVazio,
    realFimOriginalVazio
  };
}
