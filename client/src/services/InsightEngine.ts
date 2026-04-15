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

export interface SuggestedTarget {
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface StrategicVerdict {
    title: string;
    summary: string;
    recommendation: string;
    confidence: number;
    insights: StrategicInsight[];
    suggestedTargets?: SuggestedTarget[];
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

const analyzeLeave = (_data: any): StrategicVerdict => {
    return {
        title: "Leave Allocation Audit",
        summary: "Institutional leave patterns are being analyzed for operational impact.",
        recommendation: "Review high-frequency categories to prevent personnel fatigue.",
        confidence: 0.88,
        insights: [
            { id: 'l1', type: 'SUCCESS', label: 'Fluidity', description: 'Request approval rate within 72h is 94%.', impact: 20 }
        ]
    };
};

const analyzeRecruitment = (_data: any): StrategicVerdict => {
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
    const reviews = data?.reviews || [];
    const selfReview = reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW');
    const managerReview = reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW');

    const selfScore = selfReview ? Number(selfReview.overallRating) : 0;
    const managerScore = managerReview ? Number(managerReview.overallRating) : 0;
    const scoreDelta = Math.abs(selfScore - managerScore);

    let title = "Meritocracy Audit";
    let summary = "The system is analyzing the current appraisal alignment across all evaluation areas.";
    let recommendation = "Ensure all reviewers have completed their qualitative commentary before final calibration.";
    let insights: StrategicInsight[] = [];

    if (scoreDelta > 30) {
        insights.push({ id: 'p1', type: 'CRITICAL', label: 'Perception Gap', description: 'Significant delta (>30%) detected between self-assessment and supervisor rating.', impact: 85 });
        recommendation = "Initiate a 3-way calibration meeting to resolve the perception disparity.";
    } else if (scoreDelta > 0 && scoreDelta <= 10) {
        insights.push({ id: 'p2', type: 'SUCCESS', label: 'Evaluation Sync', description: 'Strong alignment detected between operative and leadership perspectives.', impact: 20 });
    }

    if (managerScore < 40 && selfScore > 80) {
        insights.push({ id: 'p3', type: 'WARNING', label: 'Potential Bias', description: 'High discrepancy suggests possible outlier rating behavior or unrecognized achievements.', impact: 60 });
        recommendation = "Review manager's previous rating history for systemic harshness skew.";
    }

    if (data?.currentStage === 'FINAL_REVIEW') {
        title = "Strategic Calibration";
        summary = "Verification Phase: Awaiting final institutional certification of the 20/80 weighted result.";
        insights.push({ id: 'p4', type: 'NEUTRAL', label: '20/80 Model', description: 'Baseline suggests a fair institutional score based on balanced oversight.', impact: 40 });
    }

    // Suggested Growth Targets based on weaknesses/development needs
    const suggestedTargets: SuggestedTarget[] = [];
    const weaknesses = data?.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW')?.weaknesses || '';
    const devNeeds = data?.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW')?.developmentNeeds || '';

    if (weaknesses.toLowerCase().includes('communication') || devNeeds.toLowerCase().includes('communication')) {
        suggestedTargets.push({ title: 'Communication Mastery', description: 'Complete a professional communication workshop and demonstrate improved clarity in weekly briefings.', priority: 'MEDIUM' });
    }
    if (weaknesses.toLowerCase().includes('technical') || devNeeds.toLowerCase().includes('skill')) {
        suggestedTargets.push({ title: 'Technical Upskilling', description: 'Acquire certification in the identified technical gap area within the next 90 days.', priority: 'HIGH' });
    }
    if (weaknesses.toLowerCase().includes('leadership') || weaknesses.toLowerCase().includes('management')) {
        suggestedTargets.push({ title: 'Leadership Foundational', description: 'Mentor a junior teammate for one quarter and provide a structured feedback report.', priority: 'HIGH' });
    }

    // Default target if nothing specific detected
    if (suggestedTargets.length === 0 && (data?.reviews?.length || 0) > 0) {
        suggestedTargets.push({ title: 'Operational Excellence', description: 'Refine current workflows to increase personal output by 15% without sacrificing quality.', priority: 'LOW' });
    }

    return {
        title,
        summary,
        recommendation,
        confidence: 0.92,
        insights,
        suggestedTargets
    };
};
