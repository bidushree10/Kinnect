import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Navbar } from '../components/common/Navbar';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { useAuth } from '../contexts/AuthContext';
import { getPatientsForFamily, createPatientProfile } from '../services/patientService';
import { getComputedDosesForDate } from '../services/medicationService';
import { getAppointments, addAppointment } from '../services/appointmentService';
import { getActivityLogs } from '../services/auditService';
import { MedicationFormModal } from '../components/dashboard/MedicationFormModal';
import { CaretakerFormModal } from '../components/dashboard/CaretakerFormModal';
import { confirmDose } from '../services/confirmationService';
import { HeartHandshake, UserPlus, CalendarPlus, Pill, Clock } from 'lucide-react';
import { Patient, ComputedDoseItem, Appointment, ActivityLog } from '../types';

export const DashboardView: React.FC<{ onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { currentUser, userProfile, signOut } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [doses, setDoses] = useState<ComputedDoseItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  // Modals state
  const [showMedModal, setShowMedModal] = useState(false);
  const [showCaretakerModal, setShowCaretakerModal] = useState(false);
  const [showAptModal, setShowAptModal] = useState(false);

  // Create Patient Form state
  const [patientName, setPatientName] = useState('');
  const [isIndependent, setIsIndependent] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Add Appointment Form state
  const [aptTitle, setAptTitle] = useState('');
  const [aptDoctor, setAptDoctor] = useState('');
  const [aptLocation, setAptLocation] = useState('');
  const [aptDateTime, setAptDateTime] = useState('');
  const [isAddingApt, setIsAddingApt] = useState(false);

  const [formError, setFormError] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  // Role guard: redirect patients to /patient
  useEffect(() => {
    if (userProfile && userProfile.role === 'patient') {
      navigate('/patient');
    }
  }, [userProfile, navigate]);

  // Load all patients managed by this family member
  useEffect(() => {
    if (!currentUser) return;
    setIsLoadingPatients(true);
    getPatientsForFamily(currentUser.uid)
      .then(async (list) => {
        // If demo family account and list is empty, initialize demo patient
        if (list.length === 0 && (currentUser.email === 'family@kinnect.local' || currentUser.email === 'family@kinnect.app')) {
          const demoP: Patient = {
            id: 'KIN-7H4K-9QX2',
            familyId: currentUser.uid,
            name: 'Eleanor Vance',
            canUseSmartphone: false,
            createdAt: new Date().toISOString(),
          };
          list = [demoP];
        }
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId((curr) => curr || list[0].id);
        }
      })
      .catch((e) => {
        console.error(e);
        const msg = e instanceof Error ? e.message : 'Failed to load patients';
        setFormError(msg);
        onShowToast('error', msg);
      })
      .finally(() => setIsLoadingPatients(false));
  }, [currentUser]);

  // Active selected patient
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || null;

  // Refresh dependent data when selected patient changes
  const loadPatientData = async (patientId: string) => {
    try {
      let [dosesList, aptsList, logsList] = await Promise.all([
        getComputedDosesForDate(patientId, today).catch((e) => {
          console.warn('Could not load doses:', e);
          return [] as ComputedDoseItem[];
        }),
        getAppointments(patientId).catch((e) => {
          console.warn('Could not load appointments:', e);
          return [] as Appointment[];
        }),
        getActivityLogs(patientId).catch((e) => {
          console.warn('Could not load logs:', e);
          return [] as ActivityLog[];
        }),
      ]);

      // If viewing demo patient and no remote data exists yet, supply sample data
      if (patientId === 'KIN-7H4K-9QX2') {
        if (dosesList.length === 0) {
          dosesList = [
            {
              doseId: `med_demo_metformin_${today}`,
              medication: {
                id: 'med_demo_metformin',
                patientId: 'KIN-7H4K-9QX2',
                name: 'Metformin',
                strength: '500mg',
                dosage: '1 tablet',
                frequency: 'Daily',
                scheduledTime: '08:00',
                active: true,
                createdBy: currentUser?.uid || '',
                createdAt: new Date().toISOString(),
              },
              date: today,
              status: 'taken',
              confirmedByName: 'Sarah Connor',
              confirmedAt: new Date().toISOString(),
            },
            {
              doseId: `med_demo_lisinopril_${today}`,
              medication: {
                id: 'med_demo_lisinopril',
                patientId: 'KIN-7H4K-9QX2',
                name: 'Lisinopril',
                strength: '10mg',
                dosage: '1 tablet',
                frequency: 'Daily',
                scheduledTime: '20:00',
                active: true,
                createdBy: currentUser?.uid || '',
                createdAt: new Date().toISOString(),
              },
              date: today,
              status: 'unconfirmed',
            },
          ];
        }
        if (aptsList.length === 0) {
          aptsList = [
            {
              id: 'apt_demo_cardiology',
              patientId: 'KIN-7H4K-9QX2',
              title: 'Cardiology Checkup',
              doctor: 'Dr. Robert Chen',
              location: 'City Heart Clinic, Suite 302',
              dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
              status: 'unconfirmed',
              createdBy: currentUser?.uid || '',
              createdAt: new Date().toISOString(),
            },
          ];
        }
        if (logsList.length === 0) {
          logsList = [
            {
              id: 'log_demo_initial',
              patientId: 'KIN-7H4K-9QX2',
              itemType: 'dose',
              itemId: `med_demo_metformin_${today}`,
              action: 'DOSE_TAKEN',
              actorUid: currentUser?.uid || '',
              actorRole: 'family',
              actorName: 'Sarah Connor',
              timestamp: new Date().toISOString(),
            },
          ];
        }
      }

      setDoses(dosesList);
      setAppointments(aptsList);
      setActivityLogs(logsList);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Error loading patient dashboard data';
      setFormError(msg);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient.id);
    } else {
      setDoses([]);
      setAppointments([]);
      setActivityLogs([]);
    }
  }, [selectedPatient?.id, today]);

  // Handle Patient Creation
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!patientName.trim()) {
      setFormError('Patient name is required.');
      return;
    }

    setIsCreatingPatient(true);
    try {
      const newPatient = await createPatientProfile({
        name: patientName.trim(),
        canUseSmartphone: isIndependent,
      });

      setPatients((prev) => [...prev, newPatient]);
      setSelectedPatientId(newPatient.id);
      setPatientName('');
      setIsIndependent(false);
      onShowToast('success', `Created patient profile ${newPatient.id}`);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to create patient profile';
      setFormError(msg);
      onShowToast('error', msg);
    } finally {
      setIsCreatingPatient(false);
    }
  };

  // Handle Dose Confirmation
  const handleConfirmDose = async (dose: ComputedDoseItem) => {
    if (!selectedPatient) return;
    setFormError('');
    try {
      await confirmDose({
        patientId: selectedPatient.id,
        medId: dose.medication.id,
        dateStr: today,
        medName: dose.medication.name,
      });
      onShowToast('success', `Confirmed ${dose.medication.name}`);
      await loadPatientData(selectedPatient.id);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to confirm dose';
      setFormError(msg);
      onShowToast('error', msg);
    }
  };

  // Handle Appointment Creation
  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsAddingApt(true);
    setFormError('');

    try {
      await addAppointment({
        patientId: selectedPatient.id,
        title: aptTitle.trim(),
        doctor: aptDoctor.trim(),
        location: aptLocation.trim(),
        dateTime: aptDateTime.trim(),
      });
      onShowToast('success', `Scheduled appointment: ${aptTitle}`);
      setAptTitle('');
      setAptDoctor('');
      setAptLocation('');
      setAptDateTime('');
      setShowAptModal(false);
      const updated = await getAppointments(selectedPatient.id);
      setAppointments(updated);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Failed to schedule appointment';
      setFormError(msg);
      onShowToast('error', msg);
    } finally {
      setIsAddingApt(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#232323] flex flex-col font-body">
      {/* Top Navigation */}
      <Navbar
        currentMode={selectedPatient?.canUseSmartphone ? 'independent' : 'assisted'}
        userEmail={currentUser?.email || userProfile?.email}
        userRole={userProfile?.role || 'family'}
        onSignOut={async () => {
          await signOut();
          navigate('/');
        }}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#232323]">
              Family Care Dashboard
            </h1>
            <p className="text-[#524E48] text-[15px] mt-1">
              Accountable elderly care coordination with accountable verification.
            </p>
          </div>

          {selectedPatient && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => setShowMedModal(true)}
                leftIcon={<Pill className="w-4 h-4" />}
              >
                Add Medication
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowAptModal(true)}
                leftIcon={<CalendarPlus className="w-4 h-4 text-[#0F5C5C]" />}
              >
                Add Appointment
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCaretakerModal(true)}
                leftIcon={<UserPlus className="w-4 h-4 text-[#0F5C5C]" />}
              >
                Assign Caretaker
              </Button>
            </div>
          )}
        </div>

        {/* Accessible Error Alert */}
        {formError && (
          <div
            role="alert"
            className="p-4 bg-[#FEE2E2] border border-[#B91C1C] rounded-xl text-[15px] font-bold text-[#B91C1C] mb-6 flex items-center justify-between"
            aria-live="assertive"
          >
            <span>Error: {formError}</span>
            <button
              type="button"
              onClick={() => setFormError('')}
              className="text-sm underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Create Patient Profile */}
        <section className="mb-8 p-6 bg-[#F3EFE6] border border-[#D6D1C7] rounded-2xl shadow-xs">
          <h2 className="font-heading text-xl font-bold mb-2 text-[#232323]">
            Create Patient Profile
          </h2>
          <p className="text-sm text-[#524E48] mb-4">
            Generates a collision-resistant <span className="font-mono font-bold">KIN-XXXX-XXXX</span> identifier and configures care mode.
          </p>

          <form onSubmit={handleCreatePatient} className="space-y-4 max-w-2xl">
            <div>
              <label htmlFor="patient-name" className="block text-[15px] font-bold text-[#232323] mb-1">
                Patient Full Name
              </label>
              <input
                id="patient-name"
                type="text"
                placeholder="e.g. Eleanor Vance"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full min-h-[48px] px-4 text-[16px] rounded-lg bg-white border border-[#D6D1C7] text-[#232323] focus:border-[#0F5C5C] focus:outline-none"
                required
              />
            </div>

            <div>
              <span className="block text-[15px] font-bold text-[#232323] mb-2">Access Mode</span>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer text-[15px] font-medium text-[#232323]">
                  <input
                    type="radio"
                    name="accessMode"
                    checked={!isIndependent}
                    onChange={() => setIsIndependent(false)}
                    className="w-4 h-4 accent-[#0F5C5C]"
                  />
                  <span>Assisted Care (Caretaker coordinates verification)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-[15px] font-medium text-[#232323]">
                  <input
                    type="radio"
                    name="accessMode"
                    checked={isIndependent}
                    onChange={() => setIsIndependent(true)}
                    className="w-4 h-4 accent-[#0F5C5C]"
                  />
                  <span>Independent (Patient uses smartphone)</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isCreatingPatient}
              loadingText="Creating Patient Profile..."
            >
              Create Patient
            </Button>
          </form>
        </section>

        {/* Section 2: Patients List */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl font-bold text-[#232323]">Linked Patients</h2>
            <span className="text-sm text-[#524E48]">
              {patients.length} {patients.length === 1 ? 'patient' : 'patients'} registered
            </span>
          </div>

          {isLoadingPatients ? (
            <p className="text-[#524E48] italic">Loading patient profiles from Firestore...</p>
          ) : patients.length === 0 ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-center">
              <p className="text-[#524E48] font-medium mb-1">No patient profiles created yet.</p>
              <p className="text-sm text-[#524E48]">Create your first patient above to start managing medications and appointments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#E3EFEF] border-[#0F5C5C] shadow-sm ring-2 ring-[#0F5C5C]/20'
                        : 'bg-white border-[#D6D1C7] hover:border-[#0F5C5C]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-heading font-bold text-[18px] text-[#232323]">
                        {p.name}
                      </span>
                      {isSelected && (
                        <span className="text-[12px] bg-[#0F5C5C] text-white px-2 py-0.5 rounded font-bold">
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#D6D1C7]/60">
                      <span className="text-xs font-mono font-bold bg-[#FAF7F0] px-2 py-1 rounded border border-[#D6D1C7] text-[#524E48]">
                        {p.id}
                      </span>
                      {p.canUseSmartphone ? (
                        <Badge variant="independent">Independent</Badge>
                      ) : (
                        <Badge variant="teal" className="flex items-center gap-1">
                          <HeartHandshake size={15} className="text-[#0F5C5C]" aria-hidden="true" />
                          Assisted Care
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Today's Medications */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl font-bold text-[#232323]">Today's Medications</h2>
            {selectedPatient && (
              <span className="text-sm text-[#524E48]">Date: {today}</span>
            )}
          </div>

          {!selectedPatient ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-[#524E48]">
              Create or select a patient to view today's medication schedule.
            </div>
          ) : doses.length === 0 ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-center">
              <p className="text-[#524E48] mb-3">No active medications scheduled for today.</p>
              <Button
                variant="primary"
                size="default"
                onClick={() => setShowMedModal(true)}
              >
                Add First Medication
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {doses.map((dose) => (
                <div
                  key={dose.doseId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-[#D6D1C7] rounded-xl bg-white shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[17px] text-[#232323]">
                        {dose.medication.name}
                      </span>
                      <span className="text-sm text-[#524E48]">
                        {dose.medication.strength} • {dose.medication.dosage}
                      </span>
                    </div>
                    <p className="text-sm text-[#524E48] flex items-center gap-1 mt-0.5">
                      <Clock className="w-4 h-4 text-[#524E48]" />
                      Scheduled time: <strong>{dose.medication.scheduledTime}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {dose.status === 'unconfirmed' ? (
                      <>
                        <Badge variant="pending">Unconfirmed</Badge>
                        <Button
                          size="default"
                          className="h-11 min-w-[130px]"
                          onClick={() => handleConfirmDose(dose)}
                        >
                          Confirm dose
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Taken</Badge>
                        <span className="text-xs text-[#0A4242]">
                          Confirmed by {dose.confirmedByName || 'User'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Medical Appointments */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl font-bold text-[#232323]">Appointments</h2>
            {selectedPatient && appointments.length > 0 && (
              <Button
                variant="secondary"
                size="default"
                onClick={() => setShowAptModal(true)}
              >
                + Schedule
              </Button>
            )}
          </div>

          {!selectedPatient ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-[#524E48]">
              Create or select a patient to view appointments.
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-center">
              <p className="text-[#524E48] mb-3">No upcoming appointments scheduled.</p>
              <Button
                variant="secondary"
                size="default"
                onClick={() => setShowAptModal(true)}
              >
                Schedule First Appointment
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-4 border border-[#D6D1C7] rounded-xl bg-white shadow-2xs">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-[17px] text-[#232323]">{appt.title}</h3>
                    {appt.status === 'attended' ? (
                      <Badge variant="success">Attended</Badge>
                    ) : (
                      <Badge variant="pending">Unconfirmed</Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#524E48]">{new Date(appt.dateTime).toLocaleString()}</p>
                  <p className="text-sm text-[#524E48] mt-1">
                    Dr. {appt.doctor} • {appt.location}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 5: Activity Log (Audit Trail) */}
        <section className="mb-8">
          <h2 className="font-heading text-xl font-bold mb-3 text-[#232323]">Recent Activity Trail</h2>
          {!selectedPatient ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-[#524E48]">
              Create or select a patient to view activity logs.
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="p-6 bg-white border border-[#D6D1C7] rounded-xl text-[#524E48] italic">
              No activity recorded yet for this patient. Confirming doses, attendance, and mode switches appear here immutably.
            </div>
          ) : (
            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div key={log.id} className="p-3 border border-[#D6D1C7] rounded-lg bg-white text-sm flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#232323]">{log.action}</span>
                    <span className="text-[#524E48] ml-2">by {log.actorName} ({log.actorRole})</span>
                  </div>
                  <span className="text-xs text-[#524E48]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modal: Add Medication */}
        {selectedPatient && (
          <MedicationFormModal
            isOpen={showMedModal}
            onClose={() => setShowMedModal(false)}
            patientId={selectedPatient.id}
            onSuccess={(medName) => {
              onShowToast('success', `Added medication: ${medName}`);
              getComputedDosesForDate(selectedPatient.id, today).then(setDoses);
            }}
          />
        )}

        {/* Modal: Assign Caretaker */}
        {selectedPatient && (
          <CaretakerFormModal
            isOpen={showCaretakerModal}
            onClose={() => setShowCaretakerModal(false)}
            patientId={selectedPatient.id}
            onSuccess={(cName) => {
              onShowToast('success', `Assigned caretaker: ${cName}`);
            }}
          />
        )}

        {/* Modal: Add Appointment */}
        {selectedPatient && (
          <Modal
            isOpen={showAptModal}
            onClose={() => setShowAptModal(false)}
            title="Schedule Medical Appointment"
          >
            <form onSubmit={handleAddAppointment} className="space-y-4">
              <Input
                id="apt-title"
                label="Appointment Title"
                placeholder="e.g. Cardiology Follow-up"
                value={aptTitle}
                onChange={(e) => setAptTitle(e.target.value)}
                required
              />
              <Input
                id="apt-doctor"
                label="Doctor Name"
                placeholder="e.g. Dr. Emily Thorne"
                value={aptDoctor}
                onChange={(e) => setAptDoctor(e.target.value)}
                required
              />
              <Input
                id="apt-location"
                label="Location / Clinic"
                placeholder="e.g. St. Jude Hospital, Room 302"
                value={aptLocation}
                onChange={(e) => setAptLocation(e.target.value)}
                required
              />
              <Input
                id="apt-datetime"
                label="Date & Time"
                type="datetime-local"
                value={aptDateTime}
                onChange={(e) => setAptDateTime(e.target.value)}
                required
              />

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowAptModal(false)}
                  disabled={isAddingApt}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isAddingApt}
                  loadingText="Scheduling..."
                >
                  Schedule Appointment
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
};
