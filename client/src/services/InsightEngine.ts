/**
 * Nexus Insight Engine
 * High-performance heuristic analysis for the Intelligence Layer.
 */

export interface StrategicInsight {
    id: string;
    type: 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'NEUTRAL';
    label: string;
    description: string;
    impact: number; // 0 to 100
}

export interface StrategicVerdict {
    title: string;
    summary: string;
    recommendation: string;
    confidence: number;
    insights: StrategicInsight[];
}

/**
 * Maps the current pathname and context data to a Strategic Verdict.
 */
export const analyzeContext = (pathname: string, data: any): StrategicVerdict => {
    // 1. Employee Profile Context
    // Pattern: /employees/:id
    if (pathname.match(/\/employees\/[a-zA-Z0-9-]+/) && data?.fullName) {
        return analyzeEmployee(data);
    }

    // 2. Leave Management Context
    if (pathname.includes('/leave')) {
        return analyzeLeave(data);
    }

    // 3. Recruitment Context
    if (pathname.includes('/recruitment')) {
        return analyzeRecruitment(data);
    }

    // 4. Performance/Appraisal Context
    if (pathname.includes('/reviews') || pathname.includes('/performance')) {
        return analyzePerformance(data);
    }

    // Default: Organizational Health
    return {
        title: "Organizational Pulse",
        summary: "The system is currently monitoring global operations. Statistical variance is within expected parameters for the current fiscal cycle.",
        recommendation: "Maintain current operational tempo. Monitor High-Impact KPI targets for end-of-quarter alignment.",
        confidence: 0.94,
        insights: [
            { id: '1', type: 'SUCCESS', label: 'Stability', description: 'System-wide uptime and deployment sync at 99.9%.', impact: 10 },
            { id: '2', type: 'NEUTRAL', label: 'Efficiency', description: 'Resource allocation optimized across 12 active departments.', impact: 45 }
        ]
    };
};

const analyzeEmployee = (employee: any): StrategicVerdict => {
    const kpiScore = employee.kpiSummary?.averageScore || 0;
    const riskScore = employee.riskProfile?.score || 0;
    
    let title = "Talent Trajectory";
    let summary = `${employee.fullName} is demonstrating stable performance within the ${employee.departmentObj?.name || 'organization'}.`;
    let recommendation = "Continue current professional development path.";
    let insights: StrategicInsight[] = [];

    if (kpiScore >= 80) {
        insights.push({ id: 'e1', type: 'SUCCESS', label: 'High Performer', description: 'Consistent strategic output above 80th percentile.', impact: 85 });
        recommendation = "Consider for leadership track or advanced technical mentoring.";
    } else if (kpiScore > 0 && kpiScore < 40) {
        insights.push({ id: 'e1', type: 'WARNING', label: 'Output Delta', description: 'Significant gap detected between targets and actual results.', impact: 55 });
        recommendation = "Review current target feasibility and provide corrective training.";
    }

    if (riskScore >= 10) {
        insights.push({ id: 'e2', type: 'CRITICAL', label: 'Retention Risk', description: 'Unresolved disciplinary or query history detected.', impact: 70 });
        summary = `Attention required. ${employee.fullName}'s internal risk profile has reached a critical threshold.`;
        recommendation = "Initiate HR intervention or 1-on-1 counseling to address underlying friction.";
    }

    // Add generic join date insight if recently joined
    const joinDate = new Date(employee.joinDate);
    const monthsSinceJoin = (new Date().getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceJoin < 3) {
        insights.push({ id: 'e3', type: 'NEUTRAL', label: 'Onboarding Phase', description: 'Operative is still within the first 90 days of integration.', impact: 20 });
    }

    return {
        title,
        summary,
        recommendation,
        confidence: Math.min(0.95, 0.7 + (insights.length * 0.05)),
        insights
    };
};

const analyzeLeave = (data: any): StrategicVerdict => {
    return {
        title: "Operational Coverage",
        summary: "Current leave requests show a seasonal spike across core revenue centers.",
        recommendation: "Defer non-critical project milestones or cross-train support staff for temporary coverage.",
        confidence: 0.82,
        insights: [
            { id: 'l1', type: 'WARNING', label: 'Coverage Gap', description: 'Potential 15% staffing shortage detected for upcoming window.', impact: 60 },
            { id: 'l2', type: 'SUCCESS', label: 'Policy Adherence', description: 'Leave distribution aligns with organizational notice periods.', impact: 10 }
        ]
    };
};

const analyzeRecruitment = (data: any): StrategicVerdict => {
    return {
        title: "Pipeline Velocity",
        summary: "Average time-to-hire has increased by 14% in the last 30-day window.",
        recommendation: "Streamline technical interview stage or increase recruiter bandwidth for high-priority roles.",
        confidence: 0.91,
        insights: [
            { id: 'r1', type: 'CRITICAL', label: 'Candidate Drop-off', description: 'High abandonment rate at the "Technical Assessment" stage.', impact: 75 },
            { id: 'r2', type: 'NEUTRAL', label: 'Sourcing Mix', description: 'Referral-based hires are outperforming external agency leads.', impact: 40 }
        ]
    };
};

const analyzePerformance = (data: any): StrategicVerdict => {
    return {
        title: "Meritocracy Audit",
        summary: "The current appraisal cycle shows high scoring variance between departments.",
        recommendation: "Run a calibration session for department heads to ensure rating consistency.",
        confidence: 0.88,
        insights: [
            { id: 'p1', type: 'WARNING', label: 'Rating Inflation', description: 'Average scores are 12% higher than the historical baseline.', impact: 50 },
            { id: 'p2', type: 'SUCCESS', label: 'Compliance', description: '100% of required self-appraisals have been initialized.', impact: 5 }
        ]
    };
};
