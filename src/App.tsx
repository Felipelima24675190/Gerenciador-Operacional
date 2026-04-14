import { useState, useEffect, useCallback, SetStateAction } from 'react';
import Layout from './components/layout/Layout';
import DashboardScreen from './components/dashboard/DashboardScreen';
import ImportDriversScreen from './components/drivers/ImportDriversScreen';
import ConsultBaseScreen from './components/drivers/ConsultBaseScreen';
import ConsultDriverScreen from './components/drivers/ConsultDriverScreen';
import ImportLinesScreen from './components/lines/ImportLinesScreen';
import ConsultLinesScreen from './components/lines/ConsultLinesScreen';
import ImportOccurrencesScreen from './components/dashboard/ImportOccurrencesScreen';
import ReportsScreen from './components/reports/ReportsScreen';
import { Motorista, Viagem, Ocorrencia, User, MultaANTT, AnttCodeDescription, ExcessoVelocidade, ParadaIndevida, Veiculo, Avaria, ResumoAvaria, MultaTransito, RegistroOciosidade, RegistroLinha, OciosidadeMotorista, Monitriip, EventoMotorista, LinhaAbreviacao, AppNotification, ManutencaoVeiculo, HistoricoManutencao, Acidente, JornadaMotorista, CodigoJornadaDescription, JornadaFaltante, ComiteDisciplinar, ValidadeAntt } from './types';
import DashboardOperacionalScreen from './components/dashboard/DashboardOperacionalScreen';
import LineDictionaryScreen, { DEFAULT_ENTRIES as DEFAULT_DICIONARIO } from './components/lines/LineDictionaryScreen';
import AnttCodesScreen from './components/antt/AnttCodesScreen';
import ImportTransitScreen from './components/transit/ImportTransitScreen';
import ViewTransitScreen from './components/transit/ViewTransitScreen';
import ImportOciosoScreen from './components/idle/ImportOciosoScreen';
import ViewOciosoScreen from './components/idle/ViewOciosoScreen';
import ImportOciosidadeMotoristaScreen from './components/ociosidade-motorista/ImportOciosidadeMotoristaScreen';
import ViewOciosidadeMotoristaScreen from './components/ociosidade-motorista/ViewOciosidadeMotoristaScreen';
import ImportMonitriipScreen from './components/monitriip/ImportMonitriipScreen';
import ViewMonitriipScreen from './components/monitriip/ViewMonitriipScreen';
import UserManagementScreen from './components/admin/UserManagementScreen';
import LoginScreen from './components/auth/LoginScreen';
import ImportAnttScreen from './components/antt/ImportAnttScreen';
import ViewAnttScreen from './components/antt/ViewAnttScreen';
import ImportVehiclesScreen from './components/vehicles/ImportVehiclesScreen';
import ConsultVehiclesScreen from './components/vehicles/ConsultVehiclesScreen';
import ImportStopsScreen from './components/stops/ImportStopsScreen';
import ViewStopsScreen from './components/stops/ViewStopsScreen';
import ImportSpeedScreen from './components/speed/ImportSpeedScreen';
import ViewSpeedScreen from './components/speed/ViewSpeedScreen';
import ConsultSpeedDriverScreen from './components/speed/ConsultSpeedDriverScreen';
import ImportAvariasScreen from './components/avarias/ImportAvariasScreen';
import ConsultAvariasScreen from './components/avarias/ConsultAvariasScreen';
import { usePersistedState } from './hooks/usePersistedState';
import { isSupabaseConfigured } from './lib/supabase';
import { Loader2, Cloud, HardDrive } from 'lucide-react';
import SplashScreen from './components/auth/SplashScreen';
import ImportMaintenanceScreen from './components/manutencao/ImportMaintenanceScreen';
import ConsultMaintenanceScreen from './components/manutencao/ConsultMaintenanceScreen';
import AcidentesScreen from './components/avarias/AcidentesScreen';
import ScoreMotoristasScreen from './components/drivers/ScoreMotoristasScreen';
import ImportJornadaScreen from './components/jornada/ImportJornadaScreen';
import CodigosJornadaScreen from './components/jornada/CodigosJornadaScreen';
import JornadaDashboardScreen from './components/jornada/JornadaDashboardScreen';
import ImportComiteScreen from './components/jornada/ImportComiteScreen';
import ValidadeAnttScreen from './components/drivers/ValidadeAnttScreen';

const DEFAULT_CODIGOS_JORNADA: CodigoJornadaDescription[] = [
  { codigo: '001', descricao: 'Jornada', categoria: 'ATIVIDADE', contaComoFalta: false },
  { codigo: '088', descricao: 'Intervalo', categoria: 'ATIVIDADE', contaComoFalta: false },
  { codigo: '202', descricao: 'Folga (DSR)', categoria: 'FOLGA', contaComoFalta: false },
  { codigo: '122', descricao: 'Fora de Escala', categoria: 'OUTROS', contaComoFalta: false },
  { codigo: '126', descricao: 'Folga Compensada', categoria: 'FOLGA', contaComoFalta: false },
  { codigo: '019', descricao: 'Falta', categoria: 'FALTA', contaComoFalta: true },
  { codigo: '033', descricao: 'Atestado', categoria: 'ATESTADO', contaComoFalta: false },
  { codigo: '066', descricao: 'Férias', categoria: 'OUTROS', contaComoFalta: false },
  { codigo: '437', descricao: 'Treinamento', categoria: 'ATIVIDADE', contaComoFalta: false },
  { codigo: '054', descricao: 'Benefício INSS', categoria: 'OUTROS', contaComoFalta: false },
  { codigo: '071', descricao: 'Licença Paternidade', categoria: 'OUTROS', contaComoFalta: false },
  { codigo: '041', descricao: 'Atestado de Óbito', categoria: 'ATESTADO', contaComoFalta: false },
  { codigo: '077', descricao: 'Desligado', categoria: 'OUTROS', contaComoFalta: false },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard-operacional');
  const [showSplash, setShowSplash] = useState(false);

  // ─── Session auth (localStorage only — not data, just login state) ─────────
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowSplash(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard-operacional');
  };

  // ─── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = usePersistedState<AppNotification>('app_notifications', 'notificationsData');

  const addNotification = useCallback((tabela: string, descricao: string) => {
    const n: AppNotification = {
      id: crypto.randomUUID(),
      tabela,
      descricao,
      data: new Date().toLocaleString('pt-BR'),
      lida: {},
    };
    setNotifications(prev => [n, ...prev].slice(0, 50));
  }, [setNotifications]);

  // ─── Persisted data (Supabase + localStorage cache) ────────────────────────
  const defaultUsers: User[] = [{ id: '1', username: 'admin', password: '123', nome: 'Admin Master', role: 'admin', titulo: 'Administrador' }];

  const [users, setUsers, usersLoading]                           = usePersistedState<User>('app_users', 'usersData', defaultUsers);
  const [motoristas, setMotoristas]                               = usePersistedState<Motorista>('motoristas', 'motoristasData');
  const [viagens, setViagens]                                     = usePersistedState<Viagem>('viagens', 'viagensData');
  const [ocorrencias, setOcorrencias]                             = usePersistedState<Ocorrencia>('ocorrencias', 'ocorrenciasData');
  const [veiculos, setVeiculos]                                   = usePersistedState<Veiculo>('veiculos', 'veiculosData');
  const [paradasIndevidas, setParadasIndevidas]                   = usePersistedState<ParadaIndevida>('paradas_indevidas', 'paradasIndevidasData');
  const [excessosVelocidade, setExcessosVelocidade]               = usePersistedState<ExcessoVelocidade>('excessos_velocidade', 'excessosVelocidadeData');
  const [avarias, setAvarias]                                     = usePersistedState<Avaria>('avarias', 'avariasData');
  const [resumosAvaria, setResumosAvaria]                         = usePersistedState<ResumoAvaria>('resumos_avaria', 'resumosAvariaData');
  const [multasAntt, setMultasAntt]                               = usePersistedState<MultaANTT>('multas_antt', 'multasAnttData');
  const [anttCodeDescriptions, setAnttCodeDescriptions]           = usePersistedState<AnttCodeDescription>('antt_code_descriptions', 'anttCodeDescriptionsData');
  const [multasTransito, setMultasTransito]                       = usePersistedState<MultaTransito>('multas_transito', 'multasTransitoData');
  const [registrosOciosidade, setRegistrosOciosidade]             = usePersistedState<RegistroOciosidade>('registros_ociosidade', 'registrosOciosidadeData');
  const [registrosLinhas, setRegistrosLinhas]                     = usePersistedState<RegistroLinha>('registros_linhas', 'registrosLinhasData');
  const [ociosidadesMotorista, setOciosidadesMotorista]           = usePersistedState<OciosidadeMotorista>('ociosidades_motorista', 'ociosidadesMotoristaData');
  const [monitriips, setMonitriips]                               = usePersistedState<Monitriip>('monitriips', 'monitriipsData');
  const [eventosMotorista, setEventosMotorista]                   = usePersistedState<EventoMotorista>('eventos_motorista', 'eventosMotoristaData');
  const [dicionarioLinhas, setDicionarioLinhas]                   = usePersistedState<LinhaAbreviacao>('dicionario_linhas', 'dicionarioLinhasData', DEFAULT_DICIONARIO);
  const [manutencoes, setManutencoes]                             = usePersistedState<ManutencaoVeiculo>('manutencoes', 'manutencoesData');
  const [historicoManutencao, setHistoricoManutencao]             = usePersistedState<HistoricoManutencao>('historico_manutencao', 'historicoManutencaoData');
  const [acidentes, setAcidentes]                                 = usePersistedState<Acidente>('acidentes', 'acidentesData');
  const [jornadasMotorista, setJornadasMotorista]                 = usePersistedState<JornadaMotorista>('jornadas_motorista', 'jornadasMotoristaData');
  const [codigosJornada, setCodigosJornada]                       = usePersistedState<CodigoJornadaDescription>('codigos_jornada', 'codigosJornadaData', DEFAULT_CODIGOS_JORNADA);
  const [jornadasFaltantes, setJornadasFaltantes]                 = usePersistedState<JornadaFaltante>('jornadas_faltantes', 'jornadasFaltantesData');
  const [comiteDisciplinar, setComiteDisciplinar]                 = usePersistedState<ComiteDisciplinar>('comite_disciplinar', 'comiteDisciplinarData');
  const [validadesAntt, setValidadesAntt]                         = usePersistedState<ValidadeAntt>('validades_antt', 'validadesAnttData');

  // ─── Notifying wrappers ────────────────────────────────────────────────────
  const setOcorrenciasN = useCallback((a: SetStateAction<Ocorrencia[]>) => { setOcorrencias(a); addNotification('Ocorrencias', 'Dados de pontualidade atualizados'); }, [setOcorrencias, addNotification]);
  const setMultasAnttN = useCallback((a: SetStateAction<MultaANTT[]>) => { setMultasAntt(a); addNotification('Multas ANTT', 'Multas ANTT atualizadas'); }, [setMultasAntt, addNotification]);
  const setMultasTransitoN = useCallback((a: SetStateAction<MultaTransito[]>) => { setMultasTransito(a); addNotification('Multas Transito', 'Multas de transito atualizadas'); }, [setMultasTransito, addNotification]);
  const setExcessosN = useCallback((a: SetStateAction<ExcessoVelocidade[]>) => { setExcessosVelocidade(a); addNotification('Velocidade', 'Excessos de velocidade atualizados'); }, [setExcessosVelocidade, addNotification]);
  const setAvariasN = useCallback((a: SetStateAction<Avaria[]>) => { setAvarias(a); addNotification('Avarias', 'Avarias atualizadas'); }, [setAvarias, addNotification]);
  const setMotoristasN = useCallback((a: SetStateAction<Motorista[]>) => { setMotoristas(a); addNotification('Motoristas', 'Base de motoristas atualizada'); }, [setMotoristas, addNotification]);
  const setVeiculosN = useCallback((a: SetStateAction<Veiculo[]>) => { setVeiculos(a); addNotification('Veiculos', 'Base de veiculos atualizada'); }, [setVeiculos, addNotification]);
  const setMonitriipsN = useCallback((a: SetStateAction<Monitriip[]>) => { setMonitriips(a); addNotification('Monitriip', 'Dados Monitriip atualizados'); }, [setMonitriips, addNotification]);
  const setManutencoesN = useCallback((a: SetStateAction<ManutencaoVeiculo[]>) => { setManutencoes(a); addNotification('Manutencao', 'Status de manutencao atualizado'); }, [setManutencoes, addNotification]);
  const setAcidentesN = useCallback((a: SetStateAction<Acidente[]>) => { setAcidentes(a); addNotification('Acidentes', 'Registro de acidentes atualizado'); }, [setAcidentes, addNotification]);
  const setJornadasMotN = useCallback((a: SetStateAction<JornadaMotorista[]>) => { setJornadasMotorista(a); addNotification('Jornada', 'Jornada de motoristas atualizada'); }, [setJornadasMotorista, addNotification]);
  const setComiteDisciplinarN = useCallback((a: SetStateAction<ComiteDisciplinar[]>) => { setComiteDisciplinar(a); addNotification('Comite', 'Comitê disciplinar atualizado'); }, [setComiteDisciplinar, addNotification]);
  const setValidadesAnttN = useCallback((a: SetStateAction<ValidadeAntt[]>) => { setValidadesAntt(a); addNotification('Validade ANTT', 'Validade ANTT atualizada'); }, [setValidadesAntt, addNotification]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen motoristas={motoristas} ocorrencias={ocorrencias} viagens={viagens} setOcorrencias={setOcorrencias} userRole={currentUser.role} />;
      case 'import-occurrences':
        return <ImportOccurrencesScreen ocorrencias={ocorrencias} setOcorrencias={setOcorrenciasN} motoristas={motoristas} viagens={viagens} userRole={currentUser.role} />;
      case 'import-drivers':
        return <ImportDriversScreen motoristas={motoristas} setMotoristas={setMotoristasN} userRole={currentUser.role} onNavigate={setActiveTab} validades={validadesAntt} setValidades={setValidadesAnttN} />;
      case 'consult-base':
        return <ConsultBaseScreen motoristas={motoristas} setMotoristas={setMotoristas} userRole={currentUser.role} eventosMotorista={eventosMotorista} setEventosMotorista={setEventosMotorista} jornadasMotorista={jornadasMotorista} codigosJornada={codigosJornada} validades={validadesAntt} />;
      case 'validade-antt':
        return <ValidadeAnttScreen validades={validadesAntt} motoristas={motoristas} />;
      case 'consult-driver':
        return <ConsultDriverScreen motoristas={motoristas} ocorrencias={ocorrencias} multasTransito={multasTransito} />;
      case 'import-lines':
        return <ImportLinesScreen viagens={viagens} setViagens={setViagens} userRole={currentUser.role} />;
      case 'consult-lines':
        return <ConsultLinesScreen viagens={viagens} setViagens={setViagens} userRole={currentUser.role} />;
      case 'manual-line':
        return <ImportLinesScreen viagens={viagens} setViagens={setViagens} userRole={currentUser.role} />;
      case 'import-vehicles':
        return <ImportVehiclesScreen veiculos={veiculos} setVeiculos={setVeiculosN} userRole={currentUser.role} />;
      case 'consult-vehicles':
        return <ConsultVehiclesScreen veiculos={veiculos} multasAntt={multasAntt} avarias={avarias} multasTransito={multasTransito} registrosOciosidade={registrosOciosidade} motoristas={motoristas} />;
      case 'manual-vehicle':
        return <ImportVehiclesScreen veiculos={veiculos} setVeiculos={setVeiculosN} userRole={currentUser.role} />;
      case 'import-stops':
        return <ImportStopsScreen setParadas={setParadasIndevidas} motoristas={motoristas} viagens={viagens} userRole={currentUser.role} />;
      case 'view-stops':
        return <ViewStopsScreen paradas={paradasIndevidas} userRole={currentUser.role} />;
      case 'create-avaria':
        return <ImportAvariasScreen setAvarias={setAvariasN} motoristas={motoristas} userRole={currentUser.role} />;
      case 'view-avaria':
        return <ConsultAvariasScreen avarias={avarias} setAvarias={setAvarias} motoristas={motoristas} resumos={resumosAvaria} setResumos={setResumosAvaria} acidentes={acidentes} />;
      case 'import-speed':
        return <ImportSpeedScreen setExcessos={setExcessosN} userRole={currentUser.role} viagens={viagens} />;
      case 'view-speed':
        return <ViewSpeedScreen excessos={excessosVelocidade} motoristas={motoristas} userRole={currentUser.role} />;
      case 'consult-speed-driver':
        return <ConsultSpeedDriverScreen motoristas={motoristas} excessos={excessosVelocidade} />;
      case 'reports':
        return <ReportsScreen motoristas={motoristas} ocorrencias={ocorrencias} excessos={excessosVelocidade} multasAntt={multasAntt} avarias={avarias} paradas={paradasIndevidas} multasTransito={multasTransito} ociosidades={ociosidadesMotorista} jornadasMotorista={jornadasMotorista} codigosJornada={codigosJornada} />;
      case 'manual-driver':
        return <ImportDriversScreen motoristas={motoristas} setMotoristas={setMotoristasN} userRole={currentUser.role} onNavigate={setActiveTab} validades={validadesAntt} setValidades={setValidadesAnttN} />;
      case 'users':
        return <UserManagementScreen users={users} setUsers={setUsers} />;
      case 'import-antt':
        return <ImportAnttScreen multas={multasAntt} setMultas={setMultasAnttN} userRole={currentUser.role} anttCodeDescriptions={anttCodeDescriptions} setAnttCodeDescriptions={setAnttCodeDescriptions} />;
      case 'view-antt':
        return <ViewAnttScreen multas={multasAntt} anttCodeDescriptions={anttCodeDescriptions} motoristas={motoristas} />;
      case 'antt-codes':
        return <AnttCodesScreen anttCodeDescriptions={anttCodeDescriptions} setAnttCodeDescriptions={setAnttCodeDescriptions} userRole={currentUser.role} />;
      case 'import-transit':
        return <ImportTransitScreen multas={multasTransito} setMultas={setMultasTransitoN} motoristas={motoristas} userRole={currentUser.role} />;
      case 'view-transit':
        return <ViewTransitScreen multas={multasTransito} motoristas={motoristas} />;
      case 'import-ocioso':
        return <ImportOciosoScreen registros={registrosOciosidade} setRegistros={setRegistrosOciosidade} linhas={registrosLinhas} setLinhas={setRegistrosLinhas} viagens={viagens} userRole={currentUser.role} />;
      case 'view-ocioso':
        return <ViewOciosoScreen registros={registrosOciosidade} linhas={registrosLinhas} viagens={viagens} />;
      case 'import-ociosidade-motorista':
        return <ImportOciosidadeMotoristaScreen ociosidades={ociosidadesMotorista} setOciosidades={setOciosidadesMotorista} motoristas={motoristas} viagens={viagens} userRole={currentUser.role} />;
      case 'view-ociosidade-motorista':
        return <ViewOciosidadeMotoristaScreen ociosidades={ociosidadesMotorista} motoristas={motoristas} viagens={viagens} />;
      case 'import-monitriip':
        return <ImportMonitriipScreen monitriips={monitriips} setMonitriips={setMonitriipsN} userRole={currentUser.role} viagens={viagens} />;
      case 'view-monitriip':
        return <ViewMonitriipScreen monitriips={monitriips} viagens={viagens} />;
      case 'dashboard-operacional':
        return <DashboardOperacionalScreen ocorrencias={ocorrencias} excessos={excessosVelocidade} multasAntt={multasAntt} multasTransito={multasTransito} avarias={avarias} paradas={paradasIndevidas} monitriips={monitriips} />;
      case 'line-dictionary':
        return <LineDictionaryScreen dicionario={dicionarioLinhas} setDicionario={setDicionarioLinhas} viagens={viagens} userRole={currentUser.role} />;
      case 'import-manutencao':
        return <ImportMaintenanceScreen manutencoes={manutencoes} setManutencoes={setManutencoesN} historicoManutencao={historicoManutencao} setHistoricoManutencao={setHistoricoManutencao} veiculos={veiculos} userRole={currentUser.role} />;
      case 'view-manutencao':
        return <ConsultMaintenanceScreen manutencoes={manutencoes} historicoManutencao={historicoManutencao} setHistoricoManutencao={setHistoricoManutencao} veiculos={veiculos} />;
      case 'acidentes':
        return <AcidentesScreen acidentes={acidentes} setAcidentes={setAcidentesN} avarias={avarias} motoristas={motoristas} userRole={currentUser.role} />;
      case 'score-motoristas':
        return <ScoreMotoristasScreen motoristas={motoristas} ocorrencias={ocorrencias} excessos={excessosVelocidade} avarias={avarias} acidentes={acidentes} eventosMotorista={eventosMotorista} jornadasMotorista={jornadasMotorista} codigosJornada={codigosJornada} />;
      case 'import-jornada':
        return <ImportJornadaScreen jornadas={jornadasMotorista} setJornadas={setJornadasMotN} motoristas={motoristas} codigosJornada={codigosJornada} userRole={currentUser.role} />;
      case 'codigos-jornada':
        return <CodigosJornadaScreen codigosJornada={codigosJornada} setCodigosJornada={setCodigosJornada} userRole={currentUser.role} />;
      case 'dashboard-jornada':
        return <JornadaDashboardScreen jornadasMotorista={jornadasMotorista} setJornadasMotorista={setJornadasMotorista} codigosJornada={codigosJornada} motoristas={motoristas} jornadasFaltantes={jornadasFaltantes} setJornadasFaltantes={setJornadasFaltantes} comiteDisciplinar={comiteDisciplinar} setComiteDisciplinar={setComiteDisciplinarN} />;
      case 'import-comite':
        return <ImportComiteScreen comite={comiteDisciplinar} setComite={setComiteDisciplinarN} motoristas={motoristas} userRole={currentUser.role} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <h2 className="text-2xl font-semibold text-gray-500">Tela em Construção ({activeTab})</h2>
          </div>
        );
    }
  };

  const PAGE_META: Record<string, { title: string; breadcrumb?: string }> = {
    'dashboard-operacional': { title: 'Dashboard Operacional' },
    'score-motoristas': { title: 'Score de Motoristas' },
    'dashboard': { title: 'Dashboard Pontualidade', breadcrumb: 'Pontualidade' },
    'import-occurrences': { title: 'Importar Ocorrências', breadcrumb: 'Pontualidade' },
    'consult-driver': { title: 'Consultar Motorista', breadcrumb: 'Pontualidade' },
    'import-speed': { title: 'Importar Excessos', breadcrumb: 'Velocidade' },
    'view-speed': { title: 'Consultar Excessos', breadcrumb: 'Velocidade' },
    'consult-speed-driver': { title: 'Histórico por Motorista', breadcrumb: 'Velocidade' },
    'import-antt': { title: 'Importar Multas', breadcrumb: 'Multas ANTT' },
    'view-antt': { title: 'Consultar Multas', breadcrumb: 'Multas ANTT' },
    'antt-codes': { title: 'Consultar Códigos', breadcrumb: 'Multas ANTT' },
    'import-transit': { title: 'Importar Multas', breadcrumb: 'Multas Trânsito' },
    'view-transit': { title: 'Consultar Multas', breadcrumb: 'Multas Trânsito' },
    'import-stops': { title: 'Importar Paradas', breadcrumb: 'Paradas Indevidas' },
    'view-stops': { title: 'Consultar Paradas', breadcrumb: 'Paradas Indevidas' },
    'create-avaria': { title: 'Cadastrar Avaria', breadcrumb: 'Avarias' },
    'view-avaria': { title: 'Consultar Avarias', breadcrumb: 'Avarias' },
    'acidentes': { title: 'Acidentes e Sinistros', breadcrumb: 'Avarias' },
    'import-ociosidade-motorista': { title: 'Importar Quilometragem', breadcrumb: 'Quilometragem' },
    'view-ociosidade-motorista': { title: 'Consultar Quilometragem', breadcrumb: 'Quilometragem' },
    'import-ocioso': { title: 'Importar Quilometragem Operacional', breadcrumb: 'Quilometragem' },
    'view-ocioso': { title: 'Consultar Quilometragem Operacional', breadcrumb: 'Quilometragem' },
    'import-monitriip': { title: 'Importar Dados', breadcrumb: 'Monitriip' },
    'view-monitriip': { title: 'Consultar Monitriip', breadcrumb: 'Monitriip' },
    'import-manutencao': { title: 'Importar Status', breadcrumb: 'Manutenção' },
    'view-manutencao': { title: 'Consultar Veículos na Oficina', breadcrumb: 'Manutenção' },
    'reports': { title: 'Relatórios e Métricas', breadcrumb: 'Relatórios' },
    'import-drivers': { title: 'Importar Base', breadcrumb: 'Base Motoristas' },
    'manual-driver': { title: 'Cadastro Manual', breadcrumb: 'Base Motoristas' },
    'consult-base': { title: 'Consultar Base', breadcrumb: 'Base Motoristas' },
    'validade-antt': { title: 'Validade ANTT', breadcrumb: 'Base Motoristas' },
    'import-jornada': { title: 'Importar Jornada', breadcrumb: 'Jornada Motoristas' },
    'codigos-jornada': { title: 'Códigos de Jornada', breadcrumb: 'Jornada Motoristas' },
    'dashboard-jornada': { title: 'Dashboard Jornada', breadcrumb: 'Jornada Motoristas' },
    'import-comite': { title: 'Importar Comitê', breadcrumb: 'Jornada Motoristas' },
    'import-lines': { title: 'Importar Linhas', breadcrumb: 'Base Linhas' },
    'manual-line': { title: 'Cadastro Manual', breadcrumb: 'Base Linhas' },
    'consult-lines': { title: 'Consultar Linhas', breadcrumb: 'Base Linhas' },
    'line-dictionary': { title: 'Dicionário de Linhas', breadcrumb: 'Base Linhas' },
    'import-vehicles': { title: 'Importar Veículos', breadcrumb: 'Base Veículos' },
    'manual-vehicle': { title: 'Cadastro Manual', breadcrumb: 'Base Veículos' },
    'consult-vehicles': { title: 'Consultar Veículos', breadcrumb: 'Base Veículos' },
    'users': { title: 'Gerenciamento de Usuários', breadcrumb: 'Configurações' },
  };

  const getPageTitle = () => PAGE_META[activeTab]?.title || 'Viação Progresso';
  const getPageBreadcrumb = () => PAGE_META[activeTab]?.breadcrumb;

  // ─── Loading screen (while users load from Supabase for login validation) ──
  if (usersLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#4fc3f7] flex items-center justify-center overflow-hidden">
        <img
          src="/splash-logo.png"
          alt="Viação Progresso"
          className="w-full h-full object-contain drop-shadow-2xl animate-fade-in"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/progresso-logo.png'; }}
        />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-white" size={36} />
          <p className="text-white font-bold text-sm uppercase tracking-widest">Carregando dados...</p>
          <div className="flex items-center gap-2">
            {isSupabaseConfigured
              ? <><Cloud size={14} className="text-emerald-200" /><span className="text-[10px] text-emerald-100 font-bold">Supabase conectado</span></>
              : <><HardDrive size={14} className="text-amber-200" /><span className="text-[10px] text-amber-100 font-bold">Modo local (localStorage)</span></>
            }
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} users={users} />;
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={getPageTitle()}
      breadcrumb={getPageBreadcrumb()}
      user={currentUser}
      onLogout={handleLogout}
      notifications={notifications}
      setNotifications={setNotifications}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
