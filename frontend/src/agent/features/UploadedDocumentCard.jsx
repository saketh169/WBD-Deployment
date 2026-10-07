import React from "react";
import { FileText } from "lucide-react";

export const UploadedDocumentCard = ({ data }) => {
  if (!data) return null;
  return (
    <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-3 max-w-md flex items-center justify-between mb-1">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            CLINICAL DOCUMENT ANALYZED
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate block max-w-[200px] sm:max-w-xs">
            {data.name}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">
        AI Vision Parsed
      </span>
    </div>
  );
};

export default UploadedDocumentCard;
