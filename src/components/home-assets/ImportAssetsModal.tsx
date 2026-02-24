"use client";

import { useState, useEffect, useRef } from "react";
import type { HomeAsset } from "@/lib/home-assets-data";
import {
  parseFile,
  validateRows,
  generateTemplate,
  type ValidatedRow,
} from "@/lib/import-assets";
import { homeAssetToDb } from "@/lib/mappers";
import { dbToHomeAsset } from "@/lib/mappers";
import { supabase, type DbHomeAsset } from "@/lib/supabase";
import {
  XIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "@/components/icons";

type Step = "select" | "preview" | "importing" | "results";

interface ImportAssetsModalProps {
  onImportComplete: (newAssets: HomeAsset[]) => void;
  onClose: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ImportAssetsModal({
  onImportComplete,
  onClose,
}: ImportAssetsModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ imported: 0, failed: 0 });
  const [importedAssets, setImportedAssets] = useState<HomeAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function processFile(file: File) {
    setFileError("");

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 5 MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      setFileError("Unsupported file type. Please use .csv, .xlsx, or .xls.");
      return;
    }

    try {
      const rawRows = await parseFile(file);
      if (rawRows.length === 0) {
        setFileError("No data rows found in the file.");
        return;
      }
      const validated = validateRows(rawRows);
      setRows(validated);
      setFileName(file.name);
      setStep("preview");
    } catch {
      setFileError("Failed to parse file. Please check the format.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function toggleRow(idx: number) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, selected: !r.selected } : r
      )
    );
  }

  function selectAllValid() {
    setRows((prev) =>
      prev.map((r) => ({ ...r, selected: r.errors.length === 0 }))
    );
  }

  function downloadTemplate() {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "homebot-assets-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;

    setStep("importing");
    setProgress(0);

    const BATCH_SIZE = 50;
    const allNew: HomeAsset[] = [];
    let failCount = 0;

    for (let i = 0; i < selected.length; i += BATCH_SIZE) {
      const batch = selected.slice(i, i + BATCH_SIZE);
      const dbRecords = batch.map(
        (r) => homeAssetToDb(r.data) as Record<string, unknown>
      );

      const { data: returnedRows, error } = await supabase
        .from("home_assets")
        .insert(dbRecords)
        .select()
        .returns<DbHomeAsset[]>();

      if (error) {
        console.error("Batch insert failed:", error);
        failCount += batch.length;
      } else if (returnedRows) {
        allNew.push(...returnedRows.map(dbToHomeAsset));
      }

      setProgress(Math.min(i + BATCH_SIZE, selected.length));
    }

    setResults({ imported: allNew.length, failed: failCount });
    setImportedAssets(allNew);
    setStep("results");
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.length - validCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold text-text-primary">
            {step === "results" ? "Import Complete" : "Import Home Assets"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            aria-label="Close modal"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        {/* Step 1: File Selection */}
        {step === "select" && (
          <div className="p-5 flex flex-col gap-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 py-12 px-6 border-2 border-dashed rounded-[var(--radius-md)] cursor-pointer transition-all duration-[120ms] ${
                dragOver
                  ? "border-accent bg-accent/5"
                  : "border-border-strong hover:border-accent/50"
              }`}
            >
              <UploadIcon
                width={28}
                height={28}
                className="text-text-4"
              />
              <div className="text-center">
                <p className="text-[13px] font-medium text-text-primary">
                  Drag & drop a file here, or click to browse
                </p>
                <p className="text-[12px] text-text-3 mt-1">
                  Accepts .csv, .xlsx, .xls (max 5 MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Select CSV or Excel file to import"
              />
            </div>

            {fileError && (
              <p className="text-[13px] text-red font-medium">{fileError}</p>
            )}

            <button
              type="button"
              onClick={downloadTemplate}
              className="text-[13px] text-accent hover:underline self-start"
              aria-label="Download CSV template"
            >
              Download Template
            </button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <>
            <div className="px-5 py-3 border-b border-border bg-bg/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-text-primary font-medium">
                  {fileName}
                </span>
                <span className="text-[12px] text-text-3">
                  {rows.length} row{rows.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-green-light text-green">
                  {validCount} valid
                </span>
                {errorCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-red-light text-red">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-medium text-text-4 uppercase tracking-wide">
                    <th className="pl-5 pr-2 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={selectedCount === validCount && validCount > 0}
                        onChange={selectAllValid}
                        className="accent-accent"
                        aria-label="Select all valid rows"
                      />
                    </th>
                    <th className="px-2 py-2.5 w-8">#</th>
                    <th className="px-2 py-2.5">Name</th>
                    <th className="px-2 py-2.5">Category</th>
                    <th className="px-2 py-2.5">Make</th>
                    <th className="pr-5 pl-2 py-2.5 w-16 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const hasErrors = row.errors.length > 0;
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-border last:border-b-0 ${
                          hasErrors ? "bg-red/[0.02]" : ""
                        }`}
                      >
                        <td className="pl-5 pr-2 py-2.5">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(idx)}
                            className="accent-accent"
                            aria-label={`Select row ${row.rowIndex}`}
                          />
                        </td>
                        <td className="px-2 py-2.5 text-text-4">
                          {row.rowIndex}
                        </td>
                        <td className="px-2 py-2.5 text-text-primary truncate max-w-[160px]">
                          {row.data.name || (
                            <span className="text-text-4 italic">empty</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-text-2 truncate max-w-[120px]">
                          {row.data.category}
                        </td>
                        <td className="px-2 py-2.5 text-text-3 truncate max-w-[100px]">
                          {row.data.make || "—"}
                        </td>
                        <td className="pr-5 pl-2 py-2.5 text-right">
                          {hasErrors ? (
                            <span
                              className="inline-flex items-center gap-1 text-red"
                              title={row.errors
                                .map((e) => e.message)
                                .join(", ")}
                            >
                              <AlertCircleIcon width={14} height={14} />
                              <span className="text-[11px]">Error</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green">
                              <CheckCircleIcon width={14} height={14} />
                              <span className="text-[11px]">Valid</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStep("select");
                  setRows([]);
                  setFileName("");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import {selectedCount} Asset{selectedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="p-8 flex flex-col items-center gap-4">
            <p className="text-[13px] font-medium text-text-primary">
              Importing assets...
            </p>
            <div className="w-full max-w-xs h-2 bg-border rounded-[var(--radius-full)] overflow-hidden">
              <div
                className="h-full bg-accent rounded-[var(--radius-full)] transition-all duration-300"
                style={{
                  width: `${
                    selectedCount > 0
                      ? Math.round((progress / selectedCount) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-[12px] text-text-3">
              {progress} / {selectedCount}
            </p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === "results" && (
          <div className="p-8 flex flex-col items-center gap-4">
            {results.imported > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircleIcon
                  width={18}
                  height={18}
                  className="text-green"
                />
                <span className="text-[14px] font-medium text-text-primary">
                  {results.imported} asset{results.imported !== 1 ? "s" : ""}{" "}
                  imported
                </span>
              </div>
            )}
            {results.failed > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircleIcon
                  width={18}
                  height={18}
                  className="text-red"
                />
                <span className="text-[14px] font-medium text-text-primary">
                  {results.failed} failed
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                onImportComplete(importedAssets);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] mt-2"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
