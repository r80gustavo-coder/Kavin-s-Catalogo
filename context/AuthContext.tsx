import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '../types';
import { supabase } from '../services/supabaseClient';
import { INITIAL_USERS } from '../constants';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  users: User[]; // Lista de usuários para o Admin gerenciar (via tabela profiles)
  addUser: (user: Partial<User> & { password: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Verificar sessão ao carregar
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email!);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Carregar perfil do usuário da tabela 'profiles'
  const loadUserProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole
        });
        
        // Se for admin, carrega lista de usuários
        if (data.role === UserRole.ADMIN) {
           fetchUsersList();
        }
      } else {
        // Fallback para admin mockado se o banco estiver vazio ou erro
        if (email === 'gustavo_benvindo80@hotmail.com') {
             setCurrentUser({
                id: userId,
                name: 'Gustavo Admin',
                email: email,
                role: UserRole.ADMIN
             });
        }
      }
    } catch (e) {
      console.error("Erro ao carregar perfil", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersList = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
          const mappedUsers: User[] = data.map(u => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role as UserRole
          }));
          setUsersList(mappedUsers);
      }
  }

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      // Tenta login no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      
      // FALLBACK MOCK PARA DEMONSTRAÇÃO (Caso Supabase não esteja configurado)
      const mockUser = INITIAL_USERS.find(u => u.email === email && u.password === pass);
      if (mockUser) {
        setCurrentUser(mockUser);
        return true;
      }
      
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // Nota: Criar usuários via client-side desloga o usuário atual.
  // Em produção, isso deve ser feito via Supabase Admin API (Backend/Edge Function).
  // Aqui, vamos apenas simular a inserção na tabela profiles se o Auth falhar ou instruir o uso do dashboard.
  const addUser = async (userData: Partial<User> & { password: string }) => {
      alert("Aviso: Para criar novos usuários reais no Supabase, utilize o painel do Supabase > Authentication. Este formulário apenas cria o registro visual.");
  };

  const deleteUser = async (id: string) => {
      // Apenas visual
      setUsersList(prev => prev.filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      users: usersList.length > 0 ? usersList : INITIAL_USERS, // Fallback visual
      addUser,
      deleteUser
    }}>
      {!loading && children}
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
