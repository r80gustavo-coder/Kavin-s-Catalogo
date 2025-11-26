import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '../types';
import { supabase, supabaseUrl, supabaseAnonKey } from '../services/supabaseClient';
import { INITIAL_USERS } from '../constants';
import { createClient } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  users: User[]; 
  addUser: (user: Partial<User> & { password: string }) => Promise<boolean>;
  deleteUser: (id: string) => Promise<void>;
  isOfflineMode: boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Lista de usuários "VIP" que devem ser criados automaticamente se não existirem
  const VIP_USERS = [
      { email: 'gustavo_benvindo80@hotmail.com', role: UserRole.ADMIN, name: 'Gustavo Benvindo' },
      { email: 'repre@kavins.com.br', role: UserRole.REPRESENTANTE, name: 'Representante Kavin' },
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
        
        if (data.role === UserRole.ADMIN) {
           fetchUsersList();
        }
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
             if (vipUser.role === UserRole.ADMIN) fetchUsersList();
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
        // Se der erro de credencial inválida, verifica se é um dos usuários VIP hardcoded
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
                
                return true; // Logou direto (se email confirm estiver desligado no supabase)
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

  const addUser = async (userData: Partial<User> & { password: string }): Promise<boolean> => {
      if (isOfflineMode) {
          alert("Modo Offline: Não é possível adicionar usuários.");
          return false;
      }

      // Cliente temporário para criar usuário sem deslogar admin
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      try {
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: userData.email!,
          password: userData.password,
          options: { data: { name: userData.name } }
        });

        // Se houver erro e não for "usuário já registrado", lança exceção
        if (authError && !authError.message.includes("already registered")) {
            throw new Error(authError.message);
        }

        // Se retornou usuário (seja novo ou existente com fake ID do supabase)
        if (authData.user || (authError && authError.message.includes("already registered"))) {
            
            // Tenta buscar o ID real se o usuário já existir, ou usa o retornado
            let targetId = authData.user?.id;
            
            // Se o usuário já existe, o ID retornado pelo signUp pode ser fake ou nulo dependendo da config.
            // Nesse caso, tentamos fazer o upsert no profile usando o email para garantir (se possível, mas o profile usa ID como PK).
            // NOTA: Se o usuário já existe no Auth mas não no Profile, precisamos do ID real.
            // Como Admin, não conseguimos ver o ID de outro usuário via API cliente facilmente sem uma Edge Function.
            // Mas vamos tentar o upsert direto. Se falhar por FK, é porque o ID estava errado.
            
            if (targetId) {
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: targetId,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role
                });

                if (profileError) {
                    if (profileError.message.includes("foreign key")) {
                        throw new Error("Este email já está cadastrado no sistema, mas houve um erro ao vincular o perfil. Contate o suporte.");
                    }
                    throw new Error("Erro ao salvar permissões: " + profileError.message);
                }
            } else {
                // Caso extremo: Usuário existe, mas signUp não retornou ID.
                alert("Este email já está registrado no sistema de autenticação.");
                return false;
            }

            fetchUsersList();
            alert(`Usuário ${userData.email} configurado com sucesso!`);
            return true;
        }
        return false;

      } catch (error: any) {
        console.error("Erro ao adicionar usuário:", error);
        alert(error.message);
        return false;
      }
  };

  const deleteUser = async (id: string) => {
      if (isOfflineMode) return;
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