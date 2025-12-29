#!/usr/bin/env node
/**
 * FDE Deployment Pattern Validator CLI
 *
 * Usage: fde-validate <deployment.yaml>
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { validateConfig, getPatternRecommendations } from './validate.js';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
FDE Deployment Pattern Validator

Usage:
  fde-validate <deployment.yaml>
  fde-validate --help

Options:
  -h, --help    Show this help message
  -v, --version Show version

Examples:
  fde-validate examples/deployment.sample.yaml
  fde-validate ./my-service/deployment.yaml
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('fde-deployment-patterns v0.1.0');
    process.exit(0);
  }

  const filePath = args[0];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const config = parseYaml(content);

    console.log(`\n🔍 Validating: ${filePath}\n`);

    const result = validateConfig(config);

    if (!result.valid) {
      console.log('❌ Validation FAILED\n');
      console.log('Errors:');
      result.errors.forEach((err) => console.log(`  • ${err}`));
      process.exit(1);
    }

    console.log('✅ Validation PASSED\n');

    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach((warn) => console.log(`  • ${warn}`));
      console.log('');
    }

    // Show pattern recommendations
    const recommendations = getPatternRecommendations(result.config!);
    if (recommendations.length > 0) {
      console.log('📋 Pattern Recommendations:');
      recommendations.forEach((rec) => console.log(`  • ${rec}`));
      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`  Name: ${result.config!.metadata.name}`);
    console.log(`  Namespace: ${result.config!.metadata.namespace}`);
    console.log(`  Environment: ${result.config!.metadata.environment}`);
    console.log(`  Service: ${result.config!.spec.service.name}`);
    console.log(`  Scaling: ${result.config!.spec.scaling.minReplicas}-${result.config!.spec.scaling.maxReplicas} replicas`);
    console.log(`  Rollout: ${result.config!.spec.rollout.type}`);
    console.log('');

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        console.error(`❌ File not found: ${filePath}`);
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
    }
    process.exit(1);
  }
}

main();
