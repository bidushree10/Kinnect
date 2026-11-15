import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { createCaretaker } from '../../services/caretakerService';

interface CaretakerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: (name: string) => void;
}

export const CaretakerFormModal: React.FC<CaretakerFormModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [canEditSchedules, setCanEditSchedules] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Caretaker name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Temporary password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCaretaker({
        patientId,
        name: name.trim(),
        email: email.trim(),
        tempPassword: password,
        canEditSchedules,
      });

      onSuccess(name.trim());
      setName('');
      setEmail('');
      setPassword('');
      setCanEditSchedules(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create caretaker account.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Authorized Caretaker">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[15px] text-[#524E48]">
          The caretaker will be granted secure access to view and confirm medications and appointments for this patient only.
        </p>

        <Input
          id="caretaker-name"
          label="Caretaker Full Name"
          placeholder="e.g. Marcus Wright"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          id="caretaker-email"
          label="Email Address"
          type="email"
          placeholder="caretaker@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="caretaker-password"
          label="Temporary Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="The caretaker will use this to sign in on their own device."
          required
        />

        <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] border border-[#D6D1C7] rounded-lg">
          <input
            id="can-edit-schedules"
            type="checkbox"
            checked={canEditSchedules}
            onChange={(e) => setCanEditSchedules(e.target.checked)}
            className="w-5 h-5 accent-[#0F5C5C] rounded cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A83B24]"
          />
          <label htmlFor="can-edit-schedules" className="text-[15px] font-bold text-[#232323] cursor-pointer">
            Allow caretaker to adjust scheduled dose times
          </label>
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
            loadingText="Assigning caretaker..."
          >
            Create Caretaker
          </Button>
        </div>
      </form>
    </Modal>
  );
};

