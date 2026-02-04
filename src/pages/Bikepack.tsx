import '../assets/css/fonts.css';
import '../App.css';
import { useState } from 'react';
import { ReactComponent as PauAvatar } from '../assets/svg/pauavatar.svg';
import BP1 from '../assets/images/bp1.webp';
import BP2 from '../assets/images/bp2.webp';
import BP3 from '../assets/images/bp3.webp';
import BP4 from '../assets/images/bp4.webp';
import BP5 from '../assets/images/bp5.webp';
import BP6 from '../assets/images/bp6.webp';
import BP7 from '../assets/images/bp7.webp';
import BP8 from '../assets/images/bp8.webp';
import BP9 from '../assets/images/bp9.webp';
import BP10 from '../assets/images/bp10.webp';
import BP11 from '../assets/images/bp11.webp';
import BP12 from '../assets/images/bp12.webp';

interface ColorPalette {
  text: string;
  background: string;
}

function Bikepack() {
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

  return (
    <div className="App" style={{backgroundColor: colorPalette.background, color: colorPalette.text}}>
      <PauAvatar className="pauAvatarSvg" onClick={setNewRandomColorPalette} />
      <div className="centered-header">
        <h1>On the bike</h1>
      </div>
      <div className='sparse-grid-content'>
        <img src={BP1} alt="I love tiny single paths like this" />
        <img src={BP2} alt="Packing up" />
        <img src={BP3} alt="I wanted to check out the beach" />
        <img src={BP4} alt="Green!" />
        <img src={BP5} alt="So fast" />
        <img src={BP6} alt="Found this randomly, it was really cool" />
        <img src={BP7} alt="Swedish hills" />
        <img src={BP8} alt="Rainy day, flowers on the back" />
        <img src={BP9} alt="Didn't pause Strava on the ferry" />
        <img src={BP10} alt="Found this creepy looking house, turned out it was just an old windmill" />
        <img src={BP11} alt="Me!" />
        <img src={BP12} alt="On a small lake close to Copenhagen" />
      </div>
    </div>
  );
}

export default Bikepack;
