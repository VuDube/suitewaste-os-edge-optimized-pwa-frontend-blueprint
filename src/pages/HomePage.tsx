import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Briefcase,
  CreditCard,
  ShieldCheck,
  BookOpen,
  Bot,
  Settings,
  LogOut,
  Loader,
  WifiOff,
  CheckCircle,
  XCircle,
  ArrowRight,
  Menu,
  Clock,
  Battery,
  Signal,
  Trash2,
  Lock,
  Mail,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { db, type User } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { SuiteIcon } from '@/components/ui/SuiteIcon';
import { useFlowState } from '@/hooks/use-flow-state';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
// --- Constants and Types ---
const BIO_GREEN = '#2E7D32';
const OLED_BLACK = '#0f0f0f';
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type SuiteKey = 'operations' | 'payments' | 'compliance' | 'training' | 'ai';
const SUITES: { key: SuiteKey; label: string; icon: React.ElementType; permissions: string[] }[] = [
  { key: 'operations', label: 'Routes & Tasks', icon: Briefcase, permissions: ['operations'] },
  { key: 'payments', label: 'Finance Center', icon: CreditCard, permissions: ['payments'] },
  { key: 'compliance', label: 'Compliance Reports', icon: ShieldCheck, permissions: ['compliance'] },
  { key: 'training', label: 'Training Hub', icon: BookOpen, permissions: ['training'] },
  { key: 'ai', label: 'AI Assist', icon: Bot, permissions: ['ai'] },
];
// --- Main App Component ---
export function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSuite, setActiveSuite] = useState<SuiteKey | null>(null);
  const checkSession = useCallback(async () => {
    try {
      await db.seedIfEmpty();
      const user = await db.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Session check failed:", error);
      toast.error("Failed to initialize session.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => console.log('SW registered: ', registration))
          .catch(registrationError => console.log('SW registration failed: ', registrationError));
      });
    }
    checkSession();
  }, [checkSession]);
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveSuite(null);
  };
  const handleLogout = async () => {
    await db.signOut();
    setCurrentUser(null);
    setActiveSuite(null);
    toast.success("You have been logged out.");
  };
  if (isLoading) {
    return <LoadingScreen />;
  }
  return (
    <div className="bg-black text-white min-h-screen font-sans antialiased">
      <AnimatePresence mode="wait">
        {currentUser ? (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuiteWasteOS user={currentUser} onLogout={handleLogout} activeSuite={activeSuite} setActiveSuite={setActiveSuite} />
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster theme="dark" richColors position="top-center" />
    </div>
  );
}
// --- Loading Screen ---
const LoadingScreen = () => (
  <div style={{ backgroundColor: OLED_BLACK }} className="w-full h-screen flex flex-col items-center justify-center gap-4">
    <img src="https://i.imgur.com/Jt5g2S6.png" alt="SuiteWaste Logo" className="w-24 h-24 animate-pulse" />
    <Loader className="text-white/80 animate-spin" />
    <p className="text-white/60">Initializing SuiteWaste OS...</p>
  </div>
);
// --- Login Screen ---
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    try {
      const user = await db.signIn(values.email, values.password);
      if (user) {
        toast.success(`Welcome back, ${user.role}!`);
        onLoginSuccess(user);
      } else {
        toast.error("Invalid email or password.");
        form.setError("email", { type: "manual", message: " " });
        form.setError("password", { type: "manual", message: "Invalid credentials" });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div
      style={{ background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 50%, #0D47A1 100%)' }}
      className="min-h-screen flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <img src="https://i.imgur.com/Jt5g2S6.png" alt="SuiteWaste Logo" className="w-32 h-32 mx-auto mb-4 shadow-glow" />
          <h1 className="text-4xl font-bold text-white">SuiteWaste OS</h1>
          <p className="text-lg text-gray-300">Industrial Waste Management</p>
        </div>
        <div className="bg-green-900/10 backdrop-blur-xl border border-green-500/20 rounded-2xl p-8 shadow-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200 uppercase text-xs font-bold">Work Email</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-3 w-5 h-5 text-green-300" />
                        <Input
                          type="email"
                          placeholder="admin@suitewaste.os"
                          className="bg-green-900/20 border border-green-500/30 text-white placeholder:text-gray-400 rounded-xl pl-10 pr-4 py-3 h-12"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200 uppercase text-xs font-bold">Password</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 w-5 h-5 text-green-300" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="bg-green-900/20 border border-green-500/30 text-white placeholder:text-gray-400 rounded-xl pl-10 pr-4 py-3 h-12"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" className="border-white data-[state=checked]:bg-white data-[state=checked]:text-green-900" />
                  <label htmlFor="remember-me" className="text-gray-200">Remember me</label>
                </div>
                <a href="#" className="text-green-200 underline hover:text-white">Reset password?</a>
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-green-900 font-bold py-4 h-14 text-base rounded-xl transition-all duration-300 hover:scale-105 active:scale-100 flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader className="animate-spin" /> : (
                  <>
                    Sign In to System
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};
// --- Main OS Interface ---
const SuiteWasteOS = ({ user, onLogout, activeSuite, setActiveSuite }: { user: User; onLogout: () => void; activeSuite: SuiteKey | null; setActiveSuite: (suite: SuiteKey | null) => void; }) => {
  const { isSwitcherOpen, openSwitcher, closeSwitcher, bindSuiteGesture } = useFlowState();
  const availableSuites = useMemo(() =>
    SUITES.filter(suite => suite.permissions.some(p => user.permissions.includes(p))),
    [user.permissions]
  );
  const handleSuiteSelect = (suite: SuiteKey) => {
    setActiveSuite(suite);
    closeSwitcher();
  };
  return (
    <FlowStateLayout>
      <StatusBar />
      <div className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8" {...bindSuiteGesture()}>
        <AnimatePresence mode="wait">
          {activeSuite ? (
            <motion.div
              key={activeSuite}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DashboardView suiteKey={activeSuite} onBack={() => setActiveSuite(null)} />
            </motion.div>
          ) : (
            <motion.div
              key="homescreen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Homescreen availableSuites={availableSuites} onSuiteSelect={handleSuiteSelect} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Dock onSwitcherOpen={openSwitcher} onLogout={onLogout} />
      <SuiteSwitcher
        isOpen={isSwitcherOpen}
        onClose={closeSwitcher}
        availableSuites={availableSuites}
        onSuiteSelect={handleSuiteSelect}
      />
    </FlowStateLayout>
  );
};
const FlowStateLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-2xl mx-auto h-screen flex flex-col bg-black rounded-lg shadow-2xl overflow-hidden border border-white/10">
    {children}
  </div>
);
const StatusBar = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="w-full px-4 py-1 flex justify-between items-center text-xs font-medium text-neutral-300 bg-black/50">
      <div>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="flex items-center gap-2">
        <Signal size={14} />
        <WifiOff size={14} />
        <span className="flex items-center gap-1">100% <Battery size={14} /></span>
      </div>
    </div>
  );
};
const Homescreen = ({ availableSuites, onSuiteSelect }: { availableSuites: typeof SUITES; onSuiteSelect: (key: SuiteKey) => void; }) => (
  <div className="py-12">
    <h2 className="text-3xl font-bold text-center mb-12 text-white">Welcome, {availableSuites.length > 3 ? "Manager" : "Operator"}</h2>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-8 gap-x-4 justify-items-center">
      {availableSuites.map(suite => (
        <SuiteIcon key={suite.key} icon={suite.icon} label={suite.label} onClick={() => onSuiteSelect(suite.key)} />
      ))}
    </div>
  </div>
);
const Dock = ({ onSwitcherOpen, onLogout }: { onSwitcherOpen: () => void; onLogout: () => void; }) => (
  <div className="w-full p-2">
    <div className="bg-white/5 border border-white/10 backdrop-blur-lg rounded-full flex justify-around items-center h-16">
      <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white" onClick={onSwitcherOpen}><Menu /></Button>
      <SettingsSheet onLogout={onLogout} />
    </div>
  </div>
);
const SuiteSwitcher = ({ isOpen, onClose, availableSuites, onSuiteSelect }: { isOpen: boolean; onClose: () => void; availableSuites: typeof SUITES; onSuiteSelect: (key: SuiteKey) => void; }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-md p-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center items-center gap-4">
            {availableSuites.map((suite, index) => (
              <motion.div
                key={suite.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
              >
                <SuiteIcon
                  icon={suite.icon}
                  label={suite.label}
                  onClick={() => onSuiteSelect(suite.key)}
                  className="w-24 h-24 md:w-28 md:h-28"
                  iconClassName="w-12 h-12 md:w-14 md:h-14"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
const DashboardView = ({ suiteKey, onBack }: { suiteKey: SuiteKey; onBack: () => void; }) => {
  const suite = SUITES.find(s => s.key === suiteKey);
  if (!suite) return <div>Suite not found</div>;
  const renderContent = () => {
    switch (suiteKey) {
      case 'operations': return <p>Routes & Tasks dashboard content goes here. View your daily routes, manage tasks, and log e-waste.</p>;
      case 'payments': return <p>Finance Center dashboard content. Review payments, generate invoices, and track financial performance.</p>;
      case 'compliance': return <p>Compliance Reports dashboard. Access audit logs, view compliance status, and generate reports.</p>;
      case 'training': return <p>Training Hub content. Complete modules, track progress, and access training materials.</p>;
      case 'ai': return <p>AI Assist dashboard. Get insights, ask questions, and leverage AI for operational efficiency.</p>;
      default: return <p>Dashboard coming soon.</p>;
    }
  };
  return (
    <Card className="bg-transparent border-none text-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <suite.icon className="w-8 h-8" style={{ color: BIO_GREEN }} />
          <CardTitle className="text-2xl font-bold">{suite.label}</CardTitle>
        </div>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </CardHeader>
      <CardContent className="text-neutral-300">
        {renderContent()}
      </CardContent>
    </Card>
  );
};
const SettingsSheet = ({ onLogout }: { onLogout: () => void }) => {
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_PROGRESS') {
        setSyncProgress(event.data.progress);
      } else if (event.data.type === 'SYNC_COMPLETE') {
        setSyncProgress(100);
        setTimeout(() => {
            setIsSyncing(false);
            toast.success("Manual sync completed successfully.");
        }, 500);
      }
    };
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    return () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', handleMessage);
        }
    };
  }, []);
  const handleManualSync = () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      toast.error("Service Worker not available for sync.");
      return;
    }
    setIsSyncing(true);
    setSyncProgress(0);
    navigator.serviceWorker.controller.postMessage({ type: 'MANUAL_SYNC' });
  };
  const clearDatabase = async () => {
    try {
        await db.delete();
        await db.open(); // Re-open the database
        toast.success("Database cleared. Please refresh the application.");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        toast.error("Failed to clear database.");
    }
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white"><Settings /></Button>
      </SheetTrigger>
      <SheetContent className="bg-neutral-900 border-l-neutral-800 text-white">
        <SheetHeader>
          <SheetTitle className="text-white">Settings</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Manual Sync</h3>
            <p className="text-sm text-neutral-400">
              Force sync local data with the network. Use this if you have connection issues.
            </p>
            <Button onClick={handleManualSync} disabled={isSyncing} className="w-full" style={{ backgroundColor: BIO_GREEN }}>
              {isSyncing ? 'Syncing...' : 'Start Manual Sync'}
            </Button>
            {isSyncing && <Progress value={syncProgress} className="mt-2" />}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <Button variant="destructive" className="w-full" onClick={clearDatabase}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Local Database
            </Button>
          </div>
          <Button variant="outline" className="w-full border-neutral-700 hover:bg-neutral-800" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
        <footer className="absolute bottom-4 left-4 right-4 text-center text-xs text-neutral-500">
            Built with ❤️ at Cloudflare
        </footer>
      </SheetContent>
    </Sheet>
  );
};