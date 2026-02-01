import { useParams, useNavigate } from 'react-router-dom';
import experiments from '../experiments';
import '../styles/ExperimentFullscreen.css';

function ExperimentFullscreen() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();

  const experiment = experiments.find(e => e.id === experimentId);

  if (!experiment) {
    return (
      <div className="experiment-fullscreen-error">
        <h1>Experiment not found</h1>
        <button onClick={() => navigate('/vibecoding')}>Back to experiments</button>
      </div>
    );
  }

  return (
    <div className="experiment-fullscreen">
      <div className="experiment-fullscreen-header">
        <button className="experiment-back-btn" onClick={() => navigate('/vibecoding')}>
          &larr; Back
        </button>
        <h1>{experiment.title}</h1>
      </div>
      <iframe
        src={experiment.path}
        title={experiment.title}
        className="experiment-fullscreen-iframe"
      />
    </div>
  );
}

export default ExperimentFullscreen;
