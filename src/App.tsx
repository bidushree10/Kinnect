import React, { useState } from 'react';
import { SkipLink } from './components/common/SkipLink';
import { Navbar } from './components/common/Navbar';
import { Logo } from './components/common/Logo';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { Badge } from './components/common/Badge';
import { Modal } from './components/common/Modal';
import { Toast, ToastMessage } from './components/common/Toast';
import { generatePatientId } from './lib/idGenerator';
import {
  Pill,
  CalendarCheck,
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  Lock,
  Check,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<'assisted' | 'independent'>('assisted');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientId, setPatientId] = useState(() => generatePatientId());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSimulatingConfirmation, setIsSimulatingConfirmation] = useState(false);
  const [isDoseConfirmed, setIsDoseConfirmed] = useState(false);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleSimulateConfirm = () => {
    setIsSimulatingConfirmation(true);
    setTimeout(() => {
      setIsSimulatingConfirmation(false);
      setIsDoseConfirmed(true);
      addToast(
        'success',
        currentMode === 'assisted'
          ? 'Confirmed by Caretaker. Family notified.'
          : 'Dose marked as Taken. Care record updated.'
      );
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#232323] flex flex-col font-body">
      <SkipLink />

      <Navbar
        currentMode={currentMode}
        userEmail="family@kinnect.local"
        userRole="Family Controller"
      />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Phase 1 Banner */}
        <section aria-labelledby="phase1-heading" className="mb-8">
          <div className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[14px] font-bold text-[#A83B24] tracking-wider uppercase">
                  Phase 1 Scaffold &amp; Design System
                </span>
                <h1 id="phase1-heading" className="text-3xl sm:text-4xl font-bold font-heading text-[#232323] mt-1">
                  Kinnect Design System Showcase
                </h1>
                <p className="text-[18px] text-[#524E48] mt-2 max-w-3xl">
                  Built to elderly-accessible standards on a warm ivory canvas (#FAF7F0) with zero-glare,
                  56px touch targets on patient controls, high-contrast outlines, and strict two-font typography.
                </p>
              </div>

              {/* Mode Toggle Switch */}
              <div className="flex flex-col items-start sm:items-end gap-2 bg-[#FAF7F0] p-4 rounded-lg border border-[#D6D1C7] shrink-0">
                <span className="text-[14px] font-bold text-[#524E48]">Active Patient Access Mode:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={currentMode === 'assisted' ? 'primary' : 'secondary'}
                    size="default"
                    onClick={() => {
                      setCurrentMode('assisted');
                      addToast('info', 'Switched mode to Assisted Care.');
                    }}
                    leftIcon={<HeartHandshake className="w-4 h-4" strokeWidth={2.25} />}
                  >
                    Assisted Care
                  </Button>
                  <Button
                    variant={currentMode === 'independent' ? 'primary' : 'secondary'}
                    size="default"
                    onClick={() => {
                      setCurrentMode('independent');
                      addToast('info', 'Switched mode to Independent Patient.');
                    }}
                    leftIcon={<UserCheck className="w-4 h-4" strokeWidth={2.25} />}
                  >
                    Independent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Column Responsive Section: Palette, Typography & Icons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Palette Card */}
          <section
            aria-labelledby="palette-heading"
            className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h2 id="palette-heading" className="text-xl font-bold font-heading mb-4 text-[#232323]">
                Calibrated Colour Palette (UI Spec v2)
              </h2>
              <div className="space-y-2 text-[15px]">
                <div className="flex items-center justify-between p-2 rounded bg-[#FAF7F0] border border-[#D6D1C7]">
                  <span className="font-bold">Canvas (Warm Ivory)</span>
                  <span className="font-body font-bold text-[#524E48]">#FAF7F0</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#F3EFE6] border border-[#D6D1C7]">
                  <span className="font-bold">Surface (Soft Alabaster)</span>
                  <span className="font-body font-bold text-[#524E48]">#F3EFE6</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#0F5C5C] text-white">
                  <span className="font-bold">Primary (Forest Teal)</span>
                  <span className="font-body font-bold">#0F5C5C</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#A83B24] text-white">
                  <span className="font-bold">Link/Secondary (Deep Terracotta)</span>
                  <span className="font-body font-bold">#A83B24</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#C84B31] text-white">
                  <span className="font-bold">Coral Accent (Graphics Only)</span>
                  <span className="font-body font-bold">#C84B31</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#E3EFEF] text-[#0A4242] border border-[#0F5C5C]">
                  <span className="font-bold">Success Tint (AAA)</span>
                  <span className="font-body font-bold">#0A4242</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#FEF3C7] text-[#78350F] border-l-4 border-[#D97706]">
                  <span className="font-bold">Pending Amber (AAA)</span>
                  <span className="font-body font-bold">#78350F</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#FEE2E2] text-[#B91C1C] border border-[#B91C1C]">
                  <span className="font-bold">Alert Red (Error)</span>
                  <span className="font-body font-bold">#B91C1C</span>
                </div>
              </div>
            </div>
            <p className="text-[13px] text-[#524E48] mt-4">
              All text passes WCAG AA (&gt;4.5:1) and AAA (&gt;7:1). #C84B31 is reserved strictly for graphics.
            </p>
          </section>

          {/* Typography Card */}
          <section
            aria-labelledby="type-heading"
            className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h2 id="type-heading" className="text-xl font-bold font-heading mb-4 text-[#232323]">
                Strict Two-Font System
              </h2>
              <div className="space-y-4">
                <div className="p-3 bg-white rounded-lg border border-[#D6D1C7]">
                  <span className="text-[12px] font-bold text-[#A83B24] uppercase">Headings</span>
                  <p className="font-heading font-bold text-2xl text-[#232323]">
                    Plus Jakarta Sans 700
                  </p>
                  <p className="font-heading font-semibold text-lg text-[#524E48]">
                    Plus Jakarta Sans 600 (Card Titles)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#D6D1C7]">
                  <span className="text-[12px] font-bold text-[#A83B24] uppercase">Body, UI &amp; Data</span>
                  <p className="font-body text-[18px] text-[#232323]">
                    Atkinson Hyperlegible (Regular 400)
                  </p>
                  <p className="font-body font-bold text-[18px] text-[#232323] mt-1">
                    Atkinson Hyperlegible (Bold 700)
                  </p>
                  <div className="mt-2 text-[14px] text-[#524E48] bg-[#FAF7F0] p-2 rounded border border-[#D6D1C7]">
                    <strong>Character Legibility Check:</strong>
                    <div className="font-body text-[16px] text-[#0F5C5C] font-bold tracking-[+0.01em] mt-0.5">
                      1 vs I vs l &bull; 0 vs O &bull; 500mg daily
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#D6D1C7]">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#A83B24] uppercase">Patient ID Generator</span>
                    <Button
                      variant="ghost"
                      size="default"
                      className="p-1 min-h-0 text-[14px] text-[#0F5C5C] font-bold"
                      onClick={() => setPatientId(generatePatientId())}
                    >
                      Regenerate
                    </Button>
                  </div>
                  <p className="font-body font-bold text-xl text-[#0F5C5C] tracking-[+0.01em] mt-1">
                    {patientId}
                  </p>
                  <span className="text-[12px] text-[#524E48]">Format: KIN-XXXX-XXXX (excludes 0, O, 1, I, L)</span>
                </div>
              </div>
            </div>
            <p className="text-[13px] text-[#524E48] mt-4">
              Loaded via Google Fonts with preconnect &amp; font-display: swap.
            </p>
          </section>

          {/* Icons & Visual Marks Card */}
          <section
            aria-labelledby="icons-heading"
            className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h2 id="icons-heading" className="text-xl font-bold font-heading mb-4 text-[#232323]">
                SVG Graphics &amp; Lucide Icons
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[#D6D1C7]">
                  <Logo size={44} />
                  <div>
                    <span className="font-heading font-bold text-[18px]">Kinnect Brand Mark</span>
                    <p className="text-[14px] text-[#524E48]">
                      Inline SVG: Forest Teal arch + Coral heart loop.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[15px]">
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded border border-[#D6D1C7]">
                    <Pill className="w-5 h-5 text-[#0F5C5C]" strokeWidth={2.25} />
                    <span>Pill (Meds)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded border border-[#D6D1C7]">
                    <CalendarCheck className="w-5 h-5 text-[#0F5C5C]" strokeWidth={2.25} />
                    <span>Appointments</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded border border-[#D6D1C7]">
                    <ShieldCheck className="w-5 h-5 text-[#0F5C5C]" strokeWidth={2.25} />
                    <span>Audit Log</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded border border-[#D6D1C7]">
                    <Lock className="w-5 h-5 text-[#524E48]" strokeWidth={2.25} />
                    <span>Locked Field</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#D6D1C7]">
                  <span className="text-[12px] font-bold text-[#A83B24] uppercase">Status Badges</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="pending">Unconfirmed</Badge>
                    <Badge variant="success">Taken (08:04 AM)</Badge>
                    <Badge variant="neutral">Active Roster</Badge>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[13px] text-[#524E48] mt-4">
              All icons rendered at strokeWidth={2.25} with aria-hidden="true".
            </p>
          </section>
        </div>

        {/* Interactive Components Section: Buttons, Forms, Modals & Toast announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Buttons & Touch Targets Showcase */}
          <section
            aria-labelledby="buttons-heading"
            className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6"
          >
            <h2 id="buttons-heading" className="text-xl font-bold font-heading mb-4 text-[#232323]">
              Buttons &amp; High-Contrast Touch Targets
            </h2>
            <div className="space-y-4">
              {/* Patient View Button Target (56px) */}
              <div className="p-4 bg-white rounded-lg border border-[#D6D1C7]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#0F5C5C]">
                    /patient View Touch Target (min-h-[56px], full-width)
                  </span>
                  {isDoseConfirmed && (
                    <Button
                      variant="ghost"
                      size="default"
                      className="p-1 min-h-0 text-[14px] text-[#A83B24] underline"
                      onClick={() => setIsDoseConfirmed(false)}
                    >
                      Reset demo button
                    </Button>
                  )}
                </div>

                {isDoseConfirmed ? (
                  <div
                    role="status"
                    className="w-full min-h-[56px] px-6 py-3.5 bg-[#E3EFEF] text-[#0A4242] border border-[#0F5C5C]/40 rounded-lg font-bold flex items-center justify-center gap-2 text-[20px]"
                  >
                    <Check className="w-6 h-6 text-[#0A4242]" strokeWidth={3} aria-hidden="true" />
                    <span>Taken, confirmed by Caretaker Sarah at 08:04 AM</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="patient"
                    fullWidth
                    isLoading={isSimulatingConfirmation}
                    loadingText="Recording..."
                    onClick={handleSimulateConfirm}
                    leftIcon={<Check className="w-6 h-6" strokeWidth={2.5} />}
                  >
                    Mark as Taken
                  </Button>
                )}
                <p className="text-[13px] text-[#524E48] mt-2">
                  Once confirmed, the button transitions to a non-interactive badge to eliminate accidental double-taps.
                </p>
              </div>

              {/* Standard Dashboard & Secondary Buttons (48px) */}
              <div className="p-4 bg-white rounded-lg border border-[#D6D1C7]">
                <span className="text-[14px] font-bold text-[#524E48] block mb-2">
                  Command Center / Dashboard Actions (min-h-[48px])
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => addToast('success', 'Prescription saved successfully.')}
                  >
                    Save Medication
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Open Accessible Modal
                  </Button>
                  <Button
                    variant="link"
                    onClick={() => addToast('error', 'Authentication failed. Please check credentials.')}
                  >
                    Trigger Error Alert
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Form Inputs & Locked Fields Showcase */}
          <section
            aria-labelledby="forms-heading"
            className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6"
          >
            <h2 id="forms-heading" className="text-xl font-bold font-heading mb-4 text-[#232323]">
              Accessible Inputs &amp; Medical Safety Lock
            </h2>
            <div className="space-y-4">
              {/* Standard Active Input */}
              <Input
                id="demo-med-time"
                label="Scheduled Dose Time (Editable)"
                defaultValue="08:00"
                helperText="24-hour format (e.g. 08:00 for morning dose)."
              />

              {/* Locked Prescription Field */}
              <Input
                id="demo-locked-strength"
                label="Prescribed Strength (Clinical Locked Field)"
                defaultValue="500mg"
                isLocked
              />

              {/* Input with Error State */}
              <Input
                id="demo-error-field"
                label="Caretaker Email Address"
                defaultValue="invalid-email-format"
                error="Please enter a valid email address."
              />
            </div>
          </section>
        </div>

        {/* Accessible Modal Component */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Assign New Caretaker"
        >
          <div className="space-y-4">
            <p className="text-[16px] text-[#524E48]">
              Family members can create caretaker logins without being signed out. Caretaker access is restricted
              strictly to this patient.
            </p>
            <Input
              id="modal-caretaker-name"
              label="Caretaker Full Name"
              placeholder="e.g., Sarah Jenkins"
            />
            <Input
              id="modal-caretaker-email"
              label="Caretaker Email"
              type="email"
              placeholder="sarah@example.com"
            />
            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsModalOpen(false);
                  addToast('success', 'Caretaker card added, family notified.');
                }}
              >
                Assign Caretaker
              </Button>
            </div>
          </div>
        </Modal>

        {/* Live Floating Toast Announcement Area */}
        <div
          role="region"
          aria-label="Live announcements"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto"
        >
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
            />
          ))}
        </div>
      </main>

      <footer className="w-full bg-[#F3EFE6] border-t border-[#D6D1C7] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[14px] text-[#524E48]">
          <p>Kinnect MVP &bull; Continuity of elderly care, whether they use a smartphone or not.</p>
        </div>
      </footer>
    </div>
  );
};
