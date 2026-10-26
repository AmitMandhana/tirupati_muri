import Logo from './Logo';
import Spinner from './Spinner';

const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-6 text-center">
    <Logo className="h-12 w-12" />
    <div className="flex items-center gap-2 text-sm font-medium text-ink-500">
      <Spinner className="h-4 w-4 text-brand-600" />
      <span>{message}</span>
    </div>
  </div>
);

export default LoadingScreen;
