import 'dotenv/config';
import sampleFlow from '../../examples/sample-flow.json';
import type { Flow } from '../types.js';
import { runWorkflow } from './engine.js';
import { createLangfuseObserver } from './langfuse.js';
import { createWorkflowProviders } from './providers/index.js';

const input =
  process.argv.slice(2).join(' ').trim() ||
  'What are the main benefits of retrieval-augmented generation?';

try {
  const result = await runWorkflow({
    flowId: 'sample-research-flow',
    userId: 'local-sample-runner',
    flow: sampleFlow as Flow,
    input,
    providers: createWorkflowProviders(),
    observer: createLangfuseObserver(),
  });
  console.log(
    JSON.stringify(
      {
        runId: result.runId,
        status: result.status,
        order: result.steps.map((step) => step.nodeId),
        output: result.output,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Sample workflow failed.');
  process.exitCode = 1;
}
