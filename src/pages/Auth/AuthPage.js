import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const AuthPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegister, setIsRegister] = useState(location.pathname === '/register');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    gsap.fromTo('.auth-container', 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
  }, []);

  useEffect(() => {
    gsap.fromTo('.form-content', 
      { opacity: 0, x: isRegister ? -20 : 20 }, 
      { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, [isRegister]);

  useEffect(() => {
    setIsRegister(location.pathname === '/register');
  }, [location.pathname]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (isRegister) {
      if (!formData.name.trim()) {
        toast.error('Please enter your full name');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
      }
    }
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error('Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let success = false;
      
      if (isRegister) {
        success = await register(formData.email, formData.password, formData.name);
        if (success) {
          navigate('/login');
          setFormData({ email: formData.email, password: '', name: '', confirmPassword: '' });
        }
      } else {
        success = await login(formData.email, formData.password);
        if (success) {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = () => {
    const newPath = isRegister ? '/login' : '/register';
    navigate(newPath);
    setFormData({ email: '', password: '', name: '', confirmPassword: '' });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl auth-container rounded-2xl">
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-r from-blue-600 to-purple-600">
          <h1 className="mb-2 text-3xl font-bold text-white">CodeMaster</h1>
          <p className="text-blue-100">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>
          <div className="mt-2 text-xs text-blue-200">
            Production Environment
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6 form-content">
            {/* Name field for registration */}
            {isRegister && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  disabled={loading}
                  required
                />
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4 mr-2" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                disabled={loading}
                required
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Lock className="w-4 h-4 mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute text-gray-500 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password for registration */}
            {isRegister && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <Lock className="w-4 h-4 mr-2" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 transition-all border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  disabled={loading}
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full px-4 py-3 font-medium text-white transition-all rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 mr-2 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              {loading 
                ? (isRegister ? 'Creating Account...' : 'Signing In...') 
                : (isRegister ? 'Create Account' : 'Sign In')
              }
            </button>

            {/* Toggle Form */}
            <div className="text-center">
              <p className="text-gray-600">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                type="button"
                onClick={toggleForm}
                disabled={loading}
                className="font-medium text-blue-600 underline transition-colors hover:text-blue-700"
              >
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
