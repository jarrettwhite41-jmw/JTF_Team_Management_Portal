import React, { useState, useEffect, useRef } from "react";
import { supabaseService } from "../services/supabaseService";

interface Skill {
  SkillID: number;
  SkillName: string;
  Description: string;
  SkillCategoryID: number;
  CategoryName: string;
  AppliedLevel: string;
}

interface SkillCategory {
  SkillCategoryID: number;
  CategoryName: string;
  AppliedLevel: string;
  Description: string;
}

const EMPTY_FORM = { skillName: "", description: "", categoryText: "", categoryId: 0 };

export const SkillsManagement: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");

  const categoryInputRef = useRef<HTMLInputElement>(null);

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
    if (categoriesRes.success && categoriesRes.data) setCategories(categoriesRes.data);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingSkill(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (skill: Skill) => {
    setEditingSkill(skill);
    const cat = categories.find((c) => c.SkillCategoryID === skill.SkillCategoryID);
    setFormData({
      skillName: skill.SkillName,
      description: skill.Description,
      categoryText: cat ? cat.AppliedLevel + " - " + cat.CategoryName : skill.CategoryName,
      categoryId: skill.SkillCategoryID,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSkill(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  // Resolve category text to ID - matches "Level - Name" or just "Name"
  const resolveCategoryId = (): number => {
    const text = formData.categoryText.trim();
    // Try exact match on "Level - Name"
    const exact = categories.find((c) => (c.AppliedLevel + " - " + c.CategoryName) === text);
    if (exact) return exact.SkillCategoryID;
    // Try match on just name
    const byName = categories.find((c) => c.CategoryName.toLowerCase() === text.toLowerCase());
    if (byName) return byName.SkillCategoryID;
    return formData.categoryId;
  };

  const handleSave = async () => {
    if (!formData.skillName.trim()) { setFormError("Skill name is required"); return; }
    const catId = resolveCategoryId();
    if (!catId) { setFormError("Please select or type a valid category"); return; }

    setSaving(true);
    setFormError(null);

    let res;
    if (editingSkill) {
      res = await supabaseService.updateSkill(editingSkill.SkillID, formData.skillName, formData.description);
    } else {
      res = await supabaseService.addSkill(formData.skillName, formData.description, catId);
    }

    setSaving(false);

    if (res.success) {
      setMessage({ type: "success", text: editingSkill ? "Skill updated" : "Skill added" });
      closeModal();
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setFormError(res.error || "Failed to save skill");
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!confirm("Delete \"" + skill.SkillName + "\"? This cannot be undone.")) return;
    const res = await supabaseService.deleteSkill(skill.SkillID);
    if (res.success) {
      setMessage({ type: "success", text: "Skill deleted" });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to delete skill" });
    }
  };

  // Get unique levels for filter tabs
  const levels = ["All", ...Array.from(new Set(skills.map((s) => s.AppliedLevel || "General"))).sort()];

  // Filter skills
  const filteredSkills = skills.filter((s) => {
    const matchesLevel = levelFilter === "All" || (s.AppliedLevel || "General") === levelFilter;
    const matchesSearch = !searchText || s.SkillName.toLowerCase().includes(searchText.toLowerCase()) || s.CategoryName.toLowerCase().includes(searchText.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const skillsByLevelAndCategory = filteredSkills.reduce((acc: any, skill) => {
    const level = skill.AppliedLevel || "General";
    if (!acc[level]) acc[level] = {};
    if (!acc[level][skill.CategoryName]) acc[level][skill.CategoryName] = [];
    acc[level][skill.CategoryName].push(skill);
    return acc;
  }, {});

  if (loading) return <div className="p-6 text-center"><p className="text-gray-500">Loading skills...</p></div>;

  const msgBg = message?.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skills Management</h1>
          <p className="text-gray-500 mt-1">{skills.length} skills across {categories.length} categories</p>
        </div>
        <button onClick={openAddModal} className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
          + Add Skill
        </button>
      </div>

      {/* Toast message */}
      {message && (
        <div className={"mb-4 p-4 rounded-lg " + msgBg}>{message.text}</div>
      )}
      {error && <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">{error}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search skills or categories..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={"px-3 py-1.5 rounded-lg text-sm font-medium transition " + (levelFilter === level ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Skills list */}
      {Object.keys(skillsByLevelAndCategory).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-500">{searchText || levelFilter !== "All" ? "No skills match your filters" : "No skills found"}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(skillsByLevelAndCategory).sort(([a], [b]) => a.localeCompare(b)).map(([level, categoriesMap]: any) => (
            <div key={level} className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-blue-50 border-b px-6 py-3 flex items-center gap-2">
                <span className="text-base font-bold text-blue-900">{level}</span>
                <span className="text-sm text-blue-500">({Object.values(categoriesMap).flat().length} skills)</span>
              </div>
              <div className="divide-y">
                {Object.entries(categoriesMap).sort(([a], [b]) => a.localeCompare(b)).map(([categoryName, categorySkills]: any) => (
                  <div key={categoryName} className="px-6 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{categoryName}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {categorySkills.map((skill: Skill) => (
                        <div key={skill.SkillID} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 group">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900 text-sm">{skill.SkillName}</span>
                            {skill.Description && <p className="text-xs text-gray-500 mt-0.5 truncate">{skill.Description}</p>}
                          </div>
                          <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(skill)} className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium">Edit</button>
                            <button onClick={() => handleDelete(skill)} className="px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">Delete</button>
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
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editingSkill ? "Edit Skill" : "Add New Skill"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Category - writable with datalist suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category *
                  <span className="text-gray-400 font-normal ml-1">(type to search or select)</span>
                </label>
                <input
                  ref={categoryInputRef}
                  type="text"
                  list="category-list"
                  value={formData.categoryText}
                  onChange={(e) => {
                    const text = e.target.value;
                    const matched = categories.find((c) => (c.AppliedLevel + " - " + c.CategoryName) === text || c.CategoryName === text);
                    setFormData({ ...formData, categoryText: text, categoryId: matched ? matched.SkillCategoryID : 0 });
                  }}
                  placeholder="e.g. IA1 - Active Listening & Trust"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!!editingSkill}
                />
                <datalist id="category-list">
                  {categories.map((cat) => (
                    <option key={cat.SkillCategoryID} value={cat.AppliedLevel + " - " + cat.CategoryName} />
                  ))}
                </datalist>
                {editingSkill && (
                  <p className="text-xs text-gray-400 mt-1">Category cannot be changed when editing. Delete and re-add to move categories.</p>
                )}
              </div>

              {/* Skill Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Skill Name *</label>
                <input
                  type="text"
                  value={formData.skillName}
                  onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  placeholder="e.g., Make Eye Contact"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus={!!editingSkill}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what this skill involves"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
              </div>

              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : editingSkill ? "Update Skill" : "Add Skill"}
              </button>
              <button onClick={closeModal} className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};