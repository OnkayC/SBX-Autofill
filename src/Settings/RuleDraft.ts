import type { StoredAutofillSiteRule } from '../Content/Autofill/AutofillRuleStore';

export const ruleSelectorRoles = ['username', 'currentPassword', 'oneTimeCode', 'newPassword', 'ignore'] as const;
export interface RuleDraft {
  id: string;
  origins: string;
  paths: string;
  selectors: Record<typeof ruleSelectorRoles[number], string>;
  securityAnswers: NonNullable<StoredAutofillSiteRule['securityAnswers']>;
  enabled: boolean;
  disableHeuristics: boolean;
}
export function createRuleDraft(rule?: StoredAutofillSiteRule): RuleDraft {
  return {
    id: rule?.id || '', origins: rule?.origins.join('\n') || '', paths: rule?.pathPrefixes?.join('\n') || '',
    selectors: Object.fromEntries(ruleSelectorRoles.map(role => [role, rule?.selectors[role]?.join('\n') || ''])) as RuleDraft['selectors'],
    securityAnswers: rule?.securityAnswers?.map(mapping => ({ ...mapping })) || [],
    enabled: rule?.enabled !== false, disableHeuristics: rule?.disableHeuristics === true
  };
}
function lines(value: string) { return value.split('\n').map(line => line.trim()).filter(Boolean); }
export function ruleFromDraft(draft: RuleDraft): StoredAutofillSiteRule {
  const paths = lines(draft.paths);
  return {
    id: draft.id.trim(), origins: lines(draft.origins), ...(paths.length ? { pathPrefixes: paths } : {}),
    selectors: Object.fromEntries(ruleSelectorRoles.filter(role => lines(draft.selectors[role]).length).map(role => [role, lines(draft.selectors[role])])),
    ...(draft.securityAnswers.length ? { securityAnswers: draft.securityAnswers.map(mapping => ({ answerSelector: mapping.answerSelector.trim(), questionSelector: mapping.questionSelector.trim() })) } : {}),
    enabled: draft.enabled, disableHeuristics: draft.disableHeuristics
  };
}
