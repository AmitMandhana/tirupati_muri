const FormField = ({ label, htmlFor, error, hint, required, children, className = '' }) => (
  <div className={className}>
    <label className="field-label" htmlFor={htmlFor}>
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
    ) : null}
  </div>
);

export default FormField;
