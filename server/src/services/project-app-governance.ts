export interface ProjectAppQuota {
  maxAppsPerProject: number
  label: string
}

const APP_QUOTAS: Record<string, ProjectAppQuota> = {
  starter: { maxAppsPerProject: 1, label: 'Starter' },
  pro: { maxAppsPerProject: 3, label: 'Pro' },
  agency: { maxAppsPerProject: 10, label: 'Agency' },
  enterprise: { maxAppsPerProject: 25, label: 'Enterprise' },
}

export function getProjectAppQuota(planId: string): ProjectAppQuota {
  return APP_QUOTAS[planId] ?? APP_QUOTAS.starter
}

export function getProjectAppQuotaError(planId: string, currentCount: number): string | null {
  const quota = getProjectAppQuota(planId)
  if (quota.maxAppsPerProject < 0 || currentCount < quota.maxAppsPerProject) return null

  return `Tu plan ${quota.label} permite hasta ${quota.maxAppsPerProject} app${quota.maxAppsPerProject === 1 ? '' : 's'} por proyecto.`
}
