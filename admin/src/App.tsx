import { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, LayoutDashboard, Activity, LogOut, ShieldCheck, Plus, Shield, IndianRupee, AlertTriangle, MessageSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logo from './assets/minglexadmin.png';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: string;
  first_name: string | null;
  dob: string | null;
  bio: string | null;
  city: string | null;
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  photos: { url: string }[];
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  pendingVerifications: number;
  approvalRate: string;
  totalRevenue: string;
  nodeId: string;
  lastSync: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.minglex.com/api/v1';

function StatCard({ title, value, subtext, icon: Icon, variant = 'white' }: any) {
  return (
    <div className={cn(
      "flex-1 p-6 rounded-[32px] shadow-sm border border-outline-variant/10",
      variant === 'primary' ? "signature-gradient text-white" : "bg-white text-on-surface"
    )}>
      <div className="flex justify-between items-start mb-4">
        <span className={cn("text-xs font-bold uppercase tracking-widest", variant === 'primary' ? "text-white/70" : "text-on-surface-variant")}>
          {title}
        </span>
        <Icon size={20} className={variant === 'primary' ? "text-white/50" : "text-primary/30"} />
      </div>
      <div className="text-4xl font-extrabold font-headline mb-2">{value}</div>
      <div className={cn("text-sm", variant === 'primary' ? "text-white/80" : "text-primary font-medium")}>
        {subtext}
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
      "flex items-center space-x-4 px-6 py-3 cursor-pointer transition-all duration-200",
      active ? "bg-white shadow-sm border-r-4 border-primary" : "hover:bg-primary/5 text-on-surface-variant"
    )}>
      <Icon size={20} className={active ? "text-primary" : "text-on-surface-variant"} />
      <span className={cn("font-medium", active ? "text-primary font-bold" : "text-on-surface-variant")}>
        {label}
      </span>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.title = "Minglex | Admin Dashboard";
    
    // Force favicon update to bypass cache
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/favicon.png?v=' + Date.now();
    }
  }, []);

  const [users, setUsers] = useState<User[]>([]);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [adminUser, setAdminUser] = useState<any>(JSON.parse(localStorage.getItem('admin_user') || 'null'));
  const [authError, setAuthError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  
  // Tabs: 'DASHBOARD', 'ADMINS', 'REPORTS', 'APPEALS'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ADMINS' | 'REPORTS' | 'APPEALS'>('DASHBOARD');

  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password Change Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Add Admin Form
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('ADMIN');
  const [createdAdminInfo, setCreatedAdminInfo] = useState<any>(null);

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users?status=UNDER_REVIEW`, { headers }),
        fetch(`${API_BASE}/admin/stats`, { headers })
      ]);

      if (usersRes.status === 401 || statsRes.status === 401) {
        handleLogout();
        return;
      }

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      if (usersData.success) setUsers(usersData.data.users);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/admins`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setAdminList(data.data.admins);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reports?status=PENDING`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setReports(data.data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppeals = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/appeals?status=PENDING`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setAppeals(data.data.appeals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && adminUser && !adminUser.force_password_change) {
      if (activeTab === 'DASHBOARD') fetchDashboard();
      if (activeTab === 'ADMINS') fetchAdmins();
      if (activeTab === 'REPORTS') fetchReports();
      if (activeTab === 'APPEALS') fetchAppeals();
    }
  }, [token, adminUser, activeTab]);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        setAdminUser(data.data.admin);
        localStorage.setItem('admin_token', data.data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.data.admin));
        setAuthError(null);
      } else {
        setAuthError(data.error?.message || 'Login failed');
      }
    } catch (err) {
      setAuthError('Network error');
    }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        const updatedAdmin = { ...adminUser, force_password_change: false };
        setAdminUser(updatedAdmin);
        localStorage.setItem('admin_user', JSON.stringify(updatedAdmin));
        setAuthError(null);
      } else {
        setAuthError(data.error?.message || 'Password change failed');
      }
    } catch (err) {
      setAuthError('Network error');
    }
  };

  const handleCreateAdmin = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/add-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: newAdminEmail, role: newAdminRole })
      });
      const data = await res.json();
      if (data.success) {
        setCreatedAdminInfo(data.data);
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        alert(data.error?.message || 'Failed to create admin');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason: 'INCOMPLETE_KYC', remark: 'Please upload clearer photos.' }) : undefined
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'BAN' | 'WARN' | 'DISMISS') => {
    try {
      const res = await fetch(`${API_BASE}/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remark: `Admin action: ${action}` })
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      }
    } catch (err) {
      console.error(`Failed to ${action} report:`, err);
    }
  };

  const handleResolveAppeal = async (appealId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`${API_BASE}/admin/appeals/${appealId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remark: `Appeal manually ${action.toLowerCase()}d` })
      });
      const data = await res.json();
      if (data.success) {
        setAppeals(prev => prev.filter(a => a.id !== appealId));
      }
    } catch (err) {
      console.error(`Failed to ${action} appeal:`, err);
    }
  };

  const handleLogout = () => {
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  // ─── Render Login ───
  if (!token || !adminUser) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl border border-outline-variant/10">
          <div className="text-center mb-8">
            <img src={logo} alt="Minglex" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <div className="signature-text-gradient text-2xl font-extrabold mb-1">Admin Portal</div>
            <p className="text-on-surface-variant text-sm">Sign in to the Control Panel</p>
          </div>
          <input 
            type="email"
            className="w-full p-4 rounded-2xl bg-surface border border-outline-variant/20 mb-4 focus:ring-2 focus:ring-primary outline-none"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input 
            type="password"
            className="w-full p-4 rounded-2xl bg-surface border border-outline-variant/20 mb-6 focus:ring-2 focus:ring-primary outline-none"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button 
            onClick={handleLogin}
            className="w-full h-14 signature-gradient text-white rounded-2xl font-bold shadow-lg"
          >
            Authenticate
          </button>
          {authError && <p className="text-red-500 mt-4 text-center text-sm font-medium">{authError}</p>}
        </div>
      </div>
    );
  }

  // ─── Render Change Password ───
  if (adminUser.force_password_change) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl border border-outline-variant/10">
          <div className="text-center mb-8">
            <ShieldCheck size={48} className="text-primary mx-auto mb-4" />
            <div className="text-2xl font-extrabold mb-2">Change Password</div>
            <p className="text-sm text-on-surface-variant">For security reasons, you must change your temporary password before accessing the dashboard.</p>
          </div>
          <input 
            type="password"
            className="w-full p-4 rounded-2xl bg-surface border border-outline-variant/20 mb-4 focus:ring-2 focus:ring-primary outline-none"
            placeholder="Current Temporary Password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
          />
          <input 
            type="password"
            className="w-full p-4 rounded-2xl bg-surface border border-outline-variant/20 mb-6 focus:ring-2 focus:ring-primary outline-none"
            placeholder="New Strong Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <button 
            onClick={handleChangePassword}
            className="w-full h-14 signature-gradient text-white rounded-2xl font-bold shadow-lg"
          >
            Update Password
          </button>
          {authError && <p className="text-red-500 mt-4 text-center text-sm font-medium">{authError}</p>}
        </div>
      </div>
    );
  }

  // ─── Render Dashboard ───
  return (
    <div className="flex min-h-screen bg-surface font-body text-on-surface">
      {/* Sidebar */}
      <aside className="w-72 bg-surface-card border-r border-outline-variant/10 flex flex-col pt-8">
        <div className="px-8 mb-12 flex items-center space-x-3">
          <img src={logo} alt="Minglex" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <div className="text-xl font-extrabold font-headline text-primary">Minglex</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 leading-none">Admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="DASHBOARD" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} />
          <SidebarItem icon={AlertTriangle} label="REPORTS" active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} />
          <SidebarItem icon={MessageSquare} label="APPEALS" active={activeTab === 'APPEALS'} onClick={() => setActiveTab('APPEALS')} />
          {adminUser.role === 'SUPER_ADMIN' && (
            <SidebarItem icon={Shield} label="ADMINS" active={activeTab === 'ADMINS'} onClick={() => setActiveTab('ADMINS')} />
          )}
        </nav>

        <div className="p-8 space-y-4">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <p className="text-xs font-bold text-primary truncate">{adminUser.email}</p>
            <p className="text-[10px] uppercase text-on-surface-variant font-medium mt-1">{adminUser.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-bold w-full p-2"
          >
            <LogOut size={16} />
            <span>SIGN OUT</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        
        {activeTab === 'DASHBOARD' && (
          <>
            <header className="flex justify-between items-center mb-12">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight">Overview</h1>
            </header>

            {/* Metrics */}
            <div className="flex space-x-6 mb-12">
              <StatCard 
                title="TOTAL USERS" 
                value={stats?.totalUsers || '0'} 
                subtext="Registered Platform Users" 
                icon={Users} 
              />
              <StatCard 
                title="PENDING KYC" 
                value={stats?.pendingVerifications || '0'} 
                subtext="Waiting for approval" 
                icon={CheckCircle2} 
                variant="primary"
              />
              <StatCard 
                title="APPROVAL RATE" 
                value={`${stats?.approvalRate || '0'}%`} 
                subtext="Total lifetime approval" 
                icon={Activity} 
              />
              <StatCard 
                title="TOTAL REVENUE" 
                value={`₹${stats?.totalRevenue || '0'}`} 
                subtext="Total lifetime revenue" 
                icon={IndianRupee} 
              />
            </div>

            {/* Verification Queue */}
            <section>
              <h2 className="text-2xl font-extrabold font-headline tracking-tight mb-8">KYC Verification Queue</h2>
              <div className="grid grid-cols-2 gap-6">
                {users.length === 0 ? (
                  <div className="col-span-2 py-20 bg-white rounded-[32px] border border-dashed border-outline-variant/20 flex flex-col items-center justify-center">
                     <ShieldCheck size={48} className="text-primary/20 mb-4" />
                     <p className="text-on-surface-variant font-medium">All clear! No profiles currently under review.</p>
                  </div>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-outline-variant/10 flex space-x-6">
                      <img 
                        src={user.photos[0]?.url || 'https://via.placeholder.com/300'} 
                        alt="Profile" 
                        className="w-32 h-40 object-cover rounded-2xl bg-surface-container"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-extrabold font-headline mb-1">{user.first_name || 'Anonymous'}</h3>
                          <div className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-4">
                            ID: {user.id.slice(0, 8)} • {user.city || 'N/A'}
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleAction(user.id, 'approve')}
                            className="flex-1 h-10 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleAction(user.id, 'reject')}
                            className="flex-1 h-10 bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'ADMINS' && adminUser.role === 'SUPER_ADMIN' && (
          <>
            <header className="flex justify-between items-center mb-12">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight">Admin Management</h1>
            </header>

            <div className="flex gap-12">
              {/* Add Admin Form */}
              <div className="w-1/3">
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-outline-variant/10">
                  <h3 className="text-xl font-bold mb-6">Create New Admin</h3>
                  <input 
                    type="email"
                    className="w-full p-4 rounded-xl bg-surface border border-outline-variant/20 mb-4 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Admin Email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                  />
                  <select 
                    className="w-full p-4 rounded-xl bg-surface border border-outline-variant/20 mb-6 focus:ring-2 focus:ring-primary outline-none text-on-surface"
                    value={newAdminRole}
                    onChange={e => setNewAdminRole(e.target.value)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                  <button 
                    onClick={handleCreateAdmin}
                    className="w-full h-12 signature-gradient text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    <span>Create Admin</span>
                  </button>

                  {createdAdminInfo && (
                    <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-xs text-green-800 font-medium mb-2">Admin created! Give these credentials to the user. They will be forced to change it on login.</p>
                      <div className="font-mono text-sm bg-white p-3 rounded border border-green-100 selection:bg-green-200">
                        Email: {createdAdminInfo.admin.email}<br/>
                        Pass: <strong>{createdAdminInfo.temporary_password}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin List */}
              <div className="flex-1">
                <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-outline-variant/10">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-lowest text-xs uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                      <tr>
                        <th className="px-6 py-4 font-bold">Email</th>
                        <th className="px-6 py-4 font-bold">Role</th>
                        <th className="px-6 py-4 font-bold">Status</th>
                        <th className="px-6 py-4 font-bold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-sm">
                      {adminList.map(admin => (
                        <tr key={admin.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-6 py-4 font-medium">{admin.email}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold tracking-wider",
                              admin.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                              admin.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            )}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("flex items-center gap-1.5 text-xs font-medium", admin.is_active ? "text-green-600" : "text-red-500")}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", admin.is_active ? "bg-green-500" : "bg-red-500")} />
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'REPORTS' && (
          <>
            <header className="flex justify-between items-center mb-12">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight">Reported Users</h1>
            </header>
            
            <div className="grid grid-cols-1 gap-6">
              {reports.length === 0 ? (
                <div className="py-20 bg-white rounded-[32px] border border-dashed border-outline-variant/20 flex flex-col items-center justify-center">
                   <ShieldCheck size={48} className="text-primary/20 mb-4" />
                   <p className="text-on-surface-variant font-medium">All clear! No pending reports.</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-outline-variant/10 flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-extrabold font-headline mb-1">Reported: {report.reported?.first_name || 'Anonymous'}</h3>
                        <div className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
                          Reporter: {report.reporter?.first_name || 'Anonymous'} • Reason: {report.reason}
                        </div>
                        <p className="text-sm text-on-surface-variant mb-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/5">
                          Evidence: {report.evidence || 'No evidence provided.'}
                        </p>
                      </div>
                      <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                        Total Reports: {report.reported?.report_count || 1}
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-4 border-t border-outline-variant/10">
                      <button 
                        onClick={() => handleResolveReport(report.id, 'BAN')}
                        className="flex-1 h-10 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors"
                      >
                        Ban User
                      </button>
                      <button 
                        onClick={() => handleResolveReport(report.id, 'WARN')}
                        className="flex-1 h-10 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        Issue Warning
                      </button>
                      <button 
                        onClick={() => handleResolveReport(report.id, 'DISMISS')}
                        className="flex-1 h-10 bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-surface-container-highest transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        {activeTab === 'APPEALS' && (
          <>
            <header className="flex justify-between items-center mb-12">
              <h1 className="text-4xl font-extrabold font-headline tracking-tight">User Appeals</h1>
            </header>
            
            <div className="grid grid-cols-1 gap-6">
              {appeals.length === 0 ? (
                <div className="py-20 bg-white rounded-[32px] border border-dashed border-outline-variant/20 flex flex-col items-center justify-center">
                   <MessageSquare size={48} className="text-primary/20 mb-4" />
                   <p className="text-on-surface-variant font-medium">No pending appeals.</p>
                </div>
              ) : (
                appeals.map(appeal => (
                  <div key={appeal.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-outline-variant/10 flex flex-col space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-extrabold font-headline mb-1">User: {appeal.user?.first_name || 'Anonymous'}</h3>
                        <p className="text-sm text-on-surface-variant mb-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/5 whitespace-pre-wrap">
                          {appeal.reason}
                        </p>
                      </div>
                      <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-100">
                        Status: Banned
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-4 border-t border-outline-variant/10">
                      <button 
                        onClick={() => handleResolveAppeal(appeal.id, 'APPROVE')}
                        className="flex-1 h-10 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-green-700 transition-colors"
                      >
                        Approve & Unban
                      </button>
                      <button 
                        onClick={() => handleResolveAppeal(appeal.id, 'REJECT')}
                        className="flex-1 h-10 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors"
                      >
                        Reject Appeal
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
