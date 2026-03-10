export const plans = {
    starter: { id: 'starter', name: 'Starter', price: 0, monthlyCredits: 50, maxAgents: 2 },
    pro: { id: 'pro', name: 'Pro', price: 29, monthlyCredits: 500, maxAgents: 7 },
    agency: { id: 'agency', name: 'Agency', price: 99, monthlyCredits: 2500, maxAgents: -1 },
    enterprise: { id: 'enterprise', name: 'Enterprise', price: 299, monthlyCredits: 10000, maxAgents: -1 },
};
export function getPlan(planId) {
    return plans[planId] ?? plans.starter;
}
export const creditPackages = [
    { id: 'pack-500', name: '500 Créditos', credits: 500, price: 29, popular: false },
    { id: 'pack-2000', name: '2,000 Créditos', credits: 2000, price: 99, popular: true },
    { id: 'pack-5000', name: '5,000 Créditos', credits: 5000, price: 199, popular: false },
];
export function getCreditPackage(packageId) {
    return creditPackages.find(p => p.id === packageId);
}
//# sourceMappingURL=plans.js.map