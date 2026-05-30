import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    totalStudents: 0,
    totalTeachers: 0
  });
  const [loading, setLoading] = useState(true);

  // Generate a string like "May 2026" to match against your database strings
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      try {
        // 1. Fetch from the "fees" collection based on your screenshot
        const feesSnap = await getDocs(collection(db, "fees"));
        let totalRev = 0;
        
        feesSnap.forEach(doc => {
          const data = doc.data();
          
          let paymentDateStr = "";
          
          // Handle the date safely (checks if it's a Firestore Timestamp or a plain String)
          if (data.datePaid) {
            if (typeof data.datePaid.toDate === 'function') {
              paymentDateStr = data.datePaid.toDate().toLocaleString('default', { month: 'long', year: 'numeric' });
            } else {
              paymentDateStr = String(data.datePaid);
            }
          }

          // Extract the exact "paidAmount" field from your database
          const amount = Number(data.paidAmount || 0);
          
          // If the date string contains "May 2026", add it to this month's revenue
          if (paymentDateStr.includes(currentMonthName)) {
            totalRev += amount;
          }
        });

        // 2. Fetch Total Students Count
        const studentsSnap = await getDocs(collection(db, "students"));
        
        // 3. Fetch Total Staff Count
        const teachersSnap = await getDocs(collection(db, "teachers"));

        // Update all stats at once
        setStats({
          monthlyRevenue: totalRev,
          totalStudents: studentsSnap.size,
          totalTeachers: teachersSnap.size
        });

      } catch (error) {
        console.error("Error fetching dashboard statistics:", error);
      }
      setLoading(false);
    };

    fetchDashboardStats();
  }, [currentMonthName]);

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">School Dashboard</h1>
      <p className="text-gray-500 mb-8 border-b pb-4">Welcome to the Super Admin portal. Here is your overview for {currentMonthName}.</p>

      {loading ? (
        <div className="p-10 text-center text-blue-600 font-bold animate-pulse text-lg">
          Loading system statistics...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Revenue Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform hover:-translate-y-1 transition duration-300 flex items-center justify-between border-l-4 border-l-green-500">
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Fees Collected (This Month)</div>
              <div className="text-3xl font-black text-green-700">₹ {stats.monthlyRevenue.toLocaleString('en-IN')}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl shadow-sm">
              ₹
            </div>
          </div>

          {/* Total Students Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform hover:-translate-y-1 transition duration-300 flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Enrolled Students</div>
              <div className="text-3xl font-black text-blue-800">{stats.totalStudents}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl shadow-sm">
              🎓
            </div>
          </div>

          {/* Total Staff Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform hover:-translate-y-1 transition duration-300 flex items-center justify-between border-l-4 border-l-purple-500">
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Active Staff</div>
              <div className="text-3xl font-black text-purple-800">{stats.totalTeachers}</div>
            </div>
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl shadow-sm">
              👩‍🏫
            </div>
          </div>

        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 shadow-inner mt-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Ready to get to work?</h3>
          <p className="text-blue-700 font-medium max-w-md">Select a management module from the sidebar on the left to process admissions, mark attendance, or generate reports.</p>
        </div>
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-200 shrink-0">
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>

    </div>
  );
}