import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase";

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch existing classes from Firebase
  const fetchClasses = async () => {
    const querySnapshot = await getDocs(collection(db, "classes"));
    const classData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setClasses(classData);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Add a new Class
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "classes"), {
        name: newClassName,
        sections: [] // Starts with an empty array of sections
      });
      setNewClassName("");
      fetchClasses(); // Refresh list
    } catch (error) {
      console.error("Error adding class: ", error);
    }
    setLoading(false);
  };

  // Add a Section to an existing Class
  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!selectedClassId || !newSectionName.trim()) return;
    setLoading(true);
    try {
      const classRef = doc(db, "classes", selectedClassId);
      // arrayUnion safely adds the section without overwriting existing ones
      await updateDoc(classRef, {
        sections: arrayUnion(newSectionName)
      });
      setNewSectionName("");
      setSelectedClassId("");
      fetchClasses(); // Refresh list
    } catch (error) {
      console.error("Error adding section: ", error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Manage Classes & Sections</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Card 1: Create a Class */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">1. Create a New Class</h2>
          <form onSubmit={handleAddClass} className="flex gap-4">
            <input
              type="text"
              placeholder="e.g., Class 10"
              required
              className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Add Class
            </button>
          </form>
        </div>

        {/* Card 2: Add a Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-green-600">2. Add Section to Class</h2>
          <form onSubmit={handleAddSection} className="flex flex-col gap-4">
            <select
              required
              className="border p-2 rounded focus:ring-2 focus:ring-green-400 outline-none"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">-- Select a Class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="e.g., Section A"
                required
                className="flex-1 border p-2 rounded focus:ring-2 focus:ring-green-400 outline-none"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Add Section
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Display Existing Data */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-semibold text-gray-700">
          Current School Structure
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.length === 0 ? (
            <p className="text-gray-500 italic">No classes added yet.</p>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="border rounded p-4 shadow-sm hover:shadow-md transition">
                <h3 className="font-bold text-lg text-gray-800 mb-2">{cls.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {cls.sections && cls.sections.length > 0 ? (
                    cls.sections.map((sec, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {sec}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-red-400 italic">No sections added</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}