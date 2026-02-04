import { useEffect } from 'react';
import type { Experiment } from '../pages/Vibecoding/experiments';
import '../styles/ExperimentModal.css';

interface ExperimentModalProps {
  experiment: Experiment;
  onClose: () => void;
}

function ExperimentModal({ experiment, onClose }: ExperimentModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
