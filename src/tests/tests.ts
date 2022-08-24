export enum TestResult {
  FAIL = 'FAIL',
  PASS = 'PASS',
  PENDING = 'PENDING'
}

export const config = {
  retries: 3,
  timeout: CREEP_LIFE_TIME
};
