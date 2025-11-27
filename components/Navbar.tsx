import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogOut, Users, PlusCircle, LogIn, Store } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-gray-900 text-white p-1.5 rounded-lg mr-2">
              <span className="font-serif font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-2xl text-gray-900 tracking-tight" style={{ fontFamily: 'serif' }}>Kavin's</span>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'}`}
                >
                  Catálogo
                </button>

                {user?.role === UserRole.ADMIN && (
                  <>
                     <button
                      onClick={() => navigate('/admin/products')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin/products') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'}`}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Produtos
                    </button>
                    <button
                      onClick={() => navigate('/admin/users')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin/users') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'}`}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Usuários
                    </button>
                  </>
                )}

                <div className="flex items-center border-l pl-4 ml-4 border-gray-200">
                  <div className="flex flex-col items-end mr-3 hidden sm:flex">
                    <span className="text-sm font-medium text-gray-800">{user?.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase()}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
               <button
                  onClick={() => navigate('/login')}
                  className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Acesso Restrito
                </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;