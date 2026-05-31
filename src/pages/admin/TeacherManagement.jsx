import { useState, useEffect } from "react";
// Added updateDoc to the imports
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function TeacherManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // Form & Edit State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [editingTeacherId, setEditingTeacherId] = useState(null); // Tracks if we are editing
  const [formData, setFormData] = useState({
    teacherName: "", mobile: "", username: "", password: ""
  });

  // 1. Fetch Classes for the dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, "classes"));
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, []);

  // 2. Fetch all Teachers
  const fetchTeachers = async () => {
    const snapshot = await getDocs(collection(db, "teachers"));
    setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Reset Form Helper
  const resetForm = () => {
    setFormData({ teacherName: "", mobile: "", username: "", password: "" });
    setSelectedClassId("");
    setSelectedSection("");
    setEditingTeacherId(null);
  };

  // 3. Handle Add OR Update Teacher
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Find the class name so we can save it for easy display
      const activeClass = classes.find(c => c.id === selectedClassId);
      
      const teacherData = {
        ...formData,
        classId: selectedClassId,
        className: activeClass ? activeClass.name : "",
        section: selectedSection,
        role: "teacher" // Strict role assignment
      };

      if (editingTeacherId) {
        // --- UPDATE EXISTING TEACHER ---
        const teacherRef = doc(db, "teachers", editingTeacherId);
        await updateDoc(teacherRef, teacherData);
        alert("Teacher Account Updated!");
      } else {
        // --- CREATE NEW TEACHER ---
        await addDoc(collection(db, "teachers"), {
          ...teacherData,
          createdAt: serverTimestamp()
        });
        alert("Teacher Account Created!");
      }
      
      resetForm();
      fetchTeachers(); // Refresh list
    } catch (error) {
      console.error("Error saving teacher:", error);
      alert("Failed to save teacher details.");
    }
  };

  // 4. Handle Edit Button Click
  const handleEditClick = (teacher) => {
    setEditingTeacherId(teacher.id);
    setSelectedClassId(teacher.classId);
    setSelectedSection(teacher.section);
    setFormData({
      teacherName: teacher.teacherName,
      mobile: teacher.mobile,
      username: teacher.username,
      password: teacher.password
    });
    // Scroll to top of the page smoothly so the admin sees the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 5. Handle Delete Teacher
  const handleDeleteTeacher = async (id, name) => {
    if(window.confirm(`Are you sure you want to remove ${name}?`)) {
      await deleteDoc(doc(db, "teachers", id));
      // If the admin deleted the user they were currently editing, reset the form
      if (editingTeacherId === id) resetForm();
      fetchTeachers();
    }
  };

  const activeClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Teacher & Staff Management</h1>

      {/* --- ADD / EDIT TEACHER FORM --- */}
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8 border-l-4 transition-colors ${editingTeacherId ? 'border-l-amber-500' : 'border-l-indigo-500'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${editingTeacherId ? 'text-amber-600' : 'text-indigo-700'}`}>
            {editingTeacherId ? "Edit Class Teacher Details" : "Onboard New Class Teacher"}
          </h2>
          {editingTeacherId && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              Edit Mode Active
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <input required type="text" placeholder="Teacher's Full Name" className="border p-2 rounded outline-none focus:border-indigo-500"
            value={formData.teacherName} onChange={e => setFormData({...formData, teacherName: e.target.value})} />
          
          <input required type="tel" maxLength="10" placeholder="Mobile Number" className="border p-2 rounded outline-none focus:border-indigo-500"
            value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} />
          
          {/* Class & Section Assignment */}
          <select required className="border p-2 rounded outline-none focus:border-indigo-500"
            value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}>
            <option value="">-- Assign Class --</option>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>

          <select required className="border p-2 rounded outline-none focus:border-indigo-500"
            value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClassId}>
            <option value="">-- Assign Section --</option>
            {activeClass?.sections?.map((sec, idx) => <option key={idx} value={sec}>{sec}</option>)}
          </select>

          {/* Login Credentials Generator */}
          <input required type="text" placeholder="Set Login Username" className="border p-2 rounded outline-none focus:border-indigo-500 bg-indigo-50 font-medium"
            value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          
          <input required type="text" placeholder="Set Login Password" className="border p-2 rounded outline-none focus:border-indigo-500 bg-indigo-50 font-medium"
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />

          {/* Action Buttons */}
          <div className="md:col-span-3 flex gap-4 mt-2">
            <button type="submit" className={`flex-1 text-white p-3 rounded-lg transition font-bold shadow-sm ${editingTeacherId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {editingTeacherId ? "Save Changes" : "+ Create Teacher Portal Account"}
            </button>
            
            {editingTeacherId && (
              <button type="button" onClick={resetForm} className="bg-gray-300 hover:bg-gray-400 text-gray-800 p-3 rounded-lg transition font-bold shadow-sm px-8">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* --- TEACHER ROSTER TABLE --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-slate-800 text-white font-semibold flex justify-between items-center">
          <span>Active Teaching Staff</span>
          <span className="text-sm bg-indigo-500 px-3 py-1 rounded-full">Total: {teachers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                <th className="p-4 border-b">Teacher Name</th>
                <th className="p-4 border-b">Assigned Class</th>
                <th className="p-4 border-b">Login Portal Username</th>
                <th className="p-4 border-b text-center">Password</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">No teachers onboarded yet.</td></tr>
              ) : (
                teachers.map(teacher => (
                  <tr key={teacher.id} className={`hover:bg-gray-50 border-b text-sm transition ${editingTeacherId === teacher.id ? 'bg-amber-50' : ''}`}>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{teacher.teacherName}</div>
                      <div className="text-xs text-gray-500">Ph: {teacher.mobile}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                        {teacher.className} - {teacher.section}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-indigo-600 font-semibold">{teacher.username}</td>
                    <td className="p-4 text-center font-mono text-gray-500">{teacher.password}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(teacher)} className="text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteTeacher(teacher.id, teacher.teacherName)} className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}