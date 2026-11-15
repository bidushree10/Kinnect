export type UserRole = 'family' | 'patient' | 'caretaker';

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName: string;
  email: string;
  patientId?: string;
  familyId?: string;
  createdAt: string;
}

export interface Patient {
  id: string; // Format: KIN-XXXX-XXXX
  familyId: string;
  name: string;
  canUseSmartphone: boolean; // true = Independent, false = Assisted Care
  patientUid?: string;
  createdAt: string;
}

export interface CaretakerPermissions {
  canConfirm: boolean;
  canEditSchedules: boolean;
}

export interface Caretaker {
  uid: string;
  patientId: string;
  familyId: string;
  permissions: CaretakerPermissions;
  active: boolean;
  createdAt: string;
  displayName?: string;
  email?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  // Locked prescription fields
  name: string;
  strength: string;
  dosage: string;
  frequency: string; // MVP: strictly once-daily
  // Editable field
  scheduledTime: string; // HH:MM (24-hour)
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export type DoseStatus = 'unconfirmed' | 'taken';

export interface DoseRecord {
  id: string; // {medId}_{YYYY-MM-DD}
  patientId: string;
  medId: string;
  date: string; // YYYY-MM-DD
  status: 'taken';
  confirmedByUid: string;
  confirmedByRole: UserRole;
  confirmedByName: string;
  confirmedAt: string;
}

export interface ComputedDoseItem {
  doseId: string;
  medication: Medication;
  date: string;
  status: DoseStatus;
  confirmedByUid?: string;
  confirmedByRole?: UserRole;
  confirmedByName?: string;
  confirmedAt?: string;
}

export type AppointmentStatus = 'unconfirmed' | 'attended';

export interface Appointment {
  id: string;
  patientId: string;
  title: string;
  doctor: string;
  location: string;
  dateTime: string;
  status: AppointmentStatus;
  confirmedByUid?: string;
  confirmedByRole?: UserRole;
  confirmedByName?: string;
  confirmedAt?: string;
  createdBy: string;
  createdAt: string;
}

export type ActivityItemType = 'dose' | 'appointment' | 'caretaker' | 'mode';

export interface ActivityLog {
  id: string;
  patientId: string;
  itemType: ActivityItemType;
  itemId: string;
  action: string;
  actorUid: string;
  actorRole: UserRole;
  actorName: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  familyId: string;
  patientId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

