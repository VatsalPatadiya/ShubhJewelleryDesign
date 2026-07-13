import { useEffect, useState } from 'react';

export default function PinVerificationScreen({ brandTitle, savedPin, onVerified }) {
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');

  const handleVerify = (pinToVerify) => {
    if (pinToVerify.trim() === savedPin.trim()) {
      onVerified();
    } else {
      setError('Incorrect PIN. Please try again.');
      setInputPin('');
    }
  };

  // Auto-verify when 4 digits are completed
  useEffect(() => {
    if (inputPin.length === 4) {
      handleVerify(inputPin);
    }
  }, [inputPin]);

  useEffect(() => {
    const handleGlobalKeydown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setInputPin((p) => {
          if (p.length >= 4) return p;
          return p + e.key;
        });
        if (error) setError('');
      } else if (e.key === 'Backspace') {
        setInputPin((p) => p.slice(0, -1));
        if (error) setError('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerify(inputPin);
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [inputPin, error]);

  const handleNumberClick = (num) => {
    setInputPin((p) => {
      if (p.length >= 4) return p;
      return p + num;
    });
    if (error) setError('');
  };

  const handleBackspace = () => {
    setInputPin((p) => p.slice(0, -1));
  };

  // Lock screen always displays exactly 4 indicator circles
  const dotsArray = Array.from({ length: 4 }, (_, i) => i < inputPin.length);

  return (
    <div className="pin-screen-overlay">
      <div className="pin-card surface">
        {/* Secure Padlock Icon */}
        <div className="pin-lock-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="pin-brand">{brandTitle}</h1>
        <p className="pin-prompt">Enter PIN to access the application</p>

        {/* Indicators */}
        <div className="pin-dots">
          {dotsArray.map((filled, idx) => (
            <span key={idx} className={`pin-dot ${filled ? 'filled' : ''}`} />
          ))}
        </div>

        {error && <p className="pin-error">{error}</p>}

        {/* Premium Numeric Keypad */}
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} type="button" className="pin-key" onClick={() => handleNumberClick(num)}>
              {num}
            </button>
          ))}
          <button type="button" className="pin-key pin-key-action" onClick={handleBackspace} title="Delete">
            ⌫
          </button>
          <button key={0} type="button" className="pin-key" onClick={() => handleNumberClick(0)}>
            0
          </button>
          <button type="button" className="pin-key pin-key-verify" onClick={() => handleVerify(inputPin)} title="Confirm">
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}
