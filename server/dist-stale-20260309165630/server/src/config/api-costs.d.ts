export declare const apiCostsPerMillionTokens: Record<string, {
    input: number;
    output: number;
}>;
export declare const toolApiCosts: Record<string, number>;
export declare function getProviderForModel(_model: string): 'anthropic';
export declare function calculateRealCost(model: string, inputTokens: number, outputTokens: number): number;
//# sourceMappingURL=api-costs.d.ts.map