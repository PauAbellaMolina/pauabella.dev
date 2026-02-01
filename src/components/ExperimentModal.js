import { useEffect } from 'react';
import './ExperimentModal.css';

function ExperimentModal({ experiment, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="experiment-modal-backdrop" onClick={handleBackdropClick}>
      <div className="experiment-modal">
        <div className="experiment-modal-header">
          <h2>{experiment.title}</h2>
          <button className="experiment-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="experiment-modal-content">
          <iframe
            src={experiment.path}
            title={experiment.title}
            className="experiment-iframe"
          />
        </div>
      </div>
    </div>
  );
}

export default ExperimentModal;
