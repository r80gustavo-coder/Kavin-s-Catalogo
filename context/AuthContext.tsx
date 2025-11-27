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
        // Vamos forçar a criação do perfil agora.
        
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

        // Fallback visual se falhar o banco (mas marcamos como possivelmente offline ou sem permissão)
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

        // Tratamento para "Invalid login credentials" (Pode ser senha errada OU usuário inexistente)
        // Se for o admin principal, tentamos criar a conta automaticamente
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
                // Se der erro no cadastro também
                if (signUpError.message.toLowerCase().includes("rate limit")) {
                   alert("Muitas tentativas. Aguarde um minuto.");
                   return false;
                }
                alert(`Erro ao tentar criar conta automática: ${signUpError.message}`);
                throw signUpError;
            }

            if (signUpData.user) {
                // Conta criada! 
                // Se a sessão for null, é porque precisa confirmar email
                if (!signUpData.session) {
                    alert("Conta de Administrador criada com sucesso!\n\nIMPORTANTE: O sistema enviou um link de confirmação para " + email + ".\n\nVocê PRECISA confirmar o email antes de fazer login e salvar produtos.");
                    return false;
                }

                // Se logou direto (sem confirmação de email configurada), cria o perfil
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
      // Se chegamos aqui, o login real falhou.
      
      // Se for erro de email não confirmado, JÁ TRATAMOS ACIMA e retornamos false. 
      // Se passou batido, tratamos aqui:
      if (error.message && error.message.toLowerCase().includes("email not confirmed")) {
         alert("Verifique seu email para confirmar o cadastro antes de entrar.");
         return false;
      }

      // Se for outro erro, ou falha de rede, oferecemos o modo offline
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

  const addUser = async (userData: Partial<User> & { password: string }) => {
      if (isOfflineMode) {
          alert("Modo Offline: Não é possível adicionar usuários.");
          return;
      }
      
      alert("Para criar um login real, o usuário deve se cadastrar na tela de login. Este painel apenas gerencia permissões no banco de dados.");
      
      const { error } = await supabase.from('profiles').insert({
          id: crypto.randomUUID(),
          email: userData.email,
          name: userData.name,
          role: userData.role
      });

      if (error) alert("Erro ao salvar perfil: " + error.message);
      else fetchUsersList();
  };

  const deleteUser = async (id: string) => {
      if (isOfflineMode) return;
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