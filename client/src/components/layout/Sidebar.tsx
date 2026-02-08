import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Target, Users, LogOut, Shield, Calendar, ClipboardCheck, UserCog } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();

  // Get user to check role
  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isManager = user.role === 'SUPERVISOR' || user.role === 'MD';
  const isAdmin = user.role === 'HR_ADMIN' || user.role === 'MD';

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    navigate('/');
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50">
      {/* Logo Area */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
          <Shield className="text-nexus-500" /> NEXUS HRM
        </h1>
        <p className="text-xs text-slate-500 mt-1">Enterprise Edition</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={20} className="mr-3" />
          Dashboard
        </NavLink>

        <NavLink
          to="/performance"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Target size={20} className="mr-3" />
          My Performance
        </NavLink>

        <NavLink
          to="/leave"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Calendar size={20} className="mr-3" />
          Leave Request
        </NavLink>

        <NavLink
          to="/appraisals"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <ClipboardCheck size={20} className="mr-3" />
          My Appraisal
        </NavLink>

        {/* Only show this if Manager */}
        {isManager && (
          <NavLink
            to="/team"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Users size={20} className="mr-3" />
            Team Review
          </NavLink>
        )}

        {/* Team Appraisals - Only for Managers */}
        {isManager && (
          <NavLink
            to="/manager-appraisals"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <ClipboardCheck size={20} className="mr-3" />
            Team Appraisals
          </NavLink>
        )}

        {/* Employee Management - Only for HR/MD */}
        {isAdmin && (
          <NavLink
            to="/employees"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <UserCog size={20} className="mr-3" />
            Employees
          </NavLink>
        )}

        {/* Audit Logs - Only for Admin */}
        {isAdmin && (
          <NavLink
            to="/audit"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Shield size={20} className="mr-3" />
            Audit Logs
          </NavLink>
        )}

        {/* Settings - Admin Only */}
        {isAdmin && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <UserCog size={20} className="mr-3" />
            Settings
            Settings
          </NavLink>
        )}

        {/* Cycle Management - Admin Only */}
        {isAdmin && (
          <NavLink
            to="/cycles"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-nexus-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Calendar size={20} className="mr-3" />
            Cycles
          </NavLink>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-nexus-600 flex items-center justify-center font-bold">
            {user.name ? user.name[0] : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 rounded-lg transition-all text-sm font-bold"
        >
          <LogOut size={16} className="mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;