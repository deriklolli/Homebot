"use client";

import { useState, useEffect } from "react";
import { type Contractor, type Specialty } from "@/lib/contractors-data";
import { supabase, type DbContractor } from "@/lib/supabase";
import { dbToContractor, contractorToDb } from "@/lib/mappers";
import { PlusIcon } from "@/components/icons";
import ContractorCard from "./ContractorCard";
import SearchFilterBar from "./SearchFilterBar";
import AddContractorModal from "./AddContractorModal";

export default function ContractorsClient() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<
    Specialty | "All"
  >("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] =
    useState<Contractor | null>(null);

  useEffect(() => {
    async function fetchContractors() {
      const { data, error } = await supabase
        .from("contractors")
        .select("id, user_id, name, company, phone, email, specialty, rating, notes, website, logo_url, created_at")
        .order("created_at", { ascending: false })
        .returns<DbContractor[]>();

      if (error) {
        console.error("Failed to fetch contractors:", error);
      } else {
        setContractors(data.map(dbToContractor));
      }
      setLoading(false);
    }
    fetchContractors();
  }, []);

  const filtered = contractors.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      c.company.toLowerCase().includes(query) ||
      c.specialty.toLowerCase().includes(query);
    const matchesSpecialty =
      selectedSpecialty === "All" || c.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  async function handleAdd(data: Omit<Contractor, "id" | "createdAt">) {
    const { data: rows, error } = await supabase
      .from("contractors")
      .insert(contractorToDb(data) as Record<string, unknown>)
      .select()
      .returns<DbContractor[]>();

    if (error) {
      console.error("Failed to add contractor:", error);
      return;
    }
    setContractors([dbToContractor(rows[0]), ...contractors]);
    setModalOpen(false);
  }

  async function handleEdit(data: Omit<Contractor, "id" | "createdAt">) {
    if (!editingContractor) return;
    const { data: rows, error } = await supabase
      .from("contractors")
      .update(contractorToDb(data) as Record<string, unknown>)
      .eq("id", editingContractor.id)
      .select()
      .returns<DbContractor[]>();

    if (error) {
      console.error("Failed to update contractor:", error);
      return;
    }
    setContractors(
      contractors.map((c) =>
        c.id === editingContractor.id ? dbToContractor(rows[0]) : c
      )
    );
    setEditingContractor(null);
  }

  async function handleDelete() {
    if (!editingContractor) return;
    const { error } = await supabase
      .from("contractors")
      .delete()
      .eq("id", editingContractor.id);

    if (error) {
      console.error("Failed to delete contractor:", error);
      return;
    }
    setContractors(contractors.filter((c) => c.id !== editingContractor.id));
    setEditingContractor(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingContractor(null);
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading contractors...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Contractors
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={14} height={14} />
          Add Contractor
        </button>
      </header>

      {/* Search + filter */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSpecialty={selectedSpecialty}
        onSpecialtyChange={setSelectedSpecialty}
      />

      {/* Results count */}
      <p className="text-xs text-text-3 mb-3">
        {filtered.length} contractor{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Card grid or empty state */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ContractorCard
              key={c.id}
              contractor={c}
              onEdit={setEditingContractor}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            No contractors found
          </p>
          <p className="text-[13px] text-text-3">
            Try adjusting your search or filter, or add a new contractor.
          </p>
        </div>
      )}

      {/* Add modal */}
      {modalOpen && (
        <AddContractorModal onSave={handleAdd} onClose={closeModal} />
      )}

      {/* Edit modal */}
      {editingContractor && (
        <AddContractorModal
          contractor={editingContractor}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
