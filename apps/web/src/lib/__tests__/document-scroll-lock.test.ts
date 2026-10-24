import {
  acquireDocumentScrollLock,
  clearDocumentScrollLock,
  getDocumentScrollLockCount,
  releaseDocumentScrollLock,
} from "../document-scroll-lock";

function installDom(initial?: { root?: string; body?: string; overscroll?: string }) {
  const root = { style: { overflow: initial?.root ?? "" } };
  const body = {
    style: {
      overflow: initial?.body ?? "",
      overscrollBehavior: initial?.overscroll ?? "",
    },
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: root,
      body,
    },
  });
  return { root, body };
}

describe("document-scroll-lock", () => {
  afterEach(() => {
    clearDocumentScrollLock();
  });

  it("locks once when two callers acquire, and restores only after the last release", () => {
    const { root, body } = installDom();

    acquireDocumentScrollLock();
    acquireDocumentScrollLock();

    expect(getDocumentScrollLockCount()).toBe(2);
    expect(root.style.overflow).toBe("hidden");
    expect(body.style.overflow).toBe("hidden");
    expect(body.style.overscrollBehavior).toBe("none");

    releaseDocumentScrollLock();
    expect(getDocumentScrollLockCount()).toBe(1);
    expect(root.style.overflow).toBe("hidden");

    releaseDocumentScrollLock();
    expect(getDocumentScrollLockCount()).toBe(0);
    expect(root.style.overflow).toBe("");
    expect(body.style.overflow).toBe("");
    expect(body.style.overscrollBehavior).toBe("");
  });

  it("does not restore a nested leftover hidden value after stacked release", () => {
    const { root } = installDom();

    acquireDocumentScrollLock();
    acquireDocumentScrollLock();
    releaseDocumentScrollLock();
    releaseDocumentScrollLock();

    expect(root.style.overflow).toBe("");
  });

  it("clears a leftover inline lock from a previous session", () => {
    const { root, body } = installDom({
      root: "hidden",
      body: "hidden",
      overscroll: "none",
    });

    clearDocumentScrollLock();

    expect(root.style.overflow).toBe("");
    expect(body.style.overflow).toBe("");
    expect(body.style.overscrollBehavior).toBe("");
  });
});
