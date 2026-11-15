import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { addMedication } from '../../services/medicationService';
import { Lock } from 'lucide-react';

interface MedicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: (medName: string) => void;
}

export const MedicationFormModal: React.FC<MedicationFormModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [dosage, setDosage] = useState('');
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Medicine name is required.');
      return;
    }
    if (!strength.trim()) {
      setError('Strength is required (e.g. 500mg).');
      return;
    }
    if (!dosage.trim()) {
      setError('Dosage is required (e.g. 1 tablet).');
      return;
    }
    if (!scheduledTime.trim()) {
      setError('Scheduled time is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addMedication({
        patientId,
        name: name.trim(),
        strength: strength.trim(),
        dosage: dosage.trim(),
        frequency: 'Daily',
        scheduledTime: scheduledTime.trim(),
      });

      onSuccess(name.trim());
      setName('');
      setStrength('');
      setDosage('');
      setScheduledTime('08:00');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add medication.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Medication Prescription">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Safety Lock Disclaimer */}
        <div className="p-3 bg-[#EFECE4] border-dashed border-[1.5px] border-[#D6D1C7] rounded-lg flex items-start gap-2.5">
          <Lock className="w-5 h-5 text-[#524E48] shrink-0 mt-0.5" strokeWidth={2.25} aria-hidden="true" />
          <p className="text-[14px] text-[#524E48] font-medium leading-relaxed">
            <strong>Medical Safety Lock:</strong> Medicine name, strength, dosage, and frequency are permanently locked after creation. Only the scheduled dose time can be edited later.
          </p>
        </div>

        <Input
          id="med-name"
          label="Medicine Name"
          placeholder="e.g. Metformin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="med-strength"
            label="Strength"
            placeholder="e.g. 500mg"
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
            required
          />

          <Input
            id="med-dosage"
            label="Dosage"
            placeholder="e.g. 1 tablet"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="med-frequency"
            label="Frequency (MVP Scope)"
            defaultValue="Once daily (Daily)"
            isLocked
            readOnly
          />

          <Input
            id="med-time"
            label="Scheduled Dose Time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            helperText="24-hour format (HH:MM)"
            required
          />
        </div>

        {error && (
          <div role="alert" className="p-3 bg-[#FEE2E2] border border-[#B91C1C] rounded-lg text-[15px] font-bold text-[#B91C1C]">
            Error: {error}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText="Adding medication..."
          >
            Save Prescription
          </Button>
        </div>
      </form>
    </Modal>
  );
};

