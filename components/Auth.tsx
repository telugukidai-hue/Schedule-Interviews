
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
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); 
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
            setError("Identifier already registered.");
            setIsLoading(false);
          }
        } else {
          if (!name || !phone) {
            setError("All fields required");
            setIsLoading(false);
            return;
          }
          const success = await onLogin(name, phone, Role.STUDENT);
          if (!success) {
            setError("Invalid credentials.");
            setIsLoading(false);
          }
        }
      } else {
        const successAdmin = await onLogin(name, password, Role.ADMIN);
        if (successAdmin) return;
        
        const successInt = await onLogin(name, password, Role.INTERVIEWER);
        if (successInt) return;

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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {mode === 'student' ? 'Student Access' : 'Staff Access'}
          </h2>
          <p className="text-blue-100 mt-2 font-medium">
            {mode === 'student' 
              ? (isRegistering ? "Register your account" : "Sign in to schedule") 
              : "Administrative secure login"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-bold border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Display Name / Login</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  autoComplete="username"
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-black font-bold placeholder:text-slate-400"
                  placeholder="Enter name"
                />
              </div>
            </div>

            {mode === 'student' ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Unique Identifier / Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-black font-bold placeholder:text-slate-400"
                    placeholder="Enter phone or ID"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-black font-bold placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full justify-center font-black py-4 text-lg rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95" isLoading={isLoading}>
            {mode === 'student' && isRegistering ? 'Register' : 'Sign In'}
            <LogIn className="w-5 h-5 ml-2" />
          </Button>

          {mode === 'student' && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-sm text-blue-600 hover:text-blue-700 font-black hover:underline underline-offset-4"
              >
                {isRegistering ? "Already registered? Sign In" : "New member? Join here"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
