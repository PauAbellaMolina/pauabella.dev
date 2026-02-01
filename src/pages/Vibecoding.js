import '../assets/css/fonts.css';
import '../App.css';
import './Vibecoding.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as PauAvatar } from '../assets/svg/pauavatar.svg';
import experiments from '../experiments';
import ExperimentModal from '../components/ExperimentModal';

function Vibecoding() {
  const navigate = useNavigate();
  const defaultColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState(defaultColorPalette);
  const [modalExperiment, setModalExperiment] = useState(null);

  const setNewRandomColorPalette = () => {
    const randomColorPalette = {
      text: getRandomColor(),
      background: getRandomColor()
    };
    setColorPalette(randomColorPalette);
  };

  const getRandomColor = () => {
    let r = generateRandomRGB();
    let g = generateRandomRGB();
    let b = generateRandomRGB();
    return `rgb(${r}, ${g}, ${b})`;
  };

  const generateRandomRGB = () => {
    return Math.floor(Math.random() * 256);
  }

  const handleExperimentClick = (experiment) => {
    if (experiment.displayMode === 'fullscreen') {
      navigate(`/experiment/${experiment.id}`);
    } else {
      setModalExperiment(experiment);
    }
  };

  return (
    <div className="App" style={{backgroundColor: colorPalette.background, color: colorPalette.text}}>
      <PauAvatar className="pauAvatarSvg" onClick={setNewRandomColorPalette} />
      <div className="centered-header">
        <h1>Vibecoding Experiments</h1>
      </div>
      <div className='content'>
        {experiments.length === 0 ? (
          <p>Coming soon...</p>
        ) : (
          <div className="experiments-grid">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className="experiment-card"
                onClick={() => handleExperimentClick(experiment)}
                style={{ borderColor: colorPalette.text }}
              >
                {experiment.thumbnail ? (
                  <img
                    src={experiment.thumbnail}
                    alt={experiment.title}
                    className="experiment-thumbnail"
                  />
                ) : (
                  <div className="experiment-thumbnail-placeholder" />
                )}
                <div className="experiment-info">
                  <h3>{experiment.title}</h3>
                  <p>{experiment.description}</p>
                  <span className="experiment-mode">
                    {experiment.displayMode === 'fullscreen' ? 'Fullscreen' : 'Modal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalExperiment && (
        <ExperimentModal
          experiment={modalExperiment}
          onClose={() => setModalExperiment(null)}
        />
      )}
    </div>
  );
}

export default Vibecoding;
