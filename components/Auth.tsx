
import React, { useState } from 'react';
import { Role } from '../types';
import { Button } from './Button';
import { Lock, User, Phone, LogIn } from 'lucide-react';

interface AuthProps {
  mode: 'student' | 'admin';
  onLogin: (identifier: string, pass: string, role: Role) => boolean | Promise<boolean>;
  onRegister: (name: string, phone: string) => boolean | Promise<boolean>;
}

export const Auth: React.FC<AuthProps> = ({ mode, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // Used as ID/Password for student
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'student') {
        if (isRegistering) {
          if (!name || !phone) {
            setError("All fields required");
            setIsLoading(false);
            return;
          }
          const success = await onRegister(name, phone);
          if (!success) {
            setError("Phone number already registered.");
            setIsLoading(false);
          }
          // If success, parent component usually updates state/unmounts this, 
          // but we unset loading just in case.
        } else {
          if (!name || !phone) {
            setError("All fields required");
            setIsLoading(false);
            return;
          }
          const success = await onLogin(name, phone, Role.STUDENT);
          if (!success) {
            setError("Invalid Name or Phone");
            setIsLoading(false);
          }
        }
      } else {
        // Admin / Interviewer Login
        const successAdmin = await onLogin(name, password, Role.ADMIN);
        if (successAdmin) {
           return;
        }
        
        const successInt = await onLogin(name, password, Role.INTERVIEWER);
        if (successInt) {
           return;
        }

        setError("Invalid Credentials");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {mode === 'student' ? 'Student Portal' : 'Staff Access'}
          </h2>
          <p className="text-blue-100 mt-2">
            {mode === 'student' 
              ? (isRegistering ? "Create your profile to get started" : "Welcome back, candidate") 
              : "Secure login for Admins & Interviewers"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username / Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            {mode === 'student' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full justify-center" isLoading={isLoading}>
            {mode === 'student' && isRegistering ? 'Register Now' : 'Sign In'}
            <LogIn className="w-4 h-4 ml-2" />
          </Button>

          {mode === 'student' && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                {isRegistering ? "Already have an account? Login" : "New candidate? Register here"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
