import { Activity, Briefcase, Landmark, User, BookOpen, Heart } from 'lucide-react';
import { cn } from '../../utils/cn';

const EmployeePrintDossier = ({ employee }: { employee: any }) => {
    if (!employee) return null;

    const Section = ({ title, icon: Icon, children, className }: any) => (
        <div className={cn("py-8 border-b border-slate-200 last:border-0 break-inside-avoid", className)}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <Icon size={16} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">{title}</h3>
            </div>
            {children}
        </div>
    );

    const InfoRow = ({ label, value, full }: any) => (
        <div className={cn("flex flex-col gap-1 mb-4", full ? "col-span-2" : "col-span-1")}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="text-[13px] font-semibold text-slate-700">{value || 'Not Disclosed'}</span>
        </div>
    );

    return (
        <div className="hidden print:block bg-white text-slate-900 p-12 max-w-[900px] mx-auto min-h-screen font-sans">
            {/* Header / Brand */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl italic">N</div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">NEXUS HRM</h1>
                            <p className="text-[10px] font-bold tracking-[0.4em] text-slate-500 uppercase mt-1 text-nowrap">Official Personnel Dossier</p>
                        </div>
                    </div>
                    <div className="mt-8">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{employee.fullName}</h2>
                        <p className="text-lg font-bold text-slate-500 flex items-center gap-2 mt-1">
                            {employee.jobTitle} <span className="text-slate-300">|</span> <span className="text-sm font-black tracking-widest uppercase">{employee.employeeCode || 'ID: ' + employee.id.slice(0, 8)}</span>
                        </p>
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Status</p>
                    <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-widest">VERIFIED RECORD</span>
                    <div className="pt-4">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Printed On</p>
                        <p className="text-xs font-bold text-slate-700">{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-2 gap-x-12">
                {/* ID & Bio */}
                <Section title="Identity & Demographics" icon={User}>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Gender" value={employee.gender} />
                        <InfoRow label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'} />
                        <InfoRow label="Hometown" value={employee.hometown} />
                        <InfoRow label="Marital Status" value={employee.maritalStatus} />
                        <InfoRow label="National ID" value={employee.nationalId} />
                        <InfoRow label="Blood Group" value={employee.bloodGroup} />
                        <InfoRow label="Residential Address" value={employee.address} full />
                    </div>
                </Section>

                {/* Corporate Placement */}
                <Section title="Corporate Deployment" icon={Briefcase}>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Department" value={employee.departmentObj?.name || 'General Management'} />
                        <InfoRow label="System Role" value={employee.role} />
                        <InfoRow label="Employment Type" value={employee.employmentType} />
                        <InfoRow label="Deployment Date" value={employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A'} />
                        <InfoRow label="Reporting Manager" value={employee.supervisor?.fullName || 'Self-Managed'} full />
                    </div>
                </Section>

                {/* Financial Matrix */}
                <Section title="Financial Protocol" icon={Landmark}>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Base Compensation" value={`${employee.currency || 'GHS'} ${Number(employee.salary || 0).toLocaleString()}`} />
                        <InfoRow label="Bank Institution" value={employee.bankName} />
                        <InfoRow label="Account Number" value={employee.bankAccountNumber} />
                        <InfoRow label="Bank Branch" value={employee.bankBranch} />
                        <InfoRow label="Social Security (SSN)" value={employee.ssnitNumber} full />
                    </div>
                </Section>

                {/* Emergency & Family */}
                <Section title="Family & Emergency" icon={Heart}>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Next of Kin" value={employee.nextOfKinName} />
                        <InfoRow label="Relationship" value={employee.nextOfKinRelation} />
                        <InfoRow label="Kin Contact" value={employee.nextOfKinContact} full />
                        <div className="col-span-2 pt-2 border-t border-slate-100 mt-2">
                            <InfoRow label="Emergency S.O.S Name" value={employee.emergencyContactName} />
                            <InfoRow label="Emergency S.O.S Contact" value={employee.emergencyContactPhone} />
                        </div>
                    </div>
                </Section>
            </div>

            {/* Full Width Sections */}
            <div className="mt-4">
                {/* Academic Dossier */}
                <Section title="Academic & Professional Dossier" icon={BookOpen}>
                    <div className="grid grid-cols-1 gap-4">
                        <InfoRow label="Highest Educational Tier" value={employee.education} full />
                        {employee.certifications && (
                            <div className="mt-4 space-y-3">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Professional Certifications</p>
                                {(() => {
                                    try {
                                        const certs = typeof employee.certifications === 'string' ? JSON.parse(employee.certifications) : employee.certifications;
                                        return Array.isArray(certs) ? certs.map((c: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                                <span className="text-xs font-bold text-slate-700">{c.name}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">{c.authority} · {c.issueDate}</span>
                                            </div>
                                        )) : <p className="text-xs italic text-slate-400">No certified credentials logged.</p>;
                                    } catch { return null; }
                                })()}
                            </div>
                        )}
                    </div>
                </Section>

                {/* Performance Analytics */}
                <Section title="Performance & Institutional Value" icon={Activity}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Appraisal History</p>
                                {employee.appraisalPackets?.length > 0 ? (
                                    employee.appraisalPackets.filter((p: any) => p.status !== 'CANCELLED').slice(0, 5).map((packet: any) => {
                                        const score = packet.finalScore ?? (packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' || r.reviewStage === 'SUPERVISOR')?.overallRating || 0);
                                        return (
                                            <div key={packet.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                                <div className="text-[11px] font-bold text-slate-700">
                                                    {packet.cycle?.title} ({packet.cycle?.period || 'Annual'}) 
                                                    {packet.finalScore != null && <span className="ml-2 text-[8px] font-black text-emerald-600 uppercase">Arbitrated</span>}
                                                </div>
                                                <div className={cn("text-xs font-black", score >= 80 ? "text-emerald-600" : "text-slate-600")}>
                                                    {score > 0 || packet.status === 'COMPLETED' ? `${score}%` : 'N/A'}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs italic text-slate-400">No historical performance assessments.</p>
                                )}
                            </div>
                            <div className="space-y-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Critical Goal Progression</p>
                                {employee.targetsAssignedToMe?.length > 0 ? (
                                    employee.targetsAssignedToMe.slice(0, 3).map((target: any) => (
                                        <div key={target.id} className="space-y-1 py-2">
                                            <div className="flex justify-between text-[11px] font-bold text-slate-700">
                                                <span className="line-clamp-1">{target.title}</span>
                                                <span>{Math.round(target.progress || 0)}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-400" style={{ width: `${target.progress || 0}%` }} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs italic text-slate-400">No strategic goals tracked.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Footer Signature Block */}
            <div className="mt-16 pt-12 border-t-2 border-slate-900 grid grid-cols-2 gap-24">
                <div className="space-y-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Authentication Signature</p>
                    <div className="border-b border-slate-900 w-full h-12" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Head of Human Capital / Director</p>
                </div>
                <div className="text-right flex flex-col justify-end italic text-[10px] text-slate-400 font-medium">
                    This document is a certified extract from the Nexus HRM core engine. 
                    Unauthorized duplication or tampering is strictly prohibited under institutional security protocol.
                </div>
            </div>
        </div>
    );
};

export default EmployeePrintDossier;
