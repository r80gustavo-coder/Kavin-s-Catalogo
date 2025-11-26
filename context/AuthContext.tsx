import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '../types';
import { supabase, supabaseUrl, supabaseAnonKey } from '../services/supabaseClient';
import { INITIAL_USERS } from '../constants';
import { createClient } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  users: User[]; // Lista de usuários para o Admin gerenciar (via tabela profiles)
  addUser: (user: Partial<User> & { password: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  isOfflineMode: boolean; // Flag to indicate if we are using mock data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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
        
        setIsOfflineMode(false); // We are definitely online
        
        // Se for admin, carrega lista de usuários
        if (data.role === UserRole.ADMIN) {
           fetchUsersList();
        }
      } else {
        // PERFIL NÃO ENCONTRADO, MAS USUÁRIO LOGADO
        // Isso acontece se o cadastro foi feito mas o insert na tabela profiles falhou ou não aconteceu.
        
        if (email === 'gustavo_benvindo80@hotmail.com') {
             console.log("Perfil admin não encontrado, criando agora...");
             const newProfile = {
                id: userId,
                name: 'Gustavo Benvindo',
                email: email,
                role: UserRole.ADMIN
             };
             
             const { error: insertError } = await supabase.from('profiles').insert(newProfile);
             
             if (!insertError) {
                setCurrentUser(newProfile);
                setIsOfflineMode(false);
                fetchUsersList();
                return;
             } else {
                console.error("Erro crítico ao criar perfil de admin:", insertError);
             }
        }

        // Fallback visual
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
        console.error("Erro Supabase Login:", error.message);

        // Tratamento específico para Email Não Confirmado
        if (error.message.toLowerCase().includes("email not confirmed")) {
           alert("ATENÇÃO: Sua conta foi criada, mas seu email ainda não foi confirmado.\n\nPor favor, acesse seu email (" + email + ") e clique no link de confirmação enviado pelo Supabase.\n\nSe não encontrar, verifique a caixa de SPAM.");
           return false; // Retorna false para não cair no Mock Mode
        }

        // Tenta criar conta admin automaticamente se não existir
        if (error.message.includes("Invalid login credentials") && email === 'gustavo_benvindo80@hotmail.com') {
            console.log("Usuário Admin não encontrado, tentando cadastrar automaticamente...");
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: { name: 'Gustavo Benvindo' }
                }
            });

            if (signUpError) {
                if (signUpError.message.toLowerCase().includes("rate limit")) {
                   alert("Muitas tentativas. Aguarde um minuto.");
                   return false;
                }
                alert(`Erro ao tentar criar conta automática: ${signUpError.message}`);
                throw signUpError;
            }

            if (signUpData.user) {
                if (!signUpData.session) {
                    alert("Conta de Administrador criada com sucesso!\n\nIMPORTANTE: O sistema enviou um link de confirmação para " + email + ".\n\nVocê PRECISA confirmar o email antes de fazer login e salvar produtos.");
                    return false;
                }

                // Se logou direto
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: signUpData.user.id,
                    email: email,
                    name: 'Gustavo Benvindo',
                    role: 'ADMIN'
                });

                if (profileError) console.error("Erro ao criar perfil de admin:", profileError);
                return true;
            }
        }
        
        throw error;
      }
      
      setIsOfflineMode(false);
      return true;

    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes("email not confirmed")) {
         alert("Verifique seu email para confirmar o cadastro antes de entrar.");
         return false;
      }

      console.log("Falha no login online, tentando modo offline...");
      const mockUser = INITIAL_USERS.find(u => u.email === email && u.password === pass);
      if (mockUser) {
        if (window.confirm("Falha ao conectar no servidor. Deseja entrar em MODO OFFLINE/VISUALIZAÇÃO?\n\n(Atenção: Você NÃO conseguirá salvar novos produtos neste modo)")) {
           setCurrentUser(mockUser);
           setIsOfflineMode(true);
           return true;
        }
      } else {
        if (error.message) alert(`Erro: ${error.message}`);
      }
      
      return false;
    }
  };

  const logout = async () => {
    setIsOfflineMode(false);
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // --- NOVA FUNÇÃO DE ADICIONAR USUÁRIO ---
  const addUser = async (userData: Partial<User> & { password: string }) => {
      if (isOfflineMode) {
          alert("Modo Offline: Não é possível adicionar usuários.");
          return;
      }

      // TRUQUE: Criar um cliente Supabase temporário que NÃO salva sessão.
      // Isso permite criar um novo usuário sem deslogar o admin atual.
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // Importante: não sobrescreve o login do admin
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      try {
        // 1. Criar o usuário na Autenticação (Login)
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: userData.email!,
          password: userData.password,
          options: {
            data: { name: userData.name }
          }
        });

        if (authError) {
          throw new Error("Erro ao criar login: " + authError.message);
        }

        if (authData.user) {
          const userId = authData.user.id;

          // 2. Criar o perfil na tabela 'profiles' usando as credenciais do ADMIN (cliente principal)
          // O Admin tem permissão para inserir na tabela profiles.
          const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            email: userData.email,
            name: userData.name,
            role: userData.role
          });

          if (profileError) {
             // Se falhar o perfil, o login foi criado mas não tem role.
             // Tentamos deletar o usuário via função RPC se existisse backend, mas aqui apenas avisamos.
             throw new Error("Login criado, mas erro ao salvar permissões: " + profileError.message);
          }

          // Atualiza lista local
          fetchUsersList();
          
          if (!authData.session) {
             alert(`Usuário cadastrado com sucesso!\n\nAVISO: O Supabase enviou um email de confirmação para ${userData.email}. O usuário precisará confirmar antes de logar.`);
          } else {
             alert("Usuário cadastrado com sucesso e já está ativo!");
          }
        }

      } catch (error: any) {
        console.error("Erro ao adicionar usuário:", error);
        alert(error.message);
      }
  };

  const deleteUser = async (id: string) => {
      if (isOfflineMode) return;
      
      // Nota: Client-side deletion of AUTH users is not possible directly securely.
      // We can only delete the PROFILE properly here. 
      // The Login remains but loses permissions.
      
      if(window.confirm("Tem certeza? Isso removerá o acesso deste usuário ao sistema.")) {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) alert("Erro ao deletar: " + error.message);
        else setUsersList(prev => prev.filter(u => u.id !== id));
      }
  };

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      users: usersList.length > 0 ? usersList : INITIAL_USERS,
      addUser,
      deleteUser,
      isOfflineMode
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