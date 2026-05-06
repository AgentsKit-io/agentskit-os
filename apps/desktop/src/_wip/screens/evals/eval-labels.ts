import type { EvalCadence, EvalStatus } from './use-evals'

export const EVAL_STATUS_LABEL: Record<EvalStatus, string> = {
  passing: 'Passing',
  regressed: 'Regressed',
  running: 'Running',
  failing: 'Failing',
}

export const EVAL_CADENCE_LABEL: Record<EvalCadence, string> = {
  on_pr: 'On PR',
  nightly: 'Nightly',
  manual: 'Manual',
}
