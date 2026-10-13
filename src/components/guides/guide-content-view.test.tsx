import { describe, it, expect, afterEach } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
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

  it("a new jump reopens an entry the user closed, even to the same hash", async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <GuideContentView />
      </NextIntlClientProvider>,
    );
    const details = (id: string) => container.querySelector<HTMLDetailsElement>(`details#${id}`)!;
    const jump = async (id: string) => {
      if (location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
      await act(async () => window.dispatchEvent(new HashChangeEvent("hashchange")));
    };
    const close = (id: string) => act(() => {
      details(id).open = false;
      fireEvent(details(id), new Event("toggle"));
    });

    await jump("nightmare");
    expect(details("nightmare").open).toBe(true);
    close("nightmare");
    await jump("odyle-energy");
    await jump("nightmare");
    expect(details("nightmare").open).toBe(true);
    close("nightmare");
    await jump("nightmare");
    expect(details("nightmare").open).toBe(true);
  });
});
