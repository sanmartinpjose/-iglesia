export type MemberSegment = 'Niño' | 'Adolescente' | 'Joven' | 'Adulto';

export interface Member {
  id: string;
  churchId: string;
  fullName: string;
  gender: 'M' | 'F';
  photoUrl?: string;
  segment: MemberSegment;
  birthDate?: string;
  isBaptized: boolean;
  baptismDate?: string;
  hasHolySpiritSeal: boolean;
  holySpiritSealDate?: string;
  isServer: boolean;
  serverRole?: string;
  status: 'Activo' | 'Inactivo' | 'Trasladado';
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export type RelationshipType = 'parent' | 'child' | 'sibling' | 'spouse' | 'cousin' | 'other';

export interface Relationship {
  id: string;
  churchId: string;
  memberId1: string;
  memberId2: string;
  type: RelationshipType;
  metadata?: string;
}

export interface FinancialRecord {
  id: string;
  churchId: string;
  type: 'income' | 'expense';
  amount: number;
  cashAmount?: number;
  transferAmount?: number;
  category: string;
  subcategory?: string;
  description: string;
  contributorName?: string;
  date: any;
  memberId?: string;
  createdAt: any;
}

export interface ChurchConfig {
  id: string;
  churchId: string;
  name: string;
  pastorName: string;
  logoUrl?: string;
  birthdayNoticeDays: number;
  enableBirthdayEmails: boolean;
  worshipSchedule: {
    day: string;
    time: string;
  }[];
  specialServices: { name: string; description: string }[];
  missionaryDays: { name: string; label: string }[];
  updatedAt: any;
}

export type AdminRole = 'Administrador' | 'Tesorero' | 'Pastor' | 'Secretario' | 'Vocal' | 'Servidor';

export interface Church {
  id: string;
  name: string;
  ownerId: string;
  adminEmails: string[];
  adminRoles?: { [email: string]: AdminRole[] };
  createdAt: any;
}

export interface AttendanceRecord {
  id: string;
  churchId: string;
  adminEmails: string[];
  date: any;
  count: number;
  presentMemberIds: string[];
  breakdown: {
    children: number;
    men: number;
    women: number;
    visitors: number;
  };
  serviceType: string;
  notes?: string;
  createdAt: any;
}
