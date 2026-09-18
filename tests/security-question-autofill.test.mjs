import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

function load(relative) {
  const output = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const module = { exports: {} };
  Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}

const url = 'https://atlasauth.b2clogin.com/f50ebcfb-eadd-41d8-9099-a7049d073f5c/B2C_1A_atoproduction_Atlas_SUSI/api/SelfAsserted/confirmed';
const configuredRules = JSON.parse(readFileSync(new URL('../docs/autofill-rules/atlas.json', import.meta.url), 'utf8')).rules;
const { AutofillEngine } = load('../src/Content/Autofill/AutofillEngine.ts');
const { AutofillCoordinator } = load('../src/Background/AutofillCoordinator.ts');
const credential = {
  username: 'synthetic-user', password: 'not-a-security-answer', url,
  customFields: {
    first: { key: 'Favorite food?', value: 'synthetic-food', concealable: true },
    second: { key: "Sibling's middle name?", value: 'synthetic-name', concealable: true },
    legacy: { key: 'kba3_response', value: 'obsolete-answer', concealable: true }
  }
};

function fixture(pageUrl = url) {
  // Display order is deliberately different from the stable question numbers.
  const dom = new JSDOM(`<form id="attributeVerification">
    <input id="signInNameReadOnly" disabled value="synthetic-user">
    <label>Security question 1*</label><p id="kbq3ReadOnly">Sibling's middle name?</p>
    <input id="kba3_response" type="password" autocomplete="new-password">
    <label>Security question 2*</label><p id="kbq2aReadOnly">Favorite food?</p>
    <input id="kba2_response" type="password" autocomplete="new-password">
    <button>Continue</button></form>`, { url: pageUrl });
  for (const e of dom.window.document.querySelectorAll('input,p')) {
    Object.defineProperties(e, { offsetHeight: { value: 30 }, offsetWidth: { value: 240 } });
    e.getBoundingClientRect = () => ({ width: 240, height: 30, x: 0, y: 0, top: 0, left: 0, bottom: 30, right: 240 });
    e.getClientRects = () => [e.getBoundingClientRect()];
  }
  const engine = new AutofillEngine(dom.window.document, configuredRules);
  return { dom, engine, document: dom.window.document, close: () => { engine.dispose(); dom.window.close(); } };
}

for (const trigger of ['toolbar', 'inline']) {
  test(`fills security answers by question text despite a leftover control-ID field through ${trigger}`, async () => {
    const f = fixture();
    try {
      let submitted = false;
      f.document.querySelector('form').addEventListener('submit', () => { submitted = true; });
      const answer = f.document.querySelector('#kba2_response');
      assert.equal((await f.engine.inspect(answer)).focusedRole, 'security-answer');
      assert.equal((await f.engine.inspect()).candidateCount, 2);
      const result = await f.engine.fill({ credential, trigger, initiator: trigger === 'inline' ? answer : null });
      assert.equal(result.status, 'complete');
      assert.equal(result.customFieldSatisfied, 2);
      assert.equal(result.passwordSatisfied, 0);
      assert.equal(f.document.querySelector('#kba2_response').value, 'synthetic-food');
      assert.equal(f.document.querySelector('#kba3_response').value, 'synthetic-name');
      assert.equal(submitted, false);
    } finally { f.close(); }
  });
}

test('fills both answers when refresh selects the b question-prompt variant', async () => {
  const f = fixture();
  try {
    f.document.querySelector('#kbq2aReadOnly').id = 'kbq2bReadOnly';
    const result = await f.engine.fill({ trigger: 'toolbar', credential });
    assert.equal(result.customFieldSatisfied, 2);
    assert.equal(result.status, 'complete');
    assert.equal(f.document.querySelector('#kba2_response').value, 'synthetic-food');
    assert.equal(f.document.querySelector('#kba3_response').value, 'synthetic-name');
  } finally { f.close(); }
});

test('main toolbar coordinator preserves custom fields and aggregates partial custom fills', async () => {
  const f = fixture();
  try {
    const coordinator = new AutofillCoordinator({
      getFrames: async () => [{ frameId: 0, parentFrameId: -1, url }],
      inspectFrame: async () => f.engine.inspect(),
      fillFrame: async (_tab, _frame, request) => f.engine.fill(request),
      confirmOriginMismatch: async () => { throw new Error('Top frame requires no prompt'); }
    });
    const result = await coordinator.coordinate({ tabId: 1, trigger: 'toolbar',
      credential: { ...credential, customFields: { first: credential.customFields.first } } });
    assert.equal(result.status, 'partial');
    assert.equal(result.customFieldSatisfied, 1);
    assert.equal(f.document.querySelector('#kba3_response').value, '');
  } finally { f.close(); }
});

test('follows changed question text while the input IDs remain fixed', async () => {
  const f = fixture();
  try {
    f.document.querySelector('#kbq2aReadOnly').textContent = "Sibling's middle name?";
    f.document.querySelector('#kbq3ReadOnly').textContent = 'Favorite food?';
    const result = await f.engine.fill({ trigger: 'toolbar', credential });
    assert.equal(result.customFieldSatisfied, 2);
    assert.equal(f.document.querySelector('#kba2_response').value, 'synthetic-name');
    assert.equal(f.document.querySelector('#kba3_response').value, 'synthetic-food');
  } finally { f.close(); }
});

for (const [name, fields] of [
  ['missing', {}],
  ['display-number only', { a: { key: '安全性问题 1*', value: 'wrong' } }],
  ['control-ID only', { a: { key: 'kba2_response', value: 'wrong' } }],
  ['ambiguous', { a: { key: 'Favorite food?', value: 'a' }, b: { key: 'Favorite food？', value: 'b' } }],
  ['malformed', { a: { key: 'Favorite food?', value: { nested: 'not-a-string' } } }]
]) {
  test(`skips ${name} custom-field matches without falling back to the login password`, async () => {
    const f = fixture();
    try {
      const result = await f.engine.fill({ trigger: 'toolbar', credential: { ...credential, customFields: fields } });
      assert.equal(result.customFieldSatisfied, 0);
      assert.equal(result.passwordSatisfied, 0);
      for (const e of f.document.querySelectorAll('input[type=password]')) assert.equal(e.value, '');
    } finally { f.close(); }
  });
}

for (const [name, mutate, trigger] of [
  ['page-load', () => {}, 'page-load'],
  ['disabled answers', d => d.querySelectorAll('input[type=password]').forEach(e => e.disabled = true), 'toolbar'],
  ['hidden answers', d => d.querySelectorAll('input[type=password]').forEach(e => e.style.display = 'none'), 'toolbar'],
  ['readonly answers', d => d.querySelectorAll('input[type=password]').forEach(e => e.readOnly = true), 'toolbar'],
  ['missing question prompts', d => d.querySelectorAll('p').forEach(e => e.remove()), 'toolbar']
]) {
  test(`does not fill security answers for ${name}`, async () => {
    const f = fixture();
    try {
      mutate(f.document);
      const result = await f.engine.fill({ trigger, credential });
      assert.notEqual(result.status, 'complete');
      for (const e of f.document.querySelectorAll('input[type=password]')) assert.equal(e.value, '');
    } finally { f.close(); }
  });
}

for (const pageUrl of [url.replace('atlasauth.', 'other.'), url.replace('Atlas_SUSI', 'Atlas_PASSWORDRESET'), url.replace('Atlas_SUSI', 'Atlas_SU')]) {
  test(`does not use Atlas custom mappings on ${pageUrl}`, async () => {
    const f = fixture(pageUrl);
    try {
      const result = await f.engine.fill({ trigger: 'toolbar', credential });
      assert.notEqual(result.status, 'complete');
      for (const e of f.document.querySelectorAll('input[type=password]')) assert.equal(e.value, '');
    } finally { f.close(); }
  });
}

test('custom origin and selectors work without any site-specific engine behavior', async () => {
  const f = fixture('https://accounts.example.test/challenge');
  try {
    f.document.querySelector('#kba2_response').id = 'answer-food';
    f.document.querySelector('#kba3_response').id = 'answer-name';
    f.document.querySelector('#kbq2aReadOnly').id = 'prompt-food';
    f.document.querySelector('#kbq3ReadOnly').id = 'prompt-name';
    f.engine.replaceRules([{
      id: 'custom-challenge', origins: ['https://accounts.example.test'], pathPrefixes: ['/challenge'], selectors: {},
      securityAnswers: [
        { answerSelector: '#answer-food', questionSelector: '#prompt-food' },
        { answerSelector: '#answer-name', questionSelector: '#prompt-name' }
      ]
    }]);
    assert.equal((await f.engine.fill({ trigger: 'toolbar', credential })).customFieldSatisfied, 2);
    assert.equal(f.document.querySelector('#answer-food').value, 'synthetic-food');
    assert.equal(f.document.querySelector('#answer-name').value, 'synthetic-name');
  } finally { f.close(); }
});

test('removing rules removes both site-specific recognition and custom filling', async () => {
  const f = fixture();
  try {
    f.engine.replaceRules([]);
    assert.equal((await f.engine.inspect()).candidateCount, 0);
    await f.engine.fill({ trigger: 'toolbar', credential });
    for (const input of f.document.querySelectorAll('input[type=password]')) assert.equal(input.value, '');
  } finally { f.close(); }
});

for (const [name, mutate] of [
  ['overlapping mappings', rule => rule.securityAnswers.push({ ...rule.securityAnswers[1] })],
  ['broad answer selectors', rule => rule.securityAnswers[1].answerSelector = 'input[type=password]'],
  ['ambiguous prompt selectors', rule => rule.securityAnswers[1].questionSelector = 'p'],
  ['missing prompt selectors', rule => rule.securityAnswers[1].questionSelector = '#absent']
]) {
  test(`skips ${name} without password fallback`, async () => {
    const f = fixture();
    try {
      const rule = structuredClone(configuredRules[0]);
      mutate(rule);
      f.engine.replaceRules([rule]);
      const result = await f.engine.fill({ trigger: 'toolbar', credential });
      assert.notEqual(result.status, 'complete');
      assert.equal(f.document.querySelector('#kba2_response').value, '');
      assert.equal(result.passwordSatisfied, 0);
    } finally { f.close(); }
  });
}
