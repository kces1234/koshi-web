import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function TeacherManagement() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // Form State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
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

  // 3. Handle Add Teacher
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      // Find the class name so we can save it for easy display
      const activeClass = classes.find(c => c.id === selectedClassId);
      
      await addDoc(collection(db, "teachers"), {
        ...formData,
        classId: selectedClassId,
        className: activeClass ? activeClass.name : "",
        section: selectedSection,
        role: "teacher", // Strict role assignment
        createdAt: serverTimestamp()
      });
      
      setFormData({ teacherName: "", mobile: "", username: "", password: "" });
      setSelectedClassId("");
      setSelectedSection("");
      fetchTeachers(); // Refresh list
      alert("Teacher Account Created!");
    } catch (error) {
      console.error("Error adding teacher:", error);
      alert("Failed to create teacher.");
    }
  };

  // 4. Handle Delete Teacher
  const handleDeleteTeacher = async (id, name) => {
    if(window.confirm(`Are you sure you want to remove ${name}?`)) {
      await deleteDoc(doc(db, "teachers", id));
      fetchTeachers();
    }
  };

  const activeClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="pb-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Teacher & Staff Management</h1>

      {/* --- ADD TEACHER FORM --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8 border-l-4 border-l-indigo-500">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">Onboard New Class Teacher</h2>
        <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
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

          <button type="submit" className="md:col-span-3 bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition font-bold mt-2 shadow-sm">
            + Create Teacher Portal Account
          </button>
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
                  <tr key={teacher.id} className="hover:bg-gray-50 border-b text-sm transition">
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
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteTeacher(teacher.id, teacher.teacherName)} className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition">
                        Remove
                      </button>
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