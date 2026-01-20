import { render, screen } from '@testing-library/react';
import App from './App';

test('renders drawing app title and primary actions', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /simple drawing canvas/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /save as png/i })).toBeInTheDocument();
});

test('renders accessible drawing controls and canvas', () => {
  render(<App />);

  // Inputs should be labeled
  expect(screen.getByLabelText(/select brush color/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/brush size/i)).toBeInTheDocument();

  // Canvas is exposed with an accessible label
  expect(screen.getByLabelText(/drawing canvas/i)).toBeInTheDocument();
});
