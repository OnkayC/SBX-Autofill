import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";

function harness() {
  const dom = new JSDOM(
    '<form><input id="username" autocomplete="username" value="synthetic-user"><input id="password" type="password"></form>',
    { url: "https://example.test" },
  );
  const { document } = dom.window;
  for (const input of document.querySelectorAll("input")) {
    input.getBoundingClientRect = () => ({
      width: 200,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 200,
    });
    input.getClientRects = () => [input.getBoundingClientRect()];
  }
  const timers = new Map();
  let nextTimer = 0;
  const setTimer = (callback, delay) => {
    timers.set(++nextTimer, { callback, delay });
    return nextTimer;
  };
  const mocks = {
    "webextension-polyfill": {
      default: { storage: { onChanged: { addListener() {} } } },
    },
    "../Utils": { Utils: { isMacintosh: () => true } },
    "../Settings/SettingsStore": {
      SettingsStore: {
        getSettings: async () => ({ showInlineIconAndPopupMenu: true }),
        setSettings() {},
      },
    },
    "../Settings/Settings": {
      Settings: {
        isUrlIsInDoNotShowInlineMenusList: () => false,
        isUrlPageIsInDoNotShowInlineMenusList: () => false,
      },
    },
    "./Autofill/BrowserAutofillRuleStorage": {
      createBrowserAutofillRuleStore: () => ({ load: async () => [] }),
    },
    "./Iframe/iframeManager": {
      IframeComponentTypes: { InlineMiniFieldMenu: 0 },
      IframeManager: class {
        visible = false;
        initialize() {
          this.visible = true;
        }
        remove() {
          this.visible = false;
        }
      },
    },
  };
  function load(path) {
    const output = ts.transpileModule(
      readFileSync(new URL(path, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      },
    ).outputText;
    const module = { exports: {} };
    Function(
      "module",
      "exports",
      "require",
      "document",
      "window",
      "HTMLInputElement",
      "setTimeout",
      "clearTimeout",
      output,
    )(
      module,
      module.exports,
      (name) => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        throw new Error(`Unexpected runtime dependency: ${name}`);
      },
      document,
      dom.window,
      dom.window.HTMLInputElement,
      setTimer,
      (id) => timers.delete(id),
    );
    return module.exports;
  }
  mocks["./Autofill/AutofillEngine"] = load(
    "../src/Content/Autofill/AutofillEngine.ts",
  );
  mocks["../Messaging/Protocol/AutoFillCredential"] = {};
  const { ContentScriptManager } = load(
    "../src/Content/ContentScriptManager.ts",
  );
  const manager = new ContentScriptManager();
  manager.getStatus = async () => null;
  manager.copyTotpCodeIfConfiguredAfterFill = () => {};
  const username = document.querySelector("#username");
  const password = document.querySelector("#password");
  return {
    manager,
    username,
    password,
    dom,
    async settle() {
      for (let i = 0; i < 20; i++) await Promise.resolve();
    },
    async runTimers(delay) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === delay && timers.delete(id)) timer.callback();
      }
      await this.settle();
    },
    close() {
      manager.removeFocusListener();
      manager.autofillEngine.dispose();
      dom.window.close();
    },
  };
}

const credential = {
  username: "synthetic-user",
  password: "synthetic-password",
  url: "https://example.test",
};

test("successful username-initiated autofill cancels the blur queued when entering the menu", async () => {
  const h = harness();
  try {
    h.username.focus();
    h.manager.addFocusListener();
    await h.manager.autoShowInlineMenuIfFocusedInputRecognized();
    await h.settle();
    assert.equal(h.manager.iframeManager.visible, true);
    h.username.blur();
    const result = await h.manager.autoFillWithCredential(
      credential,
      false,
      h.username,
    );
    assert.equal(result.status, "complete");
    assert.equal(h.password.value, credential.password);
    assert.equal(h.dom.window.document.activeElement, h.password);
    assert.equal(h.manager.iframeManager.visible, false);
    await h.runTimers(200);
    await h.runTimers(500);
    assert.equal(
      h.manager.iframeManager.visible,
      false,
      "menu must stay dismissed after successful autofill",
    );
  } finally {
    h.close();
  }
});

for (const pendingStage of ["settings", "status"]) {
  test(`successful autofill invalidates a pending ${pendingStage} lookup even after listeners resume`, async () => {
    const h = harness();
    try {
      h.username.focus();
      h.manager.addFocusListener();
      h.manager.iframeManager.visible = true;
      let release;
      const pending = new Promise((resolve) => {
        release = resolve;
      });
      if (pendingStage === "settings")
        h.manager.shouldAutoShowInlineMenuOnFocus = () => pending;
      else h.manager.getStatus = () => pending;
      const opening = h.manager.autoShowInlineMenuIfFocusedInputRecognized();
      await h.settle();
      await h.manager.autoFillWithCredential(credential, false, h.username);
      await h.runTimers(500);
      release(pendingStage === "settings" ? true : null);
      await opening;
      await h.settle();
      assert.equal(
        h.manager.iframeManager.visible,
        false,
        "stale menu lookup must not undo dismissal",
      );
    } finally {
      h.close();
    }
  });
}

test("a later user focus still opens the menu after successful autofill", async () => {
  const h = harness();
  try {
    h.username.focus();
    h.manager.addFocusListener();
    await h.manager.autoFillWithCredential(credential, false, h.username);
    await h.runTimers(500);
    h.username.focus();
    await h.settle();
    assert.equal(h.manager.iframeManager.visible, true);
  } finally {
    h.close();
  }
});

test("single-field autofill also cancels pending blur work", async () => {
  const h = harness();
  try {
    h.password.focus();
    h.manager.addFocusListener();
    h.password.blur();
    await h.manager.autoFillSingleField("synthetic-value", h.password);
    await h.runTimers(200);
    await h.runTimers(500);
    assert.equal(h.password.value, "synthetic-value");
    assert.equal(h.manager.iframeManager.visible, false);
  } finally {
    h.close();
  }
});

test("manual menu opening remains available when automatic listeners are off", async () => {
  const h = harness();
  try {
    h.password.focus();
    await h.manager.forceShowInlineMenuOnCurrentInput();
    assert.equal(h.manager.iframeManager.visible, true);
  } finally {
    h.close();
  }
});
