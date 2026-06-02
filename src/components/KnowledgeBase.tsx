import React, { useState, useEffect } from "react";
import { IndexDocument } from "../types";
import { Database, UploadCloud, Trash2, ShieldCheck, RefreshCw, FileText } from "lucide-react";

interface KBProps {
  onIndexUpdated?: () => void;
}

export default function KnowledgeBase({ onIndexUpdated }: KBProps) {
  const [documents, setDocuments] = useState<IndexDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/kb/documents");
      const result = await response.json();
      if (result.success) {
        setDocuments(result.documents);
      }
    } catch (err) {
      console.error("Failed to query indexed documents: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await uploadDocument(file.name, text, `${(file.size / 1024).toFixed(0)} KB`);
    };
    reader.readAsText(file);
  };

  const uploadDocument = async (name: string, text: string, size: string) => {
    try {
      const response = await fetch("/api/kb/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text, size })
      });
      const result = await response.json();
      if (result.success) {
        fetchDocuments();
        setFileText("");
        setFileName("");
        if (onIndexUpdated) onIndexUpdated();
      }
    } catch (err) {
      console.error("Indexing fail: ", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await deleteDocumentOnBackend(id);
      if (response) {
        fetchDocuments();
        if (onIndexUpdated) onIndexUpdated();
      }
    } catch (err) {
      console.error("Delete failed: ", err);
    }
  };

  const deleteDocumentOnBackend = async (id: string) => {
    const res = await fetch(`/api/kb/documents/${id}`, { method: "DELETE" });
    const json = await res.json();
    return json.success;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <Database className="text-teal-500 w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">RAG Knowledge Base & Guidelines</h2>
        </div>
        <button
          onClick={fetchDocuments}
          className="text-slate-500 hover:text-teal-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            setFileName(file.name);
            setUploading(true);
            const r = new FileReader();
            r.onload = (ev) => uploadDocument(file.name, ev.target?.result as string, `${(file.size / 1024).toFixed(0)} KB`);
            r.readAsText(file);
          }
        }}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${
          dragOver
            ? "border-teal-500 bg-teal-50/50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400"
        }`}
      >
        <UploadCloud className="w-10 h-10 text-teal-500 mb-3" />
        <p className="text-xs font-semibold text-slate-700 mb-1">
          {fileName ? `Uploading: ${fileName}` : "Drag and drop standard Indian dietary papers here"}
        </p>
        <p className="text-[11px] text-slate-500 mb-4 font-mono">Supports TXT, CSV, or custom research transcripts</p>

        <label className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs px-4 py-2 font-medium cursor-pointer shadow-sm transition-colors">
          Browse Files
          <input
            type="file"
            accept=".txt,.csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Manual text upload text area alternative */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Quick Extract Text Indexer</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Document Name (e.g., Regional Diet Plan southern.txt)"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400"
          />
        </div>
        <textarea
          rows={3}
          placeholder="Paste or write key medical/diet guidelines directly here to quickly ground Swastika's memory..."
          value={fileText}
          onChange={(e) => setFileText(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400"
        />
        <button
          disabled={uploading || !fileText || !fileName}
          onClick={() => uploadDocument(fileName, fileText, `${(fileText.length / 1024).toFixed(1)} KB`)}
          className="w-full text-center bg-teal-50/50 hover:bg-teal-100/80 text-teal-850 border border-teal-200 hover:border-teal-350 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs py-2 font-semibold transition-all shadow-xs"
        >
          {uploading ? "Analyzing Chunks..." : "Index Quick Guidelines Extract"}
        </button>
      </div>

      {/* Indexed documents table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Guideline Repositories</h3>
        {loading && <div className="text-xs text-slate-500 font-mono animate-pulse">Syncing semantic matrix store...</div>}

        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-350 transition-colors shadow-xs"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <FileText className="w-5 h-5 text-teal-500 shrink-0" />
                <div className="truncate">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">{doc.name}</h4>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="bg-teal-50 text-teal-750 px-1.5 py-0.5 rounded border border-teal-100 font-mono">
                      {doc.chunkCount} chunks
                    </span>
                    <span>•</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="hidden sm:flex items-center space-x-1 border border-teal-100 bg-teal-50 text-teal-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{doc.status}</span>
                </div>

                {!doc.id.includes("nso") && !doc.id.includes("sharma") && !doc.id.includes("ray") ? (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-500 hover:text-red-650 transition-colors rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-[10px] font-bold text-teal-700 tracking-wide uppercase px-1.5 py-0.5 bg-teal-50 rounded border border-teal-100">Base</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
