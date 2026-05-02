import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { auth, googleProvider, hasFirebaseConfig, onAuthStateChanged, signInWithPopup, signOut } from '../lib/firebase.js';

const AuthContext = createContext(null);

const demoUser = {
  uid: 'demo_user',
  displayName: 'Annotated Demo',
  email: 'demo@annotated.ai',
  photoURL: '',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(hasFirebaseConfig ? null : demoUser);
  const [loading, setLoading] = useState(hasFirebaseConfig);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) return undefined;
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        await api.upsertMe({
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        }).catch(() => null);
      }
    });
  }, []);

  async function loginWithGoogle() {
    if (!hasFirebaseConfig || !auth || !googleProvider) {
      setUser(demoUser);
      return demoUser;
    }
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    if (hasFirebaseConfig && auth) await signOut(auth);
    setUser(hasFirebaseConfig ? null : demoUser);
  }

  const value = useMemo(() => ({ user, loading, loginWithGoogle, logout, demoMode: !hasFirebaseConfig }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
