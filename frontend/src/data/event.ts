import isildaPhoto from '../../assets/efe3db9a-2952-451e-b7b1-f9f377d9b464 copiar 2.png';
import pauloPhoto from '../../assets/843411082_1074975321827046_8942635931170928711_n copiar 2.png';
import jesusPhoto from '../../assets/WhatsApp Image 2026-11-05 at 12.30.58 copiar 2.png';
import mariaPhoto from '../../assets/af7a8e9b-eac9-4697-ae3f-f61af16229cc copiar 2.png';
import eventFlyer from '../../assets/panfleto-connect-2026.jpg';

export const EVENT_FLYER_URL = eventFlyer;

export interface Speaker {
  id: string;
  name: string;
  initials: string;
  role: string;
  subtheme: string;
  imageUrl?: string;
}

export const EVENT_INFO = {
  name: 'Connect 2026',
  theme: 'O Peso dos Sonhos, O Ritmo da Rotina',
  admission: 'Entrada Gratuita · Por inscrição',
  dateLabel: '06 de Dezembro de 2026',
  shortDateLabel: '06 Dez. · 13h',
  timeLabel: '13h00',
  location: 'Shopping Viana',
  organization: 'A.M.T.T.S',
  organizationFull: 'As Mulheres Também Têm Sonhos',
  contactPhone: '+244 934 242 419',
  contactHref: 'tel:+244934242419',
  whatsappHref: 'https://wa.me/244934242419',
  registrationLaunchLabel: 'Inscrições abertas a partir de 18 de Novembro',
  calendarStartUtc: '20261206T120000Z',
  calendarEndUtc: '20261206T160000Z',
} as const;

export const SPEAKERS: Speaker[] = [
  {
    id: 'isilda-conceicao',
    name: 'Isilda da Conceição',
    initials: 'IC',
    role: 'Palestrante, Empreendedora e fundadora do projecto Mulheres Transformadoras',
    subtheme: 'O Elo Entre o Crescimento Pessoal e o Sucesso Profissional',
    imageUrl: isildaPhoto,
  },
  {
    id: 'paulo-sergio',
    name: 'Paulo Sérgio',
    initials: 'PS',
    role: 'Psicólogo Clínico, Escritor e Empresário',
    subtheme: 'Ansiedade Disfarçada de Produtividade',
    imageUrl: pauloPhoto,
  },
  {
    id: 'jesus-fernando',
    name: 'Jesus Fernando',
    initials: 'JF',
    role: 'Empreendedor, Fundador da MEED',
    subtheme: 'A Jornada do Sonhador Persistente',
    imageUrl: jesusPhoto,
  },
  {
    id: 'maria-joaquim',
    name: 'Maria Joaquim',
    initials: 'MJ',
    role: 'Fundadora do projecto Mulheres que florescem',
    subtheme: 'O Equilibrada Entre Perdas e Contribuições',
    imageUrl: mariaPhoto,
  },
];
