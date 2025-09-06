import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      
      if (firebaseUser) {
        
        try {
          // Fetch user profile from PRODUCTION Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            console.log('📋 Profile loaded from production:', profileData.name);
            
            setUser(firebaseUser);
            setUserProfile({
              uid: firebaseUser.uid,
              ...profileData
            });
          } else {
            console.log('⚠️ No profile found in production Firestore');
            toast.error('User profile not found. Please contact admin.');
            await signOut(auth);
          }
        } catch (error) {
          console.error('❌ Error fetching profile from production:', error);
          toast.error('Failed to load user profile');
        }
      } else {
        console.log('🚪 User signed out');
        setUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login with PRODUCTION Firebase Auth
  const login = async (email, password) => {
    try {
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ No email verification check - allow login immediately
      
      toast.success('Welcome back!');
      return true;
      
    } catch (error) {
      console.error('❌ Production login error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error('No account found with this email');
          break;
        case 'auth/wrong-password':
          toast.error('Incorrect password');
          break;
        case 'auth/invalid-email':
          toast.error('Invalid email address');
          break;
        case 'auth/too-many-requests':
          toast.error('Too many failed attempts. Try again later.');
          break;
        case 'auth/invalid-credential':
          toast.error('Invalid email or password');
          break;
        case 'auth/network-request-failed':
          toast.error('Network error. Please check your connection.');
          break;
        default:
          toast.error('Login failed: ' + error.message);
      }
      return false;
    }
  };

  // Register with PRODUCTION Firebase Auth
  const register = async (email, password, name) => {
    try {
      
      // Create user in PRODUCTION Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in PRODUCTION Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        role: 'student',
        enrolledCourses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      });
      
      // Send email verification (optional)
      try {
        await sendEmailVerification(user);
      } catch (emailError) {
        console.log('⚠️ Could not send verification email:', emailError);
      }
      
      toast.success('Registration successful! You can now login.');
      
      return true;
      
    } catch (error) {
      console.error('❌ Production registration error:', error);
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          toast.error('An account with this email already exists');
          break;
        case 'auth/weak-password':
          toast.error('Password should be at least 6 characters');
          break;
        case 'auth/invalid-email':
          toast.error('Invalid email address');
          break;
        case 'auth/network-request-failed':
          toast.error('Network error. Please check your connection.');
          break;
        default:
          toast.error('Registration failed: ' + error.message);
      }
      return false;
    }
  };

  // Logout from PRODUCTION Firebase Auth
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return userProfile?.role === 'admin';
  };

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
