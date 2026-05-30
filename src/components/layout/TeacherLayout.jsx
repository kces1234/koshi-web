import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";

export default function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname.includes(path) ? "bg-blue-800 text-white shadow-inner" : "text-blue-100 hover:bg-blue-800 hover:text-white";

  const handleLogout = () => {
    navigate('/');
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-[#003b8b] text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-lg">Staff Portal</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="focus:outline-none outline-none p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* SIDEBAR (Desktop: Fixed left, Mobile: Dropdown) */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-[#003b8b] text-white flex flex-col md:min-h-screen shadow-xl z-40 transition-all`}>
        <div className="p-6 text-center border-b border-blue-800 hidden md:block">
          <h2 className="text-2xl font-bold tracking-wider">KCES</h2>
          <p className="text-xs text-blue-300 mt-1 uppercase tracking-widest">Teacher Portal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/teacher/dashboard" onClick={closeMenu} className={`block px-4 py-3 rounded-lg font-medium transition ${isActive('dashboard')}`}>
            Dashboard
          </Link>
          <Link to="/teacher/attendance" onClick={closeMenu} className={`block px-4 py-3 rounded-lg font-medium transition ${isActive('attendance')}`}>
            Take Attendance
          </Link>
          <Link to="/teacher/my-attendance" onClick={closeMenu} className={`block px-4 py-3 rounded-lg font-medium transition ${isActive('my-attendance')}`}>
            My Attendance
          </Link>
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition outline-none">
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-4 md:p-8 w-full max-w-full overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}