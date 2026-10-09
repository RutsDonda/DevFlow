const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg ${hover ? 'hover:border-gray-700 transition-colors duration-200 cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

Card.Body = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-gray-800 ${className}`}>{children}</div>
);

export default Card;
