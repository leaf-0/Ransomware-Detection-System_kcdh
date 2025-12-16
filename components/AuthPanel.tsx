'use client';

import { useState } from 'react';

interface AuthPanelProps {
  isSignIn: boolean;
  setIsSignIn: (value: boolean) => void;
  onLogin: (email: string, password: string) => void;
  onRegister: (userData: any) => void;
  error: string;
}

export function AuthPanel({ isSignIn, setIsSignIn, onLogin, onRegister, error }: AuthPanelProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    confirmPassword: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignIn) {
      onLogin(formData.email, formData.password);
    } else {
      if (formData.password !== formData.confirmPassword) {
        return;
      }
      onRegister(formData);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[#9aa3b2]">
            {isSignIn ? 'Welcome back' : 'Create account'}
          </div>
          <div className="text-lg font-semibold">Authentication</div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setIsSignIn((v) => !v)}
        >
          {isSignIn ? 'Switch to Sign up' : 'Switch to Sign in'}
        </button>
      </div>
      
      {error && (
        <div className="mt-3 p-2 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
        {!isSignIn && (
          <div className="grid grid-cols-2 gap-3">
            <input 
              className="input" 
              placeholder="First name"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
            <input 
              className="input" 
              placeholder="Last name"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>
        )}
        <input 
          className="input" 
          placeholder="Email" 
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        <input 
          className="input" 
          placeholder="Password" 
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
        {!isSignIn && (
          <input 
            className="input" 
            placeholder="Confirm password" 
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[#9aa3b2]">
            <input type="checkbox" className="accent-[#60a5fa]" />
            Remember me
          </label>
          <button className="text-sm text-[#60a5fa] hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button type="submit" className="btn btn-primary flex-1">
            {isSignIn ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="btn btn-secondary flex-1">
            Continue with SSO
          </button>
        </div>
      </form>
    </div>
  );
}
