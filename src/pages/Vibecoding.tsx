import '../assets/css/fonts.css';
import '../App.css';
import './Vibecoding.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as PauAvatar } from '../assets/svg/pauavatar.svg';
import experiments from '../experiments';
import ExperimentModal from '../components/ExperimentModal';
import type { ColorPalette, Experiment } from '../types';

function Vibecoding() {
  const navigate = useNavigate();
  const defaultColorPalette: ColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState<ColorPalette>(defaultColorPalette);
  const [modalExperiment, setModalExperiment] = useState<Experiment | null>(null);

  const setNewRandomColorPalette = () => {
    const randomColorPalette: ColorPalette = {
      text: getRandomColor(),
      background: getRandomColor()
    };
    setColorPalette(randomColorPalette);
  };

  const getRandomColor = () => {
    const r = generateRandomRGB();
    const g = generateRandomRGB();
    const b = generateRandomRGB();
    return `rgb(${r}, ${g}, ${b})`;
  };

  const generateRandomRGB = () => {
    return Math.floor(Math.random() * 256);
  }

  const handleExperimentClick = (experiment: Experiment) => {
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
