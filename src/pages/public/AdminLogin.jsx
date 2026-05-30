import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // New state for reset message

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success! Push to the Admin Dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
    }
    
    setLoading(false);
  };

  // --- NEW: Password Reset Logic ---
  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address in the box first, then click 'Forgot Password?'.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("A password reset link has been sent to your email! Please check your inbox.");
    } catch (err) {
      console.error(err);
      // Firebase throws specific errors, but we can keep it simple for the user
      setError("Failed to send reset email. Please make sure this email is registered as an Admin.");
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
          <h2 className="text-2xl font-bold tracking-wide">Admin Portal</h2>
          <p className="text-blue-200 text-sm mt-1">Koshi Competitive English School</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-6 md:p-8 space-y-6">
          
          {/* Error Message Display */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded font-medium text-center border border-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Success Message Display */}
          {successMessage && (
            <div className="bg-green-50 text-green-700 p-3 rounded font-medium text-center border border-green-200 text-sm">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Admin Email</label>
            <input 
              type="email" 
              required 
              className="w-full border-2 border-gray-200 p-3 md:p-4 rounded-xl outline-none focus:border-[#003b8b] transition text-lg"
              placeholder="admin@koshischool.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-gray-700">Password</label>
              
              {/* THE FORGOT PASSWORD BUTTON */}
              <button 
                type="button" 
                onClick={handleResetPassword}
                disabled={loading}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 outline-none hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            
            <input 
              type="password" 
              className="w-full border-2 border-gray-200 p-3 md:p-4 rounded-xl outline-none focus:border-[#003b8b] transition text-lg"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#003b8b] text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-900 transition shadow-md outline-none"
          >
            {loading ? "Processing..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}