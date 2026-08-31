import React from 'react';
import { User, SchoolSettings } from '../types';
import { ContactsManager } from './ContactsManager';
import { X, Phone } from 'lucide-react';

interface ContactsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: SchoolSettings;
  onOpenStudentProfile?: (studentId: string) => void;
}

export const ContactsManagerModal: React.FC<ContactsManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onOpenStudentProfile
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-50 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 font-brand">
                دليل جهات الاتصال والتواصل المدرسي
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {settings.schoolName} — سجل أرقام المعلمين وأولياء الأمور والإدارة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ContactsManager
            currentUser={currentUser}
            settings={settings}
            onOpenStudentProfile={onOpenStudentProfile}
          />
        </div>
      </div>
    </div>
  );
};
