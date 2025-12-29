/**
 * Deployment Configuration Validator
 *
 * Validates deployment.yaml files against standard FDE patterns.
 */

import { z } from 'zod';

// ============================================================================
// Schema Definitions
// ============================================================================

export const EnvironmentSchema = z.enum(['development', 'staging', 'production']);

export const ResourceLimitsSchema = z.object({
  cpu: z.string().regex(/^\d+m?$/, 'CPU must be like "100m" or "1"'),
  memory: z.string().regex(/^\d+(Mi|Gi)$/, 'Memory must be like "256Mi" or "1Gi"'),
});

export const ScalingConfigSchema = z.object({
  minReplicas: z.number().int().min(1),
  maxReplicas: z.number().int().min(1),
  targetCPUUtilization: z.number().min(1).max(100).optional(),
});

export const NetworkPolicySchema = z.object({
  ingressAllowed: z.array(z.string()).optional(),
  egressAllowed: z.array(z.string()).optional(),
  egressBlocked: z.array(z.string()).optional(),
});

export const ObservabilityConfigSchema = z.object({
  metricsEnabled: z.boolean(),
  metricsPort: z.number().int().min(1).max(65535).optional(),
  tracingEnabled: z.boolean().optional(),
  loggingLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export const RolloutStrategySchema = z.object({
  type: z.enum(['rolling', 'blue-green', 'canary']),
  maxSurge: z.string().optional(),
  maxUnavailable: z.string().optional(),
  canaryPercentage: z.number().min(0).max(100).optional(),
});

export const HealthCheckSchema = z.object({
  path: z.string(),
  port: z.number().int(),
  initialDelaySeconds: z.number().int().optional(),
  periodSeconds: z.number().int().optional(),
  timeoutSeconds: z.number().int().optional(),
});

export const ServiceConfigSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  tag: z.string().default('latest'),
  port: z.number().int().min(1).max(65535),
  resources: ResourceLimitsSchema,
  healthCheck: HealthCheckSchema.optional(),
});

export const DeploymentConfigSchema = z.object({
  apiVersion: z.literal('fde/v1'),
  kind: z.literal('Deployment'),
  metadata: z.object({
    name: z.string().min(1),
    namespace: z.string().min(1),
    environment: EnvironmentSchema,
    labels: z.record(z.string()).optional(),
  }),
  spec: z.object({
    service: ServiceConfigSchema,
    scaling: ScalingConfigSchema,
    rollout: RolloutStrategySchema,
    network: NetworkPolicySchema.optional(),
    observability: ObservabilityConfigSchema.optional(),
  }),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: DeploymentConfig;
}

/**
 * Validate a deployment configuration object.
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = DeploymentConfigSchema.safeParse(config);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      ),
      warnings: [],
    };
  }

  // Additional business logic validations
  const warnings: string[] = [];
  const cfg = result.data;

  // Warn if scaling is aggressive
  if (cfg.spec.scaling.maxReplicas > 10) {
    warnings.push('High maxReplicas (>10) may cause cost overruns');
  }

  // Warn if no health check
  if (!cfg.spec.service.healthCheck) {
    warnings.push('No health check defined - recommended for production');
  }

  // Warn if observability not enabled
  if (!cfg.spec.observability?.metricsEnabled) {
    warnings.push('Metrics not enabled - recommended for production');
  }

  // Production-specific warnings
  if (cfg.metadata.environment === 'production') {
    if (cfg.spec.scaling.minReplicas < 2) {
      warnings.push('Production deployment with minReplicas < 2');
    }
    if (cfg.spec.rollout.type === 'rolling' && !cfg.spec.rollout.maxUnavailable) {
      warnings.push('Production rolling update without maxUnavailable specified');
    }
  }

  return {
    valid: true,
    errors: [],
    warnings,
    config: cfg,
  };
}

/**
 * Get pattern recommendations based on config.
 */
export function getPatternRecommendations(config: DeploymentConfig): string[] {
  const recommendations: string[] = [];

  if (config.spec.network?.egressAllowed?.length === 0) {
    recommendations.push('Consider "secure-edge" pattern for restricted egress');
  }

  if (config.metadata.environment === 'production') {
    recommendations.push('Apply "observability-first" pattern for production');
    recommendations.push('Review "hybrid-bridge" pattern if on-prem connectivity needed');
  }

  return recommendations;
}
