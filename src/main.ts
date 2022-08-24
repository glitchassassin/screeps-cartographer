export * from 'lib';

import { runTestScenarios } from 'tests';

export const loop = () => {
  runTestScenarios();
};
