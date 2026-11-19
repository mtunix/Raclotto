import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { App } from "./App";
import { useAppStore } from "./AppSlice";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<App />}>
          <Route path="*" element={<p>page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAppStore.setState({ removeWidthCap: false });
});

it.each(["/", "/login", "/register"])("shows the logo above %s", (path) => {
  const { container } = renderAt(path);

  expect(screen.getByText("page")).toBeInTheDocument();
  expect(container.querySelector("img")).toBeInTheDocument();
});

it("leaves the logo to the session toolbar", () => {
  const { container } = renderAt("/test-session-key");

  expect(screen.getByText("page")).toBeInTheDocument();
  expect(container.querySelector("img")).not.toBeInTheDocument();
});

it("lifts the width cap when a view asks for it", () => {
  useAppStore.setState({ removeWidthCap: true });
  const { container } = renderAt("/");

  expect(container.querySelector(".app-content")).toHaveClass("no-max-width");
});
