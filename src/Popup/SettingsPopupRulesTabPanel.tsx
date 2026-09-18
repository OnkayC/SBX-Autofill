import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Stack, Switch, Tab, Tabs, TextField } from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserAutofillRuleStore } from '../Content/Autofill/BrowserAutofillRuleStorage';
import type { StoredAutofillSiteRule } from '../Content/Autofill/AutofillRuleStore';
import { createRuleDraft, ruleFromDraft, RuleDraft } from '../Settings/RuleDraft';

const ruleStore = createBrowserAutofillRuleStore();
export default function SettingsPopupRulesTabPanel({ value, index }: { value: number; index: number }) {
  const [t] = useTranslation('global');
  const txt = (key: string, fallback: string) => t(`settings-page.${key}`, { defaultValue: fallback });
  const [section, setSection] = useState(0);
  const [rules, setRules] = useState<StoredAutofillSiteRule[]>([]);
  const [draft, setDraft] = useState(createRuleDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(true);
  const [importConfirm, setImportConfirm] = useState(false);
  const refresh = useCallback(async () => {
    const exported = await ruleStore.export();
    setRules((JSON.parse(exported) as { rules: StoredAutofillSiteRule[] }).rules);
    setJson(exported);
  }, []);
  useEffect(() => { void refresh().catch(e => setError(String(e))).finally(() => setBusy(false)); }, [refresh]);
  const run = async (operation: () => Promise<void>, message = '') => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); setNotice(message); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const reset = () => { setDraft(createRuleDraft()); setEditing(null); setSection(0); setError(''); };
  const save = () => run(async () => {
    const rule = ruleFromDraft(draft);
    if (editing) await ruleStore.update(editing, rule); else await ruleStore.add(rule);
    await refresh(); reset();
  }, txt('rule-saved', 'Rule saved.'));
  const field = (key: string, title: string, val: string, change: (value: string) => void, help: string, placeholder = '') => <div className="settings-field">
    <label htmlFor={`rule-${key}`}>{txt(key, title)}</label><div><TextField id={`rule-${key}`} value={val} disabled={busy} onChange={e => change(e.target.value)} placeholder={placeholder} multiline={key !== 'id'} minRows={1} inputProps={{ 'aria-describedby': `rule-${key}-help` }} /><small id={`rule-${key}-help`}>{txt(`${key}-help`, help)}</small></div>
  </div>;
  const update = <K extends keyof RuleDraft>(key: K, val: RuleDraft[K]) => setDraft(previous => ({ ...previous, [key]: val }));
  const selector = (role: keyof RuleDraft['selectors'], title: string, example: string) => field(role, title, draft.selectors[role], val => update('selectors', { ...draft.selectors, [role]: val }), 'CSS selectors, one per line. Commas within a selector are preserved.', example);
  const download = () => void run(async () => {
    const blob = new Blob([await ruleStore.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'sbx-autofill-rules.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  if (value !== index) return null;
  return <>
    <Tabs value={section} onChange={(_, next: number) => { setSection(next); setError(''); setNotice(''); }} aria-label={txt('rule-management', 'Rule management')}>
      <Tab disabled={busy} id="configured-tab" aria-controls="configured-panel" label={txt('configured', 'Configured rules')} />
      <Tab disabled={busy} id="new-rule-tab" aria-controls="new-rule-panel" label={editing ? txt('edit-rule', 'Edit rule') : txt('setup-rule', 'Set up new rule')} />
    </Tabs>
    {error && <Alert severity="error">{error}</Alert>}{notice && <p role="status" style={{ marginBottom: 20 }}>{notice}</p>}
    <div role="tabpanel" id="configured-panel" aria-labelledby="configured-tab" hidden={section !== 0}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 24 }}><p>{txt('rule-priority', 'The first enabled rule matching the site and path takes priority.')}</p><Button variant="contained" disabled={busy} onClick={() => { setNotice(''); setError(''); setEditing(null); setDraft(createRuleDraft()); setSection(1); }}>{txt('add-rule', 'Add rule')}</Button></div>
      {!rules.length ? <p style={{ padding: '32px 0' }}>{busy ? txt('loading', 'Loading settings…') : txt('no-rules', 'No rules yet. Add a rule for a site that needs custom field mapping.')}</p> : <table className="settings-rules-table"><thead><tr><th>{txt('rule', 'Rule')}</th><th>{txt('site-path', 'Site and path')}</th><th>{txt('enabled', 'Enabled')}</th><th>{txt('actions', 'Actions')}</th></tr></thead><tbody>{rules.map(rule => <tr key={rule.id}><td>{rule.id}</td><td>{rule.origins.join(', ')}<p>{rule.pathPrefixes?.join(', ') || txt('all-paths', 'All paths')}</p></td><td><Switch disabled={busy} checked={rule.enabled !== false} inputProps={{ 'aria-label': `${txt('enabled', 'Enabled')}: ${rule.id}` }} onChange={(_, enabled) => void run(async () => { await ruleStore.setEnabled(rule.id, enabled); await refresh(); })} /></td><td><IconButton aria-label={`${txt('edit', 'Edit')} ${rule.id}`} disabled={busy} onClick={() => { setNotice(''); setError(''); setDraft(createRuleDraft(rule)); setEditing(rule.id); setSection(1); }}><EditOutlined /></IconButton><IconButton aria-label={`${txt('delete', 'Delete')} ${rule.id}`} disabled={busy} onClick={() => setRemoveId(rule.id)}><DeleteOutline /></IconButton></td></tr>)}</tbody></table>}
      <Accordion sx={{ mt: 4 }}><AccordionSummary expandIcon={<ExpandMore />}><span>{txt('bulk', 'Edit / import all rules')}</span></AccordionSummary><AccordionDetails><Stack spacing={2}>
        <p>{txt('bulk-help', 'Saving this document replaces all configured rules. Download a backup before making bulk changes.')}</p>
        <TextField label={txt('rules-json', 'Rules JSON')} multiline minRows={10} value={json} disabled={busy} onChange={e => setJson(e.target.value)} />
        <div className="settings-actions"><Button component="label" variant="outlined" disabled={busy}>{txt('load-file', 'Load file')}<input hidden type="file" accept=".json,application/json" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(async () => { if (file.size > 1_000_000) throw new Error('Rule document exceeds the 1 MB limit.'); setJson(await file.text()); }); }} /></Button><Button disabled={busy} variant="contained" onClick={() => setImportConfirm(true)}>{txt('replace-rules', 'Replace all rules')}</Button><Button disabled={busy} onClick={download}>{txt('download-rules', 'Download backup')}</Button><Button disabled={busy} onClick={() => void run(refresh)}>{txt('reload', 'Reload saved rules')}</Button></div>
      </Stack></AccordionDetails></Accordion>
    </div>
    <div role="tabpanel" id="new-rule-panel" aria-labelledby="new-rule-tab" hidden={section !== 1}>
      <form onSubmit={e => { e.preventDefault(); void save(); }}><div className="settings-columns"><div>
        <section className="settings-section"><h2>{txt('site-scope', 'Site scope')}</h2><p>{txt('scope-description', 'Define which site and pages this rule applies to.')}</p>
          {field('id', 'Rule ID', draft.id, val => update('id', val), 'A unique name using letters, numbers, dots, hyphens or underscores.', 'my-site-login')}
          {field('origins', 'Website origins', draft.origins, val => update('origins', val), 'Exact origins including http:// or https://, one per line. No paths or wildcards.', 'https://example.test')}
          {field('paths', 'Path prefixes (optional)', draft.paths, val => update('paths', val), 'One per line, starting with /. Paths are case-sensitive. Leave empty for all paths.', '/login')}
        </section>
        <section className="settings-section"><h2>{txt('field-mapping', 'Field mapping')}</h2><p>{txt('mapping-description', 'Tell SBX Autofill which fields to use on the page.')}</p>{selector('username', 'Username field', '#username')}{selector('currentPassword', 'Current password field', '#password')}</section>
        <Accordion><AccordionSummary expandIcon={<ExpandMore />}>{txt('advanced', 'Advanced fields (optional)')}</AccordionSummary><AccordionDetails>
          {selector('oneTimeCode', 'One-time code field', '#otp')}{selector('newPassword', 'New password field', '#new-password')}{selector('ignore', 'Ignored fields', '#search')}
          <div style={{ marginTop: 28 }}><FormControlLabel control={<Switch checked={draft.disableHeuristics} disabled={busy} onChange={(_, checked) => update('disableHeuristics', checked)} />} label={txt('disable-heuristics', 'Use only these mappings on matching pages')} /></div>
          <FormControlLabel control={<Switch checked={draft.enabled} disabled={busy} onChange={(_, checked) => update('enabled', checked)} />} label={txt('rule-enabled', 'Enable this rule')} />
          <h3 style={{ marginTop: 24 }}>{txt('security-answers', 'Security questions')}</h3><p>{txt('security-help', 'Map the displayed question to its answer field. The question must match a custom-field name in Strongbox. Do not enter answers here.')}</p>
          {draft.securityAnswers.map((mapping, i) => <section className="settings-section" key={i}>{field(`question-${i}`, 'Question selector', mapping.questionSelector, val => update('securityAnswers', draft.securityAnswers.map((m, j) => j === i ? { ...m, questionSelector: val } : m)), 'Select the element containing the question.')}{field(`answer-${i}`, 'Answer selector', mapping.answerSelector, val => update('securityAnswers', draft.securityAnswers.map((m, j) => j === i ? { ...m, answerSelector: val } : m)), 'Select the input that receives the answer.')}<Button disabled={busy} onClick={() => update('securityAnswers', draft.securityAnswers.filter((_, j) => j !== i))}>{txt('remove-mapping', 'Remove mapping')}</Button></section>)}
          <Button disabled={busy} onClick={() => update('securityAnswers', [...draft.securityAnswers, { questionSelector: '', answerSelector: '' }])}>{txt('add-mapping', 'Add question mapping')}</Button>
        </AccordionDetails></Accordion>
        <div className="settings-actions"><Button type="submit" variant="contained" disabled={busy}>{editing ? txt('save-changes', 'Save changes') : txt('add-rule', 'Add rule')}</Button><Button variant="outlined" disabled={busy} onClick={reset}>{txt('cancel', 'Cancel')}</Button></div><p style={{ fontSize: 12, marginTop: 12 }}>{editing ? txt('preserve-order', 'This rule keeps its place in the configured list.') : txt('append-note', 'Added after your existing rules. Existing rules stay unchanged.')}</p>
      </div><aside className="settings-help"><h2>{txt('about-rule', 'About this rule')}</h2><p>{txt('about-rule-description', 'A rule identifies the fields to fill on the sites and paths you specify.')}</p><section><h3>{txt('scope', 'Scope')}</h3><p>{draft.origins || txt('enter-origin', 'Enter a website origin to define where this rule applies.')}</p><p style={{ marginTop: 12 }}>{draft.paths || txt('all-paths', 'All paths')}</p></section><section><h3>{txt('rule-preview', 'Rule preview')}</h3><p>{txt('preview-description', 'The configuration that will be validated and saved.')}</p><pre className="settings-code">{JSON.stringify(ruleFromDraft(draft), null, 2).replace(/\[\n\s+("[^\n]*")\n\s+\]/g, '[$1]')}</pre></section><section><h3>{txt('selector-guidance', 'Choosing selectors')}</h3><p>{txt('selector-help', 'Prefer a stable, unique field ID. A selector that matches several fields may prevent autofill. Rules store selectors, never credentials.')}</p></section></aside></div></form>
    </div>
    <Dialog open={removeId !== null} onClose={() => !busy && setRemoveId(null)}><DialogTitle>{txt('delete-rule', 'Delete rule?')}</DialogTitle><DialogContent>{removeId}</DialogContent><DialogActions><Button disabled={busy} onClick={() => setRemoveId(null)}>{txt('cancel', 'Cancel')}</Button><Button disabled={busy} color="error" onClick={() => void run(async () => { await ruleStore.remove(removeId as string); await refresh(); setRemoveId(null); })}>{txt('delete', 'Delete')}</Button></DialogActions></Dialog>
    <Dialog open={importConfirm} onClose={() => !busy && setImportConfirm(false)}><DialogTitle>{txt('replace-rules', 'Replace all rules')}</DialogTitle><DialogContent>{txt('replace-warning', 'This replaces the entire configured list with the JSON document. Have you downloaded a backup?')}</DialogContent><DialogActions><Button onClick={() => setImportConfirm(false)} disabled={busy}>{txt('cancel', 'Cancel')}</Button><Button disabled={busy} onClick={() => { setImportConfirm(false); void run(async () => { await ruleStore.import(json); await refresh(); }, txt('rule-saved', 'Rule saved.')); }}>{txt('replace', 'Replace')}</Button></DialogActions></Dialog>
  </>;
}
