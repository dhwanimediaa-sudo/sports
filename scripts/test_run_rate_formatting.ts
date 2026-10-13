import { resolveBroadcastDataContext } from '../src/utils/broadcastDataResolver';
import { getSampleScoringStateForSport } from '../src/utils/sampleBroadcastData';

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exit(1);
  }
}

console.log('--- Testing Run Rate Formatting Robustness ---');

// 1. Test sample scoring state
const sampleState = getSampleScoringStateForSport('CRICKET');
assert(typeof sampleState.currentRunRate === 'number', 'Sample cricket state has numeric currentRunRate');

// 2. Test string currentRunRate with resolveBroadcastDataContext
const stringContext = resolveBroadcastDataContext(
  { sport: 'CRICKET' } as any,
  {
    currentRunRate: '7.14',
    runRate: '7.14',
    requiredRunRate: '8.20',
  }
);
assert(stringContext.variables['{{CURRENT_RUN_RATE}}'] === '7.14', 'String currentRunRate formatted correctly');
assert(stringContext.variables['{{CRR}}'] === '7.14', 'String CRR formatted correctly');
assert(stringContext.variables['{{RRR}}'] === '8.20', 'String RRR formatted correctly');

// 3. Test numeric currentRunRate
const numContext = resolveBroadcastDataContext(
  { sport: 'CRICKET' } as any,
  {
    currentRunRate: 6.857,
    runRate: 6.857,
    requiredRunRate: 9.123,
  }
);
assert(numContext.variables['{{CURRENT_RUN_RATE}}'] === '6.86', 'Numeric currentRunRate formatted with 2 decimal places');
assert(numContext.variables['{{CRR}}'] === '6.86', 'Numeric CRR formatted with 2 decimal places');
assert(numContext.variables['{{RRR}}'] === '9.12', 'Numeric RRR formatted with 2 decimal places');

// 4. Test undefined / null currentRunRate
const emptyContext = resolveBroadcastDataContext(
  { sport: 'CRICKET' } as any,
  {
    currentRunRate: undefined,
    runRate: null,
    requiredRunRate: undefined,
  }
);
assert(emptyContext.variables['{{CURRENT_RUN_RATE}}'] === '0.00', 'Undefined currentRunRate defaults to 0.00');
assert(emptyContext.variables['{{CRR}}'] === '0.00', 'Undefined CRR defaults to 0.00');
assert(emptyContext.variables['{{RRR}}'] === '-', 'Undefined RRR defaults to -');

console.log('--- All Run Rate Formatting Tests PASSED! ---');
process.exit(0);
