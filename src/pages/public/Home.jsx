import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../firebase";
import CampusGallery from "../../components/public/CampusGallery.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notices, setNotices] = useState([]);

  // Smooth scroll function for navigation
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsMobileMenuOpen(false); // Close mobile menu after clicking a link
    }
  };

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, "notices"), where("isActive", "==", true), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setNotices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching notices:", error);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="font-sans text-gray-800 bg-[#f4f7fb] min-h-screen">

      {/* HEADER & NAVBAR */}
      <header className="bg-[#003b8b] text-white py-4 px-6 md:px-8 shadow-md sticky top-0 z-50">
        <div className="flex justify-between items-center">

          {/* Logo Section with Image */}
          <div
            className="flex items-center gap-3 md:gap-4 cursor-pointer z-50"
            onClick={() => scrollToSection('home')}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full p-1 shadow-md flex-shrink-0">
              <img src="/logo.jpg" alt="Koshi School Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div className="text-left">
              <h1 className="text-lg md:text-3xl font-bold tracking-wide leading-tight">Koshi Competitive <br className="md:hidden" />English School</h1>
              <p className="text-[9px] md:text-sm text-blue-200 opacity-90 font-medium tracking-widest mt-0.5 md:mt-1">Knowledge • Discipline • Success</p>
            </div>
          </div>

          {/* Mobile Menu Toggle Button (Hamburger) */}
          <button
            className="md:hidden p-2 focus:outline-none text-white hover:text-[#ffd000] transition"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-6 font-medium text-base">
            <button onClick={() => scrollToSection('home')} className="hover:text-[#ffd000] transition outline-none">Home</button>
            <button onClick={() => scrollToSection('about')} className="hover:text-[#ffd000] transition outline-none">About</button>
            <button onClick={() => scrollToSection('student-portal')} className="hover:text-[#ffd000] transition outline-none">Student Portal</button>
            <button onClick={() => scrollToSection('gallery')} className="hover:text-[#ffd000] transition outline-none">Gallery</button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-[#ffd000] transition outline-none">Contact</button>

            <button
              onClick={() => navigate('/teacher-login')}
              className="bg-[#ffd000] text-black px-5 py-2 rounded font-bold hover:bg-yellow-500 transition shadow-sm"
            >
              Staff Login
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Menu (UPDATED FOR ABSOLUTE OVERLAY) */}
        {isMobileMenuOpen && (
          <nav className="md:hidden absolute top-full left-0 w-full bg-[#003b8b] flex flex-col items-center gap-4 py-6 border-t border-blue-800 font-medium animate-fade-in shadow-xl z-40">
            <button onClick={() => scrollToSection('home')} className="hover:text-[#ffd000] transition outline-none w-full text-center py-2">Home</button>
            <button onClick={() => scrollToSection('about')} className="hover:text-[#ffd000] transition outline-none w-full text-center py-2">About</button>
            <button onClick={() => scrollToSection('student-portal')} className="hover:text-[#ffd000] transition outline-none w-full text-center py-2">Student Portal</button>
            <button onClick={() => scrollToSection('gallery')} className="hover:text-[#ffd000] transition outline-none w-full text-center py-2">Gallery</button>
            <button onClick={() => scrollToSection('contact')} className="hover:text-[#ffd000] transition outline-none w-full text-center py-2">Contact</button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/teacher-login'); }}
              className="bg-[#ffd000] text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition shadow-md w-[80%] mt-2"
            >
              Staff Login
            </button>
          </nav>
        )}
      </header>
      
      {/* HERO SECTION */}
      <section
        id="home"
        className="h-[75vh] md:h-[90vh] bg-cover bg-center flex items-center justify-center text-center text-white px-6 relative scroll-mt-20"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/hero.webp')" }}
      >
        
        <div className="max-w-4xl z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">Welcome To Koshi Competitive English School</h2>
          <p className="text-lg md:text-xl mb-8 text-gray-200">Building Bright Futures Through Quality Education & Modern Learning</p>
          <button
            onClick={() => scrollToSection('contact')}
            className="bg-[#ffd000] text-black px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-500 transition shadow-lg transform hover:-translate-y-1 outline-none"
          >
            Apply For Admission
          </button>

        </div>
      </section>

      {/* ABOUT / FACILITIES SECTION */}
      <section id="about" className="py-20 px-6 md:px-8 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-[#003b8b] text-3xl md:text-4xl font-bold mb-3">Our Facilities</h2>
          <p className="text-gray-500 text-base md:text-lg">Providing students with modern education and a smart learning environment</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { title: "Smart Classes", desc: "Interactive digital classrooms for better understanding and learning." },
            { title: "Experienced Faculty", desc: "Qualified and dedicated teachers helping students achieve success." },
            { title: "Computer Lab", desc: "Modern computer labs with internet and practical learning sessions." },
            { title: "Sports Activities", desc: "Indoor and outdoor sports activities for physical development." }
          ].map((card, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-lg hover:-translate-y-2 transition duration-300 border-b-4 border-transparent hover:border-[#ffd000]">
              <h3 className="text-xl font-bold text-[#003b8b] mb-3">{card.title}</h3>
              <p className="text-gray-600 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STUDENT PORTAL SECTION */}
      <section id="student-portal" className="px-4 md:px-8 max-w-7xl mx-auto mb-20 scroll-mt-20">
        <div className="bg-[#003b8b] rounded-3xl p-6 md:p-12 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-3">Student Portal</h2>
            <p className="text-blue-200">Quick access for students and parents to view official records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl text-center shadow-md">
              <h3 className="font-bold text-[#003b8b] text-lg mb-2">Download Admit Card</h3>
              <p className="text-gray-600 text-sm mb-4">Get your examination admit card instantly.</p>
              <button onClick={() => navigate('/portal/admit')} className="w-full bg-[#003b8b] text-white py-3 md:py-2 rounded-lg font-medium hover:bg-blue-900 transition outline-none">Download</button>
            </div>

            <div className="bg-white p-6 rounded-xl text-center shadow-md">
              <h3 className="font-bold text-[#003b8b] text-lg mb-2">Check Results</h3>
              <p className="text-gray-600 text-sm mb-4">View annual examination results online.</p>
              <button onClick={() => navigate('/portal/report')} className="w-full bg-[#003b8b] text-white py-3 md:py-2 rounded-lg font-medium hover:bg-blue-900 transition outline-none">View Result</button>
            </div>

            <div className="bg-white p-6 rounded-xl text-center shadow-md border-2 border-transparent hover:border-blue-200 transition">
              <h3 className="font-bold text-[#003b8b] text-lg mb-2">Check Attendance</h3>
              <p className="text-gray-600 text-sm mb-4">View your daily attendance and total percentage.</p>
              <button onClick={() => navigate('/portal/attendance')} className="w-full bg-[#003b8b] text-white py-3 md:py-2 rounded-lg font-medium hover:bg-blue-900 transition outline-none">View Attendance</button>
            </div>
          </div>
        </div>

        {/* DYNAMIC NOTICE BOARD */}
        <div className="bg-[#fff8db] p-6 rounded-xl border-l-8 border-orange-500 mt-10 shadow-md">
          <div className="flex items-center gap-2 mb-4 border-b border-orange-200 pb-2">
            <span className="text-xl">📢</span>
            <h3 className="font-bold text-orange-800 text-xl">Latest Notices</h3>
          </div>

          <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {notices.length > 0 ? (
              notices.map(notice => (
                <div key={notice.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-bold text-orange-900 text-lg">{notice.title}</h4>
                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded whitespace-nowrap">{notice.date}</span>
                  </div>
                  <p className="text-gray-700 font-medium text-sm mt-2 whitespace-pre-wrap">{notice.content}</p>
                </div>
              ))
            ) : (
              <p className="text-orange-900 font-medium italic">No new notices at this time.</p>
            )}
          </div>
        </div>
      </section>

      {/* GALLERY SECTION */}
      <section id="gallery" className="scroll-mt-20">
        <CampusGallery />
      </section>
      

      {/* CONTACT / ADMISSIONS SECTION */}
      <section id="contact" className="py-16 px-6 md:px-8 max-w-7xl mx-auto bg-white rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-[#003b8b] text-3xl md:text-4xl font-bold mb-3">Contact Us </h2>
          <p className="text-gray-500 text-base md:text-lg">Reach out to us for admission inquiries and support</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Left Side: School Info */}
          <div className="bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold text-[#003b8b] mb-6 border-b pb-4">School Information</h3>
            <div className="space-y-4 text-base md:text-lg">
              <p><strong className="text-gray-700 block md:inline">School Name:</strong> Koshi Competitive English School</p>
              <p><strong className="text-gray-700 block md:inline">Phone:</strong> +91 9122310366</p>
              <p><strong className="text-gray-700 block md:inline">Email:</strong> nileshnandan97@gmail.com</p>
              <p><strong className="text-gray-700 block md:inline">Address:</strong> Near Durga Mandir, Rambagh (Purnea)</p>
            </div>

            {/* Quick Admin Access */}
            <div className="mt-12 text-right">
              <button onClick={() => navigate('/login')} className="text-xs text-gray-400 hover:text-[#003b8b] outline-none">Admin Portal &rarr;</button>
            </div>
          </div>

          {/* Right Side: WhatsApp Direct Connect */}
          <div className="bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="bg-green-100 p-5 rounded-full mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="#25D366" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#003b8b] mb-3">Direct Inquiry</h3>
            <p className="text-gray-600 mb-8 max-w-sm text-base md:text-lg">For faster responses regarding admissions, fees, or general queries, send us a direct message!</p>

            <a
              href="https://wa.me/919122310366?text=Hello%20Koshi%20Competitive%20English%20School,%20I%20would%20like%20to%20inquire%20about%20admissions."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#25D366] text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-[#20b958] transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 outline-none w-full md:w-auto justify-center"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FOOTER SECTION                                            */}
      {/* ========================================================= */}
      <footer className="w-full bg-slate-900 text-gray-300 py-6 mt-auto border-t-4 border-[#003b8b] print:hidden">
        <div className="max-w-6xl mx-auto px-4 text-center flex flex-col items-center">
          
          <p className="font-bold text-sm md:text-base text-white tracking-wide mb-2">
            © 2026 Koshi Competitive English School | All Rights Reserved
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs md:text-sm font-medium mt-1">
            <span>MADE WITH ❤️ IN INDIA BY</span>
            
            <a 
              href="https://shiveshsatyam1.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#ffd000] hover:text-yellow-300 hover:underline transition-all tracking-wider"
            >
              S.SATYAM
            </a>
            
            <span className="text-gray-400">&</span>
            
            <a 
              href="https://portfolio-sachinbhardwaj.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#ffd000] hover:text-yellow-300 hover:underline transition-all tracking-wider"
            >
              SACHIN BHARDWAJ
            </a>
          </div>
          
        </div>
      </footer>
    </div>
  );
}
