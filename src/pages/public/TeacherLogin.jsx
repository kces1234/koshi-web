import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase"; 

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Query the database for a matching custom username AND password
      const q = query(
        collection(db, "teachers"),
        where("username", "==", username),
        where("password", "==", password)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("Invalid username or password.");
      } else {
        // Success! Get the teacher's data and save it locally for this session
        const teacherData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        localStorage.setItem("teacherAuth", JSON.stringify(teacherData));
        
        // Push directly to the teacher dashboard
        navigate("/teacher/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("A network error occurred during login.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col justify-center items-center p-4">
      
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-[#003b8b] font-bold flex items-center gap-2 hover:underline outline-none">
          &larr; Back to Website
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        <div className="bg-[#003b8b] p-6 text-center text-white">
          <h2 className="text-2xl font-bold tracking-wide">Staff Portal</h2>
          <p className="text-blue-200 text-sm mt-1">Koshi Competitive English School</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-6 md:p-8 space-y-6">
          
          {/* Error Message Display */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded font-medium text-center border border-red-200 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Username</label>
            <input 
              type="text" 
              required 
              className="w-full border-2 border-gray-200 p-3 md:p-4 rounded-xl outline-none focus:border-[#003b8b] transition text-lg font-medium"
              placeholder="e.g. rahul1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              required 
              className="w-full border-2 border-gray-200 p-3 md:p-4 rounded-xl outline-none focus:border-[#003b8b] transition text-lg"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#ffd000] text-black font-bold text-lg py-4 rounded-xl hover:bg-yellow-500 transition shadow-md outline-none"
          >
            {loading ? "Authenticating..." : "Secure Login"}
          </button>
        </form>
      </div>
    </div>
  );
}