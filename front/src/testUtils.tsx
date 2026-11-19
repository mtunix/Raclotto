import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, type RouteObject, RouterProvider, useLocation } from "react-router";
import { SWRConfig } from "swr";
import { ConfigProvider } from "antd";

function CurrentPath() {
    return <p data-testid="current-path">{useLocation().pathname}</p>;
}

// Messages render outside the tree under test, and with motion `message.destroy()` would leave them in the DOM.
ConfigProvider.config({
    holderRender: (children) => <ConfigProvider theme={{ token: { motion: false } }}>{children}</ConfigProvider>,
});

/** Where the app navigated to, once it left the routes under test. */
export const currentPath = () => screen.getByTestId("current-path").textContent;

type RenderOptions = {
    /** Keep SWR's global cache, for components that invalidate through the global `mutate`. */
    sharedCache?: boolean;
};

/**
 * Renders `routes` in a data router at `path`, with any other path showing `currentPath()`.
 * Each render gets a fresh SWR cache unless `sharedCache` is set.
 */
export function renderRoutes(routes: RouteObject[], path: string, options: RenderOptions = {}) {
    const router = createMemoryRouter([...routes, { path: "*", element: <CurrentPath /> }], {
        initialEntries: [path],
    });
    const swr = options.sharedCache ? { dedupingInterval: 0 } : { provider: () => new Map(), dedupingInterval: 0 };
    // jsdom never fires transitionend, so antd's motion would keep closed modals mounted.
    const result = render(
        <ConfigProvider theme={{ token: { motion: false } }}>
            <SWRConfig value={swr}>
                <RouterProvider router={router} />
            </SWRConfig>
        </ConfigProvider>,
    );
    return { router, ...result };
}

/**
 * Lets the responses to requests already made, and the renders they cause, land inside act, for a
 * test whose last assertion needs nothing more to arrive.
 */
export async function settle() {
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}

/** Renders `element` alone at `/`. */
export function renderRoute(element: ReactNode, options: RenderOptions = {}) {
    return renderRoutes([{ path: "/", element }], "/", options);
}

/** Renders what follows at `width` px wide, as antd's breakpoints see it; reset after each test. */
export function setViewportWidth(width: number) {
    window.innerWidth = width;
}
