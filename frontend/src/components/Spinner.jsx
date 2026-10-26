const Spinner = ({ className = 'h-4 w-4' }) => (
  <span
    className={`spinner inline-block rounded-full border-2 border-current border-r-transparent ${className}`}
    aria-hidden="true"
  />
);

export default Spinner;
