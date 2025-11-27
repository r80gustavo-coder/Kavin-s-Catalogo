import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '../types';
import { supabase } from '../services/supabaseClient';
import { INITIAL_USERS } from '../constants';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  users: User[]; 
  isOfflineMode: boolean; 
  addUser: (user: User) => Promise<boolean>;
  deleteUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // LISTA OFICIAL DE USUÁRIOS
  // Se alguém tentar logar com esses emails e a conta não existir no Supabase,
  // o sistema criará automaticamente.
  const VIP_USERS = [
      { email: 'gustavo_benvindo80@hotmail.com', role: UserRole.ADMIN, name: 'Gustavo Benvindo' },
      { email: 'representante@kavins.com', role: UserRole.REPRESENTANTE, name: 'Representante Kavin' },
      { email: 'sacoleira@kavins.com', role: UserRole.SACOLEIRA, name: 'Sacoleira Kavin' }
  ];

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user.email!);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        setLoading(false);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email!);
      } else {
        if (!isOfflineMode) {
          setCurrentUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isOfflineMode]);

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
        
        setIsOfflineMode(false);
      } else {
        // Fallback: Se o usuário logou mas não tem perfil, cria o perfil baseado na lista VIP
        const vipUser = VIP_USERS.find(u => u.email === email);
        if (vipUser) {
             console.log(`Perfil ${vipUser.role} não encontrado, criando agora...`);
             const newProfile = {
                id: userId,
                name: vipUser.name,
                email: email,
                role: vipUser.role
             };
             
             await supabase.from('profiles').upsert(newProfile);
             setCurrentUser(newProfile as User);
             setIsOfflineMode(false);
        } else {
            setCurrentUser({
               id: userId,
               name: 'Usuário',
               email: email,
               role: UserRole.GUEST
            });
        }
      }
    } catch (e) {
      console.error("Erro ao carregar perfil", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      // 1. Tenta login normal
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        // Se der erro de credencial inválida, verifica se é um dos usuários VIP
        // Se for, cria a conta na hora.
        const vipUser = VIP_USERS.find(u => u.email === email);
        
        if (error.message.includes("Invalid login credentials") && vipUser) {
            console.log(`Usuário VIP ${vipUser.role} não encontrado, cadastrando automaticamente...`);
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password: pass,
                options: { data: { name: vipUser.name } }
            });

            if (signUpError) {
                if (signUpError.message.toLowerCase().includes("rate limit")) {
                   alert("Muitas tentativas. Aguarde um minuto.");
                   return false;
                }
                throw signUpError;
            }

            if (signUpData.user) {
                // Cria o perfil imediatamente
                await supabase.from('profiles').upsert({
                    id: signUpData.user.id,
                    email: email,
                    name: vipUser.name,
                    role: vipUser.role
                });

                if (!signUpData.session) {
                    alert(`Conta ${vipUser.role} criada!\n\nConfirme o email enviado para ${email} antes de logar.`);
                    return false;
                }
                
                return true; 
            }
        }
        
        // Se for erro de email não confirmado
        if (error.message.toLowerCase().includes("email not confirmed")) {
           alert("Sua conta existe mas o email não foi confirmado.\nVerifique sua caixa de entrada ou SPAM.");
           return false;
        }

        throw error;
      }
      
      setIsOfflineMode(false);
      return true;

    } catch (error: any) {
      console.log("Falha no login online, tentando modo offline...", error.message);
      
      // Fallback para Offline Mode usando as constantes
      const mockUser = INITIAL_USERS.find(u => u.email === email && u.password === pass);
      if (mockUser) {
        if (window.confirm("Servidor indisponível ou credenciais inválidas na nuvem.\n\nEntrar em MODO OFFLINE? (Apenas visualização)")) {
           setCurrentUser(mockUser);
           setIsOfflineMode(true);
           return true;
        }
      } else {
         alert(error.message || "Erro desconhecido no login");
      }
      
      return false;
    }
  };

  const logout = async () => {
    setIsOfflineMode(false);
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // Mock implementation for user management as it is handled by the "VIP" logic automatically
  const addUser = async (user: User) => { return true; };
  const deleteUser = async (id: string) => {};

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      users: usersList,
      isOfflineMode,
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