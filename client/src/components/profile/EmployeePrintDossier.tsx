import { Activity, Briefcase, Landmark, User, BookOpen, Heart, ShieldCheck, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { getSafeAvatarUrl } from '../../utils/avatar';
import { useTranslation } from 'react-i18next';
import { Building } from 'lucide-react';

const EmployeePrintDossier = ({ employee }: { employee: any }) => {
    const { settings, formatCurrency } = useTheme();
    const { t } = useTranslation();
    if (!employee) return null;

    const Section = ({ title, icon: Icon, children, className }: any) => (
        <div className={cn("py-8 border-b border-slate-100 last:border-0 break-inside-avoid", className)}>
            <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                    <Icon size={14} />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">{title}</h3>
                </div>
            </div>
            {children}
        </div>
    );

    const InfoRow = ({ label, value, full, icon: Icon }: any) => (
        <div className={cn("flex flex-col gap-1 mb-4", full ? "col-span-2" : "col-span-1")}>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                {Icon && <Icon size={8} className="text-slate-300" />}
                {label}
            </span>
            <span className={cn(
                "text-[12px] font-medium text-slate-800 leading-tight",
                !value && "italic text-slate-300"
            )}>
                {value || 'Not Disclosed'}
            </span>
        </div>
    );

    const year = new Date().getFullYear();

    return (
        <div className="hidden print:block bg-white text-slate-900 p-12 max-w-[1000px] mx-auto min-h-screen relative overflow-hidden font-sans">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,900;1,900&display=swap');
                .print-dossier { font-family: 'Inter', sans-serif; }
                .print-serif { font-family: 'Playfair Display', serif; }
            ` }} />
            
            <div className="print-dossier">
            {/* Header / Brand Matrix */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-10 mb-10 relative z-10">
                <div className="flex gap-8 items-start">
                    {/* Member Photo - Added per user request */}
                    <div className="w-32 h-40 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                        <img 
                            src={getSafeAvatarUrl(employee.avatarUrl, employee.fullName)} 
                            alt={employee.fullName} 
                            className="w-full h-full object-cover" 
                        />
                    </div>

                    <div className="space-y-6 pt-2">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black tracking-[0.4em] text-slate-400 uppercase">Executive Personnel Registry</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none print-serif italic">{employee.fullName}</h1>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-slate-600">{employee.jobTitle}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-500 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                {employee.employeeCode || `REG-${employee.id.slice(0, 8).toUpperCase()}`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-right space-y-4">
                    <div className="inline-flex flex-col items-end">
                        <span className="px-4 py-1.5 rounded-lg border-2 border-slate-900 text-slate-900 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <ShieldCheck size={12} />
                            AUTHENTICATED
                        </span>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-2 px-1">Institutional Seal Registered</p>
                    </div>
                    
                    <div className="pt-2">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Generation Timestamp</p>
                        <p className="text-[11px] font-bold text-slate-900">{new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                        <p className="text-[9px] font-medium text-slate-400 opacity-60">Verified ID: {employee.id.slice(0, 10).toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Content Core */}
            <div className="grid grid-cols-2 gap-x-20 relative z-10">
                {/* 01: Identity Core */}
                <Section title="01. Personal Identity & Bio" icon={User}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <InfoRow label="Gender" value={employee.gender} />
                        <InfoRow label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString([], { dateStyle: 'long' }) : 'N/A'} />
                        <InfoRow label="Country of Origin" value={employee.countryOfOrigin} icon={Globe} />
                        <InfoRow label="Nationality" value={employee.nationality} icon={Globe} />
                        <InfoRow label="Marital Status" value={employee.maritalStatus} />
                        <InfoRow label="National ID" value={employee.nationalId} icon={ShieldCheck} />
                        <InfoRow label="Corporate Email" value={employee.email} icon={Mail} full />
                        <InfoRow label="Contact Liaison" value={employee.contactNumber} icon={Phone} full />
                        <InfoRow label="Residential Footprint" value={employee.address} icon={MapPin} full />
                    </div>
                </Section>

                {/* 02: Deployment Matrix */}
                <Section title="02. Professional Deployment" icon={Briefcase}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <InfoRow 
                            label={t('employees.dept') || "Departmental Unit"} 
                            value={employee.departmentObj?.name || t('common.unassigned_dept') || 'Internal Support'} 
                            icon={Building}
                        />
                        <InfoRow label="System Rank & Role" value={employee.role} />
                        <InfoRow label="Contractual Tier" value={employee.employmentType} />
                        <InfoRow label="Duty Commencement" value={employee.joinDate ? new Date(employee.joinDate).toLocaleDateString([], { dateStyle: 'long' }) : 'N/A'} />
                        <InfoRow label="Reporting Authority" value={employee.supervisor?.fullName || 'Self-Governed'} full />
                        <InfoRow label="Functional Manager" value={employee.employeeReportingLines?.find((r: any) => !r.isPrimary)?.manager?.fullName || 'Not Assigned'} full />
                    </div>
                </Section>

                {/* 03: Financial Protocol */}
                <Section title="03. Financial & Compensation Matrix" icon={Landmark}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <InfoRow label="Annual Base Gross" value={formatCurrency(employee.salary || 0)} />
                        <InfoRow label="Banking Institution" value={employee.bankName} />
                        <InfoRow label="Account Identifier" value={employee.bankAccountNumber} />
                        <InfoRow label="Institutional Branch" value={employee.bankBranch} />
                        <InfoRow label="Social Security Index (SSN)" value={employee.ssnitNumber} full />
                    </div>
                </Section>

                {/* 04: Emergency & Family SOS */}
                <Section title="04. Family & Emergency Registry" icon={Heart}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <InfoRow label="Next of Kin Name" value={employee.nextOfKinName} />
                        <InfoRow label="Kinship Relationship" value={employee.nextOfKinRelation} />
                        <InfoRow label="Emergency Contact (Primary)" value={employee.nextOfKinContact} full />
                        <div className="col-span-2 pt-4 border-t border-slate-50 mt-2 space-y-4">
                             <div className="flex gap-10">
                                <InfoRow label="SOS Protocol Name" value={employee.emergencyContactName} />
                                <InfoRow label="SOS Phone Link" value={employee.emergencyContactPhone} />
                             </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Extended Dossier Data */}
            <div className="mt-8 relative z-10">
                {/* 05: Academic Portfolio */}
                <Section title="05. Academic & Technical Portfolio" icon={BookOpen}>
                    <div className="space-y-8">
                        <InfoRow label="Highest Academic Achievement" value={employee.education} full />
                        {employee.certifications && (
                            <div className="mt-6">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">Certified Credentials & Awards</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(() => {
                                    try {
                                        const certs = typeof employee.certifications === 'string' ? JSON.parse(employee.certifications) : employee.certifications;
                                        return Array.isArray(certs) && certs.length > 0 ? certs.map((c: any, i: number) => (
                                            <div key={i} className="flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{c.name}</span>
                                                <span className="text-[9px] text-slate-500 font-bold mt-1">{c.authority} <span className="mx-2 opacity-30">|</span> Issued: {c.issueDate}</span>
                                            </div>
                                        )) : <p className="text-xs italic text-slate-400 pl-2">No specialized certifications logged in registry.</p>;
                                    } catch { return null; }
                                })()}
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

                {/* 06: Performance Intelligence */}
                <Section title="06. Institutional Value & Performance Analytics" icon={Activity}>
                    <div className="space-y-10">
                        <div className="grid grid-cols-2 gap-16">
                            <div className="space-y-6">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Historic Appraisal Summary</p>
                                {employee.appraisalPackets?.length > 0 ? (
                                    <div className="space-y-3">
                                        {employee.appraisalPackets.filter((p: any) => p.status !== 'CANCELLED').slice(0, 5).map((packet: any) => {
                                            const score = packet.finalScore ?? (packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' || r.reviewStage === 'SUPERVISOR')?.overallRating || 0);
                                            return (
                                                <div key={packet.id} className="flex justify-between items-center py-2 group">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-800 uppercase leading-none">{packet.cycle?.title}</span>
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{packet.cycle?.period || 'Historic'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {packet.finalScore != null && <span className="text-[7px] font-black text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded uppercase">Arbitrated</span>}
                                                        <span className={cn("text-sm font-black tracking-tighter", score >= 80 ? "text-slate-900 underline decoration-slate-300 decoration-2 font-black" : "text-slate-500")}>
                                                            {score > 0 || packet.status === 'COMPLETED' ? `${score}%` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-slate-400">No finalized performance dossiers detected.</p>
                                )}
                            </div>
                            <div className="space-y-6">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Strategic Initiative Progression</p>
                                {employee.targetsAssignedToMe?.length > 0 ? (
                                    <div className="space-y-5">
                                        {employee.targetsAssignedToMe.slice(0, 4).map((target: any) => (
                                            <div key={target.id} className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight truncate pr-4">{target.title}</span>
                                                    <span className="text-[10px] font-black text-slate-900 tracking-tighter">{Math.round(target.progress || 0)}%</span>
                                                </div>
                                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-slate-800 transition-all duration-1000" style={{ width: `${target.progress || 0}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs italic text-slate-400">No active strategic targets currently indexed.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Official Certification Footer */}
            <div className="mt-12 pt-10 border-t-2 border-slate-900 grid grid-cols-2 gap-20 relative z-10">
                <div className="space-y-10">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Institutional Certification & Sign-off</p>
                    <div className="space-y-2">
                        <div className="border-b border-slate-900 w-full h-10 relative">
                             {/* Space for digital/physical stamp */}
                        </div>
                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Director of Talent Operations / Managing Director</p>
                        <p className="text-[7px] font-bold text-slate-300 uppercase italic">Digital Core ID: {employee.id.toUpperCase()}</p>
                    </div>
                </div>
                
                <div className="flex flex-col justify-end text-right space-y-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        This document constitutes a certified institutional record from the {settings?.companyName?.toUpperCase() || 'ORGANIZATION'} Global Operating Platform.
                    </p>
                    <p className="text-[8px] text-slate-300 font-medium leading-relaxed italic pr-2">
                        Proprietary and Confidential. Unauthorized reproduction, modification, or distribution of this personnel dossier is strictly prohibited.
                    </p>
                    <div className="pt-2 text-[9px] font-black text-slate-900">
                        &copy; {year} {settings?.companyName || 'Nexus HRM Systems'}. All Rights Reserved.
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default EmployeePrintDossier;
