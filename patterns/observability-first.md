# Observability-First Deployment Pattern

## Overview

Deploy services with comprehensive observability as a prerequisite, not an afterthought. Every production service must be observable before it receives traffic.

## When to Use

- Any production deployment
- Services with SLAs or compliance requirements
- Debugging-critical systems
- Multi-team or complex architectures

## Pattern Structure

```
                         ┌─────────────────────────────────┐
                         │      Observability Platform      │
                         │  ┌─────────┐ ┌─────────┐        │
                         │  │ Metrics │ │ Traces  │        │
                         │  │(Prom)   │ │(Jaeger) │        │
                         │  └────▲────┘ └────▲────┘        │
                         │       │           │             │
                         │  ┌────┴───────────┴────┐        │
                         │  │      Logs           │        │
                         │  │    (Loki/ES)        │        │
                         │  └──────────▲──────────┘        │
                         └─────────────┼──────────────────-┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────┐
│                                      │                               │
│  ┌─────────────┐    ┌───────────────┴────────────────┐              │
│  │   Service   │───▶│      Instrumentation Layer       │              │
│  │   Code      │    │  - Metrics (counters, histograms)│              │
│  │             │    │  - Traces (spans, context)       │              │
│  │             │    │  - Logs (structured, correlated) │              │
│  └─────────────┘    └────────────────────────────────┘              │
│                                                                      │
│                              Your Service                            │
└──────────────────────────────────────────────────────────────────────┘
```

## Three Pillars

### 1. Metrics

- **Golden Signals**: Latency, Traffic, Errors, Saturation
- **Business Metrics**: Request types, user actions, conversions
- **Infrastructure Metrics**: CPU, memory, disk, network

### 2. Traces

- **Distributed Tracing**: Follow requests across services
- **Context Propagation**: Pass trace IDs through all calls
- **Span Attributes**: Add business context to spans

### 3. Logs

- **Structured Logging**: JSON with consistent fields
- **Correlation IDs**: Link logs to traces
- **Contextual Information**: Include relevant business data

## Key Moves

### 1. Instrument Before Deploy

```typescript
// Every endpoint gets these metrics
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
```

### 2. Define SLIs/SLOs Early

| SLI | Target | Measurement |
|-----|--------|-------------|
| Availability | 99.9% | successful_requests / total_requests |
| Latency (p99) | < 500ms | request_duration_seconds |
| Error Rate | < 0.1% | error_requests / total_requests |

### 3. Build Dashboards Before Launch

- Service overview dashboard
- Error investigation dashboard
- Performance analysis dashboard

### 4. Set Up Alerts

```yaml
groups:
  - name: service-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
```

## Required Artifacts

| Artifact | Purpose | Owner |
|----------|---------|-------|
| SLI/SLO Document | Define service expectations | Product + Engineering |
| Dashboard JSON | Service visibility | SRE |
| Alert Rules | Proactive monitoring | SRE |
| Runbook | Incident response | SRE |

## Configuration Example

```yaml
apiVersion: fde/v1
kind: Deployment
spec:
  observability:
    metricsEnabled: true
    metricsPort: 9090
    metricsPath: /metrics
    
    tracingEnabled: true
    tracingEndpoint: http://jaeger:14268/api/traces
    tracingSampleRate: 0.1  # 10% in production
    
    loggingLevel: info
    loggingFormat: json
    loggingFields:
      - service
      - version
      - trace_id
      - span_id
```

## Anti-Patterns

❌ **Don't**: Deploy without metrics endpoint  
❌ **Don't**: Use print statements instead of structured logging  
❌ **Don't**: Skip trace context propagation  
❌ **Don't**: Create dashboards after incidents

## Success Criteria

- [ ] All endpoints expose /metrics
- [ ] Traces propagate through all service calls
- [ ] Logs include correlation IDs
- [ ] Dashboards provide full service visibility
- [ ] Alerts fire before users notice issues
