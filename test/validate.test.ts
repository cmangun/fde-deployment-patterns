import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import {
  validateConfig,
  getPatternRecommendations,
  DeploymentConfigSchema,
} from '../src/validate.js';

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('DeploymentConfigSchema', () => {
  it('validates a minimal valid config', () => {
    const config = {
      apiVersion: 'fde/v1',
      kind: 'Deployment',
      metadata: {
        name: 'test-service',
        namespace: 'default',
        environment: 'development',
      },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          port: 80,
          resources: {
            cpu: '100m',
            memory: '256Mi',
          },
        },
        scaling: {
          minReplicas: 1,
          maxReplicas: 3,
        },
        rollout: {
          type: 'rolling',
        },
      },
    };

    const result = DeploymentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects invalid apiVersion', () => {
    const config = {
      apiVersion: 'v1',
      kind: 'Deployment',
      metadata: {
        name: 'test',
        namespace: 'default',
        environment: 'development',
      },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          port: 80,
          resources: { cpu: '100m', memory: '256Mi' },
        },
        scaling: { minReplicas: 1, maxReplicas: 3 },
        rollout: { type: 'rolling' },
      },
    };

    const result = DeploymentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects invalid environment', () => {
    const config = {
      apiVersion: 'fde/v1',
      kind: 'Deployment',
      metadata: {
        name: 'test',
        namespace: 'default',
        environment: 'invalid-env',
      },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          port: 80,
          resources: { cpu: '100m', memory: '256Mi' },
        },
        scaling: { minReplicas: 1, maxReplicas: 3 },
        rollout: { type: 'rolling' },
      },
    };

    const result = DeploymentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('validates resource format', () => {
    const validResources = [
      { cpu: '100m', memory: '256Mi' },
      { cpu: '1', memory: '1Gi' },
      { cpu: '2000m', memory: '512Mi' },
    ];

    validResources.forEach((resources) => {
      const config = {
        apiVersion: 'fde/v1',
        kind: 'Deployment',
        metadata: { name: 'test', namespace: 'default', environment: 'development' },
        spec: {
          service: { name: 'test', image: 'nginx', port: 80, resources },
          scaling: { minReplicas: 1, maxReplicas: 3 },
          rollout: { type: 'rolling' },
        },
      };
      expect(DeploymentConfigSchema.safeParse(config).success).toBe(true);
    });
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('validateConfig', () => {
  it('returns valid result for good config', () => {
    const config = {
      apiVersion: 'fde/v1',
      kind: 'Deployment',
      metadata: {
        name: 'test-service',
        namespace: 'default',
        environment: 'development',
      },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          port: 80,
          resources: { cpu: '100m', memory: '256Mi' },
          healthCheck: { path: '/health', port: 80 },
        },
        scaling: { minReplicas: 1, maxReplicas: 3 },
        rollout: { type: 'rolling' },
        observability: { metricsEnabled: true },
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for invalid config', () => {
    const config = {
      apiVersion: 'fde/v1',
      kind: 'Deployment',
      metadata: {
        name: '',
        namespace: 'default',
        environment: 'development',
      },
      spec: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('warns about missing health check', () => {
    const config = {
      apiVersion: 'fde/v1',
      kind: 'Deployment',
      metadata: { name: 'test', namespace: 'default', environment: 'development' },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          port: 80,
          resources: { cpu: '100m', memory: '256Mi' },
        },
        scaling: { minReplicas: 1, maxReplicas: 3 },
        rollout: { type: 'rolling' },
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('health check'))).toBe(true);
  });

  it('warns about production with low replicas', () => {
    const config = {
      apiVersion: 'fde/v1',
      kind: 'Deployment',
      metadata: { name: 'test', namespace: 'default', environment: 'production' },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          port: 80,
          resources: { cpu: '100m', memory: '256Mi' },
        },
        scaling: { minReplicas: 1, maxReplicas: 3 },
        rollout: { type: 'rolling' },
      },
    };

    const result = validateConfig(config);
    expect(result.warnings.some((w) => w.includes('minReplicas < 2'))).toBe(true);
  });
});

// ============================================================================
// Sample File Test
// ============================================================================

describe('Sample deployment file', () => {
  it('validates the sample deployment.yaml', () => {
    const content = readFileSync('examples/deployment.sample.yaml', 'utf-8');
    const config = parseYaml(content);
    const result = validateConfig(config);

    expect(result.valid).toBe(true);
    expect(result.config?.metadata.name).toBe('llm-service');
    expect(result.config?.metadata.environment).toBe('production');
  });
});

// ============================================================================
// Pattern Recommendations Tests
// ============================================================================

describe('getPatternRecommendations', () => {
  it('recommends patterns for production', () => {
    const config = {
      apiVersion: 'fde/v1' as const,
      kind: 'Deployment' as const,
      metadata: {
        name: 'test',
        namespace: 'default',
        environment: 'production' as const,
      },
      spec: {
        service: {
          name: 'test',
          image: 'nginx',
          tag: 'latest',
          port: 80,
          resources: { cpu: '100m', memory: '256Mi' },
        },
        scaling: { minReplicas: 2, maxReplicas: 5 },
        rollout: { type: 'rolling' as const },
      },
    };

    const recommendations = getPatternRecommendations(config);
    expect(recommendations.some((r) => r.includes('observability'))).toBe(true);
  });
});
