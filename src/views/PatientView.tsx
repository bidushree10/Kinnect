import React, { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { getComputedDosesForDate } from '../services/medicationService';
import { ComputedDoseItem } from '../types';
import { confirmDose } from '../services/confirmationService';
import { getAppointments } from '../services/appointmentService';
import { Appointment as AppointmentType } from '../types';

export const PatientView: React.FC<{ onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onShowToast }) => {
  const { activePatient } = useAuth();
  const patientId = activePatient?.id || '';
  const today = new Date().toISOString().slice(0, 10);

  const [doses, setDoses] = useState<ComputedDoseItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);

  // Load today's doses
  useEffect(() => {
    if (!patientId) return;
    getComputedDosesForDate(patientId, today)
      .then(setDoses)
      .catch((e) => onShowToast('error', e instanceof Error ? e.message : 'Failed to load doses'));
  }, [patientId, today]);

  // Load appointments (to find next upcoming)
  useEffect(() => {
    if (!patientId) return;
    getAppointments(patientId)
      .then(setAppointments)
      .catch((e) => onShowToast('error', e instanceof Error ? e.message : 'Failed to load appointments'));
  }, [patientId]);

  const handleTake = async (dose: ComputedDoseItem) => {
    try {
      await confirmDose({ patientId, medId: dose.medication.id, dateStr: today, medName: dose.medication.name });
      onShowToast('success', `Confirmed ${dose.medication.name}`);
      // Refresh list
      const refreshed = await getComputedDosesForDate(patientId, today);
      setDoses(refreshed);
    } catch (e) {
      onShowToast('error', e instanceof Error ? e.message : 'Failed to confirm dose');
    }
  };

  const nextAppointment = appointments
    .filter((a) => new Date(a.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#232323] flex flex-col font-body p-4">
      <h1 className="font-heading text-2xl mb-4">Patient View</h1>

      <section className="mb-6">
        <h2 className="font-heading text-xl mb-2">Today's Medications</h2>
        {doses.map((dose) => (
          <div key={dose.doseId} className="flex items-center justify-between mb-2 p-2 border border-[#D6D1C7] rounded">
            <span>{dose.medication.name} ({dose.medication.dosage})</span>
            {dose.status === 'unconfirmed' ? (
              <Button
                size="default"
                className="h-14 min-w-[120px]"
                onClick={() => handleTake(dose)}
              >
                I took it
              </Button>
            ) : (
              <span className="text-[#0A4242] font-bold">Taken</span>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-heading text-xl mb-2">Next Appointment</h2>
        {nextAppointment ? (
          <div className="p-2 border border-[#D6D1C7] rounded">
            <p className="font-medium">{nextAppointment.title}</p>
            <p>{new Date(nextAppointment.dateTime).toLocaleString()}</p>
            <p>{nextAppointment.doctor} – {nextAppointment.location}</p>
          </div>
        ) : (
          <p>No upcoming appointments.</p>
        )}
      </section>
    </div>
  );
};

