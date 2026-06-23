import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-danish-dark px-4">
      <div className="text-center">
        <span className="text-8xl block mb-6">🇩🇰</span>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">
          Hov! (Oops!)
        </p>
        <p className="text-gray-400 dark:text-gray-500 mb-8">
          This page doesn't exist. Maybe in Danish it's called "findes ikke."
        </p>
        <Link to="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
