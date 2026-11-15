import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Logo } from '../components/common/Logo';
import {
  seedDemoEnvironment,
  loginAsDemoRole,
  DEMO_CREDENTIALS,
} from '../services/demoService';
import {
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface GatewayViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const GatewayView: React.FC<GatewayViewProps> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { signIn, signUpFamily } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  // Quick-switch 1-click demo login
  const handleDemoLogin = async (role: 'family' | 'caretaker' | 'patient') => {
    setIsSeedingDemo(true);
    setFormError('');
    try {
      // Ensure demo records are seeded idempotently
      await seedDemoEnvironment();
      await loginAsDemoRole(role);
      onShowToast('success', `Signed in as Demo ${role === 'family' ? 'Family Controller' : role === 'caretaker' ? 'Caretaker' : 'Patient'}.`);
      if (role === 'patient') {
        navigate('/patient');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo seed failed. Check connection.';
      setFormError(msg);
      onShowToast('error', msg);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Standard email/password submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (authMode === 'signup') {
        if (!fullName.trim()) throw new Error('Full name is required.');
        const profile = await signUpFamily({
          name: fullName,
          email,
          password,
        });
        onShowToast('success', `Family account created for ${profile.displayName}.`);
        navigate('/dashboard');
      } else {
        const profile = await signIn(email, password);
        onShowToast('success', `Welcome back, ${profile.displayName}.`);
        if (profile.role === 'patient') {
          navigate('/patient');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      setFormError(msg);
      onShowToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#232323] flex flex-col font-body">
      {/* Top Banner / Navigation */}
      <header className="w-full bg-[#FAF7F0] border-b border-[#D6D1C7] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-[22px] tracking-tight text-[#232323] leading-none">
                Kinnect
              </span>
              <span className="text-[12px] text-[#524E48] font-medium hidden sm:inline">
                Continuity of elderly care
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="default"
              isLoading={isSeedingDemo}
              loadingText="Loading demo workspace..."
              onClick={() => handleDemoLogin('family')}
              leftIcon={<Sparkles className="w-4 h-4 text-[#0F5C5C]" />}
            >
              Load Sample Data
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge variant="assisted">
              Assisted Care Mode Enabled
            </Badge>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-5xl text-[#232323] tracking-tight leading-tight">
            Continuity of elderly care, whether they use a smartphone or not.
          </h1>
          <p className="text-[18px] sm:text-[20px] text-[#524E48] mt-4 leading-relaxed">
            A centralized, role-based platform coordinating medication schedules, medical appointments, and accountable care confirmation between families, elderly patients, and authorized caretakers.
          </p>
        </div>

        {/* Demo Gateway Cards Section */}
        <section aria-labelledby="demo-roles-heading" className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 id="demo-roles-heading" className="font-heading font-bold text-xl sm:text-2xl text-[#232323]">
              Quick-Switch Demo Access (1-Click Login)
            </h2>
            <span className="text-[14px] text-[#524E48] font-medium hidden sm:inline">
              Pre-populated test accounts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Family Member */}
            <div className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-[#0F5C5C]/50 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[#E3EFEF] border border-[#0F5C5C]/30 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-[#0F5C5C]" strokeWidth={2.25} aria-hidden="true" />
                </div>
                <h3 className="font-heading font-bold text-xl text-[#232323] mb-1">
                  Family Controller
                </h3>
                <span className="text-[13px] font-bold text-[#A83B24] uppercase tracking-wider block mb-2">
                  Primary Administrator
                </span>
                <p className="text-[16px] text-[#524E48] mb-4">
                  Full control: create patient profiles, prescribe medications, assign caretakers, and view the immutable audit trail.
                </p>
                <div className="text-[13px] text-[#524E48] bg-[#FAF7F0] p-2 rounded border border-[#D6D1C7] mb-6">
                  Account: <strong>{DEMO_CREDENTIALS.family.email}</strong>
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                isLoading={isSeedingDemo}
                onClick={() => handleDemoLogin('family')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Sign In as Family
              </Button>
            </div>

            {/* Card 2: Authorized Caretaker */}
            <div className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-[#0F5C5C]/50 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[#E3EFEF] border border-[#0F5C5C]/30 flex items-center justify-center mb-4">
                  <HeartHandshake className="w-6 h-6 text-[#0F5C5C]" strokeWidth={2.25} aria-hidden="true" />
                </div>
                <h3 className="font-heading font-bold text-xl text-[#232323] mb-1">
                  Authorized Caretaker
                </h3>
                <span className="text-[13px] font-bold text-[#A83B24] uppercase tracking-wider block mb-2">
                  Assisted Care Helper
                </span>
                <p className="text-[16px] text-[#524E48] mb-4">
                  Scoped access: check off administered medications, record appointment attendance, and notify the family in real time.
                </p>
                <div className="text-[13px] text-[#524E48] bg-[#FAF7F0] p-2 rounded border border-[#D6D1C7] mb-6">
                  Account: <strong>{DEMO_CREDENTIALS.caretaker.email}</strong>
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                isLoading={isSeedingDemo}
                onClick={() => handleDemoLogin('caretaker')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Sign In as Caretaker
              </Button>
            </div>

            {/* Card 3: Independent Patient */}
            <div className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-[#0F5C5C]/50 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[#E3EFEF] border border-[#0F5C5C]/30 flex items-center justify-center mb-4">
                  <UserCheck className="w-6 h-6 text-[#0F5C5C]" strokeWidth={2.25} aria-hidden="true" />
                </div>
                <h3 className="font-heading font-bold text-xl text-[#232323] mb-1">
                  Independent Patient
                </h3>
                <span className="text-[13px] font-bold text-[#A83B24] uppercase tracking-wider block mb-2">
                  Smartphone User
                </span>
                <p className="text-[16px] text-[#524E48] mb-4">
                  Simplified interface: extra-large 56px touch targets, zero clutter, high contrast, and one-tap "Mark as Taken".
                </p>
                <div className="text-[13px] text-[#524E48] bg-[#FAF7F0] p-2 rounded border border-[#D6D1C7] mb-6">
                  Account: <strong>{DEMO_CREDENTIALS.patient.email}</strong>
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                isLoading={isSeedingDemo}
                onClick={() => handleDemoLogin('patient')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Sign In as Patient
              </Button>
            </div>
          </div>
        </section>

        {/* Authentication Form Section (Sign In or Create Family Account) */}
        <section aria-labelledby="auth-form-heading" className="max-w-md mx-auto">
          <div className="bg-[#F3EFE6] border-[1.5px] border-[#D6D1C7] rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="text-center mb-6">
              <h2 id="auth-form-heading" className="font-heading font-bold text-2xl text-[#232323]">
                {authMode === 'signin' ? 'Sign In to Kinnect' : 'Create Family Account'}
              </h2>
              <p className="text-[15px] text-[#524E48] mt-1">
                {authMode === 'signin'
                  ? 'Access your care circle with your email and password'
                  : 'Register as primary coordinator for your family member'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <Input
                  id="auth-name"
                  label="Your Full Name"
                  placeholder="e.g. Sarah Connor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              )}

              <Input
                id="auth-email"
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="auth-password"
                label="Password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-[#FEE2E2] border border-[#B91C1C] rounded-lg text-[15px] font-bold text-[#B91C1C]"
                >
                  Error: {formError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
                loadingText={authMode === 'signup' ? 'Creating account...' : 'Signing in...'}
              >
                {authMode === 'signup' ? 'Create Family Account' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#D6D1C7] text-center">
              {authMode === 'signin' ? (
                <p className="text-[15px] text-[#524E48]">
                  New family coordinator?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setFormError('');
                    }}
                    className="text-[#A83B24] font-bold underline hover:text-[#8A2F1B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A83B24] rounded px-1"
                  >
                    Create a family account
                  </button>
                </p>
              ) : (
                <p className="text-[15px] text-[#524E48]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setFormError('');
                    }}
                    className="text-[#A83B24] font-bold underline hover:text-[#8A2F1B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A83B24] rounded px-1"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-[#F3EFE6] border-t border-[#D6D1C7] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[14px] text-[#524E48] space-y-1">
          <p className="font-bold text-[#232323]">Kinnect Elderly Healthcare Management MVP</p>
          <p>Built with React, Cloud Firestore, Firebase Authentication, and Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
};

