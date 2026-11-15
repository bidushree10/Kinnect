import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';


import { useAuth } from '../contexts/AuthContext';
import { getPatientForFamily } from '../services/patientService';
import { getComputedDosesForDate } from '../services/medicationService';
import { getAppointments } from '../services/appointmentService';
import { getActivityLogs } from '../services/auditService';
import { MedicationFormModal } from '../components/dashboard/MedicationFormModal';
import { HeartHandshake } from 'lucide-react';
import { Patient, ComputedDoseItem, Appointment, ActivityLog } from '../types';

export const DashboardView: React.FC<{ onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onShowToast }) => {
  const { currentUser } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doses, setDoses] = useState<ComputedDoseItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showMedModal, setShowMedModal] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Load patient for the logged‑in family member
  useEffect(() => {
    if (!currentUser) return;
    getPatientForFamily(currentUser.uid)
      .then(setPatient)
      .catch(e => onShowToast('error', e instanceof Error ? e.message : 'Failed to load patient'));
  }, [currentUser]);

  // Load today's doses once we have a patient
  useEffect(() => {
    if (!patient) return;
    getComputedDosesForDate(patient.id, today)
      .then(setDoses)
      .catch(e => onShowToast('error', e instanceof Error ? e.message : 'Failed to load doses'));
  }, [patient, today]);

  // Load appointments
  useEffect(() => {
    if (!patient) return;
    getAppointments(patient.id)
      .then(setAppointments)
      .catch(e => onShowToast('error', e instanceof Error ? e.message : 'Failed to load appointments'));
  }, [patient]);

  // Load activity logs
  useEffect(() => {
    if (!patient) return;
    getActivityLogs(patient.id)
      .then(setActivityLogs)
      .catch(e => onShowToast('error', e instanceof Error ? e.message : 'Failed to load activity logs'));
  }, [patient]);

  const handleMedSuccess = (medName: string) => {
    onShowToast('success', `Added medication: ${medName}`);
    // Refresh doses after adding a medication (new med appears as unconfirmed today)
    if (patient) getComputedDosesForDate(patient.id, today).then(setDoses);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#232323] flex flex-col font-body p-4">
      <h1 className="font-heading text-2xl mb-4">Dashboard</h1>

      {/* Patient List – for now just show the active patient */}
      {patient && (
        <section className="mb-6">
          <h2 className="font-heading text-xl mb-2">Patient</h2>
          <div className="flex items-center space-x-3 p-2 border border-[#D6D1C7] rounded">
            <span className="font-medium">{patient.name}</span>
            {patient.canUseSmartphone ? null : (
              <Badge variant="teal" className="flex items-center gap-1">
                <HeartHandshake size={16} className="text-teal-600" aria-hidden="true" />
                Assisted Care
              </Badge>
            )}
          </div>
        </section>
      )}

      {/* Add Medication */}
      <section className="mb-6">
        <Button variant="primary" onClick={() => setShowMedModal(true)}>
          Add Medication
        </Button>
        {patient && (
          <MedicationFormModal
            isOpen={showMedModal}
            onClose={() => setShowMedModal(false)}
            patientId={patient.id}
            onSuccess={handleMedSuccess}
          />
        )}
      </section>

      {/* Today's Doses */}
      <section className="mb-6">
        <h2 className="font-heading text-xl mb-2">Today's Medications</h2>
        {doses.map(dose => (
          <div key={dose.doseId} className="flex items-center justify-between mb-2 p-2 border border-[#D6D1C7] rounded">
            <span>{dose.medication.name} ({dose.medication.dosage})</span>
            {dose.status === 'unconfirmed' ? (
              <Button size="default" className="h-14 min-w-[120px]">I took it</Button>
            ) : (
              <span className="text-[#0A4242] font-bold">Taken</span>
            )}
          </div>
        ))}
      </section>

      {/* Appointments */}
      <section className="mb-6">
        <h2 className="font-heading text-xl mb-2">Appointments</h2>
        {appointments.map(appt => (
          <div key={appt.id} className="p-2 border border-[#D6D1C7] rounded mb-2">
            <p className="font-medium">{appt.title}</p>
            <p>{new Date(appt.dateTime).toLocaleString()}</p>
            <p>{appt.doctor} – {appt.location}</p>
          </div>
        ))}
      </section>

      {/* Activity Log */}
      <section className="mb-6">
        <h2 className="font-heading text-xl mb-2">Recent Activity</h2>
        {activityLogs.map(log => (
          <div key={log.id} className="p-2 border border-[#D6D1C7] rounded mb-2 text-sm">
            <p>{log.action} by {log.actorName} ({log.actorRole})</p>
            <p>{new Date(log.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
