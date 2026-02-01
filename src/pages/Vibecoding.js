import '../assets/css/fonts.css';
import '../App.css';
import { useState } from 'react';
import { ReactComponent as PauAvatar } from '../assets/svg/pauavatar.svg';

function Vibecoding() {
  const defaultColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState(defaultColorPalette);

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

  return (
    <div className="App" style={{backgroundColor: colorPalette.background, color: colorPalette.text}}>
      <PauAvatar className="pauAvatarSvg" onClick={setNewRandomColorPalette} />
      <div className="centered-header">
        <h1>Vibecoding Experiments</h1>
      </div>
      <div className='content'>
        <p>Coming soon...</p>
      </div>
    </div>
  );
}

export default Vibecoding;
