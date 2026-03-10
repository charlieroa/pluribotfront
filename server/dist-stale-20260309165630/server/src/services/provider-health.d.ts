export type ProviderStatus = 'active' | 'no_key' | 'invalid_key' | 'no_credits' | 'error';
export interface ProviderHealth {
    provider: 'anthropic';
    status: ProviderStatus;
    label: string;
    message: string;
    checkedAt: string;
}
export declare function invalidateHealthCache(): void;
export declare function getProviderHealthStatus(): Promise<ProviderHealth[]>;
export declare function getDisabledProviders(): Promise<Set<string>>;
export declare function isProviderAvailable(provider: 'anthropic'): Promise<boolean>;
//# sourceMappingURL=provider-health.d.ts.map