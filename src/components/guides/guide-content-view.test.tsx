import { describe, it, expect, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { GuideContentView } from "./guide-content-view";

afterEach(() => history.replaceState(null, "", "/"));

describe("GuideContentView", () => {
  it("opens the entry when a client navigation sets the hash after mount (no hashchange event)", async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <GuideContentView />
      </NextIntlClientProvider>,
    );
    // router.push updates the URL after the new page has rendered, without firing hashchange.
    history.pushState(null, "", "#nightmare");
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(container.querySelector<HTMLDetailsElement>("details#nightmare")?.open).toBe(true);
  });
});
