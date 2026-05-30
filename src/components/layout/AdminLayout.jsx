import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Helper to highlight the active menu item
    const isActive = (path) => location.pathname.includes(path)
        ? "bg-blue-800 text-white shadow-inner font-bold"
        : "text-blue-100 hover:bg-blue-800 hover:text-white";

    const handleLogout = () => {
        // Navigate back to the admin login page
        navigate('/login');
    };

    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">

            {/* MOBILE TOP BAR (Hidden on Desktop) */}
            <div className="md:hidden bg-[#003b8b] text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
                <div>
                    <h1 className="font-bold text-lg tracking-wider">KCES</h1>
                    <p className="text-[10px] text-blue-300 uppercase tracking-widest">Super Admin</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="focus:outline-none outline-none p-2 hover:text-[#ffd000] transition">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* SIDEBAR (Desktop: Fixed left, Mobile: Dropdown) */}
            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-[#003b8b] text-white flex flex-col md:min-h-screen shadow-2xl z-40 transition-all overflow-y-auto`}>

                <div className="p-6 text-center border-b border-blue-800 hidden md:block">
                    <h2 className="text-3xl font-bold tracking-wider text-white">KCES</h2>
                    <p className="text-xs text-blue-300 mt-2 uppercase tracking-widest font-bold">Super Admin</p>
                </div>

                <nav className="flex-1 p-4 space-y-1.5">
                    <Link to="/admin/dashboard" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('dashboard')}`}>
                        Dashboard
                    </Link>

                    <Link to="/admin/notices" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition flex items-center justify-between ${isActive('notices')}`}>
                        <span>Notice Board</span>
                    </Link>
                    {/* Add this link inside your sidebar menu */}
                    <Link
                        to="/admin/gallery"
                        onClick={closeMenu}
                        className={`block px-4 py-2.5 rounded-lg transition ${isActive('gallery')}`}
                    >
                        Campus Gallery
                    </Link>

                    <div className="pt-4 pb-2 text-[10px] uppercase tracking-widest text-blue-400 font-bold px-4">Management</div>
                    <Link to="/admin/classes" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('classes')}`}>
                        Classes & Sections
                    </Link>
                    <Link to="/admin/students" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('students')}`}>
                        Student Directory
                    </Link>
                    <Link to="/admin/teachers" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('teachers')}`}>
                        Staff Directory
                    </Link>
                    <Link to="/admin/fees" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('fees')}`}>
                        Fee Collection
                    </Link>
                    <Link
                        to="/admin/promotions"
                        onClick={closeMenu}
                        className={`block px-4 py-2.5 rounded-lg transition ${isActive('promotion')}`}
                    >
                        Student Promotion
                    </Link>
                    <div className="pt-4 pb-2 text-[10px] uppercase tracking-widest text-blue-400 font-bold px-4">Tracking</div>
                    <Link to="/admin/attendance" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('/admin/attendance')}`}>
                        Master Attendance Control
                    </Link>
                    <Link to="/admin/teacher-attendance" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition flex items-center justify-between ${isActive('teacher-attendance')}`}>
                        <span>Staff Attendance</span>
                        {/* Small indicator dot to highlight the new feature */}
                        <span className="w-2 h-2 bg-[#ffd000] rounded-full shadow-sm animate-pulse"></span>
                    </Link>

                    {/* <div className="pt-4 pb-2 text-[10px] uppercase tracking-widest text-blue-400 font-bold px-4">Academics</div> */}
                    {/* <Link to="/admin/results" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('results')}`}>
                        Exam Results Entry
                    </Link> */}

                    <div className="pt-4 pb-2 text-[10px] uppercase tracking-widest text-blue-400 font-bold px-4">Academics</div>
                    <Link to="/admin/admit-cards" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('admit-cards')}`}>
                        Batch Admit Cards
                    </Link>
                    <Link to="/admin/results" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('results')}`}>
                        Exam Results Entry
                    </Link>
                    <Link to="/admin/reports" onClick={closeMenu} className={`block px-4 py-2.5 rounded-lg transition ${isActive('reports')}`}>
                        Generate Result
                    </Link>

                </nav>

                <div className="p-4 border-t border-blue-800 mt-auto">
                    <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition outline-none shadow-md">
                        Secure Logout
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {/* This renders whatever admin page is currently selected */}
            <div className="flex-1 p-4 md:p-8 w-full max-w-full overflow-x-hidden bg-gray-50">
                <Outlet />
            </div>

        </div>
    );
}