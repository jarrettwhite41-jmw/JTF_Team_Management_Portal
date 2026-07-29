import React, { useState, useEffect } from "react";
import { supabaseService } from "../services/supabaseService";

export const SkillsManagement: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ skillName: "", description: "", categoryId: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [skillsRes, categoriesRes] = await Promise.all([
      supabaseService.getSkillsWithCategories(),
      supabaseService.getSkillCategories(),
    ]);
    if (skillsRes.success && skillsRes.data) setSkills(skillsRes.data);
    else setError(skillsRes.error || "Failed to load skills");
    if (categoriesRes.success && categoriesRes.data) {
      setCategories(categoriesRes.data);
      if (categoriesRes.data.length > 0 && formData.categoryId === 0) {
        setFormData((prev) => ({ ...prev, categoryId: categoriesRes.data[0].SkillCategoryID }));
      }
    }
    setLoading(false);
  };

  const handleAddSkill = async () => {
    if (!formData.skillName.trim()) { setMessage({ type: "error", text: "Skill name is required" }); return; }
    if (formData.categoryId === 0) { setMessage({ type: "error", text: "Please select a category" }); return; }
    const res = await supabaseService.addSkill(formData.skillName, formData.description, formData.categoryId);
    if (res.success) {
      setMessage({ type: "success", text: "Skill added successfully" });
      setFormData({ skillName: "", description: "", categoryId: formData.categoryId });
      setShowAddForm(false);
      await loadData();
    } else { setMessage({ type: "error", text: res.error || "Failed to add skill" }); }
  };

  const handleUpdateSkill = async (skillId: number) => {
    if (!formData.skillName.trim()) { setMessage({ type: "error", text: "Skill name is required" }); return; }
    const res = await supabaseService.updateSkill(skillId, formData.skillName, formData.description);
    if (res.success) {
      setMessage({ type: "success", text: "Skill updated successfully" });
      setFormData({ skillName: "", description: "", categoryId: formData.categoryId });
      setEditingSkillId(null);
      await loadData();
    } else { setMessage({ type: "error", text: res.error || "Failed to update skill" }); }
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;
    const res = await supabaseService.deleteSkill(skillId);
    if (res.success) { setMessage({ type: "success", text: "Skill deleted" }); await loadData(); }
    else { setMessage({ type: "error", text: res.error || "Failed to delete skill" }); }
  };

  const handleEditClick = (skill: any) => {
    setFormData({ skillName: skill.SkillName, description: skill.Description, categoryId: skill.SkillCategoryID });
    setEditingSkillId(skill.SkillID);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setFormData({ skillName: "", description: "", categoryId: formData.categoryId });
    setEditingSkillId(null);
    setShowAddForm(false);
  };

  if (loading) return <div className="p-6 text-center"><p className="text-gray-500">Loading skills...</p></div>;

  const skillsByLevelAndCategory = skills.reduce((acc: any, skill: any) => {
    const level = skill.AppliedLevel || "General";
    if (!acc[level]) acc[level] = {};
    if (!acc[level][skill.CategoryName]) acc[level][skill.CategoryName] = [];
    acc[level][skill.CategoryName].push(skill);
    return acc;
  }, {});

  const msgBg = message && message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Skills Management</h1>
        <p className="text-gray-600">Add, edit, or delete skills used for instructor assessments</p>
      </div>

      {message && <div className={"mb-4 p-4 rounded-lg " + msgBg}>{message.text}</div>}
      {error && <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">{error}</div>}

      {(showAddForm || editingSkillId) && (
        <div className="mb-6 bg-white p-6 rounded-xl border shadow-card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{editingSkillId ? "Edit Skill" : "Add New Skill"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category {!editingSkillId && "*"}</label>
              {editingSkillId ? (
                <input type="text" disabled value={categories.find((c) => c.SkillCategoryID === formData.categoryId)?.CategoryName || ""} className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
              ) : (
                <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Select a category...</option>
                  {categories.map((cat: any) => (
                    <option key={cat.SkillCategoryID} value={cat.SkillCategoryID}>{cat.AppliedLevel} - {cat.CategoryName}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name *</label>
              <input type="text" value={formData.skillName} onChange={(e) => setFormData({ ...formData, skillName: e.target.value })} placeholder="e.g., Make Eye Contact" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" rows={3} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => editingSkillId ? handleUpdateSkill(editingSkillId) : handleAddSkill()} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{editingSkillId ? "Update Skill" : "Add Skill"}</button>
              <button onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {!showAddForm && !editingSkillId && (
        <div className="mb-6"><button onClick={() => setShowAddForm(true)} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">+ Add New Skill</button></div>
      )}

      <div className="space-y-8">
        {Object.entries(skillsByLevelAndCategory).sort(([a], [b]) => a.localeCompare(b)).map(([level, categoriesMap]: any) => (
          <div key={level} className="bg-white rounded-xl border shadow-card overflow-hidden">
            <div className="bg-blue-50 border-b px-6 py-4"><h3 className="text-lg font-bold text-gray-900">{level}</h3></div>
            <div className="divide-y">
              {Object.entries(categoriesMap).sort(([a], [b]) => a.localeCompare(b)).map(([categoryName, categorySkills]: any) => (
                <div key={categoryName} className="p-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">{categoryName}</h4>
                  <div className="space-y-3">
                    {categorySkills.map((skill: any) => (
                      <div key={skill.SkillID} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{skill.SkillName}</p>
                          {skill.Description && <p className="text-sm text-gray-600 mt-1">{skill.Description}</p>}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button onClick={() => handleEditClick(skill)} className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium">Edit</button>
                          <button onClick={() => handleDeleteSkill(skill.SkillID)} className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {skills.length === 0 && !showAddForm && !editingSkillId && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-500 mb-4">No skills found</p>
          <button onClick={() => setShowAddForm(true)} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">+ Add First Skill</button>
        </div>
      )}
    </div>
  );
};