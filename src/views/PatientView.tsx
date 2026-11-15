import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Navbar } from '../components/common/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { getComputedDosesForDate } from '../services/medicationService';
import { ComputedDoseItem, Appointment as AppointmentType } from '../types';
import { confirmDose } from '../services/confirmationService';
import { getAppointments } from '../services/appointmentService';
import { getPatient } from '../services/patientService';
import { Clock, Calendar, Check } from 'lucide-react';

export const PatientView: React.FC<{ onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { currentUser, userProfile, activePatient, signOut } = useAuth();
  const [patientData, setPatientData] = useState(activePatient);
  const [doses, setDoses] = useState<ComputedDoseItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDoseId, setActionDoseId] = useState<string | null>(null);

  const patientId = patientData?.id || userProfile?.patientId || '';
  const today = new Date().toISOString().slice(0, 10);

  // If activePatient is not populated in context, load by userProfile.patientId
  useEffect(() => {
    if (!patientData && userProfile?.patientId) {
      getPatient(userProfile.patientId).then((p) => {
        if (p) setPatientData(p);
      });
    }
  }, [patientData, userProfile]);

  // Load today's doses and appointments
  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getComputedDosesForDate(patientId, today).catch((e) => {
        console.warn('Error loading doses for patient:', e);
        return [] as ComputedDoseItem[];
      }),
      getAppointments(patientId).catch((e) => {
        console.warn('Error loading appointments for patient:', e);
        return [] as AppointmentType[];
      }),
    ])
      .then(([dosesList, aptsList]) => {
        setDoses(dosesList);
        setAppointments(aptsList);
      })
      .catch((e) => onShowToast('error', e instanceof Error ? e.message : 'Failed to load schedule'))
      .finally(() => setLoading(false));
  }, [patientId, today]);

  const handleTake = async (dose: ComputedDoseItem) => {
    if (!patientId) return;
    setActionDoseId(dose.doseId);
    try {
      await confirmDose({
        patientId,
        medId: dose.medication.id,
        dateStr: today,
        medName: dose.medication.name,
      });
      onShowToast('success', `Confirmed: Took ${dose.medication.name}`);
      const refreshed = await getComputedDosesForDate(patientId, today);
      setDoses(refreshed);
    } catch (e) {
      onShowToast('error', e instanceof Error ? e.message : 'Failed to confirm dose');
    } finally {
      setActionDoseId(null);
    }
  };

  const nextAppointment = appointments
    .filter((a) => new Date(a.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#232323] flex flex-col font-body">
      {/* Top Navbar */}
      <Navbar
        currentMode="independent"
        userEmail={currentUser?.email || undefined}
        userRole="patient"
        onSignOut={async () => {
          await signOut();
          navigate('/');
        }}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#232323]">
            My Daily Care
          </h1>
          <p className="text-[#524E48] text-[18px] mt-1">
            Tap the button when you take each scheduled medication.
          </p>
        </div>

        {loading ? (
          <p className="text-[#524E48] text-lg italic">Loading your medications...</p>
        ) : (
          <>
            {/* Medications List */}
            <section className="mb-10">
              <h2 className="font-heading text-2xl font-bold mb-4 text-[#232323]">
                Today's Medications
              </h2>

              {doses.length === 0 ? (
                <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-center">
                  <p className="text-[18px] text-[#524E48]">No medications scheduled for today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {doses.map((dose) => {
                    const isTaken = dose.status === 'taken';
                    return (
                      <div
                        key={dose.doseId}
                        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                          isTaken
                            ? 'bg-[#E3EFEF]/60 border-[#0F5C5C]/30'
                            : 'bg-white border-[#D6D1C7] shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-heading font-bold text-2xl text-[#232323]">
                              {dose.medication.name}
                            </span>
                            <span className="text-lg text-[#524E48]">
                              {dose.medication.strength}
                            </span>
                          </div>
                          <p className="text-[16px] text-[#524E48] mt-1 flex items-center gap-1.5">
                            <Clock className="w-5 h-5 text-[#524E48]" />
                            {dose.medication.dosage} at <strong>{dose.medication.scheduledTime}</strong>
                          </p>
                        </div>

                        <div>
                          {isTaken ? (
                            <Badge variant="success" className="text-lg px-4 py-2">
                              <Check className="w-5 h-5" />
                              Taken
                            </Badge>
                          ) : (
                            <Button
                              size="large"
                              variant="primary"
                              className="min-h-[56px] text-[18px] px-8 w-full sm:w-auto font-bold"
                              isLoading={actionDoseId === dose.doseId}
                              loadingText="Recording..."
                              onClick={() => handleTake(dose)}
                            >
                              I Took It
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Next Appointment Section */}
            <section className="p-6 bg-[#F3EFE6] border border-[#D6D1C7] rounded-2xl">
              <h2 className="font-heading text-xl font-bold mb-3 text-[#232323] flex items-center gap-2">
                <Calendar className="w-6 h-6 text-[#0F5C5C]" />
                Next Appointment
              </h2>
              {nextAppointment ? (
                <div className="p-4 bg-white border border-[#D6D1C7] rounded-xl">
                  <p className="font-bold text-xl text-[#232323]">{nextAppointment.title}</p>
                  <p className="text-[17px] text-[#524E48] mt-1">
                    {new Date(nextAppointment.dateTime).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-[16px] text-[#524E48] mt-1">
                    Dr. {nextAppointment.doctor} • {nextAppointment.location}
                  </p>
                </div>
              ) : (
                <p className="text-[#524E48] text-base">No upcoming appointments scheduled.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};
