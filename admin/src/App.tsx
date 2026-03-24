import { useState, useEffect } from 'react';
import './index.css';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  kyc_video_url: string | null;
  photos: { url: string }[];
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('Photo not clear');
  const [rejectRemark, setRejectRemark] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Mocking fetch request since the backend might not be fully seeded/running
      // const res = await fetch('http://localhost:3000/api/v1/admin/users?status=UNDER_REVIEW');
      // const data = await res.json();
      
      const mockUsers: User[] = [
        {
          id: 'mock-1abc',
          email: 'sample@example.com',
          phone: '+919876543210',
          first_name: 'Aisha',
          city: 'Mumbai',
          latitude: 19.0760,
          longitude: 72.8777,
          status: 'UNDER_REVIEW',
          kyc_video_url: null,
          photos: [{ url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150' }]
        }
      ];
      setUsers(mockUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id: string) => {
    // await fetch(`http://localhost:3000/api/v1/admin/users/${id}/approve`, { method: 'POST' });
    setUsers(users.filter(u => u.id !== id));
    alert('User Approved!');
  };

  const handleReject = async (id: string) => {
    // await fetch(`http://localhost:3000/api/v1/admin/users/${id}/reject`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ reason: rejectReason, remark: rejectRemark })
    // });
    setUsers(users.filter(u => u.id !== id));
    alert('User Rejected!');
    setRejectRemark('');
  };

  if (loading) return <div className="loading">Loading Under-Review profiles...</div>;

  return (
    <div className="container">
      <header className="admin-header">
        <h1>MingleX - Admin Moderation Panel</h1>
        <span>Total Pending: {users.length}</span>
      </header>

      <div className="user-grid">
        {users.length === 0 ? <p className="no-data">No profiles under review.</p> : null}

        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="card-header">
              <img src={user.photos[0]?.url || 'https://via.placeholder.com/150'} alt="Profile" className="profile-img" />
              <div className="user-info">
                <h2>{user.first_name || 'N/A'}</h2>
                <p>Email: {user.email || 'N/A'}</p>
                <p>Phone: {user.phone || 'N/A'}</p>
                <p>Location: {user.city} (Lat: {user.latitude}, Lng: {user.longitude})</p>
              </div>
            </div>

            <div className="media-section">
              <div className="map-placeholder">
                <p>Map View Placeholder</p>
                <small>Coords: {user.latitude}, {user.longitude}</small>
              </div>
              <div className="video-placeholder">
                {user.kyc_video_url ? (
                  <video src={user.kyc_video_url} controls width="100%" />
                ) : (
                  <p>No KYC Video found</p>
                )}
              </div>
            </div>

            <div className="action-section">
              <button className="btn-approve" onClick={() => handleApprove(user.id)}>Approve Profile</button>
              
              <div className="reject-box">
                <select value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                  <option>Photo not clear</option>
                  <option>KYC failed</option>
                  <option>Suspicious activity</option>
                  <option>Incomplete profile</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Custom remark for user..." 
                  value={rejectRemark}
                  onChange={e => setRejectRemark(e.target.value)} 
                />
                <button className="btn-reject" onClick={() => handleReject(user.id)}>Reject Profile</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
