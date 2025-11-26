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
        // Se o perfil não existe mas o usuário está logado (ex: acabou de criar conta)
        // Vamos tentar criar o perfil automaticamente se for o email do admin
        if (email === 'gustavo_benvindo80@hotmail.com') {
             const newProfile = {
                id: userId,
                name: 'Gustavo Benvindo',
                email: email,
                role: UserRole.ADMIN
             };
             
             const { error: insertError } = await supabase.from('profiles').insert(newProfile);
             
             if (!insertError) {
                setCurrentUser(newProfile);
                fetchUsersList();
                return;
             }
        }

        // Fallback visual se falhar o banco
        setCurrentUser({
           id: userId,
           name: 'Usuário',
           email: email,
           role: email === 'gustavo_benvindo80@hotmail.com' ? UserRole.ADMIN : UserRole.GUEST
        });
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
      // 1. Tenta login normal
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        // 2. Se falhar e for "Invalid login credentials", pode ser que o usuário não exista no Supabase.
        // Vamos tentar criar a conta automaticamente para facilitar o setup.
        if (error.message.includes("Invalid login credentials") && email === 'gustavo_benvindo80@hotmail.com') {
            console.log("Usuário não encontrado, tentando cadastrar automaticamente...");
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: { name: 'Gustavo Benvindo' }
                }
            });

            if (signUpError) {
                alert(`Erro ao tentar criar conta automática: ${signUpError.message}`);
                throw signUpError;
            }

            if (signUpData.user) {
                // Conta criada! Agora criamos o perfil de Admin
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: signUpData.user.id,
                    email: email,
                    name: 'Gustavo Benvindo',
                    role: 'ADMIN'
                });

                if (profileError) {
                    console.error("Erro ao criar perfil de admin:", profileError);
                }
                
                // Se o Supabase exigir confirmação de email, avisar o usuário
                if (!signUpData.session) {
                    alert("Conta criada! Por favor, verifique seu email para confirmar o cadastro antes de fazer login.");
                    return false;
                }
                
                return true;
            }
        }
        
        throw error;
      }
      return true;
    } catch (error: any) {
      console.error("Erro no login:", error);
      
      // Se for um erro de rede ou configuração, avisa
      if (error.message) {
          alert(`Erro de Login: ${error.message}`);
      }

      // FALLBACK MOCK PARA DEMONSTRAÇÃO (Apenas visual, não permite salvar no banco)
      const mockUser = INITIAL_USERS.find(u => u.email === email && u.password === pass);
      if (mockUser) {
        alert("Atenção: Entrando em MODO OFFLINE/MOCK. As alterações NÃO serão salvas no banco de dados.");
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

  const addUser = async (userData: Partial<User> & { password: string }) => {
      // Para adicionar usuários reais, precisaríamos usar a API Admin do Supabase
      // Por enquanto, salvamos no banco na tabela profiles para referência
      if (!userData.email || !userData.password) return;
      
      // Nota: Isso não cria o login real (auth.users), apenas o registro no perfil
      // Em um app real, o usuário teria que se cadastrar ou usariamos uma Edge Function
      alert("Para criar um login real, o usuário deve se cadastrar na tela de login. Este painel apenas gerencia permissões.");
      
      const { error } = await supabase.from('profiles').insert({
          id: crypto.randomUUID(), // Placeholder ID
          email: userData.email,
          name: userData.name,
          role: userData.role
      });

      if (error) alert("Erro ao salvar perfil: " + error.message);
      else fetchUsersList();
  };

  const deleteUser = async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) alert("Erro ao deletar: " + error.message);
      else setUsersList(prev => prev.filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      users: usersList.length > 0 ? usersList : INITIAL_USERS,
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