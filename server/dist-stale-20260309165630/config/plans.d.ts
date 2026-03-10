export interface PlanConfig {
    id: string;
    name: string;
    price: number;
    monthlyCredits: number;
    maxAgents: number;
}
export declare const plans: Record<string, PlanConfig>;
export declare function getPlan(planId: string): PlanConfig;
export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    popular: boolean;
}
export declare const creditPackages: CreditPackage[];
export declare function getCreditPackage(packageId: string): CreditPackage | undefined;
//# sourceMappingURL=plans.d.ts.map