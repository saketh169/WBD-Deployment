import React from "react";

// Format inline markdown (bold, code, italics) and auto-bold key-value clinical labels
const formatInline = (text = "") => {
  let formatted = text
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono font-semibold">$1</code>',
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-slate-900 font-bold">$1</strong>',
    )
    .replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em class="italic text-slate-700">$1</em>',
    );

  // If text has a leading label before a colon (e.g. "Glycemic Status: 5.8%") without existing <strong> tag, auto-bold the label
  if (
    !formatted.includes("<strong") &&
    /^([A-Za-z0-9\s&/()\-.,'"]{2,50}:)(\s+.*)$/.test(formatted)
  ) {
    formatted = formatted.replace(
      /^([A-Za-z0-9\s&/()\-.,'"]{2,50}:)(\s+.*)$/,
      '<strong class="text-slate-900 font-bold">$1</strong>$2',
    );
  }

  // Safety: eliminate any leftover rogue/unclosed asterisks
  return formatted.replace(/\*+/g, "");
};

export const BotFormattedText = ({ content }) => {
  if (!content) return null;

  // Normalize orphaned bullet markers onto the same line as their content
  const normalized = content.replace(/^[•\-\*]\s*\r?\n+([^\r\n]+)/gm, "• $1");

  // Split into lines and filter empty lines
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-1.5 text-sm sm:text-base text-slate-800 leading-relaxed">
      {lines.map((line, idx) => {
        // Heading (# Heading or ### **Heading**)
        if (line.startsWith("#")) {
          const heading = line
            .replace(/^#+\s*/, "")
            .replace(/^\*\*|\*\*$/g, "")
            .trim();
          return (
            <h3
              key={idx}
              className="font-bold text-slate-900 pt-2 text-base sm:text-lg"
              dangerouslySetInnerHTML={{ __html: formatInline(heading) }}
            />
          );
        }

        // Numbered heading / Section title (e.g. "1. Diagnostic Laboratory Reports")
        const numberedMatch = line.match(/^(\d+\.\s+)(.+)$/);
        if (numberedMatch) {
          return (
            <h4
              key={idx}
              className="font-bold text-slate-900 pt-2 flex items-start gap-1.5"
            >
              <span className="text-emerald-700 font-bold">
                {numberedMatch[1]}
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: formatInline(numberedMatch[2]),
                }}
              />
            </h4>
          );
        }

        // Standalone bold heading (e.g. "**10-Day Complete Non-Vegetarian Clinical Meal Plan**")
        const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
        if (boldHeadingMatch) {
          return (
            <h3
              key={idx}
              className="font-bold text-slate-900 pt-2 text-base sm:text-lg"
            >
              {boldHeadingMatch[1].trim()}
            </h3>
          );
        }

        // List item (starts with •, or '-' / '*' followed by whitespace)
        if (/^[•]/.test(line) || /^[-*]\s+/.test(line)) {
          // Strip leading bullet markers while strictly preserving opening bold ** tags
          const clean = line
            .replace(/^[•]\s*/, "")
            .replace(/^[-*]\s+/, "")
            .trim();

          if (!clean) return null; // ignore empty bullet lines

          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-emerald-700 font-bold leading-none mt-1.5 text-xs">
                •
              </span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
            </div>
          );
        }

        // Regular paragraph
        return (
          <p
            key={idx}
            dangerouslySetInnerHTML={{ __html: formatInline(line) }}
          />
        );
      })}
    </div>
  );
};

export default BotFormattedText;
