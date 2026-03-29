import '../../assets/css/fonts.css';
import '../../App.css';
import '../../styles/Vibecoding.css';
import { useNavigate } from 'react-router-dom';
import experiments, { type Experiment } from './experiments';

function Vibecoding() {
  const navigate = useNavigate();

  const handleExperimentClick = (experiment: Experiment) => {
    if (experiment.externalUrl) {
      window.open(experiment.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(`/experiment/${experiment.id}`);
  };

  const handleHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rotation = (Math.random() * 6 - 3).toFixed(2);
    e.currentTarget.style.setProperty('--hover-rotate', `${rotation}deg`);
  };

  return (
    <div className="App">
      <h2 className="floating-navigation" onClick={() => navigate('/')}>Pau Abella</h2>
      <div className="centered-header">
        <h1>Vibecoding Experiments</h1>
        {experiments.length === 0 ? (
          <p>Coming soon...</p>
        ) : (
          <div className="experiments-grid">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="experiment-card"
                onMouseEnter={handleHover}
                onClick={() => handleExperimentClick(experiment)}
              >
                <div className="experiment-info">
                  <h3>{experiment.title}</h3>
                  <p>{experiment.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Vibecoding;
