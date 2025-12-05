import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders app', () => {
  render(<App />);
  // App should render without crashing
  expect(document.body).toBeInTheDocument();
});
