import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Church, AdminRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRoles: AdminRole[];
  hasRole: (requiredRoles: AdminRole[]) => boolean;
  church: Church | null;
  churchLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  createChurch: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState<Church | null>(null);
  const [churchLoading, setChurchLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch church when user is logged in
  useEffect(() => {
    if (!user) {
      setChurch(null);
      setChurchLoading(false);
      return;
    }

    setChurchLoading(true);
    const q = query(
      collection(db, 'churches'), 
      where('adminEmails', 'array-contains', user.email?.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const churchData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Church;
        setChurch(churchData);
      } else {
        setChurch(null);
      }
      setChurchLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'churches');
      setChurchLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const createChurch = async (name: string) => {
    if (!user) return;
    try {
      const email = user.email?.toLowerCase();
      if (!email) return;
      
      await addDoc(collection(db, 'churches'), {
        name,
        ownerId: user.uid,
        adminEmails: [email],
        adminRoles: {
          [email]: ['Administrador']
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'churches');
    }
  };

  const email = user?.email?.toLowerCase() || '';
  const isAdmin = !!church && (church.ownerId === user?.uid || church.adminEmails.includes(email));
  
  const userRoles: AdminRole[] = church?.adminRoles?.[email] || (isAdmin ? ['Administrador'] : []);

  const hasRole = (requiredRoles: AdminRole[]) => {
    if (church?.ownerId === user?.uid) return true; // Owner has all permissions
    return userRoles.some(role => requiredRoles.includes(role));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      userRoles, 
      hasRole, 
      church, 
      churchLoading, 
      login, 
      logout, 
      createChurch 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
