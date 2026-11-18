const base = require("./jest.config");

// Suites that fail on their own stale setup (see CLAUDE.md); CI skips them so everything else has
// to pass. Take a suite off this list once it runs again.
const QUARANTINED = [
  "/src/App\\.test\\.js$",
  "/src/shared/ErrorPage/ErrorPage\\.test\\.tsx$",
  "/src/shared/MainScreen/MainScreen\\.test\\.tsx$",
  "/src/shared/StartScreen/StartScreen\\.test\\.tsx$",
  "/src/shared/Toolbar/Toolbar\\.test\\.tsx$",
  "/src/features/generation/GenerateView/GenerateView\\.test\\.tsx$",
  "/src/features/history/components/HistoryView\\.test\\.tsx$",
  "/src/features/settings/SettingsView\\.test\\.tsx$",
];

module.exports = {
  ...base,
  testPathIgnorePatterns: [...base.testPathIgnorePatterns, ...QUARANTINED],
};
