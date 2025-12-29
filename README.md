# FDE Deployment Patterns

[![CI](https://github.com/cmangun/fde-deployment-patterns/actions/workflows/ci.yml/badge.svg)](https://github.com/cmangun/fde-deployment-patterns/actions/workflows/ci.yml)

A field library of reusable deployment patterns for forward-deployed AI/ML engagements.

## Overview

This repository provides battle-tested deployment patterns used in enterprise AI/ML deployments across regulated industries (healthcare, finance, pharmaceuticals). Each pattern includes documentation, validation tooling, and runnable examples.

## Pattern Catalog

| Pattern                                                | Use Case                                    |
| ------------------------------------------------------ | ------------------------------------------- |
| [Secure Edge](patterns/secure-edge.md)                 | Regulated networks, air-gapped environments |
| [Hybrid Bridge](patterns/hybrid-bridge.md)             | On-prem to cloud connectivity               |
| [Observability First](patterns/observability-first.md) | Production-ready monitoring                 |

## CLI Validator

Validate deployment configurations against FDE patterns:

```bash
# Install
npm install

# Build
npm run build

# Validate a deployment config
npm run validate -- examples/deployment.sample.yaml

# Or use directly
node dist/cli.js examples/deployment.sample.yaml
```

### Example Output

```
🔍 Validating: examples/deployment.sample.yaml

✅ Validation PASSED

📋 Pattern Recommendations:
  • Apply "observability-first" pattern for production
  • Review "hybrid-bridge" pattern if on-prem connectivity needed

📊 Summary:
  Name: llm-service
  Namespace: ai-platform
  Environment: production
  Service: llm-inference
  Scaling: 2-8 replicas
  Rollout: canary
```

## Configuration Schema

Deployment configurations follow the `fde/v1` schema:

```yaml
apiVersion: fde/v1
kind: Deployment
metadata:
  name: my-service
  namespace: ai-platform
  environment: production # development | staging | production

spec:
  service:
    name: my-service
    image: gcr.io/project/image
    tag: v1.0.0
    port: 8080
    resources:
      cpu: '1'
      memory: 2Gi
    healthCheck:
      path: /health
      port: 8080

  scaling:
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilization: 70

  rollout:
    type: canary # rolling | blue-green | canary
    canaryPercentage: 10

  network:
    egressAllowed:
      - api.external.com
    egressBlocked:
      - '*'

  observability:
    metricsEnabled: true
    tracingEnabled: true
```

## Templates

| Template                                          | Description                   |
| ------------------------------------------------- | ----------------------------- |
| [Runbook Template](templates/runbook-template.md) | Operational runbook structure |

## Quickstart

```bash
# Clone
git clone https://github.com/cmangun/fde-deployment-patterns.git
cd fde-deployment-patterns

# Install dependencies
npm install

# Run tests
npm test

# Build CLI
npm run build

# Validate example
npm run validate -- examples/deployment.sample.yaml
```

## How to Use

1. **Copy patterns to your repo**: `cp patterns/secure-edge.md docs/patterns/`
2. **Tailor constraints**: Modify for your specific environment
3. **Validate configs**: Use the CLI to check deployment files
4. **Follow templates**: Use runbook template for operational docs

## Next Iterations

- [ ] Add Kubernetes manifest generator from FDE config
- [ ] Add Helm chart validation
- [ ] Add Terraform module validation
- [ ] Add incident response templates
- [ ] Add cost estimation for deployment configs
- [ ] Add compliance mapping (SOC2, HIPAA, PCI)

## License

MIT © Christopher Mangun

---

**Portfolio**: [field-deployed-engineer.vercel.app](https://field-deployed-engineer.vercel.app/)  
**Contact**: Christopher Mangun — Brooklyn, NY
