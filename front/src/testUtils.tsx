import React from "react";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouteObject, RouterProvider, useLocation } from "react-router";
import { SWRConfig } from "swr";

function CurrentPath() {
    return <p data-testid="current-path">{useLocation().pathname}</p>;
}

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
    const result = render(
        <SWRConfig value={swr}>
            <RouterProvider router={router} />
        </SWRConfig>,
    );
    return { router, ...result };
}

/** Renders `element` alone at `/`. */
export function renderRoute(element: React.ReactNode, options: RenderOptions = {}) {
    return renderRoutes([{ path: "/", element }], "/", options);
}
