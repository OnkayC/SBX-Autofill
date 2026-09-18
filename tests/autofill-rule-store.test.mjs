import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function loadTypeScriptModule(relativeUrl) {
  const filename = fileURLToPath(new URL(relativeUrl, import.meta.url));
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  Function(
    'module',
    'exports',
    'require',
    output
  )(module, module.exports, () => {
    throw new Error('AutofillRuleStore must depend only on its storage adapter');
  });
  return module.exports;
}

test('imports and persists a versioned exact-origin rule document', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  let saved = null;
  const storage = {
    load: async () => saved,
    save: async document => {
      saved = document;
    }
  };
  const store = new AutofillRuleStore(storage, selector => selector.startsWith('#'));
  const json = JSON.stringify({
    rules: [
      {
        enabled: true,
        id: 'bank-login',
        origins: ['https://bank.example.test'],
        pathPrefixes: ['/login'],
        selectors: {
          currentPassword: ['#password'],
          username: ['#username']
        }
      }
    ],
    version: 1
  });

  const rules = await store.import(json);

  assert.equal(rules.length, 1);
  assert.equal(saved.version, 1);
  assert.equal(saved.rules[0].id, 'bank-login');
  assert.equal(await store.export(), JSON.stringify(saved, null, 2));
});

test('rejects wildcard origins and invalid selectors', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  const store = new AutofillRuleStore({ load: async () => null, save: async () => undefined }, selector => selector.startsWith('#'));

  await assert.rejects(
    store.import(
      JSON.stringify({
        rules: [
          {
            id: 'unsafe',
            origins: ['https://*.example.test'],
            selectors: { username: ['input['] }
          }
        ],
        version: 1
      })
    ),
    /exact http or https origin/
  );
});

test('skips corrupted stored rules while retaining valid rules', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  const stored = {
    rules: [
      {
        id: 'corrupted',
        origins: ['https://*.example.test'],
        selectors: { username: ['#bad'] }
      },
      {
        id: 'valid-login',
        origins: ['https://login.example.test'],
        selectors: { username: ['#user'] }
      }
    ],
    version: 1
  };
  const store = new AutofillRuleStore({ load: async () => stored, save: async () => undefined }, selector => selector.startsWith('#'));

  const rules = await store.load();

  assert.deepEqual(
    rules.map(rule => rule.id),
    ['valid-login']
  );
});

test('imports, exports, disables and deletes security-answer rules without bundled defaults', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  let saved = null;
  const store = new AutofillRuleStore({ load: async () => saved, save: async value => { saved = value; } }, () => true);
  assert.deepEqual(await store.load(), []);
  const example = readFileSync(new URL('../docs/autofill-rules/atlas.json', import.meta.url), 'utf8');
  await store.import(example);
  assert.deepEqual((await store.load())[0].securityAnswers, JSON.parse(example).rules[0].securityAnswers);
  await store.import(await store.export());
  assert.equal((await store.load())[0].securityAnswers.length, 3);
  await store.setEnabled('atlas-visa', false);
  assert.deepEqual(await store.load(), []);
  await store.remove('atlas-visa');
  assert.deepEqual(JSON.parse(await store.export()).rules, []);
});

for (const mapping of [null, {}, { answerSelector: '#a' }, { answerSelector: '', questionSelector: '#q' }, { answerSelector: '#a', questionSelector: '[' }]) {
  test(`rejects malformed security-answer mapping ${JSON.stringify(mapping)}`, async () => {
    const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
    let saved = false;
    const store = new AutofillRuleStore({ load: async () => null, save: async () => { saved = true; } }, selector => selector.startsWith('#'));
    await assert.rejects(store.import(JSON.stringify({ version: 1, rules: [{ id: 'custom', origins: ['https://example.test'], selectors: {}, securityAnswers: [mapping] }] })), /invalid security-answer/);
    assert.equal(saved, false);
  });
}

test('adding a rule preserves existing rules, disabled state and priority', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  let saved = null;
  const store = new AutofillRuleStore({ load: async () => saved, save: async value => { saved = value; } }, selector => selector.startsWith('#'));
  await store.import(JSON.stringify({ version: 1, rules: [
    { id: 'existing', enabled: false, origins: ['https://example.test'], selectors: {}, securityAnswers: [{ answerSelector: '#a', questionSelector: '#q' }] }
  ] }));
  const existing = JSON.parse(await store.export()).rules[0];
  await store.add({ id: 'new-login', origins: ['https://example.test'], selectors: { username: ['#user'] } });
  assert.deepEqual(JSON.parse(await store.export()).rules[0], existing);
  assert.deepEqual(saved.rules.map(rule => rule.id), ['existing', 'new-login']);
  assert.deepEqual((await store.load()).map(rule => rule.id), ['new-login']);
  const before = await store.export();
  await assert.rejects(store.add({ id: 'existing', origins: ['https://other.test'], selectors: {} }), /unique, stable id/);
  await assert.rejects(store.add({ id: 'bad', origins: ['https://*.example.test'], selectors: {} }), /exact http or https origin/);
  await assert.rejects(store.add({ id: 'bad-selector', origins: ['https://example.test'], selectors: { username: ['['] } }), /invalid username selector/);
  assert.equal(await store.export(), before);
});

test('adding a rule enforces the stored rule limit without changing storage', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  const stored = { version: 1, rules: Array.from({ length: 500 }, (_, i) => ({ id: `rule-${i}`, origins: ['https://example.test'], selectors: {} })) };
  let writes = 0;
  const store = new AutofillRuleStore({ load: async () => stored, save: async () => { writes++; } }, () => true);
  await assert.rejects(store.add({ id: 'extra', origins: ['https://example.test'], selectors: {} }), /more than 500/);
  assert.equal(writes, 0);
});

test('editing preserves priority and other rules and rejects ID collisions', async () => {
  const { AutofillRuleStore } = loadTypeScriptModule('../src/Content/Autofill/AutofillRuleStore.ts');
  let saved;
  const store = new AutofillRuleStore({ load: async () => saved, save: async value => { saved = value; } }, () => true);
  const first = { id: 'first', enabled: false, origins: ['https://example.test'], selectors: { username: ['#user'] } };
  await store.import(JSON.stringify({ version: 1, rules: [first, { ...first, id: 'second' }] }));
  await store.update('first', { ...first, id: 'renamed', selectors: { username: ['#email'] } });
  assert.deepEqual(saved.rules.map(r => r.id), ['renamed', 'second']);
  assert.equal(saved.rules[0].enabled, false);
  const before = await store.export();
  await assert.rejects(store.update('renamed', { ...first, id: 'second' }), /unique/);
  await assert.rejects(store.update('missing', first), /no longer exists/);
  assert.equal(await store.export(), before);
});

test('rule form round-trips advanced fields and comma-containing selectors', () => {
  const { createRuleDraft, ruleFromDraft } = loadTypeScriptModule('../src/Settings/RuleDraft.ts');
  const original = { id: 'advanced', origins: ['https://example.test', 'https://other.test'], pathPrefixes: ['/login', '/SignIn'], selectors: { username: ['input:is(#user, #email)', '#username'], ignore: ['#search'] }, securityAnswers: [{ questionSelector: '#question', answerSelector: '#answer' }], enabled: false, disableHeuristics: true };
  const draft = createRuleDraft(original);
  assert.deepEqual(ruleFromDraft(draft), original);
  draft.securityAnswers[0].answerSelector = '#new-answer';
  assert.equal(original.securityAnswers[0].answerSelector, '#answer');
  assert.deepEqual(ruleFromDraft(createRuleDraft()).origins, []);
});
