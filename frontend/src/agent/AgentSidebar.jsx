import React from "react";
import {
  Stethoscope,
  X,
  Plus,
  ShieldCheck,
  History,
  BookOpen,
  ArrowRight,
  UserCheck,
  MessageSquare,
  Clock,
  Trash2,
  RotateCcw,
  Utensils,
  Calendar,
} from "lucide-react";
import { SPECIALIST_AGENTS, STARTER_PROMPTS } from "./features/constants";

export const AgentSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarTab,
  setSidebarTab,
  sessions = [],
  sessionId,
  loadingSessions,
  handleNewConsultation,
  handleSelectSession,
  handleDeleteSession,
  handleClearAllSessions,
  handleSendMessage,
  handleClearChat,
  formatSessionDate,
}) => {
  return (
    <aside
      className={`fixed md:static top-0 bottom-0 left-0 z-40 w-80 lg:w-84 bg-white border-r-2 border-emerald-200/90 flex flex-col transition-transform duration-200 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-emerald-100 flex items-center justify-between shrink-0 bg-emerald-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm leading-tight">
              Clinical Services
            </h2>
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified Clinical Desk
            </span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Conversation Action Button */}
      <div className="p-3 border-b border-emerald-100 bg-white">
        <button
          onClick={handleNewConsultation}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Sidebar Tabs */}
      <div className="flex border-b border-emerald-100 bg-emerald-50/30 text-xs font-bold shrink-0">
        <button
          onClick={() => setSidebarTab("services")}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            sidebarTab === "services"
              ? "border-emerald-600 text-emerald-900 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-emerald-50/60"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Capabilities</span>
        </button>
        <button
          onClick={() => setSidebarTab("history")}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            sidebarTab === "history"
              ? "border-emerald-600 text-emerald-900 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-emerald-50/60"
          }`}
        >
          <History className="w-3.5 h-3.5 text-emerald-600" />
          <span>History</span>
          {sessions.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-bold">
              {sessions.length}
            </span>
          )}
        </button>
      </div>

      {/* Panel Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full">
        {sidebarTab === "services" ? (
          <>
            {/* Section 1: Health Services */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Medical Capabilities
                </h3>
              </div>

              <div className="space-y-2">
                {SPECIALIST_AGENTS.map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <div
                      key={agent.id}
                      className="p-3 rounded-xl border-2 border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/60 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-100/80 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-slate-900">
                            {agent.name}
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-100/90 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-300">
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-8 leading-snug">
                        {agent.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Quick Consultation Topics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Frequent Inquiries
                </h3>
              </div>

              <div className="space-y-2">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(item.prompt);
                      setSidebarOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border-2 border-emerald-200/80 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 transition-all text-xs group cursor-pointer shadow-2xs"
                  >
                    <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide block mb-1">
                      {item.badge}
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 text-xs group-hover:text-emerald-900 leading-snug">
                        {item.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Grounding Info Card */}
            <div className="p-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 text-slate-700 text-xs space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Certified Health Directory</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                NutriConnect cross-references accredited dietitian registries
                and USDA FoodData Central. For medical diagnoses, please consult
                directly with a dietitian.
              </p>
            </div>
          </>
        ) : (
          /* History Tab */
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-600" />
                Past Consultations
              </h3>
            </div>

            {loadingSessions ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading consultations...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 space-y-2 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/20">
                <MessageSquare className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
                <p className="text-xs font-semibold text-slate-700">
                  No Past Consultations
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your medical questions, dietitian matches, and lab reports
                  will be automatically saved here.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {sessions.map((sess) => {
                    const isActive = sess.sessionId === sessionId;
                    return (
                      <div
                        key={sess.sessionId}
                        onClick={() => handleSelectSession(sess.sessionId)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer group relative ${
                          isActive
                            ? "border-emerald-500 bg-emerald-50/70 shadow-2xs"
                            : "border-emerald-200/80 bg-white hover:border-emerald-400 hover:bg-emerald-50/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MessageSquare
                                className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-700" : "text-slate-400"}`}
                              />
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {sess.title || "Consultation Session"}
                              </h4>
                            </div>
                            {sess.preview && (
                              <p className="text-[11px] text-slate-500 truncate mb-1">
                                {sess.preview}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatSessionDate(
                                  sess.updatedAt || sess.createdAt,
                                )}
                              </span>
                              <span>•</span>
                              <span>{sess.messageCount || 0} msgs</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) =>
                              handleDeleteSession(e, sess.sessionId)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"
                            title="Delete consultation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleClearAllSessions}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-red-200 cursor-pointer mt-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Consultations</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-emerald-100 bg-emerald-50/30 shrink-0">
        <button
          onClick={handleClearChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-xl transition-colors border border-emerald-200 cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
          <span>Reset Chat View</span>
        </button>
      </div>
    </aside>
  );
};

export default AgentSidebar;
