import '../../assets/css/fonts.css';
import '../../App.css';
import '../../styles/Vibecoding.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as PauAvatar } from '../../assets/svg/pauavatar.svg';
import experiments, { type Experiment } from './experiments';

interface ColorPalette {
  text: string;
  background: string;
}

function Vibecoding() {
  const navigate = useNavigate();
  const defaultColorPalette: ColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState<ColorPalette>(defaultColorPalette);

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
    navigate(`/experiment/${experiment.id}`);
  };

  return (
    <div className="App" style={{ backgroundColor: colorPalette.background, color: colorPalette.text }}>
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
